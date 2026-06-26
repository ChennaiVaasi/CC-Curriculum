const http = require("http");
const fs = require("fs");
const path = require("path");
const { uploadToR2 } = require("./r2");
const chatpdfSources = require("./chatpdfSources");

const port = process.env.PORT || 5000;
const host = "0.0.0.0";
const rootDir = path.join(__dirname, "..");
const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function resolveSourceId(body) {
  if (body.sourceId) return body.sourceId;
  const mapped = chatpdfSources[body.book];
  return mapped && mapped.sourceId ? mapped.sourceId : "";
}

function buildQuestion(body) {
  const context = [
    `Book: ${body.book || "Not specified"}`,
    `Chapter: ${body.chapter || "Not specified"}`,
    `Author: ${body.author || "Not specified"}`,
    `Level: ${body.level || "Not specified"}`,
    `Skill: ${body.skill || "Not specified"}`,
    `Weakness solved: ${body.weaknessSolved || "Not specified"}`
  ];
  if (body.includeFen && body.fen) context.push(`FEN context:\n${body.fen}`);
  if (body.includePgn && body.pgn) context.push(`PGN context:\n${body.pgn}`);
  return `${context.join("\n")}\n\nQuestion: ${body.question}`;
}

function readBody(req, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) { reject(new Error("Request body too large.")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch { reject(new Error("Invalid JSON body.")); }
    });
    req.on("error", reject);
  });
}

function readRawBody(req, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) { reject(new Error(`File too large. Maximum is ${Math.round(maxBytes / 1024 / 1024)} MB.`)); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Parse a single-file multipart/form-data body, return { filename, buffer }
function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from("--" + boundary);
  let start = buffer.indexOf(boundaryBuf);
  if (start === -1) throw new Error("Multipart boundary not found.");
  start += boundaryBuf.length;

  // skip \r\n after boundary
  while (start < buffer.length && (buffer[start] === 0x0d || buffer[start] === 0x0a)) start++;

  // read headers
  const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), start);
  if (headerEnd === -1) throw new Error("Multipart headers not found.");
  const headerStr = buffer.slice(start, headerEnd).toString("utf8");

  let filename = "upload.pdf";
  const fnMatch = headerStr.match(/filename="([^"]+)"/i);
  if (fnMatch) filename = fnMatch[1];

  // body starts after \r\n\r\n
  const bodyStart = headerEnd + 4;
  // find the closing boundary
  const closingBoundary = Buffer.from("\r\n--" + boundary);
  const bodyEnd = buffer.indexOf(closingBoundary, bodyStart);
  const fileBuffer = bodyEnd === -1 ? buffer.slice(bodyStart) : buffer.slice(bodyStart, bodyEnd);
  return { filename, buffer: fileBuffer };
}

async function handleChapterChat(req, res) {
  let body;
  try { body = await readBody(req); }
  catch (e) { return sendJson(res, 400, { error: e.message }); }

  const apiKey = process.env.CHATPDF_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: "CHATPDF_API_KEY is not configured." });

  const sourceId = resolveSourceId(body);
  if (!sourceId) return sendJson(res, 400, { error: "No ChatPDF sourceId provided and no server-side mapping found for this book." });

  const question = String(body.question || "").trim();
  if (!question) return sendJson(res, 400, { error: "Question is required." });

  const history = Array.isArray(body.messages) ? body.messages : [];
  const prevMessages = history
    .filter((m) => m && ["user", "assistant"].includes(m.role) && m.content)
    .slice(0, -1)
    .map((m) => ({ role: m.role, content: String(m.content) }));

  try {
    const r = await fetch("https://api.chatpdf.com/v1/chats/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ sourceId, messages: [...prevMessages, { role: "user", content: buildQuestion(body) }] })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return sendJson(res, r.status, { error: data.error || data.message || "ChatPDF request failed." });
    return sendJson(res, 200, { answer: data.content || data.answer || "", sourceId });
  } catch (e) {
    return sendJson(res, 502, { error: e.message || "Unable to reach ChatPDF." });
  }
}

// Upload PDF → R2 → pass URL to ChatPDF add-url → return sourceId
async function handleUpload(req, res) {
  const chatpdfKey = process.env.CHATPDF_API_KEY;
  if (!chatpdfKey) return sendJson(res, 500, { error: "CHATPDF_API_KEY is not configured." });

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return sendJson(res, 400, { error: "Expected multipart/form-data." });
  }

  // Extract boundary
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) return sendJson(res, 400, { error: "Missing multipart boundary." });
  const boundary = boundaryMatch[1].replace(/^"(.*)"$/, "$1");

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch (e) { return sendJson(res, 413, { error: e.message }); }

  let filename, fileBuffer;
  try {
    const parsed = parseMultipart(rawBody, boundary);
    filename = parsed.filename;
    fileBuffer = parsed.buffer;
  } catch (e) {
    return sendJson(res, 400, { error: "Could not parse uploaded file: " + e.message });
  }

  // 1. Upload to R2
  let publicUrl;
  try {
    publicUrl = await uploadToR2(fileBuffer, filename);
    console.log(`R2 upload OK: ${publicUrl}`);
  } catch (e) {
    return sendJson(res, 502, { error: "R2 upload failed: " + e.message });
  }

  // 2. Register URL with ChatPDF
  try {
    const r = await fetch("https://api.chatpdf.com/v1/sources/add-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": chatpdfKey },
      body: JSON.stringify({ url: publicUrl })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return sendJson(res, r.status, { error: data.message || data.error || "ChatPDF add-url failed." });
    console.log(`ChatPDF sourceId: ${data.sourceId} for ${filename}`);
    return sendJson(res, 200, { sourceId: data.sourceId, r2Url: publicUrl });
  } catch (e) {
    return sendJson(res, 502, { error: "ChatPDF add-url failed: " + e.message });
  }
}

function getMimeType(fp) {
  const ext = path.extname(fp).toLowerCase();
  return { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" }[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const reqPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const filePath = path.normalize(path.join(rootDir, reqPath === "/" ? "index.html" : reqPath));
  if (!filePath.startsWith(rootDir)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": getMimeType(filePath) });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST" });
    return res.end();
  }
  if (req.method === "POST" && req.url === "/api/chatpdf/chapter-chat") return handleChapterChat(req, res);
  if (req.method === "POST" && req.url === "/api/chatpdf/upload") return handleUpload(req, res);
  if (req.method === "GET") return serveStatic(req, res);
  sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(port, host, () => console.log(`Chapter catalog server listening on http://${host}:${port}`));
