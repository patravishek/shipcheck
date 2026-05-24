# ShipSafe — Claude Code Context

## What This Is
ShipSafe is a security scanner for vibe-coded apps (Next.js, Supabase, etc.) that explains every vulnerability in plain English — no CWE IDs or CVSS scores. Built for non-technical founders shipping AI-generated code.

**Format:** MCP Server + CLI (`npx @shipsafe/cli .`) + GitHub Action (Phase 3)

**GitHub:** https://github.com/patravishek/ship-safe

## Monorepo Structure
```
packages/
  core/         @shipsafe/core        — Scanner engine: 10 security checks, file walker, reporter
  mcp-server/   @shipsafe/mcp-server  — MCP server (scan_project, scan_file, check_env tools)
  cli/          @shipsafe/cli         — CLI with chalk output, bin: shipsafe
```

## Common Commands
```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages (tsc)
pnpm -r dev           # Watch mode across all packages

# Test the CLI on any project
node packages/cli/dist/index.js /path/to/project
node packages/cli/dist/index.js .           # scan this repo
node packages/cli/dist/index.js . --json    # JSON output
node packages/cli/dist/index.js . --fix     # auto-fix .gitignore

# Run MCP server locally
node packages/mcp-server/dist/index.js
```

## Use ShipSafe as MCP Server (in this Claude Code instance)

**The only reliable method — use the CLI command (run this in terminal, outside of a `claude` session):**

```bash
# If installed from npm (after publish):
claude mcp add shipsafe npx @shipsafe/mcp-server

# If running from local source (dev only):
claude mcp add shipsafe node /Users/avishekpatra/Projects/shipsafe/packages/mcp-server/dist/index.js
```
Then start a fresh `claude` session. Run `/mcp` to confirm `shipsafe · ✔ connected` appears.

> **Why not edit settings.json or .mcp.json directly?**
> Claude Code CLI stores MCP servers in `~/.claude.json` scoped to a project path.
> Manually editing other config files is unreliable — use `claude mcp add` instead.

## Tech Stack
- **Language:** TypeScript 6, ESM throughout (`"type": "module"`)
- **Module resolution:** NodeNext — all imports need `.js` extensions
- **Package manager:** pnpm workspaces
- **Key deps:** `fast-glob`, `ignore`, `@modelcontextprotocol/sdk@1.29.0`, `chalk@5`, `commander@14`
- **Node types:** Each package needs `"types": ["node"]` in tsconfig (TS6 requirement)

## Security Checks (10 implemented — Phase 1)
| ID | Tier | Severity |
|---|---|---|
| `exposed-secrets` | 1 | Critical — server secrets in `'use client'` files |
| `missing-gitignore` | 1 | Critical — .env not in .gitignore |
| `unauth-api-routes` | 1 | Critical — API routes with no auth |
| `hardcoded-credentials` | 1 | Critical — real API keys in source |
| `dangerous-patterns` | 1 | Critical — eval, dangerouslySetInnerHTML, SQL injection |
| `next-public-secrets` | 2 | Critical — NEXT_PUBLIC_ leaking secrets |
| `missing-input-validation` | 2 | Warning — no Zod/Yup on API routes |
| `no-rate-limiting` | 2 | Warning — auth routes without rate limiting |
| `supabase-rls` | 2 | Critical — tables without RLS |
| `insecure-cors` | 2 | Warning — wildcard CORS |

New checks go in `packages/core/src/checks/tier1/` or `tier2/`. Register in `packages/core/src/checks/index.ts`.

## False Positive Prevention
`packages/core/src/utils.ts` exports `isInCodeContext(content, matchIndex)` — use this in every regex-based check to skip matches inside string literals and `//` comments.

## Build Phases
- **Phase 1** ✅ Complete — 10 checks, CLI, MCP server (3 tools)
- **Phase 2** — 20 checks, web report hosting, `--share` flag, more MCP tools
- **Phase 3** — GitHub Action, Stripe billing, user accounts, `.shipsaferc` config
- **Phase 4** — Growth, partner integrations, community rules

## npm Publishing Note
`shipsafe` on npm is available. Publish as `@shipsafe/cli` and `@shipsafe/mcp-server` under the `@shipsafe` org scope. Publish target: end of Phase 1 (v0.1.0).

## Score Formula
`max(0, 10 - critical_count × 2 - warning_count × 0.5)` rounded to 1 decimal.
