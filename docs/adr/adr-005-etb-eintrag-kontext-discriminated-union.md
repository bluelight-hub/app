# ADR-005: ETB-Eintrag-Kontext als Discriminated Union

## Status

Akzeptiert (2026-04-15)

## Kontext

Mit dem Funkverkehr-Feature (Issue #407) wird das Einsatztagebuch (ETB) zum **Protokoll-Backbone** für alle einsatzrelevanten Ereignisse: neben klassischen Einträgen auch Funksprüche, perspektivisch weitere Ereignis-Typen (z. B. Befehls-Quittungen, Alarmierungen). Jeder Eintrag braucht zusätzlich zum Text strukturierte Kontext-Daten — für Funksprüche z. B. Kanal, Priorität, Absender/Empfänger — die filterbar, exportierbar und typsicher sein müssen.

Gleichzeitig soll die Sequenz- und Revisionssicherheit des ETB (lückenlose sequenceNumber, Snapshots, Locking) unangetastet bleiben. Funksprüche dürfen **nicht** in einer separaten Tabelle landen, weil die chronologische Gesamtsicht (Protokoll) sonst teuer zu mergen wäre.

## Entscheidung

Wir erweitern `EtbEintrag` um zwei zusammengehörige Spalten:

- `kontextType: TEXT NOT NULL DEFAULT 'standard'` — diskriminierender String
- `kontextData: JSONB NULL` — typspezifische Payload (ohne Discriminator)

Die Domain-Repräsentation ist eine Discriminated Union `EintragKontext` (Value Object):

```ts
type EintragKontextShape =
  | { type: 'standard' }
  | { type: 'funkspruch'; kanalId: string; funkPrioritaet: FunkPrioritaetValue; ... };
```

Serialisierung/Deserialisierung erfolgt über `EintragKontext.toPersistence()` / `fromPersistence(type, data)`. Der Discriminator wird **nicht** im JSONB dupliziert.

Ergänzend: zwei Zeitstempel-Felder `erfasstAm` (System-Zeit) und `ereignisZeitpunkt` (fachlicher Zeitpunkt) ersetzen die bisherige alleinige Nutzung von `timestamp`. Bestehende Einträge werden per Migration aus `timestamp` backfilled.

## Konsequenzen

### Positiv

- Chronologische Gesamtsicht bleibt eine einzige Tabelle, ein einziger Index (`etb_id, ereignis_zeitpunkt`).
- Neue Kontext-Typen brauchen keine Schema-Migration, nur einen neuen Case in der Union + ggf. JSONB-Feld-Index.
- Typsicherheit an der Domain-Grenze (Exhaustive Switch) schützt vor unbehandelten Varianten.
- JSONB erlaubt gezielte Indices (z. B. `kontext_data->>'kanalId'` für `hasFunkspruchReferenz`).

### Negativ

- JSONB-Validierung liegt allein in der Domain — Prisma prüft die Struktur nicht.
- Breaking Changes an Kontext-Varianten erfordern Migrations-Skripte auf den JSONB-Payloads.
- Event-Payloads müssen eine versionsfeste Persistenzform tragen (siehe EintragAddedEvent `kontext: EintragKontextPersisted`).

## Alternativen

### 1. Separate Tabelle pro Ereignis-Typ (z. B. `etb_funkspruch`)

Abgelehnt: zerstört die chronologische Gesamtsicht, macht Sequenznummern unübersichtlich, erzwingt teure Cross-Table-Sortierung.

### 2. Single-Table-Inheritance mit allen Feldern nullable

Abgelehnt: breite Tabelle mit vielen `NULL`-Spalten, keine Typsicherheit, Indices explodieren.

### 3. Polymorphes `kontext_type` + drei nullable FKs (analog Funkkanal-Zuordnung)

Abgelehnt: ein Funkspruch referenziert keine andere Entität als `kanalId`; der Rest (Priorität, Absender) sind reine Werte. Relationale Modellierung ist Overkill.

## Referenzen

- [Plan: Funkverkehr Kanalplan & Funkprotokoll](../superpowers/plans/2026-04-14-funkverkehr-kanalplan-funkprotokoll.md)
- [EintragKontext VO](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/value-objects/eintrag-kontext.ts)
- [EtbEintrag Entity](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/entities/etb-eintrag.entity.ts)
