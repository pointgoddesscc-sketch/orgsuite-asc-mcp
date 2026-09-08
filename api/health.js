const { sendJson, publicStatus } = require("../lib/server");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    const { corsHeaders } = require("../lib/server");
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }
  sendJson(res, 200, publicStatus());
};
