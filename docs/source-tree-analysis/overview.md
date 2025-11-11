# Overview

Bluelight-Hub ist eine Desktop-Anwendung für das Blaulicht-Einsatzmanagement, entwickelt als Monorepo mit drei Hauptteilen:

1. **Backend** - NestJS REST API mit Prisma ORM und PostgreSQL
2. **Frontend** - React 19 Desktop-Anwendung mit Tauri 2
3. **Shared** - Generierte TypeScript API-Clients und gemeinsame Typen

**Kernprinzip:** Der gesamte API-Client wird automatisch aus der Backend OpenAPI-Spezifikation generiert. Manuelle API-Helper sind **VERBOTEN**.

**Architekturstil:** Domain-Driven Design (DDD) mit modularem Aufbau
