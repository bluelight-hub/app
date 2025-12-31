---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
lastStep: 11
completedAt: '2025-12-09'
inputDocuments:
  - docs/analysis/product-brief-kraefte-2025-12-09.md
  - docs/analysis/research/domain-kraefte-management-research-2025-12-09.md
  - docs/index/index.md
  - docs/index/key-features.md
  - docs/index/architecture-decisions.md
  - docs/architecture/3-backend-architecture.md
  - docs/architecture/4-frontend-architecture.md
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 16
workflowType: 'prd'
lastStep: 0
project_name: 'Bluelight Hub - Kräfte-Management'
feature_name: 'Kräfte'
github_issue: 49
user_name: 'Ruben'
date: '2025-12-09'
---

# Product Requirements Document - Bluelight Hub - Kräfte-Management

**Author:** Ruben
**Date:** 2025-12-09
**GitHub Issue:** #49

---

## Executive Summary

Das **Kräfte-Management-Modul** erweitert Bluelight Hub um die zentrale Verwaltung aller im Einsatz eingesetzten Ressourcen: Fahrzeuge, Personen und Rollen. Es ersetzt eine veraltete Windows-Anwendung durch eine moderne, übersichtliche Lösung, die dem Einsatzleiter mit wenigen Klicks einen vollständigen Überblick über eingesetzte Kräfte, deren Zuordnungen und die taktische Stärke bietet.

Das Feature integriert sich nahtlos in bestehende Module: Statusänderungen erzeugen automatische ETB-Einträge, Kräfte werden auf der Lagekarte visualisiert – alles konsequent einsatzbezogen.

### Was dieses Feature besonders macht

- **Automatische ETB-Integration:** Jeder Statuswechsel erzeugt einen unveränderlichen ETB-Eintrag
- **Taktische Stärke auf Knopfdruck:** Berechnung im Format `Führer/Unterführer/Helfer//Gesamt`
- **Schnellerfassung:** Fahrzeuge in <5 Sekunden erfassen, Status-Update mit 1-2 Klicks
- **QR-Code-Registrierung:** Helfer per QR-Code erfassen (z.B. DRK-Helfer App) – erweiterbar über Port/Adapter-Pattern
- **Dual-Mode UI:** FullScreen für Monitor-Ansicht, Kompakt für Bearbeitung
- **Volle Konfigurierbarkeit:** Funkstatus, Qualifikationen, Fahrzeugtypen und Rollen anpassbar

### Projekt-Klassifizierung

| Aspekt | Wert |
|--------|------|
| **Technical Type** | Desktop App (Tauri) + Backend API |
| **Domain** | BOS / Emergency Services |
| **Complexity** | Medium-High |
| **Project Context** | Brownfield – Erweiterung des bestehenden Systems |

Das Kräfte-Modul folgt der etablierten Hexagonalen Architektur (DDD + CQRS) und integriert sich über Domain Events mit dem bestehenden ETB- und Lagekarte-Modul. Die QR-Code-Integration wird als austauschbarer Adapter implementiert (`IHelferRegistrationPort` → `DrkHelferAppQrCodeAdapter`).

---

## Success Criteria

### User Success

| Nutzer | Aktion | Erfolgskriterium |
|--------|--------|------------------|
| **FüKw Personal (Sandra)** | Fahrzeug hinzufügen | < 5 Sekunden |
| **FüKw Personal (Sandra)** | Status-Update | 1-2 Klicks, Auto-ETB |
| **FüKw Personal (Sandra)** | Helfer per QR-Code registrieren | < 3 Sekunden (Scan → erfasst) |
| **FüKw Personal (Sandra)** | Gesamteindruck | "Das macht Spaß" |
| **EL/GF/ZF (Thomas)** | Stärke ablesen | < 2 Sekunden sichtbar |
| **EL/GF/ZF (Thomas)** | Überblick Dashboard | Alles Wichtige auf einen Blick |

### Business Success

*Alpha-Phase: Fokus auf Validierung, nicht Vertrieb.*

| Meilenstein | Erfolgskriterium |
|-------------|------------------|
| **Alpha-Test** | Testnutzer bevorzugen Kräfte-Modul gegenüber alter Software |
| **Feature-Complete** | Alle MVP-Features funktionieren zuverlässig |
| **Adoption** | FüKw-Personal nutzt das Modul freiwillig im echten Einsatz |

### Technical Success

| Bereich | Erfolgskriterium |
|---------|------------------|
| **Performance** | Dashboard-Load < 2 Sekunden |
| **ETB-Integration** | Statuswechsel erzeugt automatisch ETB-Eintrag |
| **ETB-Compliance** | Einträge unveränderlich, 10 Jahre Aufbewahrung |
| **Konfigurierbarkeit** | Funkstatus 7-9, Qualifikationen, Fahrzeugtypen, Rollen anpassbar |
| **Architektur** | Folgt Hexagonal/CQRS Patterns des bestehenden Systems |

### Measurable Outcomes

- ✅ Weniger Klicks als alte Software für gleiche Aufgaben
- ✅ Keine manuellen ETB-Einträge für Statusmeldungen nötig
- ✅ Taktische Stärke jederzeit aktuell und korrekt berechnet

---

## Product Scope

### MVP - Minimum Viable Product

| Feature | Beschreibung |
|---------|--------------|
| **Fahrzeuge** | Erfassen (temporär + Stammdaten), Status 0-9, OPTA, Funkrufname |
| **Personen** | Zuordnung zu Fahrzeugen, Qualifikationen |
| **Rollen** | Besetzbare Slots (LNA, OrgL, etc.) mit Funkrufname |
| **Taktische Stärke** | Automatische Berechnung `Führer/Unterführer/Helfer//Gesamt` |
| **ETB-Integration** | Auto-Einträge bei Statuswechsel |
| **Kräfte-Dashboard** | Übersicht mit FullScreen-Modus |
| **Lagekarte-Integration** | Kräfte als POIs (ohne GPS) |
| **QR-Code-Registrierung** | Helfer per DRK-Helfer App QR-Code erfassen |
| **Admin: Stammdaten** | Fahrzeuge, Personen, Qualifikationen pflegen |
| **Admin: Konfiguration** | Funkstatus, Qualifikationen anpassen |

### Growth Features (Post-MVP)

- Einsatzabschnitte mit Kräfte-Zuordnung
- Erweiterte Filter und Sortierung im Dashboard
- Export-Funktionen (PDF, Excel)
- GPS-Tracking für Fahrzeuge (optional)

### Vision (Future)

- Mobile App für Status-Updates
- Automatische Alarmierung / Skill-based Matching
- HR-/Dienstplan-Integration
- KI-gestützte Empfehlungen für Kräfte-Disposition

---

## User Journeys

### Journey 1: Sandra – Kräfte im Chaos erfassen

Sandra sitzt auf dem FüKw beim Sanitätsdienst für ein Stadtfest. Es ist 14:30 Uhr, das Fest hat gerade begonnen, und die ersten Einsatzkräfte treffen ein. Der Funk knistert ständig, während sie versucht, den Überblick zu behalten.

Ein RTW meldet sich an: "Rotkreuz Musterstadt 83/1, Status 4 am Einsatzort." Sandra öffnet das Kräfte-Modul, tippt auf "Fahrzeug hinzufügen", wählt den RTW aus den Stammdaten – **drei Klicks, fertig**. Der Status wird automatisch auf 4 gesetzt, ein ETB-Eintrag erscheint: "14:32 – Rotkreuz Musterstadt 83/1 eingetroffen".

Dann kommt der Moment, den sie früher gefürchtet hat: Ein Helfer steigt aus einem Privatfahrzeug und zeigt seinen QR-Code auf dem Handy. Sandra scannt ihn mit der Tablet-Kamera – **3 Sekunden später** steht "Max Müller, RS, DRK OV Musterstadt" im System. Keine Tipparbeit, keine Fehler.

Um 16:00 Uhr fragt Thomas über Funk: "Sandra, wie ist unsere Stärke?" Ein Blick aufs Dashboard: **2/4/18/24**. Sie antwortet sofort. Thomas ist zufrieden, Sandra auch – sie hat Zeit für das Wesentliche und muss nicht mehr jonglieren.

**Diese Journey zeigt Requirements für:**
- Schnellerfassung Fahrzeuge (temporär + Stammdaten)
- QR-Code-Scanner für Helfer-Registrierung
- Auto-ETB bei Statusmeldung
- Dashboard mit Taktischer Stärke

---

### Journey 2: Thomas – Überblick in Sekunden

Thomas ist Einsatzleiter bei einem MANV-Übungsszenario. 45 Einsatzkräfte, 12 Fahrzeuge, verteilt auf drei Einsatzabschnitte. Er steht am Lagezelt und muss in 30 Sekunden dem Übungsleiter Bericht erstatten.

Er öffnet das Kräfte-Dashboard auf seinem Tablet. **FullScreen-Modus** – große Zahlen, klare Struktur:

- **Stärke:** 3/8/34/45
- **Fahrzeuge:** 4x RTW (Status 4), 2x KTW (Status 2), 1x NEF (Status 4), 5x weitere
- **Rollen:** LNA ✅ besetzt, OrgL ✅ besetzt, Leiter BHP ⚠️ offen

Thomas sieht sofort: "Leiter BHP ist nicht besetzt." Er funkt Sandra: "Wer kann Leiter BHP übernehmen?" Sandra schaut in die Personenliste, findet einen GF mit passender Qualifikation, weist die Rolle zu – **ein ETB-Eintrag dokumentiert es automatisch**.

Thomas' Bericht an den Übungsleiter: präzise, in 20 Sekunden. Er wirkt professionell, obwohl er nur aufs Tablet geschaut hat.

**Diese Journey zeigt Requirements für:**
- Kräfte-Dashboard mit FullScreen-Modus
- Taktische Stärke prominent angezeigt
- Rollen-Übersicht mit Besetzungsstatus
- Schnelle Rollenzuweisung

---

### Journey 3: Admin Maria – Vorbereitung ist alles

Maria ist Verwaltungsleiterin beim DRK Ortsverein Musterstadt. Es ist Montag, 9 Uhr – keine Einsätze, Zeit für Stammdatenpflege.

Sie öffnet das Admin-Portal und sieht: "HiOrg-Server Sync verfügbar". Ein Klick auf "Synchronisieren" – das System zeigt ihr 12 neue Einsatzkräfte, die seit letztem Monat dazugekommen sind. Maria prüft die Liste, wählt 8 davon aus (4 sind nur passive Mitglieder), und importiert sie mit einem Klick. **Qualifikationen werden automatisch übernommen:** 3x RS, 2x NotSan, 3x RH.

Dann konfiguriert sie die Funkstatus für ihren Leitstellenbereich. Status 9 bedeutet bei ihnen "Notarzt aufgenommen", nicht "Handquittung" wie im Standard. Sie passt die Beschreibung an – **fertig, konfigurierbar wie versprochen**.

Am Freitag ist Großübung. Maria weiß: Die Stammdaten sind aktuell, die Status-Konfiguration stimmt, Sandra und Thomas können sich auf die Daten verlassen.

**Diese Journey zeigt Requirements für:**
- Admin-Portal für Stammdatenpflege
- HiOrg-Server API Integration (Import mit Auswahl)
- Qualifikationen automatisch übernehmen
- Konfigurierbare Funkstatus (7-9)

---

### Journey 4: System-Integration – DRK-Helfer App trifft Bluelight Hub

Es ist 7:00 Uhr morgens, Helfer Jonas steht am Sammelpunkt für den Sanitätsdienst. Er hat seine DRK-Helfer App geöffnet und zeigt seinen persönlichen QR-Code.

Sandra auf dem FüKw aktiviert den QR-Scanner im Kräfte-Modul. Die Tablet-Kamera erfasst den Code – das System dekodiert die Helfer-ID, prüft gegen die lokale Datenbank (aus HiOrg-Server importiert), und findet: "Jonas Weber, NotSan, GF-Qualifikation".

**3 Sekunden später:** Jonas ist erfasst, seine Qualifikationen sind sichtbar, er kann einem Fahrzeug zugewiesen werden. Kein Tippen, kein Suchen, keine Verwechslungen.

Wenn Jonas nicht in der Datenbank wäre (z.B. Helfer aus anderem OV), bietet das System "Temporär anlegen" an – Name eingeben, Qualifikation auswählen, fertig. Nach dem Einsatz kann der Datensatz gelöscht oder beibehalten werden.

**Diese Journey zeigt Requirements für:**
- QR-Code-Adapter (IHelferRegistrationPort → DrkHelferAppQrCodeAdapter)
- Matching gegen lokale Datenbank
- Fallback: Temporäre Erfassung bei unbekannten Helfern
- Datensatz-Lifecycle (löschen/behalten)

---

### Journey Requirements Summary

| Journey | Capabilities |
|---------|--------------|
| **Sandra** | Schnellerfassung, QR-Scanner, Auto-ETB, Dashboard |
| **Thomas** | FullScreen-Dashboard, Stärke-Anzeige, Rollen-Übersicht |
| **Admin Maria** | Stammdaten-Pflege, HiOrg-Server-Sync, Status-Konfiguration |
| **System-Integration** | QR-Code-Adapter, Datenbank-Matching, Temporäre Erfassung |

---

## Desktop App + SaaS Spezifische Requirements

### Project-Type Overview

Das Kräfte-Modul ist ein **Brownfield-Feature** für die bestehende Bluelight Hub Desktop-App (Tauri) mit NestJS Backend. Es folgt den etablierten Patterns und nutzt den vorhandenen Tech Stack.

### Technical Architecture Considerations

#### Offline-Fähigkeit

| Aspekt | Umsetzung |
|--------|-----------|
| **Strategie** | TanStack Query Caching + Optimistic Updates |
| **Sync-Verhalten** | Automatische Synchronisation bei Reconnect |
| **Konfliktbehandlung** | Last-Write-Wins (einfach für Alpha) |
| **Lokaler Cache** | Query Cache persistieren (optional: IndexedDB) |

**Kein neues Architektur-Pattern nötig** – TanStack Query's Built-in Features reichen aus.

#### Permission Model

| Phase | Umsetzung |
|-------|-----------|
| **Alpha/MVP** | Implizite Rechte: Admin-Panel nur für Admins, Einsatz-Modul für alle |
| **Später** | RBAC-Integration mit bestehendem Rechtekonzept |

**Für MVP:** Keine expliziten Rollen-Checks im Kräfte-Modul, nur Admin-Panel-Zugang beschränkt.

### Integrationen

| System | Typ | Priorität | Beschreibung |
|--------|-----|-----------|--------------|
| **DRK-Helfer App** | QR-Code Scan | MVP | Helfer-Registrierung per QR-Code |
| **HiOrg-Server API** | REST API | MVP | Stammdaten-Import (Personen, Qualifikationen) |
| **FE2 (Alamos)** | API/Import | Post-MVP | Einsatzdaten-Synchronisation |

#### Integration Architecture (Port/Adapter Pattern)

```
Application Layer
├── IHelferRegistrationPort      → DrkHelferAppQrCodeAdapter
├── IStammdatenSyncPort          → HiOrgServerApiAdapter
└── IEinsatzdatenPort (Future)   → Fe2AlamosAdapter
```

**Erweiterbar:** Neue Integrationen als Adapter ohne Core-Änderungen.

### Implementation Considerations

#### Bestehende Patterns nutzen

- **Commands/Queries:** CQRS für alle Kräfte-Operationen
- **Domain Events:** `KraftErfasst`, `StatusGeaendert` → ETB-Integration
- **TransactionalCommandHandler:** Atomare Event-Persistierung via Outbox

#### Frontend-Patterns

- **Atomic Design:** Neue Komponenten in `organisms/kraefte/`
- **TanStack Query:** Hooks für alle API-Calls
- **TanStack Form:** Erfassungsformulare mit Zod-Validierung

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Kernproblem lösen: Schnelle Kräfteerfassung statt Formular-Marathon
- Zuverlässig funktionierend, keine Bells & Whistles

**Scope Level:** Medium (überschaubares Feature mit klaren Grenzen)

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Sandra (FüKw Personal): Schnellerfassung, QR-Scan, Status-Updates
- Thomas (EL/GF/ZF): Dashboard, Stärke-Übersicht, Rollen-Check
- Admin Maria: Stammdaten-Pflege, HiOrg-Sync, Konfiguration
- System-Integration: QR-Code, HiOrg-Server API

**Must-Have Capabilities:**

| Feature | Journey-Bezug |
|---------|---------------|
| Fahrzeuge erfassen (temporär + Stammdaten) | Sandra |
| Personen zuordnen mit Qualifikationen | Sandra |
| Rollen verwalten (LNA, OrgL, etc.) | Sandra, Thomas |
| Funkstatus 0-9 mit Auto-ETB | Sandra |
| Taktische Stärke Berechnung | Thomas |
| Kräfte-Dashboard (FullScreen-Modus) | Thomas |
| Lagekarte-Integration (POIs ohne GPS) | Thomas |
| QR-Code-Registrierung (DRK-Helfer App) | Sandra, Integration |
| HiOrg-Server Sync (Personen-Import) | Admin Maria |
| Admin: Stammdaten + Konfiguration | Admin Maria |

### Post-MVP Features (Phase 2)

| Feature | Priorität | Beschreibung |
|---------|-----------|--------------|
| Einsatzabschnitte | Hoch | Kräfte Abschnitten zuordnen |
| Erweiterte Filter/Sortierung | Mittel | Dashboard-Verbesserungen |
| Export (PDF, Excel) | Mittel | Berichte und Dokumentation |
| FE2 (Alamos) Integration | Mittel | Einsatzdaten-Synchronisation |
| GPS-Tracking | Niedrig | Fahrzeug-Positionen live |

### Future Vision (Phase 3+)

- Mobile App für Status-Updates im Feld
- Automatische Alarmierung / Skill-based Matching
- HR-/Dienstplan-Integration
- KI-gestützte Empfehlungen für Kräfte-Disposition

### Risk Mitigation Strategy

| Risiko-Typ | Risiko | Mitigation |
|------------|--------|------------|
| **Technisch** | QR-Code Decoding | Bekannte Libraries (zxing), Fallback: manuelle Eingabe |
| **Technisch** | Offline-Sync Konflikte | Last-Write-Wins für Alpha, später Merge-Strategie |
| **Markt** | Nutzer-Akzeptanz | Alpha-Test mit echtem FüKw-Personal |
| **Ressourcen** | Solo-Dev Kapazität | Bestehende Patterns nutzen, kein Over-Engineering |

---

## Functional Requirements

Die folgenden funktionalen Anforderungen definieren das **Capability Contract** für das Kräfte-Management-Modul. Jedes Feature muss auf mindestens ein FR zurückführbar sein.

### Fahrzeug-Management

| FR | Requirement |
|----|-------------|
| **FR1** | FüKw Personal can capture vehicles from master data into active deployment |
| **FR2** | FüKw Personal can create temporary vehicles without master data for spontaneous units |
| **FR3** | FüKw Personal can update vehicle FMS status (0-9) |
| **FR4** | FüKw Personal can view available vehicle types according to DIN EN 1789 classification |
| **FR5** | System can track vehicle attributes (OPTA, Funkrufname, Typ, Sollbesatzung) |

### Personen-Management

| FR | Requirement |
|----|-------------|
| **FR6** | FüKw Personal can register personnel via QR-Code scan with automatic database lookup |
| **FR7** | FüKw Personal can create temporary personnel records for unknown helpers |
| **FR8** | FüKw Personal can assign personnel to vehicles |
| **FR9** | System can track personnel qualifications (NotSan, RS, RH, GF, ZF, etc.) |
| **FR10** | System can match scanned QR-Code against local personnel database |

### Rollen-Management

| FR | Requirement |
|----|-------------|
| **FR11** | FüKw Personal can assign personnel to configurable role slots (LNA, OrgL, Leiter BHP, etc.) |
| **FR12** | FüKw Personal can unassign personnel from roles |
| **FR13** | System can validate qualification requirements when assigning roles |
| **FR14** | System can track role attributes (Name, Funkrufname, required qualifications) |

### Taktische Stärke

| FR | Requirement |
|----|-------------|
| **FR15** | System can calculate tactical strength in format Führer/Unterführer/Helfer//Gesamt |
| **FR16** | System can categorize personnel by current function (not highest qualification) |
| **FR17** | System can count physicians as "Führer" category |
| **FR18** | System can auto-recalculate strength on any personnel or assignment change |

### Dashboard & Übersicht

| FR | Requirement |
|----|-------------|
| **FR19** | Einsatzleiter can view Kräfte-Dashboard with tactical strength, vehicles, and roles |
| **FR20** | Einsatzleiter can view dashboard in FullScreen mode optimized for monitors |
| **FR21** | FüKw Personal can view dashboard in compact mode optimized for editing |
| **FR22** | Users can switch between FullScreen and compact display modes |
| **FR23** | Einsatzleiter can view all vehicles with current FMS status |
| **FR24** | Einsatzleiter can view role occupancy status (assigned/vacant) |

### Lagekarte-Integration

| FR | Requirement |
|----|-------------|
| **FR25** | System can display deployed forces as POIs on the situation map |
| **FR26** | System can synchronize force positions with existing Lagekarte module |

### ETB-Integration

| FR | Requirement |
|----|-------------|
| **FR27** | System can automatically create ETB entry on vehicle status change |
| **FR28** | System can automatically create ETB entry on role assignment/unassignment |
| **FR29** | System can automatically create ETB entry on force capture |
| **FR30** | System can ensure all auto-generated ETB entries are immutable |
| **FR31** | System can persist ETB entries atomically with domain operations (Outbox pattern) |

### Administration & Konfiguration

| FR | Requirement |
|----|-------------|
| **FR32** | Admin can manage vehicle master data (create, read, update, archive) |
| **FR33** | Admin can manage personnel master data (create, read, update, archive) |
| **FR34** | Admin can manage qualification definitions |
| **FR35** | Admin can manage vehicle type definitions |
| **FR36** | Admin can manage role definitions with Funkrufname and required qualifications |
| **FR37** | Admin can configure FMS status labels 7-9 per organization/region |

### Externe Integrationen

| FR | Requirement |
|----|-------------|
| **FR38** | Admin can synchronize personnel from HiOrg-Server API |
| **FR39** | Admin can select which personnel to import from sync results |
| **FR40** | System can automatically map qualifications from HiOrg-Server data |
| **FR41** | System can decode DRK-Helfer-App QR-Code format |

### FR Summary

| Capability Area | Anzahl |
|-----------------|--------|
| Fahrzeug-Management | 5 |
| Personen-Management | 5 |
| Rollen-Management | 4 |
| Taktische Stärke | 4 |
| Dashboard & Übersicht | 6 |
| Lagekarte-Integration | 2 |
| ETB-Integration | 5 |
| Administration & Konfiguration | 6 |
| Externe Integrationen | 4 |
| **Gesamt** | **41** |

---

## Non-Functional Requirements

Die folgenden Quality Attributes definieren, WIE GUT das System performen muss. Nur relevante Kategorien für dieses Produkt sind dokumentiert.

### Performance

| NFR | Requirement |
|-----|-------------|
| **NFR1** | Dashboard (inkl. Stärke, Fahrzeuge, Rollen) lädt vollständig in < 2 Sekunden |
| **NFR2** | Fahrzeug-Erfassung aus Stammdaten abgeschlossen in < 5 Sekunden (inkl. UI-Interaktion) |
| **NFR3** | QR-Code-Scan bis Helfer erfasst in < 3 Sekunden |
| **NFR4** | Status-Update (1-2 Klicks) bis ETB-Eintrag erstellt in < 1 Sekunde |
| **NFR5** | Taktische Stärke Re-Berechnung bei Änderungen in < 500ms |

### Security & Compliance

| NFR | Requirement |
|-----|-------------|
| **NFR6** | ETB-Einträge sind nach Erstellung unveränderlich (Immutability) |
| **NFR7** | ETB-Daten müssen 10 Jahre aufbewahrt werden können |
| **NFR8** | Alle API-Kommunikation über HTTPS (TLS 1.2+) |
| **NFR9** | Admin-Funktionen nur für autorisierte Benutzer zugänglich |
| **NFR10** | Einsatzdaten sind mandantenfähig isoliert |

### Reliability & Offline

| NFR | Requirement |
|-----|-------------|
| **NFR11** | System bleibt bei Netzwerkausfall bedienbar (Offline-Modus) |
| **NFR12** | Lokale Änderungen werden bei Reconnect automatisch synchronisiert |
| **NFR13** | Kein Datenverlust bei unerwartetem App-Absturz (Autosave) |
| **NFR14** | ETB-Einträge werden atomar mit Domain-Operationen persistiert (Outbox) |

### Integration

| NFR | Requirement |
|-----|-------------|
| **NFR15** | ETB-Integration erfolgt über Domain Events (lose Kopplung) |
| **NFR16** | HiOrg-Server API-Fehler unterbrechen nicht den Hauptworkflow |
| **NFR17** | QR-Code-Dekodierung unterstützt DRK-Helfer-App Format |
| **NFR18** | Externe Integrationen als austauschbare Adapter implementiert (Port/Adapter) |

### Usability

| NFR | Requirement |
|-----|-------------|
| **NFR19** | FullScreen-Modus optimiert für Monitor-Ansicht auf Distanz (3m lesbar) |
| **NFR20** | Kompakt-Modus optimiert für Tablet-Bearbeitung |
| **NFR21** | Kritische Aktionen (Status-Update) mit maximal 2 Klicks erreichbar |
| **NFR22** | Feedback bei allen Benutzeraktionen innerhalb 200ms |

### NFR Summary

| Kategorie | Anzahl |
|-----------|--------|
| Performance | 5 |
| Security & Compliance | 5 |
| Reliability & Offline | 4 |
| Integration | 4 |
| Usability | 4 |
| **Gesamt** | **22** |
