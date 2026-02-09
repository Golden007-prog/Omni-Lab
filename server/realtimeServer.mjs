import http from "http";

const PORT = Number(process.env.REALTIME_PORT || 3001);

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/realtime-session") {
    if (!process.env.GEMINI_API_KEY) {
      sendJson(res, 500, { error: "Missing GEMINI_API_KEY" });
      return;
    }

    sendJson(res, 200, { apiKey: process.env.GEMINI_API_KEY });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`API server running on ${PORT}`);
});
