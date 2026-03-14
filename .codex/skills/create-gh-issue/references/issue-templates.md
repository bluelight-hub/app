# Issue-Vorlagen

Die Vorlage verwenden, die zur tatsächlichen Arbeit passt. Überschriften nur behalten, wenn sie Klarheit schaffen. Leere Abschnitte entfernen.

## Feature / User Story

Verwenden, wenn das Issue neuen Nutzer- oder Operator-Nutzen beschreibt.

- Title emoji: `✨`
- Preferred type label: `enhancement`

```md
## Ziel
<Welchen Nutzen soll das Issue liefern?>

## Kontext
<Ausgangslage, betroffener Bereich, warum jetzt>

## User Story
Als <Rolle>
möchte ich <Fähigkeit>
damit <Nutzen>

## Akzeptanzkriterien
- [ ] ...
- [ ] ...

## Abgrenzung
- Nicht Teil dieses Issues: ...

## Offene Fragen
- ...
```

## Bug

Verwenden, wenn bestehendes Verhalten defekt ist oder Erwartungen widerspricht.

- Title emoji: `🐛`
- Preferred type label: `bug`

```md
## Ist-Verhalten
<Was passiert aktuell?>

## Erwartetes Verhalten
<Was sollte stattdessen passieren?>

## Schritte zur Reproduktion
1. ...
2. ...
3. ...

## Auswirkung
<Wie stark ist der Fehler und wen betrifft er?>

## Technische Hinweise
- Betroffene Oberfläche / API / Komponente: ...
- Auffälligkeiten aus Logs, Tests oder Screenshots: ...

## Akzeptanzkriterien
- [ ] Fehler ist reproduzierbar verstanden
- [ ] Fehlerursache ist behoben
- [ ] Regression ist abgesichert
```

## Tech Debt / Refactor

Verwenden, wenn Wartbarkeit, Konsistenz oder Architektur der Kern des Issues sind.

- Title emoji: `♻️`
- Preferred type labels: `technical-debt`, `refactor`, `refactoring`, `code-quality`, `architecture`

```md
## Problem
<Welcher technische Schmerz oder welche Inkonsistenz besteht?>

## Zielbild
<Wie soll der Zielzustand aussehen?>

## Scope
- ...

## Nicht im Scope
- ...

## Akzeptanzkriterien
- [ ] ...
- [ ] ...

## Risiken / Abhängigkeiten
- ...
```

## Research / Spike

Verwenden, wenn Antworten, Optionen oder Entscheidungen fehlen.

- Title emoji: `🔬`
- Typical supporting labels: `question`, `audit`, `architecture`

```md
## Fragestellung
<Welche Frage soll beantwortet werden?>

## Hintergrund
<Warum muss das jetzt untersucht werden?>

## Zu prüfende Optionen
- ...
- ...

## Erwartetes Ergebnis
<Entscheidung, Empfehlung, Vergleich oder Prototyp>

## Erfolgskriterium
- [ ] Entscheidungsvorlage liegt vor
- [ ] Risiken und Trade-offs sind dokumentiert

## Timebox
<Optional: z. B. 0,5-1 Tag>
```

## Documentation

Verwenden, wenn das eigentliche Ergebnis Dokumentation statt Code ist.

- Title emoji: `📚`
- Preferred type label: `documentation`

```md
## Ziel
<Welche Dokumentation fehlt oder muss geändert werden?>

## Anlass
<Warum ist die Dokumentation nötig oder veraltet?>

## Betroffene Dokumente
- ...

## Erwartete Änderungen
- ...

## Akzeptanzkriterien
- [ ] Dokumentation ist aktualisiert oder neu angelegt
- [ ] Beispiele, Entscheidungen oder Betriebsdetails sind nachvollziehbar beschrieben
```

## Epic

Verwenden, wenn das Issue mehrere Workstreams oder Child-Issues bündelt.

- Title emoji: `🧱`
- Preferred type label: `epic`

```md
## Zielbild
<Was soll die Epic insgesamt erreichen?>

## Nutzen
<Geschäftlicher, operativer oder technischer Wert>

## Scope
- ...

## Teil-Issues
- [ ] ...
- [ ] ...

## Erfolgsmetriken
- ...

## Risiken / Abhängigkeiten
- ...
```

## Chore / Ops

Verwenden, wenn das Issue primär operativ, infrastrukturell oder toolingbezogen ist.

- Title emoji: `🔧`
- Typical supporting labels: `tools`, `ci`, `ci/cd`, `configuration`, `deployment`, `dependencies`, `infrastructure`

```md
## Aufgabe
<Was soll erledigt werden?>

## Hintergrund
<Warum ist die Aufgabe nötig?>

## Scope
- ...

## Akzeptanzkriterien
- [ ] ...
- [ ] ...

## Risiken / Abhängigkeiten
- ...
```
