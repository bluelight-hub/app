# Backend Architecture Analysis: Bluelight Hub

## Executive Summary

The Bluelight Hub backend uses a **modular NestJS architecture** organized around feature-based modules. Currently, there is **only one feature module** (`lagekarte`) for map-based Point of Interest (POI) management in emergency operations. The architecture demonstrates mature patterns including:

- Clean **layered architecture** (Controller → Service → Repository → Database)
- **Dependency Injection** via NestJS
- **DTO-based data validation** with custom validators
- **Transactional integrity** for critical operations
- **Lazy creation patterns** for optimized database operations
- **Multi-format coordinate support** (MGRS, Lat/Lng, Address)
- **Domain-driven module organization**

---

## 1. Module Structure Overview

### Current Module Inventory

```
packages/backend/src/
├── modules/
│   └── lagekarte/                    # Map/POI Management Module
│       ├── controllers/              # HTTP Request Handlers (3 controllers)
│       ├── services/                 # Business Logic Layer (4 services)
│       ├── repositories/             # Data Access Layer (2 repositories)
│       ├── entities/                 # Swagger API Models (2 entities)
│       ├── dto/                      # Request/Response DTOs (4 DTOs)
│       ├── validators/               # Custom Validation Rules (1 validator)
│       └── lagekarte.module.ts       # Module Configuration
│
├── einsatz/                          # Incident Management (imported by lagekarte)
├── auth/                             # Authentication & Authorization
├── user-management/                  # User/Role Management
├── etb/                              # ETB System Integration
├── common/                           # Shared Utilities & Decorators
├── health/                           # Health Check Endpoints
├── prisma/                           # Database ORM
└── app.module.ts                     # Root Application Module
```

### Lagekarte Module - Detailed Structure

```
lagekarte/
├── Controllers (3 files, 3 classes)
│   ├── lagekarte.controller.ts        # Lagekarte CRUD + Screenshots
│   ├── poi.controller.ts              # POI CRUD Operations
│   └── geocoding.controller.ts        # Address → Coordinates Conversion
│
├── Services (4 files, 4 classes)
│   ├── lagekarte.service.ts          # Lagekarte Business Logic + Lazy Creation
│   ├── poi.service.ts                # POI Business Logic + Coordinate Conversion
│   ├── geocoding.service.ts          # Nominatim API Integration (Address Geocoding)
│   └── mgrs-converter.service.ts     # MGRS ↔ Lat/Lng Conversion
│
├── Repositories (2 files, 2 classes)
│   ├── lagekarte.repository.ts       # Lagekarte Data Access
│   └── poi.repository.ts             # POI Data Access
│
├── Entities (2 files, 2 classes)
│   ├── lagekarte.entity.ts           # Lagekarte Swagger Model
│   └── lagekarte-poi.entity.ts       # LagekartePoi Swagger Model
│
├── DTOs (4 files, 4 classes)
│   ├── create-poi.dto.ts             # POI Creation Request Model
│   ├── update-poi.dto.ts             # POI Update Request Model (PartialType)
│   ├── save-lagekarte-state.dto.ts   # Lagekarte State Persistence
│   └── poi-response.dto.ts           # POI Response Model
│
├── Validators (1 file)
│   └── coordinates-or-address.validator.ts  # Custom Validation Constraint
│
└── lagekarte.module.ts               # Module Configuration & DI Setup
```

---

## 2. Layered Architecture Analysis

### Layering Approach: Standard NestJS Three-Tier Pattern

```
┌─────────────────────────────────────────────┐
│        Controllers (HTTP Layer)              │
│  - Request/Response Handling                 │
│  - Security Guards (JwtAuthGuard)            │
│  - Request Validation (ValidationPipe)       │
│  - OpenAPI Documentation (Swagger Decorators)│
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      Services (Business Logic Layer)         │
│  - Domain Logic Implementation               │
│  - Cross-cutting Concerns                    │
│  - Service-to-Service Collaboration          │
│  - Transaction Management                    │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      Repositories (Data Access Layer)        │
│  - Prisma Client Wrapper                     │
│  - Query Abstraction                         │
│  - Data Persistence Operations               │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      Prisma ORM & Database                   │
│  - PostgreSQL Persistence                    │
│  - Schema Validation                         │
│  - Relationship Management                   │
└─────────────────────────────────────────────┘
```

### Layer Responsibilities

#### **Layer 1: Controller (HTTP Request Handler)**
- **Files:** `lagekarte.controller.ts`, `poi.controller.ts`, `geocoding.controller.ts`
- **Responsibilities:**
  - HTTP endpoint definition via NestJS decorators (`@Get`, `@Post`, `@Put`, `@Delete`)
  - JWT authentication enforcement (`@UseGuards(JwtAuthGuard)`)
  - Request validation (`ValidationPipe`, custom DTOs)
  - OpenAPI/Swagger documentation
  - File upload handling (multipart/form-data)
  - Logging and error handling
  - Response transformation

#### **Layer 2: Service (Business Logic)**
- **Files:** `lagekarte.service.ts`, `poi.service.ts`, `geocoding.service.ts`, `mgrs-converter.service.ts`
- **Responsibilities:**
  - Core domain logic implementation
  - Coordinate system conversions (MGRS ↔ Lat/Lng)
  - Lazy creation patterns (Lagekarte)
  - Transaction management (Prisma transactions)
  - Service-to-service integration (Geocoding, MGRS Converter)
  - Error handling and validation
  - Logging

#### **Layer 3: Repository (Data Access)**
- **Files:** `lagekarte.repository.ts`, `poi.repository.ts`
- **Responsibilities:**
  - Encapsulate Prisma client calls
  - Abstract database queries
  - Query composition
  - Data persistence operations
  - No business logic

#### **Layer 4: Entities & DTOs (Data Transfer Objects)**
- **Entities:** Swagger API model representations (NOT database entities)
- **DTOs:** Request/response validation models
  - `CreatePoiDto` - POI creation request
  - `UpdatePoiDto` - POI update request (PartialType)
  - `SaveLagekarteStateDto` - State persistence request
- **Validators:** Custom validation constraints
  - `IsCoordinatesOrAddressValidator` - Ensures coordinates OR address provided

---

## 3. Module Dependencies & Relationships

### Dependency Graph

```
┌─────────────────────┐
│   Lagekarte Module  │
└──────────┬──────────┘
           │
    ┌──────┴──────┬─────────────┬────────────┐
    │             │             │            │
    ▼             ▼             ▼            ▼
  Prisma      HttpModule   ThrottlerModule  EinsatzModule
  Module      (Nominatim)   (Rate Limiting) (Read-Only)
    │
    └─────────────┬──────────────┐
                  │              │
            PostgreSQL      Authorization
            Database
```

### Internal Service Dependencies

**Lagekarte Service:**
- Depends on: `LagekarteRepository`, `PoiRepository`, `GeocodingService`, `EinsatzService`, `PrismaService`
- Used by: `LagekarteController`
- Purpose: Manage lagekarte lifecycle with lazy creation

**POI Service:**
- Depends on: `PoiRepository`, `GeocodingService`, `MgrsConverterService`
- Used by: `PoiController`
- Purpose: Manage POI CRUD with intelligent coordinate handling

**Geocoding Service:**
- Depends on: `HttpService`, `ConfigService`
- Used by: `LagekarteService`, `PoiService`, `GeocodingController`
- Purpose: Convert addresses to coordinates via Nominatim API
- Rate-Limited: 1 request/second (Nominatim policy)

**MGRS Converter Service:**
- Depends on: `mgrs` npm library
- Used by: `PoiService`
- Purpose: Convert between MGRS and Lat/Lng coordinates

### Cross-Module Dependencies

**Lagekarte → Einsatz:**
- Direction: **Read-only import**
- Purpose: Fetch `einsatz.einsatzort` (address) for initial POI creation
- Reason: Event-based decoupling (Einsatz doesn't know about Lagekarte)
- Risk: If Einsatz module changes, Lagekarte might break

### Module Export Analysis

All services are exported from lagekarte.module.ts, allowing other modules to import them. This is fine for read-only access to Lagekarte data.

---

## 4. Coordinate System Architecture

### Multi-Format Coordinate Support

The lagekarte module supports three coordinate formats with a clear **priority hierarchy**:

```
Priority 1: MGRS (Military Grid Reference System) - PRIMARY
  └─ Format: "33UVU1234567890"
  └─ Precision: 1m (5 digits per axis)
  └─ Auto-converts to Lat/Lng
  └─ Military standard for disaster response

Priority 2: Lat/Lng (Geographic Coordinates) - FALLBACK
  └─ Format: latitude [-90, 90], longitude [-180, 180]
  └─ Direct storage
  └─ Universal standard

Priority 3: Address (Text-based) - GEOCODING
  └─ Format: "Hauptstraße 1, 10115 Berlin"
  └─ Auto-geocoded to Lat/Lng
  └─ User-friendly input
```

### Coordinate Conversion Workflow

**POI Creation Flow:**

```
┌─ MGRS provided ──┐
│                  ├──> MgrsConverterService.mgrsToLatLng() ──> Store MGRS + Lat/Lng
├─ Lat/Lng provided┤
│                  ├──> MgrsConverterService.latLngToMgrs() ──> Store MGRS + Lat/Lng
├─ Address provided┤
│                  ├──> GeocodingService.geocodeAddress() ──>
└─────────────────┘    GeocodingService returns Lat/Lng ──>
                        MgrsConverterService.latLngToMgrs() ──> Store MGRS + Lat/Lng
```

### Data Storage Strategy

**Lagekarte POI Table Schema:**

Both MGRS and Lat/Lng are stored:
- **MGRS** is the primary format (military standard, precise)
- **Lat/Lng** is always computed and stored as fallback
- This allows queries on either format without conversion
- Both formats provide data redundancy and backwards compatibility

---

## 5. Service-Level Patterns & Characteristics

### Pattern 1: Lazy Creation Pattern

**Implementation:** `LagekarteService.getOrCreateLagekarte()`

**Why:** Avoid database overhead when creating an Einsatz (incident). Lagekarte is only created when first accessed.

**Transactional Guarantee:** If initial POI creation fails, entire Lagekarte creation is rolled back.

### Pattern 2: Coordinate Priority-Based Processing

**Implementation:** `PoiService.createPoi()` and `PoiService.updatePoi()`

Services intelligently select which coordinate format to use based on priority:
1. MGRS provided → Use MGRS
2. Lat/Lng provided → Convert to MGRS
3. Address provided → Geocode to Lat/Lng, then to MGRS

### Pattern 3: Graceful Fallback on Geocoding Failure

**Behavior:**
- If geocoding fails, no exception is thrown for updates
- For creation: User must provide MGRS or Lat/Lng (address is optional)
- For updates: Old coordinates are preserved if new geocoding fails

### Pattern 4: Rate-Limited External API Integration

**Configuration:**
- **Service-level:** 1 request/second (Nominatim policy)
- **Controller-level:** 10 requests/minute per user

---

## 6. DTO & Validation Architecture

### DTO Hierarchy

```
CreatePoiDto (Full Creation Request)
    └─ Validates: All fields with custom validator @IsCoordinatesOrAddress()
        
UpdatePoiDto (Partial Update Request)
    └─ Extends: PartialType(OmitType(CreatePoiDto, ['lagekarteId']))
    └─ All fields optional except those explicitly omitted

SaveLagekarteStateDto (State Persistence)
    └─ Fields: einsatzId, state (GeoJSON FeatureCollection)
```

### Custom Validator: IsCoordinatesOrAddress

**Purpose:** Ensure POI has at least one valid coordinate source

Validates that at least one of these is provided:
- `mgrs` (Military Grid Reference System)
- `latitude` + `longitude` (Geographic coordinates)
- `adresse` (Address for geocoding)

---

## 7. Controller API Routes & Endpoints

### Route Structure

```
Base Route: /einsatz/:einsatzId/lagekarte (v-alpha)

Lagekarte Endpoints:
  GET    /                              → Get or create lagekarte (lazy)
  POST   /                              → Save lagekarte state (GeoJSON)
  POST   /screenshot                    → Upload lagekarte screenshot (PNG/JPEG)
  DELETE /screenshot/:filename          → Delete lagekarte screenshot
  DELETE /                              → Delete lagekarte (cascade POIs)

POI Endpoints (Base: /einsatz/:einsatzId/lagekarte/pois):
  GET    /                              → List all POIs
  POST   /                              → Create POI
  GET    /:poiId                        → Get single POI
  PUT    /:poiId                        → Update POI
  DELETE /:poiId                        → Delete POI

Geocoding Endpoints (Base: /einsatz/:einsatzId):
  POST   /geocode                       → Geocode address to coordinates
```

### Security & Rate Limiting

**Authentication:** JWT Bearer Token (JwtAuthGuard on all endpoints)

**Rate Limiting:**
- Global: 10 requests/minute (app.module.ts)
- Geocoding: 10 requests/minute per user (geocoding.controller.ts)
- Nominatim API: 1 request/second (geocoding.service.ts)

**File Upload Restrictions:**
- Allowed types: PNG, JPEG
- Max size: 10MB
- Sanitization: Path traversal prevention

---

## 8. Database Schema & Relationships

### Lagekarte Schema

```sql
TABLE lagekarte {
  id           CUID PRIMARY KEY
  einsatzId    TEXT UNIQUE NOT NULL (FK → einsatz.id)
  state        JSONB DEFAULT '{}'          -- GeoJSON FeatureCollection
  createdAt    TIMESTAMP DEFAULT now()
  updatedAt    TIMESTAMP DEFAULT now()
  
  UNIQUE(einsatzId)
  INDEX(einsatzId)
  
  FK: einsatz.id ON DELETE CASCADE
}
```

### LagekartePoi Schema

```sql
TABLE lagekarte_poi {
  id           CUID PRIMARY KEY
  lagekarteId  TEXT NOT NULL (FK → lagekarte.id)
  type         ENUM(PoiType)
  name         VARCHAR(255) NULLABLE
  adresse      VARCHAR(500) NULLABLE
  mgrs         VARCHAR(20) NULLABLE           -- Military Grid Reference System
  latitude     FLOAT NOT NULL                 -- Computed from MGRS
  longitude    FLOAT NOT NULL                 -- Computed from MGRS
  icon         VARCHAR(50) NULLABLE
  metadata     JSONB NULLABLE
  createdAt    TIMESTAMP DEFAULT now()
  updatedAt    TIMESTAMP DEFAULT now()
  
  INDEX(lagekarteId)
  
  FK: lagekarte.id ON DELETE CASCADE
}
```

### Relationships

**1:1 Lagekarte ↔ Einsatz**
- One Lagekarte per Einsatz
- Lagekarte is created lazily (not when Einsatz is created)
- Cascade delete: Deleting Einsatz deletes its Lagekarte

**1:N Lagekarte → LagekartePoi**
- One Lagekarte has many POIs
- Cascade delete: Deleting Lagekarte deletes all POIs
- POIs are ordered by createdAt (ascending)

---

## 9. Current Layering Effectiveness

### Strengths

✅ **Clear Separation of Concerns**
- Controllers handle HTTP concerns only
- Services contain pure business logic
- Repositories abstract database access

✅ **Testability**
- Each layer can be tested independently
- Services can be mocked in controller tests
- Repositories can be mocked in service tests

✅ **Maintainability**
- Changes to database schema affect only repositories
- Business logic changes are isolated to services
- HTTP handling changes are isolated to controllers

✅ **Reusability**
- Services are exported from module
- Other modules can inject and reuse services
- No tight coupling to HTTP concerns

✅ **Extensibility**
- New features can be added as new service methods
- New controllers can be added to expose new endpoints
- Coordinate systems can be extended via MgrsConverterService

### Weaknesses & Improvements

⚠️ **Limited Domain Modeling**
- Entities are just Swagger models, not rich domain models
- No ValueObjects for coordinates (could use Lat/Lng or MGRS as ValueObjects)
- POI type validation is loose (uses enum but no domain logic)

⚠️ **Repository Layer Lightweight**
- Repositories are thin wrappers around Prisma
- No query builders or custom query logic
- Could benefit from Query Objects pattern for complex queries

⚠️ **Service Layer Has Multiple Responsibilities**
- Coordinate conversion (should be separate utility/service?)
- Geocoding (external integration)
- Lazy creation logic
- Could be broken into smaller, focused services

⚠️ **Error Handling Inconsistency**
- Some services throw BadRequestException
- Others rely on controller for error handling
- No centralized error handling strategy

---

## 10. Growing the Architecture

### When Adding New Modules

The recommended pattern for new feature modules:

```
src/modules/your-new-module/
├── controllers/
│   └── your-resource.controller.ts
├── services/
│   └── your-resource.service.ts
├── repositories/
│   └── your-resource.repository.ts
├── entities/
│   └── your-resource.entity.ts
├── dto/
│   ├── create-your-resource.dto.ts
│   └── update-your-resource.dto.ts
└── your-module.module.ts
```

### Module Import/Export Best Practices

```typescript
// Good: Feature module exports services for reuse
@Module({
  imports: [PrismaModule, OtherModule],
  controllers: [YourController],
  providers: [YourService, YourRepository],
  exports: [YourService]  // ✅ Allows other modules to inject YourService
})
```

### Avoid Circular Dependencies

**Current Solution:** Event-based decoupling
- Einsatz doesn't know about Lagekarte
- Other modules can listen to events from any other module

---

## 11. Technology Stack Summary

| Layer        | Technology          | Purpose                                    |
|--------------|---------------------|--------------------------------------------|
| HTTP         | NestJS Decorators   | Route definition, validation               |
| DI Container | NestJS IoC          | Dependency injection and lifecycle mgmt    |
| Auth         | JWT + Passport      | Token-based authentication                 |
| Validation   | class-validator     | DTO validation with custom constraints     |
| ORM          | Prisma              | Type-safe database access                  |
| Database     | PostgreSQL          | Persistent data storage                    |
| HTTP Client  | Axios (via NestJS)  | Nominatim API integration                  |
| Coordinates  | mgrs npm library    | MGRS conversion                            |
| Rate Limit   | NestJS Throttler    | API rate limiting                          |
| Logging      | NestJS Logger       | Application logging                        |
| Docs         | Swagger/OpenAPI     | API documentation                          |

---

## 12. Conclusion

The Bluelight Hub backend demonstrates a **well-structured, modular NestJS architecture** with:

- ✅ Clean layering (Controller → Service → Repository → Database)
- ✅ Proper dependency injection and module organization
- ✅ Sophisticated coordinate handling (MGRS, Lat/Lng, Address)
- ✅ Transactional integrity and lazy creation patterns
- ✅ Rate-limited external API integration
- ✅ Comprehensive OpenAPI documentation

The architecture is **ready for horizontal scaling** (more feature modules) and provides a solid foundation for future enhancements like spatial queries, event-driven architecture, and CQRS patterns.

The single `lagekarte` module serves as a reference implementation for future feature modules and demonstrates best practices for NestJS modular design.

---

**Analysis Date:** 2025-11-11  
**Repository:** github.com/rubenvitt/bluelight-hub  
**Branch:** bluelight-hub-255-bmad-6-agent-framework-upgrade
