# 3. Module Dependencies & Relationships

## Dependency Graph

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

## Internal Service Dependencies

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

## Cross-Module Dependencies

**Lagekarte → Einsatz:**
- Direction: **Read-only import**
- Purpose: Fetch `einsatz.einsatzort` (address) for initial POI creation
- Reason: Event-based decoupling (Einsatz doesn't know about Lagekarte)
- Risk: If Einsatz module changes, Lagekarte might break

## Module Export Analysis

All services are exported from lagekarte.module.ts, allowing other modules to import them. This is fine for read-only access to Lagekarte data.

---
