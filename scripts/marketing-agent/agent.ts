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

// Rotates by day so each run gets a fresh topic
function pickTip(topic?: string) {
  if (topic) return SECURITY_TIPS.find(t => t.topic === topic) ?? SECURITY_TIPS[0];
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return SECURITY_TIPS[day % SECURITY_TIPS.length];
}

// Four tweet angles — rotate by hour slot so same-day tweets feel different
const TWEET_ANGLES = ['risk', 'fix', 'tool', 'question'] as const;
type TweetAngle = typeof TWEET_ANGLES[number];

function pickAngle(slot: number): TweetAngle {
  return TWEET_ANGLES[slot % TWEET_ANGLES.length];
}

const ANGLE_PROMPTS: Record<TweetAngle, (tip: typeof SECURITY_TIPS[0]) => string> = {
  risk:     t => `Tweet about the RISK: "${t.headline}". What goes wrong when this bug exists? Make it concrete — data leaked, account taken over, bill spiked. Max 240 chars, leave room for the npm command. End with: npx @shipcheck/cli .`,
  fix:     t => `Tweet about the FIX for: "${t.headline}". One sentence on what's wrong, one sentence on the exact code fix. Max 240 chars. End with: ShipCheck catches this automatically.`,
  tool:     t => `Tweet promoting ShipCheck as the solution for: "${t.headline}". Lead with the problem in 10 words, then: "ShipCheck catches this on every git commit — shipcheck install-hook". Max 260 chars.`,
  question: t => `Ask the dev community a genuine question related to: "${t.headline}". Something they'll actually answer. No marketing in the question itself — just curiosity. Under 200 chars. Can mention ShipCheck briefly at the end.`,
};

async function generatePosts(client: Groq, type: string, opts: Record<string, string>): Promise<PostSet> {
  const systemPrompt = `You are the voice of ShipCheck — a security scanner for vibe-coded apps (Next.js, Supabase, Cursor, Claude Code).
Tone: direct, useful, zero fluff. No buzzwords. No "game-changer". No "🚀". Write like a senior engineer who has seen these bugs in production.
ShipCheck is open source, free to use via npx, and runs automatically on every git commit via a pre-commit hook.
npm: @shipcheck/cli. GitHub: github.com/patravishek/shipcheck`;

  let userPrompt: string;

  if (type === 'release') {
    userPrompt = `Write two posts announcing ShipCheck v${opts.version}.

What's new:
- Git log attestation: every clean commit gets "ShipCheck: score:X/10 | criticals:N | warnings:N" appended to the commit message
- Fix prompt: CLI prints a paste-ready Claude Code/Cursor prompt when criticals are found
- 3 new checks:
  1. cursor-rules-backdoor (critical): hidden Unicode in .cursor/rules, CLAUDE.md — supply chain attack, makes your AI write backdoored code invisibly
  2. supabase-deprecated-session (critical): getSession() on the server trusts a forgeable cookie; use getUser()
  3. server-action-auth (warning): server actions in 'use server' files with no auth — any unauthenticated client can invoke them

LinkedIn post:
- 3–5 short paragraphs, max 200 words
- Lead with the hidden Unicode backdoor angle — it's the most surprising
- End with: "npx @shipcheck/cli . to scan your project. Install the hook: shipcheck install-hook"
- Max two emojis

Twitter/X post:
- Single tweet, max 280 characters
- Hook first, npm command at the end

Respond in this exact format:
LINKEDIN:
<linkedin post>

TWITTER:
<twitter post>`;

  } else if (type === 'tweet') {
    // Twitter-only: specific angle for variety across multiple daily posts
    const tip   = pickTip(opts.topic);
    const angle = (opts.angle as TweetAngle | undefined) ?? pickAngle(Number(opts.slot ?? 0));
    userPrompt  = `Write a single tweet (max 280 chars). ${ANGLE_PROMPTS[angle](tip)}\n\nRespond with ONLY the tweet text, nothing else.`;

  } else {
    // Daily tip — both platforms
    const tip = pickTip(opts.topic);
    userPrompt = `Write two posts about this security issue vibe coders commonly hit:

Topic: ${tip.topic}
Key insight: ${tip.headline}
ShipCheck check ID: ${tip.topic}

LinkedIn post:
- 2–3 paragraphs, under 150 words
- Explain WHY it's dangerous in plain English
- Show a code snippet if it helps
- End with: "ShipCheck catches this automatically on every git commit. Install: npm i -g @shipcheck/cli && shipcheck install-hook"
- One emoji max

Twitter/X post:
- Single tweet, max 280 chars
- Lead with the danger, end with the fix or the tool
- One hashtag max (#buildinpublic or #shipit)

Respond in this exact format:
LINKEDIN:
<linkedin post>

TWITTER:
<twitter post>`;
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
    mutation CreatePost($channelId: ChannelId!, $text: String!, $dueAt: DateTime!) {
      createPost(input: {
        channelId: $channelId
        text: $text
        schedulingType: automatic
        mode: customScheduled
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

  if (linkedinChannelId && posts.linkedin) await post(linkedinChannelId, posts.linkedin, 'LinkedIn');
  if (twitterChannelId  && posts.twitter)  await post(twitterChannelId,  posts.twitter,  'X/Twitter');
}

// ─── List Buffer Channels ─────────────────────────────────────────────────────

async function getOrgId(token: string): Promise<string> {
  const data = await bufferGql<{ account: { organizations: { id: string }[] } }>(token, `
    query { account { organizations { id name } } }
  `);
  const org = data.account.organizations[0];
  if (!org) throw new Error('No organizations found on this Buffer account');
  return org.id;
}

async function listChannels(token: string): Promise<void> {
  const orgId = await getOrgId(token);

  const data = await bufferGql<{ channels: BufferChannel[] }>(token, `
    query GetChannels($input: ChannelsInput!) {
      channels(input: $input) { id service name }
    }
  `, { input: { organizationId: orgId } });

  console.log('\nConnected channels:\n');
  for (const c of data.channels) {
    console.log(`  service : ${c.service}`);
    console.log(`  name    : ${c.name}`);
    console.log(`  id      : ${c.id}   ← BUFFER_${c.service.toUpperCase()}_CHANNEL`);
    console.log('');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const type     = get('--type')     ?? 'tip';
  const version  = get('--version')  ?? '0.1.4';
  const topic    = get('--topic');
  const platform = get('--platform') ?? 'both';   // linkedin | twitter | both
  const slot     = get('--slot')     ?? '0';       // 0-3 for Twitter angle rotation
  const when     = get('--at') ?? process.env.BUFFER_SCHEDULE_TIME;

  const groqKey         = process.env.GROQ_API_KEY;
  const bufferToken     = process.env.BUFFER_ACCESS_TOKEN;
  const linkedinChannel = process.env.BUFFER_LINKEDIN_CHANNEL;
  const twitterChannel  = process.env.BUFFER_TWITTER_CHANNEL;

  if (!bufferToken) throw new Error('BUFFER_ACCESS_TOKEN not set');

  if (args.includes('--list-channels')) {
    await listChannels(bufferToken);
    return;
  }

  if (!groqKey) throw new Error('GROQ_API_KEY not set');
  if ((platform === 'linkedin' || platform === 'both') && !linkedinChannel) throw new Error('BUFFER_LINKEDIN_CHANNEL not set');
  if ((platform === 'twitter'  || platform === 'both') && !twitterChannel)  throw new Error('BUFFER_TWITTER_CHANNEL not set');

  const client = new Groq({ apiKey: groqKey });
  const opts   = { version, slot, ...(topic ? { topic } : {}) };

  console.log(`\n🤖 Generating ${type} post${platform !== 'both' ? ` (${platform})` : 's'}...\n`);

  const dryRun = args.includes('--dry-run');

  if (type === 'tweet' || platform === 'twitter') {
    // Twitter-only: generate one tweet with a specific angle
    const posts = await generatePosts(client, 'tweet', opts);
    console.log('─── X/Twitter ───────────────────────────────────');
    console.log(posts.twitter);
    console.log('─────────────────────────────────────────────────\n');
    if (!dryRun) {
      console.log('📬 Scheduling to X/Twitter via Buffer...\n');
      const dueAt = when ? new Date(when).toISOString() : new Date(Date.now() + 3600_000).toISOString();
      await scheduleToBuffer({ linkedin: '', twitter: posts.twitter }, bufferToken, '', twitterChannel!, when);
    }
    return;
  }

  // Both platforms or LinkedIn-only
  const posts = await generatePosts(client, type, opts);

  if (platform === 'both' || platform === 'linkedin') {
    console.log('─── LinkedIn ────────────────────────────────────');
    console.log(posts.linkedin);
    console.log('');
  }
  if (platform === 'both') {
    console.log('─── X/Twitter ───────────────────────────────────');
    console.log(posts.twitter);
  }
  console.log('─────────────────────────────────────────────────\n');

  if (dryRun) { console.log('Dry run — not scheduling.'); return; }

  console.log('📬 Scheduling via Buffer GraphQL API...\n');
  if (platform === 'linkedin') {
    await scheduleToBuffer({ linkedin: posts.linkedin, twitter: '' }, bufferToken, linkedinChannel!, '', when);
  } else {
    await scheduleToBuffer(posts, bufferToken, linkedinChannel!, twitterChannel!, when);
  }
  console.log('\nDone.\n');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
