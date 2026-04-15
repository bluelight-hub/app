# ADR-007: Funkkanal als eigenes Aggregat (nicht als Teil von ETB/Einsatz)

## Status

Akzeptiert (2026-04-15)

## Kontext

Ein Funkkanal im Einsatz hat einen eigenen Lebenszyklus: er wird erstellt, umbenannt, dessen Details wechseln (TMO/DMO/Analog), Kräfte werden zugeordnet und wieder entfernt, er wird deaktiviert/reaktiviert oder archiviert. Diese Operationen sind atomar pro Kanal, betreffen aber mehrere Child-Entities (Zuordnungen). Gleichzeitig referenzieren ETB-Einträge (Funksprüche) einen Kanal, dürfen aber dessen State nicht verändern.

Mögliche Einbettungen:

- In `EinsatzAggregate` als Liste — Einsätze hätten zu viel State (plus ETB, Kanäle, weitere Ring-2-Objekte).
- In `EinsatztagebuchAggregate` — ETB ist Protokoll-Backbone, nicht Stammdaten-Verwalter.
- Als typisiertes VO — Zuordnungen brauchen eigene Identität (für Delete, Role-Change) → kein reines VO.

## Entscheidung

Wir modellieren `Funkkanal` als eigenes DDD-Aggregat mit folgenden Grenzen:

- **Aggregate Root:** `FunkkanalAggregate` (ID: `FunkkanalId`, CUID2)
- **Child-Entity:** `FunkkanalZuordnung[]` (ID: `FunkkanalZuordnungId`) — verwaltet ausschließlich über die Root-Methoden `zuordneKraft`, `aendereZuordnungRolle`, `entferneZuordnung`
- **Wert:** `KanalDetails` (Discriminated Union TMO/DMO/Analog) als VO
- **Foreign Reference:** `EinsatzId` (1:N, Aggregat-Grenze NICHT überschritten)
- **Lifecycle-Status:** `aktiv | inaktiv | archiviert` (archiviert ist soft-final: Mutation blockiert, aber Repository-Delete ist möglich, solange keine Funksprüche referenzieren — `hasFunkspruchReferenz`)
- **Domain-Events:** `FunkkanalErstellt`, `FunkkanalGeaendert`, `FunkkanalArchiviert`, `FunkkanalReihenfolgeGeaendert`, `FunkkanalZuordnungErstellt`, `FunkkanalZuordnungEntfernt`

Reorder-Operationen betreffen N Kanäle gleichzeitig und sind das einzige Szenario, in dem ein Kanal-Aggregat nicht die alleinige Transaktionsgrenze ist. Dafür tragen wir ein aggregatsübergreifendes Event `FunkkanalReihenfolgeGeaendert` mit `aggregateId = einsatzId`.

## Konsequenzen

### Positiv

- Operationen auf Kanal + Zuordnungen sind atomar; Invarianten (keine doppelte Kraft, exklusive kraftRef-Kind) liegen an der Aggregatsgrenze.
- Kanäle wachsen unabhängig von Einsatz und ETB — jedes Aggregat bleibt klein.
- Domain-Events eröffnen den WebSocket-Bus, ohne den ETB- oder Einsatz-Code zu berühren.

### Negativ

- Reorder ist ein Aggregat-Grenzfall — wir nutzen dafür bewusst ein "Infrastructure-zentrisches" Event (`aggregateId = einsatzId`), was vom sonstigen Muster abweicht.
- Cross-Aggregat-Konsistenz zwischen Kanal und Funkspruch-Einträgen wird eventuell-konsistent: ETB darf Kanal-IDs referenzieren, die im gleichen Request gerade noch existierten. Schutz: Repository-Check `hasFunkspruchReferenz` vor Hard-Delete + Archivier-Semantik.

## Alternativen

### 1. Als Teil von `EinsatzAggregate`

Abgelehnt: blows up Einsatz-Root, macht Parallel-Mutationen (zwei User ändern parallel Kanäle) unnötig kollidierend.

### 2. Als Teil von `EinsatztagebuchAggregate`

Abgelehnt: ETB ist Protokoll, nicht Stammdatenpflege. Lock-Semantik des ETB (irreversibel) passt nicht zu Kanal-Lifecycle (archive ist reversibel in der Praxis).

### 3. Reiner CRUD-Service ohne Aggregat

Abgelehnt: Invarianten (Zuordnung-Eindeutigkeit, kraftRef-Exklusivität) fallen dann in den Service, Tests werden spröde, Events wären verstreut.

## Referenzen

- [Plan: Funkverkehr Kanalplan & Funkprotokoll](../superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md)
- [FunkkanalAggregate](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/aggregates/funkkanal/funkkanal.aggregate.ts)
- [KanalDetails VO](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/aggregates/funkkanal/kanal-details.vo.ts)
