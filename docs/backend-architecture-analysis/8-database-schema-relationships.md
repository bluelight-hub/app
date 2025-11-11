# 8. Database Schema & Relationships

## Lagekarte Schema

```sql
TABLE lagekarte {
  id           CUID PRIMARY KEY
  einsatzId    TEXT UNIQUE NOT NULL (FK → einsatz.id)
  state        JSONB DEFAULT '{}'          -- GeoJSON FeatureCollection
  createdAt    TIMESTAMP DEFAULT now()
  updatedAt    TIMESTAMP DEFAULT now()
  
  UNIQUE(einsatzId)
  INDEX(einsatzId)
  
  FK: einsatz.id ON DELETE CASCADE
}
```

## LagekartePoi Schema

```sql
TABLE lagekarte_poi {
  id           CUID PRIMARY KEY
  lagekarteId  TEXT NOT NULL (FK → lagekarte.id)
  type         ENUM(PoiType)
  name         VARCHAR(255) NULLABLE
  adresse      VARCHAR(500) NULLABLE
  mgrs         VARCHAR(20) NULLABLE           -- Military Grid Reference System
  latitude     FLOAT NOT NULL                 -- Computed from MGRS
  longitude    FLOAT NOT NULL                 -- Computed from MGRS
  icon         VARCHAR(50) NULLABLE
  metadata     JSONB NULLABLE
  createdAt    TIMESTAMP DEFAULT now()
  updatedAt    TIMESTAMP DEFAULT now()
  
  INDEX(lagekarteId)
  
  FK: lagekarte.id ON DELETE CASCADE
}
```

## Relationships

**1:1 Lagekarte ↔ Einsatz**
- One Lagekarte per Einsatz
- Lagekarte is created lazily (not when Einsatz is created)
- Cascade delete: Deleting Einsatz deletes its Lagekarte

**1:N Lagekarte → LagekartePoi**
- One Lagekarte has many POIs
- Cascade delete: Deleting Lagekarte deletes all POIs
- POIs are ordered by createdAt (ascending)

---
