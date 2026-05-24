import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import { scan } from '@shipcheck/core';

const HOOKS_DIR = join(homedir(), '.config', 'git', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'pre-commit');

// Written to ~/.config/git/hooks/pre-commit
const HOOK_SCRIPT = `#!/bin/sh
# ShipCheck pre-commit hook — installed by: shipcheck install-hook
# Uninstall: shipcheck uninstall-hook

if command -v shipcheck >/dev/null 2>&1; then
  exec shipcheck hook
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes @shipcheck/cli hook
fi

# ShipCheck not found — allow commit silently
exit 0
`;

function exec(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function getStagedFiles(): string[] {
  try {
    const out = exec('git diff --cached --name-only --diff-filter=ACM');
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getProjectRoot(): string {
  try {
    return exec('git rev-parse --show-toplevel');
  } catch {
    return process.cwd();
  }
}

function isRelevant(file: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file) ||
    /^\.env(\.|$)/.test(file.split('/').pop() ?? '');
}

function matchesFile(issueFile: string | undefined, staged: string[]): boolean {
  if (!issueFile) return false;
  return staged.some(f => f.endsWith(issueFile) || issueFile.endsWith(f) || f === issueFile);
}

export function installHook(): void {
  // Warn if hooksPath is already set to something else
  try {
    const current = exec('git config --global core.hooksPath');
    if (current && current !== HOOKS_DIR && current !== '~/.config/git/hooks') {
      console.log(`\n⚠️  git core.hooksPath is already set to: ${current}`);
      console.log('   Updating to ~/.config/git/hooks\n');
    }
  } catch {
    // Not set yet — fine
  }

  mkdirSync(HOOKS_DIR, { recursive: true });
  writeFileSync(HOOK_PATH, HOOK_SCRIPT);
  chmodSync(HOOK_PATH, '755');
  execSync('git config --global core.hooksPath ~/.config/git/hooks');

  console.log('\n✅ ShipCheck pre-commit hook installed globally\n');
  console.log('   Every git commit is now scanned automatically.');
  console.log('   Works across all your repositories — no per-project setup.');
  console.log('   Blocks commits with critical security issues.');
  console.log('   Warns but allows commits with warnings only.');
  console.log('');
  console.log('   To skip for one commit:  git commit --no-verify');
  console.log('   To uninstall:            shipcheck uninstall-hook');
  console.log('');
}

export function uninstallHook(): void {
  if (existsSync(HOOK_PATH)) {
    unlinkSync(HOOK_PATH);
    console.log('\n✅ ShipCheck pre-commit hook removed');
  } else {
    console.log('\nℹ️  No ShipCheck hook found');
  }

  try {
    execSync('git config --global --unset core.hooksPath', { stdio: 'ignore' });
  } catch {
    // Already unset
  }

  console.log('   git core.hooksPath cleared\n');
}

export async function runHook(): Promise<void> {
  const staged = getStagedFiles();

  // Nothing relevant staged — pass silently
  if (staged.length === 0 || !staged.some(isRelevant)) {
    process.exit(0);
  }

  process.stdout.write('🔍 ShipCheck scanning staged files...\r');

  const projectPath = getProjectRoot();

  try {
    const result = await scan({ projectPath });

    // Filter issues to only those in staged files
    const criticals = result.critical.filter(i => matchesFile(i.file, staged));
    const warnings = result.warnings.filter(i => matchesFile(i.file, staged));

    process.stdout.write('                                        \r');

    if (criticals.length === 0 && warnings.length === 0) {
      console.log('✅ ShipCheck: staged files look clean\n');
      process.exit(0);
    }

    if (criticals.length > 0) {
      console.log(`\n❌ ShipCheck blocked: ${criticals.length} critical issue${criticals.length > 1 ? 's' : ''} in staged files\n`);

      criticals.forEach((issue, i) => {
        console.log(chalk.bold(`  ${i + 1}. ${issue.title}`));
        if (issue.file) {
          console.log(`     📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
        console.log(`     ${issue.description}`);
        console.log(`     🔧 ${issue.fix}`);
        console.log('');
      });

      console.log('  Fix the issues above, then commit again.');
      console.log('  To skip this check:  git commit --no-verify\n');
      process.exit(1);
    }

    // Warnings only — allow commit but surface them
    console.log(`⚠️  ShipCheck: ${warnings.length} warning${warnings.length > 1 ? 's' : ''} in staged files (commit allowed)\n`);
    warnings.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.title}${issue.file ? ` — ${issue.file}` : ''}`);
    });
    console.log('');
    process.exit(0);

  } catch {
    // Never block a commit if ShipCheck itself errors
    process.stdout.write('                                        \r');
    process.exit(0);
  }
}
