import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

// Hidden Unicode characters used to backdoor AI rules files.
// Attacker embeds these in .cursor/rules or CLAUDE.md to make the AI
// silently generate malicious code (exfiltrate secrets, add backdoors).
const HIDDEN_UNICODE = [
  { pattern: /​/g, name: 'zero-width space (U+200B)' },
  { pattern: /‌/g, name: 'zero-width non-joiner (U+200C)' },
  { pattern: /‍/g, name: 'zero-width joiner (U+200D)' },
  { pattern: /‎/g, name: 'left-to-right mark (U+200E)' },
  { pattern: /‏/g, name: 'right-to-left mark (U+200F)' },
  { pattern: /‪/g, name: 'left-to-right embedding (U+202A)' },
  { pattern: /‫/g, name: 'right-to-left embedding (U+202B)' },
  { pattern: /‬/g, name: 'pop directional formatting (U+202C)' },
  { pattern: /‭/g, name: 'left-to-right override (U+202D)' },
  { pattern: /‮/g, name: 'right-to-left override (U+202E)' },
  { pattern: /⁠/g, name: 'word joiner (U+2060)' },
  { pattern: /⁡/g, name: 'function application (U+2061)' },
  { pattern: /⁢/g, name: 'invisible times (U+2062)' },
  { pattern: /⁣/g, name: 'invisible separator (U+2063)' },
  { pattern: /⁤/g, name: 'invisible plus (U+2064)' },
  { pattern: /﻿/g, name: 'byte order mark mid-file (U+FEFF)' },
  { pattern: /­/g, name: 'soft hyphen (U+00AD)' },
];

const RULES_FILES = new Set([
  '.cursor/rules',
  '.cursorrules',
  'CLAUDE.md',
  '.github/copilot-instructions.md',
  '.github/instructions.md',
  '.clinerules',
  '.windsurfrules',
]);

export const cursorRulesBackdoor: Check = {
  id: 'cursor-rules-backdoor',
  name: 'Hidden Unicode in AI rules files',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];

    for (const file of ctx.files) {
      if (!RULES_FILES.has(file.relativePath)) continue;

      const found: string[] = [];
      for (const { pattern, name } of HIDDEN_UNICODE) {
        if (pattern.test(file.content)) found.push(name);
      }

      if (found.length === 0) continue;

      issues.push({
        id: `cursor-rules-backdoor:${file.relativePath}`,
        checkId: 'cursor-rules-backdoor',
        severity: 'critical',
        title: 'Hidden Unicode characters in AI rules file',
        description: `${file.relativePath} contains hidden Unicode characters (${found.join(', ')}). This is a known supply chain attack: hidden characters instruct your AI coding agent to silently generate backdoored code — exfiltrating secrets, adding malicious dependencies, or bypassing auth — while the rules file appears normal to human readers.`,
        fix: `Open ${file.relativePath} in a hex editor or run: cat -v ${file.relativePath} | grep -P "[^\\x00-\\x7F]". Remove the hidden characters or recreate the file from scratch. Only accept rules files from sources you fully trust.`,
        file: file.relativePath,
      });
    }

    return issues;
  },
};
