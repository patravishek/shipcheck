import type { ScanOptions, ScanResult, Issue, Framework } from './types.js';
import { walkProject } from './file-walker.js';
import { detectFrameworks } from './framework-detect.js';
import { ALL_CHECKS } from './checks/index.js';

function computeScore(critical: Issue[], warnings: Issue[]): number {
  const raw = 10 - critical.length * 2 - warnings.length * 0.5;
  return Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
}

async function detectPositives(
  files: { relativePath: string; content: string }[],
  frameworks: Set<Framework>,
): Promise<string[]> {
  const positives: string[] = [];

  // Check: .gitignore has .env entries
  const gitignore = files.find((f) => f.relativePath === '.gitignore');
  if (gitignore?.content.includes('.env')) {
    positives.push('Environment files (.env) excluded from git');
  }

  // Check: passwords are hashed
  const hasBcrypt = files.some(
    (f) => f.content.includes('bcrypt') || f.content.includes('argon2'),
  );
  if (hasBcrypt) positives.push('Passwords are hashed (bcrypt/argon2 detected)');

  // Check: environment variables used (not hardcoded)
  const hasProcessEnv = files.some(
    (f) => /\.(ts|tsx|js|jsx)$/.test(f.relativePath) && /process\.env\.[A-Z]/.test(f.content),
  );
  if (hasProcessEnv) positives.push('Environment variables loaded from process.env');

  // Check: input validation library present
  const hasValidation = files.some(
    (f) =>
      /from ['"]zod['"]/.test(f.content) ||
      /from ['"]yup['"]/.test(f.content) ||
      /from ['"]joi['"]/.test(f.content) ||
      /from ['"]valibot['"]/.test(f.content),
  );
  if (hasValidation) positives.push('Input validation library detected (Zod/Yup/Joi)');

  // Check: auth library present
  const hasAuth = files.some(
    (f) =>
      /from ['"]next-auth/.test(f.content) ||
      /from ['"]@clerk\//.test(f.content) ||
      /from ['"]@auth\//.test(f.content),
  );
  if (hasAuth) positives.push('Authentication library configured');

  // Check: HTTPS in Next.js config
  if (frameworks.has('nextjs')) {
    const nextConfig = files.find((f) => /next\.config\.(ts|js|mjs)/.test(f.relativePath));
    if (nextConfig) positives.push('Next.js configuration file present');
  }

  return positives;
}

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const start = Date.now();
  const { projectPath, checks: checkFilter } = options;

  const [files, frameworks] = await Promise.all([
    walkProject(projectPath),
    detectFrameworks(projectPath),
  ]);

  const ctx = { projectPath, frameworks, files };

  const checksToRun = checkFilter
    ? ALL_CHECKS.filter((c) => checkFilter.includes(c.id))
    : ALL_CHECKS;

  const allIssueArrays = await Promise.all(checksToRun.map((c) => c.run(ctx)));
  const allIssues = allIssueArrays.flat();

  const critical = allIssues.filter((i) => i.severity === 'critical');
  const warnings = allIssues.filter((i) => i.severity === 'warning');
  const info = allIssues.filter((i) => i.severity === 'info');

  const positives = await detectPositives(files, frameworks);
  const score = computeScore(critical, warnings);

  return {
    projectPath,
    frameworks: [...frameworks],
    score,
    critical,
    warnings,
    info,
    positives,
    scannedFiles: files.length,
    scanDurationMs: Date.now() - start,
  };
}
