# 6. DTO & Validation Architecture

## DTO Hierarchy

```
CreatePoiDto (Full Creation Request)
    └─ Validates: All fields with custom validator @IsCoordinatesOrAddress()
        
UpdatePoiDto (Partial Update Request)
    └─ Extends: PartialType(OmitType(CreatePoiDto, ['lagekarteId']))
    └─ All fields optional except those explicitly omitted

SaveLagekarteStateDto (State Persistence)
    └─ Fields: einsatzId, state (GeoJSON FeatureCollection)
```

## Custom Validator: IsCoordinatesOrAddress

**Purpose:** Ensure POI has at least one valid coordinate source

Validates that at least one of these is provided:
- `mgrs` (Military Grid Reference System)
- `latitude` + `longitude` (Geographic coordinates)
- `adresse` (Address for geocoding)

---
