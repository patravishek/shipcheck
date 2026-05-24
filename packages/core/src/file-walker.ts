import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import glob from 'fast-glob';
import ignore from 'ignore';
import type { FileInfo } from './types.js';

const SKIP_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
  '.cache',
  'out',
  '.vercel',
  '.netlify',
  '.output',
  'public',
  '.svelte-kit',
  '__pycache__',
];

const SCAN_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'sql', 'yaml', 'yml'];

const MAX_FILE_SIZE = 500_000; // 500KB

async function loadGitignore(projectPath: string) {
  const ig = ignore();
  const gitignorePath = join(projectPath, '.gitignore');
  if (existsSync(gitignorePath)) {
    const content = await readFile(gitignorePath, 'utf-8');
    ig.add(content);
  }
  return ig;
}

export async function walkProject(projectPath: string): Promise<FileInfo[]> {
  const ig = await loadGitignore(projectPath);

  const patterns = [
    ...SCAN_EXTENSIONS.map((ext) => `**/*.${ext}`),
    '**/.env',
    '**/.env.*',
  ];

  const skipPatterns = SKIP_DIRS.map((d) => `**/${d}/**`);

  const relativePaths = await glob(patterns, {
    cwd: projectPath,
    dot: true,
    ignore: skipPatterns,
    absolute: false,
    followSymbolicLinks: false,
  });

  // .env files should always be scanned even if in .gitignore
  const filtered = relativePaths.filter((f) => {
    const isEnvFile = /^\.env/.test(f.split('/').pop() ?? '');
    return isEnvFile || !ig.ignores(f);
  });

  const results = await Promise.all(
    filtered.map(async (relativePath): Promise<FileInfo | null> => {
      const absolutePath = join(projectPath, relativePath);
      try {
        const content = await readFile(absolutePath, 'utf-8');
        if (content.length > MAX_FILE_SIZE) return null;
        return { absolutePath, relativePath, content };
      } catch {
        return null;
      }
    }),
  );

  return results.filter((f): f is FileInfo => f !== null);
}
