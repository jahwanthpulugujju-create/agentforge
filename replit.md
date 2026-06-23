# Open Code Review — Production

AI-powered multi-agent code review platform. Runs a team of specialized AI agents (Tech Lead, Security Engineer, Performance Engineer, etc.) that independently review code diffs, debate findings, and synthesize a prioritized final report.

## Architecture

**Monorepo** managed by Nx + pnpm:

- `packages/dashboard` — Express + Socket.IO server, React SPA (Vite)
- `packages/shared/persistence` — SQLite schema + migrations (local/CLI mode)
- `packages/cli` — `ocr` CLI entry point
- `packages/agents` — Agent instruction sets and personas

**Production additions** (in `packages/dashboard/src/server`):

- `db-postgres.ts` — PostgreSQL connection pool + schema migrations (users, jobs, findings)
- `middleware/auth.ts` — JWT access + refresh tokens
- `routes/auth.ts` — Register, login, logout, /me
- `routes/api-keys.ts` — Store/manage user's Anthropic/OpenAI keys (AES-256 encrypted)
- `routes/jobs.ts` — Submit and track review jobs
- `services/ai-api/` — Direct Anthropic SDK + OpenAI SDK adapters (no CLI subprocess)
- `services/queue/review-queue.ts` — PostgreSQL-backed job queue with pg advisory locks
- `socket/presence.ts` — WebSocket presence tracking + per-job streaming

## Run & Deploy

```bash
# Dev
cd packages/dashboard && pnpm dev

# Production build
pnpm build

# Docker
docker compose up -d
```

## Key Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 256-bit secret for JWT signing |
| `ENCRYPTION_KEY` | Yes | 32-char key for API key encryption |
| `ANTHROPIC_API_KEY` | No | System-level Anthropic key (fallback) |
| `OPENAI_API_KEY` | No | System-level OpenAI key (fallback) |
| `REDIS_URL` | No | Enables BullMQ queues (otherwise PG-backed) |

See `.env.example` for the full list.

## API Overview

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/health` | Public | Liveness + readiness check |
| `POST /api/auth/register` | Public | Create account |
| `POST /api/auth/login` | Public | Get JWT pair |
| `POST /api/auth/refresh` | Public | Refresh access token |
| `GET /api/auth/me` | JWT | Current user profile |
| `GET /api/keys` | JWT | List user's API keys |
| `POST /api/keys` | JWT | Add API key |
| `POST /api/jobs` | JWT | Submit review job |
| `GET /api/jobs` | JWT | List jobs |
| `GET /api/jobs/:id` | JWT | Job status + result |
| `GET /api/jobs/:id/findings` | JWT | Review findings |

## User preferences

- Use TypeScript strict mode throughout
- Prefer async/await over callbacks
- All new routes require explicit auth middleware
- Never store plaintext API keys — always AES-256 encrypt
