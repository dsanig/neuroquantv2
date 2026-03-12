import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "npm:pg@8.13.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "test_connection" | "inspect_tables" | "preview_table";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, connectionId, schema, table, limit } = await req.json() as {
      action: Action;
      connectionId: string;
      schema?: string;
      table?: string;
      limit?: number;
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

    const client = new Client({
      host: conn.host,
      port: conn.port,
      user: conn.username,
      password: conn.password_secret,
      database: conn.database_name,
      ssl: conn.ssl_mode === "require" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 7000,
    });

    try {
      await client.connect();

      if (action === "test_connection") {
        await client.query("select 1");

        await supabase.from("database_connections").update({
          last_status: "connected",
          last_error: null,
          last_connected_at: new Date().toISOString(),
        }).eq("id", conn.id);

        return jsonResponse({ success: true, message: `Connected to ${conn.host}:${conn.port}/${conn.database_name}` });
      }

      if (action === "inspect_tables") {
        const result = await client.query(
          `
          select t.table_schema as schema, t.table_name as table,
                 (select reltuples::bigint from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = t.table_schema and c.relname = t.table_name limit 1) as row_count
          from information_schema.tables t
          where t.table_type = 'BASE TABLE' and t.table_schema not in ('pg_catalog','information_schema')
          order by t.table_schema, t.table_name
          `,
        );

        const schemas = [...new Set(result.rows.map((r) => r.schema))];
        const tables = result.rows.map((r) => ({ schema: r.schema as string, table: r.table as string, rowCount: typeof r.row_count === 'number' ? r.row_count : null }));
        return jsonResponse({ success: true, schemas, tables });
      }

      if (action === "preview_table") {
        if (!schema || !table) return jsonResponse({ success: false, error: "schema and table are required" }, 400);
        const safeSchema = sanitizeIdentifier(schema);
        const safeTable = sanitizeIdentifier(table);
        const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);

        const columnResult = await client.query(
          `select column_name as name, data_type from information_schema.columns where table_schema = $1 and table_name = $2 order by ordinal_position`,
          [schema, table],
        );
        const rowsResult = await client.query(`select * from ${safeSchema}.${safeTable} limit ${safeLimit}`);

        return jsonResponse({ success: true, columns: columnResult.rows.map((r) => ({ name: r.name, dataType: r.data_type })), rows: rowsResult.rows });
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
