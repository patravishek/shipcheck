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
import { scan, formatReport, formatJson } from '@shipsafe/core';

const server = new Server(
  { name: 'shipsafe', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'scan_project',
      description:
        'Scan a project directory for security vulnerabilities. Explains every issue in plain English — no security jargon. Returns a structured report with critical issues, warnings, and a safety score.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'Absolute path to the project directory to scan. Defaults to the current working directory.',
          },
          format: {
            type: 'string',
            enum: ['text', 'json'],
            description: 'Output format. "text" for human-readable, "json" for structured data.',
            default: 'text',
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
    const format = (args?.format as string) || 'text';

    if (!existsSync(projectPath)) {
      throw new McpError(ErrorCode.InvalidParams, `Path does not exist: ${projectPath}`);
    }

    try {
      const result = await scan({ projectPath });
      const output = format === 'json' ? formatJson(result) : formatReport(result);

      return {
        content: [{ type: 'text', text: output }],
      };
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
      const result = await scan({
        projectPath,
        // Only scan the specific file by running all checks against a single-file context
      });

      // Filter issues to only those referencing this file
      const relPath = absolutePath.replace(projectPath + '/', '');
      const fileIssues = [
        ...result.critical,
        ...result.warnings,
        ...result.info,
      ].filter((i) => !i.file || i.file === relPath || i.file.endsWith(relPath));

      if (fileIssues.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ No security issues found in ${relPath}`,
            },
          ],
        };
      }

      const lines = [`🔍 Security issues in \`${relPath}\`:\n`];
      fileIssues.forEach((issue, i) => {
        lines.push(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        lines.push(`   ${issue.description}`);
        lines.push(`   Fix: ${issue.fix}\n`);
      });

      return { content: [{ type: 'text', text: lines.join('\n') }] };
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

      if (envIssues.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '✅ Environment variables look safe!\n\n✓ .env files are in .gitignore\n✓ No secrets found in client-side code\n✓ No NEXT_PUBLIC_ leaks detected',
            },
          ],
        };
      }

      const lines = [
        `🔍 Environment Variable Security Check\n${'━'.repeat(40)}\n`,
        `Found ${envIssues.length} issue${envIssues.length > 1 ? 's' : ''}:\n`,
      ];
      envIssues.forEach((issue, i) => {
        lines.push(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        if (issue.file) lines.push(`   📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        lines.push(`   ${issue.description}`);
        lines.push(`   🔧 ${issue.fix}\n`);
      });

      return { content: [{ type: 'text', text: lines.join('\n') }] };
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
  console.error('ShipSafe MCP server error:', err);
  process.exit(1);
});
