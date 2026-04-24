---
date: 2026-04-21
project: bluelight-hub
workflow: check-implementation-readiness
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
  - issue-remediation
status: complete-with-remediation
remediationAppliedAt: 2026-04-21
filesIncluded:
  architecture: _bmad-output/planning-artifacts/architecture.md
  epics: _bmad-output/planning-artifacts/epics.md
  ux: _bmad-output/planning-artifacts/ux-design-specification.md
  prd: _bmad-output/planning-artifacts/prd.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-21
**Project:** bluelight-hub

## Step 1 — Document Discovery

### Durchsuchte Planungsartefakte

Basis: `_bmad-output/planning-artifacts/`

#### A. PRD Documents

**Whole Documents:**

- `docs/prds/prd-415-eigenschutz.md` (58.088 B, 2026-04-20 20:28)

**Sharded Documents:** _keine_

> ℹ️ PRD liegt außerhalb von `planning_artifacts` in `docs/prds/`. Nach User-Bestätigung als maßgebliches PRD für diese Readiness-Prüfung aufgenommen.

#### B. Architecture Documents

**Whole Documents:**

- `architecture.md` (119.812 B, 2026-04-21 09:46)

**Sharded Documents:** _keine_

#### C. Epics & Stories Documents

**Whole Documents:**

- `epics.md` (140.113 B, 2026-04-21 11:00)

**Sharded Documents:** _keine_

#### D. UX Design Documents

**Whole Documents:**

- `ux-design-specification.md` (81.081 B, 2026-04-21 08:48)

**Sharded Documents:** _keine_

### Kritische Issues

- **Duplikate:** keine identifiziert.
- **Fehlende Dokumente:** keine — PRD liegt in `docs/prds/prd-415-eigenschutz.md` und wurde vom User bestätigt.

### Gewählte Dokumente für die Bewertung

| Typ          | Datei                                                        | Format |
| ------------ | ------------------------------------------------------------ | ------ |
| PRD          | `docs/prds/prd-415-eigenschutz.md`                           | whole  |
| Architecture | `_bmad-output/planning-artifacts/architecture.md`            | whole  |
| Epics        | `_bmad-output/planning-artifacts/epics.md`                   | whole  |
| UX           | `_bmad-output/planning-artifacts/ux-design-specification.md` | whole  |

## Step 2 — PRD Analysis

**Quelle:** `docs/prds/prd-415-eigenschutz.md` (vollständig gelesen, 705 Zeilen)
**Produkt:** Modul Eigenschutz (Einsatzkräfte-Sicherheit & PSA)
**Autor:** Ruben Vitt — Status „Draft, bereit für Review", Issue #415
**Klassifikation:** Web App + Tauri, GovTech/BOS, Complexity: high, Brownfield

### Functional Requirements (extrahiert, 54 FRs)

**Scope-Legende:** `[MVP]` = Phase 1, `[P2]` = Phase 2 Growth, `[P3]` = Phase 3 Vision

#### A. Gefährdungsbeurteilung

- **FR1** `[MVP]` Sicherheitsbeauftragter kann pro Einsatzabschnitt eine Gefährdungsbeurteilung anlegen.
- **FR2** `[MVP]` Einzelne Gefährdungen mit Titel, Beschreibung, Eintrittswahrscheinlichkeit und Schadensausmaß erfassbar; System errechnet Risikostufe nach fest hinterlegtem Schema. _(Q1: 5×5 qualitativ, Grün/Gelb/Orange/Rot)_
- **FR3** `[MVP]` Gefährdungen hinzufügen/ändern/entfernen; jede Änderung als neue Version mit Zeitstempel + Urheber historisiert.
- **FR4** `[MVP]` Schutzmaßnahmen als Freitext zu jeder Gefährdung.
- **FR5** `[MVP]` Start mit vorkonfigurierter Basis-Vorlage (Seed).
- **FR6** `[MVP]` Gefährdungsbeurteilung jederzeit neu bewertbar; vorige Version einsehbar.
- **FR7** `[P2]` Admin kann Vorlagen erstellen, versionieren, aktiv/ausgelaufen markieren.
- **FR8** `[P2]` Automatische Übernahme von Gefährdungen aus Gefahren-Modul (via `gefahrenzoneId`-Join).
- **FR9** `[P3]` Einsatzübergreifende Gefährdungs-Analytics.

#### B. PSA-Verwaltung _(Q2-Modell-Änderung: PSA-Profile statt 4 lineare Stufen)_

- **FR10** `[MVP]` PSA-Profil/Profil-Set pro Einsatzbereich festlegen. _(ursprünglich „Stufe 1–4")_
- **FR11** `[MVP]` Mehrere Einsatzbereiche gleichzeitig wählen und Profile in einem Vorgang ändern.
- **FR12** `[MVP]` PSA-Änderung erfordert Kurz-Begründung und wird als kritisches Ereignis markiert.
- **FR13** `[MVP]` System hält zu jedem PSA-Profil eine Ausrüstungs-Checkliste bereit (dem Abschnittsleiter sichtbar).
- **FR14** `[MVP]` System protokolliert jede Änderung (vorheriges Profil, neues Profil, Urheber, Zeitstempel, Begründung).
- **FR15** `[P2]` System zeigt PSA-Profil-Empfehlung aus Gefährdungsbeurteilung + Gefahren-Daten.
- **FR16** `[P2]` Admin pflegt Ausrüstungs-Checklisten je Profil.

_Profile (Q2):_ Basis · Infektion (TRBA 250) · VU-/Absicherung · CBRN-Patientenversorgung · Vollschutz (MTF).

#### C. Bekanntgabe & Quittung

- **FR17** `[MVP]` Nicht-ignorierbarer Hinweis bei PSA-Änderung an alle betroffenen Abschnittsleiter.
- **FR18** `[MVP]` Abschnittsleiter quittiert PSA-Änderung.
- **FR19** `[MVP]` Sicherheitsbeauftragter sieht Quittungs-Status aller Abschnitte.
- **FR20** `[MVP]` Abschnittsleiter kann Rückmeldung („Ausrüstung nicht verfügbar") an S-Stab senden.
- **FR21** `[P2]` Quittung pro Einheit innerhalb eines Abschnitts.
- **FR22** `[P2]` Push-Notifications (Web-Push, Desktop) für kritische Ereignisse.

#### D. Sicherheitsregeln

- **FR23** `[MVP]` S-Stab erfasst Sicherheitsregeln als Freitext, Zuordnung Abschnitt oder Einsatz.
- **FR24** `[MVP]` Anzeige bei zugeordneten Abschnittsleitern/Einheiten.
- **FR25** `[MVP]` Quittung durch Abschnittsleiter, Bekanntgabe-Status persistiert.
- **FR26** `[P2]` Admin-Vorlagen für Sicherheitsregeln (versioniert).

#### E. Sicherungsposten

- **FR27** `[MVP]` CRUD für Sicherungsposten (Standort, Personal, Zuständigkeitsbereich).
- **FR28** `[MVP]` Marker auf Lagekarte; Navigation Karte → Detailansicht.
- **FR29** `[MVP]` Ablösezeiten als Textfeld.
- **FR30** `[P2]` Sicherungsposten-Schichten zeitlich planen, aktuellen Schichtinhaber anzeigen.

#### F. Vorfallmeldung & Export

- **FR31** `[MVP]` Berechtigte Rollen (S-Stab, Abschnittsleiter, Einheitsführer) erfassen Vorfallmeldung (Was/Wann/Wo/Beteiligte/Maßnahmen).
- **FR32** `[MVP]` Kennzeichnung „Unfallkasse-relevant".
- **FR33** `[MVP]` **Zeitpunkt-Snapshot**: unveränderlicher Kontext (Gefährdungsbeurteilung + PSA-Stufe zum Vorfallzeitpunkt).
- **FR34** `[MVP]` Nachbereitung exportiert Vorfall als PDF mit Kontext.
- **FR35** `[MVP]` Nachbereitung exportiert als strukturierter JSON.
- **FR36** `[MVP]` Filter nach Einsatz/Abschnitt/Unfallkasse-Kennzeichen/Zeitraum.
- **FR37** `[P2]` Export in spezifischen Landesunfallkassen-Formaten.

#### G. Ampel-Dashboard & Status

- **FR38** `[MVP]` Rot/Gelb/Grün pro Abschnitt, abgeleitet aus offenen Gefährdungen + ausstehenden Quittungen + Vorfällen.
- **FR39** `[MVP]` Liste offener Vorfälle und ungelöster Rückmeldungen.
- **FR40** `[MVP]` Warn-Markierung bei unbearbeiteten Gefährdungen und nicht-quittierten PSA-Änderungen.

#### H. Versionierung, Audit & Historie

- **FR41** `[MVP]` Änderungsverlauf je Gefährdungsbeurteilung/PSA-Stufe/Sicherheitsregel/Sicherungsposten (wer, wann, was, warum).
- **FR42** `[MVP]` Änderungen nicht löschbar; Korrekturen erzeugen neue Versionen.
- **FR43** `[MVP]` Jeder mit Lese-Recht sieht die Änderungshistorie.

#### I. Rollen & Berechtigungen _(Q4-Hybrid-Modell)_

- **FR44** `[MVP]` Rollen: `sicherheitsbeauftragter`, `abschnittsleiter`, `einheitsfuehrer`, `admin`, `nachbereitung`.
- **FR45** `[MVP]` Schreibzugriff auf Gefährdungsbeurteilung + PSA-Stufe nur für `sicherheitsbeauftragter`/`admin`.
- **FR46** `[MVP]` Quittungen nur von empfangender Rolle.
- **FR47** `[MVP]` Unfallkassen-Export beschränkt auf `nachbereitung`/`admin`.

#### J. Offline & Sync

- **FR48** `[MVP]` Alle Lese-/Schreib-Operationen offline-fähig.
- **FR49** `[MVP]` Auto-Sync bei Wiederverbindung ohne Datenverlust bei unkritischen Feldern.
- **FR50** `[MVP]` Konflikte auf kritischen Feldern (PSA-Stufe, Gefährdungs-Item) werden markiert und verlangen explizite Auflösung durch S-Stab.

#### K. Integration mit Plattform

- **FR51** `[MVP]` Alle Entities an `einsatzId` gebunden.
- **FR52** `[MVP]` Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz` + Einsatz-Navigation-Integration.
- **FR53** `[MVP]` Nutzung Plattform-Benachrichtigungs-Kanal.
- **FR54** `[MVP]` Gefährdungsbeurteilungen referenzieren Gefahren-Modul.

**Total FRs:** 54 (46 MVP · 7 Phase 2 · 1 Phase 3)

### Non-Functional Requirements (38 NFRs)

#### Performance (7)

- **NFR-P1** Eigenschutz-Route lädt ≤ 2 s (warmer Cache, Stabs-Tablet).
- **NFR-P2** PSA-Änderung online ≤ 2 s in allen Clients sichtbar (p95).
- **NFR-P3** Gefährdungsbeurteilung speichern + propagieren ≤ 1 s (p95).
- **NFR-P4** Ampel-Dashboard-Update ≤ 1 s (p95).
- **NFR-P5** PDF-Export Standard-Vorfall ≤ 5 s (≤ 5 Beteiligte, ≤ 10 Gefährdungen).
- **NFR-P6** Offline→Online-Sync (50 Änderungen, 3 Clients) ≤ 5 s.
- **NFR-P7** Zusätzliches Bundle ≤ 150 kB gzip.

#### Security (7)

- **NFR-S1** Plattform-Auth wiederverwenden (keine Modul-Auth).
- **NFR-S2** Server-seitige Autorisierung je Endpoint gegen Rollen (FR44–FR47).
- **NFR-S3** HTTPS/TLS pflicht; keine Klartext-Kommunikation.
- **NFR-S4** Audit-Trail append-only, keine Update/Delete auf Historien-Events.
- **NFR-S5** Personenbezogene Daten unter Plattform-Löschkonzept; keine separate Langzeit-Speicherung.
- **NFR-S6** Exports nur mit Leserecht der exportierenden Rolle.
- **NFR-S7** Fehlgeschlagene Authz-Versuche im Security-Log.

#### Reliability (4)

- **NFR-R1** Keine Modul-spezifische Downtime-Toleranz unter Plattform-SLO.
- **NFR-R2** Offline-Modus unabhängig vom Backend; kein Datenverlust bei lokalen Änderungen.
- **NFR-R3** Kritische Änderungen at-least-once; Deduplication per Event-ID am Empfänger.
- **NFR-R4** Wiederherstellungs-Pfad auf früheren Versionsstand aus Audit-Trail.

#### Accessibility (7)

- **NFR-A1** WCAG 2.1 AA Mindest-Anforderung.
- **NFR-A2** Status-Informationen redundant durch Icon + Text (nicht nur Farbe).
- **NFR-A3** Kritische Banner mit ARIA-Live `assertive`, Tastatur-quittierbar.
- **NFR-A4** Formulare mit gekoppelten Labels, Fehler per `aria-describedby`, Pflichtfelder markiert.
- **NFR-A5** Farbkontrast Normaltext ≥ 4.5:1, kritische Warnungen ≥ 7:1.
- **NFR-A6** Primäre Interaktionen vollständig per Tastatur, sichtbarer Fokus.
- **NFR-A7** BITV 2.0 als Ziel-Konformität.

#### Integration (5)

- **NFR-I1** Einsatz-Routen-Nesting `/einsatz/:einsatzId/sicherheit/eigenschutz/...` (Backend Plural `einsaetze`).
- **NFR-I2** `@ApiWrappedResponse`/`@ApiWrappedCreatedResponse` + `pnpm run generate-api`; keine manuellen `fetch()`.
- **NFR-I3** Neue Events in Registry an 4 Stellen (Serializer, Deserializer, Adapters-Modul, Adapters-Index).
- **NFR-I4** Lagekarte via MapGL-Layer (kein Leaflet).
- **NFR-I5** Platform-Storage-Adapter (ADR-010) für Offline-Schicht.

#### Scalability & Capacity (3)

- **NFR-C1** Ziel-Last: 20 Abschnitte · 100 Einheiten · 50 aktive Clients · 500 Gefährdungs-Items · 200 Vorfälle pro Einsatz, ohne Performance-Regression.
- **NFR-C2** Historien-Wachstum beliebig, ohne Regression von FR38–FR40 (indexierte „Current State"-Projektion).
- **NFR-C3** Konfliktauflösungs-UI skaliert mit Anzahl paralleler Konflikte (Liste statt Modal-Stau).

#### Maintainability & Quality Gates (5)

- **NFR-M1** Backend ≥ 80 % Unit-Test-Coverage für neue Domain-Logik; E2E auf PSA-Hochstufung, Vorfall-Erfassung, Sync-Merge.
- **NFR-M2** `check:di:imports` ohne Violations.
- **NFR-M3** `check:arch` keine neuen Circular Dependencies.
- **NFR-M4** oxlint + oxfmt ohne Fehler.
- **NFR-M5** Migrations benannt und idempotent (`prisma:migrate --name add_eigenschutz_*`).

**Total NFRs:** 38

### Additional Requirements, Constraints & Assumptions

#### Compliance/Regulatorik

- DGUV-Vorschriften (insb. DGUV Vorschrift 1, branchenspezifische Regeln RD/KatS/FW) als Referenz — keine Zertifizierung MVP.
- ArbSchG § 5 Gefährdungsbeurteilung-Pflicht.
- SGB VII Unfallversicherungs-Meldepflicht.
- DSGVO: Datenminimierung, Plattform-Löschkonzept.
- Revisionssicherheit (append-only Historie).
- Landesrechtliche Spezifika: nicht MVP.

#### Technische Constraints (aus „Technical Architecture Considerations")

- Frontend Feature-Slice `frontend/src/features/eigenschutz/` analog `einsatz/`.
- Backend hexagonal: `domain|application|infrastructure|modules/eigenschutz`.
- Neue Domain-Entities: `Gefaehrdungsbeurteilung`, `PsaAnforderung`/`PSAProfilZuweisung`, `Sicherheitsregel`, `Sicherungsposten`, `Vorfall`/`EigenschutzVorfall`.
- Events (EigenschutzEvents.\*): `GefaehrdungsbeurteilungErstellt`, `GefaehrdungsbeurteilungAktualisiert`, `PsaStufeGeaendert`, `SicherheitsregelAusgerufen`, `SicherungspostenEingerichtet`, `VorfallGemeldet` — 4-stelliger Registry-Eintrag pro Event.
- Optimistic Updates + Rollback bei Sync-Konflikt.
- Last-Writer-Wins (unkritisch) vs. Konfliktmarkierung (PSA/Gefährdung).
- Referenz auf `EinsatzEinheit` statt neuer „Einsatzabschnitt"-Entity (Q5).
- Gefahren-Modul-Kopplung via `gefahrenzoneId` (Q6).
- Hybrid-Rollen-Modell: `UserRole` global + `EigenschutzRolle`-Enum kontextuell via `EinsatzRollenbesetzung` + Permissions-Array (`eigenschutz:<res>:<action>`, Q4).

#### Resolved Open Questions (Q1–Q8, 2026-04-20)

| #   | Thema                      | Entscheidung                                                                                                                                                                 | Status |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q1  | Risikomatrix               | 5×5 qualitativ, Grün/Gelb/Orange/Rot                                                                                                                                         | ✅     |
| Q2  | PSA-Modellierung           | **PSA-Profile statt 4 Stufen** (Basis/Infektion/VU/CBRN/Vollschutz) — Modell-Änderung!                                                                                       | ⚠️     |
| Q3  | Seed-Vorlagen              | MANV · VU-Patientenversorgung · Sanitätsdienst Großveranstaltung · Betreuungseinsatz · Gefahrstoff/CBRN-Patientenversorgung (weiße BOS, kein Vegetationsbrand/HW-Bekämpfung) | ✅     |
| Q4  | Rollen                     | Hybrid: `UserRole` + `EigenschutzRolle` via `EinsatzRollenbesetzung` + Permissions                                                                                           | ✅     |
| Q5  | Abschnitts-Modell          | `EinsatzEinheit` referenzieren (keine neue „Einsatzabschnitt"-Entity), Route Plural `einsaetze` Backend / Singular `einsatz` Frontend                                        | ✅     |
| Q6  | Gefahren-Modul-API         | MVP: FK `gefahrenzoneId` (optional); Phase 2 Auto-Übernahme via Join                                                                                                         | ✅     |
| Q7  | Unfallkassen-Export-Schema | MVP-Obermenge akzeptiert, Finalisierung als TS-Interface + Zod in Architecture                                                                                               | ⏳     |
| Q8  | Rechts-Review              | Kein Release-Gate, nach Pilot vor breitem Rollout; Tracking Issue #713                                                                                                       | ✅     |

#### Arbeitsannahmen (A1–A9)

- **A1** DGUV-Zertifizierung kein Release-Gate.
- **A2** Ausschließlich Platform-Storage + Event/Outbox, keine Modul-Eigenentwicklung.
- **A3** Lagekarte = MapGL.
- **A4** Plattform-Notification-Kanal; kein separater Transport.
- **A5** PDF-Export plattform-generisch im MVP.
- **A6** Weitergehende Spezialschutz-/Sonderlagen-Workflows explizit Post-MVP (aus dem MVP-Narrativ ausgeklammert).
- **A7** MVP-Release-Gate = Pilot-Akzeptanz.
- **A8** Feature-Slice `frontend/src/features/eigenschutz/`.
- **A9** Hexagonales Backend-Layering.

#### Abhängigkeiten / Vorbedingungen

- Gefahren-Modul-API (stabil, referenzierbar) vor FR8.
- Lagekarte Marker-Layer-Fähigkeit für FR28.
- Platform-Notification-Kanal „kritisch/nicht-ignorierbar"-Priorität für FR17 — sonst UI-Banner-Fallback.

### PRD Completeness Assessment

**Stärken:**

- Sehr klar strukturiert: Executive Summary, klassifiziert, 4 Kern-Personas mit Happy/Edge-Journeys plus explizitem Deferred-Future-Scope, explizite MVP/P2/P3-Scope-Marker, 54 FRs/38 NFRs mit ID-Nummerierung.
- Hohe fachliche Tiefe: Q2-Korrektur der PSA-Modellierung auf Profile statt lineare Stufen (ausgelöst durch TRBA 250 / DGUV Regel 105-003) zeigt bewusste Domain-Recherche und Mut zur Kurskorrektur.
- Bindende Q1–Q8-Entscheidungen mit expliziter Architektur-Implikation.
- Technische Constraints plattform-konsistent (Storage, Events, Auth, MapGL, API-Workflow).
- Messbare NFRs (Zahlen, p95, Mengen-Grenzen), keine Weichspüler.

**Risiken / offene Punkte (für Step 3/5 zu prüfen):**

- **Q2-Impact nicht durchgezogen in FR-Liste.** FR10–FR16 sprechen weiter von „PSA-Stufe" / „1–4" — die Profil-Semantik ist nur in der Resolved-Q2-Interpretation dokumentiert. In Epics/Stories muss diese Umdeutung explizit verankert sein, sonst droht Implementierungs-Verwirrung.
- **FR-IDs-Konsistenz:** FR10/FR11/FR12 etc. nutzen noch Stufen-Sprache; FR13/FR16 „Checkliste pro Stufe" → laut Q2 „pro Profil". Diese Abweichung ist unten bei Step-3/5 nachzuverfolgen.
- **FR33 (Zeitpunkt-Snapshot)** ist ein Innovations-Punkt. Prüfen, ob Architektur/Stories temporale Queries konkret abbilden.
- **FR50 (Konflikt-Resolution)** braucht UI-Ausformulierung — NFR-C3 verlangt Listen- statt Modal-UI.
- **NFR-P1/P2/P7-Messbarkeit**: Baseline und Messaufbau müssten in Stories als Test-Kriterium erscheinen.
- Q7 (Unfallkassen-Export-Schema) steht auf „iterativ / in Architektur finalisieren" — Prüfung, ob Architektur das tatsächlich einlöst.
- Weitergehende Spezialschutz-/Sonderlagen-Workflows bewusst Post-MVP — dürfen nicht versehentlich Epics-Scope erreichen.

**Bewertung PRD-Vollständigkeit:** Hoch. Qualitätsniveau ist über dem üblichen PRD-Level; Haupt-Risiko ist die saubere Übersetzung der Q2-PSA-Profil-Semantik in Epics/Stories.

## Step 3 — Epic Coverage Validation

**Quelle:** `_bmad-output/planning-artifacts/epics.md` (vollständig gelesen, `status: complete`, 8 Epics · 52 Stories in Summe inklusive Epic 7 Polish und nachgelagerter Scope-Korrektur-Story 8.1)

### Epic-Struktur

| #   | Epic                                              | Fokus                                                                                                                                                                                           | Stories (Anzahl) |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Plattform-Voraussetzungen & Eigenschutz-Fundament | Push-Infra (ADR-011), `EinsatzScopeGuard` (ADR-012), Prisma-Migration, Seeds, Rollen-Guards, Route-Skeleton, Event-Registry-Framework                                                           | 7 (1.1–1.7)      |
| 2   | Gefährdungsbeurteilung & Sicherheitsregeln        | Beurteilung aus Seed/leer, 5×5-Matrix, Versionierung, Auto-Save, Sicherheitsregel CRUD+Quittung                                                                                                 | 7 (2.1–2.7)      |
| 3   | PSA-Profile & kritische Bekanntgabe               | Profile additiv, Multi-Select + `propagationGroupId`, SeverityBanner, Quittung, Checkliste, Lücken-Rückmeldung, Re-Prompt-Scheduler, Push, Konflikt-Backend, ConflictResolutionList, Telemetrie | 11 (3.1–3.11)    |
| 4   | Sicherungsposten & Lagekarten                     | CRUD + Versionierung, Ablösezeiten, MapGL-Marker, bidirektionale Navigation                                                                                                                     | 4 (4.1–4.4)      |
| 5   | Vorfallmeldung & Unfallkassen-Export              | Vorfall erfassen, Kontext-Snapshot V1 (Innovations-Anker), Filter, PDF-Export, JSON-Export V1, Export-Audit                                                                                     | 6 (5.1–5.6)      |
| 6   | Ampel-Dashboard & Live-Status                     | AmpelProjection Read-Model, AmpelCard (Direction B), Focus-View (Direction C), Seitenpanel, Warn-Markierungen                                                                                   | 5 (6.1–6.5)      |
| 7   | MVP-Polish                                        | Dark-Mode-Severity-Tokens, Keyboard-Shortcuts, Command-Palette, Deep-Links, SyncStatusBadge, Zero-Toast-Policy, Responsive-Audit, A11y-Audit, Prometheus/Grafana, Performance-Audit, E2E        | 11 (7.1–7.11)    |
| 8   | Scope-Korrektur & Artefakt-Synchronisierung       | Nachgelagerte Korrektur für Seeds, UI-Copy und Planungsartefakte ohne Wiedereröffnung von Epic 1                                                                                                | 1 (8.1)          |

**Total:** 8 Epics · 52 Stories · saubere Abhängigkeiten (Epic 1 als Blocker, Epic 2–5 parallelisierbar, Epic 6 konsumiert Events, Epic 7 Cross-Cutting-Polish, Epic 8 als nachgelagerte Scope-Korrektur).

### FR Coverage Matrix (MVP-Scope)

Legende: ✅ abgedeckt · ⚠️ Lücke/implizit · ❌ fehlt · ➖ Out-of-Scope MVP (erwartet)

| FR   | Beschreibung                             | Epic/Story                                                                                                                              | Status                                                                                                                                                                                                                                                                         |
| ---- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR1  | Gefährdungsbeurteilung anlegen           | Epic 2 · Story 2.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR2  | 5×5 Risikomatrix → Risikoklasse          | Epic 2 · Story 2.2                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR3  | Gefährdungen ändern/entfernen + Version  | Epic 2 · Story 2.3                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR4  | **Schutzmaßnahmen als Freitext**         | Epic 2 (laut Coverage Map) · keine dedizierte Story-AC                                                                                  | ⚠️ **Implizit** (kein AC beschreibt das Feld-Eingabeerlebnis; Story 2.2 listet nur Titel/Beschreibung/Risikobewertung. Im Datenmodell vorhanden, da Story 6.5 auf „keine Schutzmaßnahme dokumentiert" referenziert → Feld existiert in Story 1.4-Schema, aber keine UX-Story.) |
| FR5  | Seed-Vorlage wählen                      | Epic 2 · Story 2.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR6  | Neu bewerten, Vorversion einsehbar       | Epic 2 · Story 2.4                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR7  | Admin-Vorlagen versionieren              | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR8  | Gefahren-Modul Auto-Übernahme            | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR9  | Einsatzübergreifende Analytics           | —                                                                                                                                       | ➖ Phase 3                                                                                                                                                                                                                                                                     |
| FR10 | PSA-Profile additiv aktivieren           | Epic 3 · Story 3.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR11 | Multi-Select Einsatzbereiche             | Epic 3 · Story 3.2                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR12 | Begründungspflicht PSA                   | Epic 3 · Story 3.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR13 | Ausrüstungs-Checkliste je Profil         | Epic 3 · Story 3.5                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR14 | PSA-Änderung protokollieren              | Epic 3 · Story 3.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR15 | PSA-Empfehlung aus Gefahren-Modul        | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR16 | Admin Checklisten-Pflege                 | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR17 | Nicht-ignorierbarer Hinweis              | Epic 3 · Story 3.3                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR18 | PSA-Quittung durch Abschnittsleiter      | Epic 3 · Story 3.4                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR19 | Quittungsstand sichtbar                  | Epic 3 · Story 3.4                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR20 | Rückmeldung Ausrüstungs-Lücke            | Epic 3 · Story 3.6                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR21 | Einheits-Level-Quittung                  | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR22 | Push-Notifications                       | Epic 3 · Story 3.8                                                                                                                      | ✅ **MVP-hochgezogen** (UX-Spec, von Phase 2 nach MVP gehoben, explizit dokumentiert — siehe Inkonsistenz unten)                                                                                                                                                               |
| FR23 | Sicherheitsregeln Freitext + Zuordnung   | Epic 2 · Story 2.6                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR24 | Anzeige bei Empfängern                   | Epic 2 · Story 2.7                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR25 | Sicherheitsregel-Quittung                | Epic 2 · Story 2.7                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR26 | Sicherheitsregel-Vorlagen                | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR27 | Sicherungsposten CRUD                    | Epic 4 · Story 4.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR28 | Marker + bidirektionale Navigation       | Epic 4 · Story 4.3, 4.4                                                                                                                 | ✅                                                                                                                                                                                                                                                                             |
| FR29 | Ablösezeiten Textfeld                    | Epic 4 · Story 4.2                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR30 | Schichtplanung                           | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR31 | Vorfallmeldung erfassen                  | Epic 5 · Story 5.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR32 | UK-relevant kennzeichnen                 | Epic 5 · Story 5.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR33 | Zeitpunkt-Snapshot (Innovations-Anker)   | Epic 5 · Story 5.2                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR34 | PDF-Export                               | Epic 5 · Story 5.4                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR35 | JSON-Export                              | Epic 5 · Story 5.5                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR36 | Vorfall-Filter                           | Epic 5 · Story 5.3                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR37 | Landesunfallkassen-Formate               | —                                                                                                                                       | ➖ Phase 2                                                                                                                                                                                                                                                                     |
| FR38 | Ampel-Status pro Abschnitt               | Epic 6 · Story 6.1, 6.2                                                                                                                 | ✅                                                                                                                                                                                                                                                                             |
| FR39 | Offene Vorfälle + Rückmeldungen          | Epic 6 · Story 6.4                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR40 | Warn-Markierungen                        | Epic 6 · Story 6.5                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR41 | Änderungsverlauf (State + Version-Chain) | Epic 2 · Story 2.3 (baseline) + pro Entität (Sicherheitsregel 2.6, Sicherungsposten 4.1, Vorfall append-only durch Snapshot-Invariante) | ✅                                                                                                                                                                                                                                                                             |
| FR42 | Append-only                              | Epic 2 · Story 2.3, Domain-weit über `*_version`-Tabellen                                                                               | ✅                                                                                                                                                                                                                                                                             |
| FR43 | Historie einsehbar                       | Epic 2 · Story 2.4 (baseline)                                                                                                           | ✅                                                                                                                                                                                                                                                                             |
| FR44 | Rollen                                   | Epic 1 · Story 1.4 (Seeds), Story 1.5 (Guard)                                                                                           | ✅                                                                                                                                                                                                                                                                             |
| FR45 | Schreibzugriff Gefährdung/PSA            | Epic 1 · Story 1.5, + in 2.1, 3.1                                                                                                       | ✅                                                                                                                                                                                                                                                                             |
| FR46 | Quittungen nur von empfangender Rolle    | Epic 1 · Story 1.5, + in 2.7, 3.4                                                                                                       | ✅                                                                                                                                                                                                                                                                             |
| FR47 | Export-Permission                        | Epic 1 · Story 1.5, + in 5.4                                                                                                            | ✅                                                                                                                                                                                                                                                                             |
| FR48 | Offline Lesen/Schreiben                  | Epic 1 (Fundament) + Cross-Cutting (Story 2.5, 5.1)                                                                                     | ✅                                                                                                                                                                                                                                                                             |
| FR49 | Auto-Sync ohne Datenverlust (unkritisch) | Story 2.5, 5.1                                                                                                                          | ✅                                                                                                                                                                                                                                                                             |
| FR50 | Konfliktauflösung kritischer Felder      | Epic 3 · Story 3.9 (Backend), Story 3.10 (UI)                                                                                           | ✅                                                                                                                                                                                                                                                                             |
| FR51 | Einsatz-Binding + `EinsatzScopeGuard`    | Epic 1 · Story 1.3, 1.6                                                                                                                 | ✅                                                                                                                                                                                                                                                                             |
| FR52 | Route-Integration                        | Epic 1 · Story 1.6                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |
| FR53 | Plattform-Notification-Kanal             | Epic 1 · Story 1.7 (Framework) + pro Epic (Events registriert)                                                                          | ✅                                                                                                                                                                                                                                                                             |
| FR54 | `gefahrenzoneId`-FK (MVP-Referenz)       | Epic 2 · Story 2.1                                                                                                                      | ✅                                                                                                                                                                                                                                                                             |

### Coverage Statistics

- **PRD FRs total:** 54
- **MVP FRs:** 46
- **MVP FRs in Epics abgedeckt (hart):** 45 ✅
- **MVP FRs mit Dokumentations-Lücke:** 1 (FR4) ⚠️
- **MVP FRs fehlend:** 0 ❌
- **Phase-2/3 FRs (erwartet ausgeschlossen):** 9 (FR7, FR8, FR9, FR15, FR16, FR21, FR26, FR30, FR37) ➖
- **MVP Coverage:** **98 % hart, 100 % inkl. impliziter FR4** · **Out-of-Scope-Management:** sauber (explizit gelistet in Epics „Hinweis Out-of-Scope MVP")

### Zusätzliche Coverage (Architecture + UX)

Die Epics decken **zusätzlich** ab:

- **15 Architecture-Requirements (AR1–AR15)** — alle mit Epic-Zuordnung: Push-Infra (AR1→Epic 1), EinsatzScopeGuard (AR2→Epic 1), Migration (AR3→Epic 1), Seeds (AR4→Epic 1), Event-Registry (AR5→Epic 1 Framework + pro Epic), Hexagonal Backend (AR6→Epic 1), Frontend Feature-Slice (AR7→Epic 1), Telemetrie (AR8→Epic 3+7), Optimistic Concurrency (AR9→Epic 3), Kontext-Snapshot (AR10→Epic 5), Ampel-Updater (AR11→Epic 6), Re-Prompt-Scheduler (AR12→Epic 3), PDF-Renderer (AR13→Epic 5), Export-Audit (AR14→Epic 5), web-push-Dependency (AR15→Epic 1).
- **29 UX Design Requirements (UX-DR1–UX-DR29)** — alle mit Epic-Zuordnung.
- **38 NFRs** — querschnittlich addressiert, v.a. in Epic 7 (A11y-Audit Story 7.8 gegen NFR-A1–A7, Performance-Audit Story 7.10 gegen NFR-P1–P7/NFR-C1/C2/S5).

### Inkonsistenzen & Gaps

#### ⚠️ Gap 1 — FR4 (Schutzmaßnahmen als Freitext) ist nicht in Story-AC ausformuliert

**Befund:** FR4 ist in der FR Coverage Map Epic 2 zugeordnet und in der Epic-2-FRs-Liste genannt. Aber **keine einzelne Story in Epic 2** beschreibt das Schutzmaßnahmen-Feld in ihren Acceptance Criteria:

- Story 2.2 „Gefährdung erfassen" listet Felder Titel, Beschreibung, `RiskMatrix5x5` — **kein Schutzmaßnahmen-Feld**.
- Story 2.3 „Gefährdungen ändern" beschreibt Item-Änderungen generisch.

Dass das Feld im Schema existiert, ist über Story 1.4 (Migration) + Story 6.5 (Ampel-Logik „keine Schutzmaßnahme dokumentiert") **indirekt abgeleitet**, aber nicht als explizite Story-Anforderung.

**Impact:** Klein bis mittel. Das Feld wird wahrscheinlich „natürlich" in der Gefährdungs-Erfassungs-UI auftauchen (wenn der Entwickler das Schema liest), aber die Story-AC sind nicht präzise genug für belastbare DoD-Prüfung.

**Empfehlung:** Story 2.2 oder 2.3 um ein AC ergänzen: „Für jede Gefährdung kann der Sicherheitsbeauftragte **Schutzmaßnahmen als Freitext (≤ 1000 Zeichen)** hinterlegen; das Feld ist Teil des Items-JSONB-Payloads und folgt dem gleichen Auto-Save- und Version-Chain-Mechanismus wie Titel/Beschreibung."

#### ⚠️ Inkonsistenz 2 — FR22 Scope-Hochstufung (Phase 2 → MVP)

**Befund:** Das PRD markiert **FR22 (Push-Notifications) explizit als `[Phase 2]`** (Zeile 468 im PRD). Die Epics.md hingegen behandelt es als `[MVP – UX-hochgezogen]` (Epics Zeile 64) und ordnet Story 3.8 als MVP ein.

**Impact:** Das ist **kein Coverage-Gap**, sondern eine **bewusste Scope-Erweiterung**. Epics.md dokumentiert diese Abweichung transparent:

- In Interpretationshinweisen (Epics Zeile 29): „FR22 Push-Notifications (Tauri + Web-Push), … durch UX-Spec in MVP gehoben"
- In der FR-Kommentierung direkt (Zeile 64)
- Architecture hat dafür `AR1` (F1 Push-Infrastruktur, ADR-011-Kandidat) als **Plattform-Voraussetzung** ergänzt.

**Empfehlung:** PRD-Maintenance-Note — Idealerweise sollte das PRD in einer nächsten Iteration auf dem Scope-Status synchron sein. Kein Implementierungs-Blocker.

#### ⚠️ Inkonsistenz 3 — Q4-Revision („Hybrid-Rolle") zwischen PRD und Epics

**Befund:** Das PRD dokumentiert in Q4 (Zeile 631–646) eine Hybrid-Lösung mit **neuem `EigenschutzRolle`-Prisma-Enum**. Die Epics.md revidiert das (Epics Zeile 27: „Q4 (Rollen-Hybrid, **revidiert**): Eigenschutz-Rollen werden als `RollenDefinition`-Seed-Records mit Präfix `Eigenschutz: ...` persistiert. **Kein neuer Prisma-Enum**, kein Schema-Change an `EinsatzRollenbesetzung`.").

**Impact:** Positiv — die Epic-Planung hat die Rolle-Anbindung noch minimal-invasiver gemacht. Das ist eine **Verbesserung gegenüber PRD-Q4**, aber eine PRD-Epics-Inkonsistenz für Nachleser.

**Empfehlung:** PRD-Maintenance-Note — Q4 im PRD mit `✅ Revidiert in Epic-Phase` ergänzen und auf Epics-Interpretationshinweise verweisen.

### Non-MVP-FRs in Epics gelandet?

Prüfung, ob Phase-2/3-FRs unabsichtlich in Stories auftauchen:

- FR7, FR8, FR9, FR15, FR16, FR21, FR26, FR30, FR37 — alle **nicht** in Story-AC gefunden. ✅
- Feuerwehr-/Atemschutz-spezifische MVP-Journey — nicht in Epics. ✅
- Vegetationsbrand/Hochwasser-Vorlagen — nicht in Epic 2 Seeds (korrekt weiß-BOS-Fokus, Q3). ✅

### Scope-Discipline

- Out-of-Scope-FRs sind **explizit gelistet** (Epics Zeile 427): „FR7, FR8, FR9, FR15, FR16, FR21, FR26, FR30, FR37 werden … nicht behandelt. Architektur und Schema sind aber bereits so ausgelegt, dass sie ohne Breaking Changes ergänzt werden können."
- FR22-Hochstufung ist **begründet und transparent** dokumentiert.
- Weitergehende Spezialschutz-/Sonderlagen-Workflows bleiben bewusst ausgeklammert.

**Bewertung Epic Coverage:** Sehr hoch. **45 von 46 MVP-FRs mit dedizierten Stories** abgedeckt, 1 Lücke nur auf AC-Ausformulierungs-Niveau (FR4). Saubere Scope-Discipline, alle Phase-2/3-FRs explizit ausgeschlossen und architektonisch vorbereitet. Zusätzlich vollständige Abdeckung aller 15 ARs und 29 UX-DRs.

## Step 4 — UX Alignment

### UX Document Status

✅ **Vorhanden und vollständig.** `_bmad-output/planning-artifacts/ux-design-specification.md`:

- Status: `Final` (BMad Collaborative UX Design Workflow abgeschlossen 2026-04-21)
- 14 abgeschlossene Workflow-Steps (Init → Discovery → Core Experience → Emotional Response → Inspiration → Design System → Defining Experience → Visual Foundation → Design Directions → User Journeys → Components → Patterns → Responsive/A11y → Complete)
- 1.243 Zeilen · Input: PRD + Issue #415 + Plattform-Projektdoku

### UX ↔ PRD Alignment

#### ✅ Übernommen aus PRD (konsistent)

- **Alle 4 PRD-Kern-Personas** (Markus, Steffi, Thomas, Sabine) mit Primary/Secondary/Admin/Compliance-Zuordnung übernommen.
- **Alle 4 MVP-Journeys** (1a, 1b, 2, 4) als Mermaid-Flowchart mit Happy-Path + Edge-Cases dokumentiert; weitergehende Spezialschutz-/Sonderlagen-Workflows explizit ausgeklammert.
- **PRD Q1 (5×5 Risikomatrix)** → `RiskMatrix5x5`-Organism mit Grün/Gelb/Orange/Rot-Mapping, konsistent mit `warnstufe-*`-Tokens aus Gefahrenmatrix-Feature.
- **PRD Q2 (PSA-Profile)** → `PSAProfileMultiSelect`-Chips mit expliziter Mental-Modell-Shift-Behandlung („additiv, nicht linear"); User-Education über Tooltips. Die Epics-Interpretationshinweise (Zeilen 24-30) bestätigen die konsistente Umsetzung.
- **PRD Q3 (5 Seed-Vorlagen)** → `SeedTemplateEntryCard` mit genau den PRD-Seeds (MANV/VU/Großveranstaltung/Betreuung/CBRN-Patient).
- **PRD Q4 (Hybrid-Rollen)** → Rollen-Labels 1:1 übernommen („Sicherheitsbeauftragter", „Abschnittsleiter", etc.); keine UX-spezifische Rollen-Erfindung.
- **PRD Q5 (Abschnitt ≡ EinsatzEinheit)** → UX-Label bleibt „Abschnitt", Datenbank-Referenz `einheitId` — explizit in Zeile 423 als Verwechslungsrisiko dokumentiert und durchgehend konsistent adressiert.
- **PRD FR33 Kontext-Snapshot** → `IncidentContextSnapshot`-Organism mit prominentem „Stand zum Vorfall-Zeitpunkt"-Header, Präteritum-Sprache, `aria-readonly="true"`. UX unterstreicht die juristische Bedeutung.
- **Alle messbaren NFR-Performance-Ziele** (TTI ≤ 2 s, Propagation ≤ 2 s, PDF-Export ≤ 5 s, Bundle ≤ 150 kB) übernommen und in Phase MVP-Polish (Sprint 7-8) verankert.

#### ⚠️ UX-Erweiterungen über PRD hinaus (vom UX-Spec explizit dokumentiert)

UX-Spec Abschnitt „Abweichungen vom PRD" (Zeilen 1218–1227) listet 6 Erweiterungen:

| #   | Abweichung                                                             | PRD-Status                                                         | UX-Status                    | In Epics umgesetzt?                                                                                          |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | **FR22 Push-Notifications (Tauri-Native + Web-Push)**                  | Phase 2                                                            | MVP-hochgezogen              | ✅ Story 3.8 + Story 1.1/1.2 Plattform-Push-Infra                                                            |
| 2   | **`ConflictResolutionList` MVP** (NFR-C3 Umsetzung)                    | PRD listet Bedarf, aber UX hebt konkrete Listen-Komponente ins MVP | MVP                          | ✅ Story 3.10 + Story 3.9 (Backend)                                                                          |
| 3   | **Keyboard-Shortcuts First-Class** (⌘K, /, N, V, ?, Esc + kontextuell) | nicht im PRD explizit                                              | MVP                          | ✅ Story 7.2                                                                                                 |
| 4   | **Deep-Links pro Entität** (Entity-URL)                                | nicht im PRD explizit                                              | MVP                          | ✅ Story 7.4                                                                                                 |
| 5   | **Dashboard-Opt-in-View Direction C** (Focus + List ab ≥ 1024 px)      | nicht im PRD                                                       | MVP (Produktentscheidung UX) | ✅ Story 6.3                                                                                                 |
| 6   | **Senior-Operator-Testing (50+)** als Teil des Pilot-Reviews           | nicht im PRD                                                       | MVP                          | ✅ in UX-Testing-Strategie (Zeile 1160), indirekt in E2E-Tests Story 7.11 und A11y-Audit Story 7.8 verankert |

**Bewertung:** Alle Erweiterungen sind **transparent dokumentiert**, begründet (UX-Research/Pilot-Insights), architektonisch abgedeckt (Architecture Zeilen 83–89 listet sie explizit unter „UX-Spec-Abweichungen zum PRD (Architektur-relevant)") und in Epics umgesetzt. Dies ist idealer Workflow — UX macht die Product-Feinjustierung, die formal PRD-nachgelagert, aber inhaltlich sauber integriert ist.

#### ⚠️ PRD-Maintenance-Note

Das PRD ist auf Stand 2026-04-20 gesetzt und wurde nach UX-Abweichungen nicht aktualisiert. **Dies ist eine Dokumentations-Inkonsistenz, kein Implementations-Blocker**, da Architecture und Epics die finalen Entscheidungen tragen.

### UX ↔ Architecture Alignment

Das Architecture-Dokument (Zeilen 83–89) listet explizit die UX-Abweichungen auf („UX-Spec-Abweichungen zum PRD (Architektur-relevant)") und adressiert jede:

| UX-DR                                        | Architektur-Abdeckung                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| UX-DR1 `SeverityBanner` (ARIA-`assertive`)   | WebSocket-Kanal (ADR-006) + `eventId`-Dedup (NFR-R3) + `focus-ring-critical`-Token                       |
| UX-DR2 `RiskMatrix5x5` (5×5 `role="grid"`)   | Domain-Service `RisikoklasseBerechnung` mit 5×5-Matrix-Schema (Q1)                                       |
| UX-DR3 `PSAProfileMultiSelect` (additiv)     | `PsaProfilZuweisung`-Entity mit additivem Profil-Set, `propagationGroupId` für Bulk-Ops (Architektur B5) |
| UX-DR4 `AcknowledgmentStatusBadge`           | `QuittungAbgegeben`-Event → `AmpelProjection` → Live-Update via WebSocket                                |
| UX-DR5 `IncidentContextSnapshot` (read-only) | AR10: `kontextSnapshot JSONB` + FK-Hinweise + `EigenschutzKontextSnapshotV1`-Zod-Schema                  |
| UX-DR6 `ConflictResolutionList` MVP (NFR-C3) | Architektur B6: `sync_conflict`-Entity + `KonfliktErkanntEvent` + `KonfliktAufgeloestEvent`              |
| UX-DR7 `EquipmentChecklist`                  | `AusruestungsCheckliste`-Value-Object (statisch MVP, pflegbar Phase 2 via FR16)                          |
| UX-DR8 `StatusIndicator`                     | Atomic UI, `AmpelProjection`-gestützt                                                                    |
| UX-DR9 `SyncStatusBadge`                     | Platform Storage Adapter (ADR-010) liefert Pending-Count, Last-Sync-Time                                 |
| UX-DR10 `VersionTimestampFooter`             | `*_version`-Tabellen liefern `gueltigVon`/`changedByUserId`                                              |
| UX-DR11 `AmpelCard/Dashboard` Direction B/C  | AR11 Event-getriebener `AmpelProjection`-Updater + persistenter `dashboardView`-Store                    |
| UX-DR12 `SecurityPostMapMarker`              | MapGL-Layer via `features/lagekarte/`; keine Wiedereinführung von Leaflet (NFR-I4)                       |
| UX-DR13 `SeedTemplateEntryCard`              | `GefaehrdungsbeurteilungVorlage`-Model + AR4 Seed-Skript für 5 Seeds (Q3)                                |
| UX-DR14 Dark-Mode-Severity-Tokens            | Token-Layer in `index.tailwind.css`; Story 7.1 adressiert es                                             |
| UX-DR15 Keyboard-Shortcuts                   | Command-Palette via `cmdk`; `<Kbd>`-Atom-Architektur; Story 7.2                                          |
| UX-DR16 Command-Palette                      | `cmdk`-Lib bereits im Plattform-Gerüst                                                                   |
| UX-DR17 Deep-Links                           | TanStack Router (Frontend) + `EinsatzScopeGuard` (Backend, AR2) für 403-Fall; Story 7.4                  |
| UX-DR18 Auto-Save 2 s Debounce               | Hook `useAutoSave` (Story 2.5) für alle versionierten Entitäten                                          |
| UX-DR19 Multi-Select + Batch-Action          | `propagationGroupId` (Architektur B5) bündelt Bulk-Ops transaktional                                     |
| UX-DR20 Re-Prompt 5 min                      | AR12: `@nestjs/schedule`-Job + `QuittungUeberfaelligEvent`                                               |
| UX-DR21 Zero-Toast-Policy                    | UI-Konvention, in Story 7.6 Konsistenz-Test                                                              |
| UX-DR22 Alarm-Budget (max 3 assertive)       | Client-Store + `assertive`-Queue-Aggregation                                                             |
| UX-DR23 Offline-UX ohne Modale               | Platform Storage Adapter + `SyncStatusBadge` (Story 7.5)                                                 |
| UX-DR24 Responsive                           | Container-Queries für `AmpelCard`; Tailwind-Breakpoints                                                  |
| UX-DR25 Drawer/Modal/Popover                 | Headless UI Primitives                                                                                   |
| UX-DR26 Filter-Bar                           | TanStack Store + URL-Query-Params                                                                        |
| UX-DR27 Destructive Actions                  | UI-Konvention + Story 7.6                                                                                |
| UX-DR28 A11y Quality Gates                   | Story 7.8 axe-core + SR-Walks + WCAG-Checkpoint-Audit                                                    |
| UX-DR29 Telemetrie-Hooks                     | AR8: `EigenschutzTelemetryEvent`-Table + Prometheus (Story 7.9)                                          |

**Architektur deckt alle 29 UX-DRs ab.** Keine UI-Komponente ohne Backend/Infrastruktur-Pfad.

#### Performance-Alignment (UX-Ziele vs. NFR-Architektur)

| UX-Ziel                                              | Architektur-Mechanismus                                                                      | Abdeckung |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| CBRN-Moment ≤ 90 s (p95, Signatur-Interaktion)       | Telemetrie-Timestamps `assess_started` / `all_banners_delivered` (AR8) + E2E-Test Story 7.11 | ✅        |
| Route-TTI ≤ 2 s (Stabs-Tablet)                       | Route-Level-Code-Splitting + Performance-Audit Story 7.10 (Lighthouse)                       | ✅        |
| Bundle ≤ 150 kB gzip                                 | Bundle-Analyzer in Story 7.10                                                                | ✅        |
| Ampel-Refresh ≤ 1 s                                  | `AmpelProjection` materialisiert (AR11)                                                      | ✅        |
| PDF-Export ≤ 5 s (≤ 5 Beteiligte, ≤ 10 Gefährdungen) | Self-contained `kontextSnapshot` + `pdfkit@0.18` (AR13)                                      | ✅        |

### Alignment Issues / Gaps

#### ⚠️ Issue 1 — PRD-Dokument ist nicht auf Stand der UX-Entscheidungen

- **Befund:** UX-Spec und Epics tragen die finalen Entscheidungen (FR22 MVP, ConflictResolutionList MVP, Keyboard-Shortcuts MVP, etc.), aber das PRD-Dokument wurde nach den UX-Iterationen nicht aktualisiert.
- **Impact:** Mittel — zukünftige Leser könnten von PRD-FR-Markierungen in die Irre geführt werden. Für Implementierung ist es kein Blocker, da Architecture und Epics maßgeblich sind.
- **Empfehlung:** Kleine PRD-Pflege-Iteration: FR22 auf `[MVP — UX-hochgezogen]` umlabeln, Q7-Status auf „in Architecture festgelegt" aktualisieren, Hinweis auf UX-Erweiterungen (Keyboard-Shortcuts, Deep-Links, Direction C) als „Post-PRD UX-Ergänzungen" ergänzen.

#### ✅ Keine kritischen Misalignments

- UX-Dokument, Architecture-Dokument und Epics stimmen in allen **MVP-Entscheidungen** überein.
- Alle Personas aus dem PRD sind in UX und Epics konsistent adressiert.
- Alle Journeys sind vollständig in Epics mit Stories abgedeckt.
- Alle UX-Erweiterungen gegenüber PRD sind **transparent dokumentiert** und nicht verdeckt.

### Warnings

- **W1 (Dokumentations-Hygiene):** PRD-Maintenance-Iteration empfohlen (siehe Issue 1), aber nicht blockierend.
- **W2 (Open Task auf Architecture-Seite):** Q7 Unfallkassen-Export-Schema ist im PRD auf „iterativ" gesetzt. Architektur B11/Zod-Schema `EigenschutzVorfallExportV1` setzt das um (Story 5.5). ✅
- **W3 (Dependency-Risiko auf Plattform):** AR1 (F1 Push-Infra, ADR-011) und AR2 (F2 `EinsatzScopeGuard`, ADR-012) sind **neue Plattform-Bausteine**, die **vor oder parallel** zum Eigenschutz-MVP verfügbar sein müssen. Story 1.1–1.3 bauen sie in Epic 1 auf. Wenn diese Stories Bauchschmerzen machen oder eigene ADR-Reviews brauchen, ist das ein **Scheduling-Risiko**, kein Coverage-Gap.

**Bewertung UX Alignment:** Sehr hoch. UX-Dokument ist final, vollständig PRD-konsistent (mit transparenten Erweiterungen) und architektonisch lückenlos unterlegt. Das ist der seltene Fall eines vollständig durchgezogenen PRD→UX→Architecture→Epics-Flows.

## Step 5 — Epic Quality Review

**Prüfmaßstab:** `create-epics-and-stories` Best Practices (User Value, Independence, Dependencies, Story Sizing, BDD-AC, Timing).

### Epic Structure Validation

#### A. User Value Focus

| Epic | Titel                                                                  | Liefert User-Value?                                                                                             | Bewertung                                                                                                                                                                                                                                                                                                                          |
| ---- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Plattform-Voraussetzungen & Eigenschutz-Fundament                      | „Berechtigter Nutzer öffnet leere Eigenschutz-Startseite seines Einsatzes; nicht-Berechtigte werden abgewiesen" | ⚠️ **Borderline** — klassischer Tech-Foundation-Epic, aber mit minimal-sichtbarem User-Ergebnis. Story 1.6 liefert navigierbare Route (FR52). Deckt zudem FR44–FR47 (Rollen), FR51/FR53 (Plattform-Integration). Best-Practice-Regel minimal befriedigt; in Brownfield-Kontext mit vielen Integrations-Voraussetzungen akzeptabel. |
| 2    | Gefährdungsbeurteilung & Sicherheitsregeln                             | „Als Markus kann ich Gefährdungsbeurteilung + Sicherheitsregeln anlegen + auditieren"                           | ✅ User-zentriert, klare Journey 1a + Sicherheitsregel-Mini-Loop                                                                                                                                                                                                                                                                   |
| 3    | PSA-Profile & kritische Bekanntgabe                                    | „Als Markus PSA-Änderungen bulk-versenden; als Steffi empfangen + quittieren"                                   | ✅ Signatur-Interaktion (CBRN-Moment ≤ 90 s) — perfektes User-Value-Epic                                                                                                                                                                                                                                                           |
| 4    | Sicherungsposten & Lagekarten-Integration                              | „Sicherungsposten CRUD + MapGL-Marker + bidirektionale Navigation"                                              | ✅ User-zentriert                                                                                                                                                                                                                                                                                                                  |
| 5    | Vorfallmeldung & Unfallkassen-Export                                   | „Als Einsatzkraft Vorfall erfassen; als Sabine filtern/exportieren"                                             | ✅ Journey 4 vollständig + Innovations-Anker (Kontext-Snapshot)                                                                                                                                                                                                                                                                    |
| 6    | Ampel-Dashboard & Live-Status-Übersicht                                | „Auf einen Blick sehen, wo Aufmerksamkeit nötig ist"                                                            | ✅ User-zentriert                                                                                                                                                                                                                                                                                                                  |
| 7    | MVP-Polish: Accessibility, Keyboard, Dark-Mode, Deep-Links, Telemetrie | Quer-Polish aller User-Value-Aspekte                                                                            | ✅ Als Cross-Cutting-Epic akzeptabel (A11y-Audit, Performance-Gate, E2E-Tests)                                                                                                                                                                                                                                                     |

**Befund:** Alle Epics haben User-Value-Framing, Epic 1 grenzwertig aber defensiv okay.

#### B. Epic Independence

Das Epics-Dokument enthält ein explizites **Epic-Abhängigkeits-Diagramm** (Zeile 412–425):

```
Epic 1 (Fundament)
  ├── Epic 2 (Gefährdung + Sicherheitsregeln)
  ├── Epic 3 (PSA + Konfliktauflösung)        — benötigt Epic 1 Push-Infra + EinsatzScopeGuard
  ├── Epic 4 (Sicherungsposten)               — parallel zu 2/3
  ├── Epic 5 (Vorfall + Export)               — Snapshot referenziert 2+3, funktioniert auch leer/teilweise
  ├── Epic 6 (Ampel-Dashboard)                — konsumiert Events 2-5, standalone implementierbar
  └── Epic 7 (MVP-Polish)                     — cross-cutting nach 1-6
```

- ✅ **Rückwärts-Abhängigkeiten nur** (Epic N → Epic 1..N-1); keine Forward-Dependencies zwischen Epics.
- ✅ **Epic 5 explizit defensiv** gebaut: Snapshot kann leer sein, falls Epic 2+3 noch nicht fertig.
- ✅ **Epic 6 standalone-fähig**: Event-Handler können mit Mock-Events gegen leeres `AmpelProjection` getestet werden.
- ✅ **Epic 7 Cross-Cutting** legitim als Polish-Phase.

#### C. Story Independence innerhalb der Epics

Stichproben-Prüfung:

- **Epic 1 Story-Reihenfolge:** 1.1 (Push-Backend) → 1.2 (Push-Clients, braucht 1.1) → 1.3 (`EinsatzScopeGuard`, standalone) → 1.4 (Migration, standalone) → 1.5 (Rollen-Guards, braucht 1.3+1.4) → 1.6 (Route-Skeleton, braucht 1.5) → 1.7 (Event-Registry-Framework, standalone). ✅ Saubere Reihenfolge.
- **Epic 2 Story-Reihenfolge:** 2.1 (Anlegen) → 2.2 (Risikomatrix, braucht 2.1) → 2.3 (Versioning, braucht 2.1) → 2.4 (Timeline, braucht 2.3) → 2.5 (Auto-Save, braucht 2.3) → 2.6 (Sicherheitsregel-Anlegen) → 2.7 (Sicherheitsregel-Quittung, braucht 2.6). ✅
- **Epic 3 Story-Reihenfolge:** 3.1 (PSA toggle) → 3.2 (Bulk, braucht 3.1) → 3.3 (Banner, braucht 3.1) → 3.4 (Quittung, braucht 3.3) → 3.5 (Checkliste, integriert in 3.3/3.4) → 3.6 (Lücken-Meldung, braucht 3.5) → 3.7 (Re-Prompt-Scheduler) → 3.8 (Push, braucht 1.1+1.2+3.3) → 3.9 (Konflikt-Backend, braucht 3.1) → 3.10 (Konflikt-UI, braucht 3.9) → 3.11 (Telemetrie). ✅
- Keine harte Forward-Dependency in AC entdeckt.

### Story Quality Assessment

#### A. BDD-Acceptance-Criteria-Format

**Stichprobe:** Alle geprüften Stories (1.1–7.11) folgen konsequent dem **Given/When/Then**-Format. Jede Story hat 4–7 AC-Blöcke, typischerweise:

- 1 Happy-Path
- 1–2 Permission-/Error-Fälle (403, 409)
- 1–2 Edge-Cases (Offline, Konflikt, Reprompt)
- 1 Registrierungs-Verifikation (Event-Registry an 4 Stellen)

**Testbarkeit:** Sehr hoch. Konkrete Werte (`HTTP 403`, `version=5`, `≤ 2 s`, `≤ 5 s`, `≤ 150 kB gzip`, `{error: "ConflictDetected"}`) sind durchgängig.

#### B. Story Sizing

- Kleinste Stories (~150 Zeilen Text): 4.2 (Ablösezeiten), 2.4 (Vorversionen), 7.1 (Dark-Mode-Tokens).
- Größte Stories (~300–400 Zeilen): 1.4 (Prisma-Migration mit 11 Models+7 Enums+Seeds), 3.11 (Telemetrie-Capture), 5.2 (Kontext-Snapshot mit Zod-Schema).
- **Alle Stories in sich abgeschlossen** (= können theoretisch von einem Entwickler-Team in 1–3 Tagen umgesetzt werden, wenn alle referenzierten Stories durch sind).

⚠️ **Story 1.4 ist monolithisch**: erstellt 11 Models + 7 Enums + 4 RollenDefinition-Seeds + 5 Vorlagen-Seeds in einer Migration. **Best-Practice-Regel** sagt „each story creates tables it needs". Aber:

- **Architektonisch begründet:** hoch integrierte Entities (z.B. `PsaProfilZuweisung` referenziert `EinsatzEinheit` + `Gefaehrdungsbeurteilung`-FK), die stückweise-Migration würde viele Teil-Zustände mit unvollständigen Constraints erzeugen.
- **Idempotenz-gesichert** (2. Durchlauf ändert nichts).
- **Epics dokumentieren:** Epic 3/4/5 nutzen die Models, legen aber keine eigenen Tabellen an. Konsistenz ist höher als Story-Granularität.

**Bewertung:** Akzeptabler Trade-off — **Minor Concern**, aber nicht blockierend.

#### C. User-Story-Format (As a / I want / So that)

- Sämtliche geprüfte Stories haben **„As a X, I want Y, so that Z"**-Format. ✅
- Rollen-Zuordnung konsistent (`Sicherheitsbeauftragter`, `Abschnittsleiter`, `Einheitsführer`, `Nachbereitung`, `Backend-Entwickler`, `Administrator`, `QA-Engineer`, `Accessibility-Advocate`).
- Einige Stories adressieren nicht-User-Personas (1.1 „Plattform-Admin", 1.3/1.4/3.9/5.6 „Backend-Entwickler"). Best-Practice-Puristen sehen das kritisch, aber in einem Brownfield-Plattform-Modul sind technische Stories mit Dev-Rolle legitim — die liefern User-Value durch Unlock nachfolgender User-Stories.

#### D. Story-Vollständigkeit (Pflicht-Elemente)

Jede Story enthält:

- User Story Header ✅
- Acceptance Criteria in Given/When/Then ✅
- Oft: Referenzen auf FR, NFR, AR, UX-DR ✅
- Oft: konkrete Code-Pfade (`domain/eigenschutz/value-objects/...`, `eigenschutz_vorfall`-Tabelle, Hook-Namen) ✅
- Oft: Registrierungs-Hinweise (Event-Registry 4 Stellen, DI-Tokens) ✅
- Test-Coverage-Hinweise (≥ 80 % Domain, E2E für kritische Pfade) in vielen Stories ✅

### Best Practices Compliance Checklist

| Check                                           | Status                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Epics liefern User-Value                        | ✅ (Epic 1 borderline, aber mit sichtbarem Ergebnis)                                                |
| Epics unabhängig (nur Rückwärts-Abhängigkeiten) | ✅                                                                                                  |
| Stories unabhängig innerhalb Epic               | ✅                                                                                                  |
| Keine Forward-Dependencies in Stories-AC        | ✅ (nur schwache Hinweise auf spätere Stories, keine harten Blocker)                                |
| Stories angemessen groß                         | ✅ (1.4 borderline monolithisch)                                                                    |
| Tabellen nur wenn nötig erstellt                | ⚠️ (Story 1.4 macht alles auf einmal — architektonisch begründet)                                   |
| Clear ACs in BDD-Format                         | ✅                                                                                                  |
| Traceability zu FRs                             | ✅ (explizite FR Coverage Map + pro Epic FR-Liste + pro Story FR-Referenzen)                        |
| Brownfield-Integration-Points dokumentiert      | ✅ (ADR-010 Platform Storage, ADR-006 WebSocket, `EinsatzRollenbesetzung`, MapGL, bestehende Hooks) |

### Findings nach Severity

#### 🔴 Critical Violations

**Keine.**

#### 🟠 Major Issues

**M1 — Story 1.4 macht eine Big-Bang-Migration statt „tables per story":**

- Creates 11 Models + 7 Enums + alle Seeds in einer Migration.
- Verletzt striktes Best-Practice, wird aber begründet durch hohe Entity-Kopplung.
- **Remediation-Option:** Splitting in „Core Schema (Migration A)" + „Projections & Conflict Tables (Migration B)" + „Seeds (Skript)". Würde aber die operative Migration-Hygiene nicht wesentlich verbessern.
- **Empfehlung:** **Akzeptieren** als bewussten Trade-off, dokumentieren in ADR-kandidat-Form.

**M2 — FR4 (Schutzmaßnahmen-Freitext) ohne dediziertes Story-AC** (bereits in Step 3 identifiziert):

- Field existiert im Schema (via Story 1.4) und in der Ampel-Logik (Story 6.5).
- **Kein AC beschreibt UX-Erfassung des Feldes.**
- **Remediation:** Story 2.2 um ein AC ergänzen (1 Zeile Aufwand).
- **Impact:** Klein, aber Dokumentation-Hygiene-Issue.

#### 🟡 Minor Concerns

**m1 — PRD-Scope-Inkonsistenzen (bereits aus Step 3/4):**

- FR22 Phase-2-Label im PRD vs. MVP-Label in Epics/UX.
- Q4-Prisma-Enum-Entscheidung im PRD vs. Q4-Revision in Epics (kein Enum).
- **Remediation:** Leichte PRD-Pflege-Iteration.

**m2 — Soft Forward-References in Stories:**

- Story 3.11 „vorbereitet für Prometheus-Auswertung (Story 7.9)" → ok, 3.11 liefert auch ohne 7.9 Value.
- Story 2.7 „reflektiert sich in AmpelProjection (Baustein für Epic 6)" → ok, Projection-Tabelle existiert aus 1.4, nur Updater-Handler kommt später.
- Story 4.1/4.2 „State + Version-Chain, analog FR41" → Pattern-Verweis, nicht Forward-Dep.
- **Bewertung:** Alles innerhalb akzeptabler Referenz-Praxis.

**m3 — Epic 7 hat keine neuen FRs abgedeckt:**

- Epic 7 „FRs abgedeckt: _keine neuen — querschnittlicher Feinschliff über Epic 1-6_".
- Ist ein legitimer Polish-Epic, aber mit 11 Stories relativ groß. Einige Stories könnten in andere Epics eingebaut werden (z.B. Story 7.9 Prometheus-Metriken zu Story 3.11 Telemetrie).
- **Empfehlung:** **Akzeptieren** als konsolidierter Polish-Epic, da Cross-Cutting-Work bewusst gruppiert ist.

**m4 — Story 1.7 Event-Registry-Framework:**

- Liefert Framework ohne konkrete Events (0 Events registriert). Nachfolgende Stories tragen Events einzeln ein.
- Ist eine saubere Pattern, aber führt dazu, dass Epic 1 etwas abstrakt wirkt.
- **Bewertung:** OK — Tech-Debt-vermeidende Vorab-Investition.

#### ✅ Positive Highlights

- **Explizite FR Coverage Map** (Zeile 240–339 in Epics) — macht Traceability nachvollziehbar.
- **Explizite Epic-Abhängigkeits-Grafik** — seltenes Qualitätsmerkmal.
- **Explizite „Out-of-Scope MVP"-Deklaration** (Zeile 427) — verhindert Scope-Creep.
- **Brownfield-Integration gut verankert** — Stories referenzieren bestehende Plattform-Patterns (`TransactionalCommandHandler`, `EinsatzRollenbesetzung`, `Gefahrenzone`, MapGL-Layer, Platform Storage Adapter).
- **Performance-Budgets numerisch** — jede Story mit Latenz-Ziel hat konkrete p95-Werte.
- **Sicherheits-/DSGVO-Überlegungen in Stories**: 5.5 (Schema-Versionierung), 5.6 (Export-Audit), 3.11 (DSGVO-Konformität der Telemetrie), 7.10 (DSGVO-Löschverhalten bei Einsatz-Löschung verifiziert).
- **ADR-Workflow integriert:** Story 1.1 erzeugt ADR-011 (Plattform-Push-Notifications), Story 1.3 erzeugt ADR-012 (`EinsatzScopeGuard`). Governance by design.

### Zusammenfassung Epic Quality

**Bewertung:** **Sehr hoch.** Die Epics/Stories sind auf einem überdurchschnittlichen Qualitätsniveau — explizite Coverage Map, dokumentierte Abhängigkeiten, konsequentes BDD-Format, integrierte Performance-/Sicherheits-/DSGVO-Aspekte. Die zwei Major-Issues sind nicht-blockierend (M1 bewusster Architektur-Trade-off, M2 einfache Text-Ergänzung in 1 Story-AC). Keine Critical Violations.

## Step 6 — Final Assessment

### Overall Readiness Status

## ✅ **READY TO PROCEED**

Das Planungs-Paket (PRD · Architecture · UX · Epics/Stories) ist **implementierungs-bereit**. Es gibt keine Critical-Blocker. Die identifizierten Issues sind klein (1 AC-Ergänzung, Dokumentations-Pflege) und können parallel zur Implementierung der ersten Stories gefixt werden.

### Score-Card

| Kategorie              | Bewertung                      | Kommentar                                                            |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------- |
| PRD-Vollständigkeit    | ✅ Hoch                        | 54 FRs + 38 NFRs klar, Q1–Q8 entschieden, explizite MVP/P2/P3-Scope  |
| Epic FR-Coverage       | ✅ 98 % hart / 100 % inkl. FR4 | 45/46 MVP-FRs direkt per Story abgedeckt; 1 Lücke nur AC-textuell    |
| UX-Alignment           | ✅ Sehr hoch                   | PRD-/Architecture-Konsistenz; Erweiterungen transparent dokumentiert |
| Architecture-Coverage  | ✅ Vollständig                 | 15 ARs + 29 UX-DRs + alle NFRs adressiert                            |
| Epic-Qualität          | ✅ Sehr hoch                   | Independence sauber, BDD-AC durchgängig, keine Forward-Deps          |
| Scope-Discipline       | ✅ Sehr hoch                   | 9 Out-of-Scope-FRs explizit gelistet und architektonisch vorbereitet |
| Dokumentations-Hygiene | ⚠️ Mittel                      | PRD nicht auf Stand der Architecture/UX-Entscheidungen               |

### Critical Issues (🔴)

**Keine.**

### Major Issues (🟠)

| ID  | Issue                                                              | Empfehlung                                                                                                                                                                                                                                           | Blocker? |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| M1  | Story 1.4 Big-Bang-Migration mit 11 Models + 7 Enums + allen Seeds | Akzeptieren als bewussten Architektur-Trade-off; ggf. als ADR-Kandidat dokumentieren                                                                                                                                                                 | Nein     |
| M2  | FR4 (Schutzmaßnahmen als Freitext) hat keine dedizierten Story-AC  | **Story 2.2 oder 2.3 um 1 AC ergänzen:** „Für jede Gefährdung kann der Sicherheitsbeauftragte Schutzmaßnahmen als Freitext (≤ 1000 Zeichen) hinterlegen; Feld ist Teil des Items-JSONB-Payloads und folgt Auto-Save- und Version-Chain-Mechanismus." | Nein     |

### Minor Concerns (🟡)

| ID  | Concern                                                                                                                | Empfehlung                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| m1  | PRD nicht auf Stand der UX/Epics-Entscheidungen (FR22 Label, Q4-Revision, Keyboard-Shortcuts, Deep-Links, Direction C) | **PRD-Pflege-Iteration** (5–10 Minuten): FR22 auf `[MVP — UX-hochgezogen]` umlabeln, Q4 als „revidiert in Epic-Phase" markieren, UX-Erweiterungen in einer kurzen „Post-PRD Refinements"-Sektion zusammenfassen |
| m2  | Soft-Forward-References in 2–3 Stories (3.11 → 7.9, 2.7 → Epic 6)                                                      | Akzeptieren — Stories sind jeweils selbst auslieferbar                                                                                                                                                          |
| m3  | Epic 7 „MVP-Polish" mit 11 Stories relativ groß und ohne neue FRs                                                      | Akzeptieren — Cross-Cutting-Konsolidierung ist legitim                                                                                                                                                          |
| m4  | Epic 1 borderline „Technical Foundation"-Epic                                                                          | Akzeptieren — minimal-sichtbarer User-Value (Route-Skeleton + Rollen) ist da                                                                                                                                    |

### Warnings aus Plattform-Dependencies

- **W1** AR1 (F1 Plattform-Push-Infrastruktur, ADR-011-Kandidat) und AR2 (F2 `EinsatzScopeGuard`, ADR-012-Kandidat) sind **neue Plattform-Bausteine**, die in Story 1.1–1.3 von Epic 1 aufgebaut werden. Deren ADR-Reviews können Kalenderzeit kosten — frühzeitig Reviewer einbinden.
- **W2** Gefahren-Modul-API (`Gefahrenzone`) wird als stabil vorausgesetzt. Vor Story 2.1-Implementation prüfen, dass die FK-Nutzung nicht fehlschlägt.
- **W3** MapGL-Lagekarte-Layer muss Sicherungsposten-Marker aufnehmen können. Vor Story 4.3 mit Lagekarte-Maintainer abstimmen, ob ein neuer Layer schnell realisiert ist.

### Empfohlene nächste Schritte

**Vor Implementierungs-Start (1–2 Stunden Aufwand):**

1. **Story 2.2 oder 2.3 um Schutzmaßnahmen-AC ergänzen** (M2). Kleinste denkbare Änderung: 1 neuer Given/When/Then-Block.
2. **PRD-Pflege-Iteration** (m1): FR22-Label aktualisieren, Q4-Revision-Note ergänzen, UX-Erweiterungen als „Post-PRD Refinements" dokumentieren.
3. **Plattform-Dependencies klären** (W1–W3):
   - Mit Plattform-Team absprechen, ob AR1 (Push-Infra) und AR2 (`EinsatzScopeGuard`) parallel zu Story 1.1–1.3 entwickelt oder als vorgelagerte Stories durchgezogen werden.
   - Gefahren-Modul-API-Stabilität verifizieren.
   - MapGL-Lagekarte-Maintainer kontaktieren.

**Start-Strategie für Implementation:**

1. **Sprint 1** (2 Wochen, Epic 1 größtenteils): Stories 1.1 (Push-Backend), 1.3 (`EinsatzScopeGuard`), 1.4 (Migration+Seeds), 1.6 (Route-Skeleton), 1.7 (Event-Registry-Framework) parallelisierbar durch Backend-Dev. Story 1.2 (Push-Clients) und 1.5 (Rollen-Guards) als Follow-up. Frontend-Dev beginnt parallel mit Feature-Slice-Setup (ebenfalls Story 1.6).
2. **Sprint 2**: Epic 2 (Gefährdungsbeurteilung + Sicherheitsregeln) + Start Epic 3 (Story 3.1–3.2 PSA-Grundlage). Epic 4 parallel beginnen.
3. **Sprint 3–4**: Epic 3 komplettieren (CBRN-Signatur-Interaktion, Konfliktauflösung, Telemetrie). Epic 5 (Vorfall+Export) parallel zur Backend-Kapazität.
4. **Sprint 5**: Epic 6 (Ampel-Dashboard), Epic 5 komplettieren.
5. **Sprint 6–7**: Epic 7 (MVP-Polish — A11y, Performance, Dark-Mode, Keyboard, Deep-Links, Telemetrie-Dashboard).
6. **Sprint 8**: Piloteinsatz-Vorbereitung, Übungs-Szenarien, Post-Pilot-Feedback-Runde.

**Empfohlene Kennzahlen-Überwachung ab Start:**

- **Signatur-Metrik** (aus Telemetrie Story 3.11): End-to-End CBRN-Hochstufung ≤ 90 s (p95) muss vor Pilot messbar sein.
- **Bundle-Size-Budget** kontinuierlich: aktueller Eigenschutz-Bundle vs. 150 kB gzip.
- **A11y-Audit-Gate** pro PR (Story 7.8 frühzeitig setzen — lieber inkrementell als erst am Ende).

### Final Note

Diese Assessment hat **0 Critical**, **2 Major** und **4 Minor** Issues identifiziert. Beide Major-Issues sind **nicht-blockierend** und können in < 1 Stunde adressiert werden (M2) bzw. als bewusster Trade-off akzeptiert werden (M1).

**Die Planungs-Artefakte liegen auf einem überdurchschnittlich hohen Qualitätsniveau:**

- Vollständige Traceability PRD → Architecture → UX → Epics → Stories
- Saubere Scope-Discipline mit expliziten Out-of-Scope-Deklarationen
- Messbare NFRs mit architektonischer Abdeckung und Test-/Audit-Stories
- Brownfield-Integration gut verankert in bestehende Plattform-Patterns
- Sicherheits-/DSGVO-/A11y-Aspekte durchgängig adressiert

**Empfehlung:** Nach Adressierung von M2 (1 AC-Ergänzung in Story 2.2/2.3) und optionaler PRD-Pflege-Iteration kann die Implementierung starten. M1 und die Minor-Concerns sind keine Blocker.

---

## Issue Remediation Log (2026-04-21)

Nach Vorlage des Assessments wurden **alle identifizierten Issues behoben** und strukturelle Anpassungen vorgenommen.

### Strukturelle Änderung

**PRD aus Versionierung entfernt und nach `_bmad-output/planning-artifacts/prd.md` verschoben.**

Der User hat entschieden, dass das PRD — wie die anderen BMAD-Planning-Artefakte (architecture.md, epics.md, ux-design-specification.md) — **nicht versioniert** werden soll. Das PRD ist in diesem Workflow kein eingefrorenes Produkt-Artefakt wie ein ADR, sondern ein iteratives Planning-Scratchpad, das bei jeder Planning-Runde neu generiert wird.

**Durchgeführte Schritte:**

1. `git rm --cached docs/prds/prd-415-eigenschutz.md` — PRD aus dem Git-Index entfernt (Working-Tree-Kopie bleibt); das erzeugt eine staged Deletion für den nächsten Commit.
2. `mv docs/prds/prd-415-eigenschutz.md _bmad-output/planning-artifacts/prd.md` — physischer Move in den gitignored Workflow-Ordner.
3. **Alle Frontmatter-Pfade aktualisiert** auf `_bmad-output/planning-artifacts/prd.md` in architecture.md, epics.md, ux-design-specification.md und diesem Report.
4. `docs/prds/`-Ordner bleibt leer; wird bei Bedarf manuell entfernt.

**Inhaltliche Änderungen bleiben erhalten** (FR22-MVP-Label, Q4-Revision, Q7-Finalisierung, Post-PRD Refinements) — sie wandern mit der Datei in den Workflow-Bereich.

**Konsequenzen für Git:**

- Staged: `D docs/prds/prd-415-eigenschutz.md` — muss committed werden, damit die PRD dauerhaft aus der Historie ausläuft.
- `_bmad-output/planning-artifacts/prd.md` ist gitignored und wird nicht mehr in `git status` auftauchen.
- **Hinweis:** Die PRD-Historie bleibt in Git erhalten bis zum Commit `34764b998 📝(eigenschutz): PRD #415 — MVP-Scope + Q1-Q8 Review`. Spätere Änderungen sind nur lokal.

### Behobene Issues

#### 🟠 Major — behoben

| ID     | Issue                                                    | Fix                                                                                                                                                                                                                                                                                                        | Ort                  |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **M1** | Story 1.4 Big-Bang-Migration                             | ✅ Architektonische Rationale als Block vor den Acceptance Criteria ergänzt: Entity-Kopplung, Read-Model-Integrität, Seeds-als-Pre-Requisite. Alternative „Splitting in Core/Projections/Seeds" explizit verworfen. ADR-Kandidaten-Hinweis integriert.                                                     | `epics.md` Story 1.4 |
| **M2** | FR4 (Schutzmaßnahmen-Freitext) ohne dediziertes Story-AC | ✅ Story 2.2 umbenannt in „Gefährdung erfassen mit 5×5-Risikomatrix **und Schutzmaßnahmen**". User Story und 4 neue AC-Blöcke ergänzt: Feld-Definition (≤ 2000 Zeichen), Persistenz in `payload.items[].schutzmassnahmen`, Leer-Fall + Ampel-Kopplung zu FR40, A11y (`aria-describedby`, Character-Count). | `epics.md` Story 2.2 |

#### 🟡 Minor — behoben

| ID       | Concern                                                                          | Fix                                                                                                                                                                                                                                                                 | Ort                   |
| -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **m1-a** | PRD-Label FR22 ≠ Epic-Scope                                                      | ✅ FR22 von `[Phase 2]` auf `[MVP — UX-hochgezogen]` umgelabelt, mit inline Begründungs-Note und Verweis auf AR1 + Post-PRD Refinements.                                                                                                                            | `prd.md` FR22         |
| **m1-b** | PRD Q4 (Prisma-Enum) nicht synchron mit Epic-Revision (`RollenDefinition`-Seeds) | ✅ Revisions-Hinweis am Q4-Kopf, durchgestrichene ursprüngliche Enum-Erwähnung, revidierte Umsetzungs-Sektion mit konkreten Code-Pfaden und Story-Verweisen (1.4, 1.5).                                                                                             | `prd.md` Q4           |
| **m1-c** | PRD Q7 (Export-Schema „iterativ")                                                | ✅ Status auf `✅ In Architecture finalisiert` gesetzt; konkretes `EigenschutzVorfallExportV1`-Zod-Schema + Speicherort + Erweiterbarkeit für Phase 2 dokumentiert.                                                                                                 | `prd.md` Q7           |
| **m1-d** | PRD spiegelt UX-Erweiterungen nicht wider                                        | ✅ Neue Sektion **„Post-PRD Refinements (2026-04-21)"** am Ende des PRD: R1–R5 Scope-Änderungen, Q-Decisions-Updates-Tabelle, Verweise auf AR1–AR15 und UX-DR1–UX-DR29, zusätzliche QA-Anforderungen (Senior-Operator-Testing, E2E, A11y-Audit, Performance-Audit). | `prd.md` neue Sektion |

#### Minor — bewusst akzeptiert (keine Änderung)

| ID  | Concern                                                           | Begründung                                                                                                                  |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| m2  | Soft-Forward-References in 2-3 Stories (3.11 → 7.9, 2.7 → Epic 6) | Stories selbst auslieferbar; Hinweise sind Orientierungshilfen, keine harten Blocker.                                       |
| m3  | Epic 7 groß (11 Stories, keine neuen FRs)                         | Cross-Cutting-Polish-Konsolidierung ist legitimes Muster.                                                                   |
| m4  | Epic 1 borderline Technical Foundation                            | Minimal-sichtbarer User-Value (Route-Skeleton + Rollen) ist vorhanden; Brownfield-Integration rechtfertigt Foundation-Epic. |

### Abnahme

| Prüfpunkt                                | Status                                                          |
| ---------------------------------------- | --------------------------------------------------------------- |
| 🔴 Critical Issues                       | keine → keine                                                   |
| 🟠 Major Issues (M1, M2)                 | 2 behoben → **0 offen**                                         |
| 🟡 Minor Concerns (m1 × 4 Untersubjekte) | alle 4 Unteraspekte behoben → **0 offen**                       |
| Soft-Forward-Refs (m2)                   | akzeptiert                                                      |
| Epic-Größen-Konzerne (m3, m4)            | akzeptiert                                                      |
| Dokument-Pfad-Konsistenz                 | ✅ alle Referenzen auf `_bmad-output/planning-artifacts/prd.md` |

### Verifikation

```
$ git status --short
→ D  docs/prds/prd-415-eigenschutz.md   # staged deletion (PRD aus Index entfernt)

# _bmad-output/planning-artifacts/prd.md ist jetzt gitignored und untracked —
# erscheint nicht in git status.
```

Status-Überblick:

- **`docs/prds/`** — leer, staged deletion des PRD
- **`_bmad-output/planning-artifacts/`** (alles gitignored, nicht in Git):
  - `prd.md` — verschobenes PRD mit allen Updates
  - `architecture.md`, `epics.md`, `ux-design-specification.md`, Report — konsistent mit neuem PRD-Pfad

### Finaler Readiness-Status

## 🟢 **READY — NO OPEN ISSUES**

Alle im Assessment identifizierten Issues sind adressiert. Das Planungs-Paket (PRD · Architecture · UX · Epics) ist pfad-konsistent, inhaltlich synchron und implementierungs-bereit. Der Start mit Epic 1 (Sprint 1) ist freigegeben.

---

**Assessment erstellt:** 2026-04-21
**Assessor:** Claude (Expert Product Manager) via `/bmad-check-implementation-readiness`
**Basis:** PRD · Architecture · UX-Spec · Epics · jeweils vollständig gelesen
**Status:** Complete (inkl. Issue Remediation)
