## Base layer: install shared dependencies once (leverages Docker layer caching)
FROM node:25-alpine AS base
RUN apk add --no-cache python3 make g++ wget \
    && npm install -g pnpm
WORKDIR /app

# Copy only dependency manifests to maximize cache hits
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

## Workspace stage: add the full source tree (filtered by .dockerignore)
FROM base AS workspace
COPY . .

## Build shared package once and reuse its artifacts everywhere else
FROM workspace AS shared-builder
RUN pnpm --filter @bluelight-hub/shared build

## Frontend build (inherits compiled shared package)
FROM shared-builder AS frontend-builder
ENV NODE_ENV=production
ENV SKIP_TESTS=true
RUN pnpm --filter @bluelight-hub/frontend build

## Backend build (also reuses shared build artifacts)
FROM shared-builder AS backend-builder
RUN pnpm --filter @bluelight-hub/backend build

## Production dependencies: generate Prisma client, then prune dev deps
FROM base AS prod-deps
COPY packages/backend/prisma ./packages/backend/prisma
RUN cd packages/backend && pnpm exec prisma generate
RUN CI=true pnpm prune --prod

## Production image: minimal runtime with pre-built artifacts only
FROM node:25-alpine AS production
RUN apk add --no-cache python3 make g++ wget
WORKDIR /app

# Production node_modules (Prisma client generated, dev deps removed)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./
COPY --from=prod-deps /app/pnpm-lock.yaml ./
COPY --from=prod-deps /app/pnpm-workspace.yaml ./
COPY --from=prod-deps /app/packages/backend/package.json ./packages/backend/
COPY --from=prod-deps /app/packages/shared/package.json ./packages/shared/

# Copy build outputs and runtime assets
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/client ./packages/shared/client
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=backend-builder /app/packages/backend/src/generated ./packages/backend/src/generated
COPY --from=backend-builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=backend-builder /app/packages/backend/.config ./packages/backend/.config
COPY --from=frontend-builder /app/packages/frontend/dist ./public

ENV NODE_ENV=production
WORKDIR /app/packages/backend

# Prepare uploads directory and ensure node user owns runtime paths
RUN mkdir -p /app/uploads/lagekarte \
    && chown -R node:node /app/uploads

USER node
EXPOSE 3091

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3091/api/health || exit 1

# Start NestJS backend (dist/src/main wird von nest build erzeugt)
CMD ["node", "dist/src/main"]

## Migrations image: Prisma CLI + schema + migrations only
FROM base AS migrations
COPY packages/backend/prisma ./packages/backend/prisma
WORKDIR /app/packages/backend
# Minimale Config ohne dotenvx - DATABASE_URL kommt direkt als Environment-Variable
RUN printf 'import { defineConfig } from "prisma/config";\nexport default defineConfig({ datasource: { url: process.env.DATABASE_URL } });\n' > prisma.config.ts
RUN pnpm exec prisma generate
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]
