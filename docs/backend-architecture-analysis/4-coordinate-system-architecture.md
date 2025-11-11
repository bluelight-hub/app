# 4. Coordinate System Architecture

## Multi-Format Coordinate Support

The lagekarte module supports three coordinate formats with a clear **priority hierarchy**:

```
Priority 1: MGRS (Military Grid Reference System) - PRIMARY
  └─ Format: "33UVU1234567890"
  └─ Precision: 1m (5 digits per axis)
  └─ Auto-converts to Lat/Lng
  └─ Military standard for disaster response

Priority 2: Lat/Lng (Geographic Coordinates) - FALLBACK
  └─ Format: latitude [-90, 90], longitude [-180, 180]
  └─ Direct storage
  └─ Universal standard

Priority 3: Address (Text-based) - GEOCODING
  └─ Format: "Hauptstraße 1, 10115 Berlin"
  └─ Auto-geocoded to Lat/Lng
  └─ User-friendly input
```

## Coordinate Conversion Workflow

**POI Creation Flow:**

```
┌─ MGRS provided ──┐
│                  ├──> MgrsConverterService.mgrsToLatLng() ──> Store MGRS + Lat/Lng
├─ Lat/Lng provided┤
│                  ├──> MgrsConverterService.latLngToMgrs() ──> Store MGRS + Lat/Lng
├─ Address provided┤
│                  ├──> GeocodingService.geocodeAddress() ──>
└─────────────────┘    GeocodingService returns Lat/Lng ──>
                        MgrsConverterService.latLngToMgrs() ──> Store MGRS + Lat/Lng
```

## Data Storage Strategy

**Lagekarte POI Table Schema:**

Both MGRS and Lat/Lng are stored:
- **MGRS** is the primary format (military standard, precise)
- **Lat/Lng** is always computed and stored as fallback
- This allows queries on either format without conversion
- Both formats provide data redundancy and backwards compatibility

---
