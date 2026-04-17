# ADR-010: Gefahrenzone referenziert Matrixzelle — Warnstufe in Matrix als Source of Truth

## Status

Akzeptiert (2026-04-17)

## Kontext

Issue [#627](https://github.com/rubenvitt/bluelight-hub/issues/627) fordert die räumliche Darstellung der Gefahrenmatrix (13 Gefahrentypen × 5 Schutzobjekte) auf der Lagekarte. Einsatzleiter und Sicherheitsbeauftragte zeichnen Gefahrenzonen auf der MapGL-Karte, verknüpfen sie mit einer Matrix-Zelle, und die Warnstufe (KEINE / NIEDRIG / MITTEL / HOCH / AKUT) steuert die Kartenfärbung. Matrix und Karte müssen live und bidirektional synchron bleiben (WebSocket-Bus, ADR-006).

Die zentrale Datenmodellierungsfrage: **Wo gehört die Warnstufe hin — in die Matrixzelle, in die Zone, oder in beide?**

Drei kandidierende Datenmodelle:

1. **Warnstufe dupliziert** — Matrixzelle und Zone halten je eine eigene Kopie. Einfache Writes, konsistente Reads nur solange beide Seiten synchron bleiben.
2. **Warnstufe nur in Zone** — Matrix wird aus Zonen aggregiert (z. B. Maximum pro Gefahrentyp × Schutzobjekt). Matrix verliert ihren Wert als systematisches Bewertungsraster ohne räumliche Verortung.
3. **Warnstufe nur in Matrix, Zone referenziert Zelle** — Zone trägt `matrixCellRef = (gefahrentyp, schutzobjekt)`; Kartenfarbe wird aus der verknüpften Zelle abgeleitet.

Zusätzliche Randbedingungen aus der UX-Spec und den Issues:

- Eine Matrixzelle kann bewertet sein **ohne** Zone (Gefahr besteht prinzipiell, räumlich nicht eindeutig — Orphan-Warning-Case, UX-Spec §2.2).
- Eine Zone kann vorübergehend **ohne** Bewertung existieren, wenn der Quick-Draw-Flow per `Esc` ohne Warnstufen-Entscheidung verlassen wird (UX-Anforderung: Datenverlust = Vertrauensbruch).
- Mehrere Zonen pro Matrixzelle sind zulässig (z. B. zwei getrennte Chemie-Gefahrenbereiche).
- Komfort-Edit der Warnstufe ist sowohl im Matrix-Editor als auch im Zone-Popover erlaubt (UX-Spec §2.5 Mechanik B) — darf aber nicht zu zwei Schreibpfaden führen.
- Live-Sync über einsatz-scoped WebSocket-Bus; TanStack-Query bleibt Source of Truth im Frontend (ADR-006).

## Entscheidung

Wir wählen **Option 3**: Matrixzelle ist Source of Truth für die Warnstufe; Zone referenziert die Zelle und leitet ihre Kartenfarbe davon ab.

### Datenmodell (Domain)

- `Gefahrenmatrixeintrag` — Identity `(einsatzId, gefahrentyp, schutzobjekt)`; Attribute `warnstufe`, `bewertetVon`, `bewertetAm`. Aggregat-Zuordnung (eigenes Aggregate vs. Value Object im `Einsatz`-Aggregate) wird in der Story-Planung anhand der Invarianten festgelegt — für dieses ADR ist nur die Identity-Lokation bindend.
- `Gefahrenzone` — eigenes Aggregate. Identity `zoneId`; Attribute `einsatzId`, `matrixCellRef = (gefahrentyp, schutzobjekt)`, `geometrie` (Polygon oder Kreis als GeoJSON), `erstelltVon`, `erstelltAm`, `geometryUpdatedAt`. **Keine eigene `warnstufe`.**
- Kardinalitäten:
  - 1 Zone → genau 1 Matrixzelle (Pflichtreferenz; bei Zeichnen ohne Bewertung wird die Zelle implizit mit `warnstufe = KEINE` angelegt).
  - 1 Matrixzelle → 0..n Zonen.
  - Matrixzelle darf `warnstufe ≠ KEINE` **ohne** Zonen tragen (Orphan-Warning-Case).

### Commands & Events

- **Warnstufen-Änderung** läuft ausschließlich über `UpdateGefahrenmatrixCommand` → `GefahrenmatrixAktualisiertEvent`. Der Komfort-Edit aus dem Zone-Popover (UX-Mechanik B) ruft genau diesen Command auf — es gibt keinen zweiten Schreibpfad für die Warnstufe.
- **Geometrie-Änderungen** laufen über `CreateGefahrenzoneCommand`, `UpdateGefahrenzoneGeometryCommand`, `DeleteGefahrenzoneCommand` → zugehörige Events. Diese verändern **nie** die Warnstufe.
- Events werden in allen vier projekt-vorgegebenen Registry-Stellen (serializer, deserializer, adapters module, adapters index) registriert.

### Frontend-Projektion

- `GefahrenzoneLayer` liest die Warnstufe aus dem Matrix-TanStack-Query-Cache (`useGefahrenmatrix(einsatzId)`) und joint lokal über `matrixCellRef`. **Keine Warnstufe auf dem Zone-Payload** — beugt Drift vor.
- WebSocket-Events invalidieren die betroffenen Caches; Refetch konsolidiert. Bei `GefahrenmatrixAktualisiertEvent` werden abhängige Zonen neu gerendert (Cache-Join im Client), ohne dass die Zonen selbst refetched werden müssen.

## Konsequenzen

### Positiv

- **Eine Quelle für die Warnstufe** — keine Divergenz zwischen „Matrix sagt HOCH, Karte zeigt MITTEL". UX-Kernanforderung „Ein Datenmodell, zwei Blickwinkel" (Spec §2.2) ist architektonisch erzwungen, nicht nur konventionell.
- **Orphan-Warnungen fallen natürlich aus der Struktur:** Matrix-Zelle mit `warnstufe ≠ KEINE` ohne zugehörige Zonen → UX-Indicator „⚠ Ohne räumliche Verortung" ist ein reiner Read-Query, keine Invariante zu bewachen.
- **Mehrfach-Zonen pro Zelle trivial:** beliebig viele Zonen referenzieren dieselbe Zelle; Kartenfarben bleiben automatisch synchron, weil alle aus derselben Quelle lesen.
- **AKUT-Eskalation zentralisiert:** der AKUT-Broadcast-Dialog (UX-Mechanik B) hängt an einem einzigen Command; Sound-, Toast- und Banner-Logik sind im Handler dieses Events eindeutig verortet.
- **Komfort-Edit im Zone-Popover ist reines Command-Routing** — kein zweites Persistenz-Modell, kein Konflikt-Merge zwischen Zone-Warnstufe und Zell-Warnstufe.

### Negativ

- **Zusätzlicher Lookup beim Rendern:** der Zone-Layer braucht Matrix-Daten, um Farben zu bestimmen. Zwei TanStack-Queries mit lokalem Join im Frontend — akzeptabel, weil Matrix-Daten klein bleiben (≤65 Zellen pro Einsatz).
- **Zwei Event-Typen beeinflussen das Karten-Rendering** (`GefahrenzoneErstellt` / `GeometryGeaendert` / `Geloescht` + `GefahrenmatrixAktualisiert`); Tests müssen beide Pfade und ihre Race-Conditions abdecken.
- **Zurücksetzen einer Matrixzelle** (Warnstufe → KEINE) muss Zone-Konsequenzen definieren. Festlegung: Zonen bleiben erhalten, werden aber visuell als „unbewertet" gestyled (gestrichelte Linie, Fill 15 %, gemäß UX-Spec §Visual Design Foundation). Löschen von Matrix-Zellen ist nicht vorgesehen.
- **Referenz-Integrität im Backend:** Prisma-Schema braucht entweder composite FK `(einsatzId, gefahrentyp, schutzobjekt)` auf die Matrix-Tabelle oder einen Application-Layer-Check beim Zone-Create. Composite FK ist die sauberere Lösung und wird in der Prisma-Migration umgesetzt; beim Zone-Create mit nicht existierender Zelle wird die Zelle implizit mit `warnstufe = KEINE` angelegt (Upsert im Command-Handler).

## Alternativen

### 1. Warnstufe dupliziert (Matrix + Zone)

Abgelehnt: doppelter Schreibpfad, zwei Events, Drift-Potenzial bei Netzteilung. Widerspricht dem UX-Prinzip „Vertrauen in Datenkonsistenz" (Spec §Desired Emotional Response). Jeder Konsistenzcheck müsste im Domain- **und** im Frontend-Layer laufen, Merge-Regeln bei konkurrierenden Edits wären willkürlich.

### 2. Warnstufe nur in Zone (Matrix aggregiert)

Abgelehnt: verletzt die Kernanforderung aus Issues [#414](https://github.com/rubenvitt/bluelight-hub/issues/414) und [#627](https://github.com/rubenvitt/bluelight-hub/issues/627), dass die Matrix als systematisches Bewertungsraster auch **ohne** räumliche Verortung eine Aussage haben muss. Eine aggregierte Matrix kann „Gefahr besteht, räumlich nicht verortbar" nicht ausdrücken. Zusätzlich offen: welche Aggregation gilt bei 3 Zonen mit unterschiedlichen Stufen? Max-Aggregation ist willkürlich und in Stress-Situationen intransparent.

### 3. Zone mit optionaler Warnstufe als Override

Abgelehnt: zwei Wege zur Wahrheit im Aggregat; erfordert Konflikt-Merge-Regeln („Zone-Override sticht, außer …") — zusätzliche kognitive Last für Nutzer und Entwickler, ohne identifizierten Stakeholder-Bedarf.

## Umsetzungshinweise

- **Prisma-Schema:** `GefahrenmatrixEintrag` mit composite PK `(einsatzId, gefahrentyp, schutzobjekt)`; `Gefahrenzone` hält FK-Tripel als Fremdschlüssel auf diese Tabelle. Geometrie als GeoJSON-Feld (JSONB). PostGIS ist für #627-Scope nicht erforderlich; räumliche Suche ist ein späteres ADR.
- **Controller-Routing:** `/einsatz/:einsatzId/gefahrenzonen/*` und `/einsatz/:einsatzId/gefahrenmatrix/*` — keine Top-Level-Routen (siehe Memory: Einsatz-Routen-Nesting).
- **Response-Decorators:** `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` verpflichtend für alle Gefahrenzonen- und Matrix-Endpoints (AC7).
- **Event-Registry:** Neue Events `GefahrenzoneErstellt`, `GefahrenzoneGeometryGeaendert`, `GefahrenzoneGeloescht`, `GefahrenmatrixAktualisiert` in allen vier Registry-Stellen eintragen.
- **Frontend:** API-Client über `pnpm run generate-api`; TanStack-Query-Hooks `useGefahrenzonen(einsatzId)` und `useGefahrenmatrix(einsatzId)` als einzige Leseweg. Zonen-Rendering joint lokal auf `matrixCellRef`.

## Referenzen

- [Issue #627 — Lagekarte × Gefahrenmatrix-Integration](https://github.com/rubenvitt/bluelight-hub/issues/627)
- [Issue #414 — Gefahren erfassen und verwalten](https://github.com/rubenvitt/bluelight-hub/issues/414)
- [Issue #48 — Lagekarte](https://github.com/rubenvitt/bluelight-hub/issues/48)
- [UX Design Specification — Lagekarte × Gefahrenmatrix](../../_bmad-output/planning-artifacts/ux-design-specification.md)
- [Gefahrenmatrix Implementation Plan](../superpowers/plans/2026-04-06-gefahrenmatrix.md)
- [ADR-006: WebSocket Event Bus einsatz-scoped](./adr-006-websocket-event-bus-einsatz-scoped.md)
