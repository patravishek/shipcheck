import { lineNumberAt } from '../../utils.js';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// getSession() trusts the client-side cookie without verifying with Supabase Auth server.
// An attacker can forge a session cookie to impersonate any user.
// getUser() re-validates the token server-side every time — the correct method.
const GET_SESSION = /\bgetSession\s*\(\s*\)/g;

function isServerSideFile(relativePath: string, content: string): boolean {
  // Server actions
  if (/['"]use server['"]/m.test(content.slice(0, 300))) return true;
  // API routes, middleware, server utilities
  if (/\/(api|actions?|middleware|server|lib|utils)\//.test(relativePath)) return true;
  // Next.js route handlers
  if (relativePath.endsWith('route.ts') || relativePath.endsWith('route.js')) return true;
  // Next.js middleware
  if (relativePath === 'middleware.ts' || relativePath === 'middleware.js') return true;
  return false;
}

export const supabaseDeprecatedSession: Check = {
  id: 'supabase-deprecated-session',
  name: 'Insecure Supabase getSession() in server-side code',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    const hasSupabase = ctx.frameworks.has('supabase');
    if (!hasSupabase) return issues;

    for (const file of ctx.files) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file.relativePath)) continue;
      if (!isServerSideFile(file.relativePath, file.content)) continue;

      const matches = [...file.content.matchAll(GET_SESSION)];
      if (matches.length === 0) continue;

      for (const match of matches) {
        issues.push({
          id: `supabase-deprecated-session:${file.relativePath}:${match.index}`,
          checkId: 'supabase-deprecated-session',
          severity: 'critical',
          title: 'Insecure getSession() used in server-side code',
          description: `${file.relativePath} calls \`supabase.auth.getSession()\` on the server. This method trusts the client-supplied cookie without verifying it with Supabase's Auth server, so an attacker can forge a session token and impersonate any user — including admins. This is a documented Supabase security vulnerability.`,
          fix: `Replace \`getSession()\` with \`getUser()\`: \`const { data: { user } } = await supabase.auth.getUser()\`. The \`getUser()\` method validates the token server-side on every call and cannot be forged.`,
          file: file.relativePath,
          line: lineNumberAt(file.content, match.index ?? 0),
        });
      }
    }

    return issues;
  },
};
