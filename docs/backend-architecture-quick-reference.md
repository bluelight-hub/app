# Backend Architecture - Quick Reference Guide

## Module Organization

### Single Feature Module (Lagekarte)

```
lagekarte/
├── lagekarte.module.ts          ← Entry point
├── controllers/                 ← HTTP Layer
│   ├── lagekarte.controller.ts   (Lagekarte CRUD + Screenshots)
│   ├── poi.controller.ts         (POI CRUD)
│   └── geocoding.controller.ts   (Address → Coordinates)
│
├── services/                    ← Business Logic
│   ├── lagekarte.service.ts      (Lagekarte lifecycle + Lazy Creation)
│   ├── poi.service.ts            (POI logic + Coordinate conversion)
│   ├── geocoding.service.ts      (Nominatim API integration)
│   └── mgrs-converter.service.ts (MGRS ↔ Lat/Lng conversion)
│
├── repositories/                ← Data Access
│   ├── lagekarte.repository.ts
│   └── poi.repository.ts
│
├── entities/                    ← Swagger Models
│   ├── lagekarte.entity.ts
│   └── lagekarte-poi.entity.ts
│
├── dto/                         ← Request/Response Validation
│   ├── create-poi.dto.ts
│   ├── update-poi.dto.ts
│   ├── save-lagekarte-state.dto.ts
│   └── poi-response.dto.ts
│
└── validators/                  ← Custom Validators
    └── coordinates-or-address.validator.ts
```

---

## Clean Layered Architecture

```
HTTP Layer (Controllers)
    ↓
Business Logic Layer (Services)
    ↓
Data Access Layer (Repositories)
    ↓
Database (PostgreSQL via Prisma)
```

### Each Layer Responsibility

| Layer | What | Not What |
|-------|------|----------|
| **Controller** | HTTP endpoints, validation, auth | Database access, business logic |
| **Service** | Domain logic, transactions, conversions | HTTP concerns, direct DB queries |
| **Repository** | Database queries only | Business logic, HTTP details |

---

## Coordinate System Priority

```
1️⃣  MGRS (Primary)
    Format: "33UVU1234567890"
    Precision: 1 meter
    Usage: Military disaster response
    
2️⃣  Lat/Lng (Fallback)
    Format: (52.52, 13.405)
    Precision: Decimal degrees
    Usage: Universal standard
    
3️⃣  Address (Geocoding)
    Format: "Hauptstraße 1, 10115 Berlin"
    Precision: Converted to Lat/Lng
    Usage: User-friendly input
```

**Storage Strategy:** Both MGRS and Lat/Lng always stored for redundancy

---

## Key Patterns

### 1. Lazy Creation Pattern
- **What:** Lagekarte created on first access, not at Einsatz creation
- **Why:** Avoid database overhead
- **How:** Check → Create in transaction → Return

### 2. Coordinate Priority Processing
- **What:** Smart coordinate format selection
- **Flow:** MGRS > Lat/Lng > Address → Geocode
- **Result:** Always store MGRS + Lat/Lng

### 3. Rate-Limited API Integration
- **Service Level:** 1 req/sec (Nominatim policy)
- **Controller Level:** 10 req/min (user protection)
- **Implementation:** @Throttle decorator

### 4. Graceful Fallback
- **Creation:** Requires valid coordinates
- **Update:** Preserves old coordinates if geocoding fails
- **Behavior:** No exceptions on geocoding failure

---

## API Routes

### Lagekarte Routes
```
GET    /einsatz/:einsatzId/lagekarte
POST   /einsatz/:einsatzId/lagekarte
POST   /einsatz/:einsatzId/lagekarte/screenshot
DELETE /einsatz/:einsatzId/lagekarte/screenshot/:filename
DELETE /einsatz/:einsatzId/lagekarte
```

### POI Routes
```
GET    /einsatz/:einsatzId/lagekarte/pois
POST   /einsatz/:einsatzId/lagekarte/pois
GET    /einsatz/:einsatzId/lagekarte/pois/:poiId
PUT    /einsatz/:einsatzId/lagekarte/pois/:poiId
DELETE /einsatz/:einsatzId/lagekarte/pois/:poiId
```

### Geocoding Routes
```
POST   /einsatz/:einsatzId/geocode
```

---

## Security & Rate Limiting

### Authentication
- JWT Bearer tokens on all endpoints
- Custom `@CurrentUser()` decorator for user context
- `JwtAuthGuard` on all controllers

### Rate Limiting Layers
1. **Global:** 10 req/min (app.module)
2. **Geocoding:** 10 req/min per user (controller)
3. **Nominatim:** 1 req/sec (service)

### File Upload Safety
- PNG/JPEG only
- 10MB max
- Path traversal prevention
- Filename sanitization

---

## Database Schema Highlights

### Lagekarte
```sql
lagekarte {
  id (PK)
  einsatzId (FK, UNIQUE)
  state (JSONB FeatureCollection)
  createdAt, updatedAt
}
```

### LagekartePoi
```sql
lagekarte_poi {
  id (PK)
  lagekarteId (FK → lagekarte)
  type (PoiType enum)
  
  COORDINATES (both stored):
  mgrs (VARCHAR(20))           ← PRIMARY
  latitude (FLOAT)              ← FALLBACK
  longitude (FLOAT)             ← FALLBACK
  
  icon, metadata (optional)
  createdAt, updatedAt
}
```

### Relationships
- **1:1:** Lagekarte ↔ Einsatz (CASCADE on delete)
- **1:N:** Lagekarte → POIs (CASCADE on delete)

---

## Dependencies Between Services

```
LagekarteController
    ↓
LagekarteService
    ├─ LagekarteRepository
    ├─ GeocodingService
    ├─ EinsatzService (read-only)
    └─ PrismaService

PoiController
    ↓
PoiService
    ├─ PoiRepository
    ├─ GeocodingService
    └─ MgrsConverterService

GeocodingController
    ↓
GeocodingService
    ├─ HttpService (Nominatim)
    └─ ConfigService
```

---

## Validation Strategy

### DTOs
- `CreatePoiDto` - Full creation with custom validator
- `UpdatePoiDto` - Partial updates (PartialType)
- `SaveLagekarteStateDto` - State persistence

### Custom Validators
- `@IsCoordinatesOrAddress()` - Requires MGRS OR Lat/Lng OR address

### Validation Flow
```
Request → DTO Validation → Service → Database
         (class-validator)  (business logic)
```

---

## Strengths ✅

1. **Clear separation of concerns** - Each layer has single responsibility
2. **Testability** - Layers can be tested independently
3. **Reusability** - Services exported for other modules
4. **Sophisticated coordinates** - MGRS + Lat/Lng + Geocoding support
5. **Transaction safety** - Lazy creation in transaction
6. **Rate limiting** - Multiple layers of protection
7. **OpenAPI docs** - Swagger decorators on all endpoints

---

## Areas for Improvement ⚠️

1. **ValueObjects** - Consider Lat/Lng or MGRS as ValueObjects
2. **Repository depth** - Could add query builders, spatial queries
3. **Service focus** - Consider extracting coordinate utilities
4. **Error handling** - Inconsistent exception handling
5. **Caching** - No caching for geocoding results
6. **Domain modeling** - Entities are Swagger models, not rich domain objects

---

## Technology Stack

| Concern | Technology |
|---------|-----------|
| **Framework** | NestJS + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Validation** | class-validator |
| **Authentication** | JWT + Passport |
| **API Docs** | Swagger/OpenAPI |
| **HTTP Client** | Axios |
| **Geocoding** | Nominatim (OpenStreetMap) |
| **Coordinates** | mgrs library |
| **Rate Limiting** | NestJS Throttler |
| **Logging** | NestJS Logger |

---

## File Inventory

### Controllers (3)
- lagekarte.controller.ts (≈328 lines)
- poi.controller.ts (≈179 lines)
- geocoding.controller.ts (≈93 lines)

### Services (4)
- lagekarte.service.ts (≈194 lines)
- poi.service.ts (≈305 lines)
- geocoding.service.ts (≈119 lines)
- mgrs-converter.service.ts (≈192 lines)

### Repositories (2)
- lagekarte.repository.ts (≈92 lines)
- poi.repository.ts (≈103 lines)

### DTOs (4)
- create-poi.dto.ts (≈117 lines)
- update-poi.dto.ts (≈21 lines)
- save-lagekarte-state.dto.ts (≈51 lines)
- poi-response.dto.ts

### Validators (1)
- coordinates-or-address.validator.ts (≈73 lines)

### Entities (2)
- lagekarte.entity.ts (≈41 lines)
- lagekarte-poi.entity.ts (≈95 lines)

**Total:** 17 files, ~1,800+ lines of code

---

## Design Decisions

### Why Lazy Creation?
- Optimize database writes
- Defer expensive geocoding
- Ensure Lagekarte consistency on first access
- Automatic initial POI creation from incident address

### Why Store Both MGRS and Lat/Lng?
- MGRS is military standard (primary)
- Lat/Lng is universal standard (fallback)
- Allows queries on either format
- Supports migration scenarios
- Data redundancy

### Why Custom Validator?
- DTO-level validation
- Early failure detection
- Clear error messages
- Prevents invalid POI creation

### Why Multiple Rate Limits?
- Service level: Respect Nominatim ToS
- Controller level: User protection
- Prevent API abuse and costs

---

## Next Steps for Architecture Growth

1. **Add more feature modules** - Follow lagekarte as template
2. **Event-driven updates** - Emit events for POI changes
3. **Spatial queries** - Use PostGIS for distance searches
4. **GraphQL API** - Complement REST API
5. **Caching layer** - Cache geocoding results
6. **CQRS pattern** - Separate read/write operations

---

**Last Updated:** 2025-11-11
