# ShipCheck

> Security scanner for vibe-coded apps — plain English, no jargon.

Scans your project for the security issues that kill AI-generated apps in production. Explains every issue in plain English. Works as a CLI or as an MCP server inside Claude Code, Cursor, and any MCP-compatible agent.

**No code leaves your machine.** The scanner runs entirely locally.

---

## Quick Start

```bash
# Scan the current directory
npx @shipcheck/cli .

# Scan a specific project
npx @shipcheck/cli /path/to/my-app
```

## What It Catches

### Critical (fix before shipping)
1. **Exposed secrets in client code** — Supabase service keys, Stripe secrets, DB URLs accessed in `'use client'` files or components
2. **Missing .gitignore** — `.env` files that will be pushed to GitHub
3. **Unauthenticated API routes** — Endpoints that return data without checking who's asking
4. **Hardcoded credentials** — Stripe keys, OpenAI keys, AWS tokens directly in source code
5. **Dangerous patterns** — `eval()`, `new Function()`, `dangerouslySetInnerHTML` with dynamic content, SQL string interpolation
6. **NEXT_PUBLIC_ secret leaks** — Service role keys, webhook secrets prefixed with `NEXT_PUBLIC_`

### Warnings (fix soon)
7. **Missing input validation** — API routes that read request body/params without Zod/Yup/Joi validation
8. **No rate limiting on auth routes** — Login, register, reset-password without request rate limiting
9. **Supabase RLS not enabled** — Tables created without Row Level Security
10. **Insecure CORS** — Wildcard `*` or unconfigured `cors()` that allows any website to call your API

---

## CLI Usage

```bash
npx @shipcheck/cli .                    # Scan current directory
npx @shipcheck/cli ./my-app             # Scan specific path
npx @shipcheck/cli . --json             # Output JSON (useful for CI)
npx @shipcheck/cli . --fix              # Auto-fix: adds .gitignore entries
npx @shipcheck/cli . --verbose          # Show extra detail on errors
npx @shipcheck/cli . --checks missing-gitignore,exposed-secrets  # Run specific checks
```

Exit code `1` when critical issues are found (useful for CI pipelines).

---

## MCP Server (Claude Code / Cursor)

Add ShipCheck as an MCP server so your AI coding agent can scan your project on demand.

### Claude Code (recommended)

Run this once in your terminal:

```bash
claude mcp add shipcheck npx @shipcheck/mcp-server
```

Then ask Claude:
```
> "Scan my project for security issues"
> "Check if my environment variables are safe"
> "Is this file secure?"
```

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

### MCP Tools Available

| Tool | What it does |
|---|---|
| `scan_project` | Full security audit with plain-English report |
| `scan_file` | Scan a single file for issues |
| `check_env` | Focused audit of environment variable safety |

---

## Monorepo Structure

```
packages/
  core/         @shipcheck/core        — Scanner engine (shared logic, 10 checks)
  mcp-server/   @shipcheck/mcp-server  — MCP server entry point
  cli/          @shipcheck/cli         — CLI (bin: shipcheck)
```

## Development

```bash
pnpm install
pnpm build

# Scan a project
node packages/cli/dist/index.js /path/to/project

# Run MCP server locally
node packages/mcp-server/dist/index.js
```

---

## Security Checks Reference

| ID | Name | Tier | Severity |
|---|---|---|---|
| `exposed-secrets` | Server secrets in client code | 1 | Critical |
| `missing-gitignore` | .env not in .gitignore | 1 | Critical |
| `unauth-api-routes` | API routes without auth | 1 | Critical |
| `hardcoded-credentials` | API keys in source code | 1 | Critical |
| `dangerous-patterns` | eval, dangerouslySetInnerHTML, SQL injection | 1 | Critical/Warning |
| `next-public-secrets` | NEXT_PUBLIC_ secret leaks | 2 | Critical |
| `missing-input-validation` | No Zod/Yup validation on API routes | 2 | Warning |
| `no-rate-limiting` | Auth routes without rate limiting | 2 | Warning |
| `supabase-rls` | Tables without Row Level Security | 2 | Critical |
| `insecure-cors` | Wildcard CORS configuration | 2 | Warning |

---

## Roadmap

- **Phase 2** (coming): 20 checks, web report sharing, `--share` flag, expanded MCP tools
- **Phase 3** (coming): GitHub Action, paid tier, scan history dashboard
- **Phase 4** (coming): Lovable/Bolt/v0-specific check packs, partner integrations

---

## Why ShipCheck?

Every security tool outputs CWE IDs, CVSS scores, and stack traces. Vibe coders don't speak that language. ShipCheck tells you:

> "Your database password is public" — not "CWE-200: Information Exposure Through an Error Message (CVSS 7.5)"

Built for founders who used Claude Code, Cursor, or Lovable to ship their SaaS — not for enterprise security teams.

---

MIT License
