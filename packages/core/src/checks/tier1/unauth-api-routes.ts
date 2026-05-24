import type { Check, CheckContext, CheckResult, Issue, Severity } from '../../types.js';

// Patterns that indicate an auth check is present
const AUTH_PATTERNS = [
  // Common auth library calls
  /getServerSession/,
  /auth\(\)/,
  /currentUser\(\)/,
  /getAuth\(/,
  /clerkClient/,
  /protect\(/,
  /withAuth/,
  /authMiddleware/,
  /NextAuth/,
  /supabase\.auth/,
  /createClient.*cookies/,
  // Custom auth helper naming conventions
  /getSession\(/,
  /getWebSession\(/,
  /getUserSession\(/,
  /getUser\(/,
  /getCurrentUser\(/,
  /verifyToken/,
  /validateToken/,
  /verifySession/,
  /requireAuth/,
  /isAuthenticated/,
  /checkAuth/,
  /getToken\(/,
  // Token / header checks — common custom auth patterns
  /X-Session-Token/,
  /X-Auth-Token/,
  /Authorization.*header/i,
  /headers\.get\(['"]authorization/i,
  /headers\.get\(['"]x-/i,
  // Guard patterns
  /if\s*\(!\s*session\b/,
  /if\s*\(!\s*user\b/,
  /if\s*\(!\s*userId\b/,
  /if\s*\(!\s*token\b/,
  /session\.\w/,
  /userId\b/,
  /user\.id\b/,
  // HTTP 401 responses
  /status:\s*401/,
  /statusCode.*401/,
  /unauthorized/i,
];

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

// Route path keywords that signal the endpoint is intentionally public.
// These routes serve anonymous visitors by design (pricing, lead capture, health, etc.)
const PUBLIC_INTENT_PATHS = [
  /\/api\/geo\b/,           // geolocation / currency for pricing
  /\/api\/location/,
  /\/api\/currency/,
  /\/api\/pricing/,
  /\/api\/waitlist/,        // public signup / lead capture
  /\/api\/subscribe/,
  /\/api\/newsletter/,
  /\/api\/leads?\b/,
  /\/api\/contact/,
  /\/api\/feedback/,
  /\/api\/health/,          // infrastructure health checks
  /\/api\/ping/,
  /\/api\/status/,
  /\/api\/ready/,
  /\/api\/public\//,        // explicitly namespaced public
  /\/api\/auth\//,          // auth flow endpoints (login, logout, callback)
];

// Incoming webhook receivers — they use signature verification, not session auth
const INCOMING_WEBHOOK_PATHS = [
  /\/api\/webhooks?\//,
  /\/api\/stripe\/webhook/,
  /\/api\/telegram\/webhook/,
  /\/api\/github\/webhook/,
  /\/api\/clerk\/webhook/,
];

// Patterns indicating AI API calls — unauthenticated access = direct cost exposure
const AI_USAGE_PATTERNS = [
  /from ['"]openai['"]/,
  /from ['"]@anthropic-ai\//,
  /from ['"]@google\/generative-ai['"]/,
  /new OpenAI\(/,
  /openai\.chat\.completions/,
  /openai\.audio/,
  /anthropic\.messages/,
  /model.*gpt-/i,
  /model.*claude-/i,
  /model.*gemini/i,
  /generateContent\(/,
  /streamText\(/,           // Vercel AI SDK
  /generateText\(/,
  /createCompletion\(/,
  /ElevenLabs/,
  /deepgram/i,
  /assemblyai/i,
  /whisper/i,
];

// Patterns indicating database / user data access
const DATA_ACCESS_PATTERNS = [
  /supabase\.from\(/,
  /prisma\.\w+\.(find|create|update|delete|upsert)/,
  /db\.(query|execute|select|insert|update|delete)/,
  /\.from\(['"`]\w+['"`]\)/,   // Supabase table access
  /mongoose\.\w+\.find/,
  /getRepository\(/,
];

function isApiRouteFile(relativePath: string): boolean {
  return (
    /^(src\/)?app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^(src\/)?pages\/api\/.+\.(ts|js)$/.test(relativePath) ||
    /^app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^pages\/api\/.+\.(ts|js)$/.test(relativePath)
  );
}

function isPublicByIntent(relativePath: string): boolean {
  return (
    PUBLIC_INTENT_PATHS.some((p) => p.test(relativePath)) ||
    INCOMING_WEBHOOK_PATHS.some((p) => p.test(relativePath))
  );
}

function hasDataResponse(content: string): boolean {
  return (
    /NextResponse\.json\(/.test(content) ||
    /res\.json\(/.test(content) ||
    /Response\.json\(/.test(content)
  );
}

function assessRisk(content: string): { severity: Severity; reason: string } {
  const usesAI = AI_USAGE_PATTERNS.some((p) => p.test(content));
  const accessesData = DATA_ACCESS_PATTERNS.some((p) => p.test(content));

  if (usesAI) {
    return {
      severity: 'critical',
      reason: 'This route calls an AI API (OpenAI, Anthropic, ElevenLabs, etc.). Without authentication, anyone can trigger expensive AI calls using your API keys — costing you money with every unauthenticated request.',
    };
  }
  if (accessesData) {
    return {
      severity: 'critical',
      reason: 'This route queries your database without checking who\'s asking. Anyone on the internet can call this endpoint and potentially read or modify other users\' data.',
    };
  }
  return {
    severity: 'warning',
    reason: 'This route returns data without an authentication check. If it handles anything user-specific, anyone can access it. If it\'s intentionally public, you can ignore this.',
  };
}

export const unauthApiRoutes: Check = {
  id: 'unauth-api-routes',
  name: 'API routes without authentication',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!isApiRouteFile(file.relativePath)) continue;
      if (isPublicByIntent(file.relativePath)) continue;
      if (!hasDataResponse(file.content)) continue;

      const hasAuth =
        AUTH_PATTERNS.some((p) => p.test(file.content)) ||
        AUTH_IMPORT_PATTERNS.some((p) => p.test(file.content));

      if (hasAuth) continue;

      const routePath = file.relativePath
        .replace(/^src\//, '')
        .replace(/\/route\.(ts|js)$/, '')
        .replace(/\.(ts|js)$/, '')
        .replace(/^(app|pages)\/api/, '/api');

      const { severity, reason } = assessRisk(file.content);

      const titleMap: Record<Severity, string> = {
        critical: 'API ROUTE HAS NO AUTHENTICATION',
        warning: 'API ROUTE MAY BE MISSING AUTHENTICATION',
        info: 'API ROUTE HAS NO AUTHENTICATION',
      };

      issues.push({
        id: `unauth-api-routes:${file.relativePath}`,
        checkId: 'unauth-api-routes',
        severity,
        title: titleMap[severity],
        description: `\`${routePath}\` has no authentication check. ${reason}`,
        fix: 'Add an authentication check at the top of your handler. Example for Next.js with Auth.js:\n\nconst session = await auth();\nif (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
        file: file.relativePath,
      });
    }

    return issues;
  },
};
