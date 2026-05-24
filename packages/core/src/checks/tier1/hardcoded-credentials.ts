import { lineNumberAt } from '../../utils.js';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

// Patterns for known API key formats — ordered most-specific first
const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'Stripe Live Secret Key',
    pattern: /\bsk_live_[A-Za-z0-9]{24,}\b/,
    description: 'a live Stripe secret key',
  },
  {
    name: 'Stripe Test Secret Key',
    pattern: /\bsk_test_[A-Za-z0-9]{24,}\b/,
    description: 'a Stripe test secret key',
  },
  {
    name: 'OpenAI API Key',
    pattern: /\bsk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}\b|\bsk-proj-[A-Za-z0-9_-]{50,}\b/,
    description: 'an OpenAI API key',
  },
  {
    name: 'Anthropic API Key',
    pattern: /\bsk-ant-api[A-Za-z0-9_-]{50,}\b/,
    description: 'an Anthropic API key',
  },
  {
    name: 'AWS Access Key ID',
    pattern: /\b(AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/,
    description: 'an AWS access key ID',
  },
  {
    name: 'GitHub Personal Access Token',
    pattern: /\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{82}\b/,
    description: 'a GitHub personal access token',
  },
  {
    name: 'Supabase Service Role JWT',
    // Supabase service role JWTs always start with this header
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}/,
    description: 'a Supabase JWT (possibly a service role key)',
  },
  {
    name: 'Resend API Key',
    pattern: /\bre_[A-Za-z0-9]{32,}\b/,
    description: 'a Resend API key',
  },
  {
    name: 'Twilio Auth Token',
    pattern: /\b[a-f0-9]{32}\b(?=.*twilio|.*TWILIO)/i,
    description: 'a Twilio auth token',
  },
];

function shouldSkipFile(relativePath: string): boolean {
  const name = relativePath.split('/').pop() ?? '';
  return (
    // .env files are MEANT to store credentials — missing-gitignore check handles exposure
    /^\.env/.test(name) ||
    // IDE / tool config files are local-only by convention
    /^\.claude\//.test(relativePath) ||
    /^\.cursor\//.test(relativePath) ||
    /^\.vscode\//.test(relativePath) ||
    /settings\.local\.json$/.test(relativePath) ||
    // Test / example files
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
    /\/__tests__\//.test(relativePath) ||
    /\/fixtures\//.test(relativePath) ||
    /\.example$/.test(relativePath) ||
    /\.sample$/.test(relativePath)
  );
}

export const hardcodedCredentials: Check = {
  id: 'hardcoded-credentials',
  name: 'Hardcoded credentials in source code',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];
    const seen = new Set<string>();

    for (const file of ctx.files) {
      if (shouldSkipFile(file.relativePath)) continue;
      // Skip lockfiles and binary-ish files
      if (/\.(lock|map)$/.test(file.relativePath)) continue;

      for (const sp of SECRET_PATTERNS) {
        const match = sp.pattern.exec(file.content);
        if (!match) continue;

        const issueId = `hardcoded-credentials:${file.relativePath}:${sp.name}`;
        if (seen.has(issueId)) continue;
        seen.add(issueId);

        const line = lineNumberAt(file.content, match.index);

        issues.push({
          id: issueId,
          checkId: 'hardcoded-credentials',
          severity: 'critical',
          title: `REAL API KEY HARDCODED IN SOURCE CODE — ${sp.name.toUpperCase()}`,
          description: `Your source file \`${file.relativePath}\` contains what looks like ${sp.description} hardcoded directly in the code. If you push this to GitHub (even a private repo), the key could be exposed. GitHub history is permanent — even if you delete the file later, the key remains in git history.`,
          fix: `Remove this key from your code immediately. Store it in your .env file as a variable and access it via \`process.env.YOUR_KEY_NAME\`. Then rotate (regenerate) this key in the provider dashboard — treat any exposed key as compromised.`,
          file: file.relativePath,
          line,
        });
      }
    }

    return issues;
  },
};
