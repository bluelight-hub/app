# 5. Service-Level Patterns & Characteristics

## Pattern 1: Lazy Creation Pattern

**Implementation:** `LagekarteService.getOrCreateLagekarte()`

**Why:** Avoid database overhead when creating an Einsatz (incident). Lagekarte is only created when first accessed.

**Transactional Guarantee:** If initial POI creation fails, entire Lagekarte creation is rolled back.

## Pattern 2: Coordinate Priority-Based Processing

**Implementation:** `PoiService.createPoi()` and `PoiService.updatePoi()`

Services intelligently select which coordinate format to use based on priority:
1. MGRS provided → Use MGRS
2. Lat/Lng provided → Convert to MGRS
3. Address provided → Geocode to Lat/Lng, then to MGRS

## Pattern 3: Graceful Fallback on Geocoding Failure

**Behavior:**
- If geocoding fails, no exception is thrown for updates
- For creation: User must provide MGRS or Lat/Lng (address is optional)
- For updates: Old coordinates are preserved if new geocoding fails

## Pattern 4: Rate-Limited External API Integration

**Configuration:**
- **Service-level:** 1 request/second (Nominatim policy)
- **Controller-level:** 10 requests/minute per user

---
