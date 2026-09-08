const {
  corsHeaders,
  sendJson,
  requireSharedSecret,
  handleMcpMessage,
  publicStatus,
} = require("../lib/server");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, publicStatus());
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const auth = requireSharedSecret(req);
  if (!auth.ok) {
    sendJson(res, 401, {
      status: "Requires Authorization",
      error: "MCP_SHARED_SECRET is set. Send Authorization: Bearer <secret>.",
    });
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");

  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(res, 400, { error: "Invalid JSON" });
    return;
  }

  const messages = Array.isArray(payload) ? payload : [payload];
  const responses = [];
  for (const message of messages) {
    const result = await handleMcpMessage(message);
    if (result) responses.push(result);
  }

  if (responses.length === 0) {
    res.writeHead(202, {
      "Cache-Control": "no-store",
      ...corsHeaders(),
    });
    res.end();
    return;
  }

  sendJson(res, 200, Array.isArray(payload) ? responses : responses[0]);
};
