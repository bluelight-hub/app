# Repository Structure

## Package Overview

| Package | Location | Purpose | Entry Point |
|---------|----------|---------|-------------|
| **Backend** | `packages/backend/` | REST API + Database | `src/main.ts` |
| **Frontend** | `packages/frontend/` | UI + Desktop App | `src/main.tsx` |
| **Shared** | `packages/shared/` | Generated API Client | `client/apis/index.ts` |

## Detailed Breakdown

**Backend:**
- [API Contracts](./.bmm-backend-api-contracts.md) - 54 REST endpoints documented
- [Data Models](./.bmm-backend-data-models.md) - 9 Prisma models + 5 enums

**Frontend:**
- [Component Inventory](./.bmm-frontend-components.md) - 135+ components (Atomic Design)
- [State Management](./.bmm-frontend-state-management.md) - TanStack Query/Store patterns
- [API Integration](./.bmm-frontend-api-integration.md) - How frontend calls backend

**Integration:**
- [Integration Architecture](./.bmm-integration-architecture.md) - How parts communicate

**Development:**
- [Development Guide](./.bmm-development-guide.md) - Setup, commands, troubleshooting
- [Technology Stack](./.bmm-technology-stack.md) - Detailed tech stack analysis

**Architecture:**
- [arc42 Documentation](./architecture/index.adoc) - Comprehensive architecture docs (37 files)
- [ADRs](./architecture/adr/) - 21 Architecture Decision Records

---
