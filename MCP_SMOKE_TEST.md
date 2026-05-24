# ShipSafe MCP Server — Smoke Test Guide

## Step 1 — Register the MCP server

Run this in your terminal **outside of any `claude` session**:

```bash
# Installed from npm:
claude mcp add shipsafe npx @shipsafe/mcp-server

# Running from local source (dev only):
claude mcp add shipsafe node /path/to/shipsafe/packages/mcp-server/dist/index.js
```

This writes the config to `~/.claude.json` — the only method that works reliably with the Claude Code CLI. Do not edit `settings.json` or `.mcp.json` manually.

---

## Step 2 — Verify it connected

Start a fresh `claude` session, then run:

```
/mcp
```

You should see:

```
Local MCP
❯ shipsafe · ✔ connected
```

If it shows `✗ failed` instead, see [Troubleshooting](#troubleshooting).

---

## Step 3 — Test `scan_project`

Paste this into Claude Code:

> "Use the ShipSafe scan_project tool to scan `/path/to/your/project` and tell me the top security issues."

**Expected:** Claude calls `shipsafe__scan_project`, returns critical issues, warnings, and a score out of 10.

---

## Step 4 — Test `scan_file`

> "Use ShipSafe to scan this single file: `/path/to/your/project/src/app/api/some-route/route.ts`"

**Expected:** Claude calls `shipsafe__scan_file`, flags any auth, injection, or credential issues in that file.

---

## Step 5 — Test `check_env`

> "Use ShipSafe's check_env tool on `/path/to/your/project`"

**Expected:** Claude calls `shipsafe__check_env`, reports whether .env files are gitignored and whether any NEXT_PUBLIC_ variables are leaking secrets.

---

## Step 6 — Test the natural language flow

This is the real value prop:

> "I'm about to deploy. Can you run a ShipSafe security scan and tell me what I need to fix before going live?"

**Expected:** Claude calls `scan_project` on the current directory, then explains findings in plain English with prioritized fixes — no security jargon.

---

## Troubleshooting

**`shipsafe · ✗ failed` in /mcp**

The server crashed on startup. Test it directly:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' \
  | node /Users/avishekpatra/Projects/shipsafe/packages/mcp-server/dist/index.js
```
Should print a JSON response. If it crashes, rebuild first:
```bash
cd /Users/avishekpatra/Projects/shipsafe && pnpm build
```

**ShipSafe not appearing in /mcp at all**

Don't edit `settings.json` or `.mcp.json` manually — use the CLI command:
```bash
claude mcp add shipsafe npx @shipsafe/mcp-server
```

**Another tool (e.g. memex) grabbed `scan_project` instead**

Always ask by server name to avoid ambiguity:
> "Use the **ShipSafe** scan_project tool…"

Claude will route to the correct server.
