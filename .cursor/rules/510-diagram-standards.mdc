---
description: ENFORCE standardized diagram usage across documentation
globs: 
alwaysApply: false
---
# Diagramm Standards

Bei der Erstellung von Diagrammen in der Dokumentation sind folgende Richtlinien zu beachten:

## Unterstützte Diagrammtypen

Folgende Diagrammtypen werden unterstützt:

1. **Mermaid** - für einfache, webbasierte Diagramme
2. **PlantUML** - für komplexere UML Diagramme
3. **BPMN** - für Geschäftsprozessmodellierung
4. **DBML** - für Datenbankmodellierung

## Allgemeine Richtlinien

1. Diagramme müssen in AsciiDoc als entsprechende Blöcke eingebettet werden:
   ```asciidoc
   [mermaid]
   ....
   // Mermaid-Diagramm-Code hier
   ....
   
   [plantuml]
   ....
   // PlantUML-Diagramm-Code hier
   ....
   
   [bpmn]
   ....
   // BPMN-Diagramm-Code hier
   ....
   
   [dbml]
   ....
   // DBML-Diagramm-Code hier
   ....
   ```

2. Jedes Diagramm sollte einen beschreibenden Text (vor oder nach dem Diagramm) haben
3. Komplexe Diagramme sollten in mehrere einfachere Diagramme aufgeteilt werden
4. Konsistente Farbcodierung und Stile über alle Diagramme hinweg verwenden

## Farbcodierung und Styling

Verwende für Konsistenz folgende Farben und Stile für verschiedene Komponententypen:

[mermaid]
....
flowchart LR
    Frontend[Frontend]:::frontend
    Backend[Backend]:::backend
    DB[(Datenbank)]:::database
    External[Externes System]:::external
    User([Benutzer]):::user
    
    classDef frontend fill:#42A5F5,stroke:#1976D2,color:white
    classDef backend fill:#5C6BC0,stroke:#3949AB,color:white
    classDef database fill:#9C27B0,stroke:#7B1FA2,color:white
    classDef external fill:#FF9800,stroke:#F57C00,color:white
    classDef user fill:#4CAF50,stroke:#388E3C,color:white
....

- Frontend-Komponenten: Blau (fill:#42A5F5, stroke:#1976D2)
- Backend-Komponenten: Indigo (fill:#5C6BC0, stroke:#3949AB)
- Datenbanken: Lila (fill:#9C27B0, stroke:#7B1FA2)
- Externe Systeme: Orange (fill:#FF9800, stroke:#F57C00)
- Benutzer/Akteure: Grün (fill:#4CAF50, stroke:#388E3C)

## Mermaid Diagramme

### Kontextdiagramme (flowchart)

[mermaid]
....
flowchart TB
    User([Benutzer]):::user
    System[[System]]:::system
    External[Externes System]:::external
    
    User -->|nutzt| System
    System -->|kommuniziert mit| External
    
    classDef user fill:#4CAF50,stroke:#388E3C,color:white
    classDef system fill:#5C6BC0,stroke:#3949AB,color:white
    classDef external fill:#FF9800,stroke:#F57C00,color:white
....

- Verwende `flowchart` für Kontextdiagramme
- Richte Diagramme von oben nach unten (`TB`) oder von links nach rechts (`LR`) aus
- Nutze einheitliche Formen für Systemtypen
- Beschreibe Verbindungen mit klaren Beschriftungen

### Bausteindiagramme (flowchart mit Subgraphen)

[mermaid]
....
flowchart TB
    subgraph System
        Frontend[Frontend]:::frontend
        Backend[Backend]:::backend
        DB[(Datenbank)]:::database
    end
    
    External[Externes System]:::external
    
    Frontend <-->|API| Backend
    Backend <-->|Query| DB
    Backend <-->|Integration| External
    
    classDef frontend fill:#42A5F5,stroke:#1976D2,color:white
    classDef backend fill:#5C6BC0,stroke:#3949AB,color:white
    classDef database fill:#9C27B0,stroke:#7B1FA2,color:white
    classDef external fill:#FF9800,stroke:#F57C00,color:white
....

- Nutze `subgraph` für Systemgrenzen und Komponenten
- Zeige klare Hierarchien und Beziehungen
- Verwende bidirektionale Pfeile (`<-->`) für Kommunikation in beide Richtungen

### Sequenzdiagramme

[mermaid]
....
sequenceDiagram
    participant User as Benutzer
    participant UI as Frontend
    participant API as Backend-API
    participant DB as Datenbank
    
    User->>UI: Aktion ausführen
    UI->>API: API-Anfrage senden
    API->>DB: Daten abfragen
    DB-->>API: Ergebnis zurückgeben
    API-->>UI: Antwort zurückgeben
    UI-->>User: Ergebnis anzeigen
....

- Nutze aussagekräftige Bezeichner für Teilnehmer
- Verwende `->>` für Anfragen und `-->>` für Antworten
- Füge `Note over` für Erklärungen hinzu
- Gruppiere zusammengehörige Aktionen mit `loop`, `alt`, `opt` wenn sinnvoll

### Zustandsdiagramme

[mermaid]
....
stateDiagram-v2
    [*] --> Entwurf
    Entwurf --> Prüfung: Einreichen
    Prüfung --> Entwurf: Ablehnen
    Prüfung --> Genehmigt: Genehmigen
    Genehmigt --> Implementiert: Implementieren
    Implementiert --> [*]
....

- Verwende Zustandsdiagramme für Lebenszyklen und Workflows
- Beschrifte Übergänge mit aussagekräftigen Aktionen
- Nutze Start- und Endzustände (`[*]`)

### ER-Diagramme

[mermaid]
....
erDiagram
    User ||--o{ Order : places
    Order ||--|{ OrderItem : contains
    Product ||--o{ OrderItem : "ordered in"
....

- Verwende ER-Diagramme für Datenmodelle
- Zeige Kardinalitäten korrekt an
- Beschrifte Beziehungen

## PlantUML Diagramme

PlantUML eignet sich besonders gut für komplexere UML-Diagramme wie:

- Detaillierte Klassendiagramme
- Komponentendiagramme
- Verteilungsdiagramme (Deployment)
- Anwendungsfalldiagramme (Use Cases)

[plantuml]
....
@startuml
package "Frontend" {
  [UI Components] as UI
  [State Management] as State
}

package "Backend" {
  [API Gateway] as API
  [Service Layer] as Service
  [Data Access] as DAO
}

database "Database" as DB

UI --> State
State --> API
API --> Service
Service --> DAO
DAO --> DB
@enduml
....

## BPMN Diagramme

BPMN (Business Process Model and Notation) eignet sich für die Modellierung von Geschäftsprozessen.

[bpmn]
....
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Prozess starten">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Aufgabe ausführen">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Prozess beenden">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>
....

## DBML Diagramme

DBML (Database Markup Language) eignet sich für das Modellieren von Datenbankschemas.

[dbml]
....
Table users {
  id integer [primary key]
  username varchar
  email varchar
  created_at timestamp
}

Table posts {
  id integer [primary key]
  title varchar
  body text
  user_id integer
  created_at timestamp
}

Ref: posts.user_id > users.id
....

## Komplexitätsmanagement

1. Teile komplexe Diagramme in mehrere Ebenen auf (Übersicht und Details)
2. Fokussiere auf relevante Aspekte, vermeide Überfrachtung
3. Nutze gemeinsame Stile und Konventionen für zusammengehörige Diagramme
4. Verwende für besonders komplexe Diagramme externe Tools und binde sie als Bilder ein

## Integration in die Dokumentation

1. Diagramme sollten die textuelle Beschreibung ergänzen, nicht ersetzen
2. Jedes Diagramm sollte einen eindeutigen Fokus haben
3. Verweise im Text auf relevante Diagramme
4. Verwende konsistente Terminologie zwischen Text und Diagrammen

## Wahl des Diagrammtyps

- **Mermaid** - für einfache, webbasierte Diagramme und schnelle Visualisierungen
- **PlantUML** - für umfassendere UML-konforme Diagramme und tiefergehende technische Darstellungen
- **BPMN** - für detaillierte Geschäftsprozessvisualisierungen
- **DBML** - für präzise Datenbankmodellierung

## Wartung und Aktualisierung

1. Diagramme müssen bei Architekturänderungen aktualisiert werden
2. Veraltete Diagramme sollten entfernt oder klar als "veraltet" markiert werden
3. Halte Stile und Konventionen über Aktualisierungen hinweg konsistent 