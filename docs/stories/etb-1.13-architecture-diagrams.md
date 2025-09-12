# Story: ETB Architecture Diagrams & Data Flow Documentation

## Story ID
etb-1.13

## Titel
Architektur-Diagramme und Datenfluss-Dokumentation für ETB

## Beschreibung
Als **Entwickler** möchte ich klare Architektur-Diagramme und Datenfluss-Dokumentation haben, damit AI Agents und neue Teammitglieder das System schnell verstehen und korrekt implementieren können.

## Akzeptanzkriterien
- [ ] C4-Model Diagramme (Context, Container, Component) erstellt
- [ ] Datenfluss-Diagramm für ETB-Einträge (Create, Update, Lock)
- [ ] Sequenz-Diagramm für Multi-User-Synchronisation
- [ ] State-Machine-Diagramm für ETB-Status-Übergänge
- [ ] API-Flow-Diagramm für Frontend-Backend-Kommunikation
- [ ] Mermaid-Diagramme in Markdown eingebettet

## Technical Implementation

### 1. System Context Diagram (C4 Level 1)
```mermaid
graph TB
    subgraph "BlueLight Hub System"
        BLH[BlueLight Hub]
    end
    
    EL[Einsatzleiter]
    GF[Gruppenführer]
    FK[FüKW Personal]
    LS[Leitstelle]
    
    EL -->|Erstellt/Bearbeitet ETB| BLH
    GF -->|Fügt Einträge hinzu| BLH
    FK -->|Vollzugriff| BLH
    LS -->|Lesezugriff| BLH
    
    BLH -->|Export| PDF[PDF Reports]
    BLH -->|Sync| OFFLINE[Offline Storage]
```

### 2. Container Diagram (C4 Level 2)
```mermaid
graph TB
    subgraph "Frontend [Tauri Desktop App]"
        UI[React UI]
        STORE[TanStack Store]
        QUERY[TanStack Query]
    end
    
    subgraph "Backend [NestJS]"
        API[REST API]
        AUTH[Auth Module]
        ETB[ETB Module]
        AUDIT[Audit Module]
    end
    
    subgraph "Database"
        PG[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end
    
    UI --> QUERY
    QUERY -->|Generated API Client| API
    API --> AUTH
    API --> ETB
    ETB --> AUDIT
    ETB --> PG
    AUDIT --> PG
    AUTH --> REDIS
```

### 3. ETB Data Flow Diagram
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant V as Validator
    participant D as Database
    participant W as WebSocket
    
    U->>F: Erstellt ETB-Eintrag
    F->>F: Local Validation (Zod)
    F->>A: POST /api/etb/eintraege
    A->>V: DSGVO Validation
    A->>V: Permission Check
    A->>D: Save Entry
    D-->>A: Entry Created
    A->>W: Broadcast Update
    W-->>F: Real-time Update
    F->>F: Update Cache (TanStack Query)
    F-->>U: Eintrag angezeigt
```

### 4. ETB Status State Machine
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Einsatz erstellt
    DRAFT --> ACTIVE: Einsatz beginnt
    ACTIVE --> ACTIVE: Einträge hinzufügen/bearbeiten
    ACTIVE --> LOCKED: Einsatz beendet
    LOCKED --> [*]: Archiviert
    
    note right of DRAFT
        - Vorbereitung
        - Einträge editierbar
        - Kein Audit-Log
    end note
    
    note right of ACTIVE
        - Einsatz läuft
        - Alle Änderungen geloggt
        - Multi-User-Sync aktiv
    end note
    
    note right of LOCKED
        - Unveränderbar
        - Nur Export möglich
        - 10 Jahre Aufbewahrung
    end note
```

### 5. Component Interaction (ETB Module)
```mermaid
graph LR
    subgraph "ETB Module Components"
        CTRL[ETB Controller]
        SVC[ETB Service]
        VAL[DSGVO Validator]
        HIST[History Service]
        SYNC[Sync Service]
        EXP[Export Service]
    end
    
    CTRL --> SVC
    SVC --> VAL
    SVC --> HIST
    SVC --> SYNC
    CTRL --> EXP
    
    SVC -->|Prisma| DB[(Database)]
    SYNC -->|WebSocket| WS[Clients]
    EXP -->|PDF/CSV| FILES[File System]
```

## File Locations
```text
docs/
├── architecture/
│   ├── diagrams/
│   │   ├── etb-c4-context.md
│   │   ├── etb-c4-container.md
│   │   ├── etb-data-flow.md
│   │   ├── etb-state-machine.md
│   │   └── etb-components.md
│   └── 08-concepts.adoc  # Integration der Diagramme
```

## Dependencies
- Mermaid.js für Diagramm-Rendering
- arc42 Template-Integration

## Aufwandsschätzung
- Diagramm-Erstellung: 5 Story Points
- Integration in Docs: 2 Story Points

## Testing
- Validierung der Diagramme gegen Code-Realität
- Review durch Tech Lead