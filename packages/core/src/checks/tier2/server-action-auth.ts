import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Matches exported async functions that are likely server actions
const EXPORTED_ASYNC_FN = /export\s+async\s+function\s+(\w+)/g;

// Auth patterns — if any of these appear in the function body, it's protected
const AUTH_PATTERNS = [
  /getUser\s*\(/,
  /getSession\s*\(/,
  /currentUser\s*\(/,
  /auth\s*\(\s*\)/,
  /requireAuth/,
  /verifyAuth/,
  /checkAuth/,
  /isAuthenticated/,
  /session\s*\.\s*user/,
  /user\s*\.\s*id/,
  /userId/,
  /clerk\s*\.\s*auth/,
  /getServerSession/,
];

function extractFunctionBody(content: string, fnStart: number): string {
  let depth = 0;
  let inBody = false;
  for (let i = fnStart; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
      inBody = true;
    } else if (content[i] === '}') {
      depth--;
      if (inBody && depth === 0) return content.slice(fnStart, i + 1);
    }
  }
  return content.slice(fnStart);
}

function isServerActionFile(relativePath: string, content: string): boolean {
  // File-level 'use server'
  if (/^\s*['"]use server['"]/m.test(content.slice(0, 300))) return true;
  // Common naming conventions for server action files
  if (/\/(actions?)(\/|\.)/i.test(relativePath)) return true;
  return false;
}

export const serverActionAuth: Check = {
  id: 'server-action-auth',
  name: 'Server actions without authentication check',
  tier: 2,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file.relativePath)) continue;
      if (!isServerActionFile(file.relativePath, file.content)) continue;

      const matches = [...file.content.matchAll(EXPORTED_ASYNC_FN)];

      for (const match of matches) {
        const fnName = match[1];
        // Skip Next.js reserved handlers — they're not user-facing actions
        if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(fnName)) continue;

        const body = extractFunctionBody(file.content, match.index ?? 0);
        const hasAuth = AUTH_PATTERNS.some(p => p.test(body));
        if (hasAuth) continue;

        issues.push({
          id: `server-action-auth:${file.relativePath}:${fnName}`,
          checkId: 'server-action-auth',
          severity: 'warning',
          title: `Server action \`${fnName}\` has no auth check`,
          description: `The server action \`${fnName}\` in ${file.relativePath} does not appear to verify the caller's identity. Server actions are callable by any client — without an auth check, an unauthenticated user can invoke this action directly.`,
          fix: `Add an auth check at the top of \`${fnName}\`: get the current user with \`getUser()\` or your auth library's equivalent, and return early (or throw) if no user is found.`,
          file: file.relativePath,
        });
      }
    }

    return issues;
  },
};
