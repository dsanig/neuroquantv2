import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FtpFile = {
  name: string;
  fullPath: string;
  extension: string;
  size: number | null;
  modifiedAt: string | null;
  isDirectory: boolean;
  permissions: string | null;
  raw: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function classifyFtpError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("timed out")) return "Connection timed out. Please verify host/port and network access.";
  if (lower.includes("530") || lower.includes("auth")) return "Authentication failed. Please check username/password.";
  if (lower.includes("550") || lower.includes("no such") || lower.includes("not found")) return "The remote directory does not exist or cannot be accessed.";
  if (lower.includes("permission") || lower.includes("denied")) return "Permission denied for the configured FTP path.";
  if (lower.includes("refused") || lower.includes("unreachable") || lower.includes("network")) return "FTP server is unreachable. Check host, port, and firewall settings.";
  if (lower.includes("sftp") || lower.includes("ftps") || lower.includes("unsupported")) return "This source mode is not supported by the current FTP test endpoint.";
  return "Unable to connect to the FTP server. Please verify connection settings and try again.";
}

function classifyFtpErrorCode(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) return "NETWORK_TIMEOUT";
  if (lower.includes("530") || lower.includes("auth")) return "FTP_AUTH_FAILED";
  if (lower.includes("550") || lower.includes("no such") || lower.includes("not found")) return "REMOTE_PATH_NOT_FOUND";
  if (lower.includes("permission") || lower.includes("denied")) return "FTP_PERMISSION_DENIED";
  if (lower.includes("refused") || lower.includes("unreachable") || lower.includes("network") || lower.includes("enotfound") || lower.includes("econnrefused")) return "NETWORK_UNREACHABLE";
  if (lower.includes("sftp") || lower.includes("ftps") || lower.includes("unsupported")) return "UNSUPPORTED_PROTOCOL";
  return "FTP_RUNTIME_ERROR";
}

function toIsoDate(yearHint: number, month: string, day: string, timeOrYear: string) {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const m = monthMap[month.toLowerCase()];
  if (m === undefined) return null;

  const d = Number(day);
  if (Number.isNaN(d)) return null;

  if (timeOrYear.includes(":")) {
    const [h, min] = timeOrYear.split(":").map((n) => Number(n));
    if (Number.isNaN(h) || Number.isNaN(min)) return null;
    return new Date(Date.UTC(yearHint, m, d, h, min)).toISOString();
  }

  const y = Number(timeOrYear);
  if (Number.isNaN(y)) return null;
  return new Date(Date.UTC(y, m, d, 0, 0, 0)).toISOString();
}

function parseListLine(line: string, basePath: string): FtpFile | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const unixMatch = trimmed.match(/^(?<permissions>[\-dlpscbD][rwx\-]{9})\s+\d+\s+\S+\s+\S+\s+(?<size>\d+)\s+(?<month>[A-Za-z]{3})\s+(?<day>\d{1,2})\s+(?<timeOrYear>\d{2}:\d{2}|\d{4})\s+(?<name>.+)$/);
  if (unixMatch?.groups?.name) {
    const name = unixMatch.groups.name;
    const filePath = `${basePath.replace(/\/$/, "")}/${name}`;
    const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
    return {
      name,
      fullPath: filePath,
      extension: ext.toLowerCase(),
      size: Number(unixMatch.groups.size),
      modifiedAt: toIsoDate(new Date().getUTCFullYear(), unixMatch.groups.month, unixMatch.groups.day, unixMatch.groups.timeOrYear),
      isDirectory: unixMatch.groups.permissions.startsWith("d"),
      permissions: unixMatch.groups.permissions,
      raw: trimmed,
    };
  }

  const winMatch = trimmed.match(/^(?<date>\d{2}-\d{2}-\d{2})\s+(?<time>\d{2}:\d{2}[AP]M)\s+(?<sizeOrDir><DIR>|\d+)\s+(?<name>.+)$/i);
  if (winMatch?.groups?.name) {
    const [mm, dd, yy] = winMatch.groups.date.split("-").map((v) => Number(v));
    const date = new Date(`${yy + 2000}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} ${winMatch.groups.time}`);
    const name = winMatch.groups.name;
    const isDirectory = winMatch.groups.sizeOrDir.toUpperCase() === "<DIR>";
    return {
      name,
      fullPath: `${basePath.replace(/\/$/, "")}/${name}`,
      extension: name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "",
      size: isDirectory ? null : Number(winMatch.groups.sizeOrDir),
      modifiedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      isDirectory,
      permissions: null,
      raw: trimmed,
    };
  }

  return {
    name: trimmed,
    fullPath: `${basePath.replace(/\/$/, "")}/${trimmed}`,
    extension: trimmed.includes(".") ? trimmed.split(".").pop()?.toLowerCase() ?? "" : "",
    size: null,
    modifiedAt: null,
    isDirectory: false,
    permissions: null,
    raw: trimmed,
  };
}

async function readResponse(conn: Deno.Conn, timeoutMs = 7000): Promise<string> {
  const buffer = new Uint8Array(4096);
  const timer = setTimeout(() => conn.close(), timeoutMs);
  try {
    const bytes = await conn.read(buffer);
    if (!bytes) {
      throw new Error("No response from FTP server");
    }
    return textDecoder.decode(buffer.subarray(0, bytes)).trim();
  } finally {
    clearTimeout(timer);
  }
}

function parsePasvPort(response: string): number {
  const match = response.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
  if (!match) {
    throw new Error(`PASV mode unsupported or invalid response: ${response}`);
  }
  const p1 = Number(match[5]);
  const p2 = Number(match[6]);
  return p1 * 256 + p2;
}

async function sendCommand(conn: Deno.Conn, command: string, timeoutMs = 7000): Promise<string> {
  await conn.write(textEncoder.encode(`${command}\r\n`));
  return readResponse(conn, timeoutMs);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, testOnly } = await req.json();
    if (!sourceId) {
      return new Response(JSON.stringify({ success: false, errorCode: "INVALID_REQUEST", error: "Missing sourceId", userMessage: "Select an FTP source before running the test." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ success: false, errorCode: "UNAUTHORIZED", error: "Unauthorized", userMessage: "Session expired. Please sign in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("id, name, protocol, host, port, username, password_ref, remote_path")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      return new Response(JSON.stringify({
        success: false,
        errorCode: "BAD_PATH",
        error: `Source not found: ${sourceError?.message ?? "unknown"}`,
        userMessage: "Selected source was not found.",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (source.protocol !== "FTP") {
      return new Response(JSON.stringify({
        success: false,
        errorCode: "UNSUPPORTED_PROTOCOL",
        error: "Unsupported FTP mode for file browsing",
        userMessage: "Only FTP sources are supported by this test window right now.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ftpPort = source.port || 21;
    const remotePath = source.remote_path || "/";
    const startedAt = Date.now();
    let conn: Deno.Conn | null = null;

    try {
      conn = await Deno.connect({ hostname: source.host, port: ftpPort, transport: "tcp" });
      const banner = await readResponse(conn);

      const userRes = await sendCommand(conn, `USER ${source.username}`);
      if (!userRes.startsWith("230") && !userRes.startsWith("331")) {
        throw new Error(`Authentication failed at USER step: ${userRes}`);
      }

      if (userRes.startsWith("331")) {
        const passRes = await sendCommand(conn, `PASS ${source.password_ref ?? ""}`);
        if (!passRes.startsWith("230")) {
          throw new Error(`Authentication failed at PASS step: ${passRes}`);
        }
      }

      await sendCommand(conn, "TYPE I");

      if (testOnly) {
        await sendCommand(conn, "QUIT");
        conn.close();

        await supabase.from("data_sources").update({
          last_connected_at: new Date().toISOString(),
          last_status: "connected",
          last_error: null,
        }).eq("id", sourceId);

        await supabase.from("audit_log").insert({
          actor: userData.user.email ?? userData.user.id,
          event_type: "source.browse.test",
          entity_type: "data_source",
          entity_id: sourceId,
          source: "edge-function",
          metadata: { result: "success", latency_ms: Date.now() - startedAt },
        });

        return new Response(JSON.stringify({
          success: true,
          testOnly: true,
          mode: "test",
          banner,
          connectionStatus: "connected",
          latencyMs: Date.now() - startedAt,
          testedAt: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pasvResp = await sendCommand(conn, "PASV");
      const dataPort = parsePasvPort(pasvResp);
      const dataConn = await Deno.connect({ hostname: source.host, port: dataPort, transport: "tcp" });

      const listCmd = remotePath && remotePath !== "/" ? `LIST ${remotePath}` : "LIST";
      await conn.write(textEncoder.encode(`${listCmd}\r\n`));

      const listBuffer = new Uint8Array(128 * 1024);
      const listBytes = await dataConn.read(listBuffer);
      const listing = textDecoder.decode(listBuffer.subarray(0, listBytes ?? 0));
      dataConn.close();

      await readResponse(conn);
      await sendCommand(conn, "QUIT");
      conn.close();

      const files = listing
        .split("\n")
        .map((line) => parseListLine(line, remotePath))
        .filter((row): row is FtpFile => !!row)
        .filter((row) => row.name !== "." && row.name !== "..");

      await supabase.from("data_sources").update({
        last_connected_at: new Date().toISOString(),
        last_status: "connected",
        last_error: null,
      }).eq("id", sourceId);

      await supabase.from("audit_log").insert({
        actor: userData.user.email ?? userData.user.id,
        event_type: "source.browse.list",
        entity_type: "data_source",
        entity_id: sourceId,
        source: "edge-function",
        metadata: { file_count: files.length, latency_ms: Date.now() - startedAt },
      });

      return new Response(JSON.stringify({
        success: true,
        connectionStatus: "connected",
        mode: "list",
        source: { id: source.id, name: source.name },
        files,
        fileCount: files.length,
        emptyDirectory: files.length === 0,
        listedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      const technicalMessage = error instanceof Error ? error.message : String(error);
      console.error("ftp-browse error", { sourceId, technicalMessage });

      await supabase.from("data_sources").update({
        last_status: "error",
        last_error: technicalMessage.slice(0, 500),
      }).eq("id", sourceId);

      await supabase.from("audit_log").insert({
        actor: userData.user.email ?? userData.user.id,
        event_type: "source.browse.error",
        entity_type: "data_source",
        entity_id: sourceId,
        source: "edge-function",
        metadata: { error: technicalMessage },
      });

      const errorCode = classifyFtpErrorCode(technicalMessage);
      const status = errorCode === "UNSUPPORTED_PROTOCOL" ? 400 : 502;

      return new Response(JSON.stringify({
        success: false,
        errorCode,
        error: technicalMessage,
        userMessage: classifyFtpError(technicalMessage),
        connectionStatus: "error",
      }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      try {
        conn?.close();
      } catch {
        // noop
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ftp-browse request error", msg);
    return new Response(JSON.stringify({ success: false, errorCode: "BACKEND_UNAVAILABLE", error: msg, userMessage: "FTP backend failed before running the request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
