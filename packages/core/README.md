# @shipcheck/core

> Scanner engine powering ShipCheck — 10 security checks for vibe-coded apps.

This is the shared library used by `@shipcheck/cli` and `@shipcheck/mcp-server`.

**Most users should install one of those instead:**
- `npx @shipcheck/cli .` — run from the terminal
- `@shipcheck/mcp-server` — use inside Claude Code or Cursor

## Use This Package If

You're building a tool, plugin, or integration on top of ShipCheck's scanner engine.

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
  frameworks: string[];   // detected: 'nextjs', 'supabase', etc.
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
  description: string;
  fix: string;
  file?: string;
  line?: number;
}
```

## Check IDs

| ID | Severity |
|---|---|
| `exposed-secrets` | critical |
| `missing-gitignore` | critical |
| `unauth-api-routes` | critical |
| `hardcoded-credentials` | critical |
| `dangerous-patterns` | critical |
| `next-public-secrets` | critical |
| `missing-input-validation` | warning |
| `no-rate-limiting` | warning |
| `supabase-rls` | critical |
| `insecure-cors` | warning |
