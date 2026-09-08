# OrgSuite App Store Connect MCP

HTTPS MCP server for Grok Custom Connectors. Wraps Apple App Store Connect REST (`https://api.appstoreconnect.apple.com`) behind Model Context Protocol.

Apple does **not** publish an official MCP URL. This server is the OrgSuite-owned endpoint.

## Live endpoints (verified 2026-09-09)

- Health: https://orgsuite-asc-mcp-pse-sent.vercel.app/api/health
- MCP: https://orgsuite-asc-mcp-pse-sent.vercel.app/api/mcp
- Alias: https://orgsuite-asc-mcp-pse-sent.vercel.app/mcp

Live probe: MCP `initialize` and `tools/list` succeed. `auth_status` reports Apple keys **not** set.

## Status

| Layer | Status |
|---|---|
| MCP HTTP host | **Completed** — Vercel project `orgsuite-asc-mcp` |
| Apple App Store data | **Requires Authorization** — set Vercel env vars |
| Grok Custom Connector | **Requires Authorization** — Grok directory currently only offers Google Drive and OneDrive. Paste the URL only if Custom Connector appears in your Grok settings. |
| Docker / Caddy package | **Available** in this repo |

## Environment variables (Vercel or host — never commit)

- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY` (full PEM, or `\\n`-escaped PEM)
- `MCP_SHARED_SECRET` (optional Bearer gate)

Create the Apple key in App Store Connect → Users and Access → Integrations → App Store Connect API. Use the lowest role that can list apps and builds.

## Tools (read-only)

- `health`
- `auth_status`
- `list_apps`
- `get_app`
- `list_builds`

Write operations are intentionally omitted.

## Owner actions remaining

1. Vercel → project `orgsuite-asc-mcp` → Environment Variables → add the three Apple values → Redeploy.
2. Optional: point `asc.psemanagement.services` (or another domain you control) at this Vercel project.
3. If Grok shows Custom Connector, paste `https://orgsuite-asc-mcp-pse-sent.vercel.app/api/mcp`.
4. Confirm with `auth_status` that `appleCallsEnabled` is true.

Tracker: PSE-73
