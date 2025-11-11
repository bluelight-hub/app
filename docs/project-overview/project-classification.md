# Project Classification

## General Information

| Attribute | Value |
|-----------|-------|
| **Type** | Monorepo with 3 parts (Backend, Frontend, Shared) |
| **Domain** | Emergency Response Management (German Red Cross) |
| **Architecture** | NestJS Backend + React/Tauri Frontend + PostgreSQL |
| **Repository** | github.com/rubenvitt/bluelight-hub |
| **Current Version** | 1.0.0-alpha.32 (Semantic Versioning) |
| **Release Track** | Alpha (weekly releases) |
| **License** | See [LICENSE.md](../LICENSE.md) |
| **Status** | Active Development (Production-Ready Features) |

## Project Structure

```
bluelight-hub/
├── packages/
│   ├── backend/           # NestJS 11 + Prisma ORM
│   ├── frontend/          # React 19 + Tauri 2 + Vite
│   └── shared/            # Generated OpenAPI client
├── docs/
│   ├── architecture/      # arc42 documentation (37 files)
│   ├── ai-docs/           # AI-specific documentation (3 files)
│   └── .bmm-*.md          # BMM generated docs (this series)
├── .github/workflows/     # CI/CD pipelines (6 workflows)
├── docker-compose.yml     # PostgreSQL + Backend services
└── package.json           # Monorepo root (pnpm workspace)
```

---
