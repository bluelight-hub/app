---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - docs/prd.md
  - docs/analysis/product-brief-kraefte-2025-12-09.md
  - docs/analysis/research/domain-kraefte-management-research-2025-12-09.md
workflowType: 'ux-design'
lastStep: 14
completedAt: '2025-12-09'
project_name: 'Bluelight Hub - Kräfte-Management'
user_name: 'Ruben'
date: '2025-12-09'
---

# UX Design Specification Bluelight Hub

**Author:** Ruben
**Date:** 2025-12-09

---

## Executive Summary

### Project Vision

Das Kräfte-Management-Modul ersetzt eine veraltete, klickreiche Windows-Anwendung durch ein modernes System, das den Workflow von Einsatzkräften respektiert. Im Kern geht es um **Zeitersparnis unter Druck**: Fahrzeuge in unter 5 Sekunden erfassen, Status mit einem Klick aktualisieren, und automatische ETB-Dokumentation, die mitdenkt.

Das System bedient zwei fundamental unterschiedliche Nutzungskontexte:
- **Bearbeitungsmodus:** Für FüKw-Personal unter Zeitdruck – schnelle Eingabe, minimale Klicks
- **Übersichtsmodus:** Für Einsatzleiter auf Distanz – große Zahlen, klare Struktur, keine Eingabe nötig

### Target Users

#### Primär: FüKw Personal (Sandra)
- **Kontext:** Sitzt auf dem Führungskraftwagen während des Einsatzes, arbeitet am Desktop/Laptop
- **Emotionaler Zustand:** Unter Druck, multitasking zwischen Funk und Erfassung
- **Kernbedürfnis:** Schnelligkeit und Effizienz – kompakte UI, Keyboard-Shortcuts
- **Erfolgserlebnis:** "Fahrzeug angekommen, drei Klicks, fertig. ETB-Eintrag automatisch."

#### Primär: Einsatzleiter/GF/ZF (Thomas)
- **Kontext:** Steht am Lagezelt, schaut auf Monitor auf Distanz
- **Emotionaler Zustand:** Braucht Kontrolle und Überblick
- **Kernbedürfnis:** Information auf einen Blick – keine Zeit für Suchen
- **Erfolgserlebnis:** "Ich öffne das Dashboard und weiß in 2 Sekunden, wie wir aufgestellt sind."

#### Sekundär: Admin (Maria)
- **Kontext:** Arbeitet außerhalb des Einsatzes, pflegt Stammdaten
- **Emotionaler Zustand:** Methodisch, sorgfältig
- **Kernbedürfnis:** Saubere Daten, damit im Einsatz alles reibungslos läuft

### Key Design Challenges

1. **Dual-Mode Interface:** Zwei gegensätzliche Nutzungskontexte (Bearbeitung vs. Übersicht) in einer kohärenten UI vereinen, ohne Komplexität zu erhöhen.

2. **Stress-Resilient Design:** Die UI muss unter hoher kognitiver Belastung fehlerfrei bedienbar sein – klare Feedback-Loops, keine Verwechslungsgefahr.

3. **Regionale Konfigurierbarkeit:** Funkstatus 7-9 variieren je nach Leitstellen-Bereich – die Admin-Oberfläche muss Konfiguration ermöglichen ohne zu überfrachten.

### Design Opportunities

1. **Magische Momente:** QR-Code-Scan zeigt sofort den Helfer mit allen Qualifikationen – das Gefühl "Das System denkt mit mir".

2. **Visuelles Storytelling:** Taktische Stärke als auf 3 Metern lesbare, farbcodierte Visualisierung statt nur Zahlen.

3. **Progressive Disclosure:** Anfänger sehen das Nötigste, Power-User entdecken Shortcuts, Admin-Bereich ist elegant versteckt.

## Core User Experience

### Defining Experience

Das Kräfte-Management lebt von zwei parallelen Erfahrungen, die ineinander greifen:

**Bearbeitungs-Experience (Sandra am Desktop):**
- Kernschleife: Funk meldet → Klick/Shortcut → Erfasst → Weiter
- Jede Aktion unter 2 Klicks
- Desktop-optimiert: Kompakte UI, Keyboard-Shortcuts, Hover-Actions
- Fehlerresistent unter Stress

**Übersichts-Experience (Thomas am Monitor):**
- Kernschleife: Öffnen → Schauen → Wissen
- Keine Interaktion nötig für Informationsgewinn
- Auf 3 Metern Entfernung lesbar (FullScreen-Modus)
- Sofortige Antwort auf "Wie ist unsere Stärke?"

### Platform Strategy

| Aspekt | Strategie |
|--------|-----------|
| **Primary Platform** | Tauri Desktop App (Windows, macOS) |
| **Secondary Platform** | Web-Interface (gleiche React-Codebase) |
| **Input-Methoden** | Maus/Tastatur (primär), Touch (sekundär für QR-Scan) |
| **Offline-Fähigkeit** | TanStack Query Caching, Optimistic Updates, Auto-Sync bei Reconnect |
| **Native Features** | QR-Code-Scanner via Kamera, System Tray für Benachrichtigungen |

**Desktop-First Design:** Sandra arbeitet am Rechner im FüKw. Die UI ist für Maus und Keyboard optimiert – kompakte Elemente, Hover-States, Keyboard-Shortcuts für Power-User. FullScreen-Modus mit großen Elementen nur für Thomas' Übersichts-Bedarf.

### Effortless Interactions

| Aktion | Ziel | Umsetzung |
|--------|------|-----------|
| **Status-Update** | 1 Klick | Inline-Status-Dropdown oder Keyboard-Shortcut |
| **Fahrzeug erfassen** | 3 Klicks | Command Palette oder Autosuggest-Dropdown |
| **QR-Code scannen** | Scan → Fertig | Automatisches Matching gegen Datenbank, sofortiges Feedback |
| **Stärke ablesen** | 0 Klicks | Permanent sichtbar im Dashboard-Header |
| **ETB-Dokumentation** | 0 Klicks | Vollautomatisch bei jeder Statusänderung |

### Critical Success Moments

1. **Der Magie-Moment:** QR-Code-Scan zeigt sofort den vollständigen Helfer-Datensatz – "Das System kennt mich"
2. **Der Vertrauens-Moment:** Stärke-Abfrage über Funk wird in 2 Sekunden beantwortet – "Ich kann mich darauf verlassen"
3. **Der Entlastungs-Moment:** ETB-Eintrag erscheint automatisch nach Status-Update – "Ich muss nicht mehr doppelt arbeiten"
4. **Der Klarheits-Moment:** FullScreen-Dashboard zeigt alles Wichtige auf einen Blick – "Ich weiß sofort, woran wir sind"

### Experience Principles

1. **Minimal-Click Actions:** Häufige Aktionen sind mit maximal einem Klick oder Keyboard-Shortcut erreichbar.

2. **Glanceable Information:** Kritische Informationen (Stärke, Status) sind im FullScreen-Modus auf 3 Meter Entfernung lesbar.

3. **Invisible Automation:** ETB-Einträge entstehen automatisch ohne sichtbare UI-Elemente – das System dokumentiert im Hintergrund.

4. **Desktop-Efficient Design:** Kompakte UI für Sandra, Keyboard-Shortcuts für Power-User, Hover-States für Quick-Actions.

5. **Progressive Density:** Zwei Modi mit unterschiedlicher Informationsdichte – Kompakt für Bearbeitung, FullScreen für Überblick.

## Desired Emotional Response

### Primary Emotional Goals

**Sandra (FüKw Personal):**
- **Entlastung:** Das System nimmt Arbeit ab, statt sie zu verursachen
- **Freude:** "Das macht Spaß" – nicht nur funktional, sondern angenehm
- **Mühelosigkeit:** Aktionen fühlen sich leicht an, kein Kampf mit der Software

**Thomas (Einsatzleiter):**
- **Kontrolle:** Jederzeit den Überblick haben, ohne suchen zu müssen
- **Vertrauen:** Sich auf die angezeigten Daten verlassen können
- **Klarheit:** Sofortige Antworten auf taktische Fragen

**Maria (Admin):**
- **Zufriedenheit:** Saubere, gepflegte Daten für den Ernstfall
- **Effizienz:** Stammdaten schnell und zuverlässig pflegen

### Emotional Journey Mapping

| Phase | Ziel-Emotion | Design-Implikation |
|-------|--------------|-------------------|
| **Einsatzbeginn** | Bereitschaft | Schneller App-Start, klare Startansicht |
| **Erste Erfassung** | Leichtigkeit | Minimal-Klick-Workflow, Smart-Defaults |
| **QR-Code Scan** | Magie & Überraschung | Sofortige Erkennung mit Erfolgsfeedback |
| **Status-Updates** | Mühelosigkeit | Inline-Edit, Keyboard-Shortcuts, Auto-ETB |
| **Stärke-Abfrage** | Klarheit | Große, lesbare Anzeige im Header |
| **Fehlerfall** | Vergebung | Sanfte Fehlermeldungen, Undo-Option |
| **Einsatzende** | Stolz & Erleichterung | Zusammenfassung, alles dokumentiert |

### Micro-Emotions

**Anzustreben:**
- **Gewissheit:** Visuelles Feedback bei jeder Aktion bestätigt Erfolg
- **Verlässlichkeit:** Offline-Indikatoren, Auto-Sync-Status zeigen Systemzustand
- **Fokus:** Progressive Disclosure verhindert Überforderung
- **Meisterschaft:** Keyboard-Shortcuts für Power-User, flache Lernkurve

**Zu vermeiden:**
- **Unsicherheit:** Unklare Zustände, fehlende Bestätigung
- **Überforderung:** Zu viele Optionen gleichzeitig sichtbar
- **Frustration:** Versteckte Funktionen, unnötige Klicks
- **Peinlichkeit:** Fehler vor Kollegen ohne Korrekturmöglichkeit

### Design Implications

| Emotion | UX-Umsetzung |
|---------|--------------|
| Entlastung | Automatische ETB-Einträge ohne sichtbare UI |
| Magie | QR-Code-Scan mit Erfolgs-Animation und sofortigem Daten-Match |
| Kontrolle | FullScreen-Dashboard mit permanent sichtbarer Stärke |
| Vertrauen | Optimistic Updates für sofortige UI-Reaktion |
| Freude | Subtile Micro-Animations bei erfolgreichen Aktionen |
| Klarheit | Farbcodiertes Status-System, auf 3m lesbar im FullScreen |

### Emotional Design Principles

1. **Feedback First:** Jede Aktion erhält sofortiges visuelles Feedback – keine "stummen" Interaktionen.

2. **Forgiveness Built-In:** Fehler sind korrigierbar, Undo ist verfügbar, Fehlermeldungen sind hilfreich statt beschämend.

3. **Calm Technology:** Das System arbeitet im Hintergrund (Auto-ETB), ohne ständig um Aufmerksamkeit zu bitten.

4. **Progressive Trust:** Erste Nutzung einfach, fortgeschrittene Features entdeckbar – Vertrauen wächst mit der Nutzung.

5. **Team Visibility:** Alle sehen den gleichen Stand – das Gefühl, gemeinsam zu arbeiten, nicht isoliert.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

Da im BOS-Bereich keine etablierten UX-Vorbilder existieren, orientiert sich das Design an bewährten Patterns aus verwandten Nutzungskontexten:

**Desktop-Effizienz unter Druck (Sandra am Rechner):**
- **Linear:** Kompakte Listen, Keyboard-first Navigation, Status-Änderung ohne Kontextwechsel
- **Notion Tables:** Inline-Editing direkt in der Tabelle, dichte Datenansicht
- **Superhuman/Raycast:** Command Palette für Power-User, Keyboard Shortcuts
- **Pattern-Essenz:** Kompakt, dicht, keyboard-freundlich, Hover für Quick-Actions

**Dashboard auf Distanz (Thomas am Monitor):**
- **Monitoring Dashboards (Datadog, Grafana):** Große Zahlen, Farbcodierung, kritische Info prominent
- **TV-Dashboards (Geckoboard):** Designed für 3m Entfernung, keine Interaktion erforderlich
- **Pattern-Essenz:** Glanceable, hoher Kontrast, selbsterklärend

**QR-Code Interaktion:**
- **Apple Wallet:** Scan → sofortige Erkennung → visuelles Feedback
- **Pattern-Essenz:** Kamera sofort aktiv, keine manuelle Bestätigung, <2s bis Ergebnis

### Transferable UX Patterns

| Pattern | Inspiration | Anwendung im Kräfte-Modul |
|---------|-------------|--------------------------|
| **Kompakte Listenansicht** | Linear/Notion | Fahrzeuge als Tabellenzeilen mit Inline-Status |
| **Inline-Editing** | Notion Tables | Status direkt in Zeile ändern, kein Modal |
| **Keyboard Shortcuts** | Superhuman | `S` für Status, `F` für Fahrzeug hinzufügen |
| **Command Palette** | Raycast/VS Code | `Cmd+K` → Schnellsuche und Aktionen |
| **Hover Quick-Actions** | Linear | Maus über Zeile → Action-Buttons erscheinen |
| **Glanceable Header** | Geckoboard | Taktische Stärke permanent sichtbar, groß genug für Distanz |
| **FullScreen Toggle** | Präsentations-Apps | Ein Klick wechselt zwischen Kompakt und FullScreen |

### Anti-Patterns to Avoid

| Anti-Pattern | Risiko | Prävention |
|--------------|--------|------------|
| **Übergroße Buttons** | Verschwendet Platz, wirkt "dumm" | Normale Button-Größen, Effizienz vor Einfachheit |
| **Modale Dialoge** | Unterbricht Flow | Inline-Editing, Slide-Over Panels |
| **Formular-Wizards** | Zu viele Schritte | Ein-Schritt-Erfassung mit Smart Defaults |
| **Versteckte Keyboard Shortcuts** | Werden nicht entdeckt | Hints in Tooltips, Shortcut-Cheatsheet |
| **Touch-First auf Desktop** | Ineffizient für Maus-User | Desktop-optimiert, Touch nur wo nötig |

### Design Inspiration Strategy

**Adopt (direkt übernehmen):**
- Linear-Style kompakte Listen mit Inline-Status
- Command Palette für Power-User Aktionen
- Notion-Style Inline-Editing ohne Modals

**Adapt (anpassen):**
- Geckoboard Dashboard → FullScreen-Modus für Thomas
- Apple Wallet Scan → QR-Code-Flow mit Desktop-Kamera
- Superhuman Shortcuts → BOS-spezifische Tastenkürzel

**Avoid (vermeiden):**
- Touch-First Patterns auf Desktop (große Buttons, viel Whitespace)
- Enterprise-Software Patterns (Modals, Wizards, Confirmation Dialogs)
- Mobile-First responsive Design (Desktop ist Primary)

## Design System Foundation

### Design System Choice

**Tailwind CSS + Headless UI** als primäres Design-System mit folgenden Komponenten:

| Schicht | Technologie | Zweck |
|---------|-------------|-------|
| **Utility-First CSS** | Tailwind CSS | Schnelle, konsistente Styling-Iteration |
| **Unstyled Components** | Headless UI | Accessible Primitives (Dialogs, Dropdowns, Combobox) |
| **Premium Components** | Tailwind Plus (on-demand) | Komplexe UI-Patterns bei Bedarf |
| **Icons** | Heroicons | Konsistente Icon-Sprache |

### Rationale for Selection

1. **Desktop-Effizienz:** Tailwind ermöglicht kompakte, dichte UIs ohne CSS-Overhead – perfekt für Sandra's Workflow
2. **Accessibility Built-In:** Headless UI liefert ARIA-konforme Komponenten ohne visuellen Lock-in
3. **Bestehende Codebasis:** Projekt nutzt bereits Tailwind – keine Migration nötig
4. **Flexibilität:** Volle Kontrolle über visuelle Dichte (Kompakt vs. FullScreen-Modus)
5. **Team-Fit:** Etablierter Standard im Projekt, dokumentiert in CLAUDE.md

### Implementation Approach

**Atomic Design Integration:**

```text
atoms/      → Tailwind-styled Basis-Komponenten (Button, Input, Badge)
molecules/  → Headless UI + Tailwind (Combobox, Dropdown, Dialog)
organisms/  → Komplexe Module (Kräfte-Tabelle, Status-Panel)
templates/  → Layout-Varianten (Kompakt, FullScreen)
```

**Dual-Density Strategy:**
- **Default Mode:** Kompakte Abstände (`gap-2`, `p-2`, `text-sm`) für Sandra
- **FullScreen Mode:** Großzügige Abstände (`gap-6`, `p-6`, `text-2xl`) für Thomas

### Customization Strategy

**Design Tokens (Tailwind Config):**
- `colors.status.*` → Funkstatus-Farben (1-9)
- `colors.strength.*` → Taktische Stärke-Visualisierung
- `spacing.compact` / `spacing.fullscreen` → Density-Varianten
- `fontSize.glanceable` → Auf 3m lesbare Schriftgrößen

**Component Variants:**
- Jede Komponente unterstützt `density="compact" | "fullscreen"`
- Status-Badges mit standardisierten Farbcodes
- Keyboard-Shortcut Hints in Tooltips integriert

## Experience Mechanics

### Defining Interaction: Status-Update Flow

Die Kerninteraktion, die 50x pro Einsatz stattfindet:

| Phase | Aktion | Dauer | Feedback |
|-------|--------|-------|----------|
| **Trigger** | Funk meldet Status | - | - |
| **Initiation** | Klick auf Fahrzeugzeile ODER Shortcut `S` | <0.5s | Zeile highlighted |
| **Selection** | Status aus Dropdown wählen | <1s | Hover-Preview |
| **Completion** | Enter oder Klick | <0.5s | ✓ Toast + Farbe ändert sich |
| **Automation** | ETB-Eintrag im Hintergrund | 0s (unsichtbar) | - |

**Gesamt: <2 Sekunden** vom Funkspruch bis zum dokumentierten Status.

### Established Patterns Used

- **Inline-Editing:** Notion/Linear-Style, kein Modal
- **Keyboard-First:** Superhuman-Style Shortcuts
- **Optimistic Updates:** Sofortige UI-Reaktion, Sync im Hintergrund

## Visual Design Foundation

### Color System

**Brand Colors (fest):**
- Primary: Tailwind `sky-*` Palette
- Secondary: Indigo `#5c6bc0`
- Accent: Türkis `#26a69a`

**Semantic Colors (fest):**
- Success: `#66bb6a` – Bestätigungen, abgeschlossen
- Warning: `#ff9800` – Warnungen, Aufmerksamkeit
- Error: `#ef5350` – Fehler, kritisch
- Info: `#29b6f6` – Informationen, neutral

**Status-Farben (konfigurierbar per Admin):**
- Funkstatus 1-9 mit individueller Farbe + Label
- Defaults: Rot (nicht einsatzbereit) → Grün (einsatzbereit) Gradient
- Admin-UI: Color-Picker + Live-Preview

### Typography System

- **Primary Font:** Nunito Variable (freundlich, lesbar)
- **Fallback:** Inter Variable (neutral, professionell)
- **Monospace:** Source Code Pro (Code, Zeitstempel)

**Type Scale:**
- `text-sm` (14px): Kompakt-Modus Default
- `text-base` (16px): Standard
- `text-2xl` (24px): FullScreen-Modus Überschriften
- `text-4xl` (36px): Glanceable Zahlen (Stärke-Anzeige)

### Spacing & Density

**Dual-Density System:**

| Modus | Gap | Padding | Font |
|-------|-----|---------|------|
| **Compact** | `gap-2` | `p-2` | `text-sm` |
| **FullScreen** | `gap-6` | `p-6` | `text-xl`+ |

### Accessibility

- Kontrastverhältnis ≥ 4.5:1 für Text
- Status-Farben immer mit Icon/Label kombiniert (nicht nur Farbe)
- `prefers-reduced-motion` respektiert

## Design Direction

### Gewählte Richtung: "Linear-Inspired Desktop Efficiency"

**Kernprinzipien:**
1. Kompakte Tabellen-/Listenansicht als Hauptview
2. Inline-Editing ohne Modals
3. Keyboard-Shortcuts für Power-User
4. FullScreen-Toggle für Übersichtsmodus

**Nicht gewählt:**
- Touch-First/Mobile-First Design
- Card-basierte Layouts
- Wizard-Style Formulare
- Enterprise-Software Ästhetik

**Referenz-Apps:** Linear, Notion Tables, Superhuman

## User Journey Flows

User Journeys sind detailliert im PRD dokumentiert (siehe `docs/prd.md`):

| Journey | Persona | Kern-Interaktion |
|---------|---------|------------------|
| Kräfte erfassen | Sandra (FüKw) | Funk → Klick → Auto-ETB |
| Überblick gewinnen | Thomas (EL) | Dashboard → Stärke ablesen |
| Stammdaten pflegen | Maria (Admin) | HiOrg-Import → Config |
| QR-Scan Helfer | System | Scan → Match → Registriert |

## Component Strategy

### Existierende Komponenten (nutzen)

- **Badge** → Anpassen für konfigurierbare Status-Farben
- **Table** → Erweitern für Inline-Editing
- **Command Palette** → Für Keyboard-Shortcuts (`Cmd+K`)
- **Dialog** → Für Bestätigungen, Helfer-Details

### Neue Komponenten (Kräfte-spezifisch)

| Komponente | Zweck | Priorität |
|------------|-------|-----------|
| **StärkeAnzeige** | Große Zahlen (2/4/18/24), FullScreen-fähig | P1 |
| **DensityToggle** | Switch zwischen Compact/FullScreen | P1 |
| **FahrzeugZeile** | Tabellenzeile mit Inline-Status-Dropdown | P1 |
| **StatusBadge** | Konfigurierbare Farben per Admin | P1 |
| **QrScanner** | Kamera-Integration für Helfer-Scan | P2 |

## UX Consistency Patterns

### Feedback Patterns

| Aktion | Feedback-Typ | Beispiel |
|--------|--------------|----------|
| **Status-Update** | Inline-Farbwechsel + Toast | Badge wird grün, "Status 4 gespeichert" |
| **Fehler** | Inline-Rot + Shake-Animation | Feld rot, kurzes Shake |
| **Erfolg** | Subtle Toast (auto-dismiss 3s) | Unten rechts, verschwindet selbst |
| **Offline** | Persistent Banner | "Offline – Änderungen werden gespeichert" |

### Interaktions-Patterns

| Pattern | Auslöser | Verhalten |
|---------|----------|-----------|
| **Inline-Edit** | Klick auf Wert | Dropdown öffnet, Blur speichert |
| **Hover-Actions** | Mouse-Over Zeile | Action-Buttons erscheinen rechts |
| **Keyboard-Nav** | `↑/↓` in Liste | Zeilen-Fokus wandert |
| **Quick-Action** | `S` Shortcut | Status-Dropdown der fokussierten Zeile |

### Density-Patterns

| Modus | Trigger | Verhalten |
|-------|---------|-----------|
| **Compact → FullScreen** | Toggle-Button oder `F` | Animierter Übergang, größere Elemente |
| **FullScreen → Compact** | Toggle oder `Esc` | Zurück zu dichter Ansicht |

### Empty & Loading States

| Zustand | Anzeige |
|---------|---------|
| **Keine Fahrzeuge** | Illustration + "Noch keine Fahrzeuge erfasst" + CTA |
| **Laden** | Skeleton-Zeilen (3 Stück) |
| **Offline** | Letzte Daten + Banner |

## Responsive Design & Accessibility

### Responsive Strategy: Desktop-First

| Ansatz | Strategie |
|--------|-----------|
| **Primary** | Desktop (1024px+) – Tauri App, optimiert für Maus/Keyboard |
| **Secondary** | Web-Browser – Gleiche React-Codebase |
| **FullScreen** | Großer Monitor (Thomas) – Density-Toggle zu großen Elementen |
| **Tablet/Mobile** | Nicht priorisiert für MVP |

### Breakpoints

| Breakpoint | Verwendung |
|------------|------------|
| `< 1024px` | Warnung "Optimiert für Desktop" |
| `1024px - 1440px` | Standard Compact-Modus |
| `> 1440px` | FullScreen-Modus verfügbar |

### Accessibility (WCAG 2.1 AA)

| Anforderung | Umsetzung |
|-------------|-----------|
| **Kontrast** | ≥ 4.5:1 für Text, ≥ 3:1 für große Text/Icons |
| **Keyboard-Nav** | Vollständig navigierbar ohne Maus |
| **Focus-Indicator** | Sichtbarer Ring bei Fokus |
| **Screen Reader** | ARIA-Labels für alle interaktiven Elemente |
| **Farben** | Status nie nur durch Farbe – immer + Icon/Label |
| **Motion** | `prefers-reduced-motion` respektiert |

### Stress-Resilient Design

| Aspekt | Umsetzung |
|--------|-----------|
| **Große Klickziele** | Min. 44x44px auch im Compact-Modus |
| **Fehlertoleranz** | Undo-Option, keine destruktiven 1-Klick-Aktionen |
| **Klar unterscheidbar** | Status-Farben + Icons + Text |

