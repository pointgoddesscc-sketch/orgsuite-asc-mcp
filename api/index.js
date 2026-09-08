const { sendJson, publicStatus } = require("../lib/server");

module.exports = async function handler(req, res) {
  sendJson(res, 200, publicStatus());
};
