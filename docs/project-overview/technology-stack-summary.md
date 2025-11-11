# Technology Stack Summary

## Backend (packages/backend/)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | NestJS | 11.1.8 | Modular Node.js framework |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **ORM** | Prisma | 6.19.0 | Database access + migrations |
| **Database** | PostgreSQL | 17.x | Relational data storage |
| **Authentication** | Passport.js + JWT | 11.0.5 | Cookie-based auth |
| **Validation** | class-validator | 0.14.2 | DTO validation |
| **API Docs** | Swagger (OpenAPI 3.0) | 11.2.1 | Interactive API documentation |
| **Rate Limiting** | @nestjs/throttler | 6.4.0 | Brute-force protection |
| **File Uploads** | Multer | 2.0.2 | Multipart/form-data handling |
| **Geocoding** | Nominatim API | - | Address → Coordinates |
| **Coordinates** | MGRS | 2.1.0 | Military Grid Reference System |

**API Endpoints:** 54 across 10 controllers
**Database Models:** 9 models, 5 enums
**Port:** 3000 (development), configurable via env

## Frontend (packages/frontend/)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 19.2.0 | UI component library |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Desktop Runtime** | Tauri | 2.9.0 | Cross-platform desktop app |
| **Build Tool** | Vite | 7.2.2 | Fast development + bundling |
| **Router** | TanStack Router | 1.135.0 | Type-safe routing |
| **State Management** | TanStack Query + Store | 5.90.7 + 0.8.0 | Server/Client state |
| **Forms** | TanStack Form + Zod | 1.23.8 + 4.1.12 | Type-safe forms + validation |
| **UI Framework** | Tailwind CSS 4 + Headless UI | 4.1.17 + 2.2.9 | Utility-first styling |
| **Maps** | Leaflet + React-Leaflet | 1.9.4 + 5.0.0 | Interactive maps |
| **Coordinates** | MGRS | 2.1.0 | Military Grid Reference System |
| **Icons** | React Icons | 5.5.0 | Icon library |
| **Notifications** | Sonner | 2.0.7 | Toast notifications |

**Components:** 135+ across Atomic Design levels
**Query Hooks:** 24+ TanStack Query hooks
**Port:** 5173 (Vite dev), 3001 (Tauri)

## Shared (packages/shared/)

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **API Client** | OpenAPI Generator (TypeScript Axios) | Latest | Type-safe API client |
| **Source** | Backend OpenAPI spec (`/api-json`) | - | Auto-generated from NestJS |

**Generated Files:** 10+ API classes, 50+ model types

---
