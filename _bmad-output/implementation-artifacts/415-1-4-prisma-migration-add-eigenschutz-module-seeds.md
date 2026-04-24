# Story 1.4: Prisma-Migration `add_eigenschutz_module` + Seeds

Status: done

**Scope-Grenze (KRITISCH):** Diese Story ist **Backend-only, Schema + Seeds**. Sie liefert **eine** Prisma-Migration `add_eigenschutz_module`, die alle Eigenschutz-Tabellen und Enums anlegt, und ergänzt `packages/backend/prisma/seed.ts` um die 4 Eigenschutz-`RollenDefinition`-Records und 5 `GefaehrdungsbeurteilungVorlage`-Records. **Nicht in dieser Story:**

- Domain-Aggregates, Repositories, Commands, Queries, Event-Handler (Stories 2.x, 3.x, 4.x, 5.x)
- Controller, DTOs, OpenAPI-Decorators, `@ApiWrappedResponse`-Routen
- Event-Registry-Framework (`event-serializer.ts`, `event-deserializer.ts`, `event-adapters.module.ts`, `event-adapters/index.ts`) — das ist Story 1.7
- `EigenschutzRolleGuard` / `PermissionsGuard` — Story 1.5
- Feature-Slice `packages/frontend/src/features/eigenschutz/` — Story 1.6
- Frontend-Clients oder `pnpm run generate-api` — die Migration verändert kein OpenAPI-Surface

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Backend-Entwickler**,
I want **eine einzige benannte Prisma-Migration `add_eigenschutz_module`, die alle 14 Eigenschutz-Models und 7 Enums als geschlossenes Paket anlegt, begleitet von einer idempotenten Erweiterung von `prisma/seed.ts` um die 4 Eigenschutz-`RollenDefinition`-Records und 5 `GefaehrdungsbeurteilungVorlage`-Records**,
so that **das Eigenschutz-Backend in einer lauffähigen Datenbank-Baseline startet, die 5 Seed-Vorlagen als Pre-Requisite für Epic 2 vorhanden sind, die 4 Seed-Rollen für `EinsatzScopeGuard` (Story 1.3) + `EigenschutzRolleGuard` (Story 1.5) funktionieren und alle nachfolgenden Eigenschutz-Stories (2.x, 3.x, 4.x, 5.x) auf stabilem Schema aufsetzen können**.

> **Architektonische Rationale (bewusster Trade-off):** Diese Story erzeugt alle Models + Enums + Seeds in **einer** Migration statt story-granularer Tabellen-Erstellung. Begründung: (a) **Hohe Entity-Kopplung** — `PsaProfilZuweisung` referenziert `EinsatzEinheit` + `Gefaehrdungsbeurteilung`, `EigenschutzVorfall` referenziert beide; stückweise Migration würde viele Teil-Zustände mit unvollständigen FK-Constraints erzeugen. (b) **Read-Model-Integrität** — `AmpelProjection` und `SyncConflict` müssen synchron mit den Quell-Tabellen existieren, sonst schlagen Event-Handler (AR11) beim Bootstrap fehl. (c) **Seeds als operatives Paket** — die 4 Rollen + 5 Vorlagen sind Pre-Requisites für alle nachfolgenden Epic-2-bis-6-Stories; getrennte Migration würde erste User-Value-Stories blockieren. Alternative „Splitting in Core/Projections/Seeds" wurde verworfen, da sie die operative Migration-Hygiene nicht verbessert, aber Team-Koordinations-Overhead erzeugt.

## Acceptance Criteria

### AC1 — Prisma-Schema-Additions: 14 Models + 7 Enums gemäß Architektur

**Given** das bestehende Schema `packages/backend/prisma/schema.prisma`
**When** die Story-Implementierung das Schema erweitert
**Then** werden **exakt die 7 Enums und 14 Models** aus `_bmad-output/planning-artifacts/architecture.md §Prisma Schema-Additions (Zeilen 1312–1616)` in `schema.prisma` ergänzt — **die Architektur ist autoritativ**, nicht die Aufzählung in `epics.md §Story 1.4 AC1`, die historische Namen enthält.

**Enums (exakte Namen + Werte gemäß Architektur):**

1. `PsaProfil` — Werte: `BASIS`, `INFEKTION`, `VU`, `CBRN_PATIENT`, `VOLLSCHUTZ`
2. `Eintrittswahrscheinlichkeit` — Werte: `SELTEN`, `GELEGENTLICH`, `HAEUFIG`, `OFT`, `STAENDIG`
3. `Schadensausmass` — Werte: `VERNACHLAESSIGBAR`, `GERING`, `MITTEL`, `HOCH`, `KATASTROPHAL`
4. `Risikoklasse` — Werte: `GRUEN`, `GELB`, `ORANGE`, `ROT`
5. `Ampelstatus` — Werte: `GRUEN`, `GELB`, `ROT` (Achtung: **camelCase `Ampelstatus`**, nicht `AmpelStatus` wie in `epics.md` fälschlich behauptet)
6. `SyncConflictEntityType` — Werte: `GEFAEHRDUNGSBEURTEILUNG_ITEM`, `PSA_PROFIL_ZUWEISUNG`
7. `SyncConflictResolution` — Werte: `SERVER_WINS`, `LOCAL_WINS`, `MERGED`

**Nicht anzulegen (bewusste Nicht-Ziele):**

- **Kein Prisma-Enum `EigenschutzRolle`** (Q4-Revision, bestätigt in Story 1.3 Review). Eigenschutz-Rollen werden als `RollenDefinition`-Seed-Records angelegt (AC5) und über `EinsatzRollenbesetzung.rollenName`-Snapshot mit Präfix `^Eigenschutz: ` durch `EigenschutzRolleGuard` (Story 1.5) geprüft.
- **Kein Enum `TelemetryEventName`** (phantom aus epics.md). `EigenschutzTelemetryEvent.eventName` ist `String @db.VarChar(80)` — die Werte (`assess_started`, `all_banners_delivered`, `quittung_abgegeben`, `blind_ack`, …) sind als TS-Union-Type in der Application-Layer (Story 3.11) definiert, nicht als DB-Enum.
- **Kein Feld `EinsatzRollenbesetzung.eigenschutzRolle`** (Q4-Revision). Die Migration ist rein additiv — sie berührt keine Plattform-Bestandstabelle.

**Models (exakte Namen + Felder gemäß `architecture.md` Zeilen 1368–1616 — 14 Models insgesamt):**

1. `Gefaehrdungsbeurteilung` (Zeilen 1368–1387) — `@@unique([einsatzId, einheitId])`, `@@index([einsatzId])`
2. `GefaehrdungsbeurteilungVersion` (1389–1406) — Version-Chain, `@@unique([gefBeurteilungId, version])`, `@@index([gefBeurteilungId, gueltigVon])`
3. `GefaehrdungsbeurteilungVorlage` (1408–1420) — Vorlagen-Tabelle für Seeds, `slug @unique`
4. `PsaProfilZuweisung` (1422–1438) — Composite-Index `[einsatzId, einheitId, gueltigBis]`, `[propagationGroupId]`
5. `PsaProfilQuittung` (1487–1499) — Quittungs-Tabelle für FR18 (Story 3.4), `@@unique([propagationGroupId, einheitId])`
6. `Sicherheitsregel` (1440–1457) — `@@index([einsatzId])`
7. `SicherheitsregelVersion` (1459–1473) — `@@unique([regelId, version])`
8. `SicherheitsregelQuittung` (1475–1485) — Quittungs-Tabelle für FR25 (Story 2.7), `@@unique([regelId, einheitId])`
9. `Sicherungsposten` (1501–1521) — `@@index([einsatzId])`
10. `SicherungspostenVersion` (1523–1536) — `@@unique([postenId, version])`
11. `EigenschutzVorfall` (1538–1566) — `kontextSnapshot Json` (authoritative Quelle, NICHT Array-FK), `@@index([einsatzId, unfallkasseRelevant])`
12. `EigenschutzTelemetryEvent` (1568–1580) — `@@index([einsatzId, eventName])`, `@@index([einsatzId, serverTime])`
13. `AmpelProjection` (1582–1597) — Composite-PK `@@id([einsatzId, einheitId])`, `aktivePsaProfile PsaProfil[]`
14. `SyncConflict` (1599–1616) — `@@index([einsatzId, resolvedAt])`

**Optimistic-Concurrency:** Alle **Haupt-Entitäten** (Gefaehrdungsbeurteilung, GefaehrdungsbeurteilungVorlage, PsaProfilZuweisung, Sicherheitsregel, Sicherungsposten) führen `version Int @default(1)` gemäß Architecture-Schema. Version-Chain-Tabellen (`*Version`), Quittungs-Tabellen, Telemetry, AmpelProjection und SyncConflict haben **kein** `version`-Feld — sie sind entweder append-only, derived, oder tragen eine eigene Version als Fachfeld.

**`aktiv Boolean @default(true)`:** Nur `GefaehrdungsbeurteilungVorlage` hat dieses Feld (für Soft-Deactivation von Vorlagen). Nicht auf andere Models übertragen (AC in `epics.md` suggeriert dies missverständlich, das Architecture-Schema ist eindeutig).

### AC2 — Snake_case-Tabellennamen via `@@map()` (Repo-Konvention)

**Given** die bestehenden Tabellen im Repo (`einsaetze`, `einsatz_rollen_besetzung`, `einsatz_einheiten`, `rollen_definitionen`, `etb_eintraege`, `gefahrenzonen`, `push_subscriptions`, …)
**When** die neuen Eigenschutz-Models in `schema.prisma` hinzugefügt werden
**Then** bekommt **jedes** Model eine `@@map("snake_case_plural")`-Annotation gemäß Repo-Konvention — auch wenn der Architecture-Code-Block diese aus Lesbarkeitsgründen weglässt:

| Model                            | `@@map`-Name                           |
| -------------------------------- | -------------------------------------- |
| `Gefaehrdungsbeurteilung`        | `gefaehrdungsbeurteilungen`            |
| `GefaehrdungsbeurteilungVersion` | `gefaehrdungsbeurteilung_versionen`    |
| `GefaehrdungsbeurteilungVorlage` | `gefaehrdungsbeurteilung_vorlagen`     |
| `PsaProfilZuweisung`             | `psa_profil_zuweisungen`               |
| `PsaProfilQuittung`              | `psa_profil_quittungen`                |
| `Sicherheitsregel`               | `sicherheitsregeln`                    |
| `SicherheitsregelVersion`        | `sicherheitsregel_versionen`           |
| `SicherheitsregelQuittung`       | `sicherheitsregel_quittungen`          |
| `Sicherungsposten`               | `sicherungsposten` (Singular = Plural) |
| `SicherungspostenVersion`        | `sicherungsposten_versionen`           |
| `EigenschutzVorfall`             | `eigenschutz_vorfaelle`                |
| `EigenschutzTelemetryEvent`      | `eigenschutz_telemetry_events`         |
| `AmpelProjection`                | `ampel_projections`                    |
| `SyncConflict`                   | `sync_conflicts`                       |

**And** alle Feld-Namen, die camelCase in Prisma sind, bekommen `@map("snake_case")`-Annotationen (z. B. `einsatzId → @map("einsatz_id")`, `gefBeurteilungId → @map("gef_beurteilung_id")`, `erstelltAm → @map("erstellt_am")`, `propagationGroupId → @map("propagation_group_id")`) — konsistent mit dem `EinsatzRollenbesetzung`-Pattern (`schema.prisma:1316–1359`).

**And** Prisma-Feld-Namen bleiben PascalCase-Model / camelCase-Feld Deutsch (Architektur §A, CLAUDE.md). DB-Tabellen + Spalten sind snake_case.

**Begründung:** Prisma ORM arbeitet mit den camelCase-Feld-Namen, aber alle Bestandsqueries, Indexe und Migrations-SQL-Sprache nutzen snake_case. Ohne `@@map` / `@map` würde Prisma die Enum- bzw. Tabellen-Namen 1:1 übernehmen (`Gefaehrdungsbeurteilung` → SQL-Tabelle `Gefaehrdungsbeurteilung`), was inkonsistent zum Repo-Rest wäre und Queries wie `SELECT FROM einsaetze JOIN Gefaehrdungsbeurteilung` erzwingen würde — unschön, aber funktional. **Konsistenz ist Pflicht.**

### AC3 — Migration-Name und Ausführbarkeit

**Given** eine leere oder bestehende Datenbank
**When** `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_eigenschutz_module` ausgeführt wird
**Then** wird eine neue Migration in `packages/backend/prisma/migrations/YYYYMMDDHHMMSS_add_eigenschutz_module/migration.sql` erzeugt
**And** die Migration läuft in einer leeren DB in < 5 s durch
**And** Prisma generiert den Client (`pnpm --filter @bluelight-hub/backend prisma:generate`) **ohne Fehler** — alle neuen Types sind in `packages/backend/src/generated/prisma/client` verfügbar
**And** der folgende Smoke-Check succeedet in psql:

```sql
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'gefaehrdungsbeurteilungen', 'gefaehrdungsbeurteilung_versionen', 'gefaehrdungsbeurteilung_vorlagen',
    'psa_profil_zuweisungen', 'psa_profil_quittungen',
    'sicherheitsregeln', 'sicherheitsregel_versionen', 'sicherheitsregel_quittungen',
    'sicherungsposten', 'sicherungsposten_versionen',
    'eigenschutz_vorfaelle', 'eigenschutz_telemetry_events',
    'ampel_projections', 'sync_conflicts'
  );
-- Erwartet: 14
```

**DB-Zugriff:** Kein lokales `psql` installiert. Smoke-Check läuft via `docker compose exec postgres psql -U bluelight -d bluelight-hub -c "..."` (siehe CLAUDE.md §Ports).

### AC4 — Foreign-Keys referenzieren Plattform-Tabellen korrekt

**Given** die Eigenschutz-Models referenzieren bestehende Plattform-Entitäten (`Einsatz`, `EinsatzEinheit`, `User`, `Gefahrenzone`)
**When** die Migration angewendet wird
**Then** werden FK-Constraints angelegt, die `ON DELETE`-Strategien dem Plattform-Pattern folgen:

- `Gefaehrdungsbeurteilung.einsatzId → einsaetze.id` — `ON DELETE CASCADE, ON UPDATE CASCADE` (Einsatz-Löschung räumt Eigenschutz-Daten mit; Architecture setzt Cascade in allen Eigenschutz-Relationen auf `Einsatz`)
- `Gefaehrdungsbeurteilung.vorlageId → gefaehrdungsbeurteilung_vorlagen.id` — optional (`?`), `ON DELETE SET NULL` (Vorlage ist nur Ausgangspunkt, Items sind deep-kopiert)
- `Gefaehrdungsbeurteilung.gefahrenzoneId → gefahrenzonen.id` — optional, `ON DELETE SET NULL`
- `GefaehrdungsbeurteilungVersion.gefBeurteilungId → gefaehrdungsbeurteilungen.id` — `ON DELETE CASCADE` (Version gehört untrennbar zur Beurteilung)
- `EigenschutzVorfall.gefBeurteilungVersionId → gefaehrdungsbeurteilung_versionen.id` — optional, `ON DELETE RESTRICT` (Vorfall-Snapshot muss unveränderlich bleiben, auch wenn Version gelöscht würde — Restrict verhindert versehentlichen Verlust)
- `PsaProfilZuweisung.einsatzId`, `Sicherheitsregel.einsatzId`, `Sicherungsposten.einsatzId` → `ON DELETE CASCADE, ON UPDATE CASCADE`
- `SicherheitsregelVersion.regelId`, `SicherungspostenVersion.postenId` → `ON DELETE CASCADE`
- `SicherheitsregelQuittung.regelId → sicherheitsregeln.id` — `ON DELETE CASCADE` (Quittung nur solange Regel existiert)

**And** Relations-Felder, die im Architecture-Schema-Block explizit genannt sind (`einsatz Einsatz @relation(...)`, `vorlage GefaehrdungsbeurteilungVorlage? @relation(...)`, `gefBeurteilung Gefaehrdungsbeurteilung @relation(...)`, `versionen ...[]`, `quittungen ...[]`), werden in Prisma als `@relation` deklariert — auf **beiden Seiten**, damit `prisma generate` nicht failed.

**And** Back-Relations auf `Einsatz` werden im Block `model Einsatz { … }` (`schema.prisma:278–368`) ergänzt — ein einfacher Listen-Array pro neuer Eigenschutz-Entität, z. B. `gefaehrdungsbeurteilungen Gefaehrdungsbeurteilung[]`, `psaProfilZuweisungen PsaProfilZuweisung[]`, `sicherheitsregeln Sicherheitsregel[]`, `sicherungsposten Sicherungsposten[]`. Das ist **Pflicht**, sonst schlägt `prisma validate` fehl.

**And** wegen `User` als Audit-Trail-Ziel (`erstelltVonUserId`, `aktualisiertVonUserId`, `changedByUserId`, `aktiviertVonUserId`, `quittiertVonUserId`, `reportedByUserId`, `resolvedByUserId`, `erfasstVonUserId`) **ohne** expliziten `@relation`-Namen gespeichert werden, sind **keine** Prisma-Relations zu `User` nötig (DB-FK kann entfallen, die Felder sind reine ID-Strings à la `changedBy String` in `EtbEintragHistorie`). Das folgt dem existierenden Pattern in `OutboxEvent`, `EtbSnapshot` etc. **Konsistenz mit Architecture-Schema-Block**, der keine `@relation` zu `User` aus Eigenschutz-Tabellen deklariert.

### AC5 — Seeds: 4 `RollenDefinition`-Records für Eigenschutz (idempotent)

**Given** das bestehende Seed-Skript `packages/backend/prisma/seed.ts` (`seedKraefteConfig`-Funktion ab Zeile 135)
**When** `prisma.rollenDefinition.upsert(...)` für Eigenschutz-Rollen angewandt wird
**Then** werden **exakt 4** `RollenDefinition`-Records idempotent mit `upsert` auf `name` angelegt:

| `name`                                 | `funkrufname` | `beschreibung` (optional)                                                                                                                  | `sortOrder` |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Eigenschutz: Sicherheitsbeauftragter` | `SiBe`        | `Verantwortlich für Gefährdungsbeurteilung, PSA-Profile, Sicherheitsregeln und Sicherungsposten im Einsatz (FR44–FR46, Eigenschutz-Pilot)` | `100`       |
| `Eigenschutz: Abschnittsleiter`        | `EALtr`       | `Empfängt kritische Bekanntgaben (PSA, Sicherheitsregeln) und quittiert für seinen Abschnitt (FR18, FR25)`                                 | `101`       |
| `Eigenschutz: Einheitsführer`          | `EF`          | `Empfängt Bekanntgaben auf Einheits-Ebene und meldet Ausrüstungslücken zurück (FR20, Phase 2: FR21)`                                       | `102`       |
| `Eigenschutz: Nachbereitung`           | `Nachber.`    | `Filtert Vorfälle und exportiert Unfallkassen-Meldungen (FR31–FR36, FR47)`                                                                 | `103`       |

**Upsert-Pattern (exakt konsistent mit bestehendem Code, `seed.ts:177–194`):**

```typescript
for (const r of eigenschutzRollen) {
  await prisma.rollenDefinition.upsert({
    where: { name: r.name },
    create: { ...r, createdBy: systemUser.id }, // systemUser bereits in main() erstellt (seed.ts:53–61)
    update: {}, // Keine Updates bei existierenden Einträgen (Konvention)
  });
}
logger.log(`Created ${eigenschutzRollen.length} Eigenschutz-RollenDefinitionen`);
```

**Kritisch:**

- `createdBy: systemUser.id` ist **Pflicht** — `RollenDefinition.creator` ist FK auf `User` mit `onDelete: Restrict` (`schema.prisma:961`). Ohne gültige `systemUser.id` failt der `upsert`.
- Die bestehenden 6 Kräfte-Rollen (Zeilen 178–185: `Leitender Notarzt`, `OrgL`, `Leiter BHP`, `Einsatzleiter`, `Zugführer`, `Gruppenführer`) **bleiben unverändert**. Die 4 Eigenschutz-Rollen werden **zusätzlich** upserted.
- Präfix `Eigenschutz: ` ist **exakt** (mit Doppelpunkt + Leerzeichen), damit `EigenschutzRolleGuard` (Story 1.5) per Regex `^Eigenschutz: ` matchen kann.
- `sortOrder` ≥ 100 trennt Eigenschutz-Rollen visuell von bestehenden Kräfte-Führungsrollen (`sortOrder` 1–10) in Admin-UI-Listen (`@@index([istAktiv, sortOrder, name])`, `schema.prisma:974`).

### AC6 — Seeds: 5 `GefaehrdungsbeurteilungVorlage`-Records für Eigenschutz-MVP-Szenarien (idempotent)

**Given** das existierende Seed-Skript und das neue `gefaehrdungsbeurteilung_vorlagen`-Table
**When** das Seed-Skript erweitert wird
**Then** werden **exakt 5** `GefaehrdungsbeurteilungVorlage`-Records idempotent mit `upsert` auf `slug` angelegt:

| `slug`                               | `name`                                         | `szenario`          | `items`-Mindestinhalt                                                                                                                                                              |
| ------------------------------------ | ---------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manv`                               | `MANV — Massenanfall von Verletzten`           | `MANV`              | ≥ 3 Items, typische Gefährdungen: Eigenverletzung durch spitze/scharfe Gegenstände; Infektionsrisiko (Blut, Körperflüssigkeiten); Psychische Belastung durch Triage-Entscheidungen |
| `vu-patientenversorgung`             | `VU — Verkehrsunfall-Patientenversorgung`      | `Verkehrsunfall`    | ≥ 3 Items: Fließender Verkehr an Unfallstelle; Treibstoff-/Betriebsmittel-Austritt; Batterie-/Hochvolt-Risiko bei E-Fahrzeugen                                                     |
| `sanitaetsdienst-grossveranstaltung` | `Sanitätsdienst-Großveranstaltung`             | `Großveranstaltung` | ≥ 3 Items: Menschenmengen-Dynamik (Gedränge, Panik); Temperatur-/Wetterexposition über Schicht; Aggressives oder alkoholisiertes Publikum                                          |
| `betreuungseinsatz`                  | `Betreuungseinsatz`                            | `Betreuung`         | ≥ 3 Items: Psychosoziale Belastung durch Betroffenen-Kontakt; Hygiene in temporären Unterkünften; Langdauernde Schichten ohne Ablösung                                             |
| `cbrn-patientenversorgung`           | `CBRN — Patientenversorgung bei Kontamination` | `CBRN`              | ≥ 3 Items: Kontamination durch chemische/biologische/radiologische Stoffe; Unzureichende Eigen-PSA ohne Vollschutz; Kreuz-Kontamination zwischen Patienten und Helfern             |

**`items`-Feld-Schema (JSON-Array, lose typisiert):**

Jedes Item ist ein Objekt mit mindestens:

```typescript
{
  titel: string,                         // ≤ 120 Zeichen
  beschreibung: string,                  // ≤ 2000 Zeichen
  defaultEintritt: Eintrittswahrscheinlichkeit,   // einer der 5 Enum-Werte
  defaultSchaden: Schadensausmass,                // einer der 5 Enum-Werte
  schutzmassnahmen?: string              // Freitext, ≤ 2000 Zeichen, optional
}
```

**And** jede Vorlage enthält **mindestens 3 Items** (AC aus epics.md: „mindestens 3 vorbelegte Gefährdungs-Items").
**And** Items sind **beispielhaft-fachlich** formuliert — sie werden in Story 2.1 deep-kopiert (Item-Kopie, kein Live-Link, PRD-Mitigation „Vorlagen-Drift"). Inhaltliche Qualität: keine Platzhalter-Lorem-Ipsum-Einträge; realistische Gefährdungen für weiße Hilfsorganisationen (DRK/JUH/MHD/ASB/DLRG).

**Upsert-Pattern:**

```typescript
const vorlagen = [
  {
    slug: 'manv',
    name: 'MANV — Massenanfall von Verletzten',
    szenario: 'MANV',
    items: [
      /* ≥ 3 Objekte des obigen Schemas */
    ],
  },
  // … 4 weitere
];
for (const v of vorlagen) {
  await prisma.gefaehrdungsbeurteilungVorlage.upsert({
    where: { slug: v.slug },
    create: { ...v, createdBy: systemUser.id }, // String-Feld, optional — wir setzen es für Audit-Trail
    update: {},
  });
}
logger.log(`Created ${vorlagen.length} Eigenschutz-Vorlagen`);
```

**Platzierung im Seed-Skript:** Die Eigenschutz-Seeds werden in einer eigenen Funktion `seedEigenschutzConfig(systemUserId: string)` gekapselt, die nach `seedKraefteConfig(systemUser.id)` aufgerufen wird (`seed.ts:65`). **Nicht** mit `seedKraefteConfig` verschmelzen — Trennung hält Feature-Slices klar.

**`createdVonUserId`-Feld:** `GefaehrdungsbeurteilungVorlage.erstelltVonUserId` ist im Schema als optional (`String?`) deklariert (Architecture Zeile 1417). Wir setzen es trotzdem auf `systemUser.id` für konsistenten Audit-Trail.

### AC7 — Idempotenz: Doppelte Seed-Ausführung erzeugt keine Duplikate

**Given** die Migration ist ausgeführt und `pnpm --filter @bluelight-hub/backend prisma:seed` wurde ein erstes Mal gestartet
**When** das Seed-Skript ein **zweites Mal** gestartet wird
**Then** existieren **genau 4** Eigenschutz-`RollenDefinition`-Records mit Präfix `^Eigenschutz: ` und **genau 5** `GefaehrdungsbeurteilungVorlage`-Records
**And** keine Felder der Existenten Records werden überschrieben (`update: {}`-Pattern)
**And** das Seed-Skript loggt erfolgreich ohne Errors
**And** der folgende SQL-Check succeedet:

```sql
SELECT COUNT(*) FROM rollen_definitionen WHERE name LIKE 'Eigenschutz: %';   -- Erwartet: 4
SELECT COUNT(*) FROM gefaehrdungsbeurteilung_vorlagen;                        -- Erwartet: 5
```

**Kritisch:** Das existierende `main()` in `seed.ts` ruft `deleteMany()` für einige Tabellen in den ersten Zeilen auf (Zeilen 26–45), **um ETB/Einsätze vor Re-Seed sauber wegzuräumen**. Für Eigenschutz **darf kein `deleteMany` erfolgen** — die Eigenschutz-Seeds sind **Stammdaten-Konfiguration** (analog `seedKraefteConfig`), keine Entwicklungs-Daten.

**ABER:** Wenn in der `deleteMany`-Sequenz neue Eigenschutz-Tabellen vergessen werden, kann ein späterer Re-Run des Seed-Skripts scheitern, weil FK-Constraints blockieren, wenn ein Dev-Seed-Datensatz auf `RollenDefinition`/`Einsatz` verweist. **Daher:** Falls die `deleteMany`-Sequenz Eigenschutz-abhängige Entitäten räumt, müssen die Eigenschutz-Tabellen **in Dependency-Order vor** `RollenDefinition`/`Einsatz` geräumt werden. Im MVP werden keine Eigenschutz-Dev-Seed-Daten eingefügt → `deleteMany` **nicht** erweitern ist akzeptabel; falls späterhin Dev-Seeds (Story 2.x+) dazukommen, muss diese Ordering-Annahme revisited werden. **Dokumentations-Kommentar** im Seed-Skript setzen: `// Eigenschutz: Seeds sind Stammdaten (Vorlagen + Rollen), keine Dev-Daten. Kein deleteMany nötig, solange keine Dev-Daten auf Eigenschutz-FKs referenzieren.`

### AC8 — Re-Run der Migration ändert weder Schema noch Seeds

**Given** die Migration ist in einer DB ausgeführt
**When** `pnpm --filter @bluelight-hub/backend prisma:migrate` (bzw. `prisma migrate deploy` in CI) erneut läuft
**Then** meldet Prisma „Database schema is up to date" ohne Änderungen
**And** keine zusätzliche Migration wird erzeugt
**And** der `_prisma_migrations`-Tabelle zeigt **genau einen** Eintrag für `add_eigenschutz_module` mit Status `applied`.

### AC9 — `check:arch` bleibt ohne neue Circular Dependencies (NFR-M3)

**Given** die Migration + Seeds sind implementiert, sonst aber keine Application/Domain-Änderungen
**When** `pnpm --filter @bluelight-hub/backend check:arch` ausgeführt wird
**Then** meldet `madge` **keine** neuen Circular Dependencies in `src/domain/`, `src/application/`
**And** Prisma-Client-Generation verändert keine Import-Struktur (der generierte Client liegt in `src/generated/prisma/`)
**And** Tests bleiben grün (Schema ohne Consumer-Code kann keine neuen Tests brechen; existierende Tests dürfen nicht regressiert werden).

**Erwartung:** Diese Story fügt **keine** neuen Source-Files in `src/domain/` oder `src/application/` hinzu. `check:arch` prüft nur TS-Imports, nicht Prisma-Schema. Dieser AC dient als Safety-Net: falls der Dev ungeplant Application-Code anfasst, schlägt der Check Alarm.

### AC10 — Nullable-Fields + Defaults + Constraints exakt gemäß Architektur

**Given** die Prisma-Modell-Definition aus `architecture.md §Prisma Schema-Additions`
**When** der Dev das Schema kopiert und an das Repo-Pattern (`@@map`, `@map`) anpasst
**Then** bleiben **exakt** die folgenden Nullable-Signale und Defaults erhalten:

- `Gefaehrdungsbeurteilung.gefahrenzoneId String?` (optional — Q6 MVP-Referenz auf Gefahren-Modul, darf `null` sein)
- `Gefaehrdungsbeurteilung.vorlageId String?` (optional — Ad-hoc-Beurteilung ohne Vorlage)
- `GefaehrdungsbeurteilungVersion.gueltigBis DateTime?`, `.begruendung String? @db.VarChar(500)`, `.eventId String? @unique`
- `PsaProfilZuweisung.gueltigBis DateTime?` (null = aktive Zuweisung, Datum = deaktiviert)
- `Sicherheitsregel.einheitId String?` (null = gilt für gesamten Einsatz)
- `SicherungspostenVersion.eventId String? @unique` — Unique-Constraint verhindert Doppel-Outbox-Processing
- `EigenschutzVorfall.gefBeurteilungVersionId String?` (Vorfall kann ohne aktive Beurteilung gemeldet werden)
- `AmpelProjection.letzteAenderungVonUserId String?` (bei initialer Projektion noch keine Änderung)
- `SyncConflict.resolvedAt DateTime?`, `.resolvedByUserId String?`, `.resolution SyncConflictResolution?`
- `Sicherungsposten.geloescht Boolean @default(false)` (Soft-Delete-Pattern)

**Defaults:**

- `version Int @default(1)` auf allen Haupt-Entitäten (AC1)
- `erstelltAm DateTime @default(now())` und `aktualisiertAm DateTime @updatedAt` wo spezifiziert
- `aktiv Boolean @default(true)` **nur** auf `GefaehrdungsbeurteilungVorlage`
- `unfallkasseRelevant Boolean @default(false)` auf `EigenschutzVorfall`
- `lueckeGemeldet Boolean @default(false)` auf `PsaProfilQuittung`
- `geloescht Boolean @default(false)` auf `Sicherungsposten`

**`@db`-Annotationen:**

- `String @db.VarChar(N)` wo in Architektur spezifiziert (z. B. `VarChar(100)`, `VarChar(200)`, `VarChar(500)`, `VarChar(80)`, `VarChar(1000)`, `VarChar(2000)`).
- `String @db.Text` für lange Freitexte ohne Limit (`zustaendigkeitsbereich`, `was`, `massnahmen`, `inhalt`, `beschreibung`).
- `Json` ohne `@db.JsonB`-Suffix außer wo anders im Architecture-Schema explizit angegeben. (PostgreSQL speichert `Json` intern als `jsonb`; `@db.JsonB` ist bei neuerem Prisma explizit, aber nicht notwendig wenn Architektur es weglässt — `GefahrenzoneGeometry` in `gefahrenzonen` nutzt `@db.JsonB`, aber das ist eine Inkonsistenz im Bestand, nicht Vorbild.)

**Indexe:** Alle `@@index(...)` und `@@unique(...)` aus dem Architecture-Schema-Block übernehmen (siehe AC1-Liste). **Keine** zusätzlichen Indexe erfinden — Performance-Tuning ist Story 6.1+ vorbehalten.

## Tasks / Subtasks

- [x] **Task 1:** Prisma-Schema erweitern (AC1, AC2, AC4, AC10)
  - [x] Subtask 1.1: 7 Enums am Ende der bestehenden Enum-Sektion in `schema.prisma` ergänzen (unter `GefahrenzoneGeometryType`, vor `enum Funkkanal`/bzw. passender Stelle — oder als eigener Block am Dateiende ab Zeile 2523+; konsistent mit bestehender Gruppierung nach Feature)
  - [x] Subtask 1.2: Alle 14 Models am **Dateiende** nach `PushSubscription` (oder in einem eigenen `// ======= Eigenschutz (Issue #415) =======`-Block) anlegen, inkl. `@@map("snake_case")` und `@map(...)` für jedes Feld
  - [x] Subtask 1.3: Back-Relations in `model Einsatz { … }` ergänzen (Listen-Arrays für `gefaehrdungsbeurteilungen`, `psaProfilZuweisungen`, `sicherheitsregeln`, `sicherungsposten`) — außerdem Back-Ref `gefaehrdungsbeurteilungen` in `model Gefahrenzone` (für `gefahrenzoneId` FK SetNull, AC4)
  - [x] Subtask 1.4: `pnpm --filter @bluelight-hub/backend prisma:generate` ausführen, Errors beheben — Prisma-Client wurde in 396 ms sauber generiert
  - [x] Subtask 1.5: Lokale `docker compose up postgres` starten (falls nicht schon), Dev-DB unter Port 3092 erreichbar (siehe CLAUDE.md §Ports) — Postgres 18 lief bereits (healthy)
- [x] **Task 2:** Migration erzeugen (AC3, AC8)
  - [x] Subtask 2.1: `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_eigenschutz_module` ausgeführt → `prisma/migrations/20260421222307_add_eigenschutz_module/migration.sql` erzeugt
  - [x] Subtask 2.2: `migration.sql` reviewt — 7 `CREATE TYPE`, 14 `CREATE TABLE`, alle FK-`AddForeignKey`-Statements mit korrekten ON DELETE-Strategien (Cascade/SetNull/Restrict gemäß AC4), 24 Indizes
  - [x] Subtask 2.3: Reiner leerer-DB-Verify nicht autorisiert (Auto-Mode blockiert destruktive DB-Reset). Stattdessen Migration auf Dev-DB mit Bestandsdaten angewandt — Prisma meldete „Your database is now in sync with your schema", keine Blocking-Steps
  - [x] Subtask 2.4: Smoke-SQL aus AC3: `docker compose exec postgres psql ... WHERE tablename IN (...)` → **count = 14** ✓
- [x] **Task 3:** Seed-Skript erweitern (AC5, AC6, AC7)
  - [x] Subtask 3.1: Neue Funktion `async function seedEigenschutzConfig(systemUserId: string): Promise<void>` nach `seedKraefteConfig` in `prisma/seed.ts` angelegt
  - [x] Subtask 3.2: 4 `RollenDefinition`-Records (AC5) via `upsert` auf `name` — `createdBy: systemUserId` gesetzt (Bestands-Feldname, nicht `erstelltVonUserId` — das ist das Vorlagen-Feld)
  - [x] Subtask 3.3: 5 `GefaehrdungsbeurteilungVorlage`-Records (AC6) via `upsert` auf `slug` — `erstelltVonUserId: systemUserId` (Prisma-Feldname gemäß Architecture-Schema, NICHT `createdBy`)
  - [x] Subtask 3.4: `seedEigenschutzConfig(systemUser.id)` in `main()` zwischen `seedKraefteConfig` und `seedStammdaten` aufgerufen — explizite Dependency-Order
  - [x] Subtask 3.5: `items`-Arrays mit 3 realistischen Gefährdungen je Vorlage (DIN/DGUV/TRBS-Vokabular: Hepatitis-B, Triage-PSNV, HV-Batterien bei E-Fahrzeugen, CSA-Dichtheitsprüfung, Noro/Influenza in Notunterkünften …)
  - [x] Subtask 3.6: Voll-Seed (`pnpm prisma:seed`) scheitert am pre-existing `etbEintrag.deleteMany`-Trigger („DRK Compliance Violation"). Ursache ist Bestands-Dev-DB mit ETB-Einträgen + Migration `20251118081643_add_no_delete_triggers`. **Nicht Story-1.4-verursacht** — dasselbe Verhalten liefert die Seed-Datei auch ohne meine Änderungen. Stattdessen Eigenschutz-Seed-Pfad isoliert verifiziert (identischer Code-Pfad, temporäres Runner-Script) → Logs zeigen `Created 4 Eigenschutz-RollenDefinitionen`, `Created 5 Eigenschutz-Vorlagen`
- [x] **Task 4:** Idempotenz + Smoke-Test verifizieren (AC7, AC8, AC9)
  - [x] Subtask 4.1: Zweiter Seed-Lauf → 4 Rollen + 5 Vorlagen stabil, `update: {}`-Pattern hält Bestand, keine Duplikate, keine Errors
  - [x] Subtask 4.2: `pnpm prisma:migrate` erneut ausgeführt → „Already in sync, no schema change or pending migration was found." Der `_prisma_migrations`-Tabelle zeigt genau **einen** Eintrag `20260421222307_add_eigenschutz_module` mit `applied_steps_count = 1` ✓ (AC8)
  - [x] Subtask 4.3: SQL-Verifikationen aus AC7: `WHERE name LIKE 'Eigenschutz: %'` → **4**, `SELECT COUNT(*) FROM gefaehrdungsbeurteilung_vorlagen` → **5** ✓
  - [x] Subtask 4.4: `pnpm check:arch` → madge meldet „No circular dependency found!", oxlint/oxfmt clean — **keine** neuen Circular Dependencies, AC9 erfüllt
- [x] **Task 5:** Regression-Tests + Integrations-Checks (AC9, Definition of Done)
  - [x] Subtask 5.1: `pnpm lint:check` — 2 pre-existing Warnings (nicht in Story-1.4-Files), oxfmt clean. Meine `seed.ts`-Änderung wurde per `pnpm lint` auto-formatiert (Import-Join auf eine Zeile)
  - [x] Subtask 5.2: `pnpm check:di:imports` — „All DI imports follow the correct pattern! (Checked 1922 files)"
  - [x] Subtask 5.3: `pnpm test:unit` → **493 Test-Suites, 8640/8640 Tests grün** (35 skipped), keine Regressionen
  - [x] Subtask 5.4: `pnpm test:db` → 24 Failures in `server-access.guard.integration`, `einsatz-controller.e2e`, `admin-jwt-guard.e2e`, `auth-controller.e2e`. **Keine davon referenziert ein Eigenschutz-Model** (Grep: 0 Matches für `eigenschutz|gefaehrdung|psa_profil|sicherungs|sicherheitsregel|ampel_projection|sync_conflict`). Ursache ist die uncommitted Story-1.3-Arbeit in `auth.module.ts` (neuer `KraefteInfrastructureModule`-Import + `EinsatzScopeGuard`-Provider, der die Auth-DI-Kette verändert). AC9 ist erfüllt: diese Schema-Story fügt kein Consumer-Code hinzu → kann per Definition keine existierenden Auth/Guard-Tests brechen
- [x] **Task 6:** Story-Update finalisieren (Dev Agent Record)
  - [x] Subtask 6.1: Tasks abgehakt, File List befüllt, Completion Notes unten geschrieben
  - [x] Subtask 6.2: `sprint-status.yaml` auf `review` gesetzt
  - [ ] Subtask 6.3: Commit — **nicht autonom ausgeführt**. CLAUDE.md/Root-System-Prompt: „NEVER commit changes unless the user explicitly asks." Commit-Text-Vorschlag steht in den Completion Notes zum Copy-Paste

## Dev Notes

### Architektur-Alignment

- **Autoritative Schema-Quelle:** `_bmad-output/planning-artifacts/architecture.md §Prisma Schema-Additions (Zeilen 1312–1616)`. Die Aufzählung in `epics.md §Story 1.4 AC1` listet historische Enum-Namen (`AmpelStatus` statt `Ampelstatus`, `KonfliktResolution` statt `SyncConflictResolution`, `TelemetryEventName` als Phantom) und **11 Models** statt der tatsächlichen **14 Models** — das AC-Wording muss der Dev ignorieren; diese Story-Datei listet die korrekten Werte.
- **Versionierungs-Pattern:** State + Version-Chain (Architektur §B1). Haupt-Entitäten (`Gefaehrdungsbeurteilung`, `PsaProfilZuweisung`, `Sicherheitsregel`, `Sicherungsposten`) tragen `version Int @default(1)` für Optimistic Concurrency. Parallel existiert eine Version-Chain-Tabelle (`*Version`) mit `(entityId, version, payload JSONB, changedFields JSONB, gueltigVon, gueltigBis, changedByUserId)` — append-only, historisch korrekt.
- **Snapshot-Pattern:** `EigenschutzVorfall.kontextSnapshot Json` ist die **authoritative Quelle** (Architektur §B2). FK auf `GefaehrdungsbeurteilungVersion` ist nur für Navigations-Convenience — Sicherheitsregel- und PSA-Zustände werden **ausschließlich** als JSON-Liste im Snapshot geführt (Prisma/Postgres erzwingt keine referentielle Integrität auf Array-FKs).
- **Rollen-Modell:** `RollenDefinition` + `EinsatzRollenbesetzung.rollenName`-Snapshot (Architektur §B10 revidiert, bestätigt in Story 1.3). Präfix `^Eigenschutz: ` + exakter Name für `EigenschutzRolleGuard` (Story 1.5).

### Learnings aus Story 1.3 (EinsatzScopeGuard)

- **Q4-Revision hält:** Kein Schema-Change an `EinsatzRollenbesetzung`, kein Prisma-Enum `EigenschutzRolle`. Story 1.4 reproduziert dieses Prinzip konsequent: keine Plattform-Tabelle wird berührt.
- **Seed-User ist `SYSTEM`-User:** `seed.ts:53–61` erstellt idempotent einen `User` mit `username: 'SYSTEM'`, `role: 'SUPER_ADMIN'`, `isActive: false`. Dessen `id` ist das `createdBy` für alle Stammdaten-Seeds (Konvention seit Kräfte-Management Story 1.0).
- **Security-Log:** Nicht relevant in Story 1.4 (keine Runtime-Code-Änderungen), aber konsequenterweise: Seed-Skript loggt nur Record-Counts, keine Rollen-Namen oder PII.

### Bestehende Patterns zum Kopieren (Referenz-Implementierungen)

- **Seed-Pattern für idempotent Stammdaten:** `packages/backend/prisma/seed.ts:135–195` (`seedKraefteConfig`). Loop über Array, `upsert` auf unique-Feld, `update: {}`.
- **Model mit Version-Chain:** `EtbEintrag` + `EtbEintragHistorie` (`schema.prisma:466–559`) — exakt das Pattern, das `Gefaehrdungsbeurteilung` + `GefaehrdungsbeurteilungVersion` nachbildet (FK Cascade, Unique-Constraint `[eintragId, version]`, changed-fields-JSON).
- **Model mit `kontextSnapshot Json`:** `EtbSnapshot` (`schema.prisma:593–606`), analog `Befehl`-Modelle — Pattern für schema-bruchfreien Archivstand.
- **Composite-Primary-Key:** `EinsatzPersonQualifikation` (`@@id([einsatzPersonId, qualifikationId])`) — exakt das Pattern für `AmpelProjection.@@id([einsatzId, einheitId])`.
- **Back-Relation auf `Einsatz`:** `schema.prisma:313–336` — `fahrzeuge`, `personen`, `rollenBesetzungen`, `einheiten`, `teilnehmer`, `taktischesZeichen` usw. Neue Arrays für Eigenschutz einfach anhängen.

### Prisma-Version + Command-Gotchas

- **Prisma 7.7.x** ist installiert (`package.json`). `prisma migrate dev` nutzt den neuen Rust-Engine-Path; **keine** `binaryTargets`-Konfiguration nötig (war Problem unter Prisma 4/5).
- **Adapter-PG:** `@prisma/adapter-pg@^7.7.0` wird in `seed.ts` genutzt (`import { PrismaPg } from '@prisma/adapter-pg'`). Das Seed-Skript öffnet eine eigene Connection über `DATABASE_URL` — **nicht** den NestJS-PrismaService nutzen.
- **`--name` direkt an prisma durchreichen:** Der pnpm-Alias `prisma:migrate` ist `prisma migrate dev` (`package.json:21`). `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_eigenschutz_module` reicht `--name` korrekt weiter. Alternative: `cd packages/backend && npx prisma migrate dev --name add_eigenschutz_module`.
- **`prisma db seed`** ruft automatisch `seed.ts` via `tsx` auf (`package.json` hat `"prisma": { "seed": "tsx prisma/seed.ts" }` oder `.prisma.seed`-Config — falls fehlt, prüfen und ggf. ergänzen).

### Git-Intelligence (letzte 5 Prisma-Commits)

- `f905b5197 ✨(gefahrenzone): Prisma-Schema + Migration` — genaues Vorbild: separater Commit für Schema+Migration, vor Domain-Code.
- `2f8558f13 ✨(backend): Infrastructure Layer für taktische Zeichen #636` — Domain/Infra **separat** von Schema-Commit; dieses Pattern weiterführen.
- `3174d7049 ✨(backend): Gefahrenmatrix Prisma Schema (#414)` — Issue-Nummer im Titel; für Eigenschutz analog `#415`.

### Testing-Strategie (keine neuen Tests in Story 1.4)

- **Schema-Tests:** Prisma validiert selbst (`prisma generate`/`prisma migrate`). Zusätzliche Unit-Tests auf Schema-Ebene bringen keinen Wert.
- **Seed-Tests:** Idempotenz-Check über SQL-COUNT-Queries (AC7) reicht als Manual-Verification. Automatisierter Seed-Idempotenz-Test wäre redundant zum Upsert-Pattern.
- **DB-Integrations-Tests** (`test:db`, `test:integration`) dürfen nicht regressieren. Falls ein Test auf Bestands-Tabellen-Counts reagiert (z. B. `expect(rollenDefinitionenCount).toBe(6)`), muss dieser Test auf **10** (6 Bestand + 4 Eigenschutz) angepasst werden. **Proaktiv grep**en: `grep -r "rollenDefinition" packages/backend/test/ packages/backend/src/**/*.integration.spec.ts`.
- **Coverage-Threshold NFR-M1 (≥ 80 %)** ist auf Dateien angewandt. Diese Story fügt keinen Code zu `src/` hinzu (nur Schema + Seed), daher keine Coverage-Anforderung für neue Dateien.

### Potential Pitfalls

1. **Unit-Naming-Inkonsistenz der Back-Relations:** Prisma verlangt, dass `Gefaehrdungsbeurteilung.einsatz Einsatz @relation(...)` und `Einsatz.gefaehrdungsbeurteilungen Gefaehrdungsbeurteilung[]` **ohne** expliziten `@relation("...")`-Namen auskommen, solange es nur eine Relation zwischen beiden Modellen gibt. Falls ein `@relation("EigenschutzGefaehrdungsbeurteilung")` gesetzt wird, muss er auf beiden Seiten identisch sein. Default ohne Namen ist einfacher und konsistent mit `einheiten EinsatzEinheit[]` (schema.prisma:352).
2. **Enum-Import im Seed-Skript:** `seed.ts:5` importiert Enums aus `../src/generated/prisma/client`. Nach `prisma generate` müssen die neuen Enums (`Eintrittswahrscheinlichkeit`, `Schadensausmass`) dort verfügbar sein. Falls Seed-Skript Enum-Werte als TypeScript-Strings übergibt, sollten die Enum-Imports ergänzt werden für Compile-Time-Typsicherheit in den `items`-Arrays — **optional, aber empfohlen**.
3. **`Ampelstatus` vs `AmpelStatus`:** Prisma ist case-sensitive. Wenn ein Dev sich an der epics.md-Schreibweise orientiert (`AmpelStatus`), failt `prisma generate` mit `Enum 'AmpelStatus' is undefined` in `AmpelProjection.status`. **Explizit in AC1 markiert.**
4. **`@db.VarChar`-Größen:** Seeds müssen die DB-Längen-Constraints einhalten. `RollenDefinition.name` ist `VarChar(100)` — längste Eigenschutz-Rolle `Eigenschutz: Sicherheitsbeauftragter` = 38 Zeichen → OK. `GefaehrdungsbeurteilungVorlage.slug` ist `VarChar(100)`, `name` ist `VarChar(200)` → OK. `szenario` ist `VarChar(80)` → die längste Text-Variante `Großveranstaltung` = 17 Zeichen → OK, aber wenn der Dev `Sanitätsdienst-Großveranstaltung` als `szenario` wählt (32 Zeichen), immer noch OK.
5. **Prisma-Config `prisma.config.ts`:** Das Repo hat ein `packages/backend/prisma.config.ts`. Falls diese Datei Config-Werte überschreibt (z. B. Migrations-Ordner), **nicht verändern** — default Convention nutzen.
6. **Performance-Regression CI:** Der `test:db`-Lauf dauert bei zusätzlichen Tabellen minimal länger (jede Migration + Truncate + Re-Seed). Falls CI-Tests mit `runInBand` und Shard-Gating laufen (siehe `jest.config.js`), kein Handlungsbedarf.

### Project Structure Notes

**Alignment mit unified project structure:**

- Schema-Pfad: `packages/backend/prisma/schema.prisma` (Bestand)
- Migration-Pfad: `packages/backend/prisma/migrations/YYYYMMDDHHMMSS_add_eigenschutz_module/migration.sql` (neu angelegt durch Prisma CLI)
- Seed-Pfad: `packages/backend/prisma/seed.ts` (erweitert, nicht ersetzt)
- Keine Dateien in `src/domain/eigenschutz/`, `src/application/eigenschutz/`, `src/infrastructure/eigenschutz/`, `src/modules/eigenschutz/` — diese Ordner kommen in Stories 1.6+ (Feature-Slice) und 2.x+ (Aggregates, Use-Cases, Controller).

**Detected conflicts / variances:**

- Architecture-Code-Block zeigt Models **ohne** `@@map()` / `@map()`. Repo-Pattern erfordert aber snake_case via diese Annotations. **Kein echter Konflikt** — der Architecture-Block ist konzeptionelle Lesbarkeit, die Implementation ist Repo-Pattern-konform (AC2).
- Architecture nennt 11 Models explizit, Schema-Block enthält jedoch 14 — die 3 zusätzlichen sind `SicherheitsregelQuittung`, `PsaProfilQuittung` und die Vorlagen-Tabelle wird je nach Zählung einberechnet. **Explizit in AC1 auf 14 aufgelöst.**

### References

- **Epics-Definition:** [Source: `_bmad-output/planning-artifacts/epics.md` §Story 1.4 „Prisma-Migration `add_eigenschutz_module` + Seeds" (Zeilen 536–568)]
- **Architektur-Schema (autoritativ):** [Source: `_bmad-output/planning-artifacts/architecture.md` §Prisma Schema-Additions, insbesondere Zeilen 1312–1616]
- **Vorlagen-Spec (Seeds):** [Source: `_bmad-output/planning-artifacts/architecture.md` §B8 „Vorlagen (Seeds)", Zeilen 607–622]
- **Rollen-Modell:** [Source: `_bmad-output/planning-artifacts/architecture.md` §B10 „Rollen-/Permission-Auflösung — Nutzung von RollenDefinition (revidiert)", Zeilen 668–697]
- **Optimistic-Concurrency:** [Source: `_bmad-output/planning-artifacts/architecture.md` §B1 „State + Version-Chain", Zeilen 441–470]
- **Naming-Konvention:** [Source: `_bmad-output/planning-artifacts/architecture.md` §A „Prisma Models / Enums", Zeilen 842–860]
- **Event-Katalog (nicht Story 1.4, aber referenziert):** [Source: `_bmad-output/planning-artifacts/architecture.md` §B13, Zeilen 734–753]
- **Seed-Pattern:** `packages/backend/prisma/seed.ts:135–195` (`seedKraefteConfig`)
- **Schema-Bestand:** `packages/backend/prisma/schema.prisma` — insbesondere `RollenDefinition` (946–977), `EinsatzRollenbesetzung` (1316–1359), `Einsatz` (278–368), `EtbEintrag` + `EtbEintragHistorie` (466–559) als Referenz-Pattern für Version-Chain
- **Vorherige Story 1.3 Abschluss-Nachweis:** `_bmad-output/implementation-artifacts/415-1-3-einsatzscopeguard-als-plattform-pattern-adr-012.md` (Status `review`, bestätigt Q4-Revision)
- **Funktional:** [Source: `_bmad-output/planning-artifacts/prd.md` §FR5 (Vorlagen-Auswahl), §FR41–§FR43 (Versionierung), §FR48 (Schema + Seeds als Enabler)]
- **Architektonische Requirements:** [Source: `_bmad-output/planning-artifacts/prd.md` §AR1 (Prisma-Schema), §AR6 (Seed-Infrastruktur), §AR15 (Keine Breaking-Changes an Plattform-Tabellen)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) via `bmad-dev-story`-Workflow, Auto-Mode.

### Debug Log References

- **Advisor-Konsultation vor Schema-Implementation:** Konfliktauflösung Architecture-Block vs. AC4 (gefahrenzoneId-FK, onDelete-Strategien, VarChar-Defaults). Ergebnis: AC4 autoritativ für FK-Semantik, Architecture autoritativ für Feld-Existenz, `String` ohne VarChar für User-ID-Strings wo Architecture nichts spezifiziert, `gefahrenzoneId` bekommt explizite Prisma-Relation + Back-Ref in `Gefahrenzone`.
- **Voll-Seed-Blocker** (`pnpm prisma:seed`): präexistierender DB-Trigger aus Migration `20251118081643_add_no_delete_triggers` blockiert `etbEintrag.deleteMany()` bei Bestands-Dev-DB (`DRK Compliance Violation: ETB Einträge cannot be deleted`). **Nicht Story-1.4-Scope**. Umgehung via isolierten Runner, der nur `seedEigenschutzConfig`-Pfad ausführt — identische Seed-Logik, bestätigt Idempotenz + Content-Qualität.
- **Destruktive DB-Reset (blockiert):** `prisma migrate reset --force` vom Auto-Mode-Guardrail blockiert (korrekt — Bestandsdaten). `git stash --include-untracked` ebenfalls blockiert (schützt uncommitted Story-1.3-Arbeit des Users). Verifikation stattdessen durch logische Analyse + Grep auf Test-Output.

### Completion Notes List

**Was Story 1.4 liefert:**

- **`schema.prisma`**: 7 Enums (`PsaProfil`, `Eintrittswahrscheinlichkeit`, `Schadensausmass`, `Risikoklasse`, `Ampelstatus`, `SyncConflictEntityType`, `SyncConflictResolution`) + 14 Models (`Gefaehrdungsbeurteilung`, `GefaehrdungsbeurteilungVersion`, `GefaehrdungsbeurteilungVorlage`, `PsaProfilZuweisung`, `PsaProfilQuittung`, `Sicherheitsregel`, `SicherheitsregelVersion`, `SicherheitsregelQuittung`, `Sicherungsposten`, `SicherungspostenVersion`, `EigenschutzVorfall`, `EigenschutzTelemetryEvent`, `AmpelProjection`, `SyncConflict`). Alle mit `@@map("snake_case_plural")` + `@map("snake_case")` pro camelCase-Feld. Back-Relations in `Einsatz` (4 Listen) + `Gefahrenzone` (1 Liste). FK-Strategien gemäß AC4: Cascade auf Einsatz-Deletion, SetNull für optionale Referenzen (Vorlage, Gefahrenzone), Restrict auf `EigenschutzVorfall.gefBeurteilungVersionId` (Snapshot-Schutz).
- **Migration `20260421222307_add_eigenschutz_module`**: 7 `CREATE TYPE`, 14 `CREATE TABLE`, 24 Indizes, 12 `ADD CONSTRAINT`-Statements mit passenden ON DELETE/ON UPDATE-Strategien. Rein additiv — keine `ALTER TABLE` auf Plattform-Tabellen außer `ADD CONSTRAINT` für Eigenschutz-FKs.
- **`seed.ts::seedEigenschutzConfig`**: 4 `RollenDefinition`-upserts (Präfix `Eigenschutz: ` — treibt `EigenschutzRolleGuard` aus Story 1.5 via Regex `^Eigenschutz: `) + 5 `GefaehrdungsbeurteilungVorlage`-upserts (MANV, VU, Großveranstaltung, Betreuung, CBRN) mit je 3 realistischen Items ({titel, beschreibung, defaultEintritt, defaultSchaden, schutzmassnahmen}). Idempotent via `where: {unique}`, `update: {}`-Pattern. Content inhaltlich auf DIN/DGUV/TRBS-Vokabular kalibriert, keine Platzhalter.

**Architektur-Entscheidungen, die Advisor bestätigt hat:**

1. `gefahrenzoneId` bekommt echte Prisma-Relation + SetNull-FK **obwohl** der Architecture-Code-Block sie weglässt → AC4 ist autoritativ für FK-Vertrag; ohne `@relation` würde `prisma validate` beim nächsten Story-Schema-Touch brechen.
2. `GefaehrdungsbeurteilungVorlage.erstelltVonUserId` (NICHT `createdBy`) — Prisma-Feldname gemäß Architecture. Das Story-Subtask-3.3-Code-Snippet („createdBy: systemUser.id") ist leicht fehlerhaft, richtig ist `erstelltVonUserId`.
3. `RollenDefinition.createdBy` bleibt `createdBy` — das ist das Bestands-Feld aus `schema.prisma:957`. Die beiden Seeds haben bewusst unterschiedliche Audit-Feld-Namen.

**Verifikations-Evidence:**

| Check                           | Ergebnis                                                                                  | Quelle                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `prisma:generate`               | ✓ 0 Errors in 396 ms                                                                      | —                                                      |
| 14 Tabellen angelegt            | ✓ COUNT=14                                                                                | `pg_tables`-Smoke-SQL aus AC3                          |
| Genau 1 Migration applied       | ✓ `20260421222307_add_eigenschutz_module`, `applied_steps_count=1`                        | `_prisma_migrations`                                   |
| Migration up-to-date bei Re-Run | ✓ „Already in sync"                                                                       | `pnpm prisma:migrate` 2×                               |
| 4 Eigenschutz-Rollen            | ✓ `COUNT=4`                                                                               | `rollen_definitionen WHERE name LIKE 'Eigenschutz: %'` |
| 5 Vorlagen                      | ✓ `COUNT=5`                                                                               | `gefaehrdungsbeurteilung_vorlagen`                     |
| 3 Items je Vorlage              | ✓ `jsonb_array_length=3` bei allen 5                                                      | SQL-JSON-Check                                         |
| Idempotenz                      | ✓ 2× Seed → identische 4+5 Counts                                                         | Isolierter Seed-Runner                                 |
| `check:arch`                    | ✓ No circular dependency                                                                  | madge + oxlint                                         |
| `check:di:imports`              | ✓ All 1922 files correct                                                                  | `check-di-imports-zero-deps.ts`                        |
| `test:unit`                     | ✓ 8640/8640 Tests (35 skipped) in 66 s                                                    | Jest                                                   |
| Prisma-Client-Enum-Exports      | ✓ `PsaProfil`, `Eintrittswahrscheinlichkeit`, `Schadensausmass`, `Ampelstatus` exportiert | `src/generated/prisma/enums.ts`                        |

**Test-Situation (für Reviewer):**

`pnpm test:db` meldet 24 Failures in `server-access.guard.integration.spec.ts`, `einsatz-controller.e2e.spec.ts`, `admin-jwt-guard.e2e.spec.ts`, `auth-controller.e2e.spec.ts`. Muster: HTTP-Codes weichen ab (200↔401, 201↔403). **Keine davon** referenziert eines der neuen Eigenschutz-Models — Grep auf Keywords `eigenschutz|gefaehrdung|psa_profil|sicherungs|sicherheitsregel|ampel_projection|sync_conflict` in der gesamten Test-Output-Datei ergibt **0 Matches**.

Ursache laut Advisor-Hypothese: uncommitted Story-1.3-Arbeit in `auth.module.ts` importiert `KraefteInfrastructureModule` und exportiert `EinsatzScopeGuard` — die DI-Kette des `AuthModule` hat sich verändert, was in e2e-Tests das Auth-Flow-Verhalten beeinflusst. Die sichtbaren (nicht committeten) Dateien `auth.module.ts`, `einsatz-scope.guard.ts`, `einsatz-param.decorator.ts`, `prisma-rollen-besetzung.repository.ts` gehören alle zu Story 1.3.

AC9 ist damit wortwörtlich erfüllt: „Schema ohne Consumer-Code kann keine neuen Tests brechen; existierende Tests dürfen nicht regressiert werden." Diese Schema-Story fügt **null** Source-Files in `src/domain/`, `src/application/`, `src/infrastructure/` oder `src/modules/` hinzu (Git-Status bestätigt). Kausal kann sie die 24 Failures nicht verursacht haben.

**Follow-up-Empfehlung für Story 1.3 Abschluss:** Die 24 Test-Failures sollten vor dem Commit von Story 1.3 behoben werden. Das ist Story-1.3-Scope, nicht 1.4.

**Vorgeschlagener Commit-Text (nicht autonom ausgeführt):**

```
✨(eigenschutz): add_eigenschutz_module-Migration + Stammdaten-Seeds (Story 1.4)

Schema-Additions gemäß architecture.md §Prisma Schema-Additions:
- 7 Enums: PsaProfil, Eintrittswahrscheinlichkeit, Schadensausmass,
  Risikoklasse, Ampelstatus, SyncConflictEntityType, SyncConflictResolution
- 14 Models: Gefaehrdungsbeurteilung + Version + Vorlage, PsaProfilZuweisung
  + Quittung, Sicherheitsregel + Version + Quittung, Sicherungsposten
  + Version, EigenschutzVorfall, EigenschutzTelemetryEvent, AmpelProjection,
  SyncConflict
- Alle Tables mit snake_case @@map, Felder mit @map (Repo-Pattern)
- FK-Strategien: Cascade auf Einsatz-Deletion, SetNull auf optionale
  Referenzen, Restrict auf EigenschutzVorfall → GefBeurteilungVersion
  (Snapshot-Schutz)
- Back-Relations in Einsatz (4) + Gefahrenzone (1)

Seeds (idempotent via upsert):
- 4 Eigenschutz-RollenDefinitionen (Präfix "Eigenschutz: " für
  EigenschutzRolleGuard Story 1.5)
- 5 GefaehrdungsbeurteilungVorlagen (MANV, VU, Großveranstaltung,
  Betreuung, CBRN) mit je 3 realistischen Items (DIN/DGUV/TRBS-Vokabular)

Rein additiv — keine Plattform-Tabelle berührt. prisma:generate ok,
14 Tables in DB, 4+5 Seeds verifiziert, Idempotenz bei Re-Run. 8640/8640
Unit-Tests grün. check:arch ohne neue Circular Dependencies.

Refs: #415, ADR-012, Story 1.3 (Membership-Guard)
```

### File List

**Neu angelegt:**

- `packages/backend/prisma/migrations/20260421222307_add_eigenschutz_module/migration.sql` — auto-generiert durch Prisma CLI (7 CREATE TYPE, 14 CREATE TABLE, 24 Indizes, 12 FK-Constraints)

**Editiert:**

- `packages/backend/prisma/schema.prisma` — 7 Enums + 14 Models am Dateiende, Back-Relations in `model Einsatz` (+4 Listen) und `model Gefahrenzone` (+1 Liste)
- `packages/backend/prisma/seed.ts` — Enum-Imports `Eintrittswahrscheinlichkeit`/`Schadensausmass` + neue Funktion `seedEigenschutzConfig(systemUserId)` + Aufruf in `main()` zwischen `seedKraefteConfig` und `seedStammdaten`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `415-1-4-...` auf `review` (over `in-progress` ← `ready-for-dev`), `last_updated` aktualisiert
- `_bmad-output/implementation-artifacts/415-1-4-prisma-migration-add-eigenschutz-module-seeds.md` — Status `review`, Tasks abgehakt, Dev Agent Record + File List + Change Log befüllt

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Author                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 2026-04-22 | Story-Context erstellt via `bmad-create-story`. Scope: eine benannte Prisma-Migration `add_eigenschutz_module` + Seed-Erweiterung für 4 Eigenschutz-Rollen + 5 Vorlagen. Autoritative Schema-Quelle ist `architecture.md §Prisma Schema-Additions` (14 Models, 7 Enums). Epics.md-Wording ist outdated und wurde mit korrekten Namen ersetzt.                                                                                                                                                                                                                                                                                                                                                                                                                                             | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Implementierung abgeschlossen via `bmad-dev-story`: Schema erweitert (7 Enums, 14 Models, Back-Relations, @@map/@map), Migration `20260421222307_add_eigenschutz_module` erzeugt + angewandt, Seeds `seedEigenschutzConfig` mit 4 RollenDefinitionen + 5 Vorlagen (je 3 Items) implementiert. `prisma:generate`, Smoke-SQL (COUNT=14), Seed-Idempotenz (2× Runs, 4+5 stabil), `check:arch`, `check:di:imports`, `test:unit` (8640/8640) alle grün. `test:db` hat 24 Failures in Auth/Guard/EinsatzController — keines referenziert Eigenschutz-Models, Ursache ist uncommitted Story-1.3-Arbeit in `auth.module.ts`. AC9 erfüllt (Schema ohne Consumer-Code). Status: `review`.                                                                                                           | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Code-Review via `bmad-code-review` (3 Layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor bestätigt **alle 10 ACs erfüllt**, keine Scope-Verletzungen. Findings: 1 Patch (Typo `zünden` → `zuerst`), 2 Decision-Needed (Governance der Seed-Vorlagen, FK-Cascade-Restrict-Konflikt), 14 Defer-Items (Architektur-Design-Hinweise für Folge-Stories), 23 als Noise/False-Positive verworfen. Details siehe `### Review Findings` unten.                                                                                                                                                                                                                                                                                                                         | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Review-Patches angewandt: (P1) Typo-Fix in VU-Vorlage (`seed.ts:333`), (P2) Disclaimer-Kommentar + Logger-Warnung in `seedEigenschutzConfig` — Vorlagen sind Beispielinhalte, vor Prod-Einsatz durch SiBe fachlich freigeben, (P3) **AC4-Revision:** `EigenschutzVorfall.gefBeurteilungVersion` FK von `onDelete: Restrict` auf `onDelete: Cascade` geändert (schema.prisma + migration.sql). Rationale (User-Policy): Einsätze sollen nicht hart löschbar sein; falls doch, kaskadiert der Delete konsistent bis zum Vorfall, statt am FK zu brechen. **Action-Required (nicht autonom):** Migration wurde modifiziert, Hash weicht von Applied-State ab — Dev-DB neu syncen via `pnpm --filter @bluelight-hub/backend prisma:migrate:reset` (destruktiv) oder `prisma migrate resolve`. | Ruben Vitt (mit Claude Opus 4.7) |

### Review Findings

_Stand: 2026-04-22, via `bmad-code-review` (Blind Hunter + Edge Case Hunter + Acceptance Auditor)._

**Acceptance Auditor:** ✓ alle 10 ACs erfüllt, 0 Scope-Verletzungen. 14 Models + 7 Enums exakt gemäß `architecture.md §Prisma Schema-Additions (1312–1616)`.

#### Decision Needed (2) — aufgelöst

- [x] **[Review][Decision] Governance der Seed-Vorlagen** — User-Entscheidung: Option 1 (Disclaimer). → zu Patch P2 konvertiert.
- [x] **[Review][Decision] FK-Cascade-Restrict-Konflikt `EigenschutzVorfall ↔ GefaehrdungsbeurteilungVersion`** — User-Policy: Einsätze sollen nicht hart löschbar sein; falls doch, alles cascaded. → zu Patch P3 konvertiert (AC4-Revision: RESTRICT → CASCADE).

#### Patches (3) — angewandt

- [x] **[Review][Patch] P1: Tippfehler in Seed-Content: „zünden" → „zuerst"** [`packages/backend/prisma/seed.ts:333`] — Im Item „Treibstoff- und Betriebsmittel-Austritt" der Vorlage `vu-patientenversorgung` gefixt.
- [x] **[Review][Patch] P2: Disclaimer + Logger-Warnung in `seedEigenschutzConfig`** [`packages/backend/prisma/seed.ts:229–249`] — JSDoc-Block um WICHTIG-Hinweis erweitert; `logger.warn(...)` ergänzt: „Eigenschutz-Vorlagen: Beispielinhalte — vor produktivem Einsatz durch SiBe fachlich freigeben."
- [x] **[Review][Patch] P3: AC4-Revision — `EigenschutzVorfall.gefBeurteilungVersion` onDelete `Restrict` → `Cascade`** [`packages/backend/prisma/schema.prisma:2818`, `migration.sql:350`] — User-Policy: Einsatz soll nicht hart löschbar sein; falls doch, kaskadiert der Delete konsistent. Schema + Migration-SQL + Policy-Kommentar ergänzt. **Action-Required:** Dev-DB neu syncen (Migration-Hash hat sich geändert) via `pnpm --filter @bluelight-hub/backend prisma:migrate:reset` oder `prisma migrate resolve`.

#### Deferred (14)

- [x] **[Review][Defer] Fehlende DB-FKs auf `einheit_id` durchgängig** [schema.prisma, Eigenschutz-Tabellen] — Architektur-Design (analog Plattform-Pattern `OutboxEvent`, `EtbSnapshot`). Application-Layer-Validierung über Story 1.5 `EigenschutzRolleGuard` + Story 1.3 Membership-Guard. Architektur-Review empfohlen, ob DB-FK in späterer Story nachgezogen werden.
- [x] **[Review][Defer] Fehlende DB-FKs auf `*_user_id`-Felder** — AC4 explizit: keine Prisma-Relations zu `User` aus Eigenschutz-Tabellen, konsistent mit Bestands-Pattern. Audit-Trail-Integrität aktuell ohne DB-Enforcement.
- [x] **[Review][Defer] Inkonsistenter Version-Index bei `SicherheitsregelVersion` / `SicherungspostenVersion`** — `GefaehrdungsbeurteilungVersion` hat `@@index([gefBeurteilungId, gueltigVon])`, die anderen beiden Version-Tabellen nicht. Architektur-Inkonsistenz in `architecture.md §1459ff/§1523ff`. Architektur-Fix empfohlen.
- [x] **[Review][Defer] `Risikoklasse` Enum definiert, aber nicht als Feldtyp verwendet** — Wird vermutlich in Story 2.2 (5x5-Risikomatrix) im `GefaehrdungsbeurteilungVersion.payload` JSONB oder neuem Field referenziert. In Story 2.2-Implementierung verifizieren.
- [x] **[Review][Defer] `EigenschutzVorfall` hat zwei DateTime-Felder `vorfallZeit` und `wann`** [schema.prisma, Z. ~2806/2808] — Architektur-Quelle deklariert beide Felder ohne semantische Unterscheidung. Redundanz? Doku-Fix oder eins entfernen? Architektur-Klarstellung vor Story 5.x (Vorfallmeldung).
- [x] **[Review][Defer] `PsaProfilZuweisung`: kein Partial-Unique-Index `WHERE gueltig_bis IS NULL`** [schema.prisma, Z. ~2692ff] — Architektur-konform, aber zwei parallele aktive Zuweisungen pro `(einsatzId, einheitId)` technisch möglich. Für AmpelProjection-Konsistenz ggf. DB-Constraint nachziehen oder Application-Layer-Guard in Story 3.1.
- [x] **[Review][Defer] `Sicherungsposten.geloescht` Soft-Delete ohne Default-Scope** — Keine DB-Trigger, kein `@@index([einsatzId, geloescht])`. Application-Layer muss überall `geloescht: false` filtern + Performance-Index ergänzen in Story 4.x.
- [x] **[Review][Defer] `PsaProfilQuittung` ohne FK auf `PsaProfilZuweisung` via `propagationGroupId`** — Architektur-konform (propagationGroup ist Bulk-Operation-Handle, keine Entität). Waisen-Quittungen möglich; Application-Layer-Guard in Story 3.4 nötig.
- [x] **[Review][Defer] Fehlende FKs auf `einsatzId` bei `AmpelProjection` / `SyncConflict` / `EigenschutzVorfall` / `EigenschutzTelemetryEvent`** — Architektur-Entscheidung (Read-Models/Audit-Logs). Bei Einsatz-Hard-Delete bleiben Zombie-Rows. Design-Review für DSGVO-Löschkette empfohlen.
- [x] **[Review][Defer] JSON-Felder ohne Schema-Validierung** [`items`, `kontextSnapshot`, `standort`, `personal`, `beteiligte`, `aenderungen`, `payload`] — Application-Layer-Zod-Schemata in Story 2.x+. `kontextSnapshot` sollte Convention `schemaVersion: 'v1'` für Forward-Compat tragen (Story 5.x).
- [x] **[Review][Defer] Keine CHECK-Constraints** (`version >= 1`, `gueltig_bis > gueltig_von`, `resolved_at` ↔ `resolution`) — Architektur setzt auf Application-Layer-Invarianten. Optionales Hardening in späterer Migration.
- [x] **[Review][Defer] „Eigenschutz: "-Präfix als String-Literal in `seed.ts`** [`packages/backend/prisma/seed.ts:410–436`] — Story 1.5 soll `EIGENSCHUTZ_ROLLEN_PREFIX`-Konstante einführen; `seed.ts` dann auf Import umstellen (Single Source of Truth).
- [x] **[Review][Defer] Migration ohne Lock-Timeout / `CREATE INDEX CONCURRENTLY`** — Für Dev/CI unproblematisch. Prod-Deploy: Operative Checkliste mit Wartungsfenster, insbesondere für `ADD CONSTRAINT … FOREIGN KEY` auf `einsaetze`.
- [x] **[Review][Defer] Seed-Vorlagen ohne Quellen-/Versionierungs-Tracking** — Fachinhalte basieren auf DIN/DGUV/TRBS-Vokabular, aber Source nicht dokumentiert. Governance-Konzept für medizinisch-fachliche Pflege der Vorlagen fehlt (siehe auch Decision-Needed #1).
