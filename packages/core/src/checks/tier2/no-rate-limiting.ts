import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Auth-related route path keywords that absolutely need rate limiting
const AUTH_ROUTE_KEYWORDS = [
  /\/login/i,
  /\/signin/i,
  /\/sign-in/i,
  /\/register/i,
  /\/signup/i,
  /\/sign-up/i,
  /\/forgot-password/i,
  /\/reset-password/i,
  /\/verify/i,
  /\/otp/i,
  /\/2fa/i,
];

// Rate limiting implementations
const RATE_LIMIT_PATTERNS = [
  /from ['"]@upstash\/ratelimit['"]/,
  /from ['"]next-rate-limit['"]/,
  /from ['"]rate-limiter-flexible['"]/,
  /from ['"]express-rate-limit['"]/,
  /from ['"]@vercel\/kv['"]/,
  /rateLimit/i,
  /rateLimiter/i,
  /RateLimit/,
  /ip.*limit/i,
  /limit.*ip/i,
];

function isApiRouteFile(relativePath: string): boolean {
  return (
    /^(src\/)?app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^(src\/)?pages\/api\/.+\.(ts|js)$/.test(relativePath) ||
    /^app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^pages\/api\/.+\.(ts|js)$/.test(relativePath)
  );
}

export const noRateLimiting: Check = {
  id: 'no-rate-limiting',
  name: 'Auth routes without rate limiting',
  tier: 2,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!isApiRouteFile(file.relativePath)) continue;

      const isAuthRoute = AUTH_ROUTE_KEYWORDS.some((p) => p.test(file.relativePath));
      if (!isAuthRoute) continue;

      const hasRateLimit = RATE_LIMIT_PATTERNS.some((p) => p.test(file.content));
      if (hasRateLimit) continue;

      const routePath = file.relativePath
        .replace(/^src\//, '')
        .replace(/\/route\.(ts|js)$/, '')
        .replace(/\.(ts|js)$/, '')
        .replace(/^(app|pages)\/api/, '/api');

      issues.push({
        id: `no-rate-limiting:${file.relativePath}`,
        checkId: 'no-rate-limiting',
        severity: 'warning',
        title: 'LOGIN/AUTH ROUTE HAS NO RATE LIMITING',
        description: `The endpoint \`${routePath}\` handles authentication but has no rate limiting. Bots can attempt thousands of password combinations per second (brute force attack) or spam your verification codes. With no limit, it costs you nothing to defend against this attack today but could cost you everything after you launch.`,
        fix: "Add rate limiting with Upstash (works on Vercel Edge): npm install @upstash/ratelimit @upstash/redis. Then add at the top of your handler:\n\nconst { success } = await ratelimit.limit(ip);\nif (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });",
        file: file.relativePath,
      });
    }

    return issues;
  },
};
