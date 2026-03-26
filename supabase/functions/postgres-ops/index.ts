import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "test_connection" | "inspect_tables" | "preview_table" | "run_query";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeIdentifier(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

const ALLOWED_SQL_PREFIXES = ["SELECT", "WITH"];

function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return ALLOWED_SQL_PREFIXES.some((p) => trimmed.startsWith(p));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, connectionId, schema, table, limit, query: rawQuery, params: queryParams } = body as {
      action: Action;
      connectionId: string;
      schema?: string;
      table?: string;
      limit?: number;
      query?: string;
      params?: unknown[];
    };

    if (!connectionId) return jsonResponse({ success: false, error: "connectionId is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: conn, error: connError } = await supabase
      .from("database_connections")
      .select("id,name,host,port,database_name,username,password_secret,schema_name,ssl_mode,enabled")
      .eq("id", connectionId)
      .single();

    if (connError || !conn) {
      return jsonResponse({ success: false, error: "Connection not found" }, 404);
    }

    if (!conn.enabled) {
      return jsonResponse({ success: false, error: "Connection is disabled" }, 400);
    }

    const tls = conn.ssl_mode === "require" ? { enforce: false } : undefined;

    const connectWithTimeout = async (timeoutMs = 10000): Promise<Client> => {
      const client = new Client({
        hostname: conn.host,
        port: conn.port,
        user: conn.username,
        password: conn.password_secret,
        database: conn.database_name,
        tls: tls ? { enabled: true, enforce: false } : { enabled: false },
        connection: { attempts: 1 },
      });

      const timer = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          `Connection timed out after ${timeoutMs / 1000}s. ${conn.host}:${conn.port} is not reachable from Lovable Cloud. Check that the hostname points to the actual database server, the port is open, and any DNS proxy or firewall allows direct TCP connections.`
        )), timeoutMs)
      );

      await Promise.race([client.connect(), timer]);
      return client;
    };

    let client: Client;
    try {
      client = await connectWithTimeout();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase.from("database_connections").update({ last_status: "error", last_error: message }).eq("id", conn.id);
      return jsonResponse({ success: false, error: message }, 500);
    }

    try {
      if (action === "test_connection") {
        await client.queryArray("SELECT 1");

        await supabase.from("database_connections").update({
          last_status: "connected",
          last_error: null,
          last_connected_at: new Date().toISOString(),
        }).eq("id", conn.id);

        return jsonResponse({ success: true, message: `Connected to ${conn.host}:${conn.port}/${conn.database_name}` });
      }

      if (action === "inspect_tables") {
        const result = await client.queryObject<{ schema: string; table: string; row_count: number | null }>(
          `SELECT t.table_schema AS schema, t.table_name AS table,
                  (SELECT reltuples::bigint FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = t.table_schema AND c.relname = t.table_name LIMIT 1) AS row_count
           FROM information_schema.tables t
           WHERE t.table_type = 'BASE TABLE' AND t.table_schema NOT IN ('pg_catalog','information_schema')
           ORDER BY t.table_schema, t.table_name`,
        );

        const schemas = [...new Set(result.rows.map((r) => r.schema))];
        const tables = result.rows.map((r) => ({
          schema: r.schema,
          table: r.table,
          rowCount: typeof r.row_count === "number" ? r.row_count : null,
        }));
        return jsonResponse({ success: true, schemas, tables });
      }

      if (action === "preview_table") {
        if (!schema || !table) return jsonResponse({ success: false, error: "schema and table are required" }, 400);
        const safeSchema = sanitizeIdentifier(schema);
        const safeTable = sanitizeIdentifier(table);
        const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);

        const columnResult = await client.queryObject<{ name: string; data_type: string }>(
          `SELECT column_name AS name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
          [schema, table],
        );
        const rowsResult = await client.queryObject(`SELECT * FROM ${safeSchema}.${safeTable} LIMIT ${safeLimit}`);

        return jsonResponse({
          success: true,
          columns: columnResult.rows.map((r) => ({ name: r.name, dataType: r.data_type })),
          rows: rowsResult.rows,
        });
      }

      if (action === "run_query") {
        if (!rawQuery) return jsonResponse({ success: false, error: "query is required" }, 400);
        if (!isReadOnlyQuery(rawQuery)) {
          return jsonResponse({ success: false, error: "Only SELECT/WITH queries are allowed" }, 400);
        }

        const result = await client.queryObject(rawQuery, queryParams || []);
        return jsonResponse({
          success: true,
          rows: result.rows,
          rowCount: result.rows.length,
        });
      }

      return jsonResponse({ success: false, error: "Unsupported action" }, 400);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase.from("database_connections").update({ last_status: "error", last_error: message }).eq("id", conn.id);
      return jsonResponse({ success: false, error: message }, 500);
    } finally {
      await client.end().catch(() => null);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
