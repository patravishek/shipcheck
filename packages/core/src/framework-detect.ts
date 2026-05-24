import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Framework } from './types.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function detectFrameworks(projectPath: string): Promise<Set<Framework>> {
  const frameworks = new Set<Framework>();

  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return frameworks;

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as PackageJson;
  } catch {
    return frameworks;
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps['next']) frameworks.add('nextjs');
  if (deps['express'] || deps['fastify'] || deps['hono']) frameworks.add('express');
  if (deps['@supabase/supabase-js'] || deps['@supabase/ssr'] || deps['@supabase/auth-helpers-nextjs'])
    frameworks.add('supabase');
  if (deps['firebase'] || deps['firebase-admin'] || deps['firebase-functions'])
    frameworks.add('firebase');
  if (deps['react'] || deps['react-dom']) frameworks.add('react');

  if (frameworks.size === 0) frameworks.add('unknown');

  return frameworks;
}
