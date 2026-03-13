# Issue Templates

## Inhaltsverzeichnis

1. Typwahl
2. Emoji-Regeln
3. Label-Heuristik
4. Vorlagen
5. Beispiele für starke Titel

## Typwahl

Wähle genau einen primären Typ.
Nutze nicht automatisch eine User Story.

### User Story

Nutze diesen Typ nur, wenn alle drei Punkte klar erkennbar sind:

- eine Nutzerrolle oder Zielgruppe
- ein Ziel oder eine Fähigkeit
- ein erkennbarer fachlicher Nutzen

### Bug

Nutze diesen Typ bei falschem Verhalten, Regressionen, Datenfehlern, UX-Defekten oder Abstürzen.

### Verbesserung oder Task

Nutze diesen Typ bei einer konkreten Änderung, wenn keine saubere Story-Form mit Rolle und Nutzen möglich ist.

### Tech Debt oder Chore

Nutze diesen Typ für interne technische Arbeiten wie Refactoring, Aufräumen, Migrationen oder Wartung.

### Spike oder Research

Nutze diesen Typ, wenn zuerst Erkenntnisgewinn statt Umsetzung im Vordergrund steht.
Definiere dann eine klare Fragestellung und ein erwartetes Ergebnisartefakt.

### Docs

Nutze diesen Typ für Dokumentationslücken, veraltete Inhalte oder fehlende Erklärungen.

## Emoji-Regeln

Wähle das Emoji nach dem primären Typ:

- `✨` neue Funktion, Story, fachlicher Mehrwert
- `🐛` Bug, Regression, Fehlverhalten
- `🧹` Chore, Cleanup, Refactoring, Wartung
- `🔬` Spike, Analyse, Research
- `📚` Dokumentation
- `⚡` Performance oder deutlich spürbare Optimierung
- `🔒` Security-Problem oder Security-Härtung

Wenn mehrere Emojis passen, bevorzuge das Emoji des primären Typs und verwende nur eines.

## Label-Heuristik

Lade die vorhandenen Labels live mit `gh label list`.
Mappe dann vom Inhalt auf die vorhandenen Labels.

Empfohlene Label-Dimensionen:

- Typ: `bug`, `feature`, `enhancement`, `documentation`, `refactor`, `tech-debt`, `research`
- Bereich: `frontend`, `backend`, `shared`, `infra`, konkrete Modul- oder Feature-Namen
- Priorität: `prio:high`, `p1`, `critical` oder ähnliche vorhandene Konventionen
- Plattform oder Domäne: `web`, `desktop`, `api`, `tauri`, `postgres`, `auth`

Regeln:

- bevorzuge exakte semantische Treffer gegenüber ähnlichen Farben oder ähnlichen Namen
- nutze pro Dimension höchstens ein klares Hauptlabel, außer das Repository nutzt bewusst Mehrfachlabels
- wenn ein Labelname unklar ist, prüfe die Beschreibung und verwende es nur bei echtem Fit
- wenn keine gute Zuordnung möglich ist, lasse das Label weg

## Vorlagen

Passe jede Vorlage an den konkreten Fall an.
Lösche Abschnitte, die keinen Mehrwert haben.

### User Story

```md
## Zusammenfassung

<Kurze Beschreibung der gewünschten Fähigkeit>

## User Story

Als <Rolle>
möchte ich <Ziel>
damit <Nutzen>.

## Kontext

<Relevanter fachlicher oder technischer Hintergrund>

## Akzeptanzkriterien

- [ ] <Kriterium 1>
- [ ] <Kriterium 2>

## Abgrenzung

<Was explizit nicht Teil des Issues ist, falls hilfreich>
```

### Bug

```md
## Problem

<Kurze Beschreibung des Fehlverhaltens>

## Ist-Verhalten

<Was aktuell passiert>

## Soll-Verhalten

<Was stattdessen erwartet wird>

## Schritte zur Reproduktion

1. <Schritt 1>
2. <Schritt 2>
3. <Schritt 3>

## Auswirkung

<Wer oder was betroffen ist; Schweregrad oder Risiko>

## Hinweise

<Logs, Screenshots, Verdachtsmomente oder offene Punkte>
```

### Verbesserung oder Task

```md
## Ziel

<Welche Änderung umgesetzt werden soll>

## Hintergrund

<Warum die Änderung sinnvoll oder nötig ist>

## Umsetzungshinweise

- <wichtiger Punkt 1>
- <wichtiger Punkt 2>

## Definition of Done

- [ ] <DoD 1>
- [ ] <DoD 2>
```

### Tech Debt oder Chore

```md
## Problem

<Technische Last, Inkonsistenz oder Wartungsproblem>

## Ziel

<Welcher bessere Zustand erreicht werden soll>

## Scope

- <im Scope>
- <im Scope>

## Risiken oder Hinweise

<Migrationsrisiken, betroffene Bereiche, Abhängigkeiten>

## Definition of Done

- [ ] <DoD 1>
- [ ] <DoD 2>
```

### Spike oder Research

```md
## Fragestellung

<Was genau untersucht werden soll>

## Hintergrund

<Warum diese Untersuchung nötig ist>

## Erwartetes Ergebnis

<z. B. Entscheidungsgrundlage, ADR-Vorschlag, Vergleich, Prototypeinschätzung>

## Timebox oder Rahmen

<Falls bekannt>
```

### Docs

```md
## Problem

<Welche Doku fehlt oder ist falsch>

## Ziel

<Was nach dem Issue dokumentiert sein soll>

## Betroffene Stellen

- <Datei oder Bereich 1>
- <Datei oder Bereich 2>

## Definition of Done

- [ ] <DoD 1>
- [ ] <DoD 2>
```

## Beispiele für starke Titel

- `✨ ETB-Historie um Snapshot-Vergleich erweitern`
- `🐛 Erinnerung wird nach Snooze doppelt ausgelöst`
- `🧹 Frontend-Formularvalidierung auf gemeinsame Zod-Helfer umstellen`
- `🔬 Tauri-Strategie für automatische Updates evaluieren`
- `📚 API-Workflow in der Entwicklerdokumentation ergänzen`
