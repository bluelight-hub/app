# Key Features

## 1. Einsatzverwaltung (Mission Management)

**Capabilities:**
- Create missions with alarm keywords, location, description
- Status progression: ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT
- Archive missions (no deletion!)
- Bulk archive operations
- Full audit logging

**No-Delete Policy:** Missions can only be archived for 10-year retention.

## 2. Einsatztagebuch (ETB - Mission Log)

**Capabilities:**
- Timestamped entries with priority levels (ROUTINE, WICHTIG, KRITISCH)
- Automatic entry numbering
- Full version history for edits
- Soft-delete entries (never purge)
- Lock ETB after mission completion
- Template system (Textbausteine)

**Archival:** SHA-256 checksums for data integrity verification.

## 3. Lagekarte (Situation Map)

**Capabilities:**
- Interactive Leaflet map with POIs
- MGRS coordinates (military precision) + Lat/Lng fallback
- POI types: FAHRZEUG, EINSATZORT, SAMMELSTELLE, WASSERENTNAHME, GEFAHRENBEREICH, SONSTIGES
- Geocoding via Nominatim API
- Export map as PNG screenshot

## 4. User Management

**Capabilities:**
- Unified authentication (auto-registration on first login)
- Three roles: SUPER_ADMIN, ADMIN, USER
- Password-based admin login
- Passwordless user login
- JWT tokens in httpOnly cookies (XSS protection)

## 5. Audit Logging

**Capabilities:**
- Complete audit trail for all entities
- ETB entry versioning
- 10-year archival with SHA-256 checksums
- Immutable history records

---
