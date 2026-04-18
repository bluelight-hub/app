## Base layer: install shared dependencies once (leverages Docker layer caching)
FROM node:25-alpine AS base
RUN apk add --no-cache python3 make g++ wget \
    && npm install -g pnpm
WORKDIR /app

# Copy only dependency manifests to maximize cache hits
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/
# Patches werden von pnpm via patchedDependencies (package.json) beim Install benötigt.
COPY patches ./patches

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

## Production dependencies: use pnpm deploy for reliable workspace isolation
## (pnpm prune --prod does not reliably preserve workspace packages' dependencies)
FROM shared-builder AS prod-deps
RUN pnpm --filter @bluelight-hub/backend deploy --prod /prod/backend

## Production image: minimal runtime with pre-built artifacts only
FROM node:25-alpine AS production
RUN apk add --no-cache python3 make g++ wget
WORKDIR /app

# Production node_modules from pnpm deploy (flat, no symlinks)
# Includes workspace dependency @bluelight-hub/shared with pre-built dist/
COPY --from=prod-deps /prod/backend/node_modules ./packages/backend/node_modules

# Copy build outputs and runtime assets
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=backend-builder /app/packages/backend/src/generated ./packages/backend/src/generated
COPY --from=backend-builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=backend-builder /app/packages/backend/.config ./packages/backend/.config
COPY --from=backend-builder /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=frontend-builder /app/packages/frontend/dist ./public

ENV NODE_ENV=production
ENV UPLOADS_PATH=/app/uploads
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
