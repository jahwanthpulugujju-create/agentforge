/**
 * Demo data seed script for Open Code Review dashboard.
 * Run with: node seed-demo.mjs
 */

// Suppress node:sqlite experimental warning
const _origWarn = process.emitWarning.bind(process)
process.emitWarning = (warning, ...args) => {
  const msg = typeof warning === 'string' ? warning : (warning?.message ?? '')
  if (msg.includes('SQLite') || msg.includes('sqlite') || msg.includes('ExperimentalWarning')) return
  _origWarn(warning, ...args)
}

import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ocrDir = join(process.cwd(), '.ocr')
const dataDir = join(ocrDir, 'data')
const dbPath = join(dataDir, 'ocr.db')

if (!existsSync(dbPath)) {
  console.error('Database not found at', dbPath)
  process.exit(1)
}

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode=WAL')
db.exec('PRAGMA foreign_keys=ON')

// ── Helper wrappers ───────────────────────────────────────────────────────────

function run(sql, params) {
  if (params === undefined || params.length === 0) {
    db.exec(sql)
  } else {
    db.prepare(sql).run(...params)
  }
}

function get(sql, params) {
  const stmt = db.prepare(sql)
  if (params && params.length > 0) {
    return stmt.get(...params)
  }
  return stmt.get()
}

function all(sql, params) {
  const stmt = db.prepare(sql)
  if (params && params.length > 0) {
    return stmt.all(...params)
  }
  return stmt.all()
}

// ── Clear existing data ───────────────────────────────────────────────────────

db.exec(`DELETE FROM user_file_progress`)
db.exec(`DELETE FROM user_round_progress`)
db.exec(`DELETE FROM user_finding_progress`)
db.exec(`DELETE FROM user_notes`)
db.exec(`DELETE FROM chat_messages`)
db.exec(`DELETE FROM chat_conversations`)
db.exec(`DELETE FROM markdown_artifacts`)
db.exec(`DELETE FROM review_findings`)
db.exec(`DELETE FROM reviewer_outputs`)
db.exec(`DELETE FROM review_rounds`)
db.exec(`DELETE FROM map_files`)
db.exec(`DELETE FROM map_sections`)
db.exec(`DELETE FROM map_runs`)
db.exec(`DELETE FROM command_executions`)
db.exec(`DELETE FROM orchestration_events`)
db.exec(`DELETE FROM sessions`)
console.log('Cleared existing data')

// ── Session dirs ──────────────────────────────────────────────────────────────

const sessionsDir = join(ocrDir, 'sessions')
mkdirSync(sessionsDir, { recursive: true })

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(ms) {
  return new Date(Date.now() - ms).toISOString()
}
const MIN = 60 * 1000
const HR = 60 * MIN
const DAY = 24 * HR

// ══════════════════════════════════════════════════════════════════════════════
// SESSION 1 — auth refactor — CHANGES REQUESTED (3 days ago)
// ══════════════════════════════════════════════════════════════════════════════

const S1 = 'sess_auth_refactor_001'
const D1 = join(sessionsDir, S1)
mkdirSync(D1, { recursive: true })

run(`INSERT INTO sessions (id,branch,status,workflow_type,current_phase,phase_number,current_round,current_map_run,started_at,updated_at,session_dir) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [S1,'feature/auth-refactor','closed','review','complete',8,1,1,ago(3*DAY),ago(3*DAY-35*MIN),D1])

for (const [type,phase,pnum,round,meta,t] of [
  ['session_created','context',1,null,null,ago(3*DAY)],
  ['phase_transition','change-context',2,null,null,ago(3*DAY-2*MIN)],
  ['phase_transition','analysis',3,null,null,ago(3*DAY-5*MIN)],
  ['phase_transition','reviews',4,null,null,ago(3*DAY-8*MIN)],
  ['round_started','reviews',4,1,JSON.stringify({round:1}),ago(3*DAY-10*MIN)],
  ['phase_transition','aggregation',5,null,null,ago(3*DAY-20*MIN)],
  ['phase_transition','discourse',6,null,null,ago(3*DAY-25*MIN)],
  ['phase_transition','synthesis',7,null,null,ago(3*DAY-30*MIN)],
  ['round_completed','complete',8,1,JSON.stringify({round:1,verdict:'changes_requested',blocker_count:3,suggestion_count:6,should_fix_count:3,reviewer_count:6,total_finding_count:14}),ago(3*DAY-34*MIN)],
  ['session_closed','complete',8,null,null,ago(3*DAY-35*MIN)],
]) {
  run(`INSERT INTO orchestration_events (session_id,event_type,phase,phase_number,round,metadata,created_at) VALUES (?,?,?,?,?,?,?)`,
    [S1,type,phase,pnum,round,meta,t])
}

run(`INSERT INTO review_rounds (session_id,round_number,verdict,blocker_count,suggestion_count,should_fix_count,final_md_path,parsed_at,source,reviewer_count,total_finding_count) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [S1,1,'changes_requested',3,6,3,join(D1,'round-1-final.md'),ago(3*DAY-32*MIN),'orchestrator',6,14])

const rnd1 = get('SELECT id FROM review_rounds WHERE session_id=? AND round_number=1',[S1])

for (const [rtype,cnt] of [['security',3],['architecture',4],['testing',2],['performance',1],['coder',2],['devil_advocate',2]]) {
  run(`INSERT INTO reviewer_outputs (round_id,reviewer_type,instance_number,file_path,finding_count,parsed_at) VALUES (?,?,?,?,?,?)`,
    [rnd1.id,rtype,1,join(D1,`round-1-${rtype}.md`),cnt,ago(3*DAY-28*MIN)])
}

const secO  = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd1.id,'security'])
const archO = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd1.id,'architecture'])
const testO = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd1.id,'testing'])
const perfO = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd1.id,'performance'])
const codeO = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd1.id,'coder'])
const daO   = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd1.id,'devil_advocate'])

const findings1 = [
  [secO.id,'JWT secret exposed in environment config','critical','blocker','src/auth/config.ts',12,14,'The JWT_SECRET is logged at DEBUG level via console.log on line 13. This exposes the secret in log aggregation systems.',1],
  [secO.id,'Password comparison uses string equality instead of bcrypt.compare','high','blocker','src/auth/validators.ts',87,89,'Direct string comparison password === hash is vulnerable to timing attacks. Use bcrypt.compare() which is constant-time.',1],
  [secO.id,'Missing rate limiting on /auth/login endpoint','medium','should_fix','src/auth/routes.ts',23,23,'No rate limiting middleware applied. Brute force attacks are possible.',0],
  [archO.id,'Auth service directly couples to User repository','high','should_fix','src/auth/service.ts',45,80,'AuthService imports UserRepository directly creating tight coupling. Should depend on an IUserRepository interface.',0],
  [archO.id,'Token refresh logic duplicated in 3 places','medium','should_fix','src/auth/middleware.ts',15,42,'refreshAccessToken() is implemented identically in auth middleware, API client, and WebSocket handler. Extract to shared utility.',0],
  [archO.id,'Session store not configurable for production','medium','suggestion','src/auth/session.ts',8,12,'MemoryStore is hardcoded. Production deployments need Redis or database-backed session storage.',0],
  [archO.id,'Missing TypeScript strict null checks on decoded token','low','suggestion','src/auth/middleware.ts',67,71,'decoded?.userId accessed without null guard. jwt.verify() can return string | JwtPayload.',0],
  [testO.id,'No tests for token expiry edge cases','medium','should_fix','tests/auth.test.ts',1,1,'Token refresh on expiry, expired refresh tokens, and clock-skew scenarios are not covered.',0],
  [testO.id,'Auth integration tests missing CSRF protection assertions','low','suggestion','tests/auth.integration.ts',45,60,'CSRF token validation is not asserted in integration tests.',0],
  [perfO.id,'Redundant DB query on every request in auth middleware','low','suggestion','src/auth/middleware.ts',55,65,'User record is fetched from DB on every authenticated request. Consider caching decoded token claims for the request lifetime.',0],
  [codeO.id,'bcrypt rounds set to 10 — should be 12 for production','medium','suggestion','src/auth/validators.ts',15,15,'bcrypt.hash(password, 10) — OWASP recommends minimum 12 rounds for 2024 hardware.',0],
  [codeO.id,'Refresh token not rotated on use','high','should_fix','src/auth/service.ts',112,118,'Refresh tokens are not invalidated after use (no rotation). Stolen token can be replayed indefinitely.',0],
  [daO.id,'Why JWT at all? Session cookies are safer for this use case','medium','suggestion','src/auth/service.ts',1,1,'Stateless JWT requires refresh token infrastructure. For a monolith, server-side sessions with secure cookies eliminate the attack surface entirely.',0],
  [daO.id,'OAuth state parameter not validated on callback','high','blocker','src/auth/oauth.ts',45,52,'The state parameter returned by OAuth providers is not verified against the stored value. This enables CSRF attacks on the OAuth flow.',1],
]
for (const [oid,title,sev,cat,fp,ls,le,summary,isBlk] of findings1) {
  run(`INSERT INTO review_findings (reviewer_output_id,title,severity,category,file_path,line_start,line_end,summary,is_blocker,parsed_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [oid,title,sev,cat,fp,ls,le,summary,isBlk,ago(3*DAY-30*MIN)])
}

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S1,'context',null,join(D1,'context.md'),`# Context Discovery

## Project Overview
Open Code Review — AI-powered multi-agent code review system.
Tech stack: TypeScript, React, Node.js, Express, SQLite

## Branch: feature/auth-refactor
**Changed files:** 12 files across src/auth/
**Lines changed:** +847 / -312

## Change Summary
This branch refactors the authentication system to support multiple OAuth providers
(GitHub, Google) alongside the existing username/password flow. Key changes:

- New OAuth provider abstraction layer
- JWT token rotation with refresh token support  
- Session management overhaul using connect-pg-simple
- Password hashing migration from MD5 to bcrypt

## Tech Lead Assessment
The authentication refactor addresses legitimate technical debt. The original MD5 hashing
is a critical security issue. However, the implementation introduces new risks that must
be addressed before merging.
`,ago(3*DAY-8*MIN)])

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S1,'discourse',null,join(D1,'discourse.md'),`# ⚔️ War Room — Agent Debate

## Round 1 · feature/auth-refactor

---

### CHALLENGE — Devil's Advocate

Hold on. Before we rubber-stamp this refactor, I'm questioning the fundamental approach. The PR description says "migrate to JWT for stateless auth" — but **why JWT?** This is a monolith running on a single server. We're adding refresh token rotation complexity, signing key management, and a whole new attack surface, when secure HttpOnly session cookies would eliminate all of it. I need Architect to justify this decision before we proceed.

---

### SURFACE — Security

I'll answer that while Architect considers it: **it doesn't matter right now because we have two critical regressions that must block merge regardless of the JWT debate.**

Finding 1: \`src/auth/config.ts:13\` — the JWT secret is being logged via \`console.log(config)\`. This writes the signing key to every log aggregator the team has.

Finding 2: \`src/auth/validators.ts:87-89\` — password comparison is \`password === user.passwordHash\`. A bcrypt hash is one-way. This **always returns false**. Password auth is completely broken in this PR.

Vote: **REJECT** — both are critical security regressions.

---

### CHALLENGE — Devil's Advocate

AGREE with Security on the blockers — those are fatal. I'll add one more: \`src/auth/oauth.ts:45-52\` — the OAuth callback does not validate the \`state\` parameter against what was stored pre-redirect. This is a textbook CSRF vector on the OAuth flow. That's a third blocker.

My original question about JWT vs sessions still stands, but it's secondary to shipping broken auth.

---

### CONNECT — Coder

I wrote this code. The session store approach was rejected in the planning doc (week 3) because we're moving toward a distributed deployment — the product roadmap has horizontal scaling in Q3. That's why JWT. I'll own the bugs Security and Devil's Advocate flagged — the string comparison was a copy-paste error from the old code I forgot to update, and the config logging was debug code I left in.

Two questions: should I fix these in this PR or open a hotfix branch?

---

### SURFACE — Architect

Fix in this PR — we haven't merged yet, no need for a separate branch. The JWT choice is correct given the roadmap. For the deployment concerns Devil's Advocate raised: I flagged that \`AuthService\` directly instantiates \`UserRepository\` — this violates dependency inversion and makes the service untestable. The coupling is blocking Testing from writing unit tests.

---

### AGREE — Testing

Confirming Architect's analysis. I cannot mock the repository without refactoring the service first. The test gaps aren't laziness — the architecture prevents isolation. I've flagged: no tests for token expiry, clock skew, or refresh token rotation. Coder also hasn't implemented refresh token rotation, which means stolen tokens are replayable indefinitely.

---

### CONNECT — Performance

I'll keep this brief: the auth middleware fetches a full user row on every authenticated request even though the JWT already contains \`userId\` and \`roles\`. That's an unnecessary round-trip per API call. Not a blocker — but at scale this adds up fast. bcrypt rounds are set to 10; OWASP 2024 minimum is 12.

---

### CHALLENGE — Devil's Advocate

Final position: I'm voting REJECT on the current state, but I want to be clear this PR has good bones. Coder's instinct on distributed deployment is correct. The blockers are fixable in a day. My recommendation: fix the 3 blockers (JWT logging, bcrypt comparison, OAuth state), add rate limiting, rotate refresh tokens — then I'll flip to APPROVE.

---

### AGREE — Architect

Consensus reached. The blockers are clear and actionable. Coder knows what to fix. Architecture concerns (dependency inversion, refresh duplication) can land in the same PR — they're straightforward refactors while you're already in the code.

**VERDICT: REQUEST CHANGES — 3 blockers, fix within 24h, re-review.**

---

## 🗳️ Agent Vote Tally

| Agent | Vote | Reason |
|-------|------|--------|
| Security | ❌ REJECT | 2 critical security blockers |
| Devil's Advocate | ❌ REJECT | OAuth CSRF blocker + JWT design concerns |
| Architect | ⚠️ APPROVE WITH CHANGES | Blocking architectural issues |
| Coder | ⚠️ APPROVE WITH CHANGES | Owns the fixes, will resolve today |
| Testing | ⚠️ APPROVE WITH CHANGES | Needs coupling fix before tests possible |
| Performance | ✅ APPROVE | Minor suggestions only |

**Result: 2 REJECT → REQUEST CHANGES required**
`,ago(3*DAY-31*MIN)])

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S1,'final',null,join(D1,'round-1-final.md'),`# Review Round 1 — Verdict: REQUEST CHANGES

**Branch:** feature/auth-refactor  
**Reviewers:** Security, Architecture, Testing, Performance  
**Findings:** 2 Blockers · 3 Should Fix · 5 Suggestions

---

## 🚫 Blockers (Must Fix Before Merge)

### 1. JWT Secret Exposed in Logs
**File:** \`src/auth/config.ts:13\`  **Severity:** Critical

\`\`\`typescript
// BAD — exposes JWT_SECRET in log output
console.log('Auth config loaded:', JSON.stringify(config))

// FIX — redact sensitive fields
const safeConfig = { ...config, jwtSecret: '[REDACTED]' }
console.log('Auth config loaded:', JSON.stringify(safeConfig))
\`\`\`

### 2. Broken Password Comparison
**File:** \`src/auth/validators.ts:87-89\`  **Severity:** High

\`\`\`typescript
// WRONG — string equality on bcrypt hash always returns false
if (password === user.passwordHash) { ... }

// CORRECT — constant-time comparison
if (await bcrypt.compare(password, user.passwordHash)) { ... }
\`\`\`

---

## ⚠️ Should Fix

- **Missing rate limiting** on \`/auth/login\` — brute force attacks are possible
- **Auth service coupling** — inject \`IUserRepository\` interface to enable testing
- **No tests for token expiry** — add expiry/refresh/clock-skew test cases

---

## 💡 Suggestions

- Session store is hardcoded to MemoryStore (not suitable for production)
- Add TypeScript strict null checks on decoded JWT payload
- Cache decoded token claims to avoid redundant DB queries per request
- Add CSRF assertions to integration test suite

---

## Summary

Two critical security regressions prevent this from merging. The JWT secret
exposure and broken password comparison are both introduced by this PR.
Fix these, add rate limiting, and the auth refactor is otherwise well-structured.
`,ago(3*DAY-32*MIN)])

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S1,'final-human',null,join(D1,'round-1-final-human.md'),`# Auth Refactor Review

Hey team — just wrapped the security pass on the auth refactor. Good news: the architecture is solid and the move to bcrypt is the right call. Bad news: we introduced two security regressions we need to fix before this ships.

**Critical:** Line 13 in config.ts dumps the entire config object to logs, including the JWT secret. This needs to go before anything else.

**Critical:** The password comparison in validators.ts compares the raw input against the bcrypt hash as a string. Bcrypt hashes are one-way — this will always return false, meaning password auth is completely broken. Use \`bcrypt.compare()\`.

Beyond the blockers, the architecture team flagged that the service directly newing up the repository makes it untestable. Worth addressing in this PR since we're already in here.

Rate limiting on the login endpoint is a quick win — express-rate-limit, 5 attempts per minute, done.

Overall: great direction, two critical fixes needed. Let's get this right. 🔐
`,ago(3*DAY-32*MIN)])

run(`INSERT INTO user_round_progress (round_id,status,updated_at) VALUES (?,?,?)`,[rnd1.id,'in_progress',ago(2*DAY)])

// triage some findings
const findings1Rows = all(`SELECT rf.id FROM review_findings rf JOIN reviewer_outputs ro ON rf.reviewer_output_id=ro.id WHERE ro.round_id=?`,[rnd1.id])
for (const [i, row] of findings1Rows.entries()) {
  const status = i < 2 ? 'read' : 'unread'
  run(`INSERT OR IGNORE INTO user_finding_progress (finding_id,status,updated_at) VALUES (?,?,?)`,[row.id,status,ago(2*DAY)])
}

console.log('✓ Session 1: auth-refactor (changes requested, 3 blockers, 6 agents)')

// ══════════════════════════════════════════════════════════════════════════════
// SESSION 2 — api-pagination — APPROVED (1 day ago)
// ══════════════════════════════════════════════════════════════════════════════

const S2 = 'sess_api_pagination_002'
const D2 = join(sessionsDir, S2)
mkdirSync(D2, { recursive: true })

run(`INSERT INTO sessions (id,branch,status,workflow_type,current_phase,phase_number,current_round,current_map_run,started_at,updated_at,session_dir) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [S2,'feature/api-pagination','closed','review','complete',8,1,1,ago(1*DAY),ago(1*DAY-28*MIN),D2])

for (const [type,phase,pnum,round,meta,t] of [
  ['session_created','context',1,null,null,ago(1*DAY)],
  ['phase_transition','analysis',3,null,null,ago(1*DAY-6*MIN)],
  ['phase_transition','reviews',4,null,null,ago(1*DAY-10*MIN)],
  ['round_started','reviews',4,1,JSON.stringify({round:1}),ago(1*DAY-12*MIN)],
  ['phase_transition','discourse',6,null,null,ago(1*DAY-18*MIN)],
  ['phase_transition','synthesis',7,null,null,ago(1*DAY-22*MIN)],
  ['round_completed','complete',8,1,JSON.stringify({round:1,verdict:'approved',blocker_count:0,suggestion_count:3,should_fix_count:1,reviewer_count:3,total_finding_count:4}),ago(1*DAY-27*MIN)],
  ['session_closed','complete',8,null,null,ago(1*DAY-28*MIN)],
]) {
  run(`INSERT INTO orchestration_events (session_id,event_type,phase,phase_number,round,metadata,created_at) VALUES (?,?,?,?,?,?,?)`,
    [S2,type,phase,pnum,round,meta,t])
}

run(`INSERT INTO review_rounds (session_id,round_number,verdict,blocker_count,suggestion_count,should_fix_count,final_md_path,parsed_at,source,reviewer_count,total_finding_count) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [S2,1,'approved',0,3,1,join(D2,'round-1-final.md'),ago(1*DAY-25*MIN),'orchestrator',3,4])

const rnd2 = get('SELECT id FROM review_rounds WHERE session_id=? AND round_number=1',[S2])

for (const [rtype,cnt] of [['architecture',2],['performance',1],['testing',1]]) {
  run(`INSERT INTO reviewer_outputs (round_id,reviewer_type,instance_number,file_path,finding_count,parsed_at) VALUES (?,?,?,?,?,?)`,
    [rnd2.id,rtype,1,join(D2,`round-1-${rtype}.md`),cnt,ago(1*DAY-22*MIN)])
}

const archO2 = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd2.id,'architecture'])
const perfO2 = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd2.id,'performance'])
const testO2 = get('SELECT id FROM reviewer_outputs WHERE round_id=? AND reviewer_type=?',[rnd2.id,'testing'])

for (const [oid,title,sev,cat,fp,ls,le,summary,isBlk] of [
  [archO2.id,'Cursor tokens should be opaque (base64-encoded) not raw IDs','medium','should_fix','src/api/pagination.ts',34,48,'Exposing raw database IDs as cursors leaks internal implementation details. Base64-encode the cursor payload.',0],
  [archO2.id,'Missing composite index on (created_at, id) for cursor queries','medium','suggestion','migrations/004_add_indexes.sql',1,1,'Cursor pagination on created_at requires a composite index with id for tie-breaking. Without it, large offsets will cause full table scans.',0],
  [perfO2.id,'Default page size of 100 too large for mobile clients','low','suggestion','src/api/pagination.ts',12,12,'Consider a lower default (20-25) with a max cap of 100. Large payloads hurt mobile performance.',0],
  [testO2.id,'No test for last-page boundary condition','low','suggestion','tests/pagination.test.ts',1,1,'The edge case where a cursor points to the last item returns an empty next page — this should be explicitly tested.',0],
]) {
  run(`INSERT INTO review_findings (reviewer_output_id,title,severity,category,file_path,line_start,line_end,summary,is_blocker,parsed_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [oid,title,sev,cat,fp,ls,le,summary,isBlk,ago(1*DAY-23*MIN)])
}

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S2,'discourse',null,join(D2,'discourse.md'),`# Reviewer Discourse

<!-- reviewer:architecture -->
## Architecture Reviewer

Solid implementation overall. Cursor-based pagination is the right choice for large datasets. Two notes: the cursor should be opaque (base64 encoded) rather than exposing raw database IDs, and you'll want a composite index on (created_at, id) for the tie-breaking case when multiple records share the same timestamp.

<!-- reviewer:performance -->
## Performance Reviewer

AGREE with Architecture on the index requirement — without it, every paginated query after page 1 becomes a full table scan on large tables. The default page size of 100 is also worth revisiting for mobile clients.

<!-- reviewer:testing -->
## Testing Reviewer

CONNECT to Architecture: the opaque cursor point is well-covered once you switch the encoding. The missing test is the last-page boundary — when there are exactly N items and the cursor lands on item N, the response should return an empty \`next\` cursor, not null. Subtle but important.

<!-- reviewer:architecture -->
## Architecture Reviewer

AGREE with Testing on the boundary case. Other than these minor points, this is well-structured. The interface is clean and the implementation is consistent. These are improvements, not blockers.
`,ago(1*DAY-24*MIN)])

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S2,'final',null,join(D2,'round-1-final.md'),`# Review Round 1 — Verdict: APPROVED ✓

**Branch:** feature/api-pagination  
**Reviewers:** Architecture, Performance, Testing  
**Findings:** 0 Blockers · 1 Should Fix · 3 Suggestions

---

## ✅ Approved — Ready to Merge

This is a clean, well-implemented cursor pagination system. The decision to use cursor-based over offset-based pagination is appropriate for the dataset sizes involved. No blockers found.

## Suggestions Before Next Similar PR

- **Opaque cursors**: Base64-encode the cursor payload to hide internal IDs
- **Composite index**: Add \`(created_at, id)\` index in the migration for reliable ordering  
- **Page size default**: Consider lowering from 100 to 25 for better mobile performance
- **Boundary test**: Add coverage for the empty last-page cursor case

Approved to merge. Suggestions can be addressed as a follow-up.
`,ago(1*DAY-25*MIN)])

run(`INSERT INTO user_round_progress (round_id,status,updated_at) VALUES (?,?,?)`,[rnd2.id,'acknowledged',ago(20*HR)])

const findings2Rows = all(`SELECT rf.id FROM review_findings rf JOIN reviewer_outputs ro ON rf.reviewer_output_id=ro.id WHERE ro.round_id=?`,[rnd2.id])
for (const row of findings2Rows) {
  run(`INSERT OR IGNORE INTO user_finding_progress (finding_id,status,updated_at) VALUES (?,?,?)`,[row.id,'acknowledged',ago(18*HR)])
}

console.log('✓ Session 2: api-pagination (approved, 4 suggestions)')

// ══════════════════════════════════════════════════════════════════════════════
// SESSION 3 — core-engine-v2 — MAP (6 hours ago, completed)
// ══════════════════════════════════════════════════════════════════════════════

const S3 = 'sess_core_rewrite_003'
const D3 = join(sessionsDir, S3)
mkdirSync(D3, { recursive: true })

run(`INSERT INTO sessions (id,branch,status,workflow_type,current_phase,phase_number,current_round,current_map_run,started_at,updated_at,session_dir) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [S3,'refactor/core-engine-v2','closed','map','complete',6,1,1,ago(8*HR),ago(6*HR),D3])

for (const [type,phase,pnum,meta,t] of [
  ['session_created','map-context',1,null,ago(8*HR)],
  ['phase_transition','topology',2,null,ago(7*HR+45*MIN)],
  ['phase_transition','flow-analysis',3,null,ago(7*HR+20*MIN)],
  ['phase_transition','requirements-mapping',4,null,ago(7*HR)],
  ['phase_transition','synthesis',5,null,ago(6*HR+30*MIN)],
  ['map_completed','complete',6,JSON.stringify({run:1,file_count:47,section_count:5}),ago(6*HR)],
  ['session_closed','complete',6,null,ago(6*HR-2*MIN)],
]) {
  run(`INSERT INTO orchestration_events (session_id,event_type,phase,phase_number,round,metadata,created_at) VALUES (?,?,?,?,?,?,?)`,
    [S3,type,phase,pnum,null,meta,t])
}

run(`INSERT INTO map_runs (session_id,run_number,file_count,map_md_path,parsed_at,source,section_count) VALUES (?,?,?,?,?,?,?)`,
  [S3,1,47,join(D3,'map.md'),ago(6*HR),'orchestrator',5])

const mapRun = get('SELECT id FROM map_runs WHERE session_id=? AND run_number=1',[S3])

for (const [secNum,title,desc,fc] of [
  [1,'Core Engine & Pipeline','The central orchestration pipeline: phase runner, state transitions, and agent worker scheduling.',11],
  [2,'Agent Communication Layer','Inter-agent discourse protocol, finding aggregation, and multi-reviewer coordination.',9],
  [3,'Persistence & State','SQLite adapter (node:sqlite), migration runner, and session state machine.',8],
  [4,'CLI & Entry Points','Command-line interface, subcommand routing, ocr init / ocr review / ocr dashboard commands.',10],
  [5,'Dashboard & API','Express server, REST endpoints, Socket.IO real-time events, and the React frontend.',9],
]) {
  run(`INSERT INTO map_sections (map_run_id,section_number,title,description,file_count,display_order) VALUES (?,?,?,?,?,?)`,
    [mapRun.id,secNum,title,desc,fc,secNum])
}

const [ms1,ms2,ms3,ms4,ms5] = [1,2,3,4,5].map(n => get('SELECT id FROM map_sections WHERE map_run_id=? AND section_number=?',[mapRun.id,n]))

for (const [sid,fp,role,added,deleted,ord] of [
  [ms1.id,'packages/shared/platform/src/pipeline/engine.ts','Core orchestration engine — phase runner and state machine',312,89,0],
  [ms1.id,'packages/shared/platform/src/pipeline/phases.ts','Phase definitions and transition guards',145,12,1],
  [ms1.id,'packages/shared/platform/src/pipeline/scheduler.ts','Agent worker pool and task scheduling',98,34,2],
  [ms1.id,'packages/shared/platform/src/pipeline/context.ts','Review context builder — git diff, project metadata',203,67,3],
  [ms2.id,'packages/shared/platform/src/agents/coordinator.ts','Discourse coordinator — manages reviewer turn-taking',167,45,0],
  [ms2.id,'packages/shared/platform/src/agents/aggregator.ts','Finding aggregation and deduplication logic',134,28,1],
  [ms2.id,'packages/shared/platform/src/agents/base-agent.ts','Abstract base class for all reviewer agents',89,15,2],
  [ms3.id,'packages/shared/persistence/src/db/engine.ts','SQLite adapter using node:sqlite',267,12,0],
  [ms3.id,'packages/shared/persistence/src/db/migrations.ts','Schema migration runner — 14 migrations',445,189,1],
  [ms3.id,'packages/shared/persistence/src/db/queries.ts','All SQL query functions — ~80 helpers',398,134,2],
  [ms4.id,'packages/cli/src/index.ts','CLI entry point — Commander.js routing',78,12,0],
  [ms4.id,'packages/cli/src/commands/review.ts','ocr review — triggers the full review pipeline',156,45,1],
  [ms4.id,'packages/cli/src/commands/init.ts','ocr init — scaffolds .ocr/ directory',89,8,2],
  [ms5.id,'packages/dashboard/src/server/index.ts','Dashboard Express server entry point',89,12,0],
  [ms5.id,'packages/dashboard/src/server/routes/sessions.ts','Session CRUD with workflow enrichment',156,34,1],
]) {
  run(`INSERT INTO map_files (section_id,file_path,role,lines_added,lines_deleted,display_order) VALUES (?,?,?,?,?,?)`,
    [sid,fp,role,added,deleted,ord])
}

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S3,'map',null,join(D3,'map.md'),`# Code Review Map — refactor/core-engine-v2

**47 changed files** across 5 logical sections.
Review sections in order — each builds on the previous.

---

## Section 1: Core Engine & Pipeline
*Start here — this is the heart of the change.*

The orchestration engine was rewritten from a callback-based model to a promise-chain
with explicit phase gates. Each phase returns a typed \`PhaseResult\` that the scheduler
uses to decide whether to proceed, retry, or abort.

\`\`\`mermaid
graph TD
  A[engine.ts] --> B[phases.ts]
  A --> C[scheduler.ts]
  A --> D[context.ts]
  B -->|PhaseResult| A
  C -->|WorkerPool| A
  D -->|ReviewContext| A
\`\`\`

**Review order:**
1. \`engine.ts\` — primary orchestrator, all phase transitions happen here
2. \`phases.ts\` — defines exit criteria for each phase
3. \`scheduler.ts\` — worker pool, concurrency limits, heartbeat tracking

---

## Section 2: Agent Communication Layer

The discourse protocol is entirely new. Agents now exchange structured messages
(AGREE / CHALLENGE / CONNECT) in a supervised round before the aggregator runs.

\`\`\`mermaid
graph LR
  C[coordinator.ts] -->|dispatch| A1[Reviewer A]
  C -->|dispatch| A2[Reviewer B]
  C -->|dispatch| A3[Reviewer C]
  A1 -->|DiscourseMsg| C
  A2 -->|DiscourseMsg| C
  A3 -->|DiscourseMsg| C
  C -->|findings| AGG[aggregator.ts]
\`\`\`

---

## Section 3: Persistence & State

Migration from better-sqlite3 to node:sqlite (Node.js 22 built-in). The API surface
is nearly identical but engine initialization is now async. Start with \`engine.ts\`
to understand the adapter, then \`migrations.ts\` for schema history.

---

## Section 4: CLI & Entry Points

Minimal changes. \`ocr review\` now accepts \`--round\` to re-run a specific phase
without restarting the full session.

---

## Section 5: Dashboard & API

Dashboard updated to display discourse transcripts and the new 8-phase timeline.
Socket.IO events added for live phase transition updates.
`,ago(6*HR)])

// mark 2 files as reviewed
const mfEngine = get(`SELECT mf.id FROM map_files mf JOIN map_sections ms ON mf.section_id=ms.id WHERE ms.map_run_id=? AND mf.file_path=?`,[mapRun.id,'packages/shared/platform/src/pipeline/engine.ts'])
const mfPhases = get(`SELECT mf.id FROM map_files mf JOIN map_sections ms ON mf.section_id=ms.id WHERE ms.map_run_id=? AND mf.file_path=?`,[mapRun.id,'packages/shared/platform/src/pipeline/phases.ts'])
if (mfEngine) run(`INSERT OR IGNORE INTO user_file_progress (map_file_id,is_reviewed,reviewed_at) VALUES (?,?,?)`,[mfEngine.id,1,ago(5*HR)])
if (mfPhases) run(`INSERT OR IGNORE INTO user_file_progress (map_file_id,is_reviewed,reviewed_at) VALUES (?,?,?)`,[mfPhases.id,1,ago(5*HR-10*MIN)])

run(`INSERT INTO user_notes (target_type,target_id,content,created_at,updated_at) VALUES (?,?,?,?,?)`,
  ['session',S3,'Great map — used this to orient the team before the review sprint. Sections 1-2 are the most critical.',ago(5*HR),ago(5*HR)])

console.log('✓ Session 3: core-engine-v2 map (completed, 47 files, 5 sections)')

// ══════════════════════════════════════════════════════════════════════════════
// SESSION 4 — dashboard-realtime — ACTIVE (18 mins ago, in reviews phase)
// ══════════════════════════════════════════════════════════════════════════════

const S4 = 'sess_dashboard_rt_004'
const D4 = join(sessionsDir, S4)
mkdirSync(D4, { recursive: true })

run(`INSERT INTO sessions (id,branch,status,workflow_type,current_phase,phase_number,current_round,current_map_run,started_at,updated_at,session_dir) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  [S4,'feat/dashboard-realtime','active','review','reviews',4,1,1,ago(18*MIN),ago(3*MIN),D4])

for (const [type,phase,pnum,round,meta,t] of [
  ['session_created','context',1,null,null,ago(18*MIN)],
  ['phase_transition','change-context',2,null,null,ago(14*MIN)],
  ['phase_transition','analysis',3,null,null,ago(10*MIN)],
  ['phase_transition','reviews',4,null,null,ago(5*MIN)],
  ['round_started','reviews',4,1,JSON.stringify({round:1}),ago(3*MIN)],
]) {
  run(`INSERT INTO orchestration_events (session_id,event_type,phase,phase_number,round,metadata,created_at) VALUES (?,?,?,?,?,?,?)`,
    [S4,type,phase,pnum,round,meta,t])
}

run(`INSERT INTO markdown_artifacts (session_id,artifact_type,round_number,file_path,content,parsed_at) VALUES (?,?,?,?,?,?)`,
  [S4,'context',null,join(D4,'context.md'),`# Context Discovery

## Branch: feat/dashboard-realtime
**Changed files:** 8 files across packages/dashboard/
**Lines changed:** +423 / -187

## Change Summary
Adds real-time updates to the dashboard via Socket.IO. When a review is
running, the dashboard now shows live phase transitions, agent heartbeats,
and streaming finding counts without a page refresh.

## Key Changes
- New Socket.IO event handlers for phase transitions
- React hooks for real-time session state (useSocketEvent)
- Live progress indicator components  
- WebSocket authentication token validation

## Tech Lead Assessment
The real-time additions are well-scoped. Main risk area: WebSocket authentication —
ensure the same auth checks applied to REST endpoints are applied to socket connections.
`,ago(8*MIN)])

for (const [uid,persona,name,model,hb] of [
  ['cmd-active-001','security','Security Reviewer','claude-opus-4-5',ago(25)],
  ['cmd-active-002','architect','Architect','claude-sonnet-4-5',ago(40)],
  ['cmd-active-003','coder','Coder','claude-sonnet-4-5',ago(18)],
  ['cmd-active-004','performance','Performance Reviewer','claude-haiku-4-5',ago(55)],
  ['cmd-active-005','devil_advocate','Devil\'s Advocate','claude-opus-4-5',ago(8)],
  ['cmd-active-006','testing','Testing Reviewer','claude-haiku-4-5',ago(32)],
]) {
  run(`INSERT INTO command_executions (uid,command,args,exit_code,pid,is_detached,started_at,finished_at,workflow_id,vendor,persona,instance_index,name,resolved_model,last_heartbeat_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [uid,'claude',JSON.stringify(['--no-color','--persona',persona]),null,null,1,ago(3*MIN),null,S4,'claude',persona,1,name,model,hb])
}

console.log('✓ Session 4: dashboard-realtime (active, reviews phase, 6 agents running)')

// ── Historic command executions ───────────────────────────────────────────────

for (const [uid,sid,vendor,persona,idx,name,model,started,finished] of [
  ['cmd-hist-001',S1,'claude','security',1,'Security Reviewer','claude-opus-4-5',ago(3*DAY-10*MIN),ago(3*DAY-16*MIN)],
  ['cmd-hist-002',S1,'claude','architect',1,'Architect','claude-sonnet-4-5',ago(3*DAY-10*MIN),ago(3*DAY-17*MIN)],
  ['cmd-hist-003',S1,'claude','testing',1,'Testing Reviewer','claude-haiku-4-5',ago(3*DAY-10*MIN),ago(3*DAY-14*MIN)],
  ['cmd-hist-004',S1,'claude','performance',1,'Performance Reviewer','claude-haiku-4-5',ago(3*DAY-10*MIN),ago(3*DAY-13*MIN)],
  ['cmd-hist-008',S1,'claude','coder',1,'Coder','claude-sonnet-4-5',ago(3*DAY-10*MIN),ago(3*DAY-15*MIN)],
  ['cmd-hist-009',S1,'claude','devil_advocate',1,'Devil\'s Advocate','claude-opus-4-5',ago(3*DAY-10*MIN),ago(3*DAY-18*MIN)],
  ['cmd-hist-005',S2,'claude','architecture',1,'Architecture Reviewer','claude-sonnet-4-5',ago(1*DAY-12*MIN),ago(1*DAY-18*MIN)],
  ['cmd-hist-006',S2,'claude','performance',1,'Performance Reviewer','claude-haiku-4-5',ago(1*DAY-12*MIN),ago(1*DAY-16*MIN)],
  ['cmd-hist-007',S2,'claude','testing',1,'Testing Reviewer','claude-haiku-4-5',ago(1*DAY-12*MIN),ago(1*DAY-15*MIN)],
]) {
  run(`INSERT OR IGNORE INTO command_executions (uid,command,args,exit_code,pid,is_detached,started_at,finished_at,workflow_id,vendor,persona,instance_index,name,resolved_model) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [uid,'claude',JSON.stringify(['--no-color']),0,null,1,started,finished,sid,vendor,persona,idx,name,model])
}

run(`INSERT INTO user_notes (target_type,target_id,content,created_at,updated_at) VALUES (?,?,?,?,?)`,
  ['session',S1,'Both blockers are in the new validators.ts — Spencer is fixing before EOD.',ago(2*DAY),ago(2*DAY)])

console.log('✓ Historic command executions added')
console.log('\n✅ Demo data seeded successfully!')
console.log('   Sessions:  4 (3 closed, 1 active)')
console.log('   Reviews:   2 rounds (1 changes requested w/ 3 blockers, 6 agents, 1 approved)')
console.log('   Map:       1 run — 5 sections, 15 files, Mermaid diagrams')
console.log('   Findings:  14 total (2 critical blockers)')
console.log('   Agents:    6 currently "running" on session 4')

db.close()
