import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import { scan } from '@shipcheck/core';

const HOOKS_DIR = join(homedir(), '.config', 'git', 'hooks');
const PRE_COMMIT_PATH = join(HOOKS_DIR, 'pre-commit');
const PREPARE_MSG_PATH = join(HOOKS_DIR, 'prepare-commit-msg');
const ATTEST_FILE = join(homedir(), '.shipcheck-attest');

const PRE_COMMIT_SCRIPT = `#!/bin/sh
# ShipCheck pre-commit hook — installed by: shipcheck install-hook
# Uninstall: shipcheck uninstall-hook

if command -v shipcheck >/dev/null 2>&1; then
  exec shipcheck hook
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes @shipcheck/cli hook
fi

exit 0
`;

// Appends ShipCheck attestation line to commit message if attestation file exists
const PREPARE_MSG_SCRIPT = `#!/bin/sh
# ShipCheck prepare-commit-msg hook
ATTEST="$HOME/.shipcheck-attest"
if [ -f "$ATTEST" ]; then
  printf "\\n%s" "$(cat $ATTEST)" >> "$1"
  rm -f "$ATTEST"
fi
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

function writeAttestation(score: number, criticals: number, warnings: number): void {
  const line = `ShipCheck: score:${score}/10 | criticals:${criticals} | warnings:${warnings}`;
  writeFileSync(ATTEST_FILE, line);
}

export function installHook(): void {
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

  writeFileSync(PRE_COMMIT_PATH, PRE_COMMIT_SCRIPT);
  chmodSync(PRE_COMMIT_PATH, '755');

  writeFileSync(PREPARE_MSG_PATH, PREPARE_MSG_SCRIPT);
  chmodSync(PREPARE_MSG_PATH, '755');

  execSync('git config --global core.hooksPath ~/.config/git/hooks');

  console.log('\n✅ ShipCheck pre-commit hook installed globally\n');
  console.log('   Every git commit is now scanned automatically.');
  console.log('   Works across all your repositories — no per-project setup.');
  console.log('   Attestation line appended to every passing commit message.');
  console.log('');
  console.log('   To skip for one commit:  git commit --no-verify');
  console.log('   To uninstall:            shipcheck uninstall-hook');
  console.log('');
}

export function uninstallHook(): void {
  let removed = false;

  if (existsSync(PRE_COMMIT_PATH)) {
    unlinkSync(PRE_COMMIT_PATH);
    removed = true;
  }
  if (existsSync(PREPARE_MSG_PATH)) {
    unlinkSync(PREPARE_MSG_PATH);
    removed = true;
  }
  if (existsSync(ATTEST_FILE)) {
    unlinkSync(ATTEST_FILE);
  }

  try {
    execSync('git config --global --unset core.hooksPath', { stdio: 'ignore' });
  } catch {
    // Already unset
  }

  console.log(removed
    ? '\n✅ ShipCheck pre-commit hook removed\n'
    : '\nℹ️  No ShipCheck hook found\n'
  );
}

export async function runHook(): Promise<void> {
  const staged = getStagedFiles();

  if (staged.length === 0 || !staged.some(isRelevant)) {
    process.exit(0);
  }

  process.stdout.write('🔍 ShipCheck scanning staged files...\r');

  const projectPath = getProjectRoot();

  try {
    const result = await scan({ projectPath });

    const criticals = result.critical.filter(i => matchesFile(i.file, staged));
    const warnings  = result.warnings.filter(i => matchesFile(i.file, staged));

    process.stdout.write('                                        \r');

    if (criticals.length === 0 && warnings.length === 0) {
      writeAttestation(result.score, 0, 0);
      console.log('✅ ShipCheck: staged files look clean\n');
      process.exit(0);
    }

    if (criticals.length > 0) {
      console.log(`\n❌ ShipCheck blocked: ${criticals.length} critical issue${criticals.length > 1 ? 's' : ''} in staged files\n`);
      criticals.forEach((issue, i) => {
        console.log(chalk.bold(`  ${i + 1}. ${issue.title}`));
        if (issue.file) console.log(`     📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`     ${issue.description}`);
        console.log(`     🔧 ${issue.fix}`);
        console.log('');
      });
      console.log('  Fix the issues above, then commit again.');
      console.log('  To skip this check:  git commit --no-verify\n');
      process.exit(1);
    }

    // Warnings only — allow commit, write attestation, surface warnings
    writeAttestation(result.score, 0, warnings.length);
    console.log(`⚠️  ShipCheck: ${warnings.length} warning${warnings.length > 1 ? 's' : ''} in staged files (commit allowed)\n`);
    warnings.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue.title}${issue.file ? ` — ${issue.file}` : ''}`);
    });
    console.log('');
    process.exit(0);

  } catch {
    process.stdout.write('                                        \r');
    process.exit(0);
  }
}
