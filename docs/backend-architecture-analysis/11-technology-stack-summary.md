# 11. Technology Stack Summary

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
