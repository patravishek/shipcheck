import { exposedSecrets } from './tier1/exposed-secrets.js';
import { missingGitignore } from './tier1/missing-gitignore.js';
import { unauthApiRoutes } from './tier1/unauth-api-routes.js';
import { hardcodedCredentials } from './tier1/hardcoded-credentials.js';
import { dangerousPatterns } from './tier1/dangerous-patterns.js';
import { cursorRulesBackdoor } from './tier1/cursor-rules-backdoor.js';
import { supabaseDeprecatedSession } from './tier1/supabase-deprecated-session.js';
import { nextPublicSecrets } from './tier2/next-public-secrets.js';
import { missingInputValidation } from './tier2/missing-input-validation.js';
import { noRateLimiting } from './tier2/no-rate-limiting.js';
import { supabaseRls } from './tier2/supabase-rls.js';
import { insecureCors } from './tier2/insecure-cors.js';
import { serverActionAuth } from './tier2/server-action-auth.js';
import type { Check } from '../types.js';

export const ALL_CHECKS: Check[] = [
  // Tier 1 — Vibe Coder Killers
  exposedSecrets,
  missingGitignore,
  unauthApiRoutes,
  hardcodedCredentials,
  dangerousPatterns,
  cursorRulesBackdoor,
  supabaseDeprecatedSession,
  // Tier 2 — Production Readiness
  nextPublicSecrets,
  missingInputValidation,
  noRateLimiting,
  supabaseRls,
  insecureCors,
  serverActionAuth,
];

export {
  exposedSecrets,
  missingGitignore,
  unauthApiRoutes,
  hardcodedCredentials,
  dangerousPatterns,
  cursorRulesBackdoor,
  supabaseDeprecatedSession,
  nextPublicSecrets,
  missingInputValidation,
  noRateLimiting,
  supabaseRls,
  insecureCors,
  serverActionAuth,
};
