# 3 — Frontend-Architektur

> React 19 + Vite 6 + Tauri 2 · TanStack-Ökosystem · MapLibre GL mit Custom Drawing-Engine · Atomic-Design-Shared-UI

---

## 3.1 High-Level-Übersicht

```
packages/frontend/
├── src-tauri/               # Rust-Shell (Desktop + Mobile)
│   ├── src/                 # Custom Rust-Commands (Audio, Tray)
│   ├── capabilities/
│   ├── icons/
│   └── tauri.conf.json
└── src/
    ├── features/            # 22 Feature-Module (Domain-orientiert)
    ├── shared/
    │   ├── ui/              # Atomic Design: 46 Atoms · 30 Molecules · 22 Organisms
    │   ├── api/             # fetchWithRefresh, serverStore, Configuration
    │   └── lib/             # cn, MGRS, date-fns-Wrapper
    ├── routes/              # 72 Route-Dateien → routeTree.gen.ts
    ├── provider/            # QueryProvider, ThemeProvider, RouterProvider
    ├── services/            # Cross-Feature-Services (z. B. Audio)
    ├── queryKeys.ts         # Zentrale Query-Key-Typen (ergänzt Feature-Factories)
    ├── index.tailwind.css
    └── main.tsx
```

---

## 3.2 Tech-Stack (vollständig)

### 3.2.1 TanStack-Ökosystem

| Paket                           | Version | Zweck                                                      |
| ------------------------------- | ------- | ---------------------------------------------------------- |
| `@tanstack/react-router`        | 1.168   | File-based Routing, Devtools                               |
| `@tanstack/react-query`         | 5.99    | Server-State (543+ `useQuery` / `useMutation`-Aufrufe)     |
| `@tanstack/react-store`         | 0.10    | Client-State (57 `createStore`-Deklarationen)              |
| `@tanstack/react-form`          | 1.29    | Formularverarbeitung                                       |
| `@tanstack/zod-form-adapter`    | —       | Zod-Integration für `react-form`                           |
| `@tanstack/react-table`         | 8.21    | Datentabellen (Befehl, ETB, Kräfte)                        |
| `@tanstack/react-virtual`       | 3.13    | Virtualisierung großer Listen                              |
| `@tanstack/pacer`               | 0.20    | Request-Optimierung / Rate-Limiting                        |
| `@tanstack/react-devtools`      | 0.10    | Dev-Overlay                                                |

### 3.2.2 UI & Styling

- **Tailwind CSS 4.2** + `@tailwindcss/vite`
- **Headless UI 2.2** — zugängliche, ungestylte Komponenten
- **class-variance-authority 0.7** — Variant-Engine
- `clsx` + `tailwind-merge` via `cn()`-Utility (`shared/lib/cn.ts`)
- **Font:** Inter, Montserrat, Nunito (`@fontsource-variable`)
- **Themes:** `next-themes` (Dark / Light)
- **Icons:** `@heroicons/react`, `@phosphor-icons/react` (Grep im Code)

### 3.2.3 Karten & GIS

> **Hinweis (Memory):** Die Lagekarte nutzt **MapLibre GL + Mapbox-Draw**, nicht Leaflet.PM. Siehe `memory/project_mapgl_migration.md`.

| Paket                           | Zweck                                               |
| ------------------------------- | --------------------------------------------------- |
| `maplibre-gl 5.22`              | Kartenbibliothek (OSM-basiert)                      |
| `react-map-gl 8.1`              | React-Wrapper für MapLibre                          |
| `@mapbox/mapbox-gl-draw 1.5`    | Drawing-Engine (mit 9 Custom Modi)                  |
| `@turf/turf 7.3`                | Geospatial-Operationen (bbox, polygon, intersects)  |
| `mgrs 2.1`                      | Military Grid Reference System                      |

**9 Custom Draw-Modi** (features/lagekarte/drawing/):
`simple-select`, `direct-select`, `draw-arrow`, `draw-circle`, `draw-ellipse`, `draw-rectangle`, `draw-freehand`, `continuous-point`, `gams` (GAMS-Zonen).

Zusätzlich: Hatch-Patterns (Canvas-basiert), DWD WMS-Layer, NINA GeoJSON-Layer, Snap-Control, WebSocket-Live-Sync für kollaborative Karten­änderungen.

### 3.2.4 Tauri 2 Integration

**Plugins** (`packages/frontend/src-tauri/`):

- `tauri-plugin-http` — HTTP-Requests unter Umgehung von CORS
- `tauri-plugin-store` — Key-Value-Store (verschlüsselt, siehe `docs/frontend-tauri-plugin-store-setup.md`)
- `tauri-plugin-deep-link` — Custom Scheme `bluelight://`
- `tauri-plugin-notification` — Native Benachrichtigungen
- `tauri-plugin-single-instance` — Nur eine App-Instanz (Desktop)
- `tauri-plugin-shell` — Shell-Kommandos
- `tauri-plugin-barcode-scanner` — nur Mobile (iOS / Android)
- `tauri-plugin-log`

**Custom Rust-Commands:**

- `play_sound(volume: f32, path: String)` — Audio-Wiedergabe für Erinnerungen via **Rodio**
- `test_audio()` — Audio-Test aus UI
- `update_tray_badge(count: u32)` / `clear_tray_badge()` — System-Tray-Badge

**System-Tray:** Custom Tray mit Kontextmenü (Story 1.9).

### 3.2.5 Weitere Libraries

| Paket                         | Zweck                                                |
| ----------------------------- | ---------------------------------------------------- |
| `socket.io-client 4.8`        | WebSocket zum Backend-Gateway                        |
| `sonner 2.0`                  | Toast-Notifications                                  |
| `recharts 3.8`                | Statistiken, Dashboards                              |
| `date-fns 4.1`                | Datum-Utilities                                      |
| `react-datepicker 9.1`        | Datumspicker                                         |
| `@dnd-kit/*`                  | Drag-and-Drop (Sortierung, Karten-Elemente)          |
| `cmdk 1.1`                    | Command-Palette                                      |
| `dompurify 3.3`               | HTML-Sanitization                                    |
| `consola 3.4`                 | Strukturiertes Logging                               |
| `jsqr 1.4`                    | QR-Code-Parser                                       |

### 3.2.6 Testing

| Paket                         | Zweck                                    |
| ----------------------------- | ---------------------------------------- |
| `vitest 4.1`                  | Test-Runner (Vite-native)                |
| `@testing-library/react 16.3` | RTL                                      |
| `jsdom 29`                    | DOM-Simulation                           |
| `@vitest/coverage-v8`         | Coverage-Reports (LCOV → Codecov)        |
| `@vitest/ui`                  | UI-Mode                                  |

---

## 3.3 Feature-Module (22)

Alle Features unter `packages/frontend/src/features/`. Einheitliche Struktur (mit Abweichungen bei komplexen Features).

| Feature              | Subfolder | Fachlicher Zweck                                                              |
| -------------------- | --------- | ----------------------------------------------------------------------------- |
| **admin**            | 5         | Admin-Konsole: Benutzer, Tokens, Invites, Templates, Konfiguration            |
| **alarmierung**      | 6         | Alert-Dispatch und Benachrichtigungen                                         |
| **aufbewahrung**     | 2         | Archivierung und Daten-Retention                                              |
| **auth**             | 7         | Authentifizierung, Authorization, Guards                                      |
| **befehl**           | 6         | Befehl-Erstellung, Quittierung, Kommentare                                    |
| **einsatz**          | 8         | Kernmodul: Einsatzmanagement und Koordination                                 |
| **etb**              | 9         | Einsatztagebuch mit Offline-Persistence                                       |
| **funkverkehr**      | 7         | Funkprotokoll, Kanalplan, Live-Sync via WebSocket (ADR-006)                   |
| **gefahrenmatrix**   | 3         | Gefahrenanalyse-Matrix (ADR-010)                                              |
| **kategorien**       | 3         | Taxonomie (Einsatz, Notizen)                                                  |
| **kraefte**          | 5         | Ressourcenmanagement: Personal, Fahrzeuge, Einheiten                          |
| **lagekarte**        | 7         | MapGL mit Custom Drawing-Engine                                               |
| **monitoring**       | 2         | Live-Überwachung, Dashboards                                                  |
| **notizen**          | 5         | Freitext-Notizen und Pinnwand                                                 |
| **operative-roles**  | 2         | Rollen & Permissions im Einsatz                                               |
| **reminders**        | 9         | Erinnerungssystem mit Audio-Alerts (Tauri)                                    |
| **server**           | 9         | Server-Discovery, Setup-Wizard, Multi-Server                                  |
| **settings**         | 3         | Benutzereinstellungen (Audio, Sprache)                                        |
| **system**           | 2         | System-Health, Healthchecks                                                   |
| **taktische-zeichen**| 3         | Tactical Symbols (Standard-Bibliothek, Custom Rendering)                      |
| **templates**        | 3         | Befehl- und Führungsrhythmus-Templates                                        |
| **workspace**        | 5         | Multi-Workspace-Support (Feature-Tree, ADR-004)                               |

**Feature-Struktur (Beispiel `einsatz/`):**

```
features/einsatz/
├── api/             # useEinsaetzeQuery, useEinsatzDetailsQuery, Mutations, queries.ts (Query-Keys)
├── ui/
│   ├── atoms/       # Feature-spezifische Atoms
│   ├── molecules/
│   ├── organisms/   # SingleEinsatzDashboard, …
│   └── pages/       # Route-gebundene Seiten
├── contexts/        # React-Contexte
├── constants/
├── stores/          # TanStack Store (UI-State)
├── schemas/         # Zod-Form-Schemas
├── utils/
└── hooks/
```

Besonders komplex:
- **etb/** mit `persistence/`, `services/`, `types/` (Offline-Fähigkeit)
- **lagekarte/** mit `drawing/`, `detail-providers/`
- **reminders/** mit eigenen `services/` für Tauri-Audio-Bindings
- **server/** mit `services/` für Server-Discovery

---

## 3.4 Routing (TanStack Router)

- **File-based:** 72 Route-Dateien in `packages/frontend/src/routes/`, automatisch generierte `routeTree.gen.ts`.
- **Top-Level-Routes:**
  - `/` — Startseite
  - `/auth` — Login / Register (öffentlich)
  - `/admin-login`, `/admin/…` — Admin-Konsole (10+ Sub-Routes)
  - `/app/…` — geschützte App (Auth-Guard)
  - `/server/…` — Server-Setup

- **Nested Layouts:** `/app/einsatz/$einsatzId/…` (parametrisch) mit 10+ Sub-Tabs:
  - **Führung** (befehle, etb, pinnwand, protokoll, berichte, rollen, rhythmus)
  - **Übersicht** (karte, statistik)
  - **Kräfte** (personal, fahrzeuge, einheiten, dashboard)
  - **Patienten** (triage, transport)
  - **Logistik** (material, verbrauch, nachschub)
  - **Sicherheit** (hygiene, gefahren, eigenschutz)
  - **Kommunikation** (funk, alarmierung, meldungen)
  - **Betreuung** (unterkunft, verpflegung, betroffene)
  - **Drohne** (steuerung, luftbilder, live-feed)
  - **Befehl** (Detailbefehle)

- **Auth-Guards:** `/app/*` und `/admin/*` sind via `auth/guards/` geschützt. `/auth`, `/server/setup` sind öffentlich.

- **Eigenschutz-Entity-URLs:** Die Detailpfade sind stabil und dürfen aus UI-Flächen heraus kopiert werden:
  - `/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen/$id`
  - `/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile/$zuweisungId`
  - `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln/$id`
  - `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id`
  - `/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle/$vorfallId`

  Fokus-Search-Params bleiben fachlich typisiert: `focusItem` gehört zu Gefährdungs-Items, `focusGroup` zu PSA-Bekanntgaben und `einheitId` zu betroffenen Einheiten. PSA-Zuweisungs-IDs werden nicht mit `propagationGroupId` vermischt.

---

## 3.5 State-Management

### 3.5.1 Server-State (TanStack Query)

- **Query-Key-Factories** liegen pro Feature in `*/api/queries.ts`:
  ```ts
  export const EINSATZ_QUERY_KEYS = {
    all: ['einsatz'] as const,
    lists: () => [...EINSATZ_QUERY_KEYS.all, 'list'] as const,
    list: (filters) => [...EINSATZ_QUERY_KEYS.lists(), filters] as const,
    details: () => [...EINSATZ_QUERY_KEYS.all, 'detail'] as const,
    detail: (id) => [...EINSATZ_QUERY_KEYS.details(), id] as const,
  };
  ```
- **543+ Vorkommen** von `useQuery` / `useMutation` feature-weit.
- **Granulare Invalidierung** nach Feature-Scope.

### 3.5.2 Client-State (TanStack Store)

- **57 `createStore()`**-Deklarationen über Features.
- Typische Verwendung:
  - UI-State (Modal-Sichtbarkeit, ausgeklappte Panels, Tab-Auswahl)
  - Filter, Sortierung, View-Präferenzen
  - Persistent Stores (ETB Offline-Log, Map-Layers, Workspace-Registry)
- **227 Custom Hooks** kapseln die Stores.

### 3.5.3 Hybrid-Ansatz

| Kategorie            | Technologie                                                   |
| -------------------- | ------------------------------------------------------------- |
| Server-Daten         | TanStack Query (Cache, Refetch, Optimistic Updates)           |
| UI-State             | TanStack Store + Custom Hooks                                 |
| Persistente Config   | `localStorage` + TanStack Store (Hydration)                   |
| Offline-Queue        | Eigene Store-Implementierung im ETB-Feature (`persistence/`)  |
| WebSocket-Stream     | `socket.io-client` → Store-Updates → Query-Invalidation       |

---

## 3.6 Forms (TanStack Form + Zod)

- **Library:** `@tanstack/react-form` + `zodValidator()` aus `@tanstack/zod-form-adapter`.
- **Validation-Source:** Zod-Schemas in `features/*/schemas/*.schema.ts` (20+ Dateien) **und** geteilte Schemas aus `@bluelight-hub/shared/schemas` (Auth, Invite-Codes, Server-URL).
- **Beispiel:**
  ```tsx
  const form = useForm({
    validatorAdapter: zodValidator(),
    defaultValues: { ... },
    onSubmit: async ({ value }) => { /* Mutation */ },
  });
  ```
- **Legacy:** Einzelne Formulare nutzen noch `react-hook-form` (Migration in Arbeit).
- **Fehlertexte:** Konsequent deutsch in Schemas.

---

## 3.7 UI-Komponenten (Atomic Design)

Zentrales Shared-UI in `packages/frontend/src/shared/ui/`:

| Ebene      | Anzahl | Beispiele                                                                 |
| ---------- | -----: | ------------------------------------------------------------------------- |
| Atoms      |     46 | Button, Input, Select, Spinner, Badge, IconWrapper, `cn()`                |
| Molecules  |     30 | FormField, DataTable, ModalBase, CardBase, Navbar, Sidebar                |
| Organisms  |     22 | CommandPalette, MainLayout, KartenZeichenSidebar, FullscreenCloseButton   |
| Templates  |      k.A. | PageLayout-Varianten, DetailView-Template                               |
| Headless   |      6 | ConfirmProvider, `useConfirm`, Provider in `/shared/ui/headless/`         |

**Styling-Pattern:** Tailwind + CVA (Varianten) + `cn()` für dynamische Klassen.

---

## 3.8 Tauri-Integration (`src-tauri/`)

- **Zielplattformen:** macOS (arm64 + x64), Windows, Linux, iOS, Android.
- **Deep-Linking:** Scheme `bluelight://…` — Single-Instance-Handler leitet an Router weiter. Invite-Links nutzen `bluelight://connect?url=...&invite=...`; Entity-Links nutzen `bluelight://open?path=<encoded-internal-path>` und akzeptieren nur interne `/app/einsatz/...`-Pfade.
- **Store-Backend:** siehe `docs/frontend-tauri-plugin-store-setup.md` (Stronghold-basiert, typisierte Singleton-Accessor).
- **CSP:** im Development `null`, Production konfiguriert.
- **Ressourcen:** MP3-Sounds im `sounds/`-Ordner, ausgeliefert als Tauri-Resource.

---

## 3.9 API-Integration

- Generierter Client aus `@bluelight-hub/shared` (OpenAPI Generator `typescript-fetch`, 52 API-Klassen, 475 Modelle).
- **Direkte Nutzung** in Feature-Hooks: `api.einsatz().einsatzControllerFindAllVAlpha({...})` (siehe Kapitel 4 & 9).
- **Fetch-Wrapper:** `packages/frontend/src/shared/api/fetchWithRefresh.ts` mit Token-Refresh-Queue, Cookie-basierter Auth (`credentials: 'include'`).
- **Token-Speicherung:** `shared/lib/server-access-token.ts` (zentraler Accessor).

---

## 3.10 Internationalisierung (i18n)

**Aktuell nicht implementiert.** Alle UI-Strings sind deutsch hardcodiert. Keine i18next/react-intl-Integration. Deutsche Begriffe (`führung`, `befehl`, `einsatz`) auch als Identifier in Routen und Dateinamen.

> Einführung wäre ein nicht-triviales Refactoring — aktuell nicht eingeplant.

---

## 3.11 Testing

- **Framework:** Vitest + React Testing Library (jsdom)
- **Test-Dateien:** ≈ 354 (`*.spec.ts(x)`, `*.test.ts(x)`), ≈ 1.474 Test-Cases
- **Performance-Tests** (`test:performance`):
  - `BefehlsListeMitEingabe.performance.spec.tsx`
  - `SingleEinsatzDashboard.performance.spec.tsx`
  - `EtbEntryList.performance.spec.tsx`
- **Lagekarte Drawing-Modi:** 11+ Tests (Custom Modes sind stark getestet)
- **ETB Offline-Store:** Persistence-Tests
- **Coverage:** LCOV → Codecov-Upload via CI

---

## 3.12 Performance- und Review-Gates

Frontend-Ring-2-Gates definieren verbindliche Schwellen — `docs/frontend/ring-2-performance-gates.md` und `ring-2-review-gates.md`:

- **Bundle-Size, LCP, INP, CLS** Schwellwerte (spezifische Zahlen in der Spec).
- **Review-Checklisten:** Unit Tests, A11y, TypeScript-Strictness.
- **Design Tokens:** Tailwind-Farb-/Spacing-Kontrakt in `ring-1-design-tokens.md`.

---

## 3.13 Frontend Code-Review-Checkliste

- [ ] Keine manuellen `fetch()`-Calls — stattdessen generierter Client via `api.<tag>().<operation>(...)`.
- [ ] Alle Formulare nutzen `@tanstack/react-form` + Zod-Schema.
- [ ] Server-State → TanStack Query · UI-State → TanStack Store.
- [ ] Query-Keys als Factory pro Feature (`FEATURE_QUERY_KEYS`).
- [ ] Komponenten nutzen Shared-UI-Atomic-Elemente (keine duplizierten Inputs/Buttons).
- [ ] Tailwind-Klassen über `cn()` zusammengeführt.
- [ ] Deutsche UI-Strings mit korrekten Umlauten.
- [ ] Tauri-Calls nur via Plugin-APIs (keine Custom IPC ohne Rust-Command-Review).
- [ ] MapLibre statt Leaflet (siehe Memory-Notiz).
- [ ] Ring-2-Performance-Gates eingehalten (Bundle, LCP, INP, CLS).
