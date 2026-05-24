# ShipCheck

**Security scanner for vibe-coded apps — plain English, no jargon.**

[![npm](https://img.shields.io/npm/v/@shipcheck/cli)](https://www.npmjs.com/package/@shipcheck/cli)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

AI coding tools write code fast. They also silently skip auth checks, leave API keys in client code, and create database tables without Row Level Security.

ShipCheck catches these before they reach production — automatically, on every `git commit`, in plain English.

---

## The Problem

You built your app with Claude Code, Cursor, Lovable, or Bolt. You shipped fast. But somewhere in those 200 AI-generated files:

- An API route has no authentication check — anyone can call it
- Your Supabase service key is in a `'use client'` file — visible in the browser
- Four tables have no Row Level Security — any user can read every row
- A `.env` file is not in `.gitignore` — one push away from being public
- A server action has no auth check — any unauthenticated client can invoke it directly
- Your AI rules file contains hidden Unicode characters — a supply chain attack waiting to happen

You won't know until someone exploits it. ShipCheck finds it first.

---

## Get Started

**Step 1 — Install the CLI:**

```bash
npm install -g @shipcheck/cli
```

**Step 2 — Install the pre-commit hook once:**

```bash
shipcheck install-hook
```

That's it. Every `git commit` across every project on your machine now runs a security scan automatically. You never have to think about it again.

---

## How It Works

### Automatic — pre-commit hook

After `shipcheck install-hook`, every commit is scanned before it lands in your history.

**Clean commit — silent pass, attestation appended:**
```
[main abc1234] add payment route
ShipCheck: score:9.0/10 | criticals:0 | warnings:0
```

**Warnings found — commit proceeds with a notice:**
```
⚠️  ShipCheck: 2 warnings in staged files (commit allowed)

  1. No input validation on request body — src/app/api/checkout/route.ts
  2. No rate limiting on auth route — src/app/api/auth/login/route.ts
```

**Critical found — commit is blocked:**
```
❌ ShipCheck blocked: 1 critical issue in staged files

  1. No auth check on API route
     📁 src/app/api/payments/route.ts:12
     Anyone can call this endpoint without being logged in. Your payment
     logic is exposed to the public internet.
     🔧 Check for a valid session at the top of the handler.

  Fix the issues above, then commit again.
  To skip this check:  git commit --no-verify
```

The hook only scans files you're actually committing — not your entire project. Fast, relevant, zero noise.

### Git log attestation

Every passing commit gets a ShipCheck line appended to the commit message automatically:

```
ShipCheck: score:8.5/10 | criticals:0 | warnings:2
```

Your git log becomes a security audit trail. No extra commands, no separate dashboards.

### Fix prompt — paste into Claude Code or Cursor

When critical issues are found during a full scan, ShipCheck generates a ready-to-paste prompt:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Fix prompt — paste into Claude Code or Cursor:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix these security issues in my project:

1. [src/app/api/payments/route.ts:12] No auth check on API route
   Add a session check at the top of the handler...
```

Copy it, paste it into your AI editor, and let it fix the issues for you.

### On-demand — CLI

Scan any project at any time:

```bash
shipcheck .                          # scan current directory
shipcheck /path/to/project           # scan specific path
shipcheck . --json                   # JSON output for CI
shipcheck . --checks exposed-secrets # run one specific check
shipcheck . --fix                    # auto-fix .gitignore entries
```

### Inside Claude Code or Cursor — MCP server

```bash
claude mcp add shipcheck npx @shipcheck/mcp-server
```

Then ask Claude:

> "Scan my project for security issues before I deploy"
> "Is this API route safe to ship?"
> "Check if my environment variables are configured correctly"

---

## What It Catches

### Critical — blocks commits, fix before shipping

| Check | What it finds |
|---|---|
| `exposed-secrets` | Supabase service keys, Stripe secrets, DB URLs in `'use client'` files |
| `missing-gitignore` | `.env` files not listed in `.gitignore` |
| `unauth-api-routes` | API routes with no authentication check |
| `hardcoded-credentials` | OpenAI keys, Stripe keys, AWS tokens in source code |
| `dangerous-patterns` | `eval()`, `dangerouslySetInnerHTML`, SQL string interpolation |
| `next-public-secrets` | Secrets leaked via `NEXT_PUBLIC_` environment variables |
| `supabase-rls` | Supabase tables created without Row Level Security |
| `supabase-deprecated-session` | `getSession()` in server-side code — trusts forgeable cookies |
| `cursor-rules-backdoor` | Hidden Unicode characters in AI rules files — supply chain attack |

### Warnings — commit proceeds, fix soon

| Check | What it finds |
|---|---|
| `missing-input-validation` | API routes reading request body without Zod/Yup/Joi |
| `no-rate-limiting` | Login, OTP, payment routes without rate limiting |
| `insecure-cors` | Wildcard `*` CORS that allows any origin |
| `server-action-auth` | Next.js server actions callable by any unauthenticated client |

---

## Why Commit-Time?

**Why not just run it manually?**
You won't. Nobody does. Manually-run tools get skipped when you're rushing to ship. A hook runs every time, without you having to remember.

**Why not just CI?**
CI catches issues after the code is already committed and pushed. The hook catches them before bad code enters your history at all — faster feedback, cleaner git log.

**Why not just ask Claude?**
Claude's security analysis varies by prompt and context window. ShipCheck runs the same deterministic checks every time. A score of 7/10 means the same thing today and next month.

**Does it slow down commits?**
No. ShipCheck scans only your staged files (not the whole project) and runs in under 100ms on most codebases.

**Can I bypass it when I need to?**
Yes: `git commit --no-verify` skips the hook for one commit. ShipCheck never hard-locks your workflow.

---

## Security & Privacy

**No code leaves your machine.** ShipCheck runs entirely locally — no API calls, no telemetry, no cloud service. The scan happens in your terminal using the same packages you install from npm.

You can audit every check in the open-source repository: [github.com/patravishek/shipcheck](https://github.com/patravishek/shipcheck)

---

## Packages

| Package | Purpose | Install |
|---|---|---|
| `@shipcheck/cli` | Terminal CLI + pre-commit hook | `npm i -g @shipcheck/cli` |
| `@shipcheck/mcp-server` | MCP server for Claude Code / Cursor | `claude mcp add shipcheck npx @shipcheck/mcp-server` |
| `@shipcheck/core` | Scanner engine (for building integrations) | `npm i @shipcheck/core` |

---

## Roadmap

- **v0.2** — `--share` flag: generate a shareable link to your scan report
- **v0.3** — Score history: track your security score over time across commits
- **v0.4** — GitHub Action: block PRs with new critical issues
- **v0.5** — 20 checks: Prisma injection, missing CSP headers, JWT in localStorage, and more

---

## Contributing

New security checks go in `packages/core/src/checks/tier1/` or `tier2/`. Register them in `packages/core/src/checks/index.ts`. See [CLAUDE.md](./CLAUDE.md) for the full development guide.

---

MIT License
