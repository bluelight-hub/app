# 3. Tech Stack

## 3.1 Technology Stack Table

| **Category** | **Technology** | **Version** | **Purpose** | **Rationale** |
|-------------|----------------|-------------|-------------|---------------|
| **Frontend Language** | TypeScript | 5.9.x | Type-safe Frontend-Entwicklung | Bereits vorhanden, Strict Mode für Fehlerprävention, volle IDE-Unterstützung |
| **Frontend Framework** | React | 18.3.x | UI-Framework | Etabliert im Projekt, Atomic Design Pattern kompatibel, große Community |
| **Frontend Build Tool** | Vite | 6.1.x | Dev-Server + Bundler | Bereits vorhanden, schnelle HMR, optimale TypeScript-Integration |
| **UI Component Library** | Headless UI | 2.x | Accessible Primitives (Modals, Dropdowns) | Bereits vorhanden, WCAG-konform, Tailwind-kompatibel |
| **CSS Framework** | Tailwind CSS | 3.x | Utility-First CSS | Bereits vorhanden, Atomic Design kompatibel, Dark-Mode-Support |
| **State Management** | TanStack Query + TanStack Store | 5.x | Server-State + Client-State | Bereits vorhanden, automatisches Caching, Offline-Support via QueryClient |
| **Mapping Library** | Leaflet | 1.9.x | Interactive Map Rendering | Trade-off-Winner (56/60), Offline-First, Open-Source |
| **Offline Tile Caching** | leaflet.offline | latest | IndexedDB Tile-Storage | Best-in-Class für Raster-Tile-Caching, 30-Tage-TTL-Support |
| **Marker Clustering** | leaflet.markercluster | latest | POI-Performance-Optimierung | NFR1 (<2s Load-Time), >1000 POIs unterstützt |
| **Drawing Tools** | @geoman-io/leaflet-geoman-free | latest | Polygon/Line/Rectangle-Drawing | Touch-optimiert, aktiv maintained, besseres TypeScript-Support als leaflet-draw |
| **Backend Language** | TypeScript | 5.9.x | Type-safe Backend-Entwicklung | Bereits vorhanden, Code-Sharing mit Frontend möglich |
| **Backend Framework** | NestJS | 11.x | Modular Backend-Framework | Bereits vorhanden, Dependency Injection, OpenAPI-Support |
| **API Style** | REST (OpenAPI 3.0) | 3.0.0 | API-Spezifikation + Client-Generation | Bereits vorhanden, auto-generierte TypeScript-Clients via @nestjs/swagger |
| **Database** | PostgreSQL | 17.x | Relational DB mit JSONB-Support | Bereits vorhanden, GeoJSON-Storage via JSONB, ACID-Garantien |
| **ORM** | Prisma | 6.x | Type-safe DB-Client + Migrations | Bereits vorhanden, Schema-as-Code, TypeScript-native |
| **Cache** | Redis | 7.x (Optional) | Rate-Limiting + Session-Cache | Optional für Geocoding-Rate-Limiting (Nominatim 1 req/s) |
| **File Storage** | Docker Volume | N/A | Screenshot-Storage | Lokales Filesystem (`/uploads/lagekarte/`), persistiert via Docker-Volume |
| **Authentication** | JWT (bestehend) | N/A | Token-based Auth | Bereits vorhanden, NestJS Guards integriert |
| **Frontend Testing** | Vitest + Testing Library | latest | Unit + Integration Tests | Bereits vorhanden, Vite-native, schnelle Execution |
| **Backend Testing** | Jest + Testcontainers | latest | Unit + Integration Tests | Bereits vorhanden, PostgreSQL-Testcontainers für Repository-Tests |
| **E2E Testing** | (Skipped for MVP) | N/A | End-to-End Tests | PRD: "Tests werden AKTUELL übersprungen (temporär)" |
| **Build Tool** | pnpm | 10.x | Monorepo Package Manager | Bereits vorhanden, Workspaces für Frontend/Backend/Shared |
| **Bundler** | Vite (Frontend) + tsc (Backend) | 6.1.x / 5.9.x | Production Builds | Vite für Frontend-Optimierung, tsc für Backend-Build |
| **IaC Tool** | Docker Compose | 2.x | Infrastructure-as-Code | Bereits vorhanden, einfache Orchestration |
| **CI/CD** | GitHub Actions | N/A | Automated Testing + Deployment | Bereits vorhanden (aus PRD-Context) |
| **Monitoring** | (TBD) | N/A | Performance-Monitoring | Performance-Tracking für p95(POI-Count), Tile-Load-Time |
| **Logging** | NestJS Logger | Built-in | Strukturiertes Logging | Bereits vorhanden, Winston-basiert |
| **Geocoding Service** | Nominatim (OSM) | API v1 | Address → Coordinates | Open-Source, DSGVO-konform, Rate-Limit: 1 req/s |

---
