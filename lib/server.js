'use strict';

const crypto = require('crypto');

const PROTOCOL = '2025-03-26';
const SERVER_NAME = 'orgsuite-asc-mcp';
const SERVER_VERSION = '1.0.0';
const SERVER_TITLE = 'OrgSuite App Store Connect MCP';
const APPLE_API = 'https://api.appstoreconnect.apple.com';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsHeaders(),
  });
  res.end(payload);
}

function envSet(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function credentials() {
  return {
    issuerIdSet: envSet('APP_STORE_CONNECT_ISSUER_ID'),
    keyIdSet: envSet('APP_STORE_CONNECT_KEY_ID'),
    privateKeySet: envSet('APP_STORE_CONNECT_PRIVATE_KEY'),
    sharedSecretEnforced: envSet('MCP_SHARED_SECRET'),
  };
}

function appleCallsEnabled() {
  const c = credentials();
  return c.issuerIdSet && c.keyIdSet && c.privateKeySet;
}

function publicStatus() {
  return {
    name: SERVER_NAME,
    title: SERVER_TITLE,
    version: SERVER_VERSION,
    protocol: PROTOCOL,
    endpoints: { health: '/api/health', mcp: '/api/mcp' },
    mcpStatus: 'Completed',
    appleApiStatus: appleCallsEnabled() ? 'Connected' : 'Requires Authorization',
    grokConnectorUrlHint: 'https://<this-host>/api/mcp',
    tools: ['health', 'auth_status', 'list_apps', 'get_app', 'list_builds'],
    time: new Date().toISOString(),
  };
}

function requireSharedSecret(req) {
  const expected = process.env.MCP_SHARED_SECRET;
  if (!expected || !expected.trim()) return { ok: true };
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== expected.trim()) return { ok: false };
  return { ok: true };
}

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function normalizePem(raw) {
  let pem = String(raw).trim();
  pem = pem.replace(/\r/g, '');
  if (pem.includes('\\n') && !pem.includes('\n-----')) {
    pem = pem.replace(/\\n/g, '\n');
  }
  return pem;
}

function signAppleJwt() {
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID.trim();
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID.trim();
  const pem = normalizePem(process.env.APP_STORE_CONNECT_PRIVATE_KEY);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 60 * 19, aud: 'appstoreconnect-v1' };
  const encoded =
    base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
  const key = crypto.createPrivateKey(pem);
  const sig = crypto.sign('sha256', Buffer.from(encoded), { key, dsaEncoding: 'ieee-p1363' });
  return encoded + '.' + base64url(sig);
}

async function appleGet(pathname, query) {
  if (!appleCallsEnabled()) {
    const err = new Error('App Store Connect credentials are not configured');
    err.code = 'REQUIRES_AUTHORIZATION';
    throw err;
  }
  const url = new URL(pathname, APPLE_API);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const token = signAppleJwt();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const err = new Error('Apple API ' + response.status);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
}

const TOOLS = [
  {
    name: 'health',
    description: 'Check that the OrgSuite ASC MCP server is reachable.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'auth_status',
    description: 'Report whether App Store Connect JWT credentials are configured. Never returns secret values.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_apps',
    description: 'List apps in App Store Connect. Requires configured API key. Read-only.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', minimum: 1, maximum: 200 } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_app',
    description: 'Get one App Store Connect app by id. Read-only.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'App Store Connect app id' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_builds',
    description: 'List builds, optionally filtered by app id. Read-only TestFlight-related data.',
    inputSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
  },
];

function textResult(obj) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
  };
}

async function callTool(name, args) {
  const input = args && typeof args === 'object' ? args : {};
  if (name === 'health') return textResult(publicStatus());
  if (name === 'auth_status') {
    const c = credentials();
    return textResult({
      status: appleCallsEnabled() ? 'Connected' : 'Requires Authorization',
      issuerIdSet: c.issuerIdSet,
      keyIdSet: c.keyIdSet,
      privateKeySet: c.privateKeySet,
      sharedSecretEnforced: c.sharedSecretEnforced,
      appleCallsEnabled: appleCallsEnabled(),
    });
  }
  if (name === 'list_apps') {
    const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 200);
    const data = await appleGet('/v1/apps', { 'page[limit]': limit });
    return textResult(data);
  }
  if (name === 'get_app') {
    if (!input.id) throw new Error('id is required');
    const data = await appleGet('/v1/apps/' + encodeURIComponent(input.id));
    return textResult(data);
  }
  if (name === 'list_builds') {
    const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 200);
    const query = { 'page[limit]': limit };
    if (input.appId) query['filter[app]'] = input.appId;
    const data = await appleGet('/v1/builds', query);
    return textResult(data);
  }
  const err = new Error('Unknown tool: ' + name);
  err.code = 'UNKNOWN_TOOL';
  throw err;
}

async function handleMcpMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const { id, method, params } = message;
  if (!method) return null;
  if (id === undefined || id === null) return null;

  try {
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION, title: SERVER_TITLE },
        },
      };
    }
    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    }
    if (method === 'tools/call') {
      const name = params && params.name;
      const result = await callTool(name, params && params.arguments);
      return { jsonrpc: '2.0', id, result };
    }
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: 'Method not found: ' + method },
    };
  } catch (err) {
    if (err && err.code === 'REQUIRES_AUTHORIZATION') {
      return {
        jsonrpc: '2.0',
        id,
        result: textResult({
          status: 'Requires Authorization',
          error: err.message,
          appleCallsEnabled: false,
        }),
      };
    }
    return {
      jsonrpc: '2.0',
      id,
      result: textResult({
        status: 'error',
        error: err && err.message ? err.message : 'Tool failed',
        httpStatus: err && err.status ? err.status : undefined,
      }),
    };
  }
}

module.exports = {
  corsHeaders,
  sendJson,
  requireSharedSecret,
  handleMcpMessage,
  publicStatus,
};
