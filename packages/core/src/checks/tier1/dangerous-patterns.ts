import { isInCodeContext, lineNumberAt } from '../../utils.js';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

interface DangerousPattern {
  id: string;
  pattern: RegExp;
  title: string;
  description: (file: string) => string;
  fix: string;
  severity: 'critical' | 'warning';
}

const PATTERNS: DangerousPattern[] = [
  {
    id: 'eval',
    pattern: /\beval\s*\(/,
    title: 'EVAL() USED — CAN EXECUTE ATTACKER CODE',
    description: (file) =>
      `\`eval()\` is called in \`${file}\`. If any user-controlled data reaches this function, attackers can run arbitrary JavaScript in your app — reading cookies, stealing sessions, or making requests on behalf of your users.`,
    fix: "Remove eval(). There is almost always a safer alternative — JSON.parse() for JSON, explicit function calls for dynamic behavior. If you think you need eval(), you don't.",
    severity: 'critical',
  },
  {
    id: 'new-function',
    pattern: /new\s+Function\s*\(/,
    title: 'new Function() IS EQUIVALENT TO eval()',
    description: (file) =>
      `\`new Function()\` in \`${file}\` executes arbitrary code, just like eval(). Attackers can exploit this to run malicious JavaScript.`,
    fix: 'Replace new Function() with explicit function definitions. This pattern is almost never necessary in application code.',
    severity: 'critical',
  },
  {
    id: 'dangerous-inner-html',
    // Flag dangerouslySetInnerHTML that uses a variable (not a plain string literal)
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!['"`][^'"`]*['"`]\s*\})[^}]+/,
    title: 'UNESCAPED USER CONTENT CAN CAUSE XSS',
    description: (file) =>
      `\`dangerouslySetInnerHTML\` is used with a dynamic value in \`${file}\`. If this value contains any user input, attackers can inject malicious HTML/JavaScript that executes in your users' browsers, stealing their session tokens or performing actions as them.`,
    fix: "If you must render HTML, sanitize it first with DOMPurify: `__html: DOMPurify.sanitize(userContent)`. Better: avoid dangerouslySetInnerHTML entirely and use React's built-in rendering.",
    severity: 'critical',
  },
  {
    id: 'sql-injection',
    // Require full SQL phrases (not just the keyword) to avoid matching prose like "Create a plan"
    pattern:
      /`\s*(SELECT\s+[\w"'*]|INSERT\s+INTO\s|UPDATE\s+\w|DELETE\s+FROM\s|DROP\s+TABLE\s|ALTER\s+TABLE\s|CREATE\s+TABLE\s|TRUNCATE\s+TABLE\s)[^`]*\$\{/i,
    title: 'SQL QUERY BUILT WITH STRING INTERPOLATION — SQL INJECTION RISK',
    description: (file) =>
      `\`${file}\` builds SQL queries using template literals with \`\${...}\` interpolation. If any of those interpolated values come from user input, attackers can manipulate your query to read, modify, or delete your entire database.`,
    fix: "Use parameterized queries instead. With Prisma/Drizzle: use their query builder. With raw SQL: use `db.execute(sql, [params])` — never string concatenation or template literals.",
    severity: 'critical',
  },
  {
    id: 'document-write',
    pattern: /document\.write\s*\(/,
    title: 'document.write() CAN ENABLE XSS',
    description: (file) =>
      `\`document.write()\` is used in \`${file}\`. If any user-controlled data is written this way, it can introduce XSS vulnerabilities. It also breaks modern browser optimizations.`,
    fix: 'Replace document.write() with DOM manipulation: `element.textContent = value` (safe) or `element.innerHTML = DOMPurify.sanitize(value)` (if HTML is needed).',
    severity: 'warning',
  },
];

function isNonProductionFile(relativePath: string): boolean {
  return (
    /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(relativePath) ||
    /\/__tests__\//.test(relativePath) ||
    /^scripts\//.test(relativePath) ||
    /^migrations\//.test(relativePath)
  );
}

export const dangerousPatterns: Check = {
  id: 'dangerous-patterns',
  name: 'Dangerous code patterns',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file.relativePath)) continue;
      if (isNonProductionFile(file.relativePath)) continue;

      for (const dp of PATTERNS) {
        const match = dp.pattern.exec(file.content);
        if (!match) continue;
        if (!isInCodeContext(file.content, match.index)) continue;
        // JSON.stringify is safe serialization — common pattern for JSON-LD structured data
        if (dp.id === 'dangerous-inner-html' && match[0].includes('JSON.stringify')) continue;

        issues.push({
          id: `dangerous-patterns:${file.relativePath}:${dp.id}`,
          checkId: 'dangerous-patterns',
          severity: dp.severity,
          title: dp.title,
          description: dp.description(file.relativePath),
          fix: dp.fix,
          file: file.relativePath,
          line: lineNumberAt(file.content, match.index),
        });
      }
    }

    return issues;
  },
};
