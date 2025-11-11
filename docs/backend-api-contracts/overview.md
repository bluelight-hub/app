# Overview

Das Bluelight Hub Backend ist eine **NestJS 11**-Anwendung mit **REST API** Endpunkten für:
- **Authentifizierung**: Cookie-basiertes JWT-System mit Access/Refresh Tokens
- **Benutzerverwaltung**: Admin-geschützte Endpunkte für User-Management
- **Einsatzverwaltung**: CRUD-Operationen für Einsätze (Missions)
- **Einsatztagebuch (ETB)**: Versionierte Einsatztagebuch-Einträge
- **Lagekarte**: GeoJSON-basierte Lagekarten mit POIs
- **Health Checks**: Systemstatus und Konnektivitätsprüfungen

**Architektur:**
- Cookie-basierte JWT-Authentifizierung (HTTP-Only Cookies)
- OpenAPI/Swagger Dokumentation auf allen Endpunkten
- Rate-Limiting auf kritischen Endpunkten (Throttle Guards)
- Versionierung: `VERSION_NEUTRAL` (Auth/Health) und `alpha` (Domain-Endpunkte)
- Response-Wrapping via Custom-Interceptor (automatisches `data`-Wrapping)
