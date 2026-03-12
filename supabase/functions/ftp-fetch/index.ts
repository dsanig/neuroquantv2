import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTROL_TIMEOUT_MS = 12_000;
const DATA_TIMEOUT_MS = 20_000;

type FtpListFile = {
  name: string;
  extension: string;
  size: number | null;
  modifiedAt: string | null;
  fullPath: string;
  directory: string;
  isDirectory: boolean;
  permissions: string | null;
  type: string;
  status: string;
  raw: string;
};

type DroppedEntry = {
  reason: string;
  raw: string;
};

type ClassifiedError = {
  errorCode:
    | "BACKEND_INVOKE_FAILURE"
    | "FTP_AUTH_FAILED"
    | "INVALID_PATH"
    | "EMPTY_DIRECTORY"
    | "TIMEOUT"
    | "UNSUPPORTED_PROTOCOL"
    | "NETWORK_UNREACHABLE"
    | "FTP_PERMISSION_DENIED"
    | "UNKNOWN_ERROR";
  userMessage: string;
  technicalMessage: string;
  status: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number, errorCode: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorCode)), ms)),
  ]);
}

function parseCode(line: string): number | null {
  const m = line.match(/^(\d{3})/);
  return m ? Number(m[1]) : null;
}

async function readResponse(conn: Deno.Conn): Promise<string> {
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  for (let i = 0; i < 25; i += 1) {
    const buf = new Uint8Array(1024);
    const n = await withTimeout(conn.read(buf), CONTROL_TIMEOUT_MS, "TIMEOUT");
    if (n === null || n === 0) break;

    chunks.push(decoder.decode(buf.subarray(0, n)));
    const text = chunks.join("");
    const lines = text.split(/\r?\n/).filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";

    if (/^\d{3} /.test(lastLine)) {
      return text;
    }

    if (/^\d{3}-/.test(lines[0] || "") && /^\d{3} /.test(lastLine)) {
      return text;
    }
  }

  return chunks.join("");
}

async function sendCommand(conn: Deno.Conn, command: string): Promise<string> {
  const encoder = new TextEncoder();
  await withTimeout(conn.write(encoder.encode(`${command}\r\n`)), CONTROL_TIMEOUT_MS, "TIMEOUT");
  return await readResponse(conn);
}

function parsePasvResponse(response: string): number {
  const match = response.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
  if (!match) {
    throw new Error("PASV_PARSE_FAILED");
  }

  return Number(match[5]) * 256 + Number(match[6]);
}

function toIsoDate(year: number, month: number, day: number, hh = 0, mm = 0): string {
  return new Date(Date.UTC(year, month, day, hh, mm, 0, 0)).toISOString();
}

function parseListLine(line: string, hostPath: string): FtpListFile | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const unixMatch = trimmed.match(/^(?<permissions>[\-dlpscbD][rwx\-]{9})\s+\d+\s+\S+\s+\S+\s+(?<size>\d+)\s+(?<month>[A-Za-z]{3})\s+(?<day>\d{1,2})\s+(?<timeOrYear>\d{2}:\d{2}|\d{4})\s+(?<name>.+)$/);
  if (unixMatch?.groups?.name) {
    const name = unixMatch.groups.name.trim();
    if (!name || name === "." || name === "..") return null;

    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const month = monthMap[(unixMatch.groups.month || "").toLowerCase()];
    const day = Number(unixMatch.groups.day);
    let modifiedAt: string | null = null;

    if (Number.isFinite(day) && Number.isFinite(month)) {
      const timeOrYear = unixMatch.groups.timeOrYear;
      if (/^\d{1,2}:\d{2}$/.test(timeOrYear)) {
        const [hh, mm] = timeOrYear.split(":").map(Number);
        modifiedAt = toIsoDate(new Date().getUTCFullYear(), month, day, hh, mm);
      } else if (/^\d{4}$/.test(timeOrYear)) {
        modifiedAt = toIsoDate(Number(timeOrYear), month, day);
      }
    }

    const extension = name.includes(".") ? name.split(".").pop() || "" : "";
    const normalizedPath = hostPath.endsWith("/") ? `${hostPath}${name}` : `${hostPath}/${name}`;

    return {
      name,
      extension,
      size: Number(unixMatch.groups.size),
      modifiedAt,
      fullPath: normalizedPath,
      directory: hostPath,
      isDirectory: unixMatch.groups.permissions.startsWith("d"),
      permissions: unixMatch.groups.permissions,
      type: unixMatch.groups.permissions.startsWith("d") ? "directory" : "file",
      status: "ok",
      raw: line,
    };
  }

  const winMatch = trimmed.match(/^(?<date>\d{2}-\d{2}-\d{2})\s+(?<time>\d{2}:\d{2}[AP]M)\s+(?<sizeOrDir><DIR>|\d+)\s+(?<name>.+)$/i);
  if (winMatch?.groups?.name) {
    const name = winMatch.groups.name.trim();
    if (!name || name === "." || name === "..") return null;
    const [month, day, year] = winMatch.groups.date.split("-").map((part) => Number(part));
    const asDate = new Date(`${year + 2000}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${winMatch.groups.time}`);
    const isDirectory = winMatch.groups.sizeOrDir.toUpperCase() === "<DIR>";
    const extension = name.includes(".") ? name.split(".").pop() || "" : "";
    const normalizedPath = hostPath.endsWith("/") ? `${hostPath}${name}` : `${hostPath}/${name}`;

    return {
      name,
      extension,
      size: isDirectory ? null : Number(winMatch.groups.sizeOrDir),
      modifiedAt: Number.isNaN(asDate.getTime()) ? null : asDate.toISOString(),
      fullPath: normalizedPath,
      directory: hostPath,
      isDirectory,
      permissions: null,
      type: isDirectory ? "directory" : "file",
      status: "ok",
      raw: line,
    };
  }

  const fallbackName = trimmed.split(/\s+/).pop() || trimmed;
  if (!fallbackName || fallbackName === "." || fallbackName === "..") return null;
  const fallbackPath = hostPath.endsWith("/") ? `${hostPath}${fallbackName}` : `${hostPath}/${fallbackName}`;

  return {
    name: fallbackName,
    extension: fallbackName.includes(".") ? fallbackName.split(".").pop() || "" : "",
    size: null,
    modifiedAt: null,
    fullPath: fallbackPath,
    directory: hostPath,
    isDirectory: false,
    permissions: null,
    type: "file",
    status: "ok",
    raw: line,
  };
}

function classifyError(err: unknown): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (msg === "TIMEOUT" || lower.includes("timeout")) {
    return { errorCode: "TIMEOUT", userMessage: "FTP request timed out.", technicalMessage: msg, status: 504 };
  }

  if (msg === "UNSUPPORTED_PROTOCOL") {
    return {
      errorCode: "UNSUPPORTED_PROTOCOL",
      userMessage: "This endpoint currently supports plain FTP sources only.",
      technicalMessage: msg,
      status: 400,
    };
  }

  if (msg.startsWith("AUTH_FAILED") || lower.includes("530")) {
    return { errorCode: "FTP_AUTH_FAILED", userMessage: "FTP authentication failed.", technicalMessage: msg, status: 401 };
  }

  if (msg.startsWith("PATH_INVALID") || lower.includes("not found") || lower.includes("failed to change directory")) {
    return { errorCode: "INVALID_PATH", userMessage: "The remote FTP path is invalid or inaccessible.", technicalMessage: msg, status: 400 };
  }

  if (lower.includes("permission") || lower.includes("550")) {
    return { errorCode: "FTP_PERMISSION_DENIED", userMessage: "FTP permission denied for this path.", technicalMessage: msg, status: 403 };
  }

  if (lower.includes("network") || lower.includes("refused") || lower.includes("unreachable") || lower.includes("dns")) {
    return {
      errorCode: "NETWORK_UNREACHABLE",
      userMessage: "FTP server is unreachable from the backend runtime.",
      technicalMessage: msg,
      status: 502,
    };
  }

  return { errorCode: "UNKNOWN_ERROR", userMessage: "FTP listing failed due to an unexpected backend error.", technicalMessage: msg, status: 500 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, testOnly } = await req.json();

    if (!sourceId) {
      return new Response(JSON.stringify({ success: false, errorCode: "BACKEND_INVOKE_FAILURE", error: "Missing sourceId." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: source, error: sourceError } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      return new Response(JSON.stringify({ success: false, errorCode: "BACKEND_INVOKE_FAILURE", error: sourceError?.message || "Source not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((source.protocol || "").toUpperCase() !== "FTP") {
      throw new Error("UNSUPPORTED_PROTOCOL");
    }

    const host = source.host;
    const port = source.port || 21;
    const remotePath = source.remote_path || "/";

    const conn = await withTimeout(Deno.connect({ hostname: host, port }), CONTROL_TIMEOUT_MS, "TIMEOUT");
    const files: FtpListFile[] = [];
    const droppedEntries: DroppedEntry[] = [];

    try {
      const banner = await readResponse(conn);

      const userResponse = await sendCommand(conn, `USER ${source.username || ""}`);
      const userCode = parseCode(userResponse);

      if (userCode === 331 || userCode === 332) {
        const passResponse = await sendCommand(conn, `PASS ${source.password_ref || ""}`);
        const passCode = parseCode(passResponse);
        if (!passCode || passCode >= 400) {
          throw new Error(`AUTH_FAILED: ${passResponse}`);
        }
      } else if (!userCode || userCode >= 400) {
        throw new Error(`AUTH_FAILED: ${userResponse}`);
      }

      const cwdResponse = await sendCommand(conn, `CWD ${remotePath}`);
      const cwdCode = parseCode(cwdResponse);
      if (!cwdCode || cwdCode >= 400) {
        throw new Error(`PATH_INVALID: ${cwdResponse}`);
      }

      if (testOnly) {
        await sendCommand(conn, "QUIT");

        await supabase.from("data_sources").update({
          last_connected_at: new Date().toISOString(),
          last_status: "connected",
          last_error: null,
        }).eq("id", sourceId);

        return new Response(JSON.stringify({
          success: true,
          mode: "test",
          testOnly: true,
          connectionStatus: "connected",
          pathUsed: remotePath,
          fileCount: 0,
          files: [],
          testedAt: new Date().toISOString(),
          banner: banner.trim(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pasvResponse = await sendCommand(conn, "PASV");
      const pasvCode = parseCode(pasvResponse);
      if (!pasvCode || pasvCode >= 400) {
        throw new Error(`PASV_FAILED: ${pasvResponse}`);
      }
      const dataPort = parsePasvResponse(pasvResponse);
      const dataConn = await withTimeout(Deno.connect({ hostname: host, port: dataPort }), DATA_TIMEOUT_MS, "TIMEOUT");

      const listResponse = await sendCommand(conn, "LIST -a");
      const listCode = parseCode(listResponse);
      if (!listCode || listCode >= 400) {
        await sendCommand(conn, "LIST");
      }

      const decoder = new TextDecoder();
      const chunks: string[] = [];
      while (true) {
        const chunk = new Uint8Array(4096);
        const n = await withTimeout(dataConn.read(chunk), DATA_TIMEOUT_MS, "TIMEOUT");
        if (n === null || n === 0) break;
        chunks.push(decoder.decode(chunk.subarray(0, n)));
      }
      dataConn.close();

      await readResponse(conn);
      await sendCommand(conn, "QUIT");

      const listing = chunks.join("");
      const rawEntries = listing.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

      for (const line of rawEntries) {
        const parsed = parseListLine(line, remotePath);
        if (!parsed) {
          droppedEntries.push({ reason: "unparseable_or_empty_entry", raw: line });
          continue;
        }

        if (parsed.name === "." || parsed.name === "..") {
          droppedEntries.push({ reason: "dot_directory_entry", raw: line });
          continue;
        }

        files.push(parsed);
      }

      await supabase.from("data_sources").update({
        last_connected_at: new Date().toISOString(),
        last_status: "connected",
        last_error: null,
      }).eq("id", sourceId);

      await supabase.from("audit_log").insert({
        actor: "system",
        event_type: "source.fetch",
        entity_type: "data_source",
        entity_id: sourceId,
        source: "edge-function",
        metadata: { files_found: files.length, file_names: files.map((f) => f.name) },
      });

      return new Response(JSON.stringify({
        success: true,
        mode: "list",
        testOnly: false,
        connectionStatus: "connected",
        configuredPath: remotePath,
        pathUsed: remotePath,
        sourceId,
        rawFileCount: rawEntries.length,
        normalizedFileCount: files.length,
        displayedFileCount: files.length,
        droppedEntriesCount: droppedEntries.length,
        droppedEntriesPreview: droppedEntries.slice(0, 10),
        files,
        fileCount: files.length,
        emptyDirectory: files.length === 0,
        listedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      try {
        conn.close();
      } catch {
        // no-op
      }
    }
  } catch (err) {
    const classified = classifyError(err);

    return new Response(JSON.stringify({
      success: false,
      errorCode: classified.errorCode,
      error: classified.technicalMessage,
      userMessage: classified.userMessage,
      connectionStatus: "error",
    }), {
      status: classified.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
