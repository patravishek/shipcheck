import { isInCodeContext, lineNumberAt } from '../../utils.js';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Patterns that indicate a wildcard CORS configuration
const WILDCARD_CORS_PATTERNS = [
  // Headers set directly
  /Access-Control-Allow-Origin['":\s]+\*/,
  // Express cors() with no config or origin: '*'
  /cors\(\s*\)/,
  /cors\(\s*\{\s*origin\s*:\s*['"]?\*['"]?/,
  /cors\(\s*\{\s*origin\s*:\s*true/,
  // Next.js headers() with wildcard
  /'Access-Control-Allow-Origin'\s*,\s*['"][*]['"]/,
  /"Access-Control-Allow-Origin"\s*,\s*['"][*]['"]/,
  // response.headers.set
  /headers\.set\(['"]Access-Control-Allow-Origin['"]\s*,\s*['"][*]['"]\)/,
];

// Safe contexts where cors() might be legitimate (e.g., public APIs)
function isPublicApiFile(relativePath: string): boolean {
  return /\/api\/public\//.test(relativePath);
}

export const insecureCors: Check = {
  id: 'insecure-cors',
  name: 'Insecure CORS configuration',
  tier: 2,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];
    const seen = new Set<string>();

    for (const file of ctx.files) {
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file.relativePath)) continue;
      if (isPublicApiFile(file.relativePath)) continue;

      for (const pattern of WILDCARD_CORS_PATTERNS) {
        const match = pattern.exec(file.content);
        if (!match) continue;
        if (!isInCodeContext(file.content, match.index)) continue;

        const issueId = `insecure-cors:${file.relativePath}`;
        if (seen.has(issueId)) continue;
        seen.add(issueId);

        const line = lineNumberAt(file.content, match.index);

        issues.push({
          id: issueId,
          checkId: 'insecure-cors',
          severity: 'warning',
          title: 'CORS SET TO ALLOW ALL WEBSITES',
          description: `\`${file.relativePath}\` sets CORS to allow any website (\`*\`) to make requests to your API. This means a malicious website can silently make API calls to your backend using your logged-in users' cookies/tokens, reading or modifying their data without their knowledge.`,
          fix: "Specify exactly which domains are allowed:\n\n// Instead of cors() or cors({ origin: '*' }), use:\ncors({ origin: ['https://yourapp.com', 'https://www.yourapp.com'] })\n\n// In Next.js headers:\n{ key: 'Access-Control-Allow-Origin', value: 'https://yourapp.com' }",
          file: file.relativePath,
          line,
        });
      }
    }

    return issues;
  },
};
