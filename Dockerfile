# Base stage for shared dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/

# Frontend build stage
FROM base AS frontend-builder
WORKDIR /app
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY packages/frontend/ ./packages/frontend/
# Set environment variables to skip tests during build
ENV NODE_ENV=production
ENV SKIP_TESTS=true
RUN cd packages/frontend && pnpm build

# Backend build stage
FROM base AS backend-builder
WORKDIR /app
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
RUN cd packages/backend && pnpm build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Copy built artifacts
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=frontend-builder /app/packages/frontend/dist ./public
COPY --from=backend-builder /app/packages/shared ./packages/shared

# Install production dependencies
WORKDIR /app/packages/backend
RUN pnpm install --prod

# Set environment variables
ENV NODE_ENV=production

# Switch to non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"] 