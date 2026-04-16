# ADR-009: Getrennte Commands für manuelle vs. FMS-Auto-Zeitpunkt-Aktualisierung

## Status

Akzeptiert (2026-04-15)

## Kontext

Das `AlarmierungAggregate` (Issue #408) führt pro Empfänger vier Zeitpunkte (`alarmiertAm`, `ausgeruecktAm`, `vorOrtAm`, `wiederFreiAm`). Drei dieser Felder können auf zwei Wegen gesetzt werden:

1. **Manuell** — Disponent trägt einen Zeitpunkt nach (UI: Zeitpunkt-Popover), typischerweise weil FMS-Meldungen fehlten oder falsch waren.
2. **FMS-Auto-Population** — ein Fahrzeug-Empfänger wechselt seinen FMS-Status; der Adapter setzt das zum Status passende Feld (1/2 → `wiederFreiAm`, 3 → `ausgeruecktAm`, 4 → `vorOrtAm`).

Beide Pfade müssen die gleichen Invarianten wahren (Chronologie gegen `alarmiertAm`, no-overwrite, Abschluss-Sperre). Gleichzeitig braucht die Timeline-Ansicht die Möglichkeit, pro Zeitpunkt die Quelle (manuell vs. FMS) und den Urheber (`korrigiertVon` bzw. `fmsStatus`) anzuzeigen.

Optionen:

1. Ein gemeinsamer Command + ein gemeinsames Event mit `source`-Feld (`'manuell' | 'fms'`).
2. Getrennte Commands + getrennte Events, identische Aggregat-Methoden-Signatur.
3. Getrennte Commands + getrennte Aggregat-Methoden + getrennte Events.

## Entscheidung

Wir wählen **Option 3**: zwei getrennte Pfade über das gesamte Stack.

- **Manueller Pfad:** `KorrigiereZeitpunktCommand` → `AlarmierungAggregate.korrigiereZeitpunkt()` → `AlarmierungZeitpunktKorrigiertEvent` (Payload inkl. `korrigiertVon`).
- **FMS-Pfad:** `FmsStatusGeaendertEvent` → `FmsAlarmierungZeitpunktAdapter` → `FmsStatusZuAlarmierungHandler` → `AlarmierungAggregate.aktualisiereZeitpunktAusFms()` → `AlarmierungZeitpunktFmsGesetztEvent` (Payload inkl. `fmsStatus`, `feld`, `wert`). Kein REST-Endpoint; die Methode ist ausschließlich über den Event-Adapter erreichbar.

Die beiden Aggregat-Methoden unterscheiden sich in ihrem Fehlerverhalten:

- `korrigiereZeitpunkt` signalisiert Konflikte als `Result.fail` (UI zeigt Fehlermeldung).
- `aktualisiereZeitpunktAusFms` behandelt „bereits gesetzt", „nicht Fahrzeug-Empfänger" und „Alarmierung abgeschlossen" als **no-op** mit `Result.ok`. Damit ist der FMS-Pfad idempotent und überschreibt niemals manuelle Werte.

## Konsequenzen

### Positiv

- **Audit-Trennung:** Timeline kann pro Zeitpunkt die Quelle eindeutig ausweisen. Kein `source`-Feld, das irgendwo vergessen wird.
- **Kein-Überschreiben-Invariante ist im Aggregat lokal:** `aktualisiereZeitpunktAusFms` prüft `getZeitpunkt(feld) !== null` und stoppt — ein einziger Kontrollpunkt.
- **Fire-and-Forget sauber begrenzt:** der FMS-Pfad schluckt Fehler auf Event-Adapter-Ebene (Circuit-Breaker `alarmierung`), ohne den manuellen Pfad zu beeinträchtigen.
- **API-Kontrakt klar:** der REST-Controller exponiert nur den manuellen Pfad; FMS-Population ist reine Infrastruktur.

### Negativ

- Zwei Events bedeuten zwei ETB-Handler-Pfade — mehr Code, mehr Tests (aktuell durch `etb-eintrag.helper.ts` als gemeinsame Basis entschärft).
- Das Mapping FMS-Status → Zeitpunktfeld liegt im Aggregat (`mapFmsStatusZuZeitpunktFeld`) und nicht im Handler — bewusste Entscheidung, um Reihenfolge und Semantik im Domain-Kern zu halten.

## Alternativen

### 1. Gemeinsamer Command mit `source`-Feld

Abgelehnt: FMS hat kein `userId`, kein „Rückgängig" und keine UI-seitige Fehlermeldung. Ein gemeinsamer Command bräuchte zwei Ausprägungen der Payload (mit/ohne `korrigiertVon`, mit/ohne `fmsStatus`) — faktisch zwei Commands in einem.

### 2. Gemeinsame Aggregat-Methode, getrennte Commands

Abgelehnt: Das no-op-Verhalten für FMS (bei bereits gesetztem Feld) widerspricht der Fail-Fast-Semantik, die der manuelle Pfad erwartet. Eine gemeinsame Methode müsste intern nach Quelle verzweigen — keine echte Vereinfachung.

## Referenzen

- [Plan: Alarmierung Wave 1](../superpowers/plans/2026-04-15-alarmierung-wave1.md)
- [AlarmierungAggregate](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/domain/aggregates/alarmierung/alarmierung.aggregate.ts)
- [FmsAlarmierungZeitpunktAdapter](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/infrastructure/events/adapters/fms-alarmierung-zeitpunkt.adapter.ts)
- [FmsStatusZuAlarmierungHandler](/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/application/alarmierung/event-handlers/fms-status-zu-alarmierung.handler.ts)
