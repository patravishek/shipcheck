# @shipcheck/core

**The scanner engine powering ShipCheck — 13 deterministic security checks for vibe-coded apps.**

[![npm](https://img.shields.io/npm/v/@shipcheck/core)](https://www.npmjs.com/package/@shipcheck/core)

This is the shared library used by `@shipcheck/cli` and `@shipcheck/mcp-server`.

**Most users should install one of those instead:**
- `npm install -g @shipcheck/cli` → terminal + pre-commit hook
- `@shipcheck/mcp-server` → Claude Code / Cursor integration

Use this package if you're building a tool, editor plugin, or integration on top of ShipCheck's scanner.

---

## API

```ts
import { scan, formatReport } from '@shipcheck/core';

const result = await scan({ projectPath: '/path/to/project' });

console.log(result.score);        // 0–10
console.log(result.critical);     // issues to fix before shipping
console.log(result.warnings);     // issues to fix soon
console.log(result.positives);    // things done right

// Plain-text formatted report
console.log(formatReport(result));
```

### `scan(options)`

| Option | Type | Description |
|---|---|---|
| `projectPath` | `string` | Absolute path to the project root |
| `checks` | `string[]` | Run specific check IDs only (optional) |
| `verbose` | `boolean` | Extra logging (optional) |

### `ScanResult`

```ts
{
  score: number;          // 0–10
  scannedFiles: number;
  scanDurationMs: number;
  frameworks: string[];   // e.g. ['nextjs', 'supabase']
  critical: Issue[];
  warnings: Issue[];
  info: Issue[];
  positives: string[];
}
```

### `Issue`

```ts
{
  checkId: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;    // plain English explanation
  fix: string;            // plain English fix instruction
  file?: string;
  line?: number;
}
```

---

## Check IDs

| ID | Severity | What it finds |
|---|---|---|
| `exposed-secrets` | critical | Server secrets in `'use client'` files |
| `missing-gitignore` | critical | `.env` not in `.gitignore` |
| `unauth-api-routes` | critical | API routes with no auth |
| `hardcoded-credentials` | critical | API keys in source code |
| `dangerous-patterns` | critical | `eval()`, SQL injection, `dangerouslySetInnerHTML` |
| `next-public-secrets` | critical | Secrets in `NEXT_PUBLIC_` variables |
| `supabase-rls` | critical | Tables without Row Level Security |
| `supabase-deprecated-session` | critical | `getSession()` in server-side code (forgeable cookie) |
| `cursor-rules-backdoor` | critical | Hidden Unicode in AI rules files (supply chain attack) |
| `missing-input-validation` | warning | No Zod/Yup on API routes |
| `no-rate-limiting` | warning | Auth routes without rate limiting |
| `insecure-cors` | warning | Wildcard CORS configuration |
| `server-action-auth` | warning | Next.js server actions without auth check |
