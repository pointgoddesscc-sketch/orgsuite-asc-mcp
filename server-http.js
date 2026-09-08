'use strict';

const http = require('http');
const health = require('./api/health');
const mcp = require('./api/mcp');
const index = require('./api/index');

const port = Number(process.env.MCP_PORT || process.env.PORT || 3000);
const host = process.env.MCP_HOST || '0.0.0.0';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (path === '/health' || path === '/api/health') return health(req, res);
    if (path === '/mcp' || path === '/api/mcp') return mcp(req, res);
    return index(req, res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal' }));
  }
});

server.listen(port, host, () => {
  console.log('orgsuite-asc-mcp listening on http://' + host + ':' + port);
});
