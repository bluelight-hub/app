# GitHub Issue anlegen

Das Issue Ende-zu-Ende anlegen, außer der Nutzer verlangt ausdrücklich nur einen Entwurf.

**Nutzereingabe:** $ARGUMENTS

## Ablauf

1. Repository-Kontext ermitteln.
   - `gh repo view --json nameWithOwner` ausführen.
   - `gh label list --limit 200` ausführen.
   - Bei spürbarem Duplikat-Risiko zusätzlich `gh issue list --limit 200 --search "<keywords>"` ausführen.
2. Issue-Typ klassifizieren.
   - Den passendsten Typ wählen: Feature, Bug, Technical Debt oder Refactor, Research oder Spike, Dokumentation, Epic oder Chore beziehungsweise Ops.
   - Nicht alles gewaltsam als User Story formulieren. Die Struktur soll dem Arbeitstyp folgen.
3. Issue-Body auf Deutsch formulieren.
   - Die Issue-Vorlagen weiter unten verwenden.
   - Kurzes, gut scanbares Markdown mit klaren Abschnitten und flachen Listen bevorzugen.
   - Lücken mit Annahmen oder offenen Fragen markieren, statt bei kleineren Unklarheiten zu blockieren.
4. Titel bauen.
   - Mit einem passenden Emoji beginnen.
   - Konkret, ergebnisorientiert und eigenständig verständlich formulieren.
   - Füllwörter wie `Issue`, `Ticket`, `Problem mit` oder einen Punkt am Ende vermeiden.
5. Labels aus der Live-Label-Liste auswählen.
   - Nur Labels verwenden, die `gh label list` tatsächlich liefert.
   - Die Label-Strategie weiter unten beachten.
   - In der Regel 2 bis 5 Labels setzen.
6. Issue erstellen.
   - Den Markdown-Body in eine temporäre Datei schreiben, um Shell-Escaping-Probleme zu vermeiden.
   - `gh issue create` mit `--title`, `--body-file` und je einem `--label` pro Label ausführen.
   - Bei reinem Entwurfswunsch hier stoppen.
7. Ergebnis zurückmelden.
   - Bei Erstellung Nummer und URL nennen.
   - Typ, gewählte Labels und relevante Annahmen kurz aufführen.

## Qualitätsmaßstab

- Das Issue auf Deutsch schreiben, außer der Repository-Kontext verlangt klar etwas anderes.
- Den Titel mit genau einem passenden Emoji beginnen.
- Die Body-Struktur am Issue-Typ ausrichten statt eine Einheitsvorlage zu verwenden.
- Akzeptanzkriterien nur ergänzen, wenn das Issue tatsächlich umsetzbare Arbeit beschreibt.
- Keine Labels, Milestones oder Project-Felder erfinden.
- Die repo-native Taxonomie über generische GitHub-Gewohnheiten stellen.

## Typauswahl

- Feature oder User Story: Für neuen Nutzer- oder Operator-Nutzen verwenden.
- Bug: Für defektes oder fehlendes Verhalten mit klarer Lücke zwischen Ist und Erwartung verwenden.
- Technical Debt oder Refactor: Für Wartbarkeit, Architektur, Bereinigung oder Konsistenz ohne primären Endnutzer-Scope verwenden.
- Research oder Spike: Für unbekannte Punkte verwenden, die vor der Umsetzung geklärt werden müssen.
- Dokumentation: Für ADRs, technische Doku, Prozessdoku oder fehlende Dokumentation verwenden.
- Epic: Für übergreifende Planung über mehrere Child-Issues oder Workstreams verwenden.
- Chore oder Ops: Für Tooling, CI, Konfiguration, Deployment, Dependencies oder Housekeeping verwenden.

Wenn zwei Typen plausibel wirken, den Typ wählen, der die Struktur des Issue-Bodys am stärksten verändert.

## Kommandomuster

Eine temporäre Datei und explizite Labels verwenden:

```bash
tmp_body="$(mktemp /tmp/create-gh-issue.XXXXXX.md)"

cat > "$tmp_body" <<'EOF'
## Ziel
...
EOF

gh issue create \
  --title "✨ Beispieltitel" \
  --body-file "$tmp_body" \
  --label "enhancement" \
  --label "frontend"

rm -f "$tmp_body"
```

---

## Issue-Vorlagen

Die Vorlage verwenden, die zur tatsächlichen Arbeit passt. Überschriften nur behalten, wenn sie Klarheit schaffen. Leere Abschnitte entfernen.

### Feature / User Story

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

### Bug

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

### Tech Debt / Refactor

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

### Research / Spike

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

### Documentation

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

### Epic

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

### Chore / Ops

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

---

## Label-Strategie

Nur Labels verwenden, die im aktuellen Repository tatsächlich existieren (`gh label list`). Keine ähnlichen Varianten erfinden.

### Auswahlreihenfolge

1. 1 primäres Typ-Label wählen, wenn das Repository eine klare Entsprechung hat.
2. 1 bis 2 Scope-Labels für Stack, Oberfläche oder Subsystem wählen.
3. 0 bis 2 Domänen-Labels wie `bereich:*` oder `modul-seite` wählen.
4. 0 bis 1 Dringlichkeits- oder Risiko-Label wählen.
5. 0 bis 1 Qualifizierungs-Label wählen, wenn es echten Zusatznutzen bringt.

Meist bei insgesamt 2 bis 5 Labels stoppen.

### Zuordnungsheuristiken

- **Feature / User Story:** `enhancement` bevorzugen. Stack- und Domänen-Labels ergänzen, die beschreiben, wo der Nutzen landet.
- **Bug:** `bug` bevorzugen. Den betroffenen Bereich ergänzen (`frontend`, `backend`, `api`, `tauri`, `mobile`, `ui/ux`).
- **Tech Debt / Refactor:** `technical-debt` bevorzugen. `refactor`, `code-quality` oder `architecture` nur ergänzen, wenn sie das Problem schärfen.
- **Research / Spike:** `question` bevorzugen. `audit` für evaluative Arbeit und `architecture` für Design-Trade-offs ergänzen.
- **Documentation:** `documentation` bevorzugen. `architecture` oder Subsystem-Labels ergänzen, wenn die Doku zu einem klaren Bereich gehört.
- **Chore / Ops:** Das konkreteste operative Label bevorzugen (`tools`, `configuration`, `deployment`, `dependencies`, `ci`, `ci/cd`, `infrastructure`).
- **Epic:** `epic` bevorzugen. Nur die breitesten Scope-Labels ergänzen, die beim Routing helfen.

### Vermeiden

- Triage-Labels wie `duplicate`, `invalid` oder `wontfix` für neu angelegte Arbeit nicht verwenden.
- Nahe Dubletten nicht kombinieren, außer sie drücken wirklich verschiedene Dimensionen aus.
- Issues nicht mit allen theoretisch passenden Labels überladen.
