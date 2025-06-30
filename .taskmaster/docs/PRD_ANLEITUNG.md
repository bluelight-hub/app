# Anleitung zur Erstellung und Verwendung von PRDs mit Task Master

## Was ist ein PRD?

Ein PRD (Product Requirements Document) ist ein strukturiertes Dokument, das die Anforderungen an ein zu entwickelndes Produkt oder Projekt beschreibt. Es dient als Grundlage für die Projektplanung, Entwicklung und Kommunikation im Team.

## PRD-Struktur für Task Master

Für die Verwendung mit Task Master sollte ein PRD folgendermaßen strukturiert sein:

```
<context>
# Projektübersicht
[Inhalt zur Projektübersicht...]

# Kernfunktionen
[Beschreibung der Kernfunktionen...]

# Benutzererfahrung
[Beschreibung der Benutzererfahrung...]
</context>
<PRD>
# Technische Architektur
[Technische Details...]

# Entwicklungs-Roadmap
[Roadmap Informationen...]

# Logische Abhängigkeitskette
[Abhängigkeiten zwischen Komponenten...]

# Risiken und Gegenmaßnahmen
[Risiken und deren Mitigation...]

# Anhang
[Weitere technische Informationen...]
</PRD>
```

**Wichtig**: Die Tags `<context>` und `<PRD>` sind erforderlich. Der Context-Bereich enthält allgemeine Informationen zum Projektkontext, während der PRD-Bereich die konkreten technischen Anforderungen enthält, die für die Task-Generierung verwendet werden.

## Vorlagen zur Verwendung

In diesem Projekt stehen folgende Vorlagen zur Verfügung:

1. **example_prd.txt**: Ein ausführliches Beispiel-PRD für Bluelight-Hub mit vollständig ausgearbeiteten Anforderungen
2. **prd_template.txt**: Eine leere Vorlage mit Platzhaltern für eigene PRDs

## Erstellen eines neuen PRDs

So erstellst du ein neues PRD:

1. Kopiere eine der Vorlagen (z.B. `scripts/prd_template.txt`) als Ausgangspunkt
2. Ersetze die Platzhalter durch deine eigenen Anforderungen
3. Speichere die Datei unter einem aussagekräftigen Namen, z.B. `scripts/mein_projekt_prd.txt`

## Verwenden des PRDs mit Task Master

Nachdem du dein PRD erstellt hast, kannst du es mit Task Master verarbeiten, um automatisch Aufgaben zu generieren:

### Über die MCP-Tools (empfohlen):

```typescript
mcp_task -
  master -
  ai_parse_prd({
    projectRoot: '/absoluter/pfad/zum/projekt',
    input: 'scripts/mein_projekt_prd.txt',
    append: false, // auf true setzen, um zu existierenden Tasks hinzuzufügen
    force: true, // überschreibt tasks.json ohne Rückfrage
  });
```

### Über die Kommandozeile:

```bash
task-master parse-prd --input=scripts/mein_projekt_prd.txt --force
```

## Tipps für gute PRDs

1. **Sei präzise**: Je klarer und detaillierter deine Anforderungen sind, desto besser können daraus Aufgaben generiert werden
2. **Technische Details**: Gib im PRD-Teil konkrete technische Details an (Frameworks, Bibliotheken, Architektur)
3. **Abhängigkeiten**: Beschreibe logische Abhängigkeiten zwischen Komponenten, damit Task Master diese in der Task-Struktur berücksichtigen kann
4. **Phasen**: Unterteile dein Projekt in klare Phasen (MVP, Erweiterungen, Zukunft) für eine bessere Priorisierung

## Nach der PRD-Verarbeitung

Nach dem Parsen des PRDs kannst du die generierten Aufgaben anzeigen:

```typescript
mcp_task -
  master -
  ai_get_tasks({
    projectRoot: '/absoluter/pfad/zum/projekt',
  });
```

oder

```bash
task-master list
```

Verwende dann `task-master expand` oder `mcp_task-master-ai_expand_task`, um komplexe Aufgaben in detailliertere Unteraufgaben aufzuteilen.
