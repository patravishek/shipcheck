# @shipcheck/cli

**Security scanner for vibe-coded apps — runs automatically on every git commit.**

[![npm](https://img.shields.io/npm/v/@shipcheck/cli)](https://www.npmjs.com/package/@shipcheck/cli)

Install once. Never think about security scanning again.

---

## Install & Set Up

```bash
npm install -g @shipcheck/cli
shipcheck install-hook
```

That's it. Every `git commit` on every project on your machine now scans staged files automatically.

---

## Pre-Commit Hook Behaviour

**No issues → silent, commit proceeds**

**Warnings → commit proceeds with a notice:**
```
⚠️  ShipCheck: 2 warnings in staged files (commit allowed)

  1. No input validation — src/app/api/checkout/route.ts
  2. No rate limiting — src/app/api/auth/login/route.ts
```

**Critical issue → commit is blocked:**
```
❌ ShipCheck blocked: 1 critical issue in staged files

  1. No auth check on API route
     📁 src/app/api/payments/route.ts:12
     Anyone can call this endpoint without being logged in.
     🔧 Add a session check at the top of the handler.

  Fix the issues above, then commit again.
  To skip this check:  git commit --no-verify
```

---

## Manual Scanning

```bash
shipcheck .                          # scan current directory
shipcheck /path/to/project           # scan a specific path
shipcheck . --json                   # JSON output (for CI pipelines)
shipcheck . --fix                    # auto-add .env to .gitignore
shipcheck . --checks exposed-secrets # run one specific check
```

Exit code `1` on criticals — works in CI pipelines.

---

## Hook Management

```bash
shipcheck install-hook     # install globally (all repos, one setup)
shipcheck uninstall-hook   # remove hook and restore git config
```

---

## What It Catches

**Critical (blocks commit)**
- Server secrets in `'use client'` files
- `.env` not in `.gitignore`
- API routes with no auth check
- Hardcoded API keys in source
- `eval()`, SQL injection, `dangerouslySetInnerHTML`
- `NEXT_PUBLIC_` variables leaking secrets
- Supabase tables without Row Level Security

**Warnings (commit allowed, shown as notice)**
- No Zod/Yup/Joi validation on API routes
- Auth routes without rate limiting
- Wildcard CORS configuration

---

## Also Available As

**MCP server** — use ShipCheck inside Claude Code or Cursor:
```bash
claude mcp add shipcheck npx @shipcheck/mcp-server
```
