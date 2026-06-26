const http = require("http");
const fs = require("fs");
const path = require("path");
const chatpdfSources = require("./chatpdfSources");

const port = process.env.PORT || 5000;
const host = "0.0.0.0";
const rootDir = path.join(__dirname, "..");
const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  });
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
      if (size > maxBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
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
      if (size > maxBytes) {
        reject(new Error(`File too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handleChapterChat(req, res) {
  let body;
  try { body = await readBody(req); }
  catch (error) { return sendJson(res, 400, { error: error.message }); }

  const apiKey = process.env.CHATPDF_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: "CHATPDF_API_KEY is not configured on the server." });

  const sourceId = resolveSourceId(body);
  if (!sourceId) return sendJson(res, 400, { error: "No ChatPDF sourceId provided and no server-side mapping found for this book." });

  const question = String(body.question || "").trim();
  if (!question) return sendJson(res, 400, { error: "Question is required." });

  const history = Array.isArray(body.messages) ? body.messages : [];
  const previousMessages = history
    .filter((m) => m && ["user", "assistant"].includes(m.role) && m.content)
    .slice(0, -1)
    .map((m) => ({ role: m.role, content: String(m.content) }));

  try {
    const response = await fetch("https://api.chatpdf.com/v1/chats/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        sourceId,
        messages: [...previousMessages, { role: "user", content: buildQuestion(body) }]
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return sendJson(res, response.status, { error: data.error || data.message || "ChatPDF request failed." });
    return sendJson(res, 200, { answer: data.content || data.answer || "", sourceId });
  } catch (error) {
    return sendJson(res, 502, { error: error && error.message ? error.message : "Unable to reach ChatPDF." });
  }
}

async function handleUpload(req, res) {
  const apiKey = process.env.CHATPDF_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: "CHATPDF_API_KEY is not configured on the server." });

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return sendJson(res, 400, { error: "Expected multipart/form-data request." });
  }

  let body;
  try { body = await readRawBody(req); }
  catch (error) { return sendJson(res, 413, { error: error.message }); }

  try {
    const response = await fetch("https://api.chatpdf.com/v1/sources/add-file", {
      method: "POST",
      headers: { "Content-Type": contentType, "x-api-key": apiKey },
      body
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return sendJson(res, response.status, { error: data.message || data.error || "ChatPDF upload failed." });
    return sendJson(res, 200, { sourceId: data.sourceId });
  } catch (error) {
    return sendJson(res, 502, { error: error && error.message ? error.message : "Unable to reach ChatPDF." });
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };
  return types[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const filePath = path.normalize(path.join(rootDir, requestPath === "/" ? "index.html" : requestPath));
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
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
