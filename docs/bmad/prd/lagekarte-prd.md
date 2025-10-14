# Bluelight Hub Brownfield Enhancement PRD

**Feature:** Lagekarte für Einsatzkoordination
**Version:** 1.0.0
**Datum:** 2025-10-09
**Status:** Draft
**Autor:** Product Manager (BMad)

---

## 1. Intro Project Analysis and Context

### 1.1 Analysis Source

- ✅ User-provided Market Research (market-research.md)
- ✅ IDE-based project analysis (docs/architecture/)
- ✅ Existing codebase structure review

### 1.2 Current Project State

**Bluelight Hub** ist eine Emergency-Management-Plattform für ehrenamtliche Katastrophenschutz-Bereitschaften (DRK, JUH, MHD, ASB, DLRG).

**Aktueller Funktionsumfang:**
- ✅ **Einsatz Management:** Erstellen, Bearbeiten, Übersicht von Einsätzen
- ✅ **Einheiten Management:** Verwaltung von Fahrzeugen und Personal
- ✅ **ETB (Einsatztagebuch):** Digitale Protokollierung
- ✅ **Authentication:** JWT-basierte Authentifizierung mit Rollen-System
- ✅ **Desktop/Mobile:** Cross-Platform via Tauri v2

**Technologie-Foundation:**
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Headless UI (Atomic Design)
- **Backend:** NestJS 11 + Prisma 6 + PostgreSQL 17 (Modulare Architektur)
- **Deployment:** Docker + Docker Compose
- **Monorepo:** pnpm Workspaces (Frontend, Backend, Shared)

### 1.3 Available Documentation Analysis

**✅ Verfügbare Dokumentation:**
- ✅ Tech Stack Documentation (`docs/architecture/tech-stack.md`)
- ✅ Source Tree/Architecture (`docs/architecture/source-tree.md`)
- ✅ Coding Standards (`docs/architecture/coding-standards.md`)
- ✅ arc42 Architecture (docs/architecture/*.adoc)
- ⚠️ UX/UI Guidelines (Tailwind-based, keine expliziten Docs)
- ⚠️ Technical Debt Documentation (in ADRs erwähnt)

**Hinweis:** Projekt ist gut dokumentiert, keine zusätzliche `document-project`-Analyse nötig.

### 1.4 Enhancement Scope Definition

**Enhancement Type:**
- ☑️ **New Feature Addition** (Lagekarte ist komplett neu)
- ☐ Major Feature Modification
- ☐ Integration with New Systems
- ☐ Performance/Scalability Improvements
- ☐ UI/UX Overhaul
- ☐ Technology Stack Upgrade

**Enhancement Description:**
Implementierung einer **interaktiven Lagekarte** für Einsatzkoordination. Die Lagekarte visualisiert Einsatzorte, Points of Interest (POIs) und taktische Bereiche auf einer Karte. Nutzer können POIs platzieren (Fahrzeuge, Gefahrenquellen, Versorgungspunkte), Gefahrenbereiche zeichnen, Rettungswege einzeichnen und offline arbeiten (Tile-Caching). Integration mit bestehendem Einsatz- und ETB-System für Lage-Export.

**Impact Assessment:**
- ☐ Minimal Impact (isolated additions)
- ☑️ **Moderate to Significant Impact** (new backend modules, frontend integration)
- ☐ Major Impact (architectural changes required)

**Begründung:** Neue Feature-Module (Lagekarte-Component, Drawing-Tools, Offline-Service, POI-Management), Integration mit bestehenden Einsatz-Daten. Backend-Erweiterungen substanziell (neue Entities, POI-CRUD-API, File-Upload). Frontend erhält neues Organisms-Modul.

### 1.5 Goals and Background Context

**Goals:**
- **G1:** Visualisierung der Einsatzlage auf interaktiver Karte (Einsatzorte, POIs, taktische Bereiche)
- **G2:** POI-Management (Fahrzeuge, Einheiten, Gefahrenquellen, Versorgungspunkte, etc.)
- **G3:** Offline-Fähigkeit via Browser-Tile-Caching (für Funklöcher/Zivilschutz-Szenarien)
- **G4:** Drawing-Tools für Gefahrenbereiche, Rettungswege und Sperrbereiche
- **G5:** Multi-Layer-Support (POIs, Zeichnungen, Ein-/Ausblenden)
- **G6:** Integration mit ETB (Export von Lage-Screenshots ins Einsatztagebuch)

**Out of Scope:**
- ❌ Real-time GPS-Tracking → [Issue #238](https://github.com/rubenvitt/bluelight-hub/issues/238)
- ❌ DIN 14034 Taktische Zeichen (offiziell) → [Issue #239](https://github.com/rubenvitt/bluelight-hub/issues/239)
- ❌ Komplexe Shapes (Kreise, Freihand) → v2

**Background Context:**

Aktuell nutzen 60-70% der ehrenamtlichen Bereitschaften **WhatsApp + Google Maps** für Koordination - eine unprofessionelle, DSGVO-problematische Lösung. Bluelight Hub bietet bereits digitales Einsatz-Management, aber fehlt die **visuelle Lage-Übersicht**.

**Warum jetzt?**
- **Digitalisierungswelle:** Post-COVID haben Bereitschaften digitale Tools adoptiert
- **Klimawandel:** Mehr Katastrophen-Einsätze (+40% seit 2019) → höherer Koordinations-Bedarf
- **Generationswechsel:** Jüngere Helfer (Digital Natives) fordern moderne Tools
- **Blue Ocean:** Kein etablierter Open-Source-Konkurrent im Markt (Market Research validiert)

**Fit mit bestehendem Projekt:**
Lagekarte vervollständigt das Emergency-Management-Trio: **Einsatz-Verwaltung** (✅ vorhanden) + **Lagekarte** (🆕 neu) + **ETB** (✅ vorhanden) = umfassende Einsatz-Koordination.

### 1.6 Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial Creation | 2025-10-09 | 1.0.0 | Brownfield PRD für Lagekarte-Feature (Hybrid-Scope mit Offline-Light) | Product Manager (BMad) |
| Scope Adjustment | 2025-10-09 | 1.0.1 | GPS-Tracking entfernt → Issue #238, DIN 14034 → Issue #239 | Product Manager (BMad) |
| POI-Konzept | 2025-10-09 | 1.0.2 | POI-Tabelle statt direkte Einsatz-Koordinaten, KatS-fokussierte POI-Typen | Product Manager (BMad) |

---

## 2. Requirements

### 2.1 Functional Requirements

**FR1:** Die Lagekarte zeigt eine interaktive Karte mit OpenStreetMap-Tiles an, die in der Einsatzübersicht integriert ist.

**FR2:** POI-Management-System verwaltet Points of Interest (Einsatzorte, Fahrzeuge, Gefahrenquellen, Versorgungspunkte, etc.) mit Geocoding-Unterstützung.

**FR3:** Nutzer können POIs manuell auf der Karte platzieren (Typ-Auswahl: Fahrzeug, Einheit, Gefahrenquelle, Versorgungspunkt, Behandlungsplatz, Sammelstelle, etc.).

**FR4:** Drawing-Tools ermöglichen das Zeichnen von Gefahrenbereichen (Polygone), Rettungswegen (Linien) und Sperrbereichen (Rechtecke).

**FR5:** Multi-Layer-System erlaubt das Ein-/Ausblenden von POIs (nach Typ filterbar) und Zeichnungen.

**FR6:** Offline-Mode: Nutzer können Karten-Regionen manuell herunterladen (via `leaflet.offline`), Tiles werden in IndexedDB gespeichert und offline verfügbar gemacht.

**FR7:** ETB-Integration: Lagekarte kann als Screenshot exportiert und dem Einsatztagebuch (ETB) hinzugefügt werden.

**FR8:** Lagekarten-State (POIs, Zeichnungen, Layer-Konfiguration) wird im Backend persistiert (neue API: `POST/GET /lagekarte/{id}/*`) und ist Multi-Device-fähig (Server im LAN erreichbar).

**FR9:** Marker-Clustering via `leaflet.markercluster` für skalierbare Darstellung (>100 POIs werden automatisch gruppiert).

### 2.2 Non-Functional Requirements

**NFR1:** Performance: Karte lädt in <2 Sekunden (auf 4G-Verbindung), unterstützt **>1000 POIs** mit Clustering ohne Performance-Degradation (automatische Gruppierung ab 50+ POIs in Viewport).

**NFR2:** Offline-Verfügbarkeit: Heruntergeladene Tiles bleiben 30 Tage in IndexedDB verfügbar (automatische Cleanup-Strategie).

**NFR3:** Mobile-First: Lagekarte ist touch-optimiert (Zoom, Pan, POI-Platzierung) und funktioniert auf Smartphones (Min. 375px Breite).

**NFR4:** Accessibility: Karte erfüllt WCAG 2.1 AA (Keyboard-Navigation, Screen-Reader-Support für POI-Labels).

**NFR5:** Browser-Kompatibilität: Chrome 90+, Firefox 88+, Safari 14+ (moderne Browser mit IndexedDB-Support).

**NFR6:** State-Sync-Performance: Lagekarten-State wird in <500ms vom Backend geladen (bei LAN-Verbindung), Änderungen werden debounced (2s) gespeichert.

### 2.3 Compatibility Requirements

**CR1: Bestehende Einsatz-API:** Lagekarte nutzt existierende `EinsatzService`-API (Read-Only für Einsatzorte), keine Breaking Changes an Einsatz-Daten-Schema.

**CR2: Prisma-Schema Erweiterung:** Neue Entities im Backend (PostgreSQL) für POI-Management und State-Persistierung:

```prisma
model Lagekarte {
  id        String   @id @default(cuid())
  einsatzId String   @unique
  state     Json     @db.JsonB  // GeoJSON für Zeichnungen (Polygone, Linien)
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

**CR3: UI-Konsistenz:** Lagekarte folgt bestehendem Tailwind-Design-System (Atomic Design, Headless UI-Komponenten für Modals/Dropdowns).

**CR4: ETB-Integration:** Screenshot-Export wird als `EtbEintrag` (Kategorie: LAGE) mit Screenshot-Anhang in `metadata.screenshot` gespeichert. File-Storage: Lokales Filesystem (`/uploads/lagekarte/`), Docker-Volume für Persistenz.

**CR5: Backend-API (neue Endpoints):** Lagekarte-Controller + POI-Controller in NestJS:
- `GET /lagekarte/{einsatzId}` - Lagekarten-State abrufen
- `POST /lagekarte/{einsatzId}` - State erstellen/aktualisieren
- `GET /lagekarte/{id}/pois` - Alle POIs abrufen
- `POST /lagekarte/{id}/pois` - POI erstellen
- `PUT /lagekarte/pois/{poiId}` - POI aktualisieren
- `DELETE /lagekarte/pois/{poiId}` - POI löschen
- `POST /lagekarte/{id}/screenshot` - Screenshot-Upload (ETB-Export)
- `POST /einsatz/{id}/geocode` - Geocoding-Service (Nominatim)

**CR6: LAN-Verfügbarkeit:** Backend-Server muss im lokalen Netzwerk erreichbar sein (keine Internet-Verbindung nötig), OSM-Tiles werden via externem CDN (oder Self-Hosted Tile-Server) geladen.

---

## 3. User Interface Enhancement Goals

### 3.1 Integration with Existing UI

**Design-System-Integration:**

Die Lagekarte folgt dem bestehenden **Atomic Design Pattern** und integriert sich nahtlos in das Tailwind-basierte Design-System:

**Atomic Design-Struktur:**
```
atoms/
└── MapMarker/           # Neue: Custom Marker-Icons (POI-Typen)
    ├── MapMarker.tsx
    └── mapMarker.styles.ts

molecules/
└── MapControls/         # Neue: Zoom, Layer-Toggle, Download-Button
    ├── MapControls.tsx
    └── DrawingToolbar/  # Drawing-Tool-Buttons
        └── DrawingToolbar.tsx

organisms/
└── lagekarte/           # Neue: Hauptmodul
    ├── LagekarteView/
    │   ├── LagekarteView.tsx
    │   ├── PoiLayer.tsx
    │   └── DrawingLayer.tsx
    ├── LagekarteToolbar/
    │   └── LagekarteToolbar.tsx
    ├── PoiPlacementModal/
    │   └── PoiPlacementModal.tsx
    └── OfflineRegionModal/
        └── OfflineRegionModal.tsx

templates/
└── DashboardLayout/     # Bestehend, wird erweitert

pages/
└── app/
    └── einsatz/
        └── $einsatzId/
            └── übersicht/
                └── karte.tsx
```

**UI-Komponenten-Reuse:**
- ✅ **Headless UI Modal** (POI-Erstellung, Offline-Download)
- ✅ **Headless UI Dropdown** (Layer-Auswahl, POI-Typ-Filter)
- ✅ **Bestehende Button-Komponenten** (atoms/Button)
- ✅ **Tailwind CSS Classes** (konsistente Farben, Spacing, Typography)

**Farbschema (aus bestehendem Design-System):**
- **Primary:** Tailwind Blue (Einsatzorte)
- **Danger:** Tailwind Red (Gefahrenbereiche, Gefahrenquellen)
- **Success:** Tailwind Green (Rettungswege, Versorgungspunkte)
- **Warning:** Tailwind Yellow (Sperrbereiche)

### 3.2 Modified/New Screens and Views

**Neue Screens:**

1. **Lagekarte-Hauptansicht** (`/app/einsatz/$einsatzId/übersicht/karte`)
   - Full-Screen-Map (90% Viewport-Height)
   - Toolbar (Top): Screenshot-Export, Offline-Download, Layer-Toggle
   - POI-Toolbar (Left): POI-Typ-Auswahl (Fahrzeug, Einheit, Versorgungspunkt, etc.)
   - Drawing-Toolbar (Left): Polygon, Line, Rectangle
   - Layer-Panel (Right): POI-Filter (nach Typ), Drawing-Layer-Toggle

2. **POI-Erstellungs-Modal** (Modal über Lagekarte)
   - POI-Typ-Auswahl (Dropdown)
   - Name-Input (z.B. "Wasserentnahme West")
   - Adresse-Input (optional, für Geocoding)
   - Icon-Auswahl (Standard pro Typ vorausgewählt)
   - Position-Vorschau auf Mini-Map

3. **Offline-Region-Download-Modal** (Modal über Lagekarte)
   - Map-Preview mit Bounding-Box
   - Region-Auswahl (Drag-Bounds)
   - Zoom-Level-Slider (8-18)
   - Download-Button + Progress-Bar

**Modifizierte Screens:**

1. **Einsatz-Detailansicht** (`/app/einsatz/$einsatzId`)
   - Lagekarte ist unter Übersicht-Unternavigation integriert
   - Navigation: SingleEinsatzLayout → Übersicht → Karte

2. **ETB-Ansicht** (`/app/einsatz/$einsatzId/führung/etb`)
   - Screenshot-Anhänge in Einträgen (Kategorie: LAGE)
   - Image-Preview (Lightbox-Modal)

### 3.3 UI Consistency Requirements

**UCR1: Navigation-Konsistenz**

- Lagekarte ist unter Übersicht-Unternavigation integriert
- Breadcrumb: "Einsätze > [Einsatzname] > Übersicht > Karte"
- Navigation-Hierarchie: SingleEinsatzLayout → Übersicht → Karte

**UCR2: Mobile-Responsive-Design**
- Breakpoints wie bestehende App (Tailwind sm/md/lg/xl)
- Mobile (<768px): POI/Drawing-Toolbar wird Bottom-Sheet (Slide-Up)
- Desktop (≥768px): Toolbars links, Layer-Panel rechts

**UCR3: Dark-Mode-Support**
- Map-Tiles: Separate Tile-URL für Dark-Mode (CartoDB Dark Matter)
- UI-Controls: Tailwind `dark:` Klassen wie bestehende Components
- Marker-Icons: SVG mit CSS-Variablen (Farbwechsel bei Dark-Mode)

**UCR4: Loading-States**
- Map-Loading: Bestehender Spinner-Component (atoms/Spinner)
- Tile-Loading: Leaflet-Default-Spinner
- Offline-Download: Progress-Bar (Headless UI)

**UCR5: Error-Handling**
- Geocoding-Fehler: Toast-Notification (bestehender Toast-Service)
- Offline-Download-Fehler: Error-Modal (Headless UI)
- API-Fehler: Standard-Error-Boundary (bestehend)

**UCR6: Accessibility (WCAG 2.1 AA)**
- Keyboard-Navigation: Tab-Order für POI/Drawing-Tools
- Screen-Reader: `aria-label` für Map-Controls
- Color-Contrast: Mindestens 4.5:1 (Tailwind-Farben erfüllen das)
- Focus-Indicators: Tailwind `focus:ring-2` wie bestehende Components

**UCR7: Animation & Transitions**
- Layer-Toggle: Tailwind `transition-opacity duration-300`
- Modal-Open: Headless UI Default-Transitions
- Marker-Zoom: Leaflet-Default-Animations (keine Custom-Animations)

---

## 4. Technical Constraints and Integration Requirements

### 4.1 Existing Technology Stack

**Languages:** TypeScript 5.9.x (Frontend + Backend)

**Frameworks:**
- Frontend: React 18.3.x + Vite 6.1.x
- Backend: NestJS 11.x + Prisma 6.x
- Desktop/Mobile: Tauri v2

**Database:** PostgreSQL 17.x

**Infrastructure:**
- Docker + Docker Compose
- pnpm 10.x (Monorepo)
- Node.js 22.x LTS

**External Dependencies:**
- TanStack Query 5.x (Data Fetching)
- TanStack Store (State Management)
- Tailwind CSS 3.x + Headless UI 2.x

### 4.2 Integration Approach

**Database Integration Strategy:**

Neue Prisma-Entities (siehe CR2):
- `Lagekarte` (1:1 mit `Einsatz`)
- `LagekartePoi` (n:1 mit `Lagekarte`)
- `PoiType` (Enum)

**Migration-Strategie:**
1. Prisma-Migration: `pnpm prisma migrate dev --name add-lagekarte-pois`
2. Lagekarte wird lazy erstellt (beim ersten Lagekarten-Load)
3. Initialer POI (Typ: EINSATZORT) wird beim ersten Load geocoded

**API Integration Strategy:**

**Backend (NestJS) - Neue Module:**
```
packages/backend/src/modules/
├── lagekarte/
│   ├── lagekarte.module.ts
│   ├── controllers/
│   │   ├── lagekarte.controller.ts
│   │   └── poi.controller.ts
│   ├── services/
│   │   ├── lagekarte.service.ts
│   │   ├── poi.service.ts
│   │   └── geocoding.service.ts
│   ├── repositories/
│   │   ├── lagekarte.repository.ts
│   │   └── poi.repository.ts
│   └── dto/
│       ├── create-poi.dto.ts
│       ├── update-poi.dto.ts
│       └── save-lagekarte-state.dto.ts
```

**Frontend Integration Strategy:**

**Neue Packages:**
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

**WICHTIG:** Verwende `@geoman-io/leaflet-geoman-free` statt des veralteten `leaflet-draw`!

**TanStack Query Integration:**
```typescript
// packages/frontend/src/api/hooks/useLagekarteApi.ts
export const useLagekarte = (einsatzId: string) => {
  return useQuery({
    queryKey: ['lagekarte', einsatzId],
    queryFn: () => api.lagekarte().getLagekarte(einsatzId),
  });
};

export const usePois = (lagekarteId: string) => {
  return useQuery({
    queryKey: ['pois', lagekarteId],
    queryFn: () => api.lagekarte().getPois(lagekarteId),
  });
};

export const useCreatePoi = () => {
  return useMutation({
    mutationFn: (data: CreatePoiDto) =>
      api.lagekarte().createPoi(data),
  });
};
```

**Testing Integration Strategy:**

**Backend-Tests:**
- Unit: `poi.service.spec.ts`, `geocoding.service.spec.ts`, `lagekarte.service.spec.ts`
- Integration: `poi.controller.spec.ts` (mit Testcontainers PostgreSQL)

**Frontend-Tests:**
- Unit: `LagekarteView.test.tsx`, `PoiLayer.test.tsx`
- Integration: Mock Leaflet-API (Vitest + Testing Library)

### 4.3 Code Organization and Standards

**File Structure Approach:**
```
packages/frontend/src/
└── components/
    └── organisms/
        └── lagekarte/
            ├── LagekarteView/
            │   ├── LagekarteView.tsx
            │   ├── LagekarteView.test.tsx
            │   ├── useLagekarteState.ts
            │   └── useOfflineDownload.ts
            ├── layers/
            │   ├── PoiLayer.tsx
            │   └── DrawingLayer.tsx
            ├── modals/
            │   ├── PoiPlacementModal.tsx
            │   └── OfflineRegionModal.tsx
            └── toolbar/
                ├── LagekarteToolbar.tsx
                └── DrawingToolbar.tsx

packages/backend/src/modules/
└── lagekarte/
    ├── lagekarte.module.ts
    ├── controllers/
    │   ├── lagekarte.controller.ts
    │   └── poi.controller.ts
    ├── services/
    │   ├── lagekarte.service.ts
    │   ├── poi.service.ts
    │   └── geocoding.service.ts
    ├── repositories/
    │   ├── lagekarte.repository.ts
    │   └── poi.repository.ts
    └── dto/
        ├── create-poi.dto.ts
        ├── update-poi.dto.ts
        └── save-lagekarte-state.dto.ts
```

**Naming Conventions:**
- **Components:** PascalCase (`LagekarteView.tsx`)
- **Hooks:** camelCase mit `use` Prefix (`useLagekarteState.ts`)
- **Services:** PascalCase mit `.service.ts` Suffix
- **DTOs:** kebab-case mit `.dto.ts` Suffix

**Coding Standards:**
- **Frontend:** Bestehende Biome-Config
- **Backend:** NestJS-Conventions (Controller → Service → Repository Pattern)
- **TypeScript:** Strict Mode
- **JSDoc:** Deutsch (für public API-Methoden)

### 4.4 Deployment and Operations

**Build Process Integration:**
```json
{
  "scripts": {
    "build": "pnpm -r build",
    "generate-api": "pnpm --filter @bluelight-hub/shared generate-api"
  }
}
```

**API-Client-Generation:**
```bash
# Nach Backend-Änderungen
pnpm run generate-api
# Generiert: packages/shared/src/client/apis/LagekarteApi.ts
```

**Deployment Strategy:**

**Docker-Compose (Development):**
```yaml
services:
  backend:
    volumes:
      - ./uploads:/app/uploads  # Screenshot-Storage
    environment:
      - NOMINATIM_API_URL=https://nominatim.openstreetmap.org
```

**Prisma-Migration (Production):**
```bash
pnpm --filter @bluelight-hub/backend prisma migrate deploy
```

**Configuration Management:**
```env
# .env (Backend)
NOMINATIM_API_URL=https://nominatim.openstreetmap.org
NOMINATIM_RATE_LIMIT=1
UPLOAD_MAX_FILE_SIZE=2097152
TILE_CACHE_TTL_DAYS=30
```

### 4.5 Risk Assessment and Mitigation

**Technical Risks:**

**R1: Geocoding-API-Limitierungen (Nominatim)**
- **Impact:** 🟢 LOW (Single-Einsatz-Modus = max. 5-10 Geocoding-Requests)
- **Mitigation:**
  - Geocoding-Caching in `LagekartePoi.latitude/longitude`
  - Fallback: Manuelle Koordinaten-Eingabe

**R2: Leaflet-Bundle-Size**
- **Impact:** 🟢 LOW
- **Mitigation:** Code-Splitting (Lagekarte-Route lazy-load)

**R3: IndexedDB-Quota-Überschreitung**
- **Impact:** 🟡 MEDIUM
- **Mitigation:**
  - Quota-Check vor Download
  - User-Warning bei <10% verfügbar
  - Auto-Cleanup (30-Tage-TTL)

**Integration Risks:**

**R4: Prisma-Migration-Fehler**
- **Impact:** 🔴 HIGH
- **Mitigation:**
  - Staging-DB-Test
  - Rollback-Plan

**R5: API-Client-Generation-Fehler**
- **Impact:** 🟡 MEDIUM
- **Mitigation:** CI-Check in GitHub Actions

**Deployment Risks:**

**R6: Upload-Volume-Permissions**
- **Impact:** 🟡 MEDIUM
- **Mitigation:** Dockerfile: `RUN mkdir -p /app/uploads && chown node:node /app/uploads`

---

## 5. Epic and Story Structure

### 5.1 Epic Approach

**Epic Structure Decision:** **Single Comprehensive Epic** - "Lagekarte für Einsatzkoordination"

**Rationale:** Lagekarte ist ein zusammenhängendes Feature-Set (Map + POIs + Drawing + Offline). Mehrere Epics würden künstlich trennen, was logisch zusammengehört. Brownfield-Best-Practice: Ein Epic mit klar sequenzierten Stories für iterativen Roll-out.

### 5.2 Epic 1: Lagekarte für Einsatzkoordination

**Epic Goal:**
Einsatzkräfte können Einsatzlagen visuell auf einer interaktiven, offline-fähigen Karte darstellen, POIs platzieren (Fahrzeuge, Gefahrenquellen, Versorgungspunkte), Gefahrenbereiche zeichnen und Lageinformationen ins ETB exportieren - ohne auf externe Tools (Google Maps, WhatsApp) angewiesen zu sein.

**Integration Requirements:**
- Liest Einsatzorte aus bestehendem Einsatz-Management (Read-Only)
- Speichert Lagekarten-State + POIs im Backend (neue API)
- Integriert mit ETB für Screenshot-Export
- Funktioniert offline (Tile-Caching via IndexedDB)

### 5.3 User Stories

---

#### **Story 1.1: Basic Map-Ansicht mit OSM-Tiles**

Als **Einsatzleiter**,
möchte ich **eine interaktive Karte im Einsatz-Detail sehen**,
damit ich **den Einsatzort geografisch verorten kann**.

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

#### **Story 1.2: POI-Management-System mit Geocoding**

Als **System**,
möchte ich **Points of Interest (POIs) für Lagekarten verwalten**,
damit ich **Einsatzorte, Fahrzeuge, Gefahrenquellen und Versorgungspunkte strukturiert speichern kann**.

**Acceptance Criteria:**
1. Prisma-Schema erweitert: `Lagekarte`, `LagekartePoi`, `PoiType` (Enum)
2. Migration: Lagekarte wird beim ersten Load automatisch erstellt
3. Initialer POI (Typ: EINSATZORT) wird aus `einsatz.einsatzort` geocoded
4. Geocoding-Service: Nominatim-API konvertiert Adressen → Koordinaten
5. POI-CRUD-API:
   - `POST /lagekarte/{id}/pois` (POI erstellen)
   - `GET /lagekarte/{id}/pois` (alle POIs abrufen)
   - `PUT /lagekarte/pois/{poiId}` (POI aktualisieren)
   - `DELETE /lagekarte/pois/{poiId}` (POI löschen)
6. Geocoding-Ergebnis wird in `LagekartePoi` gespeichert
7. Rate-Limiting: Max. 1 Geocoding-Request/Sekunde

**Integration Verification:**
- IV1: Bestehende Einsatz-Erstellung funktioniert (Lagekarte lazy erstellt)
- IV2: POI-API liefert typisierte POIs (Type-Safety)
- IV3: Migration-Rollback getestet

---

#### **Story 1.3: Multi-POI-Marker auf Karte**

Als **Einsatzleiter**,
möchte ich **alle POIs (Einsatzort, Fahrzeuge, Gefahrenquellen) als Marker sehen**,
damit ich **die gesamte Einsatzlage erfassen kann**.

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

#### **Story 1.4: POI manuell platzieren mit Typ-Auswahl**

Als **Einsatzleiter**,
möchte ich **POIs (Fahrzeuge, Gefahrenquellen, Versorgungspunkte) manuell auf der Karte platzieren**,
damit ich **die Einsatzlage strukturiert erfassen kann**.

**Acceptance Criteria:**
1. POI-Toolbar zeigt POI-Typen:
   - Häufig: Fahrzeug, Einheit, Versorgungspunkt, Behandlungsplatz, Sammelstelle
   - Erweitert: Gefahrenquelle, Sperrbereich, Bereitstellungsraum, Unterkunft, Einsatzleitung
   - Fallback: Sonstiges
2. User klickt Typ → Cursor wechselt zu "Platzierungs-Modus"
3. Klick auf Karte → POI-Erstellungs-Modal öffnet sich:
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

#### **Story 1.5: Drawing-Tools für Gefahren-/Sperr-Bereiche**

Als **Einsatzleiter**,
möchte ich **Gefahrenbereiche, Rettungswege und Sperrbereiche zeichnen**,
damit ich **flächige Bereiche visuell markieren kann**.

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

#### **Story 1.6: Marker-Clustering für Skalierbarkeit**

Als **System**,
möchte ich **viele POIs automatisch gruppieren**,
damit ich **auch bei >100 POIs performant bleibe**.

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

#### **Story 1.7: Offline-Tile-Download**

Als **Einsatzkraft**,
möchte ich **Karten-Regionen für Offline-Nutzung herunterladen**,
damit ich **bei Funklöchern oder Zivilschutz-Szenarien arbeiten kann**.

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

#### **Story 1.8: Backend-State-Persistierung**

Als **System**,
möchte ich **den Lagekarten-State im Backend speichern**,
damit ich **Multi-Device-Sync ermögliche**.

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

#### **Story 1.9: ETB-Screenshot-Export**

Als **Einsatzleiter**,
möchte ich **die Lagekarte als Screenshot ins ETB exportieren**,
damit ich **Lageinformationen im Einsatztagebuch dokumentieren kann**.

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

## Anhang

### Referenzen

- Market Research: `docs/market-research.md`
- Tech Stack: `docs/architecture/tech-stack.md`
- Source Tree: `docs/architecture/source-tree.md`
- Coding Standards: `docs/architecture/coding-standards.md`

### Related Issues

- [#238: Real-time GPS-Tracking](https://github.com/rubenvitt/bluelight-hub/issues/238)
- [#239: DIN 14034 Taktische Zeichen](https://github.com/rubenvitt/bluelight-hub/issues/239)

### Abkürzungen

- **POI:** Point of Interest
- **ETB:** Einsatztagebuch
- **KatS:** Katastrophenschutz
- **OSM:** OpenStreetMap
- **GeoJSON:** Geographic JSON (Standard für Geo-Daten)
- **CRUD:** Create, Read, Update, Delete
