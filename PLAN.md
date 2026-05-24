# ShipSafe — Complete Product Plan

> **One-liner:** A security scanner that speaks human — built for vibe coders, not engineers.

> **Format:** MCP Server + CLI (`npx shipsafe`) + GitHub Action

> **Target user:** Non-technical founders and solo builders shipping AI-generated code

> **Price:** Free tier → $19/mo Pro → $49/mo Team

---

## Part 1: Competitive Landscape

### Direct Competitors (Vibe-Coder Security)

| Tool | What it does | Traction | Monetized? | Plain English? | MCP? |
|---|---|---|---|---|---|
| **Vibe-Guard** (Devjosef) | CLI scanner, 28 rules, zero deps | Low GitHub stars, early-stage | No — OSS | Somewhat | No |
| **VibeScan** (Armur-AI) | Pipeline of 30+ SAST/DAST tools + sandbox exploit sim | Growing, backed by Armur AI | No — OSS | No — very technical | No |
| **VibeSecurity** (abenstirling) | Go-based scanner for AI-generated code | Small project | No | No | No |
| **SecureVibes** (anshumanbh) | Security system for vibe-coded apps | Small project | No | No | No |
| **Vibe Check** | Browser-based AI security scanner, no signup | Very early | No | Yes — closest to us | No |

**Key insight:** ~5 OSS projects all launched 2025-2026, none with significant traction, NONE monetized, NONE as MCP servers.

### Adjacent Competitors (Engineer-Focused)

| Tool | Pricing | Traction | Why they won't eat our lunch |
|---|---|---|---|
| **Snyk** | Free (200 tests/mo) / $25/dev/mo | $408M revenue, $7.4B valuation | Enterprise UX, technical jargon, intimidating for founders |
| **SonarQube** | Free community / €30/mo+ | Millions of users | Code-quality-first, complex setup, developer-centric |
| **Semgrep** | Free OSS / $40-80/dev/mo | 2M+ users, $100M+ raised | Requires writing custom rules — impossible for non-devs |
| **Socket.dev** | Free (1K/mo) / $25/seat/mo | $1B valuation, $125M raised | Dependencies only, not full code scanning |
| **GitHub Advanced Security** | Free (public) / $30-49/committer/mo | Massive | Locked to GitHub, enterprise pricing, dev-only UX |
| **GitGuardian** | Free (public monitoring) | 600K+ devs | Secrets-only, not full vulnerability scanning |
| **CodeRabbit** | Free (OSS) / $24/mo | $40M ARR, 8K paying companies | PR-review-centric, not standalone scanner |
| **Checkmarx** | $25K-$500K+/yr | Enterprise | Absurdly expensive, 0% relevant to solo founders |

### MCP-Based Security Tools

| Tool | What it does | Relevant? |
|---|---|---|
| **mcpserver-audit** (CSA) | Audits MCP servers themselves for safety | No — audits MCP servers, not user code |
| **MCP Security Audit** (mcp.so) | Scans for 21 AI/ML vulnerability patterns | Narrow — ML patterns only |
| **agent-security-scanner** (Smithery) | 275+ rules for AI agent code | Focused on agent code, not web apps |
| **Security Scanner** (Smithery) | Generic SAST + OWASP checks | Generic, not vibe-coder-focused, no plain English |

### Competitive Verdict

**The "plain English for non-engineers" niche is almost completely empty.**

- Every serious tool outputs CWE IDs, CVSS scores, and stack traces
- No MCP server does what ShipSafe would do
- The only close competitor (Vibe Check) is very early, not MCP, not monetized
- Zero tools in the $19-49/mo range for individual founders
- The real competition is inertia — "I'll deal with security later"

---

## Part 2: What ShipSafe Actually Does

### The Core Experience

```
Developer (in Claude Code, Cursor, or any MCP-compatible agent):

> "Scan my project for security issues and explain them simply"

ShipSafe responds:

🔍 Scanning your project...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ CRITICAL — 3 issues (fix these before going live)

1. YOUR DATABASE PASSWORD IS PUBLIC
   📁 src/lib/supabase.ts:12
   Your Supabase service key (SUPABASE_SERVICE_KEY) is used in client-side
   code. Anyone who opens your website can see this key in their browser
   and use it to read, edit, or delete ALL your data.
   
   🔧 Fix: Move this to a server-only file. Use NEXT_PUBLIC_ keys only
   for the anon key, never the service key.

2. ANYONE CAN READ OTHER USERS' DATA
   📁 src/app/api/users/route.ts:8
   This API endpoint returns user data without checking who's asking.
   Anyone can type /api/users/123 and see that user's profile, email,
   and settings.
   
   🔧 Fix: Add authentication check — verify the logged-in user matches
   the requested user ID.

3. YOUR .ENV FILE WILL BE PUSHED TO GITHUB
   📁 .gitignore (missing entry)
   Your .env file contains your Stripe secret key and database password.
   If you push this to GitHub, anyone can find it and charge your
   Stripe account or delete your database.
   
   🔧 Fix: Add ".env" and ".env.local" to your .gitignore file.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  WARNING — 5 issues (should fix soon)

4. NO RATE LIMITING ON LOGIN
   Bots can try 10,000 passwords per second on your login page.
   
5. PAYMENT WEBHOOKS HAVE NO ERROR HANDLING
   If a Stripe payment fails, your app won't know. Users pay but
   don't get access.

6. NO INPUT VALIDATION ON 3 API ROUTES
   Users can send unexpected data that crashes your app.

7. NO CORS CONFIGURATION
   Other websites can make requests to your API pretending to be
   your site.

8. SQL QUERIES USE STRING CONCATENATION
   Attackers can manipulate your database through form fields.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ GOOD — 4 things you're doing right

✓ HTTPS configured correctly
✓ Auth tokens expire properly  
✓ Passwords are hashed (bcrypt)
✓ Environment variables loaded from .env (not hardcoded)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Score: 4/10 — Not safe to ship yet
📋 Full report: https://shipsafe.dev/report/abc123
```

### MCP Tools Exposed

| Tool | What it does | When it's used |
|---|---|---|
| `scan_project` | Full security audit of entire project | "Scan my project" |
| `scan_file` | Scan a single file | "Is this file secure?" |
| `explain_issue` | Deep plain-English explanation of one issue | "What does issue #2 mean?" |
| `suggest_fix` | Generate code fix for an issue | "Fix issue #1 for me" |
| `pre_deploy_check` | Final deployment checklist | "Am I ready to deploy?" |
| `check_env` | Verify env vars aren't exposed | "Are my API keys safe?" |
| `check_auth` | Audit auth implementation | "Is my login secure?" |
| `check_database` | Audit database access patterns | "Can anyone access my DB?" |

### Security Checks (What We Scan For)

**Tier 1 — The Vibe Coder Killers (most common, most dangerous):**
1. Exposed API keys / secrets in client-side code
2. Missing .gitignore for .env files
3. Service keys used in browser code (Supabase, Firebase)
4. API routes with no authentication
5. Public database access (no RLS, no auth checks)
6. Hardcoded credentials
7. Missing input validation on API routes
8. SQL injection via string concatenation
9. XSS via dangerouslySetInnerHTML or unescaped output
10. Missing CORS configuration

**Tier 2 — Production Readiness:**
11. No rate limiting on auth endpoints
12. No error boundaries / error handling
13. Missing webhook signature verification (Stripe, etc.)
14. Insecure cookie settings (no httpOnly, no secure flag)
15. Missing CSRF protection
16. No request size limits
17. Overly permissive CORS (Access-Control-Allow-Origin: *)
18. Missing Content-Security-Policy headers
19. Exposed stack traces in production error responses
20. No logging / monitoring setup

**Tier 3 — Framework-Specific (Next.js + Supabase focus):**
21. NEXT_PUBLIC_ env vars containing secrets
22. Server actions without auth checks
23. Missing middleware.ts for route protection
24. Supabase RLS policies not enabled
25. Supabase anon key used for privileged operations
26. Firebase security rules set to open
27. Vercel environment variables misconfigured
28. Next.js API routes missing edge runtime checks
29. Prisma/Drizzle raw queries without parameterization
30. Missing next-auth / auth.js configuration checks

---

## Part 3: Technical Architecture

### System Design

```
┌───────────────────────────────────────────────────────────┐
│                    User's Machine                         │
│                                                           │
│  ┌─────────────┐   MCP    ┌──────────────────────────┐   │
│  │ Claude Code  │◄───────►│                          │   │
│  │ Cursor       │         │   ShipSafe MCP Server    │   │
│  │ Codex        │         │   (runs locally via npx)  │   │
│  │ Any MCP host │         │                          │   │
│  └─────────────┘         │  ┌────────────────────┐  │   │
│                           │  │  Static Analyzers  │  │   │
│                           │  │  • AST parsing     │  │   │
│                           │  │  • Regex patterns   │  │   │
│                           │  │  • File scanning    │  │   │
│                           │  └────────────────────┘  │   │
│                           │           │              │   │
│                           │           ▼              │   │
│                           │  ┌────────────────────┐  │   │
│                           │  │  Plain English     │  │   │
│                           │  │  Translator        │  │   │
│                           │  │  (template-based)  │  │   │
│                           │  └────────────────────┘  │   │
│                           │           │              │   │
│                           │           ▼              │   │
│                           │  ┌────────────────────┐  │   │
│                           │  │  Report Generator  │  │   │
│                           │  └────────────────────┘  │   │
│                           └──────────────────────────┘   │
│                                       │                   │
│                                       │ (optional)        │
│                                       ▼                   │
│                              ┌─────────────────┐         │
│                              │ ShipSafe API    │         │
│                              │ (auth, reports,  │         │
│                              │  billing)        │         │
│                              └─────────────────┘         │
└───────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| MCP Server | TypeScript + `@modelcontextprotocol/sdk` | Standard MCP SDK, works everywhere |
| AST Parsing | `@typescript-eslint/parser` + `acorn` | Parse JS/TS without running code |
| Pattern Matching | Custom regex + AST visitors | Fast, no external dependencies |
| CLI Wrapper | `commander` + `chalk` | For `npx shipsafe .` standalone usage |
| API Backend | Next.js API routes OR Hono on Cloudflare Workers | Report hosting, auth, billing |
| Auth | API key per user | Simple, works with MCP |
| Billing | Stripe | Standard |
| Report Hosting | Cloudflare Pages or Vercel | Static report pages |
| Database | Supabase (you already know it) | User accounts, scan history |
| Distribution | npm (MCP server + CLI) | `npx shipsafe` |

### Key Technical Decisions

1. **Scanning is LOCAL** — files never leave the user's machine. The MCP server reads files directly. This is a selling point for privacy.

2. **No LLM required for scanning** — Use AST parsing + pattern matching, not AI, for the actual detection. This means: zero API costs, deterministic results, works offline, fast.

3. **LLM optional for explanations** — The plain-English descriptions are template-based by default. But when used inside Claude Code or Cursor, the AI agent can use ShipSafe's structured output to generate even richer explanations. Best of both worlds.

4. **Framework detection** — Auto-detect the stack (Next.js? Supabase? Firebase? Express?) and run relevant checks only.

---

## Part 4: Phased Build Plan (2 hrs/day)

### Phase 1: Core Scanner MVP (Weeks 1-4, ~56 hours)

**Goal:** Working MCP server that scans a project and finds the top 10 issues.

**Week 1: Project setup + MCP server skeleton**
- [ ] Initialize npm package: `shipsafe`
- [ ] Set up TypeScript + ESLint + Prettier
- [ ] Implement MCP server using `@modelcontextprotocol/sdk`
- [ ] Register `scan_project` tool with MCP schema
- [ ] Framework auto-detection (package.json parsing: Next.js, Express, etc.)
- [ ] File discovery (walk project tree, respect .gitignore)
- [ ] Test with Claude Code locally

**Week 2: First 5 security checks**
- [ ] Check 1: Exposed secrets in client code (SUPABASE_SERVICE_KEY, STRIPE_SECRET, etc. in files under src/ that get bundled)
- [ ] Check 2: Missing .gitignore entries for .env files
- [ ] Check 3: API routes without authentication checks
- [ ] Check 4: Hardcoded credentials (regex patterns for API keys, passwords)
- [ ] Check 5: Dangerous patterns (eval(), dangerouslySetInnerHTML, string SQL)
- [ ] Plain-English templates for each check
- [ ] Severity classification (critical / warning / info)

**Week 3: Next 5 checks + output formatting**
- [ ] Check 6: NEXT_PUBLIC_ variables containing secrets
- [ ] Check 7: Missing input validation on API routes
- [ ] Check 8: No rate limiting detection
- [ ] Check 9: Supabase RLS not enabled (check supabase config)
- [ ] Check 10: Insecure CORS configuration
- [ ] Beautiful terminal output with colors + icons
- [ ] Score calculation (0-10 safety score)
- [ ] Summary report format

**Week 4: CLI wrapper + first user testing**
- [ ] `npx shipsafe .` CLI command using commander
- [ ] `--json` flag for CI integration
- [ ] `--verbose` flag for detailed output
- [ ] `--fix` flag (auto-generate .gitignore additions, etc.)
- [ ] Test on 3-5 real vibe-coded projects (find open source ones on GitHub)
- [ ] Fix false positives
- [ ] Write README with installation instructions
- [ ] Publish to npm as v0.1.0

**Deliverable:** `npx shipsafe .` works standalone AND as an MCP server in Claude Code / Cursor.

---

### Phase 2: Launch-Ready Product (Weeks 5-8, ~56 hours)

**Goal:** Free product on npm, shareable reports, first 100 users.

**Week 5: Expand to 20 checks + framework-specific scanning**
- [ ] Checks 11-20 (Tier 2 list from above)
- [ ] Next.js-specific checks (server actions, middleware, API routes)
- [ ] Supabase-specific checks (RLS, service key usage, auth config)
- [ ] Firebase-specific checks (security rules, public database)
- [ ] Express-specific checks (helmet, cors, body-parser limits)

**Week 6: Report hosting + sharing**
- [ ] Build web report page (static HTML, hosted on Vercel/Cloudflare)
- [ ] `shipsafe . --share` generates a shareable link
- [ ] Report page: visual score, issues with explanations, fix guides
- [ ] Anonymous reports (no account needed for free tier)
- [ ] API endpoint to receive scan results and generate report URL

**Week 7: MCP tools expansion**
- [ ] `scan_file` — scan a single file
- [ ] `explain_issue` — deep explanation of a specific finding
- [ ] `suggest_fix` — return a code diff that fixes the issue
- [ ] `pre_deploy_check` — final yes/no deploy readiness
- [ ] `check_env` — focused env var audit
- [ ] `check_auth` — focused auth audit
- [ ] `check_database` — focused database access audit

**Week 8: Polish + soft launch prep**
- [ ] Handle edge cases (monorepos, unusual project structures)
- [ ] False positive reduction (test on 20+ real projects)
- [ ] Performance optimization (<5 seconds for typical project)
- [ ] Write documentation site (shipsafe.dev)
- [ ] Create demo GIF / video showing the scan in action
- [ ] Prepare launch posts (see Go-To-Market section)
- [ ] Publish v0.5.0 to npm
- [ ] List on Smithery.ai and mcp.so

**Deliverable:** Free, polished product. Ready for public launch.

---

### Phase 3: Monetization (Weeks 9-12, ~56 hours)

**Goal:** Paid tier live, first paying users.

**Week 9: User accounts + API key system**
- [ ] Supabase tables: users, api_keys, scans, subscriptions
- [ ] API key generation and validation
- [ ] Scan counting (free tier: 3 scans/day)
- [ ] shipsafe.dev dashboard: account, API key, scan history

**Week 10: Stripe integration + Pro tier**
- [ ] Stripe Checkout for Pro ($19/mo) and Team ($49/mo)
- [ ] Webhook handling: subscription created/updated/cancelled
- [ ] Pro features: unlimited scans, full check suite (30 checks), scan history
- [ ] Team features: shared dashboard, multiple projects, compliance export
- [ ] Rate limiting by tier

**Week 11: GitHub Action**
- [ ] GitHub Action: `shipsafe/scan@v1`
- [ ] Runs on PR open / push to main
- [ ] Posts scan results as PR comment
- [ ] Fails CI if critical issues found (configurable)
- [ ] Free for public repos, requires Pro for private

**Week 12: Advanced checks + CI integration**
- [ ] Checks 21-30 (Tier 3 framework-specific)
- [ ] `.shipsaferc` configuration file (ignore rules, custom thresholds)
- [ ] Baseline support (only flag NEW issues, ignore existing ones)
- [ ] Publish v1.0.0
- [ ] List on GitHub Marketplace

**Deliverable:** Monetized product with free + paid tiers, GitHub Action for CI.

---

### Phase 4: Growth + Moat (Weeks 13-20, ~112 hours)

**Goal:** 500+ users, 50+ paid, sustainable MRR.

- [ ] Weekly "Vibe Code Security Report" blog post / newsletter
- [ ] Scan popular open-source vibe-coded projects, publish anonymized findings
- [ ] Partner integrations: Vercel deploy hook, Netlify plugin
- [ ] "ShipSafe Certified" badge for websites that pass all checks
- [ ] Community rule contributions (let users submit new checks)
- [ ] Lovable/Bolt/v0 specific check packs
- [ ] SOC2-lite compliance report export (Team tier)
- [ ] Trending on GitHub via organic growth

---

## Part 5: Go-To-Market Plan

### Target Persona

**Name:** "Alex the Vibe Coder"
- Non-technical founder or career-switcher
- Built their SaaS using Claude Code / Cursor / Lovable / Bolt
- Has paying users (or about to launch)
- Knows security matters but doesn't know WHERE to start
- Already pays $20-200/mo for AI tools
- Hangs out on Twitter/X, Reddit, Indie Hackers, YouTube

### Pricing Strategy

| Tier | Price | What they get | Target |
|---|---|---|---|
| **Free** | $0 | 3 scans/day, top 10 checks, basic report | Try-before-buy, OSS projects |
| **Pro** | $19/mo | Unlimited scans, 30 checks, scan history, shareable reports, GitHub Action | Solo founders with paying users |
| **Team** | $49/mo | Everything in Pro + 5 projects, team dashboard, compliance export, priority support | Small teams, agencies |

**Why $19/mo:** Below the "think about it" threshold. Vibe coders already pay $20/mo for Cursor and $25/mo for Lovable. Security for less than a coffee a day.

### Launch Strategy (Week 8-10)

**Pre-launch (Week 7-8):**
1. Build in public on Twitter/X — share scan results from your own projects
2. DM 20-30 vibe coders you know — "I built this, would you try it?"
3. Record a 60-second demo video: scan a project, show critical issues found
4. Write the "I scanned 10 vibe-coded apps" blog post with anonymized results

**Launch Week (Week 9):**
1. **Reddit posts** (stagger across 3-4 days):
   - r/SideProject: "I built a security scanner for vibe coders — found 14 critical issues in my own app"
   - r/vibecoding: "Free tool: scan your AI-generated code for security issues before you ship"
   - r/ChatGPTCoding or r/ClaudeAI: "MCP server that checks your code for security issues and explains them in plain English"
   - r/webdev: "40% of AI-generated code has security vulnerabilities — I built a scanner that explains issues without jargon"

2. **Hacker News**: "Show HN: ShipSafe — security scanner for vibe-coded apps that speaks human"

3. **Product Hunt launch** (coordinate for a Tuesday/Wednesday)

4. **Twitter/X thread**: "I scanned 50 vibe-coded apps. Here's what I found 🧵" — with anonymized screenshots of real issues

5. **Indie Hackers**: Post in the product feedback section, share your build story

### Outreach Channels (Ongoing)

**Communities (ranked by relevance):**

| Platform | Where | Why |
|---|---|---|
| Reddit | r/vibecoding, r/SideProject, r/nocode, r/ChatGPTCoding, r/ClaudeAI, r/cursor | Direct access to target users |
| Twitter/X | Vibe coder community, #buildinpublic | Viral potential, influencer amplification |
| Indie Hackers | Forums, product directory | Founders who are about to ship |
| YouTube | Comment on vibe coding tutorials | People actively building |
| Discord | Lovable, Bolt, Cursor, Claude servers | Active communities of builders |
| Product Hunt | Launch + collections | Discovery channel for new tools |
| Hacker News | Show HN + comments on security posts | High-quality developer audience |
| Dev.to | Tutorial posts | SEO + developer reach |
| MCP registries | Smithery.ai, mcp.so, mcp-marketplace.io | MCP server discovery |

**Key Influencers to Reach (Vibe Coding Space):**

| Who | Platform | Why they matter |
|---|---|---|
| Andrej Karpathy | Twitter/X (3M+ followers) | Coined "vibe coding" — a retweet is rocket fuel |
| Greg Isenberg | Twitter/X + YouTube | Startup ideas, vibe coding content |
| Pieter Levels (@levelsio) | Twitter/X (500K+ followers) | Solo founder icon, builds in public |
| Theo (t3.gg) | YouTube (500K+ subs) + Twitter/X | Next.js content, reviews dev tools |
| Fireship | YouTube (3M+ subs) | Short dev tool reviews, massive reach |
| Marc Lou | Twitter/X + YouTube | Ships fast, reviews indie tools |
| Danny Postma | Twitter/X | AI tools, indie hacker |
| Tony Dinh | Twitter/X | Solo dev building SaaS products |
| Simon Willison | Blog + Twitter/X | MCP ecosystem, AI tools |
| McKay Wrigley | Twitter/X + YouTube | AI coding tutorials |

**Outreach approach:**
- Don't pitch. Scan THEIR open-source projects and share results with them privately
- "Hey, I ran ShipSafe on [their project] and found 3 things — thought you'd want to know"
- If they find it useful, ask if they'd share it
- One genuine interaction > 100 cold DMs

### Content Marketing (Ongoing, 1-2 posts/week)

**Blog post templates that work for this audience:**
1. "I scanned [X popular vibe-coded apps] — here's what I found" (viral bait)
2. "The 5 security mistakes every vibe coder makes" (educational)
3. "Your Supabase project is probably leaking data — here's how to check" (specific + scary)
4. "What happens when a hacker finds your exposed API key" (fear + education)
5. "I shipped my SaaS without a security check. Here's what happened." (story format)
6. "Free security checklist for vibe coders" (lead magnet)
7. Weekly "Vibe Code Security Report" — scan trending projects, share anonymized findings

**SEO targets:**
- "vibe coding security"
- "is my AI generated code secure"
- "security scanner for cursor/claude code"
- "supabase security checklist"
- "next.js security audit free"
- "how to secure AI generated code"

### Partnership Strategy

| Partner | Integration | Value for them |
|---|---|---|
| **Vercel** | Deploy hook — scan before deploy | Fewer insecure apps on their platform |
| **Supabase** | Template project integration | Better security for their ecosystem |
| **Lovable** | Recommended security tool | Addresses their users' #1 concern |
| **Cursor** | Featured in marketplace | Security plugin differentiates their marketplace |
| **Smithery.ai** | Featured MCP server | Quality content for their registry |

---

## Part 6: Revenue Projections (Conservative)

### Assumptions
- Launch in Week 9
- 2 hrs/day effort
- No paid marketing budget
- Organic growth via content + communities

| Milestone | Timeline | Free Users | Paid Users | MRR |
|---|---|---|---|---|
| Launch | Week 9 | 100 | 0 | $0 |
| Month 3 | Week 12 | 500 | 15-25 | $285-475 |
| Month 6 | Week 24 | 2,000 | 60-100 | $1,140-1,900 |
| Month 9 | Week 36 | 5,000 | 150-250 | $2,850-4,750 |
| Month 12 | Week 48 | 10,000 | 300-500 | $5,700-9,500 |

**Break-even:** ~$200/mo in infrastructure costs (Vercel, Supabase, domain). Break even at ~11 paid users.

**Key conversion metric:** Free → Paid conversion rate of 3-5% is realistic for developer tools with genuine value.

---

## Part 7: Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Claude Code / Cursor adds built-in security scanning | Medium | They'll do generic scanning. Your moat is plain-English explanations + vibe-coder-specific checks + opinionated for specific stacks |
| Snyk launches a free "beginner mode" | Low | Snyk is enterprise-focused. Changing DNA is hard. |
| Vibe-Guard or VibeScan gets funding and scales | Low | They're CLI-only, dev-focused, no MCP, no monetization strategy |
| False positives destroy trust | High | Invest heavily in testing against real projects. Better to miss an issue than flag a non-issue. |
| Vibe coding trend fades | Very Low | $4.7B market growing at 38% CAGR. AI-assisted coding is permanent. |
| Users expect the tool to FIX issues, not just find them | High | Phase 1 finds issues. Phase 2 adds `suggest_fix`. Phase 4 adds auto-fix. Set expectations in marketing. |

---

## Part 8: What Makes ShipSafe Win

1. **Plain English** — "Your database password is public" not "CWE-200: Information Exposure"
2. **MCP-native** — Works inside Claude Code, Cursor, Codex, Gemini. No context switching.
3. **Opinionated for vibe-coder stacks** — Next.js + Supabase + Vercel, not Java + Spring + AWS
4. **Local-first** — Your code never leaves your machine. Privacy selling point.
5. **Free to try, cheap to keep** — $0 to scan, $19/mo when you're serious
6. **Scanning doesn't need AI** — Zero API costs for detection. Deterministic, fast, works offline.
7. **No competitor occupies this exact position** — MCP + plain English + vibe coder audience

---

## Quick Start (for Claude Code)

When ready to build, start here:

```bash
mkdir shipsafe && cd shipsafe
npm init -y
npm install @modelcontextprotocol/sdk typescript @typescript-eslint/parser commander chalk
npx tsc --init
```

Then tell Claude Code:
> "Read /Users/avishekpatra/Projects/shipsafe-plan/PLAN.md and start building Phase 1, Week 1."
