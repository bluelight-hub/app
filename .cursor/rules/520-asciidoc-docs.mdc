---
description: ENFORCE standardized AsciiDoc documentation format and structure
globs: 
alwaysApply: false
---

# AsciiDoc Dokumentationsstandards

Bei der Erstellung und Bearbeitung von AsciiDoc-Dokumentation sind folgende Richtlinien zu beachten:

## Allgemeine Dokumentationsstruktur

1. Jede Arc42-Datei muss mit einer Überschrift beginnen, die der Abschnittsnummer und dem Titel entspricht (z.B. `= 5. Bausteinsicht`)
2. Inhalte sollten hierarchisch mit AsciiDoc-Überschriften strukturiert werden (`=` für Haupttitel, `==` für Abschnitte, `===` für Unterabschnitte)
3. Die folgenden Arc42-Abschnitte müssen in separaten Dateien unter docs/architecture/ abgelegt werden:
   - 01-introduction-goals.adoc
   - 02-constraints.adoc
   - 03-context.adoc
   - 04-solution-strategy.adoc
   - 05-building-block-view.adoc
   - 06-runtime-view.adoc
   - 07-deployment-view.adoc
   - 08-concepts.adoc
   - 09-architecture-decisions.adoc
   - 10-quality-scenarios.adoc
   - 11-risks.adoc
   - 12-glossary.adoc

## Formatierung und Stil

1. Verwende AsciiDoc-Tabellen mit entsprechenden Attributen für strukturierte Informationen:
   ```asciidoc
   [cols="1,2,1", options="header"]
   |===
   |Spalte 1 |Spalte 2 |Spalte 3
   |Zelle 1-1 |Zelle 1-2 |Zelle 1-3
   |===
   ```

2. Wichtige Begriffe können durch `*Fettschrift*` hervorgehoben werden
3. Verwende Blöcke für Hinweise, Warnungen oder Notizen:
   ```asciidoc
   [NOTE]
   ====
   Dies ist ein Hinweis.
   ====

   [WARNING]
   ====
   Dies ist eine Warnung.
   ====
   ```

4. Bilder sollten im Verzeichnis docs/architecture/images/ abgelegt werden:
   ```asciidoc
   image::images/diagramm.png[Beschreibung, width=80%]
   ```

5. Verwende Mermaid für Diagramme mit folgendem Format:
   ```asciidoc
   [mermaid]
   ....
   flowchart LR
     A --> B
   ....
   ```

## Inhaltliche Anforderungen

1. Jede Datei sollte einen "Übersicht"-Abschnitt enthalten, der den Zweck und Inhalt des Abschnitts erläutert
2. Entscheidungen sollten mit klaren Begründungen dokumentiert werden
3. Bei unvollständigen Informationen sollte ein "Offene Punkte"-Abschnitt am Ende der Datei hinzugefügt werden
4. Begriffe, die im Glossar definiert sind, sollten beim ersten Vorkommen in einem Abschnitt verlinkt werden (z.B. `<<12-glossary.adoc#begriff,Begriff>>`)
5. ADRs (Architecture Decision Records) sollten referenziert werden, wenn sie relevant für den Abschnitt sind

## Dokumentationsansätze

Die arc42-Dokumentation folgt den im Konzept definierten Dokumentationsansätzen:

1. **Lean**: Nur die wichtigsten Informationen, minimalistisch
2. **Essential**: Grundlegende Informationen für ein gemeinsames Verständnis
3. **Thorough**: Detaillierte Dokumentation für komplexe Bereiche

Wähle den passenden Ansatz je nach Komplexität und Bedeutung des dokumentierten Aspekts.

## Aktualisierung der Dokumentation

1. Die Dokumentation sollte mit dem Code synchron gehalten werden
2. Bei größeren Architekturänderungen müssen die betroffenen Abschnitte aktualisiert werden
3. Dokumentiere offene Fragen explizit, statt sie zu ignorieren

## Konvertierungshinweise Markdown zu AsciiDoc

Beim Konvertieren bestehender Markdown-Dokumente zu AsciiDoc beachte folgende Änderungen:

| Markdown | AsciiDoc | Beispiel |
|----------|----------|----------|
| `# Titel` | `= Titel` | `= 1. Einführung` |
| `## Untertitel` | `== Untertitel` | `== 1.1 Aufgabenstellung` |
| `- Listenpunkt` | `* Listenpunkt` | `* Wichtiger Punkt` |
| `1. Nummeriert` | `. Nummeriert` | `. Erster Schritt` |
| `**fett**` | `*fett*` | `*wichtig*` |
| `*kursiv*` | `_kursiv_` | `_betont_` |
| `` `code` `` | `` `code` `` | `` `Funktion()` `` |
| `[Link](mdc:url)` | `link:url[Link]` | `link:https://example.com[Beispiel]` |
| `![Alt](mdc:bild.png)` | `image::bild.png[Alt]` | `image::diagramm.png[Architektur]` |
| ```mermaid | [mermaid]<br>.... | [mermaid]<br>....<br>diagramm<br>.... | 