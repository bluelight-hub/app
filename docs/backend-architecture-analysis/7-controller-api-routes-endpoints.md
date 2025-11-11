# 7. Controller API Routes & Endpoints

## Route Structure

```
Base Route: /einsatz/:einsatzId/lagekarte (v-alpha)

Lagekarte Endpoints:
  GET    /                              → Get or create lagekarte (lazy)
  POST   /                              → Save lagekarte state (GeoJSON)
  POST   /screenshot                    → Upload lagekarte screenshot (PNG/JPEG)
  DELETE /screenshot/:filename          → Delete lagekarte screenshot
  DELETE /                              → Delete lagekarte (cascade POIs)

POI Endpoints (Base: /einsatz/:einsatzId/lagekarte/pois):
  GET    /                              → List all POIs
  POST   /                              → Create POI
  GET    /:poiId                        → Get single POI
  PUT    /:poiId                        → Update POI
  DELETE /:poiId                        → Delete POI

Geocoding Endpoints (Base: /einsatz/:einsatzId):
  POST   /geocode                       → Geocode address to coordinates
```

## Security & Rate Limiting

**Authentication:** JWT Bearer Token (JwtAuthGuard on all endpoints)

**Rate Limiting:**
- Global: 10 requests/minute (app.module.ts)
- Geocoding: 10 requests/minute per user (geocoding.controller.ts)
- Nominatim API: 1 request/second (geocoding.service.ts)

**File Upload Restrictions:**
- Allowed types: PNG, JPEG
- Max size: 10MB
- Sanitization: Path traversal prevention

---
