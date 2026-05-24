import chalk, { type ChalkInstance } from 'chalk';
import type { ScanResult, Issue } from '@shipsafe/core';

const DIVIDER = chalk.dim('━'.repeat(52));

function formatIssueCli(issue: Issue, index: number): string {
  const lines: string[] = [];

  const numLabel = chalk.bold(`${index}.`);
  lines.push(`${numLabel} ${chalk.bold.white(issue.title)}`);

  if (issue.file) {
    const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
    lines.push(`   ${chalk.cyan('📁')} ${chalk.cyan(loc)}`);
  }

  lines.push(`   ${chalk.white(issue.description)}`);
  lines.push('');
  lines.push(`   ${chalk.green('🔧 Fix:')} ${chalk.green(issue.fix)}`);

  return lines.join('\n');
}

function scoreColor(score: number): ChalkInstance {
  if (score >= 8) return chalk.green;
  if (score >= 5) return chalk.yellow;
  return chalk.red;
}

function scoreVerdict(score: number, criticalCount: number): string {
  if (criticalCount > 0) return 'Not safe to ship yet';
  if (score >= 8) return 'Looking good — ship with confidence';
  if (score >= 5) return 'Fix the warnings before launching';
  return 'Needs work before going live';
}

function scoreEmoji(score: number): string {
  if (score >= 8) return '🟢';
  if (score >= 5) return '🟡';
  return '🔴';
}

export function printReport(result: ScanResult): void {
  console.log('');
  console.log(chalk.bold.white('🔍 ShipSafe Security Scan'));
  console.log(DIVIDER);
  console.log('');

  if (result.critical.length === 0 && result.warnings.length === 0) {
    console.log(chalk.green.bold('✅ No critical security issues found!'));
    console.log('');
  }

  // Critical issues
  if (result.critical.length > 0) {
    const count = result.critical.length;
    console.log(
      chalk.red.bold(
        `❌ CRITICAL — ${count} issue${count > 1 ? 's' : ''} (fix these before going live)`,
      ),
    );
    console.log('');
    result.critical.forEach((issue, i) => {
      console.log(formatIssueCli(issue, i + 1));
      console.log('');
    });
    console.log(DIVIDER);
    console.log('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    const count = result.warnings.length;
    const offset = result.critical.length;
    console.log(
      chalk.yellow.bold(`⚠️  WARNING — ${count} issue${count > 1 ? 's' : ''} (should fix soon)`),
    );
    console.log('');
    result.warnings.forEach((issue, i) => {
      console.log(formatIssueCli(issue, offset + i + 1));
      console.log('');
    });
    console.log(DIVIDER);
    console.log('');
  }

  // Info
  if (result.info.length > 0) {
    const count = result.info.length;
    const offset = result.critical.length + result.warnings.length;
    console.log(chalk.blue.bold(`ℹ️  INFO — ${count} note${count > 1 ? 's' : ''}`));
    console.log('');
    result.info.forEach((issue, i) => {
      console.log(formatIssueCli(issue, offset + i + 1));
      console.log('');
    });
    console.log(DIVIDER);
    console.log('');
  }

  // Positives
  if (result.positives.length > 0) {
    const count = result.positives.length;
    console.log(
      chalk.green.bold(
        `✅ GOOD — ${count} thing${count > 1 ? 's' : ''} you're doing right`,
      ),
    );
    console.log('');
    result.positives.forEach((p) => console.log(chalk.green(`   ✓ ${p}`)));
    console.log('');
    console.log(DIVIDER);
    console.log('');
  }

  // Score
  const scoreStr = scoreColor(result.score)(`${result.score}/10`);
  const emoji = scoreEmoji(result.score);
  const verdict = scoreColor(result.score)(scoreVerdict(result.score, result.critical.length));
  console.log(`${emoji} Score: ${scoreStr} — ${verdict}`);
  console.log('');
  console.log(
    chalk.dim(
      `   Scanned ${result.scannedFiles} files in ${result.scanDurationMs}ms`,
    ),
  );
  if (result.frameworks.length > 0 && !result.frameworks.includes('unknown')) {
    console.log(chalk.dim(`   Detected: ${result.frameworks.join(', ')}`));
  }
  console.log('');
}
