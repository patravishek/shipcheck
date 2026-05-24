# @shipcheck/mcp-server

> ShipCheck as an MCP server — security scanning inside Claude Code, Cursor, and any MCP-compatible agent.

Lets your AI coding agent scan your project for security issues on demand, in plain English. No CWE IDs, no CVSS scores.

**No code leaves your machine.** Runs entirely locally.

## Setup

### Claude Code (recommended)

```bash
claude mcp add shipcheck npx @shipcheck/mcp-server
```

Then start a new Claude session and ask:
> "Scan my project for security issues before I deploy"

### Cursor / other MCP clients

Add to your MCP config (`~/.cursor/mcp.json` or equivalent):

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

## Tools

### `scan_project`
Full security audit of a project directory.

```
path    — absolute path to scan (defaults to cwd)
detail  — "summary" (default) or "full" (includes fix instructions for all warnings)
format  — "json" (default) or "text"
```

### `scan_file`
Scan a single file and explain any issues found.

```
path    — absolute path to the file (required)
```

### `check_env`
Focused audit of environment variable safety — detects exposed secrets, missing `.gitignore` entries, and `NEXT_PUBLIC_` leaks.

```
path    — absolute path to project directory (defaults to cwd)
```

## Example Prompts

> "Run a ShipCheck security scan on this project and tell me what to fix before going live"

> "Use ShipCheck to scan src/app/api/payment/route.ts"

> "Check if my environment variables are configured safely"

## Also Available As

- **CLI** (`@shipcheck/cli`) — `npx @shipcheck/cli .` for standalone terminal use
