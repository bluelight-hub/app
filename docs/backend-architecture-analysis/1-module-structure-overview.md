# 1. Module Structure Overview

## Current Module Inventory

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

## Lagekarte Module - Detailed Structure

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
