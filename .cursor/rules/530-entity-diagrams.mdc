---
description: ENFORCE diagram updates when entity models change to maintain documentation accuracy
globs: 
alwaysApply: false
---
# Entity-Diagramm Standards

## Context
- Gilt für ER-Diagramme in Abschnitt 5.3 der Architekturdokumentation
- Betrifft Änderungen an Entity-Klassen im Backend

## Requirements
1. **Diagramm-Aktualisierung**
   - Bei jeder Ergänzung neuer Entitäten
   - Bei jeder Entfernung bestehender Entitäten
   - Bei signifikanten Änderungen an Attributen oder Beziehungen

2. **Diagramm-Format**
   - Mermaid ER-Diagramm-Syntax verwenden
   - Beziehungen mit korrekten Kardinalitäten darstellen
   - Entitäten mit ihren wichtigsten Attributen anzeigen

3. **Aktualisierungs-Workflow**
   1. Entity-Klassen ändern
   2. Entsprechendes ER-Diagramm in 05-building-block-view.adoc aktualisieren
   3. Dokumentation der Änderung in den betroffenen Abschnitten

4. **Validierung**
   - Überprüfung der Konsistenz zwischen Code und Diagramm
   - Bei Pull Requests: Reviewer müssen Diagramm-Aktualisierung bestätigen

## Examples

```mermaid
erDiagram
    User ||--o{ Order : places
    Order ||--|{ OrderItem : contains
    Product ||--o{ OrderItem : "ordered in"
```

## Praktische Anwendung

### Beim Hinzufügen einer neuen Entität

1. Füge die neue Entität zum entsprechenden ER-Diagramm in 05-building-block-view.adoc hinzu
2. Stelle sicher, dass:
   - Alle wichtigen Attribute dargestellt sind
   - Beziehungen zu anderen Entitäten korrekt definiert sind
   - Kardinalitäten richtig angegeben sind

### Bei Änderungen an bestehenden Entitäten

1. Aktualisiere die Attribute und Beziehungen im Diagramm
2. Dokumentiere signifikante Änderungen im Begleittext

### Beispiel für den Update-Prozess

1. Entity-Klasse hinzufügen/ändern in `packages/backend/src/entities/`
2. ER-Diagramm in 05-building-block-view.adoc aktualisieren
3. Commit-Nachricht deutlich mit "UPDATE DIAGRAM:" kennzeichnen
4. In Pull Request ausdrücklich auf Diagramm-Update hinweisen 