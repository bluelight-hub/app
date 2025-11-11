# 2. Layered Architecture Analysis

## Layering Approach: Standard NestJS Three-Tier Pattern

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

## Layer Responsibilities

### **Layer 1: Controller (HTTP Request Handler)**
- **Files:** `lagekarte.controller.ts`, `poi.controller.ts`, `geocoding.controller.ts`
- **Responsibilities:**
  - HTTP endpoint definition via NestJS decorators (`@Get`, `@Post`, `@Put`, `@Delete`)
  - JWT authentication enforcement (`@UseGuards(JwtAuthGuard)`)
  - Request validation (`ValidationPipe`, custom DTOs)
  - OpenAPI/Swagger documentation
  - File upload handling (multipart/form-data)
  - Logging and error handling
  - Response transformation

### **Layer 2: Service (Business Logic)**
- **Files:** `lagekarte.service.ts`, `poi.service.ts`, `geocoding.service.ts`, `mgrs-converter.service.ts`
- **Responsibilities:**
  - Core domain logic implementation
  - Coordinate system conversions (MGRS ↔ Lat/Lng)
  - Lazy creation patterns (Lagekarte)
  - Transaction management (Prisma transactions)
  - Service-to-service integration (Geocoding, MGRS Converter)
  - Error handling and validation
  - Logging

### **Layer 3: Repository (Data Access)**
- **Files:** `lagekarte.repository.ts`, `poi.repository.ts`
- **Responsibilities:**
  - Encapsulate Prisma client calls
  - Abstract database queries
  - Query composition
  - Data persistence operations
  - No business logic

### **Layer 4: Entities & DTOs (Data Transfer Objects)**
- **Entities:** Swagger API model representations (NOT database entities)
- **DTOs:** Request/response validation models
  - `CreatePoiDto` - POI creation request
  - `UpdatePoiDto` - POI update request (PartialType)
  - `SaveLagekarteStateDto` - State persistence request
- **Validators:** Custom validation constraints
  - `IsCoordinatesOrAddressValidator` - Ensures coordinates OR address provided

---
