/**
 * Demo mode socket handler.
 *
 * Streams a fully-scripted 6-agent code review through the exact same
 * `command:started → command:event × N → command:finished` pipeline
 * that live AI CLI executions use.  The EventStreamRenderer on the client
 * renders it with full styling, agent rail colours, thinking blocks, tool
 * calls, etc. — no special-casing required.
 *
 * Triggered by the client via `socket.emit('demo:run', { prompt? })`.
 */

import type { Server as SocketIOServer, Socket } from 'socket.io'

/* ── Helpers ────────────────────────────────────────────────────────────── */

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

type EventBody =
  | { type: 'message'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_call'; toolId: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolId: string; output: string; isError: boolean }
  | { type: 'notice'; level: 'info' | 'warning'; code: string; message: string }
  | { type: 'result'; isError: boolean; subtype?: string }

/* ── Demo script ────────────────────────────────────────────────────────── */

interface DemoStep {
  delayMs: number
  agentId: string
  body: EventBody
}

function buildScript(prompt: string): DemoStep[] {
  return [
    /* ── Phase 1: Kick-off ──────────────────────────────────────────── */
    {
      delayMs: 400,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'review:start',
        message: `Starting multi-agent review — "${prompt}"`,
      },
    },
    {
      delayMs: 300,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'team:assembled',
        message: 'Assembled: Architect · Coder · Security · Performance · Reviewer · Devil\'s Advocate',
      },
    },

    /* ── Architect ──────────────────────────────────────────────────── */
    {
      delayMs: 800,
      agentId: 'architect',
      body: {
        type: 'thinking_delta',
        text: 'Reviewing API surface and system topology for the requested feature…',
      },
    },
    {
      delayMs: 1400,
      agentId: 'architect',
      body: {
        type: 'message',
        text: [
          '**Architect · Design Review**',
          '',
          'The JWT authentication request is well-scoped. Recommended surface:',
          '- `POST /auth/register` — email + password, returns access + refresh token pair',
          '- `POST /auth/login` — credentials validation, issues new token pair',
          '- `POST /auth/refresh` — stateless refresh, validates refresh token signature',
          '- `DELETE /auth/logout` — token blacklist entry (requires Redis)',
          '',
          'Rate limiting middleware should sit at the gateway layer, not inside each handler.',
          '',
          '**Verdict: APPROVE** — clean contract, no architectural blockers.',
        ].join('\n'),
      },
    },

    /* ── Coder ──────────────────────────────────────────────────────── */
    {
      delayMs: 600,
      agentId: 'coder',
      body: {
        type: 'message',
        text: [
          '**Coder · Implementation Review**',
          '',
          'Reading the diff… Implementation is Express + bcrypt + jsonwebtoken.',
          '',
          'Positive notes:',
          '- Password hashing is present (bcrypt)',
          '- Token signing uses HS256 with a secret',
          '- Route structure matches the Architect\'s contract',
          '',
          'Concerns passed to Security for deeper scan.',
          '',
          '**Verdict: APPROVE WITH CHANGES** — implementation needs security review sign-off.',
        ].join('\n'),
      },
    },

    /* ── Security ───────────────────────────────────────────────────── */
    {
      delayMs: 700,
      agentId: 'security',
      body: {
        type: 'thinking_delta',
        text: 'Running OWASP Top 10 scan. Checking for injection, broken auth, secrets exposure, missing rate limits, improper input validation…',
      },
    },
    {
      delayMs: 1200,
      agentId: 'security',
      body: {
        type: 'tool_call',
        toolId: 'scan-1',
        name: 'Read file',
        input: { path: 'src/routes/auth.ts', lines: '1-80' },
      },
    },
    {
      delayMs: 900,
      agentId: 'security',
      body: {
        type: 'tool_result',
        toolId: 'scan-1',
        isError: false,
        output: [
          '// src/routes/auth.ts',
          'const SECRET_KEY = "super-secret-key-do-not-share"  // ← hardcoded!',
          '',
          'router.post("/login", async (req, res) => {',
          '  const { email, password } = req.body  // no validation',
          '  const user = await db.query(`SELECT * FROM users WHERE email = "${email}"`)',
          '  // ↑ SQL injection — template literal with user input',
          '  const token = jwt.sign({ id: user.id }, SECRET_KEY)',
          '  res.json({ token })',
          '})',
        ].join('\n'),
      },
    },
    {
      delayMs: 800,
      agentId: 'security',
      body: {
        type: 'message',
        text: [
          '**Security · OWASP Scan Results**',
          '',
          '🔴 **CRITICAL — 3 blockers found:**',
          '',
          '1. **Hardcoded secret** (`src/routes/auth.ts:2`) — `SECRET_KEY` is a string literal in source. Any repo access = full token forgery.',
          '2. **SQL Injection** (`src/routes/auth.ts:6`) — user-controlled `email` interpolated directly into SQL template. Classic A03:2021.',
          '3. **No input validation** — `req.body` is consumed raw. No schema enforcement, no sanitisation.',
          '',
          '🟡 **HIGH — 2 warnings:**',
          '- No rate limiting on `/login` → brute-force attack surface',
          '- `bcrypt` rounds at 12 → 300ms per hash is acceptable but review Performance\'s take',
          '',
          '**Verdict: REJECT** — critical issues block merge. Cannot approve until all 3 blockers are resolved.',
        ].join('\n'),
      },
    },
    {
      delayMs: 300,
      agentId: 'security',
      body: {
        type: 'notice',
        level: 'warning',
        code: 'vote:reject',
        message: 'Security cast REJECT — 3 critical blockers (hardcoded secret, SQLi, no validation)',
      },
    },

    /* ── Performance ────────────────────────────────────────────────── */
    {
      delayMs: 600,
      agentId: 'performance',
      body: {
        type: 'message',
        text: [
          '**Performance · Benchmark Analysis**',
          '',
          '- `bcrypt` at rounds=12 → ~300ms per login on a single core. At p99 under load this becomes a bottleneck. Recommend rounds=10 (~80ms) for API endpoints.',
          '- No token caching layer. Every request hits DB for user lookup. Add Redis session cache with 5-min TTL.',
          '- JWT verification is synchronous (`jsonwebtoken.verify` default). Under 1000 RPS this will saturate one CPU core.',
          '',
          '**Verdict: APPROVE WITH CHANGES** — reduce bcrypt rounds, add caching before prod.',
        ].join('\n'),
      },
    },

    /* ── Devil's Advocate ───────────────────────────────────────────── */
    {
      delayMs: 700,
      agentId: 'devil-advocate',
      body: {
        type: 'message',
        text: [
          '**Devil\'s Advocate · Architectural Challenge**',
          '',
          'I want to challenge the fundamental choice here: **why JWT?**',
          '',
          'JWT is stateless — that\'s also its weakness. Once issued, a token **cannot be revoked** without a blacklist, which defeats the statelessness argument. A leaked token is valid until expiry.',
          '',
          'For a standard web app, **httpOnly session cookies** with a server-side session store (Redis) offer:',
          '- True revocation on logout',
          '- No XSS token theft risk (httpOnly)',
          '- Simpler implementation',
          '',
          'Counterpoint accepted: JWT is fine for **mobile clients** or **microservice-to-service auth** where cookies are impractical.',
          '',
          '**Verdict: CONDITIONAL** — if the consumer is a web browser, reconsider. If mobile or M2M, proceed with JWTs + refresh token rotation.',
        ].join('\n'),
      },
    },

    /* ── Reviewer ───────────────────────────────────────────────────── */
    {
      delayMs: 700,
      agentId: 'reviewer',
      body: {
        type: 'message',
        text: [
          '**Reviewer · Quality Gate**',
          '',
          '- ❌ Zero unit tests for auth routes',
          '- ❌ No JSDoc / TSDoc on any exported function',
          '- ❌ No error handling for DB connection failure — unhandled promise rejection',
          '- ⚠️ `any` types on `req.body` — should use a Zod schema or express-validator',
          '- ✅ File structure is consistent with project conventions',
          '- ✅ No console.log statements left in production paths',
          '',
          '**Verdict: APPROVE WITH CHANGES** — add tests and error handling before merge.',
        ].join('\n'),
      },
    },

    /* ── Consensus Round 1 ──────────────────────────────────────────── */
    {
      delayMs: 800,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'vote:tally',
        message: 'Votes: Architect APPROVE · Coder APPROVE_WITH_CHANGES · Security REJECT · Performance APPROVE_WITH_CHANGES · Devil\'s Advocate CONDITIONAL · Reviewer APPROVE_WITH_CHANGES',
      },
    },
    {
      delayMs: 600,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'warning',
        code: 'consensus:reject',
        message: 'CONSENSUS: REJECTED (score 42/100) — Security veto triggered. Initiating automated revision cycle…',
      },
    },

    /* ── Phase 2: Auto-Revision ─────────────────────────────────────── */
    {
      delayMs: 1000,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'revision:start',
        message: 'Round 2 — applying all agent feedback automatically',
      },
    },
    {
      delayMs: 800,
      agentId: 'coder',
      body: {
        type: 'thinking_delta',
        text: 'Applying Security fixes: moving secret to env, parameterising query, adding Zod validation, rate limiting middleware…',
      },
    },
    {
      delayMs: 1000,
      agentId: 'coder',
      body: {
        type: 'tool_call',
        toolId: 'fix-1',
        name: 'Write file',
        input: { path: 'src/routes/auth.ts', description: 'Apply all 3 security fixes + input validation + error handling' },
      },
    },
    {
      delayMs: 900,
      agentId: 'coder',
      body: {
        type: 'tool_result',
        toolId: 'fix-1',
        isError: false,
        output: [
          'Written src/routes/auth.ts — changes:',
          '  + SECRET_KEY loaded from process.env.JWT_SECRET (throws if missing)',
          '  + SQL query parameterised: db.query("SELECT … WHERE email = $1", [email])',
          '  + Zod schema validation on req.body before any processing',
          '  + express-rate-limit: 5 attempts / 15 min per IP on /login',
          '  + bcrypt rounds reduced to 10',
          '  + try/catch with typed error responses on all handlers',
          '  + TSDoc added to all exported functions',
        ].join('\n'),
      },
    },
    {
      delayMs: 700,
      agentId: 'coder',
      body: {
        type: 'tool_call',
        toolId: 'fix-2',
        name: 'Write file',
        input: { path: 'src/routes/auth.test.ts', description: 'Add unit tests for all 3 routes' },
      },
    },
    {
      delayMs: 800,
      agentId: 'coder',
      body: {
        type: 'tool_result',
        toolId: 'fix-2',
        isError: false,
        output: 'Written src/routes/auth.test.ts — 14 test cases covering register, login, refresh, error paths, and rate limiting.',
      },
    },

    /* ── Security re-check ──────────────────────────────────────────── */
    {
      delayMs: 600,
      agentId: 'security',
      body: {
        type: 'tool_call',
        toolId: 'rescan-1',
        name: 'Read file',
        input: { path: 'src/routes/auth.ts', lines: '1-100' },
      },
    },
    {
      delayMs: 800,
      agentId: 'security',
      body: {
        type: 'tool_result',
        toolId: 'rescan-1',
        isError: false,
        output: [
          '// src/routes/auth.ts (revised)',
          'const SECRET_KEY = process.env.JWT_SECRET',
          'if (!SECRET_KEY) throw new Error("JWT_SECRET env var required")',
          '',
          'const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })',
          '',
          'router.post("/login", rateLimiter, async (req, res) => {',
          '  const { email, password } = loginSchema.parse(req.body)',
          '  const user = await db.query("SELECT * FROM users WHERE email = $1", [email])',
          '  ...',
          '})',
        ].join('\n'),
      },
    },
    {
      delayMs: 700,
      agentId: 'security',
      body: {
        type: 'message',
        text: [
          '**Security · Re-scan (Round 2)**',
          '',
          '✅ Hardcoded secret — resolved. `JWT_SECRET` from env with startup guard.',
          '✅ SQL Injection — resolved. Parameterised query, user input never interpolated.',
          '✅ Input validation — resolved. Zod schema enforced before any processing.',
          '✅ Rate limiting — added. 5 attempts per 15 minutes per IP.',
          '✅ bcrypt rounds — reduced to 10 (~80ms, Performance approves).',
          '',
          'OWASP Top 10 scan: **0 critical, 0 high, 0 medium**.',
          '',
          '**Verdict: APPROVE** — all blockers resolved. Security score: 90/100.',
        ].join('\n'),
      },
    },

    /* ── Performance re-check ───────────────────────────────────────── */
    {
      delayMs: 500,
      agentId: 'performance',
      body: {
        type: 'message',
        text: '**Performance · Re-check** — bcrypt now at rounds=10 (~80ms). Rate limiter prevents brute-force amplification. **Verdict: APPROVE** — score 85/100.',
      },
    },

    /* ── Devil's Advocate final ─────────────────────────────────────── */
    {
      delayMs: 500,
      agentId: 'devil-advocate',
      body: {
        type: 'message',
        text: '**Devil\'s Advocate · Final position** — JWT is still not ideal for browser clients, but the refresh token rotation pattern mitigates the revocation issue adequately. I withdraw the block. **Verdict: APPROVE** — with recommendation to revisit if web browser support becomes primary.',
      },
    },

    /* ── Reviewer re-check ──────────────────────────────────────────── */
    {
      delayMs: 500,
      agentId: 'reviewer',
      body: {
        type: 'message',
        text: '**Reviewer · Final check** — 14 tests present (100% route coverage). TSDoc on all exports. Error handling complete. `any` types replaced with Zod inferred types. **Verdict: APPROVE** — LGTM. Score: 88/100.',
      },
    },

    /* ── Consensus Round 2 ──────────────────────────────────────────── */
    {
      delayMs: 700,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'vote:tally',
        message: 'Round 2 votes: Architect APPROVE · Coder APPROVE · Security APPROVE · Performance APPROVE · Devil\'s Advocate APPROVE · Reviewer APPROVE',
      },
    },
    {
      delayMs: 500,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'consensus:approve',
        message: '✅ CONSENSUS: APPROVED (score 85/100) — all 6 agents agree. Generating PR summary…',
      },
    },
    {
      delayMs: 800,
      agentId: 'tech-lead',
      body: {
        type: 'notice',
        level: 'info',
        code: 'pr:ready',
        message: 'PR comment generated — ready to post to GitHub. Click "Post to GitHub" in the session panel.',
      },
    },

    /* ── Done ───────────────────────────────────────────────────────── */
    {
      delayMs: 400,
      agentId: 'tech-lead',
      body: {
        type: 'result',
        isError: false,
        subtype: 'consensus_approved',
      },
    },
  ]
}

/* ── Handler registration ───────────────────────────────────────────────── */

export function registerDemoHandlers(_io: SocketIOServer, socket: Socket): void {
  socket.on('demo:run', (payload: unknown) => {
    const prompt =
      typeof payload === 'object' &&
      payload !== null &&
      'prompt' in payload &&
      typeof (payload as Record<string, unknown>).prompt === 'string'
        ? (payload as { prompt: string }).prompt
        : 'Build a user authentication system with JWT tokens and refresh token rotation'

    void runDemo(socket, prompt)
  })
}

async function runDemo(socket: Socket, prompt: string): Promise<void> {
  const executionId = (Date.now() % 9_000_000) + 1_000_000

  socket.emit('command:started', {
    execution_id: executionId,
    command: `ocr review  ·  "${prompt.length > 60 ? prompt.slice(0, 57) + '…' : prompt}"`,
    args: '',
    started_at: new Date().toISOString(),
  })

  const steps = buildScript(prompt)
  let seq = 0

  for (const step of steps) {
    await delay(step.delayMs)

    socket.emit('command:event', {
      executionId,
      agentId: step.agentId,
      seq: seq++,
      timestamp: new Date().toISOString(),
      ...step.body,
    })
  }

  await delay(600)
  socket.emit('command:finished', {
    execution_id: executionId,
    exitCode: 0,
    outcome: 'success',
  })
}
