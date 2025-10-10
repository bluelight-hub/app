# 13. Security & Performance

## 13.1 Security Requirements

**Frontend Security:**
- **CSP (Content Security Policy):**
  ```
  default-src 'self';
  img-src 'self' https://tile.openstreetmap.org;
  connect-src 'self' https://nominatim.openstreetmap.org;
  ```
- **XSS Protection:** Alle User-Inputs werden via Zod validiert (POI-Namen, Adressen)
- **CORS:** Backend erlaubt nur Frontend-Origin (`http://localhost:3001` für Dev)

**Backend Security:**
- **JWT Authentication:** Alle Lagekarte-Endpoints via `JwtAuthGuard`
- **Rate-Limiting:** Geocoding-Service (1 req/s), File-Upload (Max 2MB)
- **Input Validation:** Zod-Schemas für alle DTOs
- **SQL Injection:** Prisma ORM verhindert SQL-Injection
- **File-Upload-Validation:** Nur PNG/JPEG, Max 2MB, File-Type-Check via Multer

**DSGVO-Konformität:**
- Kein Google Maps (keine Drittanbieter-Tracking)
- Self-Hosted Tile-Server-Option (keine OSM-API-Calls)
- Geocoding-Cache enthält keine personenbezogenen Daten (nur Adressen)

---

## 13.2 Performance Optimization

**Frontend:**
- **Lazy-Loading:** Leaflet-Bundle (220KB) nur auf `/lagekarte` Route geladen
- **Bundle-Splitting:** Code-Splitting via React.lazy()
- **POI-Marker-Clustering:** Ab 3+ POIs in 50px Radius
- **Debounced State-Sync:** Nur alle 2s Backend-Update (verhindert API-Flood)
- **IndexedDB-Caching:** Tiles + POI-Daten offline verfügbar

**Backend:**
- **LRU-Cache (Geocoding):** 1000 Einträge, 7 Tage TTL (reduziert Nominatim-Calls)
- **Database Indexing:** Indices auf `lagekarteId`, `einsatzId`, `type` (POI-Queries <50ms)
- **GeoJSON Validation:** Max 5MB State-Size (verhindert DoS)
- **File-Upload-Limits:** Max 2MB pro Screenshot

**Performance-Ziele (NFRs):**
- **Lagekarte-Load-Time:** <2s (mit 1000 POIs)
- **POI-Creation-Time:** <500ms (inkl. Geocoding-Cache-Hit)
- **Tile-Download-Time:** ~4 Min für 500 Tiles (2 req/s OSM-Limit)

---
