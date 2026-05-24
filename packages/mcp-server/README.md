# @shipcheck/mcp-server

**ShipCheck inside Claude Code, Cursor, and any MCP-compatible agent.**

[![npm](https://img.shields.io/npm/v/@shipcheck/mcp-server)](https://www.npmjs.com/package/@shipcheck/mcp-server)

Gives your AI coding agent a dedicated security scanner. Instead of hoping Claude reads the right files and asks the right questions, ShipCheck deterministically scans your entire project and returns structured results Claude can explain and act on.

**No code leaves your machine.** Runs entirely locally.

---

## Setup

### Claude Code

Run once in your terminal:

```bash
claude mcp add shipcheck npx @shipcheck/mcp-server
```

Restart Claude. Then just ask:

> "Scan my project for security issues before I deploy"
> "Is this API route safe?"
> "Check if my environment variables are configured correctly"
> "Does this server action have an auth check?"

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shipcheck": {
      "command": "npx",
      "args": ["-y", "@shipcheck/mcp-server"]
    }
  }
}
```

---

## Tools

### `scan_project`
Full security audit of a project directory. Returns a score, critical issues with fix instructions, and a warning summary.

```
path    — absolute path to scan (defaults to cwd)
detail  — "summary" (default) or "full" (includes fixes for all warnings)
format  — "json" (default) or "text"
```

### `scan_file`
Security audit of a single file — useful when you've just written a new API route, server action, or component.

```
path    — absolute path to the file (required)
```

### `check_env`
Focused audit of environment variable safety. Checks for exposed secrets, missing `.gitignore` entries, and `NEXT_PUBLIC_` leaks.

```
path    — absolute path to project directory (defaults to cwd)
```

---

## What It Catches (13 checks)

**Critical**
- Server secrets in `'use client'` files
- `.env` not in `.gitignore`
- API routes with no auth check
- Hardcoded API keys in source
- `eval()`, SQL injection, `dangerouslySetInnerHTML`
- `NEXT_PUBLIC_` variables leaking secrets
- Supabase tables without Row Level Security
- `getSession()` in server-side code — trusts forgeable cookies, use `getUser()` instead
- Hidden Unicode characters in AI rules files (`.cursor/rules`, `CLAUDE.md`) — supply chain backdoor

**Warnings**
- No Zod/Yup/Joi validation on API routes
- Auth routes without rate limiting
- Wildcard CORS configuration
- Next.js server actions with no authentication check

---

## Why MCP Over Just Asking Claude?

| | Asking Claude directly | ShipCheck MCP |
|---|---|---|
| Coverage | Files that fit in context window | Every file in your project |
| Consistency | Varies by prompt and context | Same checks every time |
| Speed | Minutes for large projects | Under 100ms |
| API cost | Burns tokens on file reading | Zero — runs locally |
| Structured output | Free-form text | JSON with score, severity, fix |

---

## Also Available As

**CLI with pre-commit hook** — scans automatically on every `git commit` and appends a score line to your commit message:
```bash
npm install -g @shipcheck/cli
shipcheck install-hook
```
