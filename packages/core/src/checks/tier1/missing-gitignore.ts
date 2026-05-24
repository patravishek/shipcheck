import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Check, CheckContext, CheckResult, Issue } from '../../types.js';

const ENV_PATTERNS = ['.env', '.env.local', '.env.*.local', '.env.production', '.env.development'];

function isEnvCovered(gitignoreContent: string, envFile: string): boolean {
  const lines = gitignoreContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // Check if .env (covers all .env files) or the specific file is listed
  return lines.some((line) => {
    if (line === '.env' || line === '*.env' || line === '.env*') return true;
    if (line === envFile) return true;
    // Glob: .env.*.local covers .env.development.local etc.
    if (line === '.env.*.local' && /^\.env\..+\.local$/.test(envFile)) return true;
    return false;
  });
}

function hasSecretContent(content: string): boolean {
  return /[A-Za-z_]+=.{10,}/.test(content);
}

export const missingGitignore: Check = {
  id: 'missing-gitignore',
  name: 'Missing .gitignore entries for .env files',
  tier: 1,
  async run(ctx: CheckContext): Promise<CheckResult> {
    const issues: Issue[] = [];
    const gitignorePath = join(ctx.projectPath, '.gitignore');

    const envFiles = ctx.files
      .filter((f) => {
        const name = f.relativePath.split('/').pop() ?? '';
        return /^\.env/.test(name) && !name.endsWith('.example') && !name.endsWith('.sample');
      })
      .map((f) => f.relativePath);

    if (!existsSync(gitignorePath)) {
      if (envFiles.length > 0) {
        issues.push({
          id: 'missing-gitignore:no-gitignore',
          checkId: 'missing-gitignore',
          severity: 'critical',
          title: 'NO .GITIGNORE FILE — YOUR SECRETS WILL BE PUSHED TO GITHUB',
          description: `You have ${envFiles.length > 1 ? `${envFiles.length} .env files` : `a .env file`} (${envFiles.join(', ')}) but no .gitignore. If you push to GitHub, your API keys, database passwords, and other secrets will be publicly visible.`,
          fix: 'Create a .gitignore file and add these lines to it:\n\n.env\n.env.local\n.env.*.local\n.env.production',
        });
      }
      return issues;
    }

    const gitignoreContent = await readFile(gitignorePath, 'utf-8');

    for (const envFile of envFiles) {
      const name = envFile.split('/').pop() ?? envFile;
      if (!isEnvCovered(gitignoreContent, name)) {
        const fileObj = ctx.files.find((f) => f.relativePath === envFile);
        const hasSecrets = fileObj ? hasSecretContent(fileObj.content) : false;

        issues.push({
          id: `missing-gitignore:${envFile}`,
          checkId: 'missing-gitignore',
          severity: hasSecrets ? 'critical' : 'warning',
          title: `YOUR ${name.toUpperCase()} FILE WILL BE PUSHED TO GITHUB`,
          description: `\`${envFile}\` is not in your .gitignore.${hasSecrets ? ' This file contains what looks like API keys or passwords.' : ''} If you push to GitHub, anyone can find these secrets in your commit history.`,
          fix: `Add \`${name}\` to your .gitignore file. Also run: git rm --cached ${envFile}  (if it was already committed).`,
          file: '.gitignore',
        });
      }
    }

    // Check if all standard env patterns are covered as a best practice
    const uncoveredPatterns = ENV_PATTERNS.filter((p) => !isEnvCovered(gitignoreContent, p));
    if (uncoveredPatterns.length > 0 && envFiles.length === 0 && issues.length === 0) {
      issues.push({
        id: 'missing-gitignore:patterns',
        checkId: 'missing-gitignore',
        severity: 'info',
        title: '.GITIGNORE MISSING STANDARD ENV PATTERNS',
        description: `Your .gitignore is missing entries for: ${uncoveredPatterns.join(', ')}. If you ever create these files, they could be accidentally committed.`,
        fix: `Add these lines to your .gitignore:\n\n${uncoveredPatterns.join('\n')}`,
        file: '.gitignore',
      });
    }

    return issues;
  },
};
