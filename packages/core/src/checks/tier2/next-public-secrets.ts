import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// These keywords in a NEXT_PUBLIC_ variable name strongly suggest it's a secret
const DANGEROUS_KEYWORDS = [
  'SECRET',
  'SERVICE_ROLE',
  'SERVICE_KEY',
  'PRIVATE',
  'ADMIN',
  'WEBHOOK',
  'AUTH_TOKEN',
];

// These are fine as NEXT_PUBLIC_ — they're meant to be public
const SAFE_SUFFIXES = ['URL', 'ANON_KEY', 'ANON', 'PUBLIC_KEY', 'APP_ID', 'PROJECT_ID'];

function parseEnvFile(content: string): Array<{ key: string; value: string; line: number }> {
  const entries: Array<{ key: string; value: string; line: number }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    entries.push({ key, value, line: i + 1 });
  }

  return entries;
}

function isSafeNextPublic(varName: string): boolean {
  const upper = varName.toUpperCase();
  return SAFE_SUFFIXES.some((suffix) => upper.endsWith(suffix) || upper.includes(`_${suffix}`));
}

function isDangerousNextPublic(varName: string): boolean {
  const upper = varName.toUpperCase();
  if (isSafeNextPublic(varName)) return false;
  return DANGEROUS_KEYWORDS.some((kw) => upper.includes(kw));
}

export const nextPublicSecrets: Check = {
  id: 'next-public-secrets',
  name: 'Secrets exposed via NEXT_PUBLIC_ variables',
  tier: 2,
  async run(ctx: CheckContext): Promise<CheckResult> {
    if (!ctx.frameworks.has('nextjs')) return [];

    const issues: Issue[] = [];

    const envFiles = ctx.files.filter((f) => {
      const name = f.relativePath.split('/').pop() ?? '';
      return /^\.env/.test(name);
    });

    for (const envFile of envFiles) {
      const entries = parseEnvFile(envFile.content);

      for (const { key, line } of entries) {
        if (!key.startsWith('NEXT_PUBLIC_')) continue;
        if (!isDangerousNextPublic(key)) continue;

        issues.push({
          id: `next-public-secrets:${envFile.relativePath}:${key}`,
          checkId: 'next-public-secrets',
          severity: 'critical',
          title: `SECRET VARIABLE EXPOSED TO THE BROWSER: ${key}`,
          description: `\`${key}\` is prefixed with \`NEXT_PUBLIC_\`, which means Next.js bundles this value directly into your JavaScript and sends it to every visitor's browser. The name strongly suggests this is a secret (service role key, webhook secret, or private key) that should never be public.`,
          fix: `Remove the \`NEXT_PUBLIC_\` prefix. Rename it to just \`${key.replace('NEXT_PUBLIC_', '')}\` and move any code that uses it to a server-only file (API route, Server Component, or server action).`,
          file: envFile.relativePath,
          line,
        });
      }
    }

    return issues;
  },
};
