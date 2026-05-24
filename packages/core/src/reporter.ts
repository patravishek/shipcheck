import type { ScanResult, Issue } from './types.js';

const DIVIDER = '━'.repeat(50);

function severityLabel(severity: Issue['severity']): string {
  switch (severity) {
    case 'critical':
      return '❌ CRITICAL';
    case 'warning':
      return '⚠️  WARNING';
    case 'info':
      return 'ℹ️  INFO';
  }
}

function scoreEmoji(score: number): string {
  if (score >= 8) return '🟢';
  if (score >= 5) return '🟡';
  return '🔴';
}

function scoreVerdict(score: number, critical: number): string {
  if (critical > 0) return 'Not safe to ship yet';
  if (score >= 8) return 'Looking good — ship with confidence';
  if (score >= 5) return 'Fix the warnings before launching';
  return 'Needs work before going live';
}

function formatIssue(issue: Issue, index: number): string {
  const lines: string[] = [];
  lines.push(`${index}. ${issue.title}`);
  if (issue.file) {
    lines.push(`   📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
  }
  lines.push(`   ${issue.description}`);
  lines.push('');
  lines.push(`   🔧 Fix: ${issue.fix}`);
  return lines.join('\n');
}

export function formatReport(result: ScanResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('🔍 ShipSafe Security Scan');
  lines.push(DIVIDER);
  lines.push('');

  if (result.critical.length === 0 && result.warnings.length === 0) {
    lines.push('✅ No critical security issues found!');
    lines.push('');
  }

  // Critical issues
  if (result.critical.length > 0) {
    lines.push(
      `❌ CRITICAL — ${result.critical.length} issue${result.critical.length > 1 ? 's' : ''} (fix before going live)`,
    );
    lines.push('');
    result.critical.forEach((issue, i) => {
      lines.push(formatIssue(issue, i + 1));
      lines.push('');
    });
    lines.push(DIVIDER);
    lines.push('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    const offset = result.critical.length;
    lines.push(
      `⚠️  WARNING — ${result.warnings.length} issue${result.warnings.length > 1 ? 's' : ''} (fix soon)`,
    );
    lines.push('');
    result.warnings.forEach((issue, i) => {
      lines.push(formatIssue(issue, offset + i + 1));
      lines.push('');
    });
    lines.push(DIVIDER);
    lines.push('');
  }

  // Info
  if (result.info.length > 0) {
    const offset = result.critical.length + result.warnings.length;
    lines.push(`ℹ️  INFO — ${result.info.length} note${result.info.length > 1 ? 's' : ''}`);
    lines.push('');
    result.info.forEach((issue, i) => {
      lines.push(formatIssue(issue, offset + i + 1));
      lines.push('');
    });
    lines.push(DIVIDER);
    lines.push('');
  }

  // Positives
  if (result.positives.length > 0) {
    lines.push(`✅ GOOD — ${result.positives.length} thing${result.positives.length > 1 ? 's' : ''} you're doing right`);
    lines.push('');
    result.positives.forEach((p) => lines.push(`   ✓ ${p}`));
    lines.push('');
    lines.push(DIVIDER);
    lines.push('');
  }

  // Score
  const emoji = scoreEmoji(result.score);
  const verdict = scoreVerdict(result.score, result.critical.length);
  lines.push(
    `${emoji} Score: ${result.score}/10 — ${verdict}`,
  );
  lines.push('');
  lines.push(
    `   Scanned ${result.scannedFiles} files in ${result.scanDurationMs}ms`,
  );

  if (result.frameworks.length > 0 && !result.frameworks.includes('unknown')) {
    lines.push(`   Detected: ${result.frameworks.join(', ')}`);
  }

  lines.push('');

  return lines.join('\n');
}

export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatSummary(result: ScanResult): string {
  const { score, critical, warnings, info } = result;
  const total = critical.length + warnings.length + info.length;
  if (total === 0) return `Score: ${score}/10 — No issues found ✅`;
  return (
    `Score: ${score}/10 — ` +
    [
      critical.length > 0 ? `${critical.length} critical` : '',
      warnings.length > 0 ? `${warnings.length} warnings` : '',
      info.length > 0 ? `${info.length} notes` : '',
    ]
      .filter(Boolean)
      .join(', ')
  );
}
