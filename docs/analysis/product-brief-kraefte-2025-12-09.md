---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - docs/project-overview/executive-summary.md
  - docs/project-overview/core-features.md
  - docs/project-overview/index.md
workflowType: 'product-brief'
lastStep: 5
project_name: 'Bluelight Hub - Kräfte-Management'
feature_name: 'Kräfte'
github_issue: 49
user_name: 'Ruben'
date: '2025-12-09'
---

# Product Brief: Bluelight Hub - Kräfte-Management

**Date:** 2025-12-09
**Author:** Ruben
**GitHub Issue:** #49

---

## Executive Summary

Das Kräfte-Management erweitert Bluelight Hub um die zentrale Verwaltung aller im Einsatz eingesetzten Ressourcen: Fahrzeuge, Personen und Rollen. Es ersetzt eine veraltete Windows-Anwendung durch eine moderne, übersichtliche Lösung, die dem Einsatzleiter mit wenigen Klicks einen vollständigen Überblick über eingesetzte Kräfte, deren Zuordnungen und die taktische Stärke bietet.

Das Feature integriert sich nahtlos in bestehende Module: Statusänderungen erzeugen automatische ETB-Einträge, Kräfte werden auf der Lagekarte visualisiert - alles konsequent einsatzbezogen.

---

## Core Vision

### Problem Statement

Einsatzleiter im DRK benötigen während eines Einsatzes einen schnellen, zuverlässigen Überblick über alle eingesetzten Kräfte. Die aktuell verwendete Software ist eine veraltete Windows-Anwendung mit unübersichtlicher Benutzeroberfläche, die zu viele Klicks für einfache Aufgaben erfordert und keine Automatisierung bietet.

### Problem Impact

- **Zeitverlust:** Jeder zusätzliche Klick kostet wertvolle Zeit im Einsatz
- **Fehleranfälligkeit:** Manuelle Prozesse ohne Automatisierung führen zu Inkonsistenzen
- **Informationslücken:** Keine integrierte Sicht auf Fahrzeuge, Personen, Rollen und Stärke
- **Medienbrüche:** ETB-Einträge und Lagekarte-Updates müssen separat gepflegt werden

### Why Existing Solutions Fall Short

Die bestehende Software leidet unter:
- Fragmentierter Datenhaltung ohne echte Integration
- Veralteter Technologie ohne moderne UX-Patterns
- Fehlender Automatisierung (z.B. keine Auto-ETB-Einträge bei Statuswechsel)
- Komplizierter Erfassung statt schneller Workflows

### Proposed Solution

Ein integriertes Kräfte-Management-Modul mit drei Kern-Entitäten:

1. **Fahrzeuge** - mit OPTA, Typ (RTW, NEF, KTW...), Funkrufname, konfigurierbaren Status (1-0)
2. **Personen** - mit Qualifikationen (ZF, GF, Helfer, Arzt), Fahrzeug-Zuordnung
3. **Rollen** - als besetzbare "Slots" mit eigenem Funkrufname (LvD, Orgl, GF Sanität...)

**Zentrale Features:**
- **Schnellerfassung:** Fahrzeuge temporär oder aus Stammdaten hinzufügen
- **Automatische ETB-Integration:** Statuswechsel und Einsatz-Zuordnungen erzeugen ETB-Einträge
- **Taktische Stärke:** Automatische Berechnung im Format ZF+Ärzte/GF/Helfer//Gesamt
- **Lagekarte-Sync:** Kräfte-Positionen visualisiert (initial ohne GPS)
- **Konfigurierbare Status:** Funkstatus 1-0 über Admin-Panel anpassbar

### Key Differentiators

| Aspekt | Alte Software | Bluelight Hub |
|--------|---------------|---------------|
| **UI** | Veraltete Windows-Oberfläche | Moderne, übersichtliche Web-UI |
| **Workflow** | Viele Klicks, Formular-Marathon | Schnellerfassung, minimale Klicks |
| **Integration** | Isolierte Datenhaltung | ETB + Lagekarte automatisch verknüpft |
| **Flexibilität** | Starr | Temporär/Vordefiniert, konfigurierbare Status |
| **Automatisierung** | Keine | Auto-ETB, Stärke-Berechnung |

---

## Target Users

### Primary Users

#### 1. FüKw Personal - "Der Bearbeiter"

**Persona: Sandra, Führungsassistentin Personal**

- **Rolle:** Sitzt auf dem Führungskraftwagen (FüKw), zuständig für die Kräfteübersicht
- **Kontext:** Arbeitet im Einsatzgeschehen, muss schnell und präzise erfassen
- **Ziel:** Alle eintreffenden Fahrzeuge und Personen erfassen, Status aktuell halten

**Typischer Workflow:**
1. Einsatz beginnt → FüKw fährt raus
2. Fahrzeuge treffen ein → Sandra erfasst sie sofort
3. Statusmeldungen kommen über Funk → Sandra aktualisiert
4. EL fragt nach Stärke → Sandra liefert auf Knopfdruck

**Pain Points:**
- Muss unter Zeitdruck viele Eingaben machen
- Jeder zusätzliche Klick nervt, wenn gleichzeitig Funk läuft
- Braucht schnelle Erfassung, keine Formular-Marathons

**Success:** "Fahrzeug angekommen, drei Klicks, fertig. Status geändert, ein Klick, ETB-Eintrag automatisch."

---

#### 2. Einsatzleiter / Gruppenführer / Zugführer - "Die Überblicker"

**Persona: Thomas, Einsatzleiter**

- **Rolle:** Führt den Einsatz (oder Abschnitt), trifft taktische Entscheidungen
- **Kontext:** Braucht Überblick, hat keine Zeit für Detailpflege
- **Ziel:** Jederzeit wissen: Wie viele Kräfte, welche Fahrzeuge, welche Rollen besetzt?

**Gilt analog für:** Gruppenführer (GF), Zugführer (ZF) - alle brauchen Überblick über ihre Einheiten

**Typischer Workflow:**
1. Schaut mehrfach während des Einsatzes rein
2. Braucht Stärke auf einen Blick (3/4/24//31)
3. Will sehen: Welche Rollen sind besetzt, welche offen?
4. Könnte auch bearbeiten, tut es aber selten

**Pain Points:**
- Will keine Zeit mit der UI verbringen
- Muss schnell Entscheidungen treffen, braucht sofort Infos

**Success:** "Ich öffne die Kräfte-Übersicht und sehe in 2 Sekunden alles, was ich wissen muss."

---

### Secondary Users

#### Admin - "Der Stammdaten-Pfleger"

- **Rolle:** Pflegt Fahrzeuge, Personen, Qualifikationen im Admin-Portal
- **Kontext:** Arbeitet außerhalb des Einsatzgeschehens, bereitet vor
- **Ziel:** Saubere Stammdaten, damit im Einsatz alles reibungslos läuft
- **Berechtigungen:** Nach bestehendem Rechtekonzept

---

### User Journey (Einsatz-Fokus)

| Phase | FüKw Personal (Sandra) | EL/GF/ZF (Thomas) |
|-------|------------------------|-------------------|
| **Einsatzbeginn** | Öffnet Kräfte-Modul, bereit zur Erfassung | Kurzer Blick auf Übersicht |
| **Kräfte treffen ein** | Schnellerfassung: Fahrzeug + Besatzung | - |
| **Laufender Einsatz** | Status-Updates, Zuordnungen | Regelmäßiger Check: Stärke, Rollen |
| **Statusmeldung Funk** | Ein-Klick-Update → Auto-ETB | Sieht aktuellen Stand |
| **Einsatzende** | Letzte Updates | Gesamtübersicht für Abschluss |

---

## Success Metrics

### User Success

| Nutzer | Erfolgskriterium | Ziel |
|--------|------------------|------|
| **FüKw Personal** | Fahrzeug hinzufügen | Minimale Klicks, unter 5s |
| **FüKw Personal** | Status-Update | 1-2 Klicks, Auto-ETB |
| **FüKw Personal** | Gesamteindruck | "Das macht Spaß" |
| **EL/GF/ZF** | Stärke ablesen | < 2 Sekunden |
| **EL/GF/ZF** | Überblick Dashboard | Alles Wichtige auf einen Blick |

### UX-Qualitätsziele

- **Effizienz:** Weniger Klicks als alte Software für gleiche Aufgaben
- **Übersichtlichkeit:** Gut aufbereitete Dashboards statt Datenflut
- **Dual-Mode UI:** FullScreen für Monitor-Ansicht + Kompakt für Bearbeitung
- **Freude:** Moderne UI, die Spaß macht statt frustriert

### Dashboard-Konzept

- **Einsatz-Dashboard:** Alle Infos zum Einsatz zentral
- **Kräfte-Dashboard:** Fokus auf Kräfte-Übersicht, Stärke, Rollen
- **FullScreen-Modus:** Optimiert für Monitore (Lesen/Präsentation)
- **Bearbeitungs-Modus:** Effizient für Sandra (kompakte Erfassung)

### Feature-Completeness (Alpha)

Kernfunktionen für erfolgreichen Alpha-Test:
- [ ] Fahrzeuge erfassen (temporär + aus Stammdaten)
- [ ] Personen zuordnen
- [ ] Rollen verwalten
- [ ] Status-Updates mit Auto-ETB
- [ ] Taktische Stärke berechnen
- [ ] Kräfte-Dashboard
- [ ] Lagekarte-Integration (basic)

### Business Objectives

*Noch nicht relevant in Alpha-Phase. Wird definiert, wenn Vertrieb/Adoption gemessen werden kann.*

---

## MVP Scope

### Core Features (MVP)

#### Entitäten

| Entität | Attribute | Beschreibung |
|---------|-----------|--------------|
| **Fahrzeug** | OPTA, Typ, Funkrufname, Status | Einsatzfahrzeug mit konfigurierbarem Status (1-0) |
| **Person** | Name, Qualifikation(en), Fahrzeug-Zuordnung | Einsatzkraft mit Qualifikationen |
| **Rolle** | Name, Funkrufname, Person (optional) | Besetzbare Slots wie LvD, Orgl, GF Sanität |

#### Kernfunktionen

- **Schnellerfassung Fahrzeuge:** Temporär anlegen oder aus Stammdaten auswählen
- **Personen-Zuordnung:** Personen Fahrzeugen zuordnen
- **Rollen-Management:** Rollen als Slots definieren, mit Personen besetzen
- **Status-Updates:** Funkstatus 1-0 mit automatischem ETB-Eintrag
- **Taktische Stärke:** Automatische Berechnung (ZF+Ärzte/GF/Helfer//Gesamt)
- **Kräfte-Dashboard:** Übersicht mit FullScreen-Modus
- **Lagekarte-Integration:** Kräfte als POIs anzeigen (ohne GPS)

#### Admin-Bereich

- Stammdaten-Verwaltung: Fahrzeuge, Personen, Qualifikationen
- Status-Konfiguration: Funkstatus 1-0 definieren

---

### Out of Scope (MVP)

| Feature | Grund | Zeitpunkt |
|---------|-------|-----------|
| **GPS-Tracking** | Komplexität, Hardware-Abhängigkeit | Später, wenn Bedarf validiert |
| **Einsatzabschnitte** | Separates Feature (eigenes GH Issue) | Nach MVP |
| **Automatische Alarmierung** | Hohe Komplexität, Integration mit Leitstelle | Langfristig |
| **HR-System-Integration** | Zu früh, kein konkreter Bedarf | Bei Enterprise-Kunden |
| **Dienstplan-Integration** | Zu früh, kein konkreter Bedarf | Bei Enterprise-Kunden |
| **Skill-based Matching** | Nice-to-have, nicht essentiell | Nach MVP |
| **Mobile Status-Updates** | Erst wenn Mobile App existiert | Nach Desktop-App |

---

### MVP Success Criteria

Das MVP gilt als erfolgreich, wenn:

1. **Funktional:** Alle Core Features funktionieren zuverlässig
2. **Usability:** FüKw Personal kann Fahrzeuge in <5s erfassen
3. **Performance:** Dashboard lädt Stärke in <2s
4. **Integration:** ETB-Einträge werden automatisch bei Statuswechsel erstellt
5. **Akzeptanz:** Testnutzer bevorzugen es gegenüber alter Software

---

### Future Vision

Nach erfolgreichem MVP:

**Kurzfristig (nach Alpha):**
- Einsatzabschnitte mit Zuordnung von Kräften
- Erweiterte Filter und Sortierung im Dashboard
- Export-Funktionen (PDF, Excel)

**Mittelfristig:**
- GPS-Tracking für Fahrzeuge (optional aktivierbar)
- Mobile App für Status-Updates
- Vorlagen für typische Einsatzszenarien

**Langfristig:**
- Automatische Alarmierung / Skill-based Matching
- HR-/Dienstplan-Integration
- KI-gestützte Empfehlungen für Kräfte-Disposition

---

<!-- Content will be appended sequentially through collaborative workflow steps -->
