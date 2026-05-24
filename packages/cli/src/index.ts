#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync, appendFileSync } from 'node:fs';
import { scan, formatJson } from '@shipsafe/core';
import { printReport } from './output.js';

const program = new Command();

program
  .name('shipsafe')
  .description('Security scanner for vibe-coded apps — plain English, no jargon')
  .version('0.1.0')
  .argument('[path]', 'Project directory to scan', '.')
  .option('--json', 'Output results as JSON')
  .option('--verbose', 'Show extra detail')
  .option('--fix', 'Auto-apply safe fixes (adds missing .gitignore entries)')
  .option('--checks <ids>', 'Comma-separated list of check IDs to run')
  .action(async (pathArg: string, options: Record<string, string | boolean>) => {
    const projectPath = resolve(pathArg);

    if (!existsSync(projectPath)) {
      console.error(`Error: Path does not exist: ${projectPath}`);
      process.exit(1);
    }

    const checksFilter = options.checks
      ? (options.checks as string).split(',').map((s) => s.trim())
      : undefined;

    try {
      if (!options.json) {
        process.stdout.write('Scanning...\r');
      }

      const result = await scan({
        projectPath,
        checks: checksFilter,
        verbose: !!options.verbose,
      });

      if (options.json) {
        console.log(formatJson(result));
        process.exit(result.critical.length > 0 ? 1 : 0);
        return;
      }

      // Clear the "Scanning..." line
      process.stdout.write('            \r');

      printReport(result);

      // --fix: add missing .gitignore entries
      if (options.fix) {
        const gitignoreIssues = result.info
          .concat(result.warnings)
          .concat(result.critical)
          .filter((i) => i.checkId === 'missing-gitignore');

        if (gitignoreIssues.length > 0) {
          const gitignorePath = resolve(projectPath, '.gitignore');
          const toAdd = ['.env', '.env.local', '.env.*.local', '.env.production'].join('\n');
          appendFileSync(gitignorePath, `\n# Added by shipsafe\n${toAdd}\n`);
          console.log('✅ --fix applied: added .env entries to .gitignore\n');
        } else {
          console.log('ℹ️  No auto-fixes available for the detected issues.\n');
        }
      }

      // Exit with error code if critical issues found (useful for CI)
      if (result.critical.length > 0) {
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nScan failed: ${message}`);
      if (options.verbose) console.error(err);
      process.exit(2);
    }
  });

program.parse();
