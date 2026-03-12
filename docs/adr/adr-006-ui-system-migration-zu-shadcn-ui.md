# ADR-006: UI-System-Migration zu shadcn/ui

- Status: Accepted
- Datum: 2026-03-11

## Kontext

Bluelight Hub modernisiert die Frontend-Oberfläche schrittweise in einem Brownfield-Setup. In der bestehenden
Dokumentation standen zuletzt widersprüchliche Aussagen nebeneinander:

- ältere Architektur- und Agenten-Dokumente nannten `Headless UI` als verbindlichen UI-Standard
- PRD-, UX- und Architekturartefakte der aktuellen Modernisierungswelle setzen bereits `shadcn/ui` als Fundament

Diese Unschärfe erzeugt ein reales Risiko: neue Komponenten könnten weiterhin auf Legacy-Primitiven entstehen, obwohl
die Produkt- und UX-Richtung bereits auf ein konsistentes neues UI-System festgelegt ist.

## Entscheidung

`shadcn/ui` ist ab sofort das verbindliche Fundament für neue oder grundlegend überarbeitete Frontend-Komponenten.

Daraus folgen die konkreten Regeln:

1. Neue UI-Komponenten und neue UI-Primitives werden auf `shadcn/ui` aufgebaut.
2. `shared/ui` entwickelt sich schrittweise zu einer auf `shadcn/ui` basierenden Systemschicht für Bluelight Hub.
3. Bereits vorhandene `Headless UI`-Komponenten gelten als Legacy-Bestand im Migrationspfad.
4. Legacy-Komponenten dürfen stabilisiert oder punktuell angepasst werden, aber nicht mehr als Zielstandard für neue
   UI-Arbeit dienen.
5. Bei größeren Refaktorierungen ist zu prüfen, ob der betroffene Bereich direkt auf `shadcn/ui` migriert werden kann.

## Konsequenzen

### Positiv

- Neue UI-Arbeit folgt einem klaren, einheitlichen Zielbild.
- Design-Tokens, Zustände und Interaktionsmuster können konsistenter über `shared/ui` vereinheitlicht werden.
- Die Modernisierung der Produktoberfläche wird architektonisch und organisatorisch klarer steuerbar.

### Negativ

- Während der Migration existiert zeitweise ein Mischbestand aus Legacy- und neuen Komponenten.
- Bestehende Dokumentation und Implementierungsleitplanken müssen aktiv nachgezogen werden.
- Refaktorierungen können zusätzlichen Aufwand erzeugen, wenn Legacy-Bausteine in modernisierte Flächen hineinragen.

## Umsetzungsregeln

- Keine neuen generischen Headless-UI-Wrapper als Standardlösung anlegen.
- Keine neuen parallelen UI-Systeme neben `shadcn/ui` und dem darauf aufbauenden `shared/ui` einführen.
- Storys und technische Spezifikationen müssen bei UI-Arbeit explizit benennen, wenn Legacy-Komponenten nur
  übergangsweise bestehen bleiben.
- Architektur- und Agenten-Dokumente müssen dieselbe Vorgabe widerspruchsfrei tragen.

## Verwandte Dokumente

- [AGENTS.md](/Users/rubeen/dev/personal/bluelight-hub/AGENTS.md)
- [Project Context](/Users/rubeen/dev/personal/bluelight-hub/_bmad-output/project-context.md)
- [Architektur-Prinzipien](/Users/rubeen/dev/personal/bluelight-hub/docs/architecture-principles.md)
- [Frontend-Architektur](/Users/rubeen/dev/personal/bluelight-hub/docs/project-documentation/03-frontend-architektur.md)
