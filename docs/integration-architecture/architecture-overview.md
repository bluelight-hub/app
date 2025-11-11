# Architecture Overview

BlueLight-Hub follows a **monorepo architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Monorepo Root                             │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Backend   │  │  Frontend  │  │  Shared (Generated) │   │
│  │  (NestJS)  │  │(React+Tauri)│  │  (OpenAPI Client)   │   │
│  │            │  │            │  │                     │   │
│  │  REST API  │◄─┤  HTTP      │◄─┤  TypeScript Types   │   │
│  │  OpenAPI   ├─►│  Requests  ├─►│  API Functions      │   │
│  │  Swagger   │  │            │  │                     │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│         │                │                    ▲              │
│         │                │                    │              │
│         ▼                ▼                    │              │
│  ┌────────────┐  ┌────────────┐              │              │
│  │ PostgreSQL │  │ TanStack   │              │              │
│  │ (Prisma)   │  │  Query     │──────────────┘              │
│  └────────────┘  └────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Integration Points

| Integration Point | Protocol | Implementation |
|------------------|----------|----------------|
| **Backend → Database** | PostgreSQL wire protocol | Prisma ORM |
| **Backend → Frontend** | HTTP REST + JSON | NestJS Controllers |
| **Frontend → Backend** | HTTP REST + JSON | Generated OpenAPI Client |
| **Frontend State** | In-memory + Optimistic UI | TanStack Query/Store |
| **Authentication** | JWT in httpOnly Cookies | Passport.js + Cookie-Parser |
| **File Uploads** | multipart/form-data | Multer (Backend) + Fetch API (Frontend) |

---
