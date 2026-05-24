import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

function extractTableNames(sql: string): string[] {
  const names: string[] = [];
  // Match CREATE TABLE statements
  const createPattern = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?"?(\w+)"?/gi;
  let match: RegExpExecArray | null;
  while ((match = createPattern.exec(sql)) !== null) {
    const name = match[1].toLowerCase();
    // Skip Supabase system tables
    if (!name.startsWith('pg_') && !['schema_migrations', 'supabase_migrations'].includes(name)) {
      names.push(name);
    }
  }
  return names;
}

function hasRlsEnabled(sql: string, tableName: string): boolean {
  const pattern = new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?["']?${tableName}["']?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i',
  );
  return pattern.test(sql);
}

async function readMigrations(projectPath: string): Promise<string> {
  const migrationsDir = join(projectPath, 'supabase', 'migrations');
  if (!existsSync(migrationsDir)) return '';

  let combinedSql = '';
  try {
    const files = await readdir(migrationsDir);
    for (const f of files.sort()) {
      if (!f.endsWith('.sql')) continue;
      const { readFile } = await import('node:fs/promises');
      const content = await readFile(join(migrationsDir, f), 'utf-8');
      combinedSql += content + '\n';
    }
  } catch {
    // ignore read errors
  }
  return combinedSql;
}

export const supabaseRls: Check = {
  id: 'supabase-rls',
  name: 'Supabase tables without Row Level Security',
  tier: 2,
  async run(ctx: CheckContext): Promise<CheckResult> {
    if (!ctx.frameworks.has('supabase')) return [];

    const issues: Issue[] = [];

    // Check migration files for tables without RLS
    const migrationsSql = await readMigrations(ctx.projectPath);
    if (migrationsSql) {
      const tables = extractTableNames(migrationsSql);
      const tablesWithoutRls = tables.filter((t) => !hasRlsEnabled(migrationsSql, t));

      for (const table of tablesWithoutRls) {
        issues.push({
          id: `supabase-rls:${table}`,
          checkId: 'supabase-rls',
          severity: 'critical',
          title: `TABLE "${table.toUpperCase()}" HAS NO ROW LEVEL SECURITY`,
          description: `The Supabase table \`${table}\` doesn't have Row Level Security (RLS) enabled. This means any user who gets hold of your Supabase URL and anon key can read, write, or delete ALL rows in this table — including other users' private data.`,
          fix: `Add this to your migration SQL:\n\nALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n\nThen add policies for what each role can do:\nCREATE POLICY "Users can read own data" ON public.${table}\n  FOR SELECT USING (auth.uid() = user_id);`,
          file: `supabase/migrations/`,
        });
      }
    }

    // Also check for Supabase admin client used in suspicious contexts
    for (const file of ctx.files) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file.relativePath)) continue;

      // Admin/service role client used in a 'use client' file
      const hasUseClient = /^\s*['"]use client['"]/m.test(file.content.slice(0, 300));
      const hasAdminClient =
        /createClient.*service_role|SUPABASE_SERVICE_ROLE/.test(file.content) ||
        /supabaseAdmin|adminClient|serviceClient/.test(file.content);

      if (hasUseClient && hasAdminClient) {
        issues.push({
          id: `supabase-rls:admin-client-in-browser:${file.relativePath}`,
          checkId: 'supabase-rls',
          severity: 'critical',
          title: 'SUPABASE ADMIN CLIENT USED IN BROWSER CODE',
          description: `\`${file.relativePath}\` is a client component (has 'use client') but creates a Supabase admin/service role client. The service role key bypasses ALL Row Level Security — exposing this to the browser lets anyone on your site read, write, or delete your entire database.`,
          fix: 'Move all Supabase admin client usage to server-only files. Client components should only use the anon Supabase client with proper RLS policies.',
          file: file.relativePath,
        });
      }
    }

    return issues;
  },
};
