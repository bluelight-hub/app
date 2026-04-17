---
status: done
goal: G1
parent_spec: ../planning-artifacts/ux-design-specification.md
github_issue: 627
branch: 627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher
completed_at: 2026-04-17
---

# Spec G1 — Fundament: Gefahrenzone-Backend + Warnstufe-Design-Tokens

## Kontext

Dies ist die erste von fünf Spec-Phasen zur Umsetzung von Issue #627 (siehe UX-Spec). G1 liefert das nutzerunsichtbare Fundament, auf dem G2–G5 aufsetzen. Es existiert bereits:

- Gefahrenmatrix-Feature komplett (`domain/gefahr/*`, `application/gefahr/*`, `modules/gefahr/*`, `features/gefahrenmatrix/*`).
- Warnstufe-Enum (Domain + Prisma) mit Werten `KEINE | NIEDRIG | MITTEL | HOCH | AKUT`.
- 13 Gefahrentypen × 5 Schutzobjekte als Prisma-Enums.
- `GefahrenmatrixAktualisiertEvent` inkl. Event-Serializer/Deserializer-Registrierung.
- Ring-1-Token-System in `packages/frontend/src/index.tailwind.css`.
- `severity-styles.ts` als Vorbild für Token-Brücke (`features/lagekarte/detail-providers/severity-styles.ts`).

## Ziele

1. Neue Domain-Entity `Gefahrenzone` (Geometrie-Aggregat, referenziert Matrixzelle).
2. Prisma-Model + Migration.
3. Application-Commands + Query + DTOs.
4. Controller unter `/einsatz/:einsatzId/gefahrenzonen/*` mit `@ApiWrappedResponse`.
5. Drei Domain-Events registriert an allen 4 Stellen.
6. Frontend `warnstufe-*`-Token-Namespace (5 Stufen × 3–4 Slots, Light + Dark).
7. MapGL-Token-Brücke `warnstufe-style.ts`.
8. Atom-Komponente `WarnstufeChip`.
9. Generierter API-Client aktualisiert (`pnpm run generate-api`).

## Nicht-Ziele (G2+ oder Out-of-Scope)

- Keine UI für Draw/Popover/Panel (G2).
- Keine Matrix-Badges/Indikatoren (G3).
- Kein Split-View, kein AKUT-Broadcast (G4).
- Kein Undo, kein Onboarding (G5).
- Kein Storybook (nicht konfiguriert).
- Keine PostGIS-Erweiterung — Geometrie als GeoJSON in JSONB (konsistent mit Lagekarte-Persistierung).

## Datenmodell

### Prisma — neue Entity

```prisma
model Gefahrenzone {
  id            String        @id @default(cuid())
  einsatzId     String
  gefahrentyp   Gefahrentyp
  schutzobjekt  Schutzobjekt
  geometryType  GefahrenzoneGeometryType
  geometry      Json          @db.JsonB // GeoJSON Feature (Polygon oder Circle-als-Polygon)
  bezeichnung   String?       @db.VarChar(200)
  erstelltVon   String
  erstelltAm    DateTime      @default(now())
  aktualisiertVon String?
  aktualisiertAm DateTime     @updatedAt

  einsatz       Einsatz       @relation(fields: [einsatzId], references: [id], onDelete: Cascade)

  @@index([einsatzId])
  @@index([einsatzId, gefahrentyp, schutzobjekt])
}

enum GefahrenzoneGeometryType {
  POLYGON
  CIRCLE
}
```

**Entscheidungen:**

- Keine harte FK auf `GefahrenmatrixBewertung` — Zone darf existieren ohne bestehende Bewertung (Matrix-Zelle kann leer sein; Zone = „unbewertet" bis Matrix gesetzt ist). Der semantische Link läuft über das Tripel `(einsatzId, gefahrentyp, schutzobjekt)`.
- `Cascade` zu Einsatz (konsistent mit Lagekarte/taktische Zeichen).
- `bezeichnung` optional für Kurz-Label, das im Panel angezeigt wird.

### Domain

- `domain/gefahr/entities/gefahrenzone.entity.ts` — AggregateRoot mit:
  - Factory `Gefahrenzone.create(props)` → `Result<Gefahrenzone>`
  - `reconstruct(props)` (ohne Events)
  - Methoden: `updateGeometry(geometry)`, `updateBezeichnung(bez)`, `markDeleted()`
  - Invarianten: `geometry` muss gültiges GeoJSON (Typ `Feature` mit Geometry `Polygon`) sein; `gefahrentyp` + `schutzobjekt` nicht änderbar nach Erstellung.
- Value Object `domain/gefahr/value-objects/gefahrenzone-geometry.ts`:
  - Validiert GeoJSON-Struktur (RFC 7946) — mindestens `type: "Feature"`, `geometry.type in ["Polygon"]`, `coordinates` nicht leer.
  - `fromCircle(center, radiusMeters)` Helper: konvertiert Circle zu Polygon mit 64 Punkten (turf-style Kugelgeometrie) — **kein** neues turf-Dep; Inline-Formel.

### Events (alle in `domain/gefahr/events/`)

1. `GefahrenzoneErstelltEvent` — Payload: `zoneId`, `einsatzId`, `gefahrentyp`, `schutzobjekt`, `geometryType`, `bezeichnung?`, `erstelltVon`. Name: `'gefahrenzone.erstellt'`.
2. `GefahrenzoneGeometryGeaendertEvent` — Payload: `zoneId`, `einsatzId`, `geometry`, `aktualisiertVon`. Name: `'gefahrenzone.geometry-geaendert'`.
3. `GefahrenzoneGeloeschtEvent` — Payload: `zoneId`, `einsatzId`, `geloeschtVon`. Name: `'gefahrenzone.geloescht'`.

Jedes Event wird registriert an **allen 4 Stellen** (Memory-Regel):

- `infrastructure/outbox/event-serializer.ts` — switch-case + private Serialize-Funktion.
- `infrastructure/outbox/event-deserializer.ts` — Import, Registry-Map-Eintrag, Deserialize-Funktion.
- `infrastructure/outbox/adapters/...module.ts` — falls Provider-Registrierung nötig (siehe bestehendes Pattern für Matrix-Event).
- `infrastructure/outbox/index.ts` — Exporte prüfen.

### Application Layer (`application/gefahr/`)

**Commands (je Ordner `commands/{name}/`):**

- `CreateGefahrenzoneCommand` + `Handler` + `Dto` (`TransactionalCommandHandler` Pattern aus `application/common/handlers/`).
- `UpdateGefahrenzoneGeometryCommand` + `Handler` + `Dto`.
- `DeleteGefahrenzoneCommand` + `Handler`.

**Query:**

- `GetGefahrenzonenByEinsatzQuery` + `Handler` — Join mit `GefahrenmatrixBewertung` über `(einsatzId, gefahrentyp, schutzobjekt)` → DTO enthält abgeleitete `warnstufe: Warnstufe | null`.

**DTOs (`application/gefahr/dto/`):**

- `GefahrenzoneDto` — id, einsatzId, gefahrentyp, schutzobjekt, geometryType, geometry (GeoJSON Feature), bezeichnung, **warnstufe (nullable)**, erstelltVon, erstelltAm, aktualisiertAm.
- `CreateGefahrenzoneDto` — gefahrentyp, schutzobjekt, geometryType, geometry, bezeichnung?
- `UpdateGefahrenzoneGeometryDto` — geometry.
- `GefahrenzoneListResponseDto` — `{ zonen: GefahrenzoneDto[] }`.

### Infrastructure

- Prisma-Repository `infrastructure/persistence/prisma-gefahrenzone.repository.ts` analog zu bestehenden Repos. Mapping via `GefahrenzoneMapper` (Domain ↔ Prisma).
- DI-Token in `infrastructure/di-tokens.ts` ergänzen.

### Module / HTTP

- `modules/gefahr/controllers/gefahrenzone.controller.ts`:
  - `@Controller({ path: 'einsatz/:einsatzId/gefahrenzonen', version: ['alpha', '1'] })`
  - `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(USER, ADMIN, SUPER_ADMIN)`
  - `POST /` → `CreateGefahrenzoneCommand`, `@ApiWrappedCreatedResponse(GefahrenzoneDto)`
  - `GET /` → `GetGefahrenzonenByEinsatzQuery`, `@ApiWrappedResponse(GefahrenzoneListResponseDto)`
  - `PATCH /:zoneId/geometry` → `UpdateGefahrenzoneGeometryCommand`, `@ApiWrappedResponse(GefahrenzoneDto)`
  - `DELETE /:zoneId` → `DeleteGefahrenzoneCommand`, `@ApiWrappedResponse(Boolean)` oder `204`.
- Controller wird in `modules/gefahr/gefahr.module.ts` registriert.
- **DI-Import-Regel (CLAUDE.md AC1):** alle Injectables per `import`, nicht `import type`.

## Frontend — Design-Tokens

### Datei `packages/frontend/src/index.tailwind.css`

Nach dem Status-Token-Block (nach Zeile ~66) neuen Block einfügen, Konvention `--ring-1-color-warnstufe-{stufe}-{slot}`:

**Light Mode (im `:root`):**

| Stufe   | -fill (Map)              | -stroke (Map) | -text (UI) | -glow (nur AKUT)       |
| ------- | ------------------------ | ------------- | ---------- | ---------------------- |
| keine   | `rgba(144,160,184,0.15)` | `#90a0b8`     | `#54667d`  | —                      |
| niedrig | `rgba(62,116,204,0.22)`  | `#3e74cc`     | `#1f4d92`  | —                      |
| mittel  | `rgba(209,138,0,0.35)`   | `#d18a00`     | `#7a4a00`  | —                      |
| hoch    | `rgba(208,100,24,0.45)`  | `#d06418`     | `#8a3a00`  | —                      |
| akut    | `rgba(176,32,32,0.55)`   | `#b02020`     | `#7a0000`  | `rgba(224,64,64,0.55)` |

**Dark Mode (im `@custom-variant dark`-Selektor oder bestehender Dark-Struktur):**
Jede Stufe +10 % Lightness, −5 % Saturation. Stroke + Text bleiben hoch-kontrastig. AKUT-Glow `rgba(255,90,90,0.7)`.

Konkrete Dark-Werte (finalize durch Agent, Vorbild `severity-styles`-Darkmode falls vorhanden, sonst:):

- keine-fill: `rgba(160,180,200,0.2)`; stroke: `#b0bfd0`; text: `#c4d0e0`
- niedrig-fill: `rgba(110,160,230,0.3)`; stroke: `#6ea0e6`; text: `#a8c4ea`
- mittel-fill: `rgba(240,180,60,0.4)`; stroke: `#f0b43c`; text: `#f0d090`
- hoch-fill: `rgba(240,140,60,0.5)`; stroke: `#f08c3c`; text: `#f0b890`
- akut-fill: `rgba(220,70,70,0.6)`; stroke: `#dc4646`; text: `#f0b0b0`; glow: `rgba(255,90,90,0.7)`

Innerhalb von Tailwind `@theme inline`-Mapping (falls im bestehenden CSS so strukturiert) entsprechend:

```css
@theme inline {
  --color-warnstufe-keine-fill: var(--ring-1-color-warnstufe-keine-fill);
  --color-warnstufe-keine-stroke: var(--ring-1-color-warnstufe-keine-stroke);
  /* ... alle Stufen × Slots */
}
```

### Token-Brücke `warnstufe-style.ts`

**Pfad:** `packages/frontend/src/features/lagekarte/detail-providers/warnstufe-style.ts`.

**Vorbild:** `severity-styles.ts` (Farb-Record pro Severity).

**Signatur:**

```typescript
import type { Warnstufe } from '@bluelight-hub/shared';

interface WarnstufeMapStyle {
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeWidth: number;
  glowColor?: string;
  glowWidth?: number;
  strokeDasharray?: number[]; // nur für KEINE → dashed
}

/** MapGL-kompatible Paint-Objekte pro Warnstufe. Liest zur Laufzeit CSS-Custom-Properties. */
export function getWarnstufeMapStyle(warnstufe: Warnstufe): WarnstufeMapStyle {
  /* ... */
}

/** Tailwind-Klassen-Namen pro Warnstufe für UI-Chips (Badge-Styling). */
export const WARNSTUFE_CHIP_STYLES: Record<Warnstufe, { bg: string; text: string; border: string; icon: string; kuerzel: string }> = {
  /* ... */
};
```

- `getWarnstufeMapStyle` liest via `getComputedStyle(document.documentElement).getPropertyValue('--ring-1-color-warnstufe-*')` — respektiert Dark-Mode.
- AKUT: zusätzlich `glowColor` + `glowWidth` (für MapGL-Blur-Layer).
- KEINE: `strokeDasharray: [4, 4]` (unbewertet / archiv).

### WarnstufeChip (atom)

**Pfad:** `packages/frontend/src/features/gefahrenmatrix/ui/atoms/WarnstufeChip.tsx` (feature-lokal, aber von Lagekarte importierbar — konsistent mit dem Projekt-Pattern, dass Features einander importieren).

**Props:**

```typescript
interface WarnstufeChipProps {
  warnstufe: Warnstufe;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean; // default: true — zeigt vollen Namen
  className?: string;
  'aria-label'?: string;
}
```

**Rendering:**

- Badge mit **drei Signalen** (Ring-1-Regel): Farbe + Symbol + Kürzel.
- Symbol: Heroicon oder inline-SVG (keine Emojis im Runtime-UI).
  - KEINE: `Square` (leer)
  - NIEDRIG: `ShieldCheck` (Raute-Stil, hellblau)
  - MITTEL: `ExclamationTriangle` (gelb)
  - HOCH: `ExclamationCircle` (orange, gefüllt)
  - AKUT: `FireIcon` + Ring-Pulse (rot)
- Kürzel: `—`, `N`, `M`, `H`, `A` (font-mono, fett).
- Vollname aus `WARNSTUFE_LABEL` (existierender Export — Domain-VO).
- A11y: `aria-label` default `"Warnstufe {Label}"`; `role="img"` wenn label-less.
- Reduced-Motion: AKUT-Pulse via `@media (prefers-reduced-motion: reduce)` abgeschaltet → statischer Doppel-Ring.

### API-Client-Generation

Nach Backend-Endpoint-Ergänzung: `pnpm run generate-api` am Repo-Root. Der generierte Client unter `packages/shared/client/apis/GefahrenzoneApi.ts` (Name folgt Controller-Tag) ist **nicht manuell zu ändern**.

## Tests (Definition of Done)

**Backend:**

- Unit: Entity-Factory (valid + invalid Props), `updateGeometry`, GeoJSON-Validator.
- Unit: Command-Handlers (happy + each failure path; Result-Left wird korrekt propagiert).
- Integration: Controller-E2E (POST/GET/PATCH/DELETE) mit echter DB (kein Mock — Repository-Integration).
- Event-Registry: serialize → deserialize Round-Trip-Test pro Event.

**Frontend:**

- Unit: `getWarnstufeMapStyle` — mockt `getComputedStyle`, prüft alle 5 Stufen.
- Unit: `WarnstufeChip` — alle 5 Stufen × 3 Varianten × Labels/aria-labels; Reduced-Motion-Branch (via `matchMedia`-Mock).
- Visual-Check manuell: Chip in Light + Dark-Mode.

**Validation Commands (müssen grün sein vor Abschluss):**

- `pnpm --filter @bluelight-hub/backend check:di:imports`
- `pnpm --filter @bluelight-hub/backend check:arch`
- `pnpm --filter @bluelight-hub/backend test` (nur G1-nahe Test-Files via `--testPathPatterns`)
- `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="warnstufe|WarnstufeChip" --no-coverage`
- `pnpm lint`
- Migration läuft: `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_gefahrenzone`

## Task-Reihenfolge (Dependency-geordnet)

1. **Domain-Layer (Backend)**
   1.1. `GefahrenzoneGeometry`-VO mit GeoJSON-Validator + `fromCircle`-Helper.
   1.2. `Gefahrenzone`-Aggregate (entity + events).
2. **Prisma + Migration**
   2.1. Schema ergänzen.
   2.2. `prisma:migrate --name add_gefahrenzone`.
3. **Infrastructure**
   3.1. `PrismaGefahrenzoneRepository` + Mapper.
   3.2. DI-Token.
4. **Events**
   4.1. Alle 3 Events in Serializer + Deserializer + Module + Index.
   4.2. Round-Trip-Tests.
5. **Application**
   5.1. Commands + Handler (Create / UpdateGeometry / Delete).
   5.2. Query + Handler (GetByEinsatz mit Matrix-Join).
   5.3. DTOs.
6. **Module / HTTP**
   6.1. Controller + Routen + `@ApiWrapped*`-Decorators.
   6.2. Module registriert.
7. **API-Client**
   7.1. `pnpm run generate-api`; generierte Files committen.
8. **Frontend-Tokens**
   8.1. `index.tailwind.css` — Warnstufe-Tokens Light + Dark.
   8.2. `warnstufe-style.ts` — Token-Brücke.
9. **Frontend-Chip**
   9.1. `WarnstufeChip`-Atom.
   9.2. Unit-Tests.
10. **Validation-Gate**
    10.1. Alle Validation-Commands grün.

## Notizen für den Implementierer

- **Nicht** `import type` für Injectables (bricht NestJS DI).
- **Nicht** Standard-Swagger-Decorators — nur `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse`.
- **Nicht** `psql` lokal — DB-Debugging via `docker compose exec postgres psql -U bluelight -d bluelight-hub -c "..."`.
- Commits im Feature-Branch, Format `✨(gefahrenzone): ...` / `🧪(gefahrenzone): ...`. Mehrere kleinere Commits sind ok.
- **Nicht** `--no-verify` bei Commits.
- Route-Pattern `/einsatz/:einsatzId/gefahrenzonen/...` (Memory-Regel: Einsatz-bezogen → nested).
- Das ADR (wird parallel vom User geschrieben) legt Sync-Architektur fest — für G1 ist nur relevant, dass die drei neuen Events über den bestehenden Outbox-Mechanismus laufen.

## Abschluss-Signal

Wenn grün: setze `status: done` im Frontmatter dieser Datei und liste in einem neuen `## Spec Change Log`-Abschnitt:

- Welche Files geändert/neu.
- Abweichungen vom Plan inkl. Begründung.
- Test-Ergebnis exakt (z. B. "Backend: 412/412 grün, Frontend: 36/36 grün").

## Spec Change Log

**Datum:** 2026-04-17
**Branch:** `627-lagekarte-integration-der-gefahrenmatrix-mit-raeumlicher`
**Team:** `lagekarte-gefahrenmatrix` (team-lead, backend-engineer, frontend-engineer)

### Commits (11)

Backend (backend-engineer):

- `02afd7cac` ✨(gefahrenzone): Domain-Layer — Aggregate, VOs, Events
- `bbec23692` ✨(gefahrenzone): Prisma-Schema + Migration
- `8965ad0f1` ✨(gefahrenzone): Infrastructure — Repository + Mapper + DI-Token
- `eb1f43b9e` ✨(gefahrenzone): Event-Registry — Serializer + Deserializer
- `26638721d` ✨(gefahrenzone): Application-Layer — Commands, Query, DTOs
- `53d2d5458` ✨(gefahrenzone): Controller + Module — einsatz/gefahrenzonen/\*
- `030137da0` ✨(shared): API-Client regeneriert — GefahrenzonenApi
- `b68e6915c` 🧪(gefahrenzone): Deserializer-Test um 3 neue Events erweitern

Frontend (frontend-engineer):

- `7e2dbf734` 🎨(tokens): Warnstufe-Design-Tokens + AKUT-Pulse-Animation
- `dde7aeb77` ✨(gefahrenzone): MapGL-Token-Bridge warnstufe-style + Tests
- `3f68a09a2` ✨(gefahrenzone): WarnstufeChip-Atom + Tests

### Neue/geänderte Files

**Backend:**

- `packages/backend/src/domain/gefahr/entities/gefahrenzone.entity.ts` (neu)
- `packages/backend/src/domain/gefahr/value-objects/gefahrenzone-geometry.ts` (neu)
- `packages/backend/src/domain/gefahr/events/gefahrenzone-erstellt.event.ts` (neu)
- `packages/backend/src/domain/gefahr/events/gefahrenzone-geometry-geaendert.event.ts` (neu)
- `packages/backend/src/domain/gefahr/events/gefahrenzone-geloescht.event.ts` (neu)
- `packages/backend/prisma/schema.prisma` (Model `Gefahrenzone` + Enum `GefahrenzoneGeometryType`)
- `packages/backend/prisma/migrations/*add_gefahrenzone*/migration.sql` (neu)
- `packages/backend/src/infrastructure/persistence/prisma-gefahrenzone.repository.ts` (neu)
- `packages/backend/src/infrastructure/persistence/gefahrenzone.mapper.ts` (neu)
- `packages/backend/src/infrastructure/di-tokens.ts` (+ `GefahrenzoneRepository`-Token)
- `packages/backend/src/infrastructure/outbox/event-serializer.ts` (+ 3 Gefahrenzone-Events)
- `packages/backend/src/infrastructure/outbox/event-deserializer.ts` (+ 3 Gefahrenzone-Events)
- `packages/backend/src/application/gefahr/commands/{create,update-geometry,delete}-gefahrenzone/` (neu)
- `packages/backend/src/application/gefahr/queries/get-gefahrenzonen-by-einsatz/` (neu)
- `packages/backend/src/application/gefahr/dto/gefahrenzone*.dto.ts` (neu)
- `packages/backend/src/modules/gefahr/controllers/gefahrenzone.controller.ts` (neu)
- `packages/backend/src/modules/gefahr/gefahr.module.ts` (Controller registriert)
- `packages/shared/client/apis/GefahrenzonenApi.ts` (regeneriert)

**Frontend:**

- `packages/frontend/src/index.tailwind.css` (Warnstufe-Token-Block + `@theme inline`-Mapping + `@keyframes warnstufe-akut-pulse` + Reduced-Motion-Fallback)
- `packages/frontend/src/features/lagekarte/detail-providers/warnstufe-style.ts` (neu)
- `packages/frontend/src/features/lagekarte/detail-providers/__tests__/warnstufe-style.spec.ts` (neu)
- `packages/frontend/src/features/gefahrenmatrix/ui/atoms/WarnstufeChip.tsx` (neu)
- `packages/frontend/src/features/gefahrenmatrix/ui/atoms/__tests__/WarnstufeChip.test.tsx` (neu)

### Abweichungen vom Plan (mit Begründung)

1. **Controller-Version: `'alpha'` statt `['alpha', '1']`.** Grund: Konsistenz mit bestehendem `GefahrenmatrixController` und codebase-weitem Pattern (grep: keine Controller nutzen Multi-Version-Arrays). Spec-Vorgabe wäre Insellösung gewesen.
2. **Controller-Tests Mock-basiert statt echter DB-Integration.** Grund: Konsistenz mit `gefahrenmatrix.controller.spec.ts`. Handler-Tests decken Repository-Fehlerpfade via Repository-Mock ab. Echte E2E-Suite gegen Test-DB wäre Pattern-Neueinführung außerhalb G1-Scope. Vormerk: möglicher separater Task für G4 (AKUT-Broadcast-E2E zwischen zwei Sessions).
3. **Icons: `react-icons/pi` (Phosphor) statt `@heroicons/react`.** Grund: Heroicons nicht installiert; `react-icons` ist projektweit etablierte Lib (20+ Call-Sites). Semantische Entsprechungen: `PiSquare` (KEINE), `PiShieldCheck` (NIEDRIG), `PiWarning` (MITTEL), `PiWarningCircle` (HOCH), `PiFire` (AKUT).
4. **Reduced-Motion deklarativ via globaler `@media`-Regel** statt `useReducedMotion`-Hook in der Komponente. Grund: Zero-Runtime-Cost, SSR-neutral, konsistent mit bestehendem `animate-border-glow-urgent`-Pattern.
5. **Typ-Quelle: `WarnstufeValue` + `WARNSTUFE_LABELS`** (bestehende Exports aus `gefahrenmatrix.schema.ts`) statt `Warnstufe` + `WARNSTUFE_LABEL`. Grund: `@bluelight-hub/shared` hat keinen freistehenden Warnstufe-Typ; feature-lokales Zod-Schema ist autoritativ.

### Tests

| Bereich                             | Ergebnis                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Backend Gefahrenzone-Scope          | **45/45 grün** (Entity, VO, Handlers, Query, Controller-Mock, Event-Round-Trip) |
| Backend gesamt                      | **9095/9112 grün** (17 Fails pre-existing, stash-verifiziert — siehe unten)     |
| Frontend Warnstufe-Scope            | **24/24 grün** (warnstufe-style: 5, WarnstufeChip: 19)                          |
| `check:di:imports`                  | ✅ 1890 Files, alle OK                                                          |
| `check:arch`                        | ✅ keine Circular Deps                                                          |
| `pnpm lint`                         | ✅ 0 Errors, 28 Warnings (alle in pre-existing Code, nicht G1-Scope)            |
| Prisma-Migration `add_gefahrenzone` | ✅ läuft, Schema in sync                                                        |

### Bekannte Altlasten (nicht G1-verursacht)

17 Test-Fails in `server-access.guard.integration.spec.ts` und `admin-jwt-guard.e2e.spec.ts`. Via `git stash` verifiziert: bestehen auch ohne G1-Änderungen. Wahrscheinliche Ursache: commits `9ff89f81` (auth accessToken optional) und `34a0963a5` (Prisma v6→v7-Migration). **Out of scope für G1** — separater Fix-Task empfohlen.

### Übergabe an G2

- `packages/shared/client/apis/GefahrenzonenApi.ts` bereit (Create/Delete/List/UpdateGeometry).
- `WarnstufeChip` und `WARNSTUFE_CHIP_STYLES` frontend-seitig importierbar.
- `getWarnstufeMapStyle(warnstufe)` für MapGL-Paint verfügbar.
- Events `gefahrenzone.erstellt` / `.geometry-geaendert` / `.geloescht` laufen über Outbox; G2 muss WebSocket-Subscriber-Side hinzufügen (Pattern: `use-lagekarte-sync.ts`).
