---
name: Production stack additions
description: Summary of production-ready features added on top of the local-first OCR tool
---

## New infrastructure (packages/dashboard/src/server/)

### Database
- `db-postgres.ts` — pg.Pool, AES-256-CBC encrypted API key storage, schema migrations
- Schema: users, user_sessions, user_api_keys, review_jobs, review_findings_pg, job_events, audit_log, organizations, org_members

### Auth
- `config/env.ts` — centralized env config (JWT_SECRET, ENCRYPTION_KEY, ANTHROPIC_API_KEY, etc.)
- `middleware/auth.ts` — JWT access + refresh tokens (HS256, 7d/30d expiry)
- `routes/auth.ts` — register, login, refresh, logout, /me

### AI API (direct SDK, no CLI subprocess)
- `services/ai-api/anthropic-direct.ts` — Anthropic SDK streaming, 4 agents + synthesis
- `services/ai-api/openai-direct.ts` — OpenAI SDK streaming, same pipeline
- `services/ai-api/index.ts` — resolves user key → system key → error

### Job Queue
- `services/queue/review-queue.ts` — PostgreSQL advisory locks (FOR UPDATE SKIP LOCKED), pg-backed, no Redis required
- `routes/jobs.ts` — submit, list, status, cancel, findings

### WebSocket
- `socket/presence.ts` — user rooms, session viewers, job subscriptions, reconnect-safe

## New client pages
- `features/auth/login-page.tsx`, `register-page.tsx`
- `features/settings/api-keys-page.tsx` — add/test/delete AI keys
- `features/jobs/review-jobs-page.tsx` — submit diffs, track multi-agent review progress

## Deployment
- `Dockerfile` — multi-stage Node 22 alpine build
- `docker-compose.yml` — app + postgres + redis
- `.env.example` — full env template

**Why:** Transform local CLI tool into production multi-tenant SaaS with per-user isolation.
