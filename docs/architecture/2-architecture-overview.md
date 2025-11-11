# 2. Architecture Overview

## High-Level Architecture

```
┌────────────────────────────────────────────────────┐
│         Tauri Desktop App (Cross-Platform)         │
│  ┌──────────────────────────────────────────────┐  │
│  │   React 19 Frontend                          │  │
│  │   ┌────────────────────────────────────────┐ │  │
│  │   │ Atomic Design Components               │ │  │
│  │   │ - Atoms (24)   - Organisms (52)        │ │  │
│  │   │ - Molecules (46) - Templates (4)       │ │  │
│  │   │ - Pages (6)                            │ │  │
│  │   └────────────────────────────────────────┘ │  │
│  │   ┌────────────────────────────────────────┐ │  │
│  │   │ State Management                       │ │  │
│  │   │ - TanStack Query (Server State)        │ │  │
│  │   │ - TanStack Store (UI State)            │ │  │
│  │   │ - TanStack Form (Forms + Zod)          │ │  │
│  │   └────────────────────────────────────────┘ │  │
│  │   ┌────────────────────────────────────────┐ │  │
│  │   │ Styling & UI                           │ │  │
│  │   │ - Tailwind CSS 4.1.17                  │ │  │
│  │   │ - Headless UI 2.2.9                    │ │  │
│  │   │ - Phosphor Icons                       │ │  │
│  │   └────────────────────────────────────────┘ │  │
│  └───────────────────┬──────────────────────────┘  │
│                      │ HTTP REST                   │
│                      │ (Generated Client)          │
└──────────────────────┼─────────────────────────────┘
                       │
                       │ Cookie-based JWT
                       │ (Access + Refresh + Admin)
                       │
         ┌─────────────▼──────────────┐
         │  NestJS 11 Backend         │
         │  ┌──────────────────────┐  │
         │  │ Controllers (10)     │  │
         │  │ - Auth (Unified)     │  │
         │  │ - Einsatz (CRUD)     │  │
         │  │ - ETB (Versioned)    │  │
         │  │ - Lagekarte (GeoJSON)│  │
         │  │ - User Management    │  │
         │  │ - Health Checks      │  │
         │  └─────────┬────────────┘  │
         │            │                │
         │  ┌─────────▼────────────┐  │
         │  │ Services (Business)  │  │
         │  │ - Validation         │  │
         │  │ - Transformations    │  │
         │  │ - Event Emitters     │  │
         │  └─────────┬────────────┘  │
         │            │                │
         │  ┌─────────▼────────────┐  │
         │  │ Repositories (Data)  │  │
         │  │ - Prisma ORM         │  │
         │  │ - Query Building     │  │
         │  │ - Transactions       │  │
         │  └─────────┬────────────┘  │
         └────────────┼────────────────┘
                      │
         ┌────────────▼────────────┐
         │  PostgreSQL 17          │
         │  - 9 Models             │
         │  - 5 Enums              │
         │  - Audit Trail          │
         │  - Soft-Delete          │
         └─────────────────────────┘
```

## Technology Stack (ACTUAL)

### Backend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | NestJS | 11.1.8 | Modular server framework |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Runtime** | Node.js | 24.10.0+ | JavaScript runtime |
| **Database** | PostgreSQL | 17 | Relational database |
| **ORM** | Prisma | 6.19.0 | Type-safe database client |
| **API Docs** | Swagger/OpenAPI | 11.2.1 | Auto-generated API docs |
| **Authentication** | Passport JWT | 11.0.5 | JWT strategy |
| **Validation** | class-validator | 0.14.2 | DTO validation |
| **Security** | Helmet + Throttler | 8.1.0 + 6.4.0 | Security headers + rate limiting |
| **Caching** | cache-manager | 7.2.4 | In-memory caching |
| **Events** | EventEmitter | 3.0.1 | Domain events (not Event Sourcing) |

### Frontend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 19.2.0 | UI library |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Build Tool** | Vite + SWC | 7.2.2 + 4.2.1 | Fast build and HMR |
| **Desktop** | Tauri | 2.8.5 | Cross-platform desktop app |
| **Routing** | TanStack Router | 1.135.0 | Type-safe routing with file-based |
| **Server State** | TanStack Query | 5.90.7 | Data fetching + caching |
| **UI State** | TanStack Store | 0.8.0 | Global state management |
| **Forms** | TanStack Form | 1.23.8 | Type-safe forms |
| **Validation** | Zod | 4.1.12 | Schema validation |
| **Styling** | Tailwind CSS | 4.1.17 | Utility-first CSS |
| **Components** | Headless UI | 2.2.9 | Accessible primitives |
| **Maps** | Leaflet | 1.9.4 | Mapping library |
| **Map Drawing** | Geoman | 2.18.3 | Drawing tools |
| **Icons** | Phosphor Icons | - | Icon library |
| **Notifications** | Sonner | 2.0.7 | Toast notifications |
| **Command** | cmdk | 1.1.1 | Command palette |

### Shared

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **API Client** | openapi-typescript | - | Generated from OpenAPI spec |
| **Types** | TypeScript | 5.9.3 | Shared types |

## Architecture Style

**Backend:** **Standard 3-Layer Architecture** (NOT Hexagonal, NOT CQRS)

```
Controller Layer (HTTP)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Prisma ORM
    ↓
PostgreSQL
```

**Frontend:** **Component-based with Atomic Design**

```
Pages (Routes)
    ↓
Templates (Layouts)
    ↓
Organisms (Complex sections)
    ↓
Molecules (Combined components)
    ↓
Atoms (Base components)
```

**State Management:** **Hybrid Approach**

- **Server State:** TanStack Query (primary)
- **UI State:** TanStack Store (EinsatzStore only)
- **Form State:** TanStack Form + Zod
- **Context:** ColorMode, Confirm dialogs

---
