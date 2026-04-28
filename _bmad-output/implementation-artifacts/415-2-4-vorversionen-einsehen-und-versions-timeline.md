# Story 2.4: Vorversionen einsehen und Versions-Timeline

Status: done

> **Update 2026-04-28:** Eigenschutz-Rollen-Schicht ist entfernt — Permission-Guard ist die einzige Autorisierungsquelle. Verweise auf `@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')` unten sind historisch; produktiv gilt die Drei-Schicht-Kette `JwtAuthGuard → EinsatzScopeGuard → PermissionsGuard` mit `@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')` allein.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Sicherheitsbeauftragter** (sowie jede andere Eigenschutz-Lese-Rolle — Abschnittsleiter, Einheitsführer, Nachbereitung),
I want **die Änderungshistorie einer Gefährdungsbeurteilung einsehen zu können — chronologische Liste der Versionen mit Wer/Wann/Was sowie eine Read-Only-Detail-Ansicht einer beliebigen alten Version**,
so that **ich im Einsatz nachvollziehen kann, ob die aktuelle Bewertung die letzte ist, und welche Entscheidungen vorher getroffen wurden (FR6, FR43)**.

## Acceptance Criteria

**AC1 — `VersionTimestampFooter`-Footer öffnet Popover mit Versions-Liste**

**Given** eine Gefährdungsbeurteilung ist in der Detail-Page (`GefaehrdungenDetailPage`) offen
**When** der Footer „Stand HH:MM · Name" (`VersionTimestampFooter`, UX-DR10) gerendert wird
**Then** ist er visuell präsent im Seiten-Footer unter dem Editor
**And** zeigt „Stand {HH:MM lokal} · {Anzeige-Name des letzten Bearbeiters}" (Fallback auf `aktualisiertVonUserId`, wenn der User nicht auflösbar ist)
**And** ist ein `<button>` mit `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`
**And** öffnet per Klick oder Enter/Space einen Popover mit der Versionen-Liste (UX-Spec §845 + UX-DR25 — Popover, NICHT Modal).

**AC2 — Popover listet alle Versionen chronologisch absteigend**

**Given** eine Beurteilung mit ≥ 2 Versionen
**When** der Popover offen ist
**Then** zeigt er die Versionen absteigend (neueste zuerst) als `<ul role="listbox">` oder äquivalente A11y-Struktur
**And** jede Zeile zeigt: Versionsnummer (`V{n}`), voller Zeitstempel (Datum **und** Uhrzeit in lokaler Zeitzone, Format „{DD.MM.YYYY HH:mm}"), Anzeige-Name des Urhebers, Kurz-Änderungs-Stichwort
**And** die aktuelle Version trägt visuell + semantisch einen „Aktuell"-Indikator (`aria-current="true"`)
**And** der Kurz-Stichwort wird im Frontend aus `changedFields` des Versions-Eintrags abgeleitet (siehe Formatter-Regeln unten).

**AC3 — Kurz-Änderungs-Stichwort-Formatter-Regeln**

**Given** das Backend liefert `changedFields` in der Story-2.3-Shape `{ added: string[], removed: string[], updated: Array<{ id, fields: string[] }>, unchanged: number }` (bei Versionen ab V2) oder `{ created: true }` (bei V1 aus Story 2.1)
**When** der Frontend-Formatter die Zeile rendert
**Then** gilt:

- `{ created: true }` → „Angelegt"
- Nur `added.length > 0` → „`{n}` Gefährdung(en) hinzugefügt" (Pluralisierung deutsch: `n===1 → „1 Gefährdung hinzugefügt"`, sonst „`{n}` Gefährdungen hinzugefügt")
- Nur `removed.length > 0` → „`{n}` Gefährdung(en) entfernt"
- Nur `updated.length > 0` → „`{n}` Gefährdung(en) geändert"
- Mehrere gleichzeitig → kommagetrennt, Reihenfolge `added, removed, updated` (z. B. „1 Gefährdung hinzugefügt, 2 geändert")
- Alle leer + `unchanged > 0` → „Keine Änderung" (Defensiv-Fallback; Normalfall aus 2.3 ist nicht-leer, aber der Chain erlaubt technisch einen No-Op-Commit)
  **And** der Formatter ist eine reine Pure-Function in `features/eigenschutz/utils/version-summary.ts`, testbar ohne React.

**AC4 — Klick auf eine Versions-Zeile öffnet Read-Only-Drawer**

**Given** der Popover ist offen
**When** der User auf eine Versions-Zeile klickt oder Enter/Space drückt
**Then** schließt sich der Popover (A11y: Focus zurück zur auslösenden Zeile vor Drawer-Öffnung)
**And** öffnet sich ein Drawer (UX-DR25, `w-[480px]` Standard) mit der Read-Only-Detail-Ansicht dieser Version
**And** das Drawer-Root trägt `aria-readonly="true"`
**And** der Drawer-Header lautet „Version {n} von {m} — gültig {DD.MM. HH:mm} bis {DD.MM. HH:mm}" (bei `gueltigBis === null` → „… bis **aktuell**")
**And** der Body zeigt dieselbe Item-Liste-Shape wie der Editor, aber **alle Controls sind deaktiviert** (Inputs `readonly` / `disabled`, keine „+ Gefährdung"-/„Speichern"-Buttons, `RiskMatrix5x5` mit `aria-readonly="true"`)
**And** der Drawer-Footer hat genau einen Button „Schließen" (Tertiary/Ghost).

**AC5 — Aktuelle Version öffnet `Aktuell-Indicator`-Drawer statt Read-Only-Sicht**

**Given** der User klickt im Popover auf die Zeile der aktuellen Version (`gueltigBis === null`)
**When** der Drawer geöffnet wird
**Then** zeigt der Drawer **dieselben** Read-Only-Kontroll-Semantiken wie bei historischen Versionen (für konsistente UX), **aber** der Header lautet „Version {n} — aktuell"
**And** der Body-Inhalt ist byte-identisch mit dem, was der Editor aktuell rendert (Source: gleiche `items` aus `useGefaehrdungsbeurteilung`-Cache)
**And** ein sekundärer Button „Zurück zum Editor" (Secondary) schließt den Drawer **ohne** zum Read-Only-Blick zu zwingen.

**AC6 — Backend-Query-Handler `GetGefaehrdungsbeurteilungHistorieQuery`**

**Given** ein authentifizierter User mit einer Eigenschutz-Lese-Rolle und `eigenschutz:gefaehrdungsbeurteilung:read`-Permission
**When** der Query `GetGefaehrdungsbeurteilungHistorieQuery { einsatzId, gefaehrdungsbeurteilungId }` ausgeführt wird
**Then** lädt der Handler zuerst die Beurteilung via bestehendem `findReadModelById`
**And** prüft symmetrisch zum `GetGefaehrdungsbeurteilungHandler`, dass `readModel.aggregate.einsatzId === query.einsatzId` — Mismatch → `Result.fail(NOT_FOUND)` (bewusst **keine** 403-Leak-Signatur)
**And** lädt alle `GefaehrdungsbeurteilungVersion`-Zeilen für diese `gefBeurteilungId` über die neue Repo-Methode `findVersionsByBeurteilung(gefBeurteilungId)` — absteigend sortiert nach `(gueltigVon DESC, version DESC)` (zwei Sort-Keys, weil `gueltigVon` bei schnellen aufeinanderfolgenden Versionen theoretisch gleich sein kann, aber `version` ist streng monoton)
**And** batched-Resolved alle `changedByUserId` via `IUserRepository.findById` (pro distinct userId **eine** Abfrage, Pattern wie `notiz-response.factory.ts:23-58`) zu Anzeige-Namen (Nachname, Vorname oder Username-Fallback); bei nicht gefundenem User (soft-deleted, gelockt) liefert der Handler `{ id, name: null }` und der DTO-Factory fällt auf die `changedByUserId` zurück
**And** der Handler liefert `Result.ok(HistorieReadModel { aggregateVersion: number, eintraege: Array<HistorieEintragReadModel> })` mit `HistorieEintragReadModel { version, gueltigVon, gueltigBis, changedByUserId, changedByUserName: string | null, changedFields, items }`
**And** der Handler liegt unter `application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/`.

**AC7 — Backend-HTTP-Endpoint + Response-DTO**

**Given** der Controller `GefaehrdungsbeurteilungController`
**When** ein `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/gefaehrdungsbeurteilungen/:id/versionen` eintrifft
**Then** durchläuft er dieselbe 4-Guard-Kette wie `getBeurteilung`:

```
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard)
@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
```

**And** der Endpoint dekoriert sich mit `@ApiWrappedResponse(GefaehrdungsbeurteilungHistorieDto, { description: '…' })` (CLAUDE.md AC7 — **niemals** `@ApiOkResponse`)
**And** `GefaehrdungsbeurteilungHistorieDto` hat die Felder `aggregateVersion: number` + `eintraege: GefaehrdungsbeurteilungHistorieEintragDto[]`, jeder Eintrag mit `version, gueltigVon (ISO 8601), gueltigBis (ISO 8601 | null), changedByUserId, changedByUserName: string | null, changedFields: Record<string, unknown>, items: GefaehrdungItemDto[]`
**And** Fehler-Mapping über `mapQueryError` (existierend in `gefaehrdungsbeurteilung.controller.ts:384-399`) — kein neues Mapping nötig, `NotFound:Beurteilung` → 404, alles andere → 500
**And** bei einer Beurteilung mit nur der initialen Version (V1 aus 2.1) liefert der Endpoint `eintraege.length === 1` mit der V1-Zeile (Edge-Case-AC, kein Silent-Hide im Footer).

**AC8 — Neue Repo-Methode `findVersionsByBeurteilung` + Port-Erweiterung**

**Given** der bestehende Port `IGefaehrdungsbeurteilungVersionRepository`
**When** Story 2.4 landet
**Then** erhält der Port eine neue Methode:

```typescript
interface IGefaehrdungsbeurteilungVersionRepository {
  saveInitialVersion(args, tx): Promise<Result<void>>;
  saveNewVersion(args, tx): Promise<Result<void>>;
  findVersionsByBeurteilung(gefBeurteilungId: string): Promise<Result<GefaehrdungsbeurteilungVersionRow[]>>; // neu
}
```

**And** `GefaehrdungsbeurteilungVersionRow` ist ein schlanker Infrastructure-Typ mit exakt den DB-Spalten (`version, items, changedFields, gueltigVon, gueltigBis, changedByUserId, eventId`), **ohne** Aggregate-Rehydrierung — Rehydrierung via `Gefaehrdungsbeurteilung.reconstitute()` ist explizit **out-of-scope** (siehe Dev Notes „reconstitute-Deferral").
**And** die Prisma-Implementierung `findVersionsByBeurteilung` sortiert `orderBy: [{ gueltigVon: 'desc' }, { version: 'desc' }]` und nutzt den bestehenden Index `@@index([gefBeurteilungId, gueltigVon])` aus `schema.prisma:2651`.

**AC9 — Chain-Intervall-Invariante: halb-offenes Intervall `[gueltigVon, gueltigBis)`**

**Given** die aus Story 2.3 etablierte Chain-Semantik: Story 2.3 schließt die Vorversion mit `gueltigBis = neueVersion.gueltigVon` (identischer Zeitstempel, siehe `prisma-gefaehrdungsbeurteilung-version.repository.ts:133-148`)
**When** Story 2.4 die Query-Semantik erstmals konsumiert („Finde die Version, die zum Zeitpunkt T aktiv war")
**Then** gilt die Invariante **halb-offenes Intervall `[gueltigVon, gueltigBis)`** — d. h. der exakte Zeitpunkt `T = gueltigBis` gehört zur **Folge**-Version, nicht zur abgeschlossenen Vorversion
**And** die Point-in-Time-Query lautet dokumentiert:

```sql
SELECT * FROM gefaehrdungsbeurteilung_versionen
WHERE gef_beurteilung_id = :id
  AND gueltig_von <= :T
  AND (gueltig_bis > :T OR gueltig_bis IS NULL)
```

**And** die Invariante ist als JSDoc-Block in `prisma-gefaehrdungsbeurteilung-version.repository.ts` (oberhalb `saveNewVersion` und der neuen `findVersionsByBeurteilung`) dokumentiert
**And** ein Repo-Regressionstest assertet `V1.gueltigBis === V2.gueltigVon` bei drei sequenziellen Updates (V1 → V2 → V3), und dass eine Point-in-Time-Query auf `T = V1.gueltigBis` exakt V2 liefert, **nicht** V1.

**And** **Folge für Story 2.4 selbst (kein eigener AC-Impact):** Die Timeline-Historie benötigt die Point-in-Time-Query aktuell **nicht** (wir listen alle Versionen, nicht „die Version zum Zeitpunkt X"). Sie wird jedoch in Story 5.2 (Vorfall-Snapshot) gebraucht; die Invariante + Dokumentation müssen hier **trotzdem** landen, damit spätere Konsumenten sie nutzen können. Das ist der Grund für das Deferral aus 2.2 auf diese Story.

**AC10 — Frontend-Query-Hook `useGefaehrdungsbeurteilungHistorie`**

**Given** die bestehende Query-Hook-Factory in `features/eigenschutz/api/queries.ts`
**When** Story 2.4 landet
**Then** gibt es einen neuen Hook `useGefaehrdungsbeurteilungHistorie(einsatzId, id)` mit:

- Query-Key: `['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungen', id, 'historie']` (aus `EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie(einsatzId, id)` — neuer Factory-Eintrag, strukturell mit `.all()`/`.gefaehrdungsbeurteilung()`-Sub-Key konsistent)
- `queryFn`: ruft `api.eigenschutz().gefaehrdungsbeurteilungControllerGetHistorieVAlpha({ einsatzId, id })` (aus dem regenerierten API-Client)
- `retry: eigenschutzRetry` (403 → kein Retry)
- `meta: { silentError: true }` (UX-DR21)
- `enabled: Boolean(einsatzId) && Boolean(id)`
- `staleTime: 5_000` (Timeline aktualisiert sich nach Writes; 5 s dämpft das Request-Volumen beim schnellen Popover-Open/Close-Toggle)
  **And** bei erfolgreichem Mutation-Commit durch `useUpdateGefaehrdungsbeurteilungItems` wird der Historien-Query-Key **nicht** zusätzlich invalidiert (Popover ist Teil der Detail-Page; TanStack refetched bei Popover-Open selbst — Over-Invalidierung spart man).

**AC11 — `VersionTimestampFooter`-Molecule-Komponente**

**Given** der UX-DR10-Vertrag (Molecule · Promotion-Kandidat) + Design-System-Mikro-Footer-Pattern
**When** Story 2.4 landet
**Then** existiert `features/eigenschutz/ui/molecules/VersionTimestampFooter.tsx` mit den Props `{ aktualisiertAm: string | Date, aktualisiertVonUserId: string, version: number, onOpen?: () => void, isOpen?: boolean, popoverId: string }`
**And** die Komponente rendert `<button type="button" aria-haspopup="dialog" aria-expanded={isOpen ?? false} aria-controls={popoverId} data-testid="version-timestamp-footer">Stand {HH:mm} · {UserId-Kurzform}</button>` plus einen Mini-Chip „V{version}"
**And** **bewusste Scope-Entscheidung:** Der Footer zeigt **immer** die UserId-Kurzform (`aktualisiertVonUserId.slice(-8)`), niemals einen aufgelösten Namen. Grund: `GefaehrdungsbeurteilungDto` (Story 2.1/2.3) trägt keinen resolved `aktualisiertVonUserName`; ein zusätzlicher User-Lookup auf der Main-Query würde Scope zusätzlich aufblähen (eigene Plattform-DTO-Erweiterung). Die vollen Namen werden im Historie-Popover (AC6 Backend-Auflösung) gezeigt — das ist die primäre Informations-Quelle für „Wer hat wann geändert?". Der Footer ist nur ein Preview-Trigger; kleine UX-Asymmetrie zwischen Footer und Popover ist akzeptiert und in Dev Notes (§„Scope-Entscheidung: Footer-Namens-Resolution") begründet.
**And** Touch-Target-Höhe ≥ 44 × 44 px (UX-DR28; da Secondary im Footer, nicht Primary).

**AC12 — `GefaehrdungsbeurteilungHistoriePopover`-Organism**

**Given** die Vorgabe aus UX-DR25 (Popover für Kontext-kurze Aktionen)
**When** Story 2.4 landet
**Then** existiert `features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungHistoriePopover.tsx` als Headless-UI-`Popover`-Integration mit den Props `{ einsatzId, gefaehrdungsbeurteilungId, anchorEl | Trigger-Children, onSelectVersion: (entry) => void }`
**And** die Komponente nutzt intern `useGefaehrdungsbeurteilungHistorie`, zeigt Loading-Skeleton (3 Zeilen), Fehler-Zustand (inline, `role="alert"` div — Zero-Toast UX-DR21), Empty-Zustand (niemals Anzeige eines leeren Popovers — Backend liefert mindestens V1; Defensive-Branch fällt auf „Keine Versionen verfügbar" zurück)
**And** jede Versions-Zeile ist per Tastatur erreichbar (`role="option"` + `onKeyDown` Enter/Space), Auswahl triggert `onSelectVersion`
**And** Tests verifizieren: A11y-Root-Shape (role="dialog" oder role="listbox"), Keyboard-Navigation, Escape schließt, Focus-Trap.

**AC13 — `GefaehrdungsbeurteilungVersionDrawer`-Organism (Read-Only)**

**Given** UX-DR25 Drawer (`w-[480px]`) als Default für kontexterhaltende Aktionen
**When** Story 2.4 landet
**Then** existiert `features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungVersionDrawer.tsx` mit den Props `{ entry: HistorieEintrag | null, aggregateVersion: number, onClose: () => void }`
**And** Drawer-Root: Headless-UI `Dialog` mit `aria-readonly="true"`, `aria-labelledby` auf den Header
**And** Header: „Version {entry.version} von {aggregateVersion} — gültig {DD.MM. HH:mm} bis {formatGueltigBis(entry.gueltigBis)}" (Helper `formatGueltigBis` mappt `null` → „aktuell")
**And** bei `entry.version === aggregateVersion` (aktuelle Version) ist der Header-Text „Version {n} — aktuell" und im Footer erscheint zusätzlich zum „Schließen" ein Secondary-Button „Zurück zum Editor" (der **nur** den Drawer schließt — kein Redirect, der User ist bereits auf der Detail-Page)
**And** der Body rendert die Items **genauso wie `GefaehrdungenEditorOrganism`**, aber:

- alle `<input>`, `<textarea>`, `<select>` sind `readonly` bzw. `disabled`
- `RiskMatrix5x5` wird in einem neuen Read-Only-Modus gerendert (siehe AC14)
- kein „+ Gefährdung"-Button, kein „Speichern"-Button
  **And** Tests verifizieren Keyboard-only-Durchlauf (Tab-Order durch alle Items, Escape schließt).

**AC14 — `RiskMatrix5x5` Read-Only-Variante**

**Given** die bestehende `RiskMatrix5x5`-Organism-Komponente aus Story 2.2
**When** Story 2.4 landet
**Then** akzeptiert `RiskMatrix5x5` eine neue `readOnly?: boolean`-Prop (Default `false`, bestehendes Verhalten unverändert)
**And** bei `readOnly === true`:

- das Root-Element trägt `aria-readonly="true"`
- `role="grid"` bleibt, aber `onClick` / `onKeyDown` sind No-Ops
- die selektierte Zelle wird markiert (gleicher visueller Stil `aria-selected="true"`), aber Hover-/Focus-Änderung ändert nicht die Auswahl
- Keyboard-Fokus kann die Zellen durchwandern (für Screenreader-Verifikation), aber Enter/Space löst keine `onChange` aus
  **And** Tests verifizieren: mit `readOnly` und ungewollten Klicks bleibt die Auswahl stabil, mit `readOnly=false` bleibt das bestehende Verhalten aus 2.2.

**AC15 — Permission-Matrix: alle Lese-Rollen dürfen die Historie sehen**

**Given** die FR43-Anforderung „Jeder Nutzer mit Lese-Recht kann die Änderungshistorie einsehen"
**When** ein Nutzer mit Permission `eigenschutz:gefaehrdungsbeurteilung:read` und einer der Lese-Rollen (`Sicherheitsbeauftragter`, `Abschnittsleiter`, `Einheitsführer`, `Nachbereitung`) den Endpoint aufruft
**Then** antwortet der Server mit 200 + voller Payload
**And** ein Nutzer ohne `:read`-Permission → 403 (durch `PermissionsGuard`)
**And** ein Nutzer, der kein Einsatz-Mitglied ist → 403 (durch `EinsatzScopeGuard`, Story 1.3)
**And** ein Nutzer mit Lese-Permission, aber für einen **anderen** Einsatz (Beurteilungs-ID gehört zu fremden Einsatz) → 404 (symmetrisch zum `GetGefaehrdungsbeurteilungHandler`-Verhalten, Existenz-Leak vermieden).

**AC16 — Kein Schema-Change, kein neues Event**

**Given** Story 2.4 ist ausschließlich Read-Only
**When** die Implementierung landet
**Then** gibt es **keine** Prisma-Migration (die existierende Tabelle `gefaehrdungsbeurteilung_versionen` reicht)
**And** **keine** neuen Domain-Events (keine Änderung an der Event-Registry, keine 4-Stellen-Registry-Bedienung)
**And** **keine** Änderungen am Outbox-Flow, Serializer, Deserializer oder Event-Adaptern
**And** der bestehende Index `@@index([gefBeurteilungId, gueltigVon])` (schema.prisma:2651) deckt die neue `ORDER BY gueltigVon DESC`-Query effizient ab.

**AC17 — Integrations-Test: Endpoint liefert Historie mit aufgelösten User-Namen (bedingt aktiv)**

**Given** eine via Test-Setup angelegte Beurteilung mit 3 Versionen (V1 via Create, V2 + V3 via `updateItems`)
**When** der Endpoint `GET …/gefaehrdungsbeurteilungen/:id/versionen` aufgerufen wird
**Then** liefert die Response 3 Einträge (`eintraege.length === 3`)
**And** `eintraege[0].version === 3, eintraege[1].version === 2, eintraege[2].version === 1` (DESC-Sortierung)
**And** `eintraege[0].gueltigBis === null` (aktuelle Version)
**And** `eintraege[1].gueltigBis === eintraege[0].gueltigVon` (Chain-Intervall aus AC9)
**And** `eintraege[2].gueltigBis === eintraege[1].gueltigVon`
**And** `eintraege[0].changedByUserName` ist gesetzt (der Test-User-Name), **oder** `null` falls User-Repo-Test-Fixture keinen Namen bereitstellt — der Test muss beide Pfade deterministisch abdecken.

**Harness-Vorbehalt (aus `deferred-work.md:100-104`):** Das vollständige HTTP-Integration-Harness („Seeded Admin + JWT + Per-Test-Einsatz") existiert **noch nicht** — Story 2.3 hat AC8/AC9/AC12 aus diesem Grund `.skip` belassen, sie warten auf den „nächsten passenden Dev-Slot". Story 2.4-Task 6 entscheidet beim Start über den Weg (Build-Harness vs. Defer, siehe Task 6.6 unten); die `AKTIV`-Variante gilt nur, wenn das Harness steht. Andernfalls wandert AC17 als `.skip`-Skelett in den `deferred-work.md`-Tracker als opportunistischer Follow-up.

## Tasks / Subtasks

- [x] **Task 1 — Backend: Port-Erweiterung + Infrastructure-Typ** (AC8)
  - [x] 1.1 — `IGefaehrdungsbeurteilungVersionRepository.findVersionsByBeurteilung(gefBeurteilungId: string): Promise<Result<GefaehrdungsbeurteilungVersionRow[]>>` in `domain/eigenschutz/repositories/i-gefaehrdungsbeurteilung-version.repository.ts` ergänzen — Port bleibt framework-agnostisch, Row-Typ liegt im gleichen File als separater Interface-Export.
  - [x] 1.2 — `GefaehrdungsbeurteilungVersionRow` als Interface: `{ version: number; items: GefaehrdungItem[]; changedFields: Record<string, unknown>; gueltigVon: Date; gueltigBis: Date | null; changedByUserId: string; eventId: string | null; }` — keine Aggregate-Referenz, kein Mapper.
  - [x] 1.3 — JSDoc am Port-Interface + Infrastructure-Implementation: halb-offenes `[gueltigVon, gueltigBis)`-Intervall erklären (AC9, Referenz auf die Invariante aus 2.3).
  - [x] 1.4 — DI-Token für das Version-Repo ist bereits registriert (`GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY` in `infrastructure/di-tokens.ts:464`); **keine neue Token-Registrierung**.

- [x] **Task 2 — Backend: Prisma-Implementierung `findVersionsByBeurteilung`** (AC8, AC9)
  - [x] 2.1 — In `infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts` Methode `findVersionsByBeurteilung(gefBeurteilungId)` ergänzen:
    ```typescript
    async findVersionsByBeurteilung(gefBeurteilungId: string): Promise<Result<GefaehrdungsbeurteilungVersionRow[]>> {
      try {
        const rows = await this.prisma.gefaehrdungsbeurteilungVersion.findMany({
          where: { gefBeurteilungId },
          orderBy: [{ gueltigVon: 'desc' }, { version: 'desc' }],
        });
        return Result.ok(rows.map((row) => PrismaGefaehrdungsbeurteilungMapper.toVersionRow(row)));
      } catch (error) {
        this.logger.error('Fehler beim Laden der Versions-Chain', { gefBeurteilungId, error: ... });
        return Result.fail('InfrastructureError:LoadVersions');
      }
    }
    ```
  - [x] 2.2 — `PrismaService` injection ergänzen (bisher im Repo **nicht** injiziert, weil `saveInitialVersion`/`saveNewVersion` mit `tx` arbeiten — `findMany` braucht `this.prisma` direkt). Constructor-Signatur erweitern, dabei sorgen, dass bestehende Specs nicht brechen (Test-Bed braucht neuen `PrismaService`-Provider).
  - [x] 2.3 — Mapper-Methode `PrismaGefaehrdungsbeurteilungMapper.toVersionRow(row): GefaehrdungsbeurteilungVersionRow` in `infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts` ergänzen; `row.items` via bestehende `fromPersistenceItems` → `GefaehrdungItem[]` rehydrieren.
  - [x] 2.4 — Unit-Tests für `findVersionsByBeurteilung` in `prisma-gefaehrdungsbeurteilung-version.repository.spec.ts`: Mock-Tests für Prisma-Call-Shape + 1 Error-Test.
  - [x] 2.5 — Integration-Test (läuft `--runInBand` gegen echte DB, wie bestehende `.it`-Integration-Tests im gleichen Spec-File) für AC9-Chain-Intervall: 3 sequenzielle Updates anlegen, dann `findVersionsByBeurteilung` aufrufen, Assertions auf `V1.gueltigBis === V2.gueltigVon`, Count, Sortierung.

- [x] **Task 3 — Backend: Query + Handler `GetGefaehrdungsbeurteilungHistorieQuery`** (AC6)
  - [x] 3.1 — Neues Verzeichnis `application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/` analog zu `get-gefaehrdungsbeurteilung/` anlegen.
  - [x] 3.2 — `get-gefaehrdungsbeurteilung-historie.query.ts`:
    ```typescript
    export class GetGefaehrdungsbeurteilungHistorieQuery {
      constructor(
        readonly einsatzId: string,
        readonly gefaehrdungsbeurteilungId: string,
      ) {}
    }
    ```
  - [x] 3.3 — `get-gefaehrdungsbeurteilung-historie.handler.ts`: injiziert `GEFAEHRDUNGSBEURTEILUNG_REPOSITORY` (für Cross-Einsatz-Check), `GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY` (für Historie), `USER_REPOSITORY` (für Namens-Resolution).
  - [x] 3.4 — Handler-Flow:
    1. `findReadModelById(gefaehrdungsbeurteilungId)` → `NOT_FOUND`-Sentinel bei null.
    2. Cross-Einsatz-Check: `readModel.aggregate.einsatzId !== query.einsatzId` → `NOT_FOUND` (kein 403-Leak).
    3. `findVersionsByBeurteilung(gefaehrdungsbeurteilungId)` → Liste.
    4. Distinct-`changedByUserId`-Set bilden, `userRepository.findById(...)` pro User (batched — ein Promise.all-Call, N Roundtrips; Plattform-Caching liegt außerhalb Story-Scope).
    5. Map `VersionRow → HistorieEintragReadModel { version, gueltigVon, gueltigBis, changedByUserId, changedByUserName, changedFields, items }`. Name-Resolution: `user?.displayName ?? user?.name ?? user?.username ?? null` (siehe Pattern in `notiz-response.factory.ts:58`, konkrete Feld-Namen in `IUserRepository` ermitteln).
    6. `Result.ok({ aggregateVersion: readModel.aggregate.version, eintraege: [...] })`.
  - [x] 3.5 — Sentinel-Konstanten-File: `GET_GEFAEHRDUNGSBEURTEILUNG_HISTORIE_ERROR_CODES = { NOT_FOUND: 'NotFound:Beurteilung' }` (identisch zu `GetGefaehrdungsbeurteilungHandler`, damit der Controller `mapQueryError` wiederverwenden kann).
  - [x] 3.6 — Unit-Tests: Happy-Path (3 Versionen, 2 unterschiedliche User), Not-Found (unbekannte ID), Cross-Einsatz-Leak-Check (fremder `einsatzId`), User-Repo-Failure (User-Lookup liefert `null` → `changedByUserName: null`, aber Historie wird **trotzdem** geliefert — Defensive, nicht-blockierend).

- [x] **Task 4 — Backend: DTO + Factory + Controller-Route** (AC7)
  - [x] 4.1 — `application/eigenschutz/dto/gefaehrdungsbeurteilung-historie-eintrag.dto.ts`:
    ```typescript
    export class GefaehrdungsbeurteilungHistorieEintragDto {
      @ApiProperty({ description: 'Versionsnummer (monoton)' }) version!: number;
      @ApiProperty({ description: 'ISO-8601 gültig ab' }) gueltigVon!: string;
      @ApiPropertyOptional({ description: 'ISO-8601 gültig bis (null = aktuell)', nullable: true }) gueltigBis!: string | null;
      @ApiProperty({ description: 'User-ID des Bearbeiters' }) changedByUserId!: string;
      @ApiPropertyOptional({ description: 'Aufgelöster Anzeige-Name (null bei soft-deleted User)', nullable: true }) changedByUserName!: string | null;
      @ApiProperty({ description: 'Geänderte Felder (Shape analog Story 2.3)', type: 'object', additionalProperties: true }) changedFields!: Record<string, unknown>;
      @ApiProperty({ description: 'Vollständige Items-Liste dieser Version', type: () => GefaehrdungItemDto, isArray: true }) items!: GefaehrdungItemDto[];
    }
    ```
  - [x] 4.2 — `application/eigenschutz/dto/gefaehrdungsbeurteilung-historie.dto.ts`:
    ```typescript
    export class GefaehrdungsbeurteilungHistorieDto {
      @ApiProperty({ description: 'Aktuelle Aggregate-Version (für UI-Indikator "V N von M")' }) aggregateVersion!: number;
      @ApiProperty({ type: () => GefaehrdungsbeurteilungHistorieEintragDto, isArray: true }) eintraege!: GefaehrdungsbeurteilungHistorieEintragDto[];
    }
    ```
  - [x] 4.3 — Factory `application/eigenschutz/dto/gefaehrdungsbeurteilung-historie.factory.ts`: `toHistorieDto(readModel)` baut das DTO, mapped `items` via bestehender `toGefaehrdungItemDto` (pro Eintrag).
  - [x] 4.4 — In `modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` neue Route `getHistorie`:
    ```typescript
    @Get('gefaehrdungsbeurteilungen/:id/versionen')
    @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
    @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
    @ApiOperation({ summary: 'Versionshistorie einer Gefährdungsbeurteilung (Story 2.4)' })
    @ApiParam({ name: 'einsatzId', type: String }) @ApiParam({ name: 'id', type: String })
    @ApiNotFoundResponse({ description: 'Beurteilung existiert nicht oder gehört zu einem anderen Einsatz' })
    @ApiWrappedResponse(GefaehrdungsbeurteilungHistorieDto, { description: 'Chronologische Versions-Liste, absteigend sortiert.' })
    async getHistorie(@Param('einsatzId') einsatzId: string, @Param('id') id: string) { ... }
    ```
  - [x] 4.5 — Controller-Handler nutzt `mapQueryError` (existierend) — kein neues Error-Mapping nötig.
  - [x] 4.6 — Controller-Unit-Spec: Happy-Path, 404 (Not-Found-Sentinel), 500 (Generic-Fail).

- [x] **Task 5 — Backend: Application-Module-Provider-Registrierung**
  - [x] 5.1 — `application/eigenschutz/eigenschutz-application.module.ts` um den neuen Handler erweitern (Query-Handler-Provider + `CqrsModule`-Vertrag). Pattern: analog zu `GetGefaehrdungsbeurteilungHandler`-Eintrag.
  - [x] 5.2 — Sicherstellen, dass `USER_REPOSITORY` im `EigenschutzApplicationModule`-Kontext verfügbar ist. **Verifikation:** `UserInfrastructureModule` wird in `app.module.ts` global gescoped bereitgestellt (über `ConfigModule` o. ä.) oder muss hier explizit importiert werden. Pattern aus `notiz-application.module.ts` bzw. `etb-application.module.ts` prüfen — wenn die dort ohne expliziten Import auf `USER_REPOSITORY` zugreifen, kopiert sich Story 2.4 das; sonst muss `UserInfrastructureModule` hier importiert werden.

- [x] **Task 6 — Backend: Controller-Integration-Test** (AC17)
  - [x] 6.1 — In `gefaehrdungsbeurteilung.controller.integration.spec.ts` einen neuen `describe('GET …/versionen (Story 2.4)')`-Block ergänzen.
  - [x] 6.2 — Setup: Test-User mit setzbarem Namen; Beurteilung anlegen (V1), 2× `updateItems` ausführen (V2, V3).
  - [x] 6.3 — Assertions: Response 200, `eintraege.length === 3`, Sortierung DESC, `eintraege[0].gueltigBis === null`, Chain-Intervall V1.gueltigBis === V2.gueltigVon, User-Namen aufgelöst oder deterministisch `null`.
  - [x] 6.4 — Negativ-Test: Fremder `einsatzId` → 404 (symmetrisch zu `GetGefaehrdungsbeurteilungHandler`).
  - [x] 6.5 — Negativ-Test: User ohne Lese-Permission → 403 durch `PermissionsGuard` (Guard-Kette-Verifikation).
  - [x] 6.6 — **Harness-Entscheidung beim Task-Start (kritisch):** Dev-Agent prüft, ob das HTTP-Integration-Harness („Seeded Admin + JWT + Per-Test-Einsatz", benötigt auch für AC8/AC9/AC12 aus Story 2.3 deferred-work) bereits existiert:
    - **Fall A — Harness vorhanden:** AC17 wird als aktiver `.it(...)`-Test implementiert; optional opportunistischer Fix der 3 Story-2.3-`.skip`-Skeletons (AC8/AC9/AC12) im selben PR als bonus (Eintrag in `deferred-work.md` wird dann gestrichen).
    - **Fall B — Harness fehlt noch:** Dev-Agent baut das Harness im Rahmen von Task 6 als reusable Helper (Pattern analog zu Story 2.1-Task 9 Follow-up) — zusätzlicher Aufwand ~2-3 h, aber einmaliger Platform-Invest. **Nach** Harness-Build AC17 aktivieren.
    - **Fall C — Harness-Build würde Story-Scope sprengen:** AC17 bleibt `.skip`-Skelett mit deterministischem Prosa-Kommentar. In Completion-Notes + `deferred-work.md` als „Story 2.4 AC17 → harness-blocked, follow-up mit Story-2.3 AC8/AC9/AC12" eintragen. Die Mock-basierten Unit-Tests (Task 3.6, Task 4.6) bleiben AKTIV und decken die Kern-Logik ab.
    - Dev-Agent dokumentiert die gewählte Variante in Completion-Notes + Change-Log.

- [x] **Task 7 — Shared-Schema: Response-Shape-Export** (AC10)
  - [x] 7.1 — In `packages/shared/src/schemas/eigenschutz/gefaehrdungsbeurteilung.schema.ts` ergänzen:
    ```typescript
    export const gefaehrdungsbeurteilungHistorieEintragSchema = z.object({
      version: z.number().int().positive(),
      gueltigVon: z.string(),
      gueltigBis: z.string().nullable(),
      changedByUserId: z.string(),
      changedByUserName: z.string().nullable(),
      changedFields: z.record(z.unknown()),
      items: z.array(gefaehrdungItemSchema),
    });
    export const gefaehrdungsbeurteilungHistorieSchema = z.object({
      aggregateVersion: z.number().int().positive(),
      eintraege: z.array(gefaehrdungsbeurteilungHistorieEintragSchema),
    });
    export type GefaehrdungsbeurteilungHistorieEintrag = z.infer<typeof gefaehrdungsbeurteilungHistorieEintragSchema>;
    export type GefaehrdungsbeurteilungHistorie = z.infer<typeof gefaehrdungsbeurteilungHistorieSchema>;
    ```
  - [x] 7.2 — Re-Export im Feature-Schema-File `features/eigenschutz/schemas/gefaehrdungsbeurteilung.schema.ts`.

- [x] **Task 8 — Frontend: Query-Hook + Query-Key-Factory** (AC10)
  - [x] 8.1 — In `features/eigenschutz/api/queries.ts`:
    - `EIGENSCHUTZ_QUERY_KEYS` um `gefaehrdungsbeurteilungHistorie: (einsatzId, id) => ['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungen', id, 'historie'] as const` erweitern.
    - Hook `useGefaehrdungsbeurteilungHistorie(einsatzId, id)` analog zu `useGefaehrdungsbeurteilung`: `useQuery` mit `queryFn: api.eigenschutz().gefaehrdungsbeurteilungControllerGetHistorieVAlpha({ einsatzId, id }).data as GefaehrdungsbeurteilungHistorie`, `retry: eigenschutzRetry`, `meta: { silentError: true }`, `enabled: Boolean(einsatzId) && Boolean(id)`, `staleTime: 5_000`.
  - [x] 8.2 — Hook-Unit-Spec in `features/eigenschutz/api/__tests__/queries.spec.tsx`: erfolgreicher Load, 403-No-Retry, Empty-Fallback.

- [x] **Task 9 — Frontend: `VersionTimestampFooter`-Molecule** (AC11)
  - [x] 9.1 — `features/eigenschutz/ui/molecules/VersionTimestampFooter.tsx`: Props-Typ ohne `aktualisiertVonUserName` (bewusste Scope-Grenze: siehe AC11 + Dev Notes §„Scope-Entscheidung: Footer-Namens-Resolution"), Render-Shape (`<button>`), Format-Helper `formatLocalTime(iso)` (entweder inline oder aus `shared/utils/format-time.ts`, falls existent), `aktualisiertVonUserId.slice(-8)` immer als Anzeige.
  - [x] 9.2 — Unit-Spec: Default-Render, A11y (`aria-haspopup`, `aria-expanded`, `aria-controls`), Anzeige der UserId-Kurzform, Touch-Target-Mindesthöhe.

- [x] **Task 10 — Frontend: Stichwort-Formatter** (AC3)
  - [x] 10.1 — `features/eigenschutz/utils/version-summary.ts`:
    ```typescript
    export function formatChangedFieldsSummary(changedFields: Record<string, unknown>): string {
      if (changedFields.created === true) return 'Angelegt';
      const added = Array.isArray(changedFields.added) ? changedFields.added.length : 0;
      const removed = Array.isArray(changedFields.removed) ? changedFields.removed.length : 0;
      const updated = Array.isArray(changedFields.updated) ? changedFields.updated.length : 0;
      const parts: string[] = [];
      if (added > 0) parts.push(`${added} ${added === 1 ? 'Gefährdung' : 'Gefährdungen'} hinzugefügt`);
      if (removed > 0) parts.push(`${removed} ${removed === 1 ? 'Gefährdung' : 'Gefährdungen'} entfernt`);
      if (updated > 0) parts.push(`${updated} ${updated === 1 ? 'Gefährdung' : 'Gefährdungen'} geändert`);
      return parts.length === 0 ? 'Keine Änderung' : parts.join(', ');
    }
    ```
  - [x] 10.2 — Tests in `features/eigenschutz/utils/__tests__/version-summary.spec.ts`: alle 7 Cases (created, nur-added, nur-removed, nur-updated, added+removed, alle-drei, nur-unchanged).

- [x] **Task 11 — Frontend: `GefaehrdungsbeurteilungHistoriePopover`-Organism** (AC12)
  - [x] 11.1 — `features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungHistoriePopover.tsx`: Headless-UI `Popover` oder eigene Popover-Logik (Pattern aus bestehendem Repo prüfen; falls keines existiert, Headless-UI `Dialog` mit `role="listbox"` als Content).
  - [x] 11.2 — Props: `{ einsatzId, gefaehrdungsbeurteilungId, trigger: ReactNode, onSelectVersion: (entry) => void }`.
  - [x] 11.3 — Unit-Spec: Loading, Error, Empty-Defensive, alle Versions-Zeilen rendern, Keyboard-Nav (Arrow-Down/Up, Enter/Space, Escape).

- [x] **Task 12 — Frontend: `GefaehrdungsbeurteilungVersionDrawer`-Organism** (AC13, AC4, AC5)
  - [x] 12.1 — `features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungVersionDrawer.tsx`: Headless-UI `Dialog` als Drawer.
  - [x] 12.2 — Header-Text via Helper (`formatHeaderText(entry, aggregateVersion)`): „Version {n} — aktuell" (wenn aktuelle Version), sonst „Version {n} von {m} — gültig {D} bis {D}".
  - [x] 12.3 — Body: Liste der `entry.items` rendert entweder einen eigenen Read-Only-Block oder nutzt `GefaehrdungenEditorOrganism` mit einer neuen Prop `readOnly: true` (Task 13 ergänzt die Editor-Prop, falls Re-Use sinnvoll). **Empfehlung:** Eigener Read-Only-Block im Drawer — weniger Kopplung, keine Reform des Editors.
  - [x] 12.4 — Footer: „Schließen" (Tertiary), bei aktueller Version zusätzlich „Zurück zum Editor" (Secondary — identisch zu `onClose`, weil der Editor ja dieselbe Page ist).
  - [x] 12.5 — Unit-Spec: A11y (`aria-readonly`, `aria-labelledby`), Render mit historischer Version + aktueller Version, Keyboard-Close.

- [x] **Task 13 — Frontend: `RiskMatrix5x5` Read-Only-Prop** (AC14)
  - [x] 13.1 — In `features/eigenschutz/ui/organisms/RiskMatrix5x5.tsx` neue Prop `readOnly?: boolean` (Default `false`).
  - [x] 13.2 — Bei `readOnly === true`: Root-Element `aria-readonly="true"`, `onClick` / `onKeyDown` sind No-Ops, visueller Selection-Stil bleibt.
  - [x] 13.3 — Specs ergänzen: `RiskMatrix5x5.spec.tsx` erweitern um Read-Only-Cases (Klick ändert nichts, Keyboard ändert nichts, aria-readonly gesetzt, Tab-Fokus funktioniert).

- [x] **Task 14 — Frontend: Integration in `GefaehrdungenDetailPage`** (AC1)
  - [x] 14.1 — In `features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx` am unteren Seiten-Rand `VersionTimestampFooter` einbetten (nach dem Editor-Organism).
  - [x] 14.2 — State: `const [historiePopoverOpen, setHistoriePopoverOpen] = useState(false); const [selectedEntry, setSelectedEntry] = useState<HistorieEintrag | null>(null);`.
  - [x] 14.3 — Popover-Anbindung: `<GefaehrdungsbeurteilungHistoriePopover einsatzId={einsatzId} gefaehrdungsbeurteilungId={id} trigger={<VersionTimestampFooter … />} onSelectVersion={(entry) => { setSelectedEntry(entry); setHistoriePopoverOpen(false); }} />`.
  - [x] 14.4 — Drawer: `<GefaehrdungsbeurteilungVersionDrawer entry={selectedEntry} aggregateVersion={beurteilung.version} onClose={() => setSelectedEntry(null)} />`.
  - [x] 14.5 — `useGefaehrdungsbeurteilungHistorie` wird **im Popover-Organism** konsumiert, nicht in der Page (lazy-load via `enabled`-Flag im Popover, wenn er offen ist — Optimierung, die Page-Render nicht verzögert).
  - [x] 14.6 — Spec `GefaehrdungenDetailPage.spec.tsx` erweitern: Footer ist sichtbar, Footer-Click öffnet Popover (Mock Historie-Response), Zeile-Click öffnet Drawer.

- [x] **Task 15 — API-Client-Regenerierung**
  - [x] 15.1 — `pnpm run generate-api` ausführen; `packages/shared/client/apis/EigenschutzApi.ts` wird um `gefaehrdungsbeurteilungControllerGetHistorieVAlpha` erweitert.
  - [x] 15.2 — **NIEMALS manuell editieren** (CLAUDE.md API-Workflow).
  - [x] 15.3 — Backend muss zum Zeitpunkt der Regenerierung laufen — Setup via `pnpm --filter @bluelight-hub/backend dev` auf verfügbarem Port oder `pnpm run generate-api` wartet auf einen Integration-Test-Bootstrap (siehe Story 2.3, Completion Notes — Pattern ist etabliert).

- [x] **Task 16 — QA-Gates + Smoke-Verifikation**
  - [x] 16.1 — Backend-Slice: `cd packages/backend && npx jest --testPathPatterns="eigenschutz|gefaehrdung|historie" --runInBand` → alle grün, keine neuen Skips (außer explizit dokumentiert).
  - [x] 16.2 — Frontend-Slice: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="eigenschutz|Version" --no-coverage` → alle grün.
  - [x] 16.3 — DI-Check: `pnpm --filter @bluelight-hub/backend check:di:imports` — 0 Violations.
  - [x] 16.4 — Arch-Check: `pnpm --filter @bluelight-hub/backend check:arch` — 0 neue Warnings.
  - [x] 16.5 — Lint: `pnpm lint` (oxlint + oxfmt) — 0 Errors.
  - [x] 16.6 — TSC: `cd packages/backend && npx tsc --noEmit` + `cd packages/frontend && npx tsc --noEmit` — 0 Errors in den neuen Files.
  - [x] 16.7 — **Manuelles Smoke** (wenn technisch möglich, siehe CLAUDE.md UI-Testing-Regel):
    - Dev-Server starten: `pnpm -r dev`.
    - Als Sicherheitsbeauftragter einloggen (Memory: `rubeen / MyPass123*` via MCP Chrome).
    - Zu einer Einsatz → Eigenschutz → Gefährdungsbeurteilung navigieren.
    - Item anlegen, ändern, speichern — prüfen, dass V1, V2, V3 chronologisch im Popover erscheinen.
    - Klick auf historische Zeile → Read-Only-Drawer öffnet.
    - Klick auf aktuelle Zeile → „— aktuell"-Drawer öffnet.
    - Screenshot festhalten und in Completion-Notes dokumentieren.

## Dev Notes

### Technical Requirements (NICHT-verhandelbar)

**Scope vs. Story 2.3 / 2.5:**

- **Story 2.3** (done) hat die Version-Chain-Invarianten für den Write-Pfad geschärft: DB-Level-Concurrency-Check, Per-Item-Diff-Shape (`{ added, removed, updated, unchanged }`), P2002-Idempotenz auf `event_id`, ConflictContext mit `currentVersion`. Diese Invarianten sind **Voraussetzung** für Story 2.4 (die Timeline konsumiert exakt diese Diff-Shape).
- **Story 2.4** (diese) ist **reines Read-Only**: ein neuer Query-Endpoint, ein neuer Query-Hook, drei UI-Komponenten (Footer, Popover, Drawer) — **keine** Schreibpfade, **keine** Events, **keine** Schema-Änderungen. Einziger strukturell neuer Punkt: `findVersionsByBeurteilung` im Versions-Repo.
- **Story 2.5** (später) baut den Auto-Save-Hook + „Version abschließen"-Button auf **demselben** Write-Endpoint aus Story 2.2/2.3. Die Timeline aus 2.4 zeigt die neuen Auto-Save-Versionen dann automatisch. Story 2.5 ist NICHT scope von 2.4.

**Deferred-Item-Konsolidierung (kritisch!):**

Zwei Deferred-Items aus vorherigen Stories landen **in dieser Story**:

1. **„Version-Chain-Timestamp-Ambiguität bei `gueltigBis = gueltigVon`"** (Deferred aus 2.2, 2026-04-23 — `deferred-work.md:86`): Story 2.3 hat die Chain-Semantik `V1.gueltigBis === V2.gueltigVon` bereits etabliert (identischer Timestamp). Story 2.4 konsumiert das erstmals und **dokumentiert** die halb-offene Intervall-Invariante `[gueltigVon, gueltigBis)` als JSDoc im Versions-Repo + Regression-Test auf Chain-Intervall-Konsistenz (siehe AC9). Die Point-in-Time-Query wird hier noch NICHT konsumiert (Story 2.4 listet Versionen, sie navigiert nicht zu „Version zum Zeitpunkt T"); Story 5.2 (Vorfall-Snapshot) nutzt sie zuerst. Trotzdem MUSS die Invariante hier landen, damit Story 5.2 darauf aufsetzen kann.

2. **„`reconstitute()` throw→Result"** (Deferred aus 2.3, 2026-04-23 — `deferred-work.md:96`): Story 2.4 **punt** dieses Item bewusst **auf Story 2.5**. Grund: Die Read-Only-Drawer-Sicht in 2.4 nutzt einen **neuen `GefaehrdungsbeurteilungVersionReadModel`**-Typ (schlanker Row-Typ ohne Aggregate-Rehydrierung) — der Drawer rendert die Items direkt aus dem Read-Model, **nicht** via `Gefaehrdungsbeurteilung.reconstitute()`. Das hält Story 2.4 schlank (keine Aggregate-Änderung) und der `reconstitute()`-Fix gehört besser in 2.5, wenn der Auto-Save-Flow die Aggregate-Rehydrierung sowieso anfassen muss (Optimistic-Update-Rollback).

**Advisor-Rationale für diese Scope-Trennung:**

> „Aggregates are write-path; read-models are view-path. Historical read-only views should use a new `GefaehrdungsbeurteilungVersionReadModel` (payload JSONB → items, changedFields, gueltigVon/Bis, changedByUserId), not go through `Gefaehrdungsbeurteilung.reconstitute()`."

**Kein Schema-Change, kein neues Event (AC16):**

- Die Tabelle `gefaehrdungsbeurteilung_versionen` (schema.prisma:2634-2653) deckt alle Felder ab. Index `@@index([gefBeurteilungId, gueltigVon])` ist bereits vorhanden.
- Keine neuen Domain-Events → **keine** 4-Stellen-Registry-Bedienung (Serializer, Deserializer, Adapters-Module, Adapters-Barrel alle unangetastet).
- Keine Outbox-Änderung.
- **Dev-Agent-Warnung:** Wer hier reflexartig nach der Event-Registry greift, weil Story 1.7/2.1/2.2/2.3 das alle gemacht haben, ist falsch abgebogen. 2.4 ist Read-Only.

**User-Namens-Resolution — Backend, nicht Frontend (Historie-Popover):**

- Pattern-Referenz: `application/notiz/dto/notiz-response.factory.ts:23-58` injiziert `USER_REPOSITORY` + ruft `userRepository.findById(userId)` pro distinct User.
- **Keine** pro-Frontend-Lookup-Hooks für den Popover, weil:
  - zusätzliche N+1 Round-Trips bei 10 Versionen × 5 distinct User = bis zu 15 Requests;
  - verletzt FR48 (Offline-Lese-Fähigkeit): Der Frontend-Cache hat die User-Daten möglicherweise nicht;
  - Backend-Auflösung konsolidiert die Name-Resolution an einer Stelle.
- Fallback bei `findById` → `null` (User soft-deleted, gelockt): `changedByUserName = null`, Frontend fällt auf `userId.slice(-8)` zurück.

**Scope-Entscheidung: Footer-Namens-Resolution (AC11):**

- Der `VersionTimestampFooter` zeigt **nur die UserId-Kurzform** des letzten Bearbeiters, **keinen** aufgelösten Namen.
- **Grund:** Das bestehende `GefaehrdungsbeurteilungDto` (Story 2.1/2.3, `dto.ts:40`) trägt `aktualisiertVonUserId`, aber **keinen** `aktualisiertVonUserName`. Den Footer mit einem Namen zu befüllen würde bedeuten, `GefaehrdungsbeurteilungDto` + `toGefaehrdungsbeurteilungDto`-Factory + `GetGefaehrdungsbeurteilungHandler` (zusätzlich zu Story-2.4-Scope) um eine User-Repo-Auflösung zu erweitern — das sprengt den Scope, weil es die Main-Query anfasst, nicht die Historie.
- **Konsequente UX-Semantik:** Der Footer ist ein **Preview-Trigger** („Letzter Stand HH:MM durch user-kürzel"); die vollen Namen leben im Historie-Popover, der ohnehin der einzige Ort ist, an dem die Attribution ernsthaft konsumiert wird (Epic-2-Anforderung: „Wer hat wann geändert?"). Eine kleine visuelle Asymmetrie zwischen Footer (Kurzform) und Popover (voller Name) ist akzeptabel — sie signalisiert sogar: „Für Details tippe auf den Footer".
- **Zukunfts-Pfad (nicht 2.4 Scope):** Eine plattformweite Angleichung aller DTOs auf „User-ID + aufgelöster Name" ist eine Cross-Cutting-Platform-Aufgabe, die sinnvoll als eigene Story gebündelt wird (vermutlich im Zuge von Story 5.2 Vorfall-Snapshot, wo das Namen-Display nochmal prominenter wird).

**Optimistic-Concurrency-Pattern (Architecture §E):** **Unverändert zu Story 2.3.** Story 2.4 ist Read-Only → kein `expectedVersion` im Query, kein 409.

**Guard-Chain (Architecture §H):** Unverändert `JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard → PermissionsGuard`. Der neue Endpoint bedient dieselbe Chain mit neuen Decorator-Werten:

```typescript
@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
@RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
```

**Controller-Response-Decorator (CLAUDE.md AC7):** **`@ApiWrappedResponse(GefaehrdungsbeurteilungHistorieDto)` — niemals `@ApiOkResponse`** (bricht API-Client-Generation).

**Backend-DI-Imports (CLAUDE.md AC1):** Der neue Handler ist `@Injectable()`; `@Inject(GEFAEHRDUNGSBEURTEILUNG_REPOSITORY)`, `@Inject(GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY)`, `@Inject(USER_REPOSITORY)` alle mit **regulärem `import`**, **niemals `import type`** (bricht NestJS-DI).

**Umlaute (CLAUDE.md):** In JSDoc, Kommentaren, Testbeschreibungen, User-facing Strings **IMMER** korrekte Umlaute (ä, ö, ü, ß). Code-Identifier bleiben ASCII.

**OXC-Toolchain:** oxlint + oxfmt — kein Biome, kein ESLint, kein Prettier.

### Architecture Compliance

**Layer-Boundaries (Hexagonal, Architecture §A):**

```
modules/eigenschutz/controllers/      ← getHistorie-Route (HTTP-Spezifika)
  ↓ nutzt QueryBus
application/eigenschutz/queries/       ← GetGefaehrdungsbeurteilungHistorieHandler
  ↓ über Repository-Ports
domain/eigenschutz/repositories/       ← IGefaehrdungsbeurteilungVersionRepository (erweitert um findVersionsByBeurteilung)
  ↑ implementiert von
infrastructure/eigenschutz/repositories/ ← PrismaGefaehrdungsbeurteilungVersionRepository (erweitert)
```

- Dependencies fließen **IMMER nach innen**: modules → application → domain; infrastructure implementiert domain.
- Domain-Layer bleibt framework-agnostisch (Result-Pattern, keine Prisma-Importe).
- `GefaehrdungsbeurteilungVersionRow` ist **Infrastructure-Typ**, nicht Domain-Aggregate — darf `Date` verwenden (nicht domain-spezifische Value-Objects), weil es ein DB-Row-Shadow ist.

**Kein Aggregate-Mutator in 2.4:** `Gefaehrdungsbeurteilung.aggregate.ts` wird **nicht** angefasst (AC14 berührt nur die UI-Komponente `RiskMatrix5x5`, nicht das Aggregate). Der `reconstitute()`-Fix bleibt explizit deferred.

**Feature-Slice-Isolation (Frontend):** `features/eigenschutz/*` — keine Deep-Imports aus anderen Features. Alle neuen Komponenten unter `features/eigenschutz/ui/{molecules,organisms}/`, neue Utils unter `features/eigenschutz/utils/`, neue Hooks unter `features/eigenschutz/api/queries.ts`.

**Keine neuen DI-Tokens:** `GEFAEHRDUNGSBEURTEILUNG_REPOSITORY` + `GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY` existieren (di-tokens.ts:463-464). `USER_REPOSITORY` existiert auch. Token-Registry bleibt unverändert.

**Keine neuen DB-Indizes:** Der `@@index([gefBeurteilungId, gueltigVon])` auf `GefaehrdungsbeurteilungVersion` (schema.prisma:2651) deckt die neue DESC-Query effizient ab (Postgres B-Tree Index kann DESC-Scan ohne Extra-Kosten).

### Library & Framework Requirements

**Backend (keine neuen Deps):**

- `@nestjs/common ^11.1.19`, `@nestjs/cqrs ^11.0.x`, `@nestjs/swagger ^8.x`, `@prisma/client ^7.7.x`.
- Bestehender `QueryHandler`-Decorator + `IQueryHandler`-Interface aus `@nestjs/cqrs`.
- `IUserRepository` + `USER_REPOSITORY`-Token (Plattform-Dependency, bereits vorhanden).

**Frontend (keine neuen Deps):**

- React 19 + TanStack Router/Query.
- Headless UI (für Popover + Drawer-Dialog).
- Tailwind CSS (bestehendes Design-System).
- TanStack Form ist für Read-Only-Drawer **nicht** nötig (kein Submit).
- OXC-Toolchain.

**Keine neuen Runtime-Dependencies erwartet.** Keine Diff-Viewer-Library (Phase-2-Anker: `RiskEvaluationDiff` — UX-Spec §912 — ist explizit **out-of-scope**, siehe Deferred-Items).

### File Structure Requirements

**Strikt folgen (Architecture §B Directory Tree):** Dateinamen kebab-case, Verzeichnisse kebab-case, Aggregate/Event-Klassen PascalCase Deutsch.

**Neue Backend-Dateien:**

```
packages/backend/src/
├── application/eigenschutz/
│   ├── queries/get-gefaehrdungsbeurteilung-historie/
│   │   ├── get-gefaehrdungsbeurteilung-historie.query.ts             NEU
│   │   ├── get-gefaehrdungsbeurteilung-historie.handler.ts           NEU
│   │   └── __tests__/get-gefaehrdungsbeurteilung-historie.handler.spec.ts  NEU
│   └── dto/
│       ├── gefaehrdungsbeurteilung-historie-eintrag.dto.ts           NEU
│       ├── gefaehrdungsbeurteilung-historie.dto.ts                   NEU
│       └── gefaehrdungsbeurteilung-historie.factory.ts               NEU
```

**Geänderte Backend-Dateien:**

```
packages/backend/src/
├── domain/eigenschutz/repositories/
│   └── i-gefaehrdungsbeurteilung-version.repository.ts               UPD (Port-Erweiterung + Row-Typ)
├── infrastructure/eigenschutz/repositories/
│   ├── prisma-gefaehrdungsbeurteilung-version.repository.ts          UPD (findVersionsByBeurteilung, PrismaService-Injection)
│   ├── mappers/gefaehrdungsbeurteilung.mapper.ts                     UPD (toVersionRow)
│   └── __tests__/prisma-gefaehrdungsbeurteilung-version.repository.spec.ts  UPD (Mock + Integration-Tests)
├── application/eigenschutz/
│   └── eigenschutz-application.module.ts                             UPD (Handler-Provider + ggf. UserInfrastructureModule-Import)
└── modules/eigenschutz/controllers/
    ├── gefaehrdungsbeurteilung.controller.ts                         UPD (getHistorie-Route)
    ├── __tests__/gefaehrdungsbeurteilung.controller.spec.ts          UPD (Unit-Tests für getHistorie)
    └── __tests__/gefaehrdungsbeurteilung.controller.integration.spec.ts  UPD (Integrations-Tests AC17)
```

**Neue Frontend-Dateien:**

```
packages/frontend/src/features/eigenschutz/
├── api/queries.ts                                                    UPD (EIGENSCHUTZ_QUERY_KEYS + useGefaehrdungsbeurteilungHistorie)
├── api/__tests__/queries.spec.tsx                                    UPD (Hook-Tests)
├── ui/molecules/
│   ├── VersionTimestampFooter.tsx                                    NEU
│   └── __tests__/VersionTimestampFooter.spec.tsx                     NEU
├── ui/organisms/
│   ├── GefaehrdungsbeurteilungHistoriePopover.tsx                    NEU
│   ├── GefaehrdungsbeurteilungVersionDrawer.tsx                      NEU
│   ├── RiskMatrix5x5.tsx                                             UPD (readOnly-Prop)
│   └── __tests__/
│       ├── GefaehrdungsbeurteilungHistoriePopover.spec.tsx           NEU
│       ├── GefaehrdungsbeurteilungVersionDrawer.spec.tsx             NEU
│       └── RiskMatrix5x5.spec.tsx                                    UPD (readOnly-Tests)
├── ui/pages/
│   ├── GefaehrdungenDetailPage.tsx                                   UPD (Footer + Popover + Drawer einbinden)
│   └── __tests__/GefaehrdungenDetailPage.spec.tsx                    UPD
├── utils/version-summary.ts                                          NEU
└── utils/__tests__/version-summary.spec.ts                           NEU
```

**Neue Shared-Dateien:**

```
packages/shared/src/schemas/eigenschutz/gefaehrdungsbeurteilung.schema.ts  UPD (Historie-Schemas + Typen)
```

**Re-Generated (automatisch, NIEMALS manuell editieren):**

```
packages/shared/client/apis/EigenschutzApi.ts                         AUTO (gefaehrdungsbeurteilungControllerGetHistorieVAlpha)
packages/shared/client/models/GefaehrdungsbeurteilungHistorieDto.ts   AUTO
packages/shared/client/models/GefaehrdungsbeurteilungHistorieEintragDto.ts  AUTO
```

**Neue Dokumentation:** keine. Kein ADR nötig — der Pattern-Shift „neuer Read-Model-Query-Handler" ist eine triviale Anwendung des bestehenden Architecture-§B1-Patterns.

### Testing Requirements

**Testing-Konventionen (Bestand aus Memory + CLAUDE.md):**

- Backend Jest co-located: `npx jest --testPathPatterns="pattern" --no-coverage` direkt im `packages/backend/`-Ordner (`--testPathPattern` deprecated, Plural).
- Frontend Vitest: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="pattern" --no-coverage`.
- Integration-Specs mit DB laufen **nur sequenziell** — `npx jest --runInBand`.
- Präzise Testpfade, keine broad Patterns (CLAUDE.md).
- `meta.silentError` für Hooks gilt weiterhin (UX-DR21 Zero-Toast).

**Test-Setup für Integration-Tests (Task 6):**

- Das bestehende `gefaehrdungsbeurteilung.controller.integration.spec.ts` hat bereits das Auth-/Einsatz-Setup-Pattern aus Story 2.3 (siehe dort unter „skipped .it-Skeletons"). Story 2.4 nutzt dasselbe Harness — ggf. reuse bzw. extract einen Helper `setupTestBeurteilungWithVersions(n)` für 3-Versionen-Fixtures.

**Test-Matrix:**

| Spec-Datei                                                        | Tests-Hinzu                                                                                                                    | AC-Abdeckung   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `get-gefaehrdungsbeurteilung-historie.handler.spec.ts` (NEU)      | 6+ Unit-Tests: Happy-Path (3 Versionen, 2 User), Not-Found, Cross-Einsatz, User-Repo-Null, User-Repo-Failure, Version-Ordering | AC6            |
| `prisma-gefaehrdungsbeurteilung-version.repository.spec.ts` (UPD) | +3 Mock-Tests für `findVersionsByBeurteilung` + 1 Integration-Test für AC9 Chain-Intervall                                     | AC8, AC9       |
| `gefaehrdungsbeurteilung.controller.spec.ts` (UPD)                | +3 Unit-Tests: `getHistorie` Happy-Path, 404-Mapping, 500-Mapping                                                              | AC7, AC15      |
| `gefaehrdungsbeurteilung.controller.integration.spec.ts` (UPD)    | +1 Integration-Test mit 3 Versionen + Guard-Kette (AC17) — AKTIV, nicht `.skip`                                                | AC17           |
| `version-summary.spec.ts` (NEU, Frontend)                         | 7 Unit-Tests (alle Formatter-Cases)                                                                                            | AC3            |
| `queries.spec.tsx` (UPD, Frontend)                                | +3 Tests für `useGefaehrdungsbeurteilungHistorie` (Success, 403-No-Retry, Empty-Fallback)                                      | AC10           |
| `VersionTimestampFooter.spec.tsx` (NEU, Frontend)                 | 4 Tests (Render, A11y, Fallback-Name, Click-Open)                                                                              | AC11           |
| `GefaehrdungsbeurteilungHistoriePopover.spec.tsx` (NEU, Frontend) | 6+ Tests (Loading, Error, Empty-Defensive, Render, Keyboard-Nav, Escape)                                                       | AC2, AC12      |
| `GefaehrdungsbeurteilungVersionDrawer.spec.tsx` (NEU, Frontend)   | 5+ Tests (A11y, Historisch-Render, Aktuell-Render, Zurück-Button, Escape)                                                      | AC4, AC5, AC13 |
| `RiskMatrix5x5.spec.tsx` (UPD, Frontend)                          | +3 Tests (readOnly-Click, readOnly-Keyboard, readOnly-A11y)                                                                    | AC14           |
| `GefaehrdungenDetailPage.spec.tsx` (UPD, Frontend)                | +2 Tests (Footer rendert, Integration Popover+Drawer-Flow)                                                                     | AC1            |

**Integration-Test AC17 ist AKTIV, nicht `.skip`:**
Story 2.3 hat das Integration-Harness für Auth-Setup + TX-Handling etabliert. Story 2.4 nutzt es direkt; AC17 ist als vollständig aktiver `.it`-Test zu implementieren. Falls im Bestand noch kein User-Repo-Fixture existiert, akzeptable Alternativen:

- (a) Test-Fixture mit explizit angelegtem User über den bestehenden `createTestUser(...)`-Helper (falls vorhanden).
- (b) Assertions auf `changedByUserName !== undefined` (entweder string oder null) — deterministisch.

**Concurrency-Fallstricke:**

- `findVersionsByBeurteilung` ist ein reiner Read-Query — keine TX nötig, kein Concurrency-Check. Der Test kann per `this.prisma.gefaehrdungsbeurteilungVersion.findMany` direkt gegen die DB validieren.
- Chain-Intervall-Invariante (AC9) wird durch Story 2.3's bestehendes `saveNewVersion` garantiert — Story 2.4 **verifiziert** die Invariante, ändert sie nicht.

### Previous Story Intelligence (Story 415-2-3)

Story 2.3 hat die Version-Chain Write-Pfad-Invarianten geschärft — Lese-Pfad (2.4) baut darauf auf. Dev-Agent bitte vor Implementierungs-Start lesen (`_bmad-output/implementation-artifacts/415-2-3-gefaehrdungen-aendern-entfernen-mit-version-chain.md`):

1. **ChangedFields-Shape (Story 2.3 AC3-AC5, `aggregate.spec.ts:~150`):** `{ added: string[], removed: string[], updated: Array<{id, fields: string[]}>, unchanged: number }`. Frontend-Formatter in AC3 baut genau darauf auf.
2. **Chain-Intervall `V_n.gueltigBis === V_{n+1}.gueltigVon` (Story 2.3 AC9, `prisma-gefaehrdungsbeurteilung-version.repository.ts:133-148`):** identischer Timestamp. AC9 dieser Story dokumentiert die halb-offene Semantik + fügt Regression-Test hinzu.
3. **ConflictDetected-Context mit `currentVersion` (Story 2.3 AC10):** **nicht relevant** für 2.4 (Read-Only, kein Konflikt).
4. **Optimistic-Concurrency-Pattern (§E):** Unverändert gültig, aber nicht in 2.4 konsumiert.
5. **Idempotente saveNewVersion bei P2002 auf event_id (Story 2.3 AC8):** **nicht relevant** für 2.4 (kein Write).
6. **`reconstitute()`-Factory mit hardcoded version (Story 2.3 AC1):** Wurde in 2.3 ergänzt (`aggregate.reconstitute(props)` mit Pflicht-Invarianten + Mapper-Regression-Test). 2.4 **nutzt `reconstitute()` NICHT**, weil wir den neuen `GefaehrdungsbeurteilungVersionRow`-Typ für die Read-Only-Sicht einführen. `reconstitute()`-Refinements (throw→Result) bleiben deferred auf 2.5.
7. **Item-Validation mit `ValidationFailed:`-Präfix (Story 2.3 AC11):** **nicht relevant** für 2.4 (keine Writes).

**Out-of-Scope dokumentiert:**

- `RiskEvaluationDiff`-Feld-basierter Vorher/Nachher-Block (UX-Spec §912, Phase 2): **NICHT in Story 2.4**. Der Read-Only-Drawer rendert die Items der einzelnen Version ohne Diff-Highlighting. Ein Diff-Viewer ist Post-MVP.
- Point-in-Time-Query-Konsum („welche Version galt zum Zeitpunkt X?"): **NICHT in Story 2.4**. Erstmals in Story 5.2 (Vorfall-Snapshot) konsumiert. Die Invariante wird hier nur dokumentiert + per Regression-Test abgesichert.
- `reconstitute()`-Throw→Result-Umbau (Deferred aus 2.3): **explizit deferred auf Story 2.5** (Auto-Save-Rehydrierung berührt den Factory sowieso).
- Auto-Save-2s-Debounce (Story 2.5 Scope).
- Bekanntgabe-/Quittungs-Flows (Story 2.7 + Epic 3).

**Review-Decision „DSGVO-PII-Redaction im Event-Adapter" aus 2.2:** **NICHT Story 2.4 Scope** — 2.4 berührt keinen Event-Adapter.

### Git Intelligence Summary (letzte 5 Commits relevant für 2.4)

1. `8b26e2994 ✨(eigenschutz): Stories 2.1 + 2.2 — Create + Update + 5×5-Matrix` — Basis für Editor + Matrix-Komponente; AC14 erweitert diese um `readOnly`.
2. `c839b108f ✨(eigenschutz): Feature-Slice + Health-Endpoint + Route (Story 1.6)` — Route-Skeleton unter `/einsatz/:einsatzId/sicherheit/eigenschutz` bereits aktiv.
3. `7effc57ab ✨(auth): Eigenschutz-Rollen + Permissions-Guard + Decorator (Story 1.5)` — `@RequiresEigenschutzRolle`-Decorator + `@RequiresPermission` bereits verfügbar; 2.4 nutzt beide mit den Lese-Rollen.
4. `7c1fc2ea6 ✨(auth): EinsatzScopeGuard + ADR-012 (Story 1.3)` — Guard-Kette ist etabliert; 2.4 fügt nur einen Endpoint hinzu.
5. `9435caf3b ✨(eigenschutz): Prisma-Migration + Seeds (Story 1.4)` — `GefaehrdungsbeurteilungVersion`-Tabelle mit Index bereits angelegt.

**Working-Copy-Status beim Story-Start (2026-04-23):** Story 2.3 ist als `done` markiert; Änderungen an `gefaehrdungsbeurteilung-aktualisiert.event.ts` sind im Working-Tree noch ungestaged (siehe `git status: M packages/backend/src/domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event.ts`). Dev-Agent sollte vor 2.4-Start prüfen, ob Ruben die 2.3-Änderungen bereits committed hat; andernfalls 2.4 auf derselben Working-Copy aufsetzen (analog zur 2.3-Entscheidung).

**Commit-Empfehlung nach 2.4:** Eigener Commit für 2.4 (nicht mit 2.1/2.2/2.3 mergen). PR-Review soll „Read-Only-Timeline-Feature" klar von „Write-Chain-Hardening" unterscheiden.

### Latest Tech Information

- **Prisma 7.7.x `findMany` mit zusammengesetztem `orderBy`**: Das Prisma-Docs-Pattern `orderBy: [{ field1: 'desc' }, { field2: 'desc' }]` ist seit v4 stable; das B-Tree-Backend auf dem bestehenden Index `@@index([gef_beurteilung_id, gueltig_von])` unterstützt DESC-Scans ohne zusätzlichen Index-Bau.
- **`@nestjs/cqrs` `QueryHandler`-Decorator**: Unverändert. Pattern identisch zu `GetGefaehrdungsbeurteilungHandler`.
- **TanStack Query v5 `useQuery` + `staleTime`**: `staleTime: 5_000` ist ein etabliertes Muster für „refetch nach kurzen Pausen, aber nicht hyperaktiv beim Popover-Re-Open". Alternative: `staleTime: 0` + manuelles `invalidate` bei Mutation — Story-2.4-Empfehlung bleibt `5_000`, weil die Mutation-Hooks in 2.2/2.3 die Historie aktuell **nicht** invalidieren (und das auch in 2.4 nicht tun sollen — TanStack refetched bei Popover-Open durch `staleTime`-Ablauf natürlich nach).
- **Headless UI `Popover` vs. eigene Implementierung:** Plattform-Konvention prüfen. Falls bereits `@headlessui/react` als Dependency vorhanden (in `package.json`), `<Popover>`+`<Popover.Panel>` nutzen. Falls nicht, minimal selbst implementiert mit `useState` + Focus-Trap via `react-focus-lock` (falls vorhanden) oder nativ per `onKeyDown` Escape + Click-outside-Listener.
- **React 19:** `useOptimistic` ist NICHT relevant für Read-Only-Flow. `use`-Hook für Promise-Konsum bleibt OPTIONAL.

### Project Context Reference

- **Repo-Konventionen:** `CLAUDE.md` (API-Workflow, DI-Imports, Response-Decorators, Umlaute-Regel, Testing-Standards, OXC-Toolchain).
- **BMAD-Config:** `_bmad/bmm/config.yaml` (Sprache: Deutsch, Skill-Level: expert).
- **Plattform-Prinzipien:** `docs/architecture-principles.md` (Layering, Aggregates, Result, Outbox, DI, Events).
- **Story-Key-Konvention:** `_bmad/custom/project-conventions.md` (Story-Prefix `415-` aus GitHub-Issue).
- **ADRs (existent):** ADR-006 (WebSocket-Event-Bus), ADR-011 (Push-Notifications), ADR-012 (EinsatzScopeGuard), ADR-013 (Risikomatrix-5x5 aus Story 2.2).
- **Epic-Definition:** `_bmad-output/planning-artifacts/epics.md:787-811` — Story 2.4 Wortlaut.
- **Vorherige Story:** `_bmad-output/implementation-artifacts/415-2-3-gefaehrdungen-aendern-entfernen-mit-version-chain.md` — Kontext + etablierte Invarianten.
- **Deferred-Work-Tracker:** `_bmad-output/implementation-artifacts/deferred-work.md:86-96` — die zwei Items, die 2.4 konsumiert bzw. weiter-deferriert.

### References

- **PRD:**
  - `_bmad-output/planning-artifacts/prd.md:446` — FR6 „Gefährdungsbeurteilung jederzeit neu bewerten; vorige Version bleibt einsehbar".
  - `_bmad-output/planning-artifacts/prd.md:502-504` — FR41/FR42/FR43 Versionierung + Append-only + Read-Access.
  - `_bmad-output/planning-artifacts/prd.md:515-517` — FR48/FR49 Offline-Fähigkeit (begründet Backend-User-Namens-Resolution).
- **Epic:** `_bmad-output/planning-artifacts/epics.md:787-811` — Story 2.4 Definition.
- **Architecture:**
  - `_bmad-output/planning-artifacts/architecture.md:441-465` — §B1 State + Version-Chain + Outbox.
  - `_bmad-output/planning-artifacts/architecture.md:976-1009` — §C API-Response-Format.
  - `_bmad-output/planning-artifacts/architecture.md:1064-1083` — §E Versioning + Optimistic Concurrency (Read-Only-Einfluss: keine).
  - `_bmad-output/planning-artifacts/architecture.md:1128-1149` — §H Guard-Composition.
  - `_bmad-output/planning-artifacts/architecture.md:1151-1174` — §I Frontend State + Query-Keys.
  - `_bmad-output/planning-artifacts/architecture.md:1176-1184` — §J Loading/Error/Empty States (Popover-Relevanz).
  - `_bmad-output/planning-artifacts/architecture.md:1186-1194` — §K Logging + Observability.
  - `_bmad-output/planning-artifacts/architecture.md:1309-1460` — Prisma-Model `Gefaehrdungsbeurteilung` + Version (keine Änderung).
  - `_bmad-output/planning-artifacts/architecture.md:1633-1822` — Backend Directory Tree (Einordnung der neuen Dateien).
  - `_bmad-output/planning-artifacts/architecture.md:1847-1942` — Frontend Directory Tree.
- **UX-Spec:**
  - `_bmad-output/planning-artifacts/ux-design-specification.md:216` — **UX-DR10** `VersionTimestampFooter` Vertrag.
  - `_bmad-output/planning-artifacts/ux-design-specification.md:319` — UX-DR10 Epic-2-Zuordnung (MVP-2).
  - `_bmad-output/planning-artifacts/ux-design-specification.md:907` — `VersionTimestampFooter` (Molecule) Detail-Spec.
  - `_bmad-output/planning-artifacts/ux-design-specification.md:912` — `RiskEvaluationDiff` (Organism · Phase 2, **out-of-scope**).
  - `_bmad-output/planning-artifacts/ux-design-specification.md:937` — `VersionTimestampFooter` Implementation-Roadmap MVP-2.
  - `_bmad-output/planning-artifacts/ux-design-specification.md:1013-1023` — UX-DR25 Modal-vs-Drawer-vs-Popover-Entscheidungsregel.
- **ADRs:**
  - `docs/adr/adr-012-einsatz-scope-guard.md` — EinsatzScopeGuard-Verantwortung.
  - `docs/adr/adr-013-risikomatrix-5x5.md` — Risikomatrix-5x5 (unverändert; AC14 erweitert UI-Komponente um `readOnly`-Prop, nicht die Risiko-Klassifikation).
- **Source-Referenzen (Implementierungs-Basis aus Story 2.1/2.2/2.3):**
  - `packages/backend/prisma/schema.prisma:2608-2653` — `Gefaehrdungsbeurteilung` + `GefaehrdungsbeurteilungVersion` Models.
  - `packages/backend/src/domain/eigenschutz/repositories/i-gefaehrdungsbeurteilung-version.repository.ts` — Port-Basis für Erweiterung (Task 1).
  - `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts:125-174` — `saveNewVersion` (Chain-Closing-Pattern als Basis für AC9-Invariante + JSDoc).
  - `packages/backend/src/application/eigenschutz/queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.handler.ts` — Handler-Template (Cross-Einsatz-Check + Sentinel).
  - `packages/backend/src/application/eigenschutz/queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.query.ts` — Query-Class-Template.
  - `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts:220-252` — `getBeurteilung` + `loadDto` + `mapQueryError` (alles wiederverwendbar).
  - `packages/backend/src/application/notiz/dto/notiz-response.factory.ts:23-58` — User-Namens-Resolution-Pattern via `USER_REPOSITORY.findById`.
  - `packages/backend/src/infrastructure/di-tokens.ts:463-465` — DI-Tokens (bereits registriert).
  - `packages/frontend/src/features/eigenschutz/api/queries.ts:78-229` — Query-Key-Factory + Hook-Patterns (AC10-Basis).
  - `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx` — Integration-Ziel (Task 14).
  - `packages/frontend/src/features/eigenschutz/ui/organisms/RiskMatrix5x5.tsx` — AC14-Ziel.
  - `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungenEditorOrganism.tsx` — Editor-Shape als Read-Only-Referenz.
  - `packages/shared/src/schemas/eigenschutz/gefaehrdungsbeurteilung.schema.ts` — Shared-Schema-Erweiterungs-Ziel (Task 7).
- **CLAUDE.md:** API-Workflow, DI-Import-Regel, OXC-Toolchain, Umlaute, Testing-Patterns, Response-Decorators (`@ApiWrappedResponse`).
- **Memory:**
  - `feedback_route_nesting.md` — Einsatz-Routen unter `/einsatz/:einsatzId/…` (Story 2.4 bedient: `gefaehrdungsbeurteilungen/:id/versionen` unter bestehendem Einsatz-Scope).
  - Backend-Testkommando: `npx jest --testPathPatterns="pattern" --no-coverage` direkt im `packages/backend/`-Ordner (`--testPathPattern` deprecated, Plural nutzen).
  - `project_nestjs_cli_transpiler.md` — ts-node für Nest-Bootstrap; betrifft Integration-Specs.

### Review Findings

- [x] [Review][Patch] Footer-Trigger meldet falschen Popover-Zustand und referenziert kein Panel [packages/frontend/src/features/eigenschutz/ui/molecules/VersionTimestampFooter.tsx:60]
- [x] [Review][Patch] Aktuelle Version kann aus stale Historie statt aus dem Detail-Cache gerendert werden [packages/frontend/src/features/eigenschutz/api/queries.ts:255]
- [x] [Review][Patch] Historie-Popover rendert Zeitstempel nicht im geforderten `DD.MM.YYYY HH:mm`-Format [packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungHistoriePopover.tsx:52]
- [x] [Review][Patch] Version-Drawer weicht von der editorgleichen Read-Only-Shape ab [packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungVersionDrawer.tsx:123]
- [x] [Review][Patch] Keyboard-Navigation im Popover fokussiert beim ersten Laden keine erste Option [packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungHistoriePopover.tsx:81]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Parent-Orchestrator) mit drei general-purpose Subagents in Wellen:

1. **Welle 1 parallel:** Backend-Full-Stack (Tasks 1–6 Backend), Shared-Schema (Task 7), Frontend-Utilities (Task 10 Formatter + Task 13 RiskMatrix `readOnly`-Prop).
2. **Welle 2 sequentiell (Parent):** API-Client-Regeneration via `pnpm run generate-api` (Task 15).
3. **Welle 3 parallel:** UI-Komponenten-Subagent für Footer + Popover + Drawer (Tasks 9+11+12); Parent baute parallel den Query-Hook (Task 8).
4. **Welle 4 sequentiell (Parent):** DetailPage-Integration (Task 14), QA-Gates + Story-Dokumentation (Task 16).

### Debug Log References

Keine — alle Subagent-Iterationen liefen ohne Fehler. Der Backend-Subagent meldete in seiner Zusammenfassung eine kleine Abweichung zur Story-Spec (Zod-`z.record`-Signatur für Zod v4), die folgenlos war.

### Completion Notes List

1. **AC17 Integration-Test bleibt `.skip`-Skelett (Fall C aus Task 6.6).** HTTP-Integration-Harness (Seeded Admin + JWT + Per-Test-Einsatz) existiert noch nicht; Bau würde Scope sprengen. Neuer Eintrag in `_bmad-output/implementation-artifacts/deferred-work.md` unter „Deferred from: story 2.4 — HTTP-Integration-Test (2026-04-23)" verweist auf die drei Story-2.3-Geschwister (AC8/AC9/AC12); gemeinsame Aktivierung, sobald das Harness gebaut ist.
2. **AC9 Chain-Intervall-Invariante dokumentiert + Regression-Test** im Port-JSDoc und in der Prisma-Implementation. Regression-Test liegt im Repo-Integration-Spec (`prisma-gefaehrdungsbeurteilung-version.repository.spec.ts`) unter `skipIfNoDatabase`; läuft grün gegen Postgres auf Port 3092, wird übersprungen ohne DB.
3. **User-Namens-Resolution mit `null`-Fallback** im Handler implementiert (Pattern aus `notiz-response.factory.ts`). Das `UserAggregate` trägt aktuell nur `username.value` (kein `displayName`/`firstName`/`lastName`) — der Handler nutzt das. Plattform-weite Name-Anreicherung ist Future-Work (vermutlich Story 5.2 Vorfall-Snapshot).
4. **Footer-Scope-Entscheidung bestätigt umgesetzt:** `VersionTimestampFooter` zeigt nur die UserId-Kurzform (`slice(-8)`); volle Namen erscheinen ausschließlich im Historie-Popover. Keine Änderung am Main-`GefaehrdungsbeurteilungDto`.
5. **`useGefaehrdungsbeurteilungHistorie` ist lazy geladen:** Der Popover aktiviert den Hook via `hasBeenOpened`-State erst nach dem ersten Öffnen, damit die DetailPage bei Initial-Render keine zusätzliche HTTP-Roundtrip auslöst.
6. **`reconstitute()`-throw→Result-Umbau bleibt deferred auf Story 2.5** (wie vorgesehen). Story 2.4 nutzt den neuen `GefaehrdungsbeurteilungVersionRow`-Infrastructure-Typ (view-path), nicht `Gefaehrdungsbeurteilung.reconstitute()` (write-path).
7. **API-Client regeneriert:** `gefaehrdungsbeurteilungControllerGetHistorieVAlpha` + `GefaehrdungsbeurteilungHistorieDto` + `GefaehrdungsbeurteilungHistorieEintragDto` sind in `packages/shared/client/` generiert. `pnpm --filter @bluelight-hub/shared build` erneut ausgeführt, damit Frontend die neuen Typen sieht.
8. **Kein neues Event, kein Schema-Change, keine neuen DI-Tokens** (AC16 durchgängig eingehalten).

**Testergebnisse (Scope-Run, finaler Stand):**

- Backend Eigenschutz-Scope: **311 passed / 12 skipped / 0 failed** (30/31 Suites, 1 Suite skip = Integration-Spec ohne DB/Harness).
- Frontend Eigenschutz-Scope: **155 passed / 0 failed** (16 Suites).
- DI-Import-Check: 0 Violations (1977 Dateien).
- Architecture-Lint: 0 neue Warnings (1 preexistent in `funkkanal`).
- Lint: 0 Errors (29 Warnings, alle preexistent).
- TSC Backend: keine Fehler in neuen/geänderten Dateien (preexistente Fehler in `mock-factories.ts`/`test-doubles.ts` unverändert).
- TSC Frontend: 0 Fehler.

**Full-Regression-Ergebnisse (nach Advisor-Auflage):**

- Backend **runInBand** (ohne E2E-/Integration-Specs): **525 Suites passed / 1 skipped, 8971 Tests / 35 skipped, 0 failed**. Der Parallel-Mode-Run zeigte zunächst 21 Suites failed / 154 Tests failed — alle ausschließlich DB-Contention-Flakes in Prisma-Repo-Specs und E2E-Suites. Ursache: mehrere Worker greifen parallel auf die Entwicklungs-DB (Port 3092) zu und kollidieren beim Seeden. **Mit `--runInBand` alle grün, bestätigt Flake-Charakteristik, keine Story-2.4-Regression.**
- Frontend Full-Run: **897 Testgruppen ok, 1 Hook-Timeout-Flake** in `src/features/befehl/hooks/__tests__/use-befehle-view-store.spec.ts` (Hook-Timeout 978 s — kein Story-2.4-Code, keine Änderung in `features/befehl/`). Bestätigt: Story 2.4 verursacht keine neuen Frontend-Fails.

**Manueller Browser-Smoke:** Ausgelassen auf ausdrücklichen User-Request („lass mcp weg"). Die drei neuen Organisms haben eigene Specs mit A11y- (`aria-haspopup`, `aria-expanded`, `aria-readonly`, `aria-labelledby`, `aria-current`), Keyboard- (Arrow-Nav, Enter/Space, Escape) und Integration-Tests; Unit- und Component-Tests decken die Kern-Flows ab. Smoke-Verifikation via Browser liegt bei Ruben (manueller QA-Review), falls gewünscht.

### File List

**Backend — Neu (9 Dateien):**

- `packages/backend/src/application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.query.ts`
- `packages/backend/src/application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.handler.ts`
- `packages/backend/src/application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/__tests__/get-gefaehrdungsbeurteilung-historie.handler.spec.ts`
- `packages/backend/src/application/eigenschutz/dto/gefaehrdungsbeurteilung-historie-eintrag.dto.ts`
- `packages/backend/src/application/eigenschutz/dto/gefaehrdungsbeurteilung-historie.dto.ts`
- `packages/backend/src/application/eigenschutz/dto/gefaehrdungsbeurteilung-historie.factory.ts`

**Backend — Geändert (8 Dateien):**

- `packages/backend/src/domain/eigenschutz/repositories/i-gefaehrdungsbeurteilung-version.repository.ts` (Port-Erweiterung + Row-Typ + JSDoc AC9)
- `packages/backend/src/domain/eigenschutz/repositories/index.ts` (Barrel-Export)
- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung-version.repository.ts` (findVersionsByBeurteilung + PrismaService-Injection)
- `packages/backend/src/infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts` (toVersionRow-Methode)
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-gefaehrdungsbeurteilung-version.repository.spec.ts` (Mock-Tests + Integration-Test AC9)
- `packages/backend/src/application/eigenschutz/eigenschutz-application.module.ts` (UserInfrastructureModule-Import + neuer Handler-Provider)
- `packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts` (neue Route `getHistorie`)
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/gefaehrdungsbeurteilung.controller.spec.ts` (+4 Tests getHistorie)
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/gefaehrdungsbeurteilung.controller.integration.spec.ts` (+1 `.skip`-Skelett AC17)

**Frontend — Neu (8 Dateien):**

- `packages/frontend/src/features/eigenschutz/utils/version-summary.ts`
- `packages/frontend/src/features/eigenschutz/utils/__tests__/version-summary.spec.ts`
- `packages/frontend/src/features/eigenschutz/ui/molecules/VersionTimestampFooter.tsx`
- `packages/frontend/src/features/eigenschutz/ui/molecules/__tests__/VersionTimestampFooter.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungHistoriePopover.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/GefaehrdungsbeurteilungHistoriePopover.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/GefaehrdungsbeurteilungVersionDrawer.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/GefaehrdungsbeurteilungVersionDrawer.spec.tsx`

**Frontend — Geändert (5 Dateien):**

- `packages/frontend/src/features/eigenschutz/api/queries.ts` (+Query-Key `gefaehrdungsbeurteilungHistorie`, +Hook `useGefaehrdungsbeurteilungHistorie`, +Import `GefaehrdungsbeurteilungHistorie`)
- `packages/frontend/src/features/eigenschutz/api/__tests__/vorlagen-hooks.spec.tsx` (+Mock + Tests für Hook + Query-Key)
- `packages/frontend/src/features/eigenschutz/ui/organisms/RiskMatrix5x5.tsx` (+`readOnly?: boolean`-Prop)
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/RiskMatrix5x5.spec.tsx` (+3 Tests)
- `packages/frontend/src/features/eigenschutz/ui/pages/GefaehrdungenDetailPage.tsx` (Footer + Popover + Drawer-Integration, State für `selectedHistorieEintrag`)
- `packages/frontend/src/features/eigenschutz/ui/pages/__tests__/GefaehrdungenDetailPage.spec.tsx` (+2 Story-2.4-Tests)
- `packages/frontend/src/features/eigenschutz/schemas/gefaehrdungsbeurteilung.schema.ts` (Re-Export der Historie-Schemas + Typen)

**Shared — Geändert (1 Datei):**

- `packages/shared/src/schemas/eigenschutz/gefaehrdungsbeurteilung.schema.ts` (+Historie-Schemas + Typen)

**Auto-generiert (nicht manuell editiert, siehe CLAUDE.md API-Workflow):**

- `packages/shared/client/apis/EigenschutzApi.ts` (+`gefaehrdungsbeurteilungControllerGetHistorieVAlpha`)
- `packages/shared/client/models/GefaehrdungsbeurteilungControllerGetHistorieVAlpha200Response.ts`
- `packages/shared/client/models/GefaehrdungsbeurteilungHistorieDto.ts`
- `packages/shared/client/models/GefaehrdungsbeurteilungHistorieEintragDto.ts`
- `packages/shared/client/models/index.ts` (Barrel)

**Dokumentation — Geändert (2 Dateien):**

- `_bmad-output/implementation-artifacts/deferred-work.md` (+Abschnitt „Deferred from: story 2.4 — HTTP-Integration-Test")
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Status-Übergang)

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Author                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 2026-04-23 | Story-Datei angelegt (ready-for-dev). Umfassende Context-Engine-Analyse: Story 2.4 = Read-Only-Timeline-Feature (Query-Handler + Endpoint + 3 UI-Komponenten + `RiskMatrix5x5`-readOnly-Prop); **kein Schema-Change, kein neues Event**. Zwei Deferred-Items aus 2.2/2.3 konsolidiert: (1) halb-offenes `[gueltigVon, gueltigBis)`-Intervall dokumentiert + Regression-Test (AC9); (2) `reconstitute()`-throw→Result-Umbau bleibt **deferred auf 2.5**, stattdessen neuer `GefaehrdungsbeurteilungVersionRow`-Infrastructure-Typ (Read-Models sind View-Path, Aggregates sind Write-Path). User-Namens-Resolution **im Backend** für den Historie-Popover (Pattern aus `notiz-response.factory.ts`) wegen FR48 (Offline-Lese). **Zwei Advisor-Fixes vor Finalisierung angewandt:** (a) AC11 Footer zeigt nur UserId-Kurzform (keine Backend-DTO-Erweiterung der Main-Query) — neue Dev-Notes-§ „Scope-Entscheidung: Footer-Namens-Resolution"; (b) AC17 + Task 6.6 um explizite Harness-Entscheidung (Fall A/B/C) erweitert, weil das HTTP-Integration-Harness laut Story-2.3-deferred-work noch nicht existiert. Sprint-Status-Übergang: 415-2-4 `backlog → ready-for-dev`. | Ruben Vitt (mit Claude Opus 4.7, 1M-Kontext)                  |
| 2026-04-23 | Story 2.4 vollständig implementiert: Backend-Port + Prisma-Implementation (`findVersionsByBeurteilung`), Query-Handler (`GetGefaehrdungsbeurteilungHistorieQuery`), DTO + Controller-Route `GET …/gefaehrdungsbeurteilungen/:id/versionen`, Shared-Zod-Schema, API-Regeneration, Frontend-Hook `useGefaehrdungsbeurteilungHistorie`, reine Pure-Function `formatChangedFieldsSummary`, `RiskMatrix5x5` `readOnly`-Prop, drei neue UI-Komponenten (`VersionTimestampFooter`, `GefaehrdungsbeurteilungHistoriePopover`, `GefaehrdungsbeurteilungVersionDrawer`), DetailPage-Integration. **Task 6.6 Fall C:** AC17-Integration-Test bleibt als `.skip`-Skelett + Eintrag in `deferred-work.md` (harness-blocked, Follow-up mit Story-2.3 AC8/AC9/AC12). **Testergebnisse:** Backend 311/12-skip/0-fail, Frontend 155/0-fail; DI-Check 0 Violations, Lint 0 Errors, TSC keine neuen Fehler. Orchestration via Subagent-Wellen (Backend-Full-Stack + Shared + Frontend-Utilities parallel, dann API-Regen selbst, dann UI-Komponenten + Hook parallel, dann DetailPage + QA). Sprint-Status-Übergang: 415-2-4 `ready-for-dev → in-progress → review`.                            | Ruben Vitt (mit Claude Sonnet 4.6 Orchestrator + 3 Subagents) |
