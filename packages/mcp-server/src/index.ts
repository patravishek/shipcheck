#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { scan, formatReport } from '@shipcheck/core';
import type { Issue, ScanResult } from '@shipcheck/core';

const server = new Server(
  { name: 'shipcheck', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

// Compact issue shape — title + file + severity only, no description/fix text
function slim(issue: Issue) {
  return {
    severity: issue.severity,
    title: issue.title,
    file: issue.file ?? null,
    line: issue.line ?? null,
  };
}

// Full issue shape — includes description and fix for actionable output
function full(issue: Issue) {
  return {
    severity: issue.severity,
    title: issue.title,
    file: issue.file ?? null,
    line: issue.line ?? null,
    description: issue.description,
    fix: issue.fix,
  };
}

function summarise(result: ScanResult, detail: 'summary' | 'full') {
  // Critical issues always get full detail — they need to be acted on immediately
  // Warnings are slim by default to keep token count low
  return {
    score: result.score,
    scannedFiles: result.scannedFiles,
    scanDurationMs: result.scanDurationMs,
    frameworks: result.frameworks,
    counts: {
      critical: result.critical.length,
      warnings: result.warnings.length,
      info: result.info.length,
    },
    critical: result.critical.map(full),
    warnings: detail === 'full' ? result.warnings.map(full) : result.warnings.map(slim),
    positives: result.positives,
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'scan_project',
      description:
        'Scan a project directory for security vulnerabilities. Returns critical issues with full details and a summary of warnings. Use detail="full" to get fix instructions for warnings too.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute path to the project directory to scan. Defaults to current working directory.',
          },
          detail: {
            type: 'string',
            enum: ['summary', 'full'],
            description: '"summary" (default) — critical issues in full, warnings as title+file only. "full" — everything including fix instructions for all warnings.',
            default: 'summary',
          },
          format: {
            type: 'string',
            enum: ['json', 'text'],
            description: '"json" (default) for structured data, "text" for human-readable terminal output.',
            default: 'json',
          },
        },
        required: [],
      },
    },
    {
      name: 'scan_file',
      description: 'Scan a single file for security issues and explain them in plain English.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute path to the file to scan.',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'check_env',
      description:
        'Check if environment variables and .env files are configured safely. Detects exposed secrets, missing .gitignore entries, and NEXT_PUBLIC_ variables that should be private.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute path to the project directory.',
          },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'scan_project') {
    const rawPath = (args?.path as string) || process.cwd();
    const projectPath = resolve(rawPath);
    const format = (args?.format as string) || 'json';
    const detail = ((args?.detail as string) || 'summary') as 'summary' | 'full';

    if (!existsSync(projectPath)) {
      throw new McpError(ErrorCode.InvalidParams, `Path does not exist: ${projectPath}`);
    }

    try {
      const result = await scan({ projectPath });
      const output = format === 'text'
        ? formatReport(result)
        : JSON.stringify(summarise(result, detail), null, 2);

      return { content: [{ type: 'text', text: output }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Scan failed: ${message}`);
    }
  }

  if (name === 'scan_file') {
    const filePath = args?.path as string;
    if (!filePath) throw new McpError(ErrorCode.InvalidParams, 'path is required');

    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath)) {
      throw new McpError(ErrorCode.InvalidParams, `File does not exist: ${absolutePath}`);
    }

    const projectPath = absolutePath.split('/').slice(0, -1).join('/');

    try {
      const result = await scan({ projectPath });

      const relPath = absolutePath.replace(projectPath + '/', '');
      const fileIssues = [
        ...result.critical,
        ...result.warnings,
        ...result.info,
      ].filter((i) => !i.file || i.file === relPath || i.file.endsWith(relPath));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            file: relPath,
            issueCount: fileIssues.length,
            issues: fileIssues.map(full),
          }, null, 2),
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `File scan failed: ${message}`);
    }
  }

  if (name === 'check_env') {
    const rawPath = (args?.path as string) || process.cwd();
    const projectPath = resolve(rawPath);

    if (!existsSync(projectPath)) {
      throw new McpError(ErrorCode.InvalidParams, `Path does not exist: ${projectPath}`);
    }

    try {
      const result = await scan({
        projectPath,
        checks: ['missing-gitignore', 'next-public-secrets', 'exposed-secrets', 'hardcoded-credentials'],
      });

      const envIssues = [...result.critical, ...result.warnings, ...result.info];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            issueCount: envIssues.length,
            issues: envIssues.map(full),
          }, null, 2),
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new McpError(ErrorCode.InternalError, `Env check failed: ${message}`);
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('ShipCheck MCP server error:', err);
  process.exit(1);
});
