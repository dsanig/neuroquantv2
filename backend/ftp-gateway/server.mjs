import http from "node:http";
import net from "node:net";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PORT ?? 8787);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.FTP_GATEWAY_ALLOWED_ORIGIN ?? "*";
const FTP_TIMEOUT_MS = Number(process.env.FTP_GATEWAY_TIMEOUT_MS ?? 10000);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
}

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function classifyFtpError(message) {
  const lower = message.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) return { errorCode: "NETWORK_TIMEOUT", userMessage: "FTP connection timed out. Verify host/port and firewall rules." };
  if (lower.includes("530") || lower.includes("not logged in") || lower.includes("auth")) return { errorCode: "FTP_AUTH_FAILED", userMessage: "FTP login failed. Check username/password." };
  if (lower.includes("550") || lower.includes("no such") || lower.includes("not found")) return { errorCode: "REMOTE_PATH_NOT_FOUND", userMessage: "Remote directory does not exist or is not accessible." };
  if (lower.includes("econnrefused") || lower.includes("refused") || lower.includes("enotfound") || lower.includes("unreachable")) return { errorCode: "NETWORK_UNREACHABLE", userMessage: "Cannot reach FTP server. Check host, port, and network routing." };
  if (lower.includes("sftp") || lower.includes("ftps")) return { errorCode: "UNSUPPORTED_PROTOCOL", userMessage: "This FTP tester currently supports plain FTP only (not SFTP/FTPS)." };
  return { errorCode: "FTP_RUNTIME_ERROR", userMessage: "FTP request failed due to a server-side runtime error." };
}

function parseUrl(req) {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Malformed JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function getUserFromAuthHeader(authorizationHeader) {
  if (!authorizationHeader?.startsWith("Bearer ")) return { user: null, error: "Missing bearer token" };
  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) return { user: null, error: "Missing bearer token" };

  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userSupabase.auth.getUser(token);
  if (error || !data.user) return { user: null, error: error?.message ?? "Unauthorized" };
  return { user: data.user, error: null };
}

function readSocketLine(socket, timeoutMs = FTP_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let multilineCode = null;

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const multiStart = line.match(/^(\d{3})-/);
        if (multiStart) {
          multilineCode = multiStart[1];
          continue;
        }
        if (multilineCode && line.startsWith(`${multilineCode} `)) {
          cleanup();
          resolve(line);
          return;
        }
        if (!multilineCode && /^\d{3} /.test(line)) {
          cleanup();
          resolve(line);
          return;
        }
      }
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("FTP socket closed before a response was received"));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("FTP response timed out"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

function sendCommand(socket, command) {
  socket.write(`${command}\r\n`);
}

function connectTcp(host, port, timeoutMs = FTP_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: Number(port) });
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy(new Error("FTP connection timed out"));
      reject(new Error("FTP connection timed out"));
    });
  });
}

function parsePasvPort(response) {
  const match = response.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
  if (!match) throw new Error(`Invalid PASV response: ${response}`);
  return Number(match[5]) * 256 + Number(match[6]);
}

function toIsoDate(yearHint, month, day, timeOrYear) {
  const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const m = monthMap[month.toLowerCase()];
  if (m === undefined) return null;
  const d = Number(day);
  if (Number.isNaN(d)) return null;
  if (timeOrYear.includes(":")) {
    const [h, min] = timeOrYear.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(min)) return null;
    return new Date(Date.UTC(yearHint, m, d, h, min)).toISOString();
  }
  const y = Number(timeOrYear);
  if (Number.isNaN(y)) return null;
  return new Date(Date.UTC(y, m, d, 0, 0, 0)).toISOString();
}

function parseListLine(line, basePath) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const unixMatch = trimmed.match(/^(?<permissions>[\-dlpscbD][rwx\-]{9})\s+\d+\s+\S+\s+\S+\s+(?<size>\d+)\s+(?<month>[A-Za-z]{3})\s+(?<day>\d{1,2})\s+(?<timeOrYear>\d{2}:\d{2}|\d{4})\s+(?<name>.+)$/);
  if (unixMatch?.groups?.name) {
    const name = unixMatch.groups.name;
    const filePath = `${basePath.replace(/\/$/, "")}/${name}`;
    return {
      name,
      fullPath: filePath,
      extension: name.includes(".") ? name.split(".").pop().toLowerCase() : "",
      size: Number(unixMatch.groups.size),
      modifiedAt: toIsoDate(new Date().getUTCFullYear(), unixMatch.groups.month, unixMatch.groups.day, unixMatch.groups.timeOrYear),
      isDirectory: unixMatch.groups.permissions.startsWith("d"),
      permissions: unixMatch.groups.permissions,
      raw: trimmed,
    };
  }

  const winMatch = trimmed.match(/^(?<date>\d{2}-\d{2}-\d{2})\s+(?<time>\d{2}:\d{2}[AP]M)\s+(?<sizeOrDir><DIR>|\d+)\s+(?<name>.+)$/i);
  if (winMatch?.groups?.name) {
    const [mm, dd, yy] = winMatch.groups.date.split("-").map(Number);
    const date = new Date(`${yy + 2000}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} ${winMatch.groups.time}`);
    const isDirectory = winMatch.groups.sizeOrDir.toUpperCase() === "<DIR>";
    const name = winMatch.groups.name;
    return {
      name,
      fullPath: `${basePath.replace(/\/$/, "")}/${name}`,
      extension: name.includes(".") ? name.split(".").pop().toLowerCase() : "",
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
    extension: trimmed.includes(".") ? trimmed.split(".").pop().toLowerCase() : "",
    size: null,
    modifiedAt: null,
    isDirectory: false,
    permissions: null,
    raw: trimmed,
  };
}

async function listFilesOverFtp({ host, port, username, password, remotePath, testOnly }) {
  const commandSocket = await connectTcp(host, port);
  const banner = await readSocketLine(commandSocket);

  sendCommand(commandSocket, `USER ${username}`);
  const userResp = await readSocketLine(commandSocket);
  if (!userResp.startsWith("230") && !userResp.startsWith("331")) throw new Error(`Authentication failed at USER step: ${userResp}`);

  if (userResp.startsWith("331")) {
    sendCommand(commandSocket, `PASS ${password ?? ""}`);
    const passResp = await readSocketLine(commandSocket);
    if (!passResp.startsWith("230")) throw new Error(`Authentication failed at PASS step: ${passResp}`);
  }

  sendCommand(commandSocket, "TYPE I");
  await readSocketLine(commandSocket);

  if (testOnly) {
    sendCommand(commandSocket, "QUIT");
    commandSocket.end();
    return { banner, files: [] };
  }

  sendCommand(commandSocket, "PASV");
  const pasvResp = await readSocketLine(commandSocket);
  const dataPort = parsePasvPort(pasvResp);
  const dataSocket = await connectTcp(host, dataPort);

  const chunks = [];
  dataSocket.on("data", (chunk) => chunks.push(chunk));

  const listCmd = remotePath && remotePath !== "/" ? `LIST ${remotePath}` : "LIST";
  sendCommand(commandSocket, listCmd);
  await readSocketLine(commandSocket);

  await new Promise((resolve) => dataSocket.on("end", resolve));
  dataSocket.destroy();

  await readSocketLine(commandSocket);
  sendCommand(commandSocket, "QUIT");
  commandSocket.end();

  const listing = Buffer.concat(chunks).toString("utf8");
  const files = listing
    .split("\n")
    .map((line) => parseListLine(line, remotePath))
    .filter(Boolean)
    .filter((row) => row.name !== "." && row.name !== "..");

  return { banner, files };
}

async function handleBrowse(req, res) {
  const startedAt = Date.now();
  let sourceId = null;
  let actor = null;

  try {
    const payload = await readJsonBody(req);
    sourceId = payload.sourceId;
    const testOnly = Boolean(payload.testOnly);

    if (!sourceId || typeof sourceId !== "string") {
      sendJson(res, 400, { success: false, errorCode: "INVALID_REQUEST", error: "sourceId is required", userMessage: "Select an FTP source before running the test." });
      return;
    }

    const { user, error: authError } = await getUserFromAuthHeader(req.headers.authorization);
    if (!user) {
      sendJson(res, 401, { success: false, errorCode: "UNAUTHORIZED", error: authError, userMessage: "You are not authorized. Please sign in again." });
      return;
    }

    actor = user.email ?? user.id;

    const { data: source, error: sourceError } = await serviceSupabase
      .from("data_sources")
      .select("id, name, protocol, host, port, username, password_ref, remote_path")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      sendJson(res, 404, { success: false, errorCode: "SOURCE_NOT_FOUND", error: sourceError?.message ?? "Source not found", userMessage: "Could not find the selected source." });
      return;
    }

    if (source.protocol !== "FTP") {
      sendJson(res, 400, { success: false, errorCode: "UNSUPPORTED_PROTOCOL", error: `Unsupported protocol: ${source.protocol}`, userMessage: "Only plain FTP is supported in this test window." });
      return;
    }

    if (!source.host || !source.username) {
      sendJson(res, 400, { success: false, errorCode: "MISSING_CONFIGURATION", error: "Source host and username are required", userMessage: "Source is missing required FTP configuration (host/username)." });
      return;
    }

    try {
      const remotePath = source.remote_path || "/";
      const { files } = await listFilesOverFtp({
        host: source.host,
        port: Number(source.port ?? 21),
        username: source.username,
        password: source.password_ref ?? "",
        remotePath,
        testOnly,
      });

      await serviceSupabase.from("data_sources").update({ last_connected_at: new Date().toISOString(), last_status: "connected", last_error: null }).eq("id", sourceId);

      await serviceSupabase.from("audit_log").insert({
        actor,
        event_type: testOnly ? "source.browse.test" : "source.browse.list",
        entity_type: "data_source",
        entity_id: sourceId,
        source: "node-ftp-gateway",
        metadata: testOnly ? { result: "success", latency_ms: Date.now() - startedAt } : { file_count: files.length, latency_ms: Date.now() - startedAt },
      });

      if (testOnly) {
        sendJson(res, 200, { success: true, testOnly: true, connectionStatus: "connected", testedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
        return;
      }

      sendJson(res, 200, {
        success: true,
        connectionStatus: "connected",
        source: { id: source.id, name: source.name },
        files,
        fileCount: files.length,
        listedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      });
    } catch (error) {
      const technicalMessage = error instanceof Error ? error.message : String(error);
      const { errorCode, userMessage } = classifyFtpError(technicalMessage);

      await serviceSupabase.from("data_sources").update({ last_status: "error", last_error: technicalMessage.slice(0, 500) }).eq("id", sourceId);
      await serviceSupabase.from("audit_log").insert({
        actor,
        event_type: "source.browse.error",
        entity_type: "data_source",
        entity_id: sourceId,
        source: "node-ftp-gateway",
        metadata: { error: technicalMessage, error_code: errorCode },
      });

      sendJson(res, 400, { success: false, connectionStatus: "error", errorCode, error: technicalMessage, userMessage });
    }
  } catch (error) {
    const technicalMessage = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, {
      success: false,
      errorCode: "RUNTIME_INITIALIZATION_FAILURE",
      error: technicalMessage,
      userMessage: "FTP backend failed before running the request.",
      connectionStatus: "error",
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = parseUrl(req);
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "GET" && url.pathname === "/health") return sendJson(res, 200, { ok: true, service: "ftp-gateway" });
  if (req.method === "POST" && url.pathname === "/ftp/browse") return handleBrowse(req, res);
  return sendJson(res, 404, { success: false, errorCode: "FUNCTION_UNAVAILABLE", error: `Unknown route: ${req.method} ${url.pathname}`, userMessage: "Requested FTP backend endpoint is unavailable." });
});

server.listen(PORT, () => {
  console.log(`[ftp-gateway] listening on ${PORT}`);
});
