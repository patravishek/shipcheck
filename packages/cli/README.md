# @shipcheck/cli

> Security scanner for vibe-coded apps — plain English, no jargon.

Scans your Next.js / Supabase / AI-generated project for security issues before you ship. No CWE IDs, no CVSS scores — just "here's what's wrong and how to fix it."

**No code leaves your machine.** Runs entirely locally.

## Quick Start

```bash
npx @shipcheck/cli .
```

## Usage

```bash
npx @shipcheck/cli .                        # Scan current directory
npx @shipcheck/cli /path/to/project         # Scan specific path
npx @shipcheck/cli . --json                 # JSON output (for CI)
npx @shipcheck/cli . --fix                  # Auto-fix: adds .gitignore entries
npx @shipcheck/cli . --checks exposed-secrets,missing-gitignore  # Run specific checks
```

Exit code `1` when critical issues are found — works in CI pipelines.

## What It Catches

**Critical (fix before shipping)**
- Exposed secrets in `'use client'` files — Supabase service keys, Stripe secrets
- `.env` files not in `.gitignore`
- API routes with no auth check
- Hardcoded API keys in source code
- `eval()`, `dangerouslySetInnerHTML`, SQL string injection
- `NEXT_PUBLIC_` variables leaking secrets

**Warnings (fix soon)**
- API routes with no input validation (Zod/Yup/Joi)
- Auth routes with no rate limiting
- Supabase tables without Row Level Security
- Wildcard CORS configuration

## Also Available As

- **MCP Server** (`@shipcheck/mcp-server`) — use ShipCheck directly inside Claude Code or Cursor
