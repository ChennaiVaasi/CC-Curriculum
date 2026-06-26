const http = require("http");
const fs = require("fs");
const path = require("path");
const chatpdfSources = require("./chatpdfSources");

const port = process.env.PORT || 3211;
const rootDir = path.join(__dirname, "..");

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON body.")); }
    });
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
  if (!sourceId) return sendJson(res, 400, { error: "No ChatPDF sourceId was provided and no server-side mapping was found for this book." });

  const question = String(body.question || "").trim();
  if (!question) return sendJson(res, 400, { error: "Question is required." });

  const history = Array.isArray(body.messages) ? body.messages : [];
  const previousMessages = history
    .filter((message) => message && ["user", "assistant"].includes(message.role) && message.content)
    .slice(0, -1)
    .map((message) => ({ role: message.role, content: String(message.content) }));

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
    const type = filePath.endsWith(".html") ? "text/html" : filePath.endsWith(".js") ? "text/javascript" : "text/plain";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/chatpdf/chapter-chat") return handleChapterChat(req, res);
  if (req.method === "GET") return serveStatic(req, res);
  sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(port, () => console.log(`Chapter catalog server listening on http://localhost:${port}`));
