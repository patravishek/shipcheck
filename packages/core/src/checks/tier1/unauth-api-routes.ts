import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Patterns that indicate an auth check is present
const AUTH_PATTERNS = [
  /getServerSession/,
  /auth\(\)/,
  /currentUser\(\)/,
  /getAuth\(/,
  /verifyToken/,
  /validateToken/,
  /requireAuth/,
  /isAuthenticated/,
  /checkAuth/,
  /session\./,
  /userId\b/,
  /user\.id\b/,
  /clerkClient/,
  /protect\(/,
  /withAuth/,
  /authMiddleware/,
  /NextAuth/,
  /getToken\(/,
  /verifySession/,
  /supabase\.auth/,
  /createClient.*cookies/,
  /unauthorized/i,
  /Unauthorized/,
  /401/,
];

// Auth-related imports that signal the file uses auth
const AUTH_IMPORT_PATTERNS = [
  /from ['"]next-auth/,
  /from ['"]@auth\//,
  /from ['"]@clerk\//,
  /from ['"]@supabase\/auth/,
  /from ['"]@supabase\/ssr/,
  /from ['"]\.\.\/.*auth/i,
  /from ['"]\.\/.*auth/i,
  /from ['"].*\/auth['"]/i,
  /from ['"]@\/.*auth/i,
  /require\(['"].*auth/i,
];

function isApiRouteFile(relativePath: string): boolean {
  return (
    /^(src\/)?app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^(src\/)?pages\/api\/.+\.(ts|js)$/.test(relativePath) ||
    /^app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^pages\/api\/.+\.(ts|js)$/.test(relativePath)
  );
}

// Public routes that legitimately don't need auth
function isPublicRoute(relativePath: string): boolean {
  const publicPaths = [
    /\/api\/auth\//,       // auth endpoints
    /\/api\/webhook/,      // webhooks
    /\/api\/health/,       // health checks
    /\/api\/ping/,         // ping
    /\/api\/public\//,     // explicitly public
    /\/api\/status/,       // status
  ];
  return publicPaths.some((p) => p.test(relativePath));
}

function hasDataResponse(content: string): boolean {
  // Route returns actual data (not just status)
  return (
    /NextResponse\.json\(/.test(content) ||
    /res\.json\(/.test(content) ||
    /Response\.json\(/.test(content)
  );
}

export const unauthApiRoutes: Check = {
  id: 'unauth-api-routes',
  name: 'API routes without authentication',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!isApiRouteFile(file.relativePath)) continue;
      if (isPublicRoute(file.relativePath)) continue;
      if (!hasDataResponse(file.content)) continue;

      const hasAuth =
        AUTH_PATTERNS.some((p) => p.test(file.content)) ||
        AUTH_IMPORT_PATTERNS.some((p) => p.test(file.content));

      if (!hasAuth) {
        const routePath = file.relativePath
          .replace(/^src\//, '')
          .replace(/\/route\.(ts|js)$/, '')
          .replace(/\.(ts|js)$/, '')
          .replace(/^(app|pages)\/api/, '/api');

        issues.push({
          id: `unauth-api-routes:${file.relativePath}`,
          checkId: 'unauth-api-routes',
          severity: 'critical',
          title: 'API ROUTE HAS NO AUTHENTICATION',
          description: `The API endpoint \`${routePath}\` returns data but doesn't check who's asking. Anyone on the internet can call this endpoint and get whatever data it returns — including other users' information.`,
          fix: 'Add an authentication check at the top of your handler. Example for Next.js with Auth.js:\n\nconst session = await auth();\nif (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
          file: file.relativePath,
        });
      }
    }

    return issues;
  },
};
