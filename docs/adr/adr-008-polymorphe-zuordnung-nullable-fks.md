# ADR-008: Polymorphe Funkkanal-Zuordnung via drei nullable FKs + Check-Constraint

## Status

Akzeptiert (2026-04-15)

## Kontext

Eine `FunkkanalZuordnung` verbindet einen Funkkanal mit **genau einer** Kraft. "Kraft" ist polymorph: es kann sich um ein Fahrzeug, eine Person oder eine Einheit (EinsatzEinheit) handeln. In allen drei Fällen existieren bereits eigene Tabellen mit eigenen Primary Keys. Die Zuordnungstabelle braucht eine Persistenzform für diese polymorphe Beziehung.

Vier Optionen wurden evaluiert:

1. Single-Table-Inheritance per `kraftType: TEXT` + `kraftId: TEXT` (keine FK)
2. Drei nullable Foreign Keys (`fahrzeugId`, `personId`, `einheitId`) mit DB-Constraint "genau eines gesetzt"
3. Drei Join-Tabellen (`funkkanal_fahrzeug`, `funkkanal_person`, `funkkanal_einheit`)
4. Zwischen-Table "Kraft" mit Subtyp-Tabellen

## Entscheidung

Wir nutzen **Option 2**: drei nullable Foreign Keys auf der `FunkkanalZuordnung`-Tabelle:

```sql
fahrzeug_id TEXT NULL REFERENCES einsatz_fahrzeuge(id) ON DELETE CASCADE,
person_id   TEXT NULL REFERENCES einsatz_personen(id)  ON DELETE CASCADE,
einheit_id  TEXT NULL REFERENCES einsatz_einheiten(id) ON DELETE CASCADE,
CONSTRAINT funkkanal_zuordnung_genau_eine_kraft CHECK (
  ("fahrzeug_id" IS NOT NULL)::int +
  ("person_id"   IS NOT NULL)::int +
  ("einheit_id"  IS NOT NULL)::int = 1
)
```

Die Domain arbeitet mit einer Discriminated Union `FunkkanalZuordnungKraftRef` (`kind: 'fahrzeug' | 'person' | 'einheit'`). Der Mapper übersetzt kind ↔ FK-Feld.

## Konsequenzen

### Positiv

- **Referentielle Integrität:** Jede Zuordnung zeigt auf eine existierende Kraft — keine "dangling IDs".
- **CASCADE-Delete:** Wird ein Fahrzeug gelöscht, verschwinden automatisch alle seine Kanal-Zuordnungen.
- **DB-seitige Invariante:** Check-Constraint schützt gegen fehlerhaft eingefügte Zeilen, selbst bei direktem SQL-Zugriff.
- **Typisierte Domain:** Discriminated Union erzwingt Exhaustive Handling im Mapper und UI-Code.

### Negativ

- Zusätzliche Indices auf drei nullable Spalten — insgesamt drei, bleibt aber vertretbar.
- Mapper-Code ist pro Variante redundant (je ein `switch`-Case). Reduzierbar über eine Helper-Funktion, aber nie null.
- Bei Erweiterung um einen weiteren Kraft-Typ (z. B. "Externe Kraft") braucht es eine Migration und ein weiteres FK-Feld. Diese Erweiterungen sind aber explizit im Scope sichtbar und damit sauber gatebar.

## Alternativen

### 1. Single-Table-Inheritance (`kraftType + kraftId` als String)

Abgelehnt: keine FK, keine CASCADE-Delete, Inkonsistenz-Risiko bei Löschung einer Kraft ohne Cleanup. Der Check-Constraint könnte nur die Eindeutigkeit des Typs, nicht aber die Existenz des Ziels erzwingen.

### 2. Drei separate Join-Tabellen

Abgelehnt: Zuordnungs-Identität zerfällt auf drei Tabellen, Queries über "alle Zuordnungen eines Kanals" werden UNION-schwer, Domain-Aggregat müsste drei Collections zusammenführen.

### 3. Zwischen-Entität "Kraft" mit Subtypen

Abgelehnt: erfordert fundamentale Umstellung bestehender Tabellen (Fahrzeug, Person, Einheit) und deren Verwaltungs-UI. Scope-Explosion.

## Referenzen

- [Plan: Funkverkehr Kanalplan & Funkprotokoll](../superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md)
- [Migration add_funkkanal_and_zuordnung](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/prisma/migrations)
- [FunkkanalZuordnung Entity](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/aggregates/funkkanal/funkkanal-zuordnung.entity.ts)
