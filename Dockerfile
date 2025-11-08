# Base stage for shared dependencies
# This stage installs all dependencies for the workspace
# and only changes when package.json or pnpm-lock.yaml changes
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm
WORKDIR /app

# Copy workspace configuration and package.json files
# This enables Docker layer caching - source code changes won't invalidate this layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/

# Install all dependencies (both dev and prod)
# This runs once and is reused by all builder stages
RUN pnpm install --frozen-lockfile

# ============================================================================
# Shared package builder
# ============================================================================
# Dedicated stage to build the shared package only once
# This is then reused by both frontend-builder and backend-builder
# Benefits:
# - Eliminates redundant compilation (was built twice before)
# - Faster rebuilds: changing frontend doesn't rebuild shared
# - Better caching: shared-builder layer is independent
FROM base AS shared-builder
WORKDIR /app

# Copy shared package source code
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/biome.json ./packages/shared/

# Copy pre-generated API client (committed to git)
COPY packages/shared/client ./packages/shared/client

# Build shared package using explicit WORKDIR (not cd command)
WORKDIR /app/packages/shared
RUN pnpm build

# ============================================================================
# Frontend builder
# ============================================================================
# Builds the frontend application
# Inherits from base (has all dependencies installed)
# Copies pre-built shared package from shared-builder (avoids rebuilding)
FROM base AS frontend-builder
WORKDIR /app

# Copy pre-compiled shared package from shared-builder stage
# This is the key optimization: reuse shared dist instead of rebuilding
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./packages/shared/

# Copy frontend source code
COPY packages/frontend/src ./packages/frontend/src
COPY packages/frontend/tsconfig.json ./packages/frontend/
COPY packages/frontend/vite.config.ts ./packages/frontend/
COPY packages/frontend/index.html ./packages/frontend/
COPY packages/frontend/biome.json ./packages/frontend/
COPY packages/frontend/tailwind.config.ts ./packages/frontend/
COPY packages/frontend/postcss.config.js ./packages/frontend/
COPY packages/frontend/public ./packages/frontend/public

# Set environment variables for build
ENV NODE_ENV=production
ENV SKIP_TESTS=true

# Build frontend with explicit WORKDIR
WORKDIR /app/packages/frontend
RUN pnpm build

# ============================================================================
# Backend builder
# ============================================================================
# Builds the backend application
# Inherits from base (has all dependencies installed)
# Copies pre-built shared package from shared-builder (avoids rebuilding)
FROM base AS backend-builder
WORKDIR /app

# Copy pre-compiled shared package from shared-builder stage
# This is the key optimization: reuse shared dist instead of rebuilding
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder /app/packages/shared/package.json ./packages/shared/

# Copy backend source code
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/prisma ./packages/backend/prisma
COPY packages/backend/.config ./packages/backend/.config
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/tsconfig.build.json ./packages/backend/
COPY packages/backend/.compodocrc.json ./packages/backend/
COPY packages/backend/biome.json ./packages/backend/
COPY packages/backend/nest-cli.json ./packages/backend/

# Build backend with explicit WORKDIR
WORKDIR /app/packages/backend
RUN pnpm build

# ============================================================================
# Production stage
# ============================================================================
# Minimal runtime image with only necessary artifacts
# Does NOT include:
# - Source code (src/, tsconfig.json, etc.)
# - Dev dependencies
# - Build tools
# - node_modules from builders
FROM node:20-alpine AS production
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm
WORKDIR /app

# Copy workspace configuration files (required for pnpm to work)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only package.json files (needed for pnpm install --prod)
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# ============================================================================
# Copy build artifacts ONLY
# ============================================================================

# Copy compiled shared package (dist) from shared-builder
# This includes type declarations and compiled JavaScript
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist

# Copy pre-generated API client types from shared-builder
# Needed because frontend/backend import from @bluelight-hub/shared/client
COPY --from=shared-builder /app/packages/shared/client ./packages/shared/client

# Copy compiled backend code from backend-builder
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist

# Copy Prisma schema and migrations (needed for runtime)
COPY --from=backend-builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=backend-builder /app/packages/backend/.config ./packages/backend/.config

# Copy compiled frontend static assets from frontend-builder
# Renamed to /app/public for easier serving
COPY --from=frontend-builder /app/packages/frontend/dist ./public

# ============================================================================
# Install production dependencies only
# ============================================================================
# Install at workspace root (pnpm workspace-aware)
RUN pnpm install --prod --frozen-lockfile

# ============================================================================
# Runtime setup
# ============================================================================

# Create uploads directory for application data
RUN mkdir -p /app/uploads/lagekarte && \
    chown -R node:node /app /app/uploads

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Health check to monitor container health
# Calls /api/health endpoint every 30s, fails after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
# Uses full path from workspace root
CMD ["node", "packages/backend/dist/main.js"]
