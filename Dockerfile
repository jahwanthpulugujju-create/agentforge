FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/dashboard/package.json ./packages/dashboard/
COPY packages/shared/package.json ./packages/shared/
COPY packages/cli/package.json ./packages/cli/
COPY packages/agents/package.json ./packages/agents/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @open-code-review/dashboard build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 ocr && adduser --system --uid 1001 ocr

COPY --from=build --chown=ocr:ocr /app/packages/dashboard/dist ./packages/dashboard/dist
COPY --from=build --chown=ocr:ocr /app/packages/dashboard/package.json ./packages/dashboard/package.json
COPY --from=build --chown=ocr:ocr /app/packages/shared ./packages/shared
COPY --from=build --chown=ocr:ocr /app/node_modules ./node_modules
COPY --from=build --chown=ocr:ocr /app/package.json ./package.json

USER ocr
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "packages/dashboard/dist/server.js"]
