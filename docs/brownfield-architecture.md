# BlueLight Hub Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the BlueLight Hub codebase, including technical debt, workarounds, and
real-world patterns. It serves as a reference for AI agents working on enhancements to this emergency services support
application.

### Document Scope

Comprehensive documentation of entire system - a monorepo-based emergency services platform with offline capabilities,
real-time communication, and resource management features.

### Change Log

| Date       | Version | Description                 | Author      |
|------------|---------|-----------------------------|-------------|
| 2025-01-18 | 1.0     | Initial brownfield analysis | BMad Master |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry (Backend)**: `packages/backend/src/main.ts` - NestJS application bootstrap
- **Main Entry (Frontend)**: `packages/frontend/src/main.tsx` - React application entry
- **Configuration**:
    - Backend: `packages/backend/src/config/`, `.env` files
    - Frontend: `packages/frontend/vite.config.ts`, `packages/frontend/src-tauri/tauri.conf.json`
- **Core Business Logic**:
    - `packages/backend/src/auth/` - Authentication system
    - `packages/backend/src/user-management/` - User management
- **API Definitions**: `packages/shared/client/apis/` - Generated API clients
- **Database Models**: `packages/backend/prisma/schema.prisma`
- **Key Algorithms**: Authentication in `packages/backend/src/auth/auth.service.ts`

## High Level Architecture

### Technical Summary

BlueLight Hub is a modern emergency services support application built as a monorepo with:

- **Frontend**: React + Vite + Tauri (desktop app) with Tailwind CSS
- **Backend**: NestJS with Prisma ORM
- **Shared**: OpenAPI-generated TypeScript clients for type-safe API communication
- **Documentation**: AsciiDoc-based arc42 architecture documentation

### Actual Tech Stack (from package.json)

| Category           | Technology        | Version      | Notes                                      |
|--------------------|-------------------|--------------|--------------------------------------------|
| Runtime            | Node.js           | LTS          | Required for all packages                  |
| Package Manager    | pnpm              | 10.14.0      | Workspace-based monorepo management        |
| Frontend Framework | React             | catalog:     | Using pnpm catalogs for version management |
| Build Tool         | Vite              | catalog:     | Fast HMR for development                   |
| Desktop Framework  | Tauri             | catalog:     | Native desktop app capabilities            |
| Backend Framework  | NestJS            | 11.1.5       | Enterprise-grade Node.js framework         |
| Database           | PostgreSQL        | via Prisma   | Relational database                        |
| ORM                | Prisma            | 6.13.0       | Type-safe database access                  |
| CSS Framework      | Tailwind CSS      | catalog:     | Utility-first CSS with Headless UI         |
| State Management   | TanStack Store    | catalog:     | Global state management                    |
| API Client Gen     | OpenAPI Generator | -            | Generates TypeScript clients from Swagger  |
| Authentication     | JWT               | via Passport | httpOnly cookies for security              |
| Testing (Frontend) | Vitest            | catalog:     | Unit testing framework                     |
| Testing (Backend)  | Jest              | 30.0.5       | Unit and integration testing               |
| E2E Testing        | Playwright        | catalog:     | Browser automation testing                 |

### Repository Structure Reality Check

- Type: **Monorepo** using pnpm workspaces
- Package Manager: **pnpm** with catalog-based dependency management
- Notable:
    - Shared package for API client generation
    - Separation between old-projects (legacy) and current packages
    - Heavy use of code generation for API clients

## Source Tree and Module Organization

### Project Structure (Actual)

```text
bluelight-hub/
├── packages/
│   ├── frontend/          # React + Vite + Tauri desktop application
│   │   ├── src/
│   │   │   ├── api/       # API integration layer
│   │   │   ├── components/ # Atomic design pattern (atoms/molecules/organisms/templates)
│   │   │   ├── hooks/     # Custom React hooks
│   │   │   ├── pages/     # Route pages (Admin panels)
│   │   │   ├── routes/    # TanStack Router configuration
│   │   │   ├── services/  # Business logic services
│   │   │   ├── schemas/   # Zod validation schemas
│   │   │   └── utils/     # Utility functions
│   │   └── src-tauri/     # Tauri native app configuration
│   ├── backend/           # NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/      # Authentication module (JWT, sessions)
│   │   │   ├── user-management/ # User CRUD operations
│   │   │   ├── health/    # Health check endpoints
│   │   │   ├── prisma/    # Database service
│   │   │   ├── cli/       # CLI commands for admin tasks
│   │   │   └── common/    # Shared utilities
│   │   └── prisma/        # Database schema and migrations
│   └── shared/            # Generated API clients and shared types
│       └── client/
│           ├── apis/      # Generated API classes
│           └── models/    # Generated TypeScript interfaces
├── docs/                  # arc42 architecture documentation
│   └── architecture/
│       └── adr/          # Architecture Decision Records
├── old-projects/         # LEGACY CODE - Previous implementations
├── ai-docs/              # AI-specific documentation
└── scripts/              # Build and deployment scripts
```

### Key Modules and Their Purpose

**Backend Modules:**

- **AuthModule**: `packages/backend/src/auth/` - JWT authentication with httpOnly cookies, admin/user separation
- **UserManagementModule**: `packages/backend/src/user-management/` - CRUD operations for user accounts
- **PrismaModule**: `packages/backend/src/prisma/` - Database connection and ORM service
- **HealthModule**: `packages/backend/src/health/` - System health checks
- **ConfigModule**: Global configuration management
- **CLIModule**: Command-line tools for admin operations

**Frontend Architecture:**

- **Atomic Design Pattern**: Components organized as atoms → molecules → organisms → templates
- **TanStack Router**: File-based routing with type safety
- **TanStack Query**: Server state management with caching
- **TanStack Store**: Client state management
- **Tailwind + Headless UI**: Styling system

## Data Models and APIs

### Data Models

**Core models in Prisma schema:**

- **User Model**: See `packages/backend/prisma/schema.prisma`
    - Supports three roles: SUPER_ADMIN, ADMIN, USER
    - Password hash only for admin users
    - Account locking mechanism with failedLoginCount
    - Soft delete via isActive flag

### API Specifications

- **OpenAPI Generation**: Backend controllers use NestJS Swagger decorators
- **Generated Clients**: `packages/shared/client/apis/` contains TypeScript clients
- **API Endpoints**:
    - `/api/auth/*` - Authentication endpoints
    - `/api/users/*` - User management
    - `/api/health/*` - Health checks
    - `/api/app/*` - Application info

**API Generation Workflow:**

1. Backend endpoints decorated with @ApiTags, @ApiOperation
2. Run `pnpm generate-api` to generate OpenAPI spec
3. OpenAPI Generator creates TypeScript clients in shared package
4. Frontend imports and uses generated clients

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Test Coverage Disabled**: Frontend test coverage temporarily disabled (see package.json line 19)
2. **Session Management**: Sessions and refresh tokens commented out in User model - not yet implemented
3. **TODO Items**:
    - Session invalidation not implemented (`packages/backend/src/cli/commands/admin-reset-password.command.ts`)
    - System status badge hardcoded as "TODO" in login window
    - Version number hardcoded as "TODO" in auth footer
4. **Legacy Code**: `old-projects/` directory contains previous implementations - unclear if safe to remove
5. **Migration from Chakra to Tailwind**: ADR-013 indicates ongoing UI framework migration

### Workarounds and Gotchas

- **httpOnly Cookies**: Used for JWT tokens to prevent XSS attacks - frontend cannot access tokens directly
- **Admin vs User Auth**: Separate authentication flows - only admin users have passwords
- **Catalog Dependencies**: Frontend uses pnpm catalogs - version numbers not directly visible in package.json
- **Build Order**: Must run `prisma generate` before building backend
- **API Client Generation**: Must manually run `pnpm generate-api` after backend API changes
- **Tauri Desktop App**: Requires platform-specific build setup for native features

## Integration Points and External Dependencies

### External Services

| Service    | Purpose           | Integration Type | Key Files                      |
|------------|-------------------|------------------|--------------------------------|
| PostgreSQL | Primary database  | Prisma ORM       | `packages/backend/prisma/`     |
| Tauri      | Desktop app shell | Native API       | `packages/frontend/src-tauri/` |

### Internal Integration Points

- **Frontend ↔ Backend**: REST API with generated TypeScript clients
- **Authentication**: JWT in httpOnly cookies, automatic refresh mechanism
- **Real-time**: Not yet implemented (EventEmitter module present but unused)
- **Offline Mode**: Tauri provides local storage capabilities

## Development and Deployment

### Local Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env  # Configure DATABASE_URL

# 3. Run database migrations
pnpm --filter @bluelight-hub/backend prisma:migrate

# 4. Generate Prisma client
pnpm --filter @bluelight-hub/backend prisma:generate

# 5. Generate API clients
pnpm generate-api

# 6. Start development servers
pnpm dev  # Starts all packages in dev mode
```

**Known Setup Issues:**

- Prisma client must be generated before first run
- Database must be running (PostgreSQL)
- Tauri requires platform-specific dependencies

### Build and Deployment Process

- **Build Command**: `pnpm build` (builds all packages)
- **Docker Support**: `docker-compose.yml` available for containerized deployment
- **Environments**: Development, Production (no staging mentioned)
- **CI/CD**: GitHub Actions configured (`.github/workflows/test.yml`)

## Testing Reality

### Current Test Coverage

**Backend:**

- Unit Tests: Jest configured, coverage reporting enabled
- Integration Tests: Test containers for database testing
- E2E Tests: Separate Jest configuration

**Frontend:**

- Unit Tests: Vitest configured but **coverage disabled** (technical debt)
- Component Tests: Testing Library configured
- E2E Tests: Playwright configured

### Running Tests

```bash
# All packages
pnpm test           # Run all tests
pnpm test:cov       # With coverage (frontend coverage disabled)

# Backend specific
pnpm --filter @bluelight-hub/backend test
pnpm --filter @bluelight-hub/backend test:e2e

# Frontend specific
pnpm --filter @bluelight-hub/frontend test
pnpm --filter @bluelight-hub/frontend test:ui  # Vitest UI mode
```

## Architecture Patterns and Conventions

### Backend Patterns

- **Modular Architecture**: Each feature in its own NestJS module
- **Repository Pattern**: Not used - Prisma service injected directly
- **DTO Pattern**: Class-validator for request validation
- **Guard-based Authentication/Authorization**:
    - Authentication logic implemented via JWT Guard (`JwtAuthGuard`)
    - Role-based access control (RBAC) implemented via `RolesGuard`
    - Guards applied at controller-level (`@UseGuards()`) or route-level for granular control
    - Public routes marked with `@Public()` decorator to bypass auth
    - Permission-based authorization through `@RequirePermissions()` decorator
- **Interceptors**: Audit logging interceptor for tracking critical operations (planned)
- **Exception Filters**: Global exception handling via NestJS

### Frontend Patterns

- **Atomic Design**: Strict component hierarchy
- **Container/Presentational**: Hooks handle logic, components handle presentation
- **API Integration**: Generated clients with TanStack Query for caching
- **Routing**: File-based with TanStack Router
- **Form Handling**: TanStack Form with Zod validation
- **State Management**: TanStack Store for global state

### Code Style and Conventions

- **Language**: German for documentation, English for code
- **Formatting**: Prettier with Tailwind plugin
- **Linting**: ESLint configured for both packages
- **Git Hooks**: Husky + lint-staged for pre-commit checks
- **Commit Convention**: Semantic release with gitmoji

## Security Considerations

### Current Implementation

- **Authentication**: JWT with httpOnly cookies
- **Password Storage**: bcrypt hashing for admin passwords
- **CORS**: Handled by NestJS
- **Helmet**: Security headers configured
- **Rate Limiting**: Not implemented
- **Input Validation**: class-validator on DTOs

### Security Gaps

- Session management not fully implemented
- No rate limiting
- No API key authentication
- No audit logging
- MFA removed (see ADR-010)

## Performance Considerations

### Current State

- **Database**: Single PostgreSQL instance, no connection pooling configured
- **Caching**: Cache manager installed but not implemented
- **API Response**: No pagination implemented yet
- **Frontend Bundle**: Vite for optimized builds
- **Desktop App**: Tauri for native performance

### Performance Gaps

- No database query optimization
- No caching strategy
- No CDN for static assets
- No lazy loading implemented
- No code splitting beyond route level

## Monitoring and Observability

### Current State

- **Health Checks**: Basic endpoint at `/api/health`
- **Logging**: Console logging only
- **Metrics**: None
- **Tracing**: None
- **Error Tracking**: None

### Gaps

- No centralized logging
- No APM solution
- No error tracking service
- No performance monitoring
- No uptime monitoring

## Deployment Considerations

### Current Capabilities

- **Docker**: Dockerfile and docker-compose.yml present
- **CI/CD**: GitHub Actions for testing
- **Database Migrations**: Prisma migrate
- **Environment Config**: dotenv for configuration

### Deployment Gaps

- No production deployment documentation
- No infrastructure as code
- No secrets management
- No blue-green deployment
- No rollback procedures

## Future Considerations (from arc42 docs)

The application is designed for emergency services with requirements for:

- **Offline capability** (partially implemented via Tauri)
- **Real-time communication** (not yet implemented)
- **Resource management** (not yet implemented)
- **Multi-organization support** (not yet implemented)
- **Integration with emergency systems** (not yet implemented)

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm build                  # Build all packages
pnpm generate-api           # Regenerate API clients
pnpm lint                   # Lint all packages

# Database
pnpm --filter @bluelight-hub/backend prisma:studio   # Prisma Studio GUI
pnpm --filter @bluelight-hub/backend prisma:migrate  # Run migrations
pnpm --filter @bluelight-hub/backend prisma:seed     # Seed database

# Testing
pnpm test                   # Run all tests
pnpm test:ui                # Vitest UI
pnpm test:e2e               # E2E tests

# Admin CLI
pnpm --filter @bluelight-hub/backend admin:reset     # Reset admin password
```

### Debugging and Troubleshooting

- **Logs**: Console output only (no log files)
- **Debug Mode**: `nest start --debug` for backend
- **Common Issues**:
    - Prisma client not generated: Run `pnpm --filter @bluelight-hub/backend prisma:generate`
    - API types outdated: Run `pnpm generate-api`
    - Tauri build fails: Check platform-specific dependencies

## Critical Notes for AI Agents

1. **ALWAYS** run `pnpm generate-api` after modifying backend API endpoints
2. **NEVER** manually edit files in `packages/shared/client/` - they are generated
3. **Frontend components** follow atomic design - place in correct hierarchy
4. **Use TanStack libraries** for state, routing, and forms - not Redux or React Router
5. **German documentation** but English code - maintain this convention
6. **Test coverage** is disabled for frontend - don't rely on coverage metrics
7. **httpOnly cookies** mean frontend cannot access JWT tokens directly
8. **Admin vs User** authentication flows are separate - handle accordingly
