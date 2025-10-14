# Epic 48: Lagekarte für Einsatzkoordination

**Epic ID:** 48
**Status:** Draft
**GitHub Issue:** [#48](https://github.com/rubenvitt/bluelight-hub/issues/48)
**PRD:** [lagekarte-prd.md](../../prd/lagekarte-prd.md)
**Version:** 1.0.0
**Datum:** 2025-10-10
**Autor:** Sarah (Product Owner - BMad)

---

## Epic Goal

Einsatzkräfte können Einsatzlagen visuell auf einer **interaktiven, offline-fähigen Karte** darstellen, **POIs platzieren** (Fahrzeuge, Gefahrenquellen, Versorgungspunkte), **Gefahrenbereiche zeichnen** und Lageinformationen ins **ETB exportieren** - ohne auf externe Tools (Google Maps, WhatsApp) angewiesen zu sein.

---

## User Personas

### 👤 FükW-Personal (Führungskraft vom Wachdienst)

**Rolle:** Primärer Bearbeiter der Lagekarte

**Verantwortlichkeiten:**

- Lagekarte aktiv pflegen und aktualisieren
- POIs platzieren (Fahrzeuge, Gefahrenquellen, Versorgungspunkte)
- Gefahrenbereiche und Sperrzonen zeichnen
- Karten-Regionen für Offline-Nutzung vorbereiten
- Lagekarte ins ETB exportieren (Dokumentation)

**Kontext:** Arbeitet in der Führungsstelle, dokumentiert die Einsatzlage kontinuierlich während des Einsatzes.

### 👤 Einsatzleiter

**Rolle:** Primärer Konsument der Lagekarte

**Verantwortlichkeiten:**

- Lageüberblick verschaffen (POIs und Gefahrenbereiche sehen)
- Strategische Entscheidungen basierend auf Lagekarte treffen
- Gelegentliche Korrekturen vornehmen

**Kontext:** Nutzt Lagekarte zur Orientierung und Entscheidungsfindung, delegiert aktive Dokumentation an FükW-Personal.

---

## Existing System Context

### Current Functionality

**Bluelight Hub** ist eine Emergency-Management-Plattform für ehrenamtliche Katastrophenschutz-Bereitschaften (DRK, JUH, MHD, ASB, DLRG).

**Bestehende Features:**

- ✅ **Einsatz Management:** Erstellen, Bearbeiten, Übersicht von Einsätzen
- ✅ **Einheiten Management:** Verwaltung von Fahrzeugen und Personal
- ✅ **ETB (Einsatztagebuch):** Digitale Protokollierung
- ✅ **Authentication:** JWT-basierte Authentifizierung mit Rollen-System
- ✅ **Desktop/Mobile:** Cross-Platform via Tauri v2

### Technology Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Headless UI (Atomic Design)
- **Backend:** NestJS 11 + Prisma 6 + PostgreSQL 17 (Modulare Architektur)
- **Deployment:** Docker + Docker Compose
- **Monorepo:** pnpm Workspaces (Frontend, Backend, Shared)
- **Data Fetching:** TanStack Query 5.x
- **State Management:** TanStack Store

### Integration Points

1. **Einsatz-Management-API:** Lagekarte liest Einsatzorte (Read-Only)
2. **ETB-System:** Screenshot-Export als ETB-Eintrag (Kategorie: LAGE)
3. **Routing:** Unternavigation unter `/app/einsatz/$einsatzId/übersicht/karte`
4. **Backend:** Neue Module (`lagekarte/`, `poi/`)
5. **Database:** Neue Entities (`Lagekarte`, `LagekartePoi`, `PoiType`)

---

## Enhancement Details

### What's Being Added

**Kern-Features:**

1. **Interaktive Karte:** OpenStreetMap-basierte Lagekarte mit Zoom, Pan, Touch-Support
2. **POI-Management:** Platzierung und Verwaltung von Points of Interest (12 POI-Typen: Fahrzeuge, Einheiten, Gefahrenquellen, Versorgungspunkte, etc.)
3. **Drawing-Tools:** Zeichnen von Gefahrenbereichen (Polygone), Rettungswegen (Linien), Sperrbereichen (Rechtecke)
4. **Offline-Mode:** Manueller Tile-Download via IndexedDB (30-Tage-Cache)
5. **Marker-Clustering:** Automatische POI-Gruppierung bei >3 POIs in Nähe (leaflet.markercluster)
6. **ETB-Integration:** Screenshot-Export der Lagekarte ins Einsatztagebuch
7. **Multi-Device-Sync:** Backend-State-Persistierung für LAN-fähige Multi-Device-Nutzung

### How It Integrates

**Backend-Architektur:**

```text
packages/backend/src/modules/
└── lagekarte/
    ├── lagekarte.module.ts
    ├── controllers/
    │   ├── lagekarte.controller.ts    # State-CRUD, Screenshot-Upload
    │   └── poi.controller.ts          # POI-CRUD, Geocoding
    ├── services/
    │   ├── lagekarte.service.ts       # State-Logik
    │   ├── poi.service.ts             # POI-Management
    │   └── geocoding.service.ts       # Nominatim-API-Integration
    ├── repositories/
    │   ├── lagekarte.repository.ts
    │   └── poi.repository.ts
    └── dto/
        ├── create-poi.dto.ts
        ├── update-poi.dto.ts
        └── save-lagekarte-state.dto.ts
```

**Frontend-Architektur (Atomic Design):**

```text
packages/frontend/src/components/
└── organisms/
    └── lagekarte/
        ├── LagekarteView/              # Hauptkomponente
        │   ├── LagekarteView.tsx
        │   ├── useLagekarteState.ts    # TanStack Store
        │   └── useOfflineDownload.ts   # IndexedDB-Logic
        ├── layers/
        │   ├── PoiLayer.tsx            # POI-Marker-Rendering
        │   └── DrawingLayer.tsx        # Leaflet.PM-Integration
        ├── modals/
        │   ├── PoiPlacementModal.tsx   # Headless UI Modal
        │   └── OfflineRegionModal.tsx  # Download-UI
        └── toolbar/
            ├── LagekarteToolbar.tsx    # Zoom, Export, Download
            └── DrawingToolbar.tsx      # Drawing-Tools
```

**Datenbank-Schema (Prisma):**

```prisma
model Lagekarte {
  id        String   @id @default(cuid())
  einsatzId String   @unique
  state     Json     @db.JsonB  // GeoJSON für Zeichnungen
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  einsatz   Einsatz         @relation(fields: [einsatzId], references: [id], onDelete: Cascade)
  pois      LagekartePoi[]

  @@index([einsatzId])
}

model LagekartePoi {
  id           String   @id @default(cuid())
  lagekarteId  String
  type         PoiType
  name         String?  @db.VarChar(255)
  adresse      String?  @db.VarChar(500)
  latitude     Float
  longitude    Float
  icon         String?  @db.VarChar(50)
  metadata     Json?    @db.JsonB

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  lagekarte    Lagekarte @relation(fields: [lagekarteId], references: [id], onDelete: Cascade)

  @@index([lagekarteId])
  @@index([type])
}

enum PoiType {
  EINSATZORT          // Haupt-Alarmierungsadresse
  EINSATZABSCHNITT    // Abschnitt A, B, C
  EINSATZLEITUNG      // Einsatzleitstelle, Führungsstelle
  FAHRZEUG            // Statisch platzierte Fahrzeuge
  EINHEIT             // Statisch platzierte Einheiten
  GEFAHRENQUELLE      // Punktuelle Gefahr (Gasleck, Einsturz-Gebäude)
  SPERRBEREICH        // Absperrpunkt (Eingang zu Sperrzone)
  VERSORGUNGSPUNKT    // Wasser, Strom, Verpflegung
  BEREITSTELLUNGSRAUM // Bereitstellung von Einheiten/Material
  BEHANDLUNGSPLATZ    // Verletzten-Versorgung
  SAMMELSTELLE        // Betroffenen-/Helfer-Sammelpunkt
  UNTERKUNFT          // Notunterkunft
  SONSTIGES           // Custom POI
}
```

**API-Endpoints (neue):**

**Lagekarte-State:**

- `GET /einsatz/{einsatzId}/lagekarte` - Lagekarten-State abrufen
- `POST /einsatz/{einsatzId}/lagekarte` - State erstellen/aktualisieren
- `DELETE /einsatz/{einsatzId}/lagekarte` - State löschen (Cleanup)

**POI-Management:**

- `GET /einsatz/{einsatzId}/lagekarte/pois` - Alle POIs abrufen
- `POST /einsatz/{einsatzId}/lagekarte/pois` - POI erstellen
- `GET /einsatz/{einsatzId}/lagekarte/pois/{poiId}` - Einzelnen POI abrufen
- `PUT /einsatz/{einsatzId}/lagekarte/pois/{poiId}` - POI aktualisieren
- `DELETE /einsatz/{einsatzId}/lagekarte/pois/{poiId}` - POI löschen

**Spezial-Funktionen:**

- `POST /einsatz/{einsatzId}/lagekarte/screenshot` - Screenshot-Upload (ETB-Export)
- `POST /einsatz/{einsatzId}/geocode` - Geocoding-Service (Nominatim)

### Success Criteria

**Business-Metriken:**

- ✅ Lagekarte ersetzt WhatsApp + Google Maps für 60-70% der Nutzer
- ✅ ETB-Einträge enthalten Lage-Screenshots (Kategorie: LAGE)
- ✅ Offline-Nutzung in Funklöchern möglich (Tile-Cache funktioniert)

**Technische Metriken:**

- ✅ Performance: Karte lädt in <2s (auf 4G)
- ✅ Skalierbarkeit: >1000 POIs ohne Performance-Degradation (Clustering)
- ✅ Offline-TTL: 30-Tage-Cache in IndexedDB
- ✅ Mobile-First: Touch-optimiert (Min. 375px Breite)
- ✅ Accessibility: WCAG 2.1 AA (Keyboard-Navigation, Screen-Reader)

---

## Stories

### Story 1.1: Basic Map-Ansicht mit OSM-Tiles

**User Story:**
Als **FükW-Personal**, möchte ich **eine interaktive Karte im Einsatz-Detail sehen**, damit ich **den Einsatzort geografisch verorten und die Lagekarte pflegen kann**.

**Acceptance Criteria:**

1. Lagekarte ist unter `/app/einsatz/$einsatzId/übersicht/karte` erreichbar (Unternavigation unter "Übersicht")
2. Navigation-Hierarchie: SingleEinsatzLayout → Übersicht → Karte
3. Karte zeigt OpenStreetMap-Tiles an (Zoom, Pan funktioniert)
4. Initiale Map-Position: Deutschland-Zentrum (fallback)
5. Mobile-responsive (Touch-Zoom, Swipe-Pan)
6. Loading-Spinner während Tile-Loading
7. Dark-Mode: Map-Tiles wechseln zu CartoDB Dark Matter

**Integration Verification:**

- IV1: Bestehende Einsatz-Detail-Navigation funktioniert
- IV2: Keine Performance-Degradation in anderen App-Bereichen
- IV3: Tailwind-CSS-Konsistenz

---

### Story 1.2: POI-Management-System mit Geocoding

**User Story:**
Als **System**, möchte ich **Points of Interest (POIs) für Lagekarten verwalten**, damit ich **Einsatzorte, Fahrzeuge, Gefahrenquellen und Versorgungspunkte strukturiert speichern kann**.

**Acceptance Criteria:**

1. Prisma-Schema erweitert: `Lagekarte`, `LagekartePoi`, `PoiType` (Enum)
2. Migration: Lagekarte wird beim ersten Load automatisch erstellt
3. Initialer POI (Typ: EINSATZORT) wird aus `einsatz.einsatzort` geocoded
4. Geocoding-Service: Nominatim-API konvertiert Adressen → Koordinaten
5. POI-CRUD-API (8 Endpoints, siehe oben)
6. Geocoding-Ergebnis wird in `LagekartePoi` gespeichert
7. Rate-Limiting: Max. 1 Geocoding-Request/Sekunde

**Integration Verification:**

- IV1: Bestehende Einsatz-Erstellung funktioniert (Lagekarte lazy erstellt)
- IV2: POI-API liefert typisierte POIs (Type-Safety)
- IV3: Migration-Rollback getestet

---

### Story 1.3: Multi-POI-Marker auf Karte

**User Story:**
Als **Einsatzleiter oder FükW-Personal**, möchte ich **alle POIs (Einsatzort, Fahrzeuge, Gefahrenquellen) als Marker sehen**, damit ich **die gesamte Einsatzlage erfassen kann**.

**Acceptance Criteria:**

1. Alle POIs werden als Marker angezeigt (Icons basierend auf `PoiType`)
2. EINSATZORT-POI: Primäres Icon (rot, größer)
3. Andere POIs: Typ-spezifische Icons (Open-Source SVG)
4. Marker-Popup zeigt: POI-Name, Typ, Adresse
5. Map zoomt auf Bounding-Box aller POIs
6. Kein Marker bei fehlenden POIs (Fallback: Deutschland-Zentrum)

**Integration Verification:**

- IV1: POI-Update → Marker aktualisiert sich (TanStack Query)
- IV2: Mehrere POIs → alle Marker sichtbar, Clustering bei >3 in Nähe
- IV3: Performance: <2s Ladezeit bei 20 POIs

---

### Story 1.4: POI manuell platzieren mit Typ-Auswahl

**User Story:**
Als **FükW-Personal**, möchte ich **POIs (Fahrzeuge, Gefahrenquellen, Versorgungspunkte) manuell auf der Karte platzieren**, damit ich **die Einsatzlage strukturiert erfassen und dokumentieren kann**.

**Acceptance Criteria:**

1. POI-Toolbar zeigt POI-Typen (12 Typen: Fahrzeug, Einheit, Versorgungspunkt, etc.)
2. User klickt Typ → Cursor wechselt zu "Platzierungs-Modus"
3. Klick auf Karte → POI-Erstellungs-Modal (Headless UI):
   - Name-Input (z.B. "Versorgungspunkt West")
   - Adresse-Input (optional, für Geocoding)
   - Icon-Auswahl (Standard pro Typ vorausgewählt)
4. Modal-Speichern → POI wird in Backend erstellt
5. POI erscheint als Marker auf Karte
6. POI ist verschiebbar (Drag & Drop → `PUT`)
7. POI ist löschbar (Rechtsklick → "Löschen" → `DELETE`)

**Integration Verification:**

- IV1: POI-CRUD funktioniert (Create, Read, Update, Delete)
- IV2: POI-Änderungen persistieren (Page-Reload → POIs bleiben)
- IV3: Multi-Device: POI auf Device A → erscheint auf Device B nach Reload

---

### Story 1.5: Drawing-Tools für Gefahren-/Sperr-Bereiche

**User Story:**
Als **FükW-Personal**, möchte ich **Gefahrenbereiche, Rettungswege und Sperrbereiche zeichnen**, damit ich **flächige Bereiche visuell markieren und dokumentieren kann**.

**Acceptance Criteria:**

1. Drawing-Toolbar zeigt Zeichnen-Optionen:
   - Polygon: Gefahrenbereich (rot), Sperrbereich (orange)
   - Linie: Rettungsweg (grün), Absperrung (gelb)
   - Rechteck: Schnelle Bereichs-Markierung
2. User wählt Tool → zeichnet auf Karte → Shape erscheint
3. Shapes sind editierbar (Eckpunkte verschieben, löschen)
4. Shapes haben Labels (optional: Text-Input wie "Überschwemmtes Gebiet")
5. Drawing-Layer kann ein-/ausgeblendet werden (Layer-Toggle)

**Unterscheidung POI vs. Drawing:**

- POI (Punkt): GEFAHRENQUELLE (z.B. "Gasleck an Adresse X")
- Drawing (Fläche): Gefahrenbereich-Polygon (z.B. "500m Evakuierungszone")

**Integration Verification:**

- IV1: Zeichnungen werden in `Lagekarte.state` (GeoJSON) gespeichert
- IV2: Mobile: Touch-Drawing funktioniert
- IV3: Performance: >20 Shapes + >50 POIs ohne Lag

---

### Story 1.6: Marker-Clustering für Skalierbarkeit

**User Story:**
Als **System**, möchte ich **viele POIs automatisch gruppieren**, damit ich **auch bei >100 POIs performant bleibe**.

**Acceptance Criteria:**

1. Ab 3+ POIs in Nähe → automatische Cluster-Bildung (leaflet.markercluster)
2. Cluster zeigt Anzahl (z.B. "15 POIs")
3. Klick auf Cluster → Zoom in + Cluster aufteilen
4. Zoom out → POIs werden wieder geclustert
5. Cluster-Icon: Tailwind-Farben (konsistent mit App-Design)

**Integration Verification:**

- IV1: Performance-Test: 1000 POIs → <3s Ladezeit
- IV2: Cluster-Logic funktioniert mit allen POI-Typen
- IV3: Mobile: Touch-Cluster-Navigation

---

### Story 1.7: Offline-Tile-Download

**User Story:**
Als **FükW-Personal**, möchte ich **Karten-Regionen für Offline-Nutzung herunterladen**, damit ich **bei Funklöchern oder Zivilschutz-Szenarien die Lagekarte weiterhin pflegen kann**.

**Acceptance Criteria:**

1. "Offline-Download"-Button in Toolbar
2. Modal öffnet sich: Map-Preview mit Bounding-Box-Auswahl (Drag-to-Select)
3. Zoom-Level-Slider (8-18, Standard: 15)
4. Download-Button → Progress-Bar (Tile-Download in IndexedDB)
5. Quota-Check: Warnung bei <10% verfügbarem Speicher
6. Downloaded Tiles: 30-Tage-TTL (Auto-Cleanup)

**Integration Verification:**

- IV1: Offline-Test: Browser-DevTools → "Offline" → Karte zeigt gecachte Tiles
- IV2: Multi-Region-Downloads möglich
- IV3: Storage-Cleanup funktioniert (nach 30 Tagen)

---

### Story 1.8: Backend-State-Persistierung

**User Story:**
Als **System**, möchte ich **den Lagekarten-State im Backend speichern**, damit ich **Multi-Device-Sync ermögliche**.

**Acceptance Criteria:**

1. Backend-API: `POST /lagekarte/{einsatzId}` (State als GeoJSON speichern)
2. Backend-API: `GET /lagekarte/{einsatzId}` (State laden)
3. Debounced Auto-Save: Änderungen werden nach 2s Inaktivität gespeichert
4. Loading-State: Spinner beim Laden (TanStack Query)
5. Conflict-Handling: "Last-Write-Wins" (kein CRDT für MVP)

**Integration Verification:**

- IV1: Multi-Device-Test: Änderungen auf Device A → sichtbar auf Device B nach Reload
- IV2: Offline-Änderungen → werden beim Reconnect gespeichert
- IV3: Prisma-Schema: `Lagekarte`-Tabelle, Foreign Key funktioniert

---

### Story 1.9: ETB-Screenshot-Export

**User Story:**
Als **FükW-Personal**, möchte ich **die Lagekarte als Screenshot ins ETB exportieren**, damit ich **Lageinformationen im Einsatztagebuch dokumentieren kann**.

**Acceptance Criteria:**

1. "ETB-Export"-Button in Toolbar
2. Screenshot-Generierung (Leaflet-Image-Export oder html2canvas)
3. Screenshot wird als PNG in `/uploads/lagekarte/` gespeichert (Backend)
4. Neuer ETB-Eintrag (Kategorie: LAGE) mit Screenshot-Anhang (`metadata.screenshot.url`)
5. ETB-Ansicht: Screenshot als Lightbox-Preview

**Integration Verification:**

- IV1: ETB-Eintrag erscheint in ETB-Übersicht
- IV2: Screenshot-Qualität: POIs + Zeichnungen + Tiles sichtbar (min. 1024x768px)
- IV3: File-Storage: Screenshot persistiert in Docker-Volume (`./uploads`)

---

## Compatibility Requirements

### CR1: Bestehende Einsatz-API

- ✅ Lagekarte nutzt existierende `EinsatzService`-API (Read-Only für Einsatzorte)
- ✅ **Keine Breaking Changes** an Einsatz-Daten-Schema
- ✅ Lagekarte wird **lazy erstellt** (beim ersten Load)

### CR2: Prisma-Schema Erweiterung

- ✅ Neue Entities: `Lagekarte`, `LagekartePoi`, `PoiType` (Enum)
- ✅ Foreign Key: `Lagekarte.einsatzId → Einsatz.id` (Cascade Delete)
- ✅ **Migration-Strategie:** `pnpm prisma migrate dev --name add-lagekarte-pois`

### CR3: UI-Konsistenz

- ✅ Lagekarte folgt **Atomic Design** (atoms → molecules → organisms)
- ✅ **Tailwind CSS + Headless UI** (keine anderen Frameworks)
- ✅ Dark-Mode-Support (CartoDB Dark Matter Tiles)
- ✅ Mobile-Responsive (Breakpoints: sm/md/lg/xl)

### CR4: ETB-Integration

- ✅ Screenshot-Export als `EtbEintrag` (Kategorie: LAGE)
- ✅ File-Storage: Lokales Filesystem (`/uploads/lagekarte/`)
- ✅ Docker-Volume für Persistenz

### CR5: Backend-API (neue Endpoints)

- ✅ Lagekarte-Controller + POI-Controller in NestJS
- ✅ OpenAPI-Decorators für API-Client-Generation
- ✅ `pnpm run generate-api` → TanStack Query Hooks

### CR6: LAN-Verfügbarkeit

- ✅ Backend-Server im lokalen Netzwerk erreichbar
- ✅ OSM-Tiles via externem CDN (oder Self-Hosted Tile-Server)
- ✅ Geocoding: Nominatim-API (Rate-Limit: 1 req/s)

---

## Risk Mitigation

### R1: Geocoding-API-Limitierungen (Nominatim)

- **Impact:** 🟢 LOW (Single-Einsatz-Modus = max. 5-10 Geocoding-Requests)
- **Mitigation:**
  - Geocoding-Caching in `LagekartePoi.latitude/longitude`
  - Fallback: Manuelle Koordinaten-Eingabe

### R2: Leaflet-Bundle-Size

- **Impact:** 🟢 LOW
- **Mitigation:** Code-Splitting (Lagekarte-Route lazy-load)

### R3: IndexedDB-Quota-Überschreitung

- **Impact:** 🟡 MEDIUM
- **Mitigation:**
  - Quota-Check vor Download
  - User-Warning bei <10% verfügbar
  - Auto-Cleanup (30-Tage-TTL)

### R4: Prisma-Migration-Fehler

- **Impact:** 🔴 HIGH
- **Mitigation:**
  - Staging-DB-Test
  - Rollback-Plan: `pnpm prisma migrate resolve --rolled-back`

### R5: API-Client-Generation-Fehler

- **Impact:** 🟡 MEDIUM
- **Mitigation:** CI-Check in GitHub Actions

### R6: Upload-Volume-Permissions

- **Impact:** 🟡 MEDIUM
- **Mitigation:** Dockerfile: `RUN mkdir -p /app/uploads && chown node:node /app/uploads`

---

## Rollback Plan

**Wenn kritische Fehler auftreten:**

1. **Database Rollback:**

   ```bash
   pnpm --filter @bluelight-hub/backend prisma migrate resolve --rolled-back {migration-name}
   ```

2. **Code Rollback:**
   - Git Revert: `git revert {commit-hash}`

3. **Data Cleanup:**

   ```sql
   DELETE FROM "LagekartePoi";
   DELETE FROM "Lagekarte";
   ```

4. **Frontend Cleanup:**
    - Falsche Routes unter `/einsaetze/$einsatzId/` entfernen
    - Korrekte Route `/einsatz/$einsatzId/übersicht/karte` beibehalten

---

## Definition of Done

- [ ] **Alle 9 Stories abgeschlossen** mit Acceptance Criteria erfüllt
- [ ] **Bestehende Funktionalität verifiziert** (Regression-Tests)
- [ ] **Integration Points funktionieren:**
  - [ ] Einsatz-API (Read-Only)
  - [ ] ETB-Screenshot-Export
  - [ ] Routing (`/app/einsatz/$einsatzId/übersicht/karte`)
- [ ] **Dokumentation aktualisiert:**
  - [ ] API-Dokumentation (OpenAPI/Swagger)
  - [ ] arc42-Architektur-Dokumentation
  - [ ] JSDoc (Deutsch, Public API)
- [ ] **Performance-Metriken erfüllt:**
  - [ ] Karte lädt in <2s (auf 4G)
  - [ ] >1000 POIs ohne Performance-Degradation
- [ ] **Accessibility:** WCAG 2.1 AA
- [ ] **Mobile-Tests:** iOS + Android (via Tauri v2)
- [ ] **Offline-Tests:** Tile-Cache funktioniert in Airplane-Mode
- [ ] **Keine Regression:** Bestehende Features funktionieren

---

## Dependencies & External Libraries

**Neue npm-Packages:**

```json
{
  "leaflet": "latest",
  "react-leaflet": "latest",
  "@geoman-io/leaflet-geoman-free": "latest",
  "leaflet.offline": "latest",
  "leaflet.markercluster": "latest",
  "@types/leaflet": "latest"
}
```

**Backend-Dependencies:**

```json
{
  "@nestjs/axios": "latest"  // Nominatim-API-Calls
}
```

**Environment Variables (Backend):**

```env
NOMINATIM_API_URL=https://nominatim.openstreetmap.org
NOMINATIM_RATE_LIMIT=1
UPLOAD_MAX_FILE_SIZE=2097152
TILE_CACHE_TTL_DAYS=30
```

---

## Story Sequencing Rationale

### Phase 1: Foundation (Stories 1.1-1.3)

1. **Story 1.1** (Map-Ansicht) → Basis-UI + Routing
2. **Story 1.2** (POI-Management) → Backend-Foundation + Geocoding
3. **Story 1.3** (Multi-POI-Marker) → POI-Rendering

### Phase 2: Core Features (Stories 1.4-1.6)

4. **Story 1.4** (POI-Platzierung) → User-Interaktion
5. **Story 1.5** (Drawing-Tools) → Flächige Bereiche
6. **Story 1.6** (Marker-Clustering) → Skalierbarkeit

### Phase 3: Advanced Features (Stories 1.7-1.9)

7. **Story 1.7** (Offline-Download) → Offline-Fähigkeit
8. **Story 1.8** (State-Persistierung) → Multi-Device-Sync
9. **Story 1.9** (ETB-Export) → Integration mit bestehendem System

### Rationale

- **Phase 1:** Minimales MVP (Karte sehen + POIs verwalten)
- **Phase 2:** Usability-Features (Platzierung + Zeichnen + Performance)
- **Phase 3:** Advanced Features (Offline + Sync + ETB)

---

## Related Issues

- [#238: Real-time GPS-Tracking](https://github.com/rubenvitt/bluelight-hub/issues/238) (Out of Scope → v2)
- [#239: DIN 14034 Taktische Zeichen](https://github.com/rubenvitt/bluelight-hub/issues/239) (Out of Scope → v2)
- [#241: Self-Hosted Tile-Server für vollständige Offline-Fähigkeit](https://github.com/rubenvitt/bluelight-hub/issues/241) (Follow-Up → v1.1)

---

## References

- **PRD:** [lagekarte-prd.md](../../prd/lagekarte-prd.md)
- **Tech Stack:** [tech-stack.md](../../../architecture/tech-stack.md)
- **Coding Standards:** [coding-standards.md](../../../architecture/coding-standards.md)
- **Market Research:** [market-research.md](../../../market-research.md)

---

**Epic Owner:** Sarah (Product Owner - BMad)
**Technical Lead:** TBD
**Estimated Effort:** 9 Stories × ~3-5 Tage = **27-45 Tage** (1 Developer, Full-Time)
