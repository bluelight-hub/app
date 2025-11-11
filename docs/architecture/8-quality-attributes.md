# 8. Quality Attributes

## Actually Implemented

### Security

- ✅ **JWT Authentication:** Cookie-based, 3-Token-System
- ✅ **RBAC:** Role-based access control (USER, ADMIN, SUPER_ADMIN)
- ✅ **Audit Logging:** createdBy, updatedBy, deletedBy, archivedBy on all entities
- ✅ **HTTP-Only Cookies:** XSS-Schutz
- ✅ **SameSite Cookies:** CSRF-Schutz
- ✅ **Helmet Middleware:** Security headers
- ✅ **Rate Limiting:** Throttle Guards auf kritischen Endpunkten
- ✅ **Password Hashing:** Bcrypt (für Admin-User)

### Data Integrity

- ✅ **No-Delete Policy:** Einsätze werden nur archiviert, nie gelöscht (ADR-017)
- ✅ **Soft-Delete:** User, ETB-Einträge, Textbausteine
- ✅ **10-Year Archival:** ETB mit SHA-256 Checksums (EtbArchiv)
- ✅ **Version History:** Vollständige Nachvollziehbarkeit (EtbEintragHistorie)
- ✅ **Audit Trail:** createdAt, updatedAt, deletedAt, archivedAt
- ✅ **Checksummen:** SHA-256 für Archiv-Integrität

### Reliability

- ✅ **Automatic Token Refresh:** Transparente Token-Erneuerung bei 401
- ✅ **Optimistic Updates:** Sofortiges Feedback mit Rollback (ADR-020)
- ✅ **Request Retry:** Automatic retry bei Netzwerkfehlern (TanStack Query)
- ✅ **Error Boundaries:** Globale Frontend-Error-Handling
- ✅ **Health Checks:** Liveness/Readiness Probes

### Usability

- ✅ **Dark Mode:** ColorModeContext
- ✅ **Keyboard Shortcuts:** Command Palette (CMDK)
- ✅ **Offline Maps:** Leaflet Tiles mit Offline-Region-Download
- ✅ **Toast Notifications:** Sonner für Feedback
- ✅ **Optimistic UI:** Sofortiges Feedback ohne Wartezeit
- ✅ **Form Validation:** Zod-Schemas mit klaren Fehlermeldungen
- ✅ **Responsive Design:** Tailwind CSS Breakpoints

### Maintainability

- ✅ **Modular Architecture:** NestJS Modules + Atomic Design
- ✅ **Generated API Client:** Kein manueller API-Code
- ✅ **TypeScript Everywhere:** Vollständige Type-Safety
- ✅ **OpenAPI Documentation:** Auto-generated Swagger UI
- ✅ **Consistent Code Style:** ESLint + Prettier
- ✅ **Monorepo:** Shared types, consistent tooling

## Not Implemented / Aspirational

### Performance

- ⚠️ **Caching:** Nur TanStack Query Client-Cache (kein Redis/Backend-Cache)
- ❌ **CDN:** Kein CDN für statische Assets
- ❌ **Database Indexing:** Minimal (nur Prisma auto-indexes)
- ❌ **Query Optimization:** Keine expliziten N+1 Optimierungen

### Scalability

- ❌ **Horizontal Scaling:** Nicht implementiert (Single-Instance)
- ❌ **Load Balancing:** Nicht konfiguriert
- ❌ **Database Replication:** Nicht eingerichtet
- ❌ **Message Queue:** Keine Async-Processing

### Offline Capability

- ⚠️ **Offline Maps:** Nur Map-Tiles (keine Daten-Sync)
- ❌ **Service Worker:** Nicht implementiert
- ❌ **IndexedDB:** Keine lokale Datenbank
- ❌ **Sync Engine:** Keine Konfliktauflösung

### Real-Time Communication

- ❌ **WebSocket:** Ordner existiert, aber leer
- ❌ **Server-Sent Events:** Nicht implementiert
- ❌ **Push Notifications:** Nicht implementiert

---
