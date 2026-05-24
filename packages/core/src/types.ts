export type Severity = 'critical' | 'warning' | 'info';

export type Framework = 'nextjs' | 'express' | 'supabase' | 'firebase' | 'react' | 'unknown';

export interface Issue {
  id: string;
  checkId: string;
  title: string;
  description: string;
  fix: string;
  severity: Severity;
  file?: string;
  line?: number;
  framework?: Framework;
}

export interface FileInfo {
  absolutePath: string;
  relativePath: string;
  content: string;
}

export interface CheckContext {
  projectPath: string;
  frameworks: Set<Framework>;
  files: FileInfo[];
}

export type CheckResult = Issue[];

export interface Check {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  run: (ctx: CheckContext) => Promise<CheckResult>;
}

export interface ScanOptions {
  projectPath: string;
  checks?: string[];
  verbose?: boolean;
}

export interface ScanResult {
  projectPath: string;
  frameworks: Framework[];
  score: number;
  critical: Issue[];
  warnings: Issue[];
  info: Issue[];
  positives: string[];
  scannedFiles: number;
  scanDurationMs: number;
}
