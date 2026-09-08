# OrgSuite App Store Connect MCP

HTTPS MCP server for Grok Custom Connectors. Wraps Apple App Store Connect REST (`https://api.appstoreconnect.apple.com`) behind Model Context Protocol.

Apple does **not** publish an official MCP URL. This server is the OrgSuite-owned endpoint.

## Live endpoints

- Health: `https://orgsuite-asc-mcp-pse-sent.vercel.app/api/health`
- MCP (paste into Grok Custom Connector): `https://orgsuite-asc-mcp-pse-sent.vercel.app/api/mcp`

## Status labels

| Layer | Meaning |
|---|---|
| MCP HTTP host | Live after Vercel deploy |
| Apple App Store data | Requires `APP_STORE_CONNECT_*` env vars |
| Grok Custom Connector | Owner must paste the `/api/mcp` URL in Grok settings |

## Environment variables (Vercel only — never commit)

Required for live Apple calls:

- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY` (full PEM, or `\n`-escaped PEM)

Optional:

- `MCP_SHARED_SECRET` — if set, clients must send `Authorization: Bearer <secret>`

Create the Apple key in App Store Connect → Users and Access → Integrations → App Store Connect API. Use the lowest role that can list apps and builds.

## Tools

- `health` — server liveness
- `auth_status` — whether Apple credentials exist (booleans only)
- `list_apps` — GET `/v1/apps`
- `get_app` — GET `/v1/apps/{id}`
- `list_builds` — GET `/v1/builds`

Write operations are intentionally omitted.
