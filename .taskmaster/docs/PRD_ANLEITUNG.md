# Ultimative Anleitung zur Erstellung und Verwendung von PRDs mit Task Master

## Was ist ein PRD?

Ein **Product Requirements Document (PRD)** ist das Herzstück erfolgreicher Produktentwicklung. Es definiert:

- **Zweck**: Warum wird das Produkt entwickelt?
- **Funktionen**: Was kann das Produkt?
- **Verhalten**: Wie funktioniert das Produkt?
- **Erfolgskriterien**: Wann ist das Produkt erfolgreich?

In der modernen, AI-gestützten Entwicklung hat sich das PRD-Konzept weiterentwickelt. Neben dem klassischen PRD für die Team-Abstimmung gibt es nun auch das **Prompt Requirements Document
** - speziell für die effektive Zusammenarbeit zwischen Menschen und AI-Assistenten wie Task Master.

## Die zwei Arten von PRDs im Task Master Ökosystem

### 1. Klassisches PRD (Product Requirements Document)

Dient der **menschlichen Abstimmung** und dem gemeinsamen Verständnis im Team.

### 2. AI-PRD (Prompt Requirements Document)

Optimiert für die **Mensch-AI-Kollaboration** und automatische Task-Generierung.

## Optimale PRD-Struktur für Task Master

Task Master verwendet eine hybride Struktur, die beide Ansätze vereint:

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

**Wichtig**: Die Tags `<context>` und `<PRD>` sind erforderlich:

- **`<context>`**: Menschenfreundliche Projektbeschreibung (Vision, Ziele, Nutzergruppen)
- **`<PRD>`**: AI-optimierte technische Anforderungen für präzise Task-Generierung

## Die 8 Kernelemente eines erfolgreichen PRDs

### 1. Projektspezifika

- **Teilnehmer**: Product Owner, Entwickler, Designer, Stakeholder
- **Status**: On Target, At Risk, Delayed, Deferred
- **Zielrelease**: Wann soll es live gehen?
- **Budget & Ressourcen**: Verfügbare Mittel und Team-Kapazitäten

### 2. Team-Ziele und Business-Ziele

- Klare, messbare Ziele (OKRs)
- Business Value und ROI
- Erfolgsmetriken (KPIs)

### 3. Hintergrund und strategische Einordnung

- **Warum**: Die Motivation hinter dem Projekt
- **Kontext**: Wie fügt es sich in die Unternehmensstrategie ein?
- **Marktanalyse**: Wettbewerb und Marktchancen

### 4. Annahmen

- Technische Annahmen
- Business-Annahmen
- Nutzer-Annahmen
- Risiken und Unsicherheiten

### 5. User Stories

**Format**: Als [Nutzerrolle] möchte ich [Ziel], damit [Nutzen]

**Beispiel**:

```
Als Projektmanager
möchte ich automatisch Aufgaben aus meinem PRD generieren lassen,
damit ich Zeit spare und nichts vergesse.
```

### 6. User Interaction und Design

- Wireframes und Mockups
- User Flows
- Design-Systeme und UI-Komponenten
- Accessibility-Anforderungen

### 7. Offene Fragen

- Technische Klärungsbedarfe
- Business-Entscheidungen
- Forschungsbedarf

### 8. Out of Scope

- Was wird NICHT umgesetzt
- Zukünftige Features
- Bewusste Einschränkungen

## Vorlagen zur Verwendung

In diesem Projekt stehen folgende Vorlagen zur Verfügung:

1. **example_prd.txt**: Ein ausführliches Beispiel-PRD für Bluelight-Hub mit vollständig ausgearbeiteten Anforderungen
2. **prd_template.txt**: Eine leere Vorlage mit Platzhaltern für eigene PRDs

## Erstellen eines neuen PRDs

So erstellst du ein neues PRD:

1. Kopiere eine der Vorlagen (z.B. `scripts/prd_template.txt`) als Ausgangspunkt
2. Ersetze die Platzhalter durch deine eigenen Anforderungen
3. Speichere die Datei unter einem aussagekräftigen Namen, z.B. `scripts/mein_projekt_prd.txt`

## Workflow: Von der Idee zur Implementierung

### Phase 1: PRD-Erstellung

1. **Brainstorming & Research**
   - Marktanalyse durchführen
   - Nutzer-Interviews führen
   - Technische Machbarkeit prüfen

2. **PRD Draft erstellen**
   - Template verwenden
   - Alle 8 Kernelemente ausfüllen
   - Team-Review durchführen

3. **AI-Optimierung**
   - Strukturierung für Task Master
   - Prompt-Tests durchführen
   - Context-Tags hinzufügen

### Phase 2: Task-Generierung

```typescript
// 1. PRD parsen und initiale Tasks generieren
const parseResult = await mcp__task_master__parse_prd({
  projectRoot: '/path/to/project',
  input: '.taskmaster/docs/prd.txt',
  numTasks: '20', // Anzahl Top-Level Tasks
  research: true, // AI-Research aktivieren
  force: true,
});

// 2. Komplexitätsanalyse durchführen
const complexity = await mcp__task_master__analyze_project_complexity({
  projectRoot: '/path/to/project',
  threshold: 7, // Tasks ab Komplexität 7 expandieren
  research: true,
});

// 3. Komplexe Tasks automatisch expandieren
const expanded = await mcp__task_master__expand_all({
  projectRoot: '/path/to/project',
  research: true,
  prompt: 'Fokus auf minimale funktionsfähige Version mit Kernfeatures',
});
```

### Phase 3: Sprint-Planung

```typescript
// Nächste Aufgabe basierend auf Abhängigkeiten
const nextTask = await mcp__task_master__next_task({
  projectRoot: '/path/to/project',
});

// Sprint-Aufgaben priorisieren
const sprintTasks = await mcp__task_master__get_tasks({
  projectRoot: '/path/to/project',
  status: 'pending',
  withSubtasks: true,
});
```

### Phase 4: Entwicklung & Iteration

```typescript
// Task in Bearbeitung setzen
await mcp__task_master__set_task_status({
  projectRoot: '/path/to/project',
  id: '5',
  status: 'in-progress',
});

// Erkenntnisse dokumentieren
await mcp__task_master__update_subtask({
  projectRoot: '/path/to/project',
  id: '5.2',
  prompt: 'API-Endpunkt erfordert zusätzliche Validierung für Edge-Cases',
});

// Neue Tasks bei Bedarf hinzufügen
await mcp__task_master__add_task({
  projectRoot: '/path/to/project',
  prompt: 'Sicherheits-Audit für neue API-Endpunkte durchführen',
  dependencies: '5,6',
  priority: 'high',
});
```

## Der G3-Framework für AI-optimierte PRDs

### Guideline: Gemeinsames AI-Human Verständnis

- Umfassende Wissensbasis mit Projektkontext
- Technische Begründungen und Architekturentscheidungen
- Einheitliche Terminologie und Definitionen

### Guidance: Methodik zur Prompt-Evolution

- Strukturierte Herangehensweise für präzise AI-Instruktionen
- Annotierte Prompt-Beispiele
- Pattern-Bibliotheken
- Best Practices und häufige Fehler

### Guardrails: AI-unterstützte Qualitätssicherung

- Automatisierte Evaluierungsstandards
- Qualitäts-Checkpoints
- Risiko-Prävention
- Code-Review-Standards

## Best Practices für exzellente PRDs

### 1. Kundenfokus etablieren

- **Customer Interviews**: Bezieht Designer und Entwickler in Kundengespräche ein
- **Personas**: Entwickelt gemeinsam detaillierte Nutzer-Personas
- **Empathie**: Schafft ein gemeinsames Verständnis für die Zielgruppe

### 2. Kollaborative Erstellung

- **Team-Effort**: PRDs niemals alleine schreiben
- **Diverse Perspektiven**: Bezieht alle Stakeholder ein
- **Iterativ**: PRDs sind lebende Dokumente

### 3. AI-Optimierung

- **Strukturierte Daten**: Verwendet klare Hierarchien und Tags
- **Kontext-Fenster**: Beachtet AI-Limitierungen
- **Prompt-Qualität**: Testet und verfeinert AI-Instruktionen

### 4. Messbare Erfolge

- **Metriken definieren**: Jede User Story braucht Erfolgskriterien
- **A/B-Tests planen**: Hypothesen formulieren
- **Analytics einbauen**: Tracking von Anfang an mitdenken

### 5. Agilität bewahren

- **Just Enough**: Nicht über-dokumentieren
- **Flexibel**: Änderungen sind normal und erwünscht
- **Fokussiert**: Ein PRD = Eine klare Mission

## Anti-Patterns vermeiden

❌ **Vermeiden Sie**:

- Komplette Vorab-Spezifikation ohne Raum für Iteration
- Starre Sign-offs, die Änderungen blockieren
- Isolierte PRD-Erstellung ohne Team-Input
- Veraltete PRDs, die nie aktualisiert werden
- Technische Implementierungsdetails statt Nutzer-Fokus

✅ **Stattdessen**:

- Iterative Verfeinerung während der Entwicklung
- Flexible Dokumentation, die mit dem Projekt wächst
- Kollaborative Sessions mit allen Beteiligten
- Regelmäßige Reviews und Updates
- Fokus auf Nutzen und Outcomes

## PRD-Templates für verschiedene Projekttypen

### 1. SaaS-Produkt Template

```
<context>
# Vision
Eine revolutionäre Lösung für [Problem], die [Zielgruppe] hilft, [Ziel] zu erreichen.

# Zielgruppe
- Primär: [Beschreibung]
- Sekundär: [Beschreibung]

# Unique Value Proposition
[Was macht uns einzigartig?]
</context>

<PRD>
# MVP-Features (Sprint 1-2)
1. Nutzer-Authentifizierung
2. Core-Feature [X]
3. Basis-Dashboard

# Erweiterungen (Sprint 3-4)
1. Advanced Analytics
2. Team-Kollaboration
3. API-Integration

# Technischer Stack
- Frontend: [Framework]
- Backend: [Framework]
- Database: [System]
- Deployment: [Platform]
</PRD>
```

### 2. Mobile App Template

```
<context>
# App-Konzept
[Kurze Beschreibung der App-Idee]

# Plattformen
- iOS: [Version]
- Android: [Version]

# Monetarisierung
[Freemium/Subscription/Ads]
</context>

<PRD>
# Core Features
1. Onboarding Flow
2. Hauptfunktionalität
3. Push Notifications

# Platform-spezifisch
- iOS: [Features]
- Android: [Features]

# Performance-Ziele
- Launch Time: < 2s
- Offline-Funktionalität
- Battery-Optimierung
</PRD>
```

### 3. AI-Feature Template

```
<context>
# AI-Anwendungsfall
[Welches Problem löst die AI?]

# Datenquellen
[Woher kommen die Trainingsdaten?]

# Ethische Überlegungen
[Bias, Privacy, Transparency]
</context>

<PRD>
# Model Requirements
- Accuracy Target: [%]
- Latency: < [ms]
- Model Type: [LLM/CV/NLP]

# Integration
1. API-Design
2. Fallback-Mechanismen
3. Monitoring & Logging

# Guardrails
- Input Validation
- Output Filtering
- Rate Limiting
</PRD>
```

## Metriken für PRD-Erfolg

### Quantitative Metriken

- **Task-Generierungs-Rate**: Wie viele sinnvolle Tasks wurden generiert?
- **Abhängigkeits-Korrektheit**: Sind die Dependencies logisch?
- **Sprint-Velocity**: Wie viele Tasks werden pro Sprint completed?
- **Änderungsrate**: Wie oft muss das PRD angepasst werden?

### Qualitative Metriken

- **Team-Verständnis**: Versteht jeder die Vision?
- **AI-Effektivität**: Wie gut sind die generierten Tasks?
- **Stakeholder-Zufriedenheit**: Erfüllt das Produkt Erwartungen?
- **Entwickler-Experience**: Ist die Arbeit mit dem PRD angenehm?

## PRD-Review-Checkliste

- [ ] **Vollständigkeit**: Alle 8 Kernelemente vorhanden?
- [ ] **Klarheit**: Verständlich für alle Stakeholder?
- [ ] **Messbarkeit**: Erfolg klar definiert?
- [ ] **Machbarkeit**: Technisch und zeitlich realistisch?
- [ ] **AI-Optimierung**: Strukturiert für Task Master?
- [ ] **Priorisierung**: MVP klar von Nice-to-have getrennt?
- [ ] **Risiken**: Alle kritischen Risiken identifiziert?
- [ ] **Dependencies**: Abhängigkeiten logisch und vollständig?

## Weiterführende Ressourcen

1. **Beispiel-PRDs im Projekt**:
   - `example_prd.txt`: Vollständiges Bluelight-Hub PRD
   - `prd_template.txt`: Basis-Template zum Starten

2. **Task Master Dokumentation**:
   - [Initialisierung](https://taskmaster.ai/docs/init)
   - [PRD Parsing](https://taskmaster.ai/docs/parse-prd)
   - [Task Management](https://taskmaster.ai/docs/tasks)

3. **Best Practice Guides**:
   - [Agile PRDs bei Atlassian](https://www.atlassian.com/agile/product-management/requirements)
   - [AI-Driven Development](https://medium.com/@takafumiando/prompt-requirements-document)

## Zusammenfassung

Ein gut strukturiertes PRD ist der Schlüssel zu erfolgreicher Produktentwicklung - besonders im Zeitalter der AI-Kollaboration. Mit Task Master können Sie:

1. **Zeit sparen**: Automatische Task-Generierung statt manueller Planung
2. **Qualität steigern**: AI-unterstützte Vollständigkeitsprüfung
3. **Agilität leben**: Iterative Verfeinerung während der Entwicklung
4. **Team-Alignment**: Gemeinsames Verständnis von Mensch und AI

Denken Sie daran: Das beste PRD ist eines, das genutzt und kontinuierlich verbessert wird!
