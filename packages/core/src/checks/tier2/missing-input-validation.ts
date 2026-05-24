import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Signs that user input is being read
const INPUT_READ_PATTERNS = [
  /request\.json\(\)/,
  /req\.body\b/,
  /params\./,
  /searchParams\./,
  /formData\(\)/,
  /request\.formData/,
  /body\s*=\s*await/,
];

// Signs that validation is present
const VALIDATION_PATTERNS = [
  /from ['"]zod['"]/,
  /from ['"]yup['"]/,
  /from ['"]joi['"]/,
  /from ['"]valibot['"]/,
  /from ['"]@sinclair\/typebox['"]/,
  /from ['"]superstruct['"]/,
  /from ['"]vine['"]/,
  /\.parse\(/,
  /\.safeParse\(/,
  /\.validate\(/,
  /schema\./,
  /z\./,
];

function isApiRouteFile(relativePath: string): boolean {
  return (
    /^(src\/)?app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^(src\/)?pages\/api\/.+\.(ts|js)$/.test(relativePath) ||
    /^app\/api\/.+\/route\.(ts|js)$/.test(relativePath) ||
    /^pages\/api\/.+\.(ts|js)$/.test(relativePath)
  );
}

export const missingInputValidation: Check = {
  id: 'missing-input-validation',
  name: 'API routes missing input validation',
  tier: 2,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!isApiRouteFile(file.relativePath)) continue;

      const readsInput = INPUT_READ_PATTERNS.some((p) => p.test(file.content));
      if (!readsInput) continue;

      const hasValidation = VALIDATION_PATTERNS.some((p) => p.test(file.content));
      if (hasValidation) continue;

      const routePath = file.relativePath
        .replace(/^src\//, '')
        .replace(/\/route\.(ts|js)$/, '')
        .replace(/\.(ts|js)$/, '')
        .replace(/^(app|pages)\/api/, '/api');

      issues.push({
        id: `missing-input-validation:${file.relativePath}`,
        checkId: 'missing-input-validation',
        severity: 'warning',
        title: 'API ROUTE READS USER INPUT WITHOUT VALIDATION',
        description: `The endpoint \`${routePath}\` reads request body, params, or form data but doesn't validate the shape or type of that data. Users can send unexpected values (wrong types, missing fields, oversized payloads) that can crash your app or cause unexpected behavior.`,
        fix: "Add input validation with Zod (recommended). Example:\n\nimport { z } from 'zod';\nconst schema = z.object({ email: z.string().email(), name: z.string().min(1) });\nconst body = schema.parse(await request.json());",
        file: file.relativePath,
      });
    }

    return issues;
  },
};
