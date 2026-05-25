/**
 * ShipCheck Marketing Agent
 *
 * Generates platform-specific posts using Claude, then queues them
 * in Buffer for LinkedIn and X (Twitter).
 *
 * Usage:
 *   npx tsx scripts/marketing-agent/agent.ts --type release --version 0.1.4
 *   npx tsx scripts/marketing-agent/agent.ts --type tip --topic "server-action-auth"
 *   npx tsx scripts/marketing-agent/agent.ts --type tip  (auto-picks a topic)
 *
 * Env vars required:
 *   GROQ_API_KEY              — Groq API key (free at console.groq.com)
 *   BUFFER_ACCESS_TOKEN       — Buffer personal token (publish.buffer.com/settings/api)
 *   BUFFER_LINKEDIN_CHANNEL   — Buffer channel ID for LinkedIn
 *   BUFFER_TWITTER_CHANNEL    — Buffer channel ID for X/Twitter
 *   BUFFER_SCHEDULE_TIME      — ISO 8601 datetime to schedule (optional, defaults to now+1h)
 */

import Groq from 'groq-sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostSet {
  linkedin: string;
  twitter: string;
}

interface BufferChannel {
  id: string;
  service: string;
  name: string;
}

interface BufferPostResult {
  data?: {
    createPost?: {
      post?: { id: string; dueAt: string };
      message?: string;
    };
  };
  errors?: { message: string }[];
}

// ─── Content Generation ───────────────────────────────────────────────────────

const SECURITY_TIPS = [
  { topic: 'server-action-auth',          headline: "Next.js server actions have no auth by default — any unauthenticated user can call them" },
  { topic: 'supabase-deprecated-session', headline: "getSession() trusts a client cookie that can be forged — use getUser() on the server" },
  { topic: 'cursor-rules-backdoor',       headline: "Hidden Unicode characters in .cursor/rules can silently instruct your AI to write backdoored code" },
  { topic: 'exposed-secrets',             headline: "A Supabase service key in a 'use client' file is visible in the browser to every user" },
  { topic: 'supabase-rls',                headline: "Tables without Row Level Security: any authenticated user can read every row in your database" },
  { topic: 'hardcoded-credentials',       headline: "API keys committed to git are public forever — even after you delete them" },
  { topic: 'missing-gitignore',           headline: ".env not in .gitignore means one accidental push exposes every secret you have" },
  { topic: 'unauth-api-routes',           headline: "An API route with no auth check is a public endpoint — anyone can call it" },
];

function pickTip(topic?: string) {
  if (topic) return SECURITY_TIPS.find(t => t.topic === topic) ?? SECURITY_TIPS[0];
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return SECURITY_TIPS[week % SECURITY_TIPS.length];
}

async function generatePosts(client: Groq, type: string, opts: Record<string, string>): Promise<PostSet> {
  let systemPrompt = `You are the voice of ShipCheck — a security scanner for vibe-coded apps (Next.js, Supabase, Cursor, Claude Code).
Tone: direct, useful, zero fluff. No buzzwords. No "game-changer". No "🚀". Write like a senior engineer who has seen these bugs in production.
ShipCheck is open source, free to use via npx, and runs automatically on every git commit via a pre-commit hook.
npm: @shipcheck/cli. GitHub: github.com/patravishek/shipcheck`;

  let userPrompt: string;

  if (type === 'release') {
    const { version, checks } = opts;
    userPrompt = `Write two posts announcing ShipCheck v${version}.

What's new in this release:
- Git log attestation: every clean commit now gets "ShipCheck: score:X/10 | criticals:N | warnings:N" appended to the commit message — your git log becomes a security audit trail
- Fix prompt: when critical issues are found, the CLI prints a paste-ready Claude Code/Cursor prompt to fix them
- 3 new security checks:
  1. cursor-rules-backdoor (critical): detects hidden Unicode in .cursor/rules, CLAUDE.md — a supply chain attack that makes your AI write backdoored code invisibly
  2. supabase-deprecated-session (critical): getSession() in server-side code trusts a forgeable cookie; flags and tells you to use getUser()
  3. server-action-auth (warning): Next.js server actions in 'use server' files with no auth check — any unauthenticated client can invoke them

LinkedIn post:
- 3–5 short paragraphs, no more than 200 words total
- Lead with the most interesting/surprising insight (the hidden Unicode backdoor angle is strong)
- End with: "npx @shipcheck/cli . to scan your project. Install the hook: shipcheck install-hook"
- Use line breaks for readability. One or two emojis max, tasteful only.

Twitter/X post:
- Single tweet, max 280 characters
- Hook first — make someone stop scrolling
- End with the npm command or a link hook

Respond in this exact format:
LINKEDIN:
<linkedin post text>

TWITTER:
<twitter post text>`;
  } else {
    const tip = pickTip(opts.topic);
    userPrompt = `Write two posts about this security issue that vibe coders commonly make:

Topic: ${tip.topic}
Key insight: ${tip.headline}

ShipCheck detects this automatically (check ID: ${tip.topic}).

LinkedIn post:
- 2–3 short paragraphs, under 150 words
- Explain WHY this is dangerous in plain English — no CVE IDs, no jargon
- Show a quick code example if it helps
- End with: "ShipCheck catches this automatically on every git commit. Install: npm i -g @shipcheck/cli && shipcheck install-hook"
- One emoji max

Twitter/X post:
- Single tweet, max 280 chars
- Lead with the danger, end with the fix or the tool
- No hashtag spam — one at most (#shipit or #buildinpublic if relevant)

Respond in this exact format:
LINKEDIN:
<linkedin post text>

TWITTER:
<twitter post text>`;
  }

  const message = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = message.choices[0]?.message?.content ?? '';

  const linkedinMatch = text.match(/LINKEDIN:\n([\s\S]*?)(?=\nTWITTER:|$)/);
  const twitterMatch  = text.match(/TWITTER:\n([\s\S]*?)$/);

  return {
    linkedin: linkedinMatch?.[1]?.trim() ?? text,
    twitter:  twitterMatch?.[1]?.trim()  ?? text.slice(0, 280),
  };
}

// ─── Buffer GraphQL API ───────────────────────────────────────────────────────

const BUFFER_GQL = 'https://api.buffer.com/graphql';

async function bufferGql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  console.log(`  → POST ${BUFFER_GQL}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(BUFFER_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Buffer request failed: ${msg}`);
  } finally {
    clearTimeout(timeout);
  }

  console.log(`  ← ${res.status} ${res.statusText}`);
  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Buffer GQL error: ${json.errors.map(e => e.message).join(', ')}`);
  if (!res.ok) throw new Error(`Buffer HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json.data as T;
}

async function scheduleToBuffer(
  posts: PostSet,
  token: string,
  linkedinChannelId: string,
  twitterChannelId: string,
  scheduledAt?: string,
): Promise<void> {
  const dueAt = scheduledAt
    ? new Date(scheduledAt).toISOString()
    : new Date(Date.now() + 3600_000).toISOString();

  const mutation = `
    mutation CreatePost($channelId: String!, $text: String!, $dueAt: DateTime!) {
      createPost(input: {
        channelId: $channelId
        text: $text
        schedulingType: scheduled
        dueAt: $dueAt
      }) {
        ... on PostActionSuccess { post { id dueAt } }
        ... on MutationError { message }
      }
    }
  `;

  async function post(channelId: string, text: string, platform: string) {
    const data = await bufferGql<BufferPostResult['data']>(token, mutation, { channelId, text, dueAt });
    const result = data?.createPost;
    if ('message' in (result ?? {})) throw new Error(`Buffer ${platform}: ${(result as { message: string }).message}`);
    console.log(`✅ ${platform} scheduled — post ID: ${(result as { post: { id: string; dueAt: string } }).post.id}, time: ${dueAt}`);
  }

  await post(linkedinChannelId, posts.linkedin, 'LinkedIn');
  await post(twitterChannelId,  posts.twitter,  'X/Twitter');
}

// ─── List Buffer Channels ─────────────────────────────────────────────────────

async function introspect(token: string): Promise<void> {
  const data = await bufferGql<{ __schema: { queryType: { fields: { name: string; args: { name: string; type: { name: string; kind: string; ofType: { name: string } } }[] }[] } } }>(token, `
    query {
      __schema {
        queryType {
          fields {
            name
            args { name type { name kind ofType { name } } }
          }
        }
      }
    }
  `);
  console.log('\nAvailable queries:\n');
  for (const f of data.__schema.queryType.fields) {
    const args = f.args.map(a => `${a.name}: ${a.type.name ?? a.type.ofType?.name}`).join(', ');
    console.log(`  ${f.name}(${args})`);
  }
}

async function listChannels(token: string): Promise<void> {
  await introspect(token);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const type    = get('--type')    ?? 'tip';
  const version = get('--version') ?? '0.1.4';
  const topic   = get('--topic');
  const when    = get('--at') ?? process.env.BUFFER_SCHEDULE_TIME;

  const groqKey        = process.env.GROQ_API_KEY;
  const bufferToken    = process.env.BUFFER_ACCESS_TOKEN;
  const linkedinChannel = process.env.BUFFER_LINKEDIN_CHANNEL;
  const twitterChannel  = process.env.BUFFER_TWITTER_CHANNEL;

  if (!bufferToken) throw new Error('BUFFER_ACCESS_TOKEN not set');

  if (args.includes('--list-channels')) {
    await listChannels(bufferToken);
    return;
  }

  if (!groqKey)         throw new Error('GROQ_API_KEY not set');
  if (!linkedinChannel) throw new Error('BUFFER_LINKEDIN_CHANNEL not set');
  if (!twitterChannel)  throw new Error('BUFFER_TWITTER_CHANNEL not set');

  const client = new Groq({ apiKey: groqKey });

  console.log(`\n🤖 Generating ${type} posts...\n`);
  const posts = await generatePosts(client, type, { version, ...(topic ? { topic } : {}) });

  console.log('─── LinkedIn ────────────────────────────────────');
  console.log(posts.linkedin);
  console.log('\n─── X/Twitter ───────────────────────────────────');
  console.log(posts.twitter);
  console.log('\n─────────────────────────────────────────────────\n');

  const dryRun = args.includes('--dry-run');
  if (dryRun) {
    console.log('Dry run — not scheduling. Remove --dry-run to post.');
    return;
  }

  console.log('📬 Scheduling via Buffer GraphQL API...\n');
  await scheduleToBuffer(posts, bufferToken, linkedinChannel, twitterChannel, when);
  console.log('\nDone. Check your Buffer queue to review before it goes live.\n');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
