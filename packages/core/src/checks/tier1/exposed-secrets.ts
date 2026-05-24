import { lineNumberAt } from '../../utils.js';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Env var names that should NEVER appear in client-side code
const SERVER_ONLY_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'DATABASE_URL',
  'DIRECT_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
  'AUTH_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_SECRET',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_AUTH_TOKEN',
  'CLERK_SECRET_KEY',
];

function isClientSideFile(relativePath: string, content: string): boolean {
  // 'use client' directive at the top
  if (/^\s*['"]use client['"]/m.test(content.slice(0, 300))) return true;

  // Common client-side paths in React / Next.js projects
  const clientPaths = [
    /^(src\/)?components\//,
    /^(src\/)?hooks\//,
    /^(src\/)?context\//,
    /^(src\/)?store\//,
    /^(src\/)?providers\//,
  ];

  return clientPaths.some((p) => p.test(relativePath));
}


export const exposedSecrets: Check = {
  id: 'exposed-secrets',
  name: 'Exposed secrets in client-side code',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file.relativePath)) continue;
      if (!isClientSideFile(file.relativePath, file.content)) continue;

      for (const varName of SERVER_ONLY_VARS) {
        const pattern = new RegExp(`process\\.env\\.${varName}|['"\`]${varName}['"\`]`, 'g');
        const match = file.content.match(pattern);
        if (!match) continue;

        issues.push({
          id: `exposed-secrets:${file.relativePath}:${varName}`,
          checkId: 'exposed-secrets',
          severity: 'critical',
          title: 'SERVER SECRET EXPOSED IN CLIENT CODE',
          description: `\`${varName}\` is used in \`${file.relativePath}\`, which runs in the browser. Anyone who opens your website can read this value in their browser DevTools and use it to access your backend services, database, or payment processor.`,
          fix: `Move all code that uses \`${varName}\` to a server-only file (API route, Server Component, or server action). Never reference server secrets in components, hooks, or any file with \`'use client'\`.`,
          file: file.relativePath,
          line: lineNumberAt(file.content, file.content.indexOf(match[0])),
        });
      }
    }

    return issues;
  },
};
