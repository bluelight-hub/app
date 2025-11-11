# Executive Summary

**BlueLight-Hub** is a comprehensive emergency response management system designed for the German Red Cross (Deutsches Rotes Kreuz - DRK). The application facilitates mission management, mission logging (Einsatztagebuch - ETB), and situation mapping (Lagekarte) with military-grade precision using MGRS coordinates.

Built as a **monorepo** with three distinct packages (Backend, Frontend, Shared), the system emphasizes data integrity through audit logging, versioning, and a strict no-delete policy for critical mission data. The architecture supports both web-based and desktop deployment via Tauri 2, enabling offline capabilities and cross-platform distribution.

**Key Differentiators:**
- **10-year archival compliance** with SHA-256 checksums for regulatory adherence
- **No-delete policy** for Einsätze (missions) - only archival allowed
- **MGRS coordinate system** (military precision) with Lat/Lng fallback
- **Automatic versioning** for all ETB entries with complete audit trail
- **Cookie-based JWT authentication** with auto-refresh (XSS protection)
- **Generated API client** enforcing type-safety across frontend-backend boundary

---
