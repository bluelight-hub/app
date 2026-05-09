---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: 'complete'
completedAt: '2026-04-21'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
project_name: 'Bluelight Hub – Modul Eigenschutz (Einsatzkräfte-Sicherheit & PSA)'
source_issue: 'https://github.com/rubenvitt/bluelight-hub/issues/415'
user_name: 'Rubeen'
---

# Bluelight Hub – Modul Eigenschutz (Einsatzkräfte-Sicherheit & PSA) - Epic Breakdown

## Overview

Dieses Dokument enthält die vollständige Epic- und Story-Gliederung für das Modul **Eigenschutz** und zerlegt die Requirements aus PRD, UX-Design-Spezifikation und Architektur-Entscheidung in umsetzbare Stories.

**Interpretationshinweise (bindend, aus PRD Review Q1–Q8 und Architecture B1–B13):**

- **Q2 (PSA-Modell-Änderung):** FR10–FR16 sind NICHT als lineare 4-Stufen-Skala, sondern als **additive PSA-Profile** (`BASIS | INFEKTION | VU | CBRN_PATIENT | VOLLSCHUTZ`, TRBA 250 + DGUV Regel 105-003) umzusetzen. Mehrere Profile pro Einheit/Bereich gleichzeitig aktivierbar.
- **Q5 (Abschnitt ≡ EinsatzEinheit):** „Einsatzabschnitt" ist technisch `EinsatzEinheit` (FK `einheitId`). Keine eigene Abschnitts-Entity.
- **Q4 (Rollen-Hybrid, revidiert):** Eigenschutz-Rollen werden als `RollenDefinition`-Seed-Records mit Präfix `Eigenschutz: ...` persistiert. Kein neuer Prisma-Enum, kein Schema-Change an `EinsatzRollenbesetzung`.
- **UX-Abweichungen vom PRD (MVP-hochgezogen):** FR22 Push-Notifications (Tauri + Web-Push), `ConflictResolutionList` (NFR-C3), Keyboard-Shortcuts First-Class, Deep-Links pro Entität.

## Requirements Inventory

### Functional Requirements

#### A. Gefährdungsbeurteilung

- **FR1** `[MVP]` Der Sicherheitsbeauftragte kann für jeden Einsatzabschnitt (= `EinsatzEinheit`) eine Gefährdungsbeurteilung anlegen.
- **FR2** `[MVP]` Der Sicherheitsbeauftragte kann einzelne Gefährdungen mit Titel, Beschreibung, Eintrittswahrscheinlichkeit und Schadensausmaß erfassen; das System errechnet die Risikoklasse nach einem **5×5 qualitativen Schema** mit 4 Ergebnisklassen (Grün/Gelb/Orange/Rot).
- **FR3** `[MVP]` Der Sicherheitsbeauftragte kann Gefährdungen zu einer Beurteilung hinzufügen, ändern oder entfernen; jede Änderung wird als neue Version mit Zeitstempel und Urheber historisiert.
- **FR4** `[MVP]` Der Sicherheitsbeauftragte kann zu jeder Gefährdung Schutzmaßnahmen als Freitext hinterlegen.
- **FR5** `[MVP]` Der Sicherheitsbeauftragte kann zum Start einer Gefährdungsbeurteilung eine vorkonfigurierte Basis-Vorlage (Seed) wählen. Seed-Set MVP: **MANV · VU-Patientenversorgung · Sanitätsdienst Großveranstaltung · Betreuungseinsatz · CBRN-Patientenversorgung**.
- **FR6** `[MVP]` Der Sicherheitsbeauftragte kann eine Gefährdungsbeurteilung jederzeit neu bewerten; die vorige Version bleibt einsehbar.
- **FR7** `[Phase 2]` Der Admin kann Vorlagen für Gefährdungsbeurteilungen erstellen, versionieren und als aktiv/ausgelaufen markieren.
- **FR8** `[Phase 2]` Das System kann Gefährdungen aus dem Gefahren-Modul automatisch in die Gefährdungsbeurteilung eines Abschnitts übernehmen.
- **FR9** `[Phase 3]` Das System kann einsatzübergreifende Gefährdungs-Analysen (Häufigkeit, Wirkung von Schutzmaßnahmen) bereitstellen.

#### B. PSA-Verwaltung (Profil-Modell, Q2)

- **FR10** `[MVP]` Der Sicherheitsbeauftragte kann pro Einsatzbereich (`EinsatzEinheit`) **ein oder mehrere PSA-Profile** additiv aktivieren (`BASIS`, `INFEKTION`, `VU`, `CBRN_PATIENT`, `VOLLSCHUTZ`).
- **FR11** `[MVP]` Der Sicherheitsbeauftragte kann mehrere Einsatzbereiche gleichzeitig auswählen und deren PSA-Profil-Set in einem Vorgang ändern (Multi-Select + gemeinsame `propagationGroupId`).
- **FR12** `[MVP]` Das System verlangt bei jeder PSA-Profil-Änderung (Aktivierung oder Deaktivierung) eine Kurz-Begründung und markiert die Änderung als kritisches Ereignis.
- **FR13** `[MVP]` Das System hält zu jedem PSA-Profil eine Ausrüstungs-Checkliste bereit, die dem Abschnittsleiter bei Empfang sichtbar ist.
- **FR14** `[MVP]` Das System protokolliert jede PSA-Profil-Änderung mit altem Profil-Set, neuem Profil-Set, Urheber, Zeitstempel und Begründung.
- **FR15** `[Phase 2]` Das System kann auf Basis der aktuellen Gefährdungsbeurteilung und Gefahren-Daten ein PSA-Profil-Set als Empfehlung anzeigen.
- **FR16** `[Phase 2]` Der Admin kann die Ausrüstungs-Checklisten je PSA-Profil pflegen.

#### C. Bekanntgabe & Quittung

- **FR17** `[MVP]` Das System informiert alle betroffenen Abschnittsleiter bei einer PSA-Profil-Änderung mit einem nicht-ignorierbaren Hinweis (ARIA-`assertive` Banner, Push-Notification).
- **FR18** `[MVP]` Der Abschnittsleiter kann eine PSA-Profil-Änderung quittieren.
- **FR19** `[MVP]` Das System zeigt dem Sicherheitsbeauftragten an, welche Abschnitte eine Änderung bereits quittiert haben und welche nicht.
- **FR20** `[MVP]` Der Abschnittsleiter kann bei einer Änderung eine Rückmeldung (z. B. „Ausrüstung nicht verfügbar") an den Sicherheitsbeauftragten senden.
- **FR21** `[Phase 2]` Die Bekanntgabe kann pro Einheit innerhalb eines Abschnitts quittiert werden (statt nur auf Abschnitts-Ebene).
- **FR22** `[MVP – UX-hochgezogen]` Das System kann Push-Notifications (Tauri-Native + Web-Push) für kritische Ereignisse senden. (Ursprünglich Phase 2, durch UX-Spec in MVP gehoben.)

#### D. Sicherheitsregeln

- **FR23** `[MVP]` Der Sicherheitsbeauftragte kann Sicherheitsregeln als Freitext erfassen und einem Abschnitt oder dem Einsatz zuordnen.
- **FR24** `[MVP]` Das System zeigt Sicherheitsregeln den zugeordneten Abschnittsleitern/Einheiten an.
- **FR25** `[MVP]` Der Abschnittsleiter kann eine Sicherheitsregel quittieren; das System hält den Bekanntgabe-Status fest.
- **FR26** `[Phase 2]` Der Admin kann Sicherheitsregeln als Vorlagen erstellen und versionieren.

#### E. Sicherungsposten

- **FR27** `[MVP]` Der Sicherheitsbeauftragte kann Sicherungsposten mit Standort, zugewiesenem Personal und Zuständigkeitsbereich anlegen, ändern und löschen.
- **FR28** `[MVP]` Das System stellt Sicherungsposten als Marker auf der Lagekarte (MapGL) dar; von der Karte aus kann zur Detail-Ansicht navigiert werden (bi-direktionale Navigation).
- **FR29** `[MVP]` Der Sicherheitsbeauftragte kann Ablösezeiten als Textfeld zum Sicherungsposten pflegen.
- **FR30** `[Phase 2]` Das System kann Sicherungsposten-Schichten zeitlich planen und den aktuellen Schichtinhaber anzeigen.

#### F. Vorfallmeldung & Export

- **FR31** `[MVP]` Jede berechtigte Einsatzrolle (S-Stab, Abschnittsleiter, Einheitsführer) kann eine Vorfallmeldung mit Was/Wann/Wo/Beteiligte/Maßnahmen erfassen.
- **FR32** `[MVP]` Der Meldende kann kennzeichnen, ob der Vorfall Unfallkassen-relevant ist.
- **FR33** `[MVP]` Das System bindet an einen Vorfall die Gefährdungsbeurteilung, die aktiven PSA-Profile und die zum Zeitpunkt gültigen Sicherheitsregeln des Abschnitts als **unveränderlichen Snapshot** an (Innovations-Anker, materialisiertes JSONB + FK-Hinweise).
- **FR34** `[MVP]` Die Nachbereitungs-Rolle kann einen Vorfall als PDF mit zugehörigem Kontext exportieren (generisches Format).
- **FR35** `[MVP]` Die Nachbereitungs-Rolle kann einen Vorfall als strukturierten JSON-Datensatz exportieren (`EigenschutzVorfallExportV1`-Schema).
- **FR36** `[MVP]` Die Nachbereitungs-Rolle kann Vorfälle nach Einsatz, Abschnitt, Kennzeichnung „Unfallkasse-relevant" und Zeitraum filtern.
- **FR37** `[Phase 2]` Das System kann Vorfall-Exports in spezifischen Formaten von Landesunfallkassen ausgeben.

#### G. Ampel-Dashboard & Status

- **FR38** `[MVP]` Das System zeigt pro Abschnitt einen Sicherheitsstatus in drei Ausprägungen (Rot/Gelb/Grün), abgeleitet aus offenen Gefährdungen, ausstehenden Quittungen und gemeldeten Vorfällen (materialisierte `AmpelProjection`).
- **FR39** `[MVP]` Das Dashboard listet offene Vorfälle und ungelöste Rückmeldungen des aktuellen Einsatzes.
- **FR40** `[MVP]` Das Dashboard bietet eine Warn-Markierung bei unbearbeiteten Gefährdungen (keine Schutzmaßnahme dokumentiert) und bei nicht-quittierten PSA-Änderungen.

#### H. Versionierung, Audit & Historie

- **FR41** `[MVP]` Das System hält für jede Gefährdungsbeurteilung, PSA-Profil-Zuweisung, Sicherheitsregel und jeden Sicherungsposten einen vollständigen Änderungsverlauf (wer, wann, was, ggf. warum) als **State + Version-Chain** (`*_version`-Tabellen).
- **FR42** `[MVP]` Änderungen sind nicht löschbar; Korrekturen erzeugen neue Versionen (append-only Audit).
- **FR43** `[MVP]` Jeder Nutzer mit Lese-Recht kann die Änderungshistorie einer Entität einsehen.

#### I. Rollen & Berechtigungen

- **FR44** `[MVP]` Das System unterscheidet mindestens die Rollen `Eigenschutz: Sicherheitsbeauftragter`, `Eigenschutz: Abschnittsleiter`, `Eigenschutz: Einheitsführer`, `Eigenschutz: Nachbereitung` (als `RollenDefinition`-Records via `EinsatzRollenbesetzung`) sowie globale `UserRole.ADMIN`.
- **FR45** `[MVP]` Schreibzugriff auf Gefährdungsbeurteilung und PSA-Profile ist auf `Eigenschutz: Sicherheitsbeauftragter` und `UserRole.ADMIN` beschränkt (Permissions: `eigenschutz:gefaehrdungsbeurteilung:write`, `eigenschutz:psa:write`).
- **FR46** `[MVP]` Quittungen werden nur von der jeweils empfangenden Rolle abgegeben (Permission: `eigenschutz:sicherheitsregel:acknowledge`).
- **FR47** `[MVP]` Der Unfallkassen-Export ist auf `Eigenschutz: Nachbereitung` und `UserRole.ADMIN` beschränkt (Permission: `eigenschutz:vorfall:export`).

#### J. Offline & Sync

- **FR48** `[MVP]` Alle Lese- und Schreib-Operationen des Moduls funktionieren ohne Netzverbindung (Platform Storage Adapter, ADR-010).
- **FR49** `[MVP]` Bei Wiederverbindung synchronisiert das System automatisch, ohne Datenverlust bei unkritischen Feldern (LWW-Merge auf `updatedAt`).
- **FR50** `[MVP]` Bei Konflikten auf kritischen Feldern (PSA-Profil-Zuweisung, Gefährdungsbeurteilungs-Item) markiert das System den Konflikt und verlangt eine explizite Auflösung durch den Sicherheitsbeauftragten (`ConflictResolutionList` + `sync_conflict`-Persistenz).

#### K. Integration mit Plattform

- **FR51** `[MVP]` Alle Eigenschutz-Entitäten sind an einen Einsatz (`einsatzId`) gebunden und nur im Kontext dieses Einsatzes zugreifbar (via `EinsatzScopeGuard`).
- **FR52** `[MVP]` Das Modul ist über die Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz` (Frontend, Singular) und `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/...` (Backend, Plural) erreichbar.
- **FR53** `[MVP]` Vorfallmeldungen, PSA-Hochstufungen und Sicherheitsregeln nutzen den plattformweiten Benachrichtigungs-Kanal (Socket.IO Einsatz-Scope, ADR-006) + Push-Fallback (F1).
- **FR54** `[MVP]` Gefährdungsbeurteilungen können optional auf `Gefahrenzone`-Einträge referenzieren (FK `gefahrenzoneId`, reine Referenz im MVP).

### NonFunctional Requirements

#### Performance

- **NFR-P1** Das Öffnen der Eigenschutz-Route lädt im Regelfall (warmer Cache, Einsatz bereits geöffnet) in **≤ 2 s** auf dem Stabs-Tablet.
- **NFR-P2** Eine PSA-Profil-Änderung wird online in **≤ 2 s** in allen aktiven Client-Instanzen des Einsatzes sichtbar (p95).
- **NFR-P3** Das Anlegen einer Gefährdungsbeurteilung inklusive Speichern und Propagation benötigt online **≤ 1 s** pro Speicher-Vorgang (p95).
- **NFR-P4** Das Ampel-Dashboard aktualisiert den Status nach einer Änderung in **≤ 1 s** (p95).
- **NFR-P5** Der Unfallkassen-PDF-Export für einen Standard-Vorfall (≤ 5 Beteiligte, ≤ 10 Gefährdungen) wird in **≤ 5 s** erzeugt.
- **NFR-P6** Offline-→-Online-Sync bei typischer Sitzung (50 Änderungen, 3 Clients) erreicht Konsistenz in **≤ 5 s** nach Wiederverbindung.
- **NFR-P7** Das zusätzliche JS-Bundle des Features überschreitet **150 kB gzip** nicht.

#### Security

- **NFR-S1** Authentifizierung nutzt das bestehende Plattform-Auth-System (`JwtAuthGuard`); keine modul-spezifische Auth-Implementierung.
- **NFR-S2** Autorisierung wird serverseitig pro Endpoint gegen die definierten Rollen geprüft (`EinsatzScopeGuard` + `EigenschutzRolleGuard` / `PermissionsGuard`).
- **NFR-S3** Alle API-Calls nutzen HTTPS/TLS (Plattform-Default); modul-spezifische Klartext-Kommunikation ist verboten.
- **NFR-S4** Der Audit-Trail ist gegen nachträgliche Manipulation geschützt (append-only `*_version`-Tabellen, keine Update/Delete-Operationen auf Historien-Events).
- **NFR-S5** Personenbezogene Daten in Vorfallmeldungen unterliegen dem Löschkonzept der Plattform; das Modul erzeugt keine separate Langzeit-Speicherung außerhalb der Einsatz-Lebensdauer.
- **NFR-S6** Exports (PDF, JSON) enthalten nur Daten, zu denen die exportierende Rolle Leserecht hat.
- **NFR-S7** Fehlgeschlagene Autorisierungs-Versuche werden im Security-Log der Plattform protokolliert.

#### Reliability

- **NFR-R1** Das Modul kennt keine modul-spezifische Downtime-Toleranz, die schlechter ist als die Plattform-SLO.
- **NFR-R2** Der Offline-Modus (FR48) muss unabhängig von der Backend-Verfügbarkeit funktionieren; ein Backend-Ausfall darf nicht zu Datenverlust bei bereits lokal erfassten Änderungen führen.
- **NFR-R3** Kritische Änderungen (PSA-Profil, Vorfall-Meldung) werden mit **At-least-once-Semantik** über das Event-System propagiert; Deduplication erfolgt am Empfänger über `eventId`-LRU-Cache.
- **NFR-R4** Das System bietet pro Entität einen Wiederherstellungs-Pfad auf einen definierten früheren Versionsstand (aus dem Audit-Trail).

#### Accessibility

- **NFR-A1** UI-Komponenten erfüllen **WCAG 2.1 Level AA** als Mindest-Anforderung.
- **NFR-A2** Alle Status-Informationen (Ampel, PSA-Profile, Quittungs-Status) sind redundant durch Icon und Text (nicht nur Farbe) kommuniziert.
- **NFR-A3** Kritische Änderungs-Banner sind mit ARIA-Live-Region (`assertive`) an Screenreader ausgespielt und per Tastatur quittierbar.
- **NFR-A4** Formulare haben gekoppelte Labels, Fehlermeldungen sind per `aria-describedby` verknüpft; Pflichtfelder sind eindeutig markiert (`aria-required="true"`).
- **NFR-A5** Farbkontrast für normalen Text ≥ 4.5:1, für kritische Warnungen ≥ 7:1 (WCAG AAA).
- **NFR-A6** Alle primären Interaktionen sind vollständig per Tastatur erreichbar; Fokus-Indikator jederzeit sichtbar.
- **NFR-A7** Als Ziel-Konformität wird BITV 2.0 angestrebt (Ableitung aus WCAG 2.1 AA für öffentliche Organisationen).

#### Integration

- **NFR-I1** Eigenschutz-APIs nutzen ausschließlich das bestehende Einsatz-Routen-Nesting (Backend: `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/...`, Frontend: `/app/einsatz/$einsatzId/sicherheit/eigenschutz/...`).
- **NFR-I2** Alle Endpoints nutzen `@ApiWrappedResponse`/`@ApiWrappedCreatedResponse` und werden über `pnpm run generate-api` in den Shared-Client konsumiert; manuelle `fetch()`-Calls im Frontend sind nicht zulässig.
- **NFR-I3** Neue Backend-Events werden in der Event-Registry an allen vier Stellen registriert (Serializer, Deserializer, Adapters-Modul, Adapters-Index).
- **NFR-I4** Die Lagekarte-Integration nutzt die bestehenden MapGL-Layer; keine Wiedereinführung von Leaflet/Leaflet.PM.
- **NFR-I5** Offline-Schicht nutzt den Platform-Storage-Adapter (ADR-010); kein modul-spezifischer Storage-Mechanismus.

#### Scalability & Capacity

- **NFR-C1** Ein Einsatz mit bis zu **20 Abschnitten, 100 Einheiten, 50 aktiven Clients, 500 Gefährdungsbeurteilungs-Items, 200 Vorfällen** wird ohne spürbare Performance-Regression gegenüber Baseline unterstützt.
- **NFR-C2** Der Historien-Datenbestand eines Einsatzes kann beliebig wachsen, ohne dass die Abfrage aktueller Stände (FR38–FR40) langsamer als NFR-P4 wird (indexierte `AmpelProjection`).
- **NFR-C3** Bei Konflikten im Sync (FR50) skaliert die Konfliktauflösungs-UI mit der Anzahl paralleler Konflikte (Listen-Darstellung `ConflictResolutionList` statt modalem Stau).

#### Maintainability & Quality Gates

- **NFR-M1** Neue Domain-Logik (Backend) wird mit ≥ **80 %** Unit-Test-Coverage ausgeliefert; kritische Pfade (PSA-Hochstufung, Vorfall-Erfassung, Sync-Merge) zusätzlich mit E2E-Tests (Playwright/Cypress).
- **NFR-M2** Pre-commit-Hook `check:di:imports` muss ohne Violations durchlaufen (DI-Imports ohne `import type` für Injectable Classes — AC1).
- **NFR-M3** `pnpm --filter @bluelight-hub/backend check:arch` darf keine neuen Circular Dependencies melden.
- **NFR-M4** Linting (oxlint + oxfmt) muss ohne Fehler durchlaufen.
- **NFR-M5** Migrations werden benannt und idempotent-lauffähig angelegt (`prisma:migrate --name add_eigenschutz_*`).

### Additional Requirements

#### AR-Arch (aus Architecture)

- **AR1** **Plattform-Voraussetzung F1 (ADR-011 Kandidat):** Plattform-Push-Notifications-Infrastruktur in `infrastructure/push-notifications/` + `modules/push-notifications/` (VAPID-Keypair, `web-push@^3`, Subscription-Entity, Service-Worker `public/sw.js`, Tauri-Bridge via `@tauri-apps/plugin-notification`). Muss **vor oder parallel zu** Eigenschutz-MVP verfügbar sein.
- **AR2** **Plattform-Voraussetzung F2 (ADR-012 Kandidat):** `EinsatzScopeGuard` als plattform-neutraler Guard in `modules/auth/guards/einsatz-scope.guard.ts` — extrahiert `einsatzId` aus Request-Path, validiert User ↔ Einsatz über `EinsatzRollenbesetzung`, ergänzt Request-Kontext um Einsatz-Rollen und -Permissions.
- **AR3** **Prisma-Migration** `add_eigenschutz_module`: 11 neue Models (`Gefaehrdungsbeurteilung`, `GefaehrdungsbeurteilungVersion`, `GefaehrdungsbeurteilungVorlage`, `PsaProfilZuweisung`, `Sicherheitsregel`, `SicherheitsregelVersion`, `Sicherungsposten`, `SicherungspostenVersion`, `EigenschutzVorfall`, `EigenschutzTelemetryEvent`, `AmpelProjection`, `SyncConflict`) + 7 Enums (`PsaProfil`, `AmpelStatus`, `Eintrittswahrscheinlichkeit`, `Schadensausmass`, `Risikoklasse`, `KonfliktResolution`, ggf. `TelemetryEventName`). Kein Prisma-Enum `EigenschutzRolle` (Q4-Revision).
- **AR4** **Seed-Skript-Erweiterung** in `packages/backend/prisma/seed.ts`: 4 `RollenDefinition`-Records mit Präfix `Eigenschutz: ...` (idempotent) + 5 Vorlagen-Records (Q3-Szenarien).
- **AR5** **Event-Registry-Erweiterung** an **4 Stellen** für 14 neue Domain-Events (`GefaehrdungsbeurteilungErstellt`, `GefaehrdungsbeurteilungAktualisiert`, `PsaProfilGeaendert`, `SicherheitsregelAusgerufen`, `SicherheitsregelQuittiert`, `SicherungspostenEingerichtet`, `SicherungspostenAktualisiert`, `VorfallGemeldet`, `VorfallExportiert`, `QuittungAbgegeben`, `LueckeGemeldet`, `QuittungUeberfaelligEvent`, `KonfliktErkannt`, `KonfliktAufgeloest`): Serializer, Deserializer, Adapters-Modul, Adapters-Index.
- **AR6** **Hexagonales Backend-Layout:** `domain/eigenschutz/{aggregates,value-objects,events,repositories,enums,errors}`, `application/eigenschutz/{commands,queries,event-handlers,dto,errors}`, `infrastructure/eigenschutz/{repositories,projections,export,telemetry,conflict,event-adapters}`, `modules/eigenschutz/{controllers,guards}`.
- **AR7** **Feature-Slice Frontend:** `packages/frontend/src/features/eigenschutz/{api,hooks,schemas,stores,utils,ui/{atoms,molecules,organisms,pages},constants,index.ts}`.
- **AR8** **Telemetrie-Infrastruktur:** `EigenschutzTelemetryEvent`-Table + `POST /telemetry`-Endpoint + Prometheus-Metriken (`eigenschutz_psa_propagation_duration_seconds`, `eigenschutz_quittung_latency_seconds`, `eigenschutz_blind_ack_total`) via `@willsoto/nestjs-prometheus`.
- **AR9** **Optimistic Concurrency:** jede mutable Entity führt `version: Int @default(1)`; Commands führen `expectedVersion`; Mismatch → `Result.fail('ConflictDetected', ctx)` → HTTP 409 mit strukturiertem Body.
- **AR10** **Materialisierter Vorfall-Snapshot:** `kontextSnapshot JSONB` in `eigenschutz_vorfall` + FK-Hinweise zu `*_version`-Tabellen; Shape folgt `EigenschutzKontextSnapshotV1` Zod-Schema in `packages/shared/schemas/`.
- **AR11** **Ampel-Read-Model-Updater:** Event-Handler auf 9 Events (siehe AR5) aktualisieren `AmpelProjection` idempotent via `eventId`-Dedup; Re-Kalkulation der betroffenen Projection-Zeile.
- **AR12** **Re-Prompt-Scheduler:** `@nestjs/schedule`-Job alle 30 s sucht unquittierte Events > 5 min alt → emittiert `QuittungUeberfaelligEvent` + Eskalations-Notification an Einsatzleiter.
- **AR13** **PDF-Export-Renderer** `EigenschutzVorfallPdfRenderer` in `infrastructure/eigenschutz/export/` auf Basis `pdfkit@0.18`; arbeitet ausschließlich auf `kontextSnapshot` (self-contained).
- **AR14** **Export-Audit:** `VorfallExportiert`-Event mit `{exportedByUserId, format, downloadedAt}` → Outbox → Audit-Timeline.
- **AR15** **Neue Dependency:** `web-push@^3` im Backend (für F1 Web-Push); ansonsten keine neuen Dependencies (Tauri-Plugins + MapGL + alle Frontend-Libs bereits installiert).

### UX Design Requirements

#### UX-DR (aus UX-Spec)

- **UX-DR1** **`SeverityBanner` (Organism · Promotion-Kandidat):** Kritikalitäts-skalierter Banner mit CVA-Variants `variant: critical|warning|info` × `tone: assertive|polite` × `dismissible`; initial Fokus auf Primary-Action bei `critical-assertive`; Quittung per Enter/Space; `role="alert"` / `role="status"`.
- **UX-DR2** **`RiskMatrix5x5` (Organism):** 5×5-Raster für Risikobewertung mit `role="grid"`, Pfeiltasten-Navigation, Touch-Zellen ≥ 48×48 px, 4 Ergebnisklassen (Grün/Gelb/Orange/Rot) via `warnstufe-*`-Tokens.
- **UX-DR3** **`PSAProfileMultiSelect` (Organism):** Horizontale Chip-Gruppe für additive PSA-Profile (Basis/Infektion/VU/CBRN-Patient/Vollschutz); Chips als `role="checkbox"` mit `aria-checked`; Tooltip mit Ausrüstungs-Checkliste; `conflict`-Zustand mit Link zu `ConflictResolutionList`.
- **UX-DR4** **`AcknowledgmentStatusBadge` (Molecule · Promotion-Kandidat):** Kompakte Anzeige „X von Y quittiert" mit `tabular-nums`; States `pending|partial|complete|overdue`; Popover mit Empfänger-Liste.
- **UX-DR5** **`IncidentContextSnapshot` (Organism):** Zeitpunkt-genauer historischer Snapshot mit prominentem Header „Stand zum Vorfall-Zeitpunkt: …"; Nur-Lese-Kontextblöcke; `aria-readonly="true"`; Sprache im Präteritum.
- **UX-DR6** **`ConflictResolutionList` (Organism · Promotion-Kandidat · MVP-Scope):** Tabelle zur Auflösung von Sync-Konflikten (NFR-C3); `role="table"` mit sortierbaren Spalten; skaliert auf ≥ 20 parallele Konflikte ohne Modal-Stack.
- **UX-DR7** **`EquipmentChecklist` (Organism):** Ausrüstungs-Checkliste je aktivem PSA-Profil, je Einheit abhakbar; States `pristine|in-progress|complete|gap-reported`; Rück-Eskalations-Button „Ausrüstung nicht verfügbar" je Einheit.
- **UX-DR8** **`StatusIndicator` (Atom · Promotion-Kandidat):** Ampel-Icon + Label, Varianten `ok|warning|critical|info|offline`; Icon + Text immer kombiniert.
- **UX-DR9** **`SyncStatusBadge` (Molecule · Promotion-Kandidat):** Statuszeile-Badge „Lokal · 3 ungesynct"; Varianten `synced|pending|offline|conflict`; Popover mit Sync-Detail.
- **UX-DR10** **`VersionTimestampFooter` (Molecule · Promotion-Kandidat):** Mikro-Footer „Stand HH:MM · Name" mit Klick → Versions-Timeline-Popover.
- **UX-DR11** **`AmpelCard` + `AmpelDashboardRow` + `AmpelDashboard` (Organisms + Page):** Dashboard-Layouts mit **Direction B (Card Grid, Default)** und **Direction C (Focus + List, opt-in ab `lg` ≥ 1024 px)**; View-Toggle in Toolbar; persistent pro User via TanStack Store + Platform Storage.
- **UX-DR12** **`SecurityPostMapMarker` (Organism):** MapGL-Layer-Symbol für Sicherungsposten; Anlehnung an `features/taktische-zeichen/` oder eigene SVG.
- **UX-DR13** **`SeedTemplateEntryCard` (Molecule):** Einstiegskarte Seed-Szenario mit Titel, 1-Satz-Beschreibung, Icon, Gefährdungen-Zähler für die 5 Seed-Vorlagen (MANV/VU/Großveranstaltung/Betreuung/CBRN-Patient).
- **UX-DR14** **Dark-Mode-Severity-Tokens:** Nacht-Einsatz-tauglich (OLED-warmes Rot, blendarm); Kontrast-Verifikation in beiden Themes; eigene Token-Erweiterung: `severity-critical-assertive`, `psa-profile-*`, `sync-*`, `focus-ring-critical`.
- **UX-DR15** **Keyboard-Shortcuts First-Class (MVP):** Globale Shortcuts `⌘K` (Command Palette), `/` (Filter/Suche), `N` (Neue Gefährdungsbeurteilung), `V` (Neuer Vorfall), `Esc` (Drawer schließen), `?` (Shortcut-Hilfe); kontextuelle Shortcuts `Enter`/`Space`/`Pfeiltasten` in Drawer/Matrix/Chips; `<Kbd>`-Atom mit Plattform-Auto-Detect.
- **UX-DR16** **Command-Palette-Integration:** Jede MVP-Aktion hat einen Palette-Befehl mit Präfix „Eigenschutz: …" (via `cmdk`).
- **UX-DR17** **Deep-Links pro Entität (MVP):** Jede Entität direkt erreichbar (`…/gefaehrdungen/$id`, `…/vorfaelle/$id`, `…/sicherungsposten/$id`); „Link kopieren"-Button im Detail-Header.
- **UX-DR18** **Auto-Save mit 2 s Debounce:** Alle versionierten Entitäten auto-speichernd; Indikator in Statuszeile; optionaler „Version abschließen"-Button für bewusste Audit-Trail-Schnitte.
- **UX-DR19** **Multi-Select + Batch-Action-Bar:** Long-Press (Touch, 500 ms) oder Shift-Klick (Desktop) aktiviert Multi-Select auf Abschnittskarten; Batch-Action-Bar erscheint mit Aktion „PSA ändern für N Abschnitte".
- **UX-DR20** **Re-Prompt nach 5 min ohne Quittung:** Automatisches Re-Prompt + parallele `polite`-Eskalation an Einsatzleiter; Original-Banner bleibt bis Quittung oder Deeskalation.
- **UX-DR21** **Zero-Success-Toast-Policy:** Erfolg über Status-Änderung (Zeile grün, Banner weg), keine Pop-up-Toasts; Ausnahme: Export-Download-Info-Toast mit Retry-Link.
- **UX-DR22** **Alarm-Budget:** Max. 3 `assertive`-Banner gleichzeitig; darüber aggregiert ein Sammel-Banner.
- **UX-DR23** **Offline-UX ohne blockierende Modale:** Dezenter Offline-Badge in Statuszeile; Sync-Feedback durch Statuszeile-Wechsel, kein Toast; Konflikt-Hinweis als Mikro-`warning`-Banner mit Link „Konflikte auflösen".
- **UX-DR24** **Responsive-Strategie:** Mobile-first mit Breakpoints `sm/md/lg/xl/2xl`; Primär-Targets Stabs-Tablet + Desktop gleichrangig; Smartphone ≥ 360 px als Secondary; `AmpelCard` mit Container-Queries für verschiedene Slot-Breiten.
- **UX-DR25** **Drawer vs. Modal vs. Popover:** Drawer (`w-[480px]` Standard, `w-[640px]` bei Multi-Select ≥ 3) als Default für kontexterhaltende Aktionen; Modal nur für destruktive Bestätigungen; kein Modal-Stacking.
- **UX-DR26** **Filter-Bar persistent:** TanStack Store + URL-Query-Params (Shared-Link-fähig); Multi-Facet-Filter: Abschnitt · PSA-Profil · Zeitraum · „Unfallkasse-relevant" · Status.
- **UX-DR27** **Destructive Actions Pattern:** Begründungs-Feld pflicht, `status-danger`-Outline (nicht filled), Hinweis „Diese Änderung wird historisiert und kann nicht gelöscht werden"; kein „Bist du sicher?"-Modal.
- **UX-DR28** **A11y Quality Gates:** axe-Snapshot 0 Violations, Keyboard-only-Durchläufe für Journeys 1a/1b/2/4, Screenreader-Durchlauf NVDA + VoiceOver für Journey 1b, Kontrast-Verifikation Light + Dark, Touch-Target ≥ 48 px Primary / ≥ 44 px Secondary, `prefers-reduced-motion` respektiert, Storybook-State-Matrix komplett.
- **UX-DR29** **Telemetrie-Hooks im UI:** Client-seitige Erfassung von `assess_started` (Drawer geöffnet), `all_banners_delivered` (alle Empfänger informiert), `quittung_abgegeben` (pro Empfänger), `blind_ack` (< 2 s zwischen Banner-Öffnen und Tap); Batch-Upload an Backend-Telemetrie-Endpoint (AR8).

### FR Coverage Map

| Requirement                          | Epic                                      | Kurzbeschreibung                                               |
| ------------------------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| FR1                                  | Epic 2                                    | Gefährdungsbeurteilung pro Abschnitt anlegen                   |
| FR2                                  | Epic 2                                    | 5×5-Risikomatrix mit 4 Ergebnisklassen                         |
| FR3                                  | Epic 2                                    | Gefährdungen ändern/entfernen + Versionierung                  |
| FR4                                  | Epic 2                                    | Schutzmaßnahmen als Freitext                                   |
| FR5                                  | Epic 2                                    | Seed-Vorlage zum Kickstart wählen                              |
| FR6                                  | Epic 2                                    | Neu bewerten, Vorversion einsehbar                             |
| FR7                                  | _Out-of-Scope MVP (Phase 2)_              | Admin-UI Vorlagen-Versionierung                                |
| FR8                                  | _Out-of-Scope MVP (Phase 2)_              | Auto-Übernahme aus Gefahren-Modul                              |
| FR9                                  | _Out-of-Scope MVP (Phase 3)_              | Einsatzübergreifende Analytics                                 |
| FR10                                 | Epic 3                                    | PSA-Profile additiv aktivieren                                 |
| FR11                                 | Epic 3                                    | Multi-Select auf Einsatzbereiche                               |
| FR12                                 | Epic 3                                    | Begründungs-Pflicht bei PSA-Änderung                           |
| FR13                                 | Epic 3                                    | Ausrüstungs-Checkliste je PSA-Profil                           |
| FR14                                 | Epic 3                                    | PSA-Änderung protokollieren                                    |
| FR15                                 | _Out-of-Scope MVP (Phase 2)_              | PSA-Empfehlung aus Gefahren-Modul                              |
| FR16                                 | _Out-of-Scope MVP (Phase 2)_              | Checklisten-Pflege durch Admin                                 |
| FR17                                 | Epic 3                                    | Nicht-ignorierbarer Hinweis an Abschnittsleiter                |
| FR18                                 | Epic 3                                    | PSA-Quittung durch Abschnittsleiter                            |
| FR19                                 | Epic 3                                    | Quittungsstand für Sicherheitsbeauftragten                     |
| FR20                                 | Epic 3                                    | Rückmeldung (Ausrüstungs-Lücke) an S-Stab                      |
| FR21                                 | _Out-of-Scope MVP (Phase 2)_              | Einheits-Level-Quittung                                        |
| FR22                                 | Epic 3                                    | Push-Notifications (UX-hochgezogen)                            |
| FR23                                 | Epic 2                                    | Sicherheitsregeln Freitext + Zuordnung                         |
| FR24                                 | Epic 2                                    | Sicherheitsregeln-Anzeige an Empfänger                         |
| FR25                                 | Epic 2                                    | Sicherheitsregel-Quittung                                      |
| FR26                                 | _Out-of-Scope MVP (Phase 2)_              | Sicherheitsregel-Vorlagen                                      |
| FR27                                 | Epic 4                                    | Sicherungsposten CRUD                                          |
| FR28                                 | Epic 4                                    | Sicherungsposten als Lagekarten-Marker                         |
| FR29                                 | Epic 4                                    | Ablösezeiten als Textfeld                                      |
| FR30                                 | _Out-of-Scope MVP (Phase 2)_              | Sicherungsposten-Schichtplanung                                |
| FR31                                 | Epic 5                                    | Vorfallmeldung erfassen                                        |
| FR32                                 | Epic 5                                    | Unfallkassen-relevant kennzeichnen                             |
| FR33                                 | Epic 5                                    | Zeitpunkt-Snapshot (Innovations-Anker)                         |
| FR34                                 | Epic 5                                    | PDF-Export                                                     |
| FR35                                 | Epic 5                                    | JSON-Export                                                    |
| FR36                                 | Epic 5                                    | Vorfall-Filter (Abschnitt/Zeitraum/relevant)                   |
| FR37                                 | _Out-of-Scope MVP (Phase 2)_              | Landesunfallkassen-Formate                                     |
| FR38                                 | Epic 6                                    | Ampel-Status pro Abschnitt                                     |
| FR39                                 | Epic 6                                    | Offene Vorfälle + ungelöste Rückmeldungen                      |
| FR40                                 | Epic 6                                    | Warn-Markierung unbearbeitete Gefährdungen + PSA               |
| FR41                                 | Epic 2                                    | Änderungsverlauf (als Baseline für alle Entitäten)             |
| FR42                                 | Epic 2                                    | Append-only (als Baseline)                                     |
| FR43                                 | Epic 2                                    | Änderungshistorie einsehbar (als Baseline)                     |
| FR44                                 | Epic 1                                    | Rollen `Eigenschutz: …`                                        |
| FR45                                 | Epic 1                                    | Schreibzugriff auf Gefährdung/PSA                              |
| FR46                                 | Epic 1                                    | Quittungen nur von empfangender Rolle                          |
| FR47                                 | Epic 1                                    | Export-Permission (Nachbereitung/Admin)                        |
| FR48                                 | Epic 1 (Fundament) + Cross-Cutting        | Offline-Lese/-Schreibbetrieb                                   |
| FR49                                 | Epic 1 (Fundament) + Cross-Cutting        | Auto-Sync ohne Datenverlust (unkritisch)                       |
| FR50                                 | Epic 3                                    | Konfliktauflösung kritischer Felder (`ConflictResolutionList`) |
| FR51                                 | Epic 1                                    | Einsatz-Binding + `EinsatzScopeGuard`                          |
| FR52                                 | Epic 1                                    | Route-Integration + Einsatz-Navigation                         |
| FR53                                 | Epic 1                                    | Plattform-Notification-Kanal-Integration                       |
| FR54                                 | Epic 2                                    | Optionale FK `gefahrenzoneId`                                  |
| **AR1** (F1 Push)                    | Epic 1                                    | Plattform-Push-Infrastruktur (ADR-011)                         |
| **AR2** (F2 Guard)                   | Epic 1                                    | `EinsatzScopeGuard` (ADR-012)                                  |
| **AR3** Migration                    | Epic 1                                    | `add_eigenschutz_module`                                       |
| **AR4** Seeds                        | Epic 1                                    | RollenDefinitions + 5 Vorlagen                                 |
| **AR5** Event-Registry               | Epic 1 (Framework) + pro Epic (Events)    | 4-Stellen-Registrierung                                        |
| **AR6** Backend-Layout               | Epic 1                                    | Hexagonal `domain/application/infrastructure/modules`          |
| **AR7** Frontend-Layout              | Epic 1                                    | `features/eigenschutz/...`                                     |
| **AR8** Telemetrie                   | Epic 3 (Backend) + Epic 7 (Polish)        | Endpoint + Prometheus                                          |
| **AR9** Optimistic Concurrency       | Epic 3 + verteilt                         | `version`-Feld, HTTP 409                                       |
| **AR10** Snapshot                    | Epic 5                                    | `kontextSnapshot JSONB` + Zod-Schema                           |
| **AR11** Ampel-Updater               | Epic 6 (zentral) + inkrementell ab Epic 2 | Event-Handler-Kette                                            |
| **AR12** Re-Prompt-Scheduler         | Epic 3                                    | 30 s Scheduler + Eskalation                                    |
| **AR13** PDF-Renderer                | Epic 5                                    | `EigenschutzVorfallPdfRenderer`                                |
| **AR14** Export-Audit                | Epic 5                                    | `VorfallExportiert`-Event                                      |
| **AR15** web-push Dep                | Epic 1                                    | Backend-Dependency                                             |
| **UX-DR1** SeverityBanner            | Epic 3                                    |                                                                |
| **UX-DR2** RiskMatrix5x5             | Epic 2                                    |                                                                |
| **UX-DR3** PSAProfileMultiSelect     | Epic 3                                    |                                                                |
| **UX-DR4** AcknowledgmentStatusBadge | Epic 3                                    |                                                                |
| **UX-DR5** IncidentContextSnapshot   | Epic 5                                    |                                                                |
| **UX-DR6** ConflictResolutionList    | Epic 3                                    |                                                                |
| **UX-DR7** EquipmentChecklist        | Epic 3                                    |                                                                |
| **UX-DR8** StatusIndicator           | Epic 3 + Epic 6                           |                                                                |
| **UX-DR9** SyncStatusBadge           | Epic 7                                    |                                                                |
| **UX-DR10** VersionTimestampFooter   | Epic 2                                    |                                                                |
| **UX-DR11** AmpelCard/Dashboard      | Epic 6                                    |                                                                |
| **UX-DR12** SecurityPostMapMarker    | Epic 4                                    |                                                                |
| **UX-DR13** SeedTemplateEntryCard    | Epic 2                                    |                                                                |
| **UX-DR14** Dark-Mode-Severity       | Epic 7                                    |                                                                |
| **UX-DR15** Keyboard-Shortcuts       | Epic 7                                    |                                                                |
| **UX-DR16** Command-Palette          | Epic 7                                    |                                                                |
| **UX-DR17** Deep-Links               | Epic 7                                    |                                                                |
| **UX-DR18** Auto-Save 2s             | Epic 2                                    |                                                                |
| **UX-DR19** Multi-Select             | Epic 3                                    |                                                                |
| **UX-DR20** Re-Prompt 5 min          | Epic 3                                    |                                                                |
| **UX-DR21** Zero-Success-Toast       | Epic 7                                    |                                                                |
| **UX-DR22** Alarm-Budget             | Epic 3                                    |                                                                |
| **UX-DR23** Offline-UX               | Epic 7                                    |                                                                |
| **UX-DR24** Responsive               | Epic 7 (Cross-Cutting)                    |                                                                |
| **UX-DR25** Drawer/Modal/Popover     | Epic 6 (universell)                       |                                                                |
| **UX-DR26** Filter-Bar               | Epic 5                                    |                                                                |
| **UX-DR27** Destructive Actions      | Epic 7                                    |                                                                |
| **UX-DR28** A11y Quality Gates       | Epic 7                                    |                                                                |
| **UX-DR29** Telemetrie-Hooks         | Epic 3 + Epic 7                           |                                                                |

## Epic List

### Epic 1: Plattform-Voraussetzungen & Eigenschutz-Fundament

**Epic Goal:** Die Plattform ist bereit für Eigenschutz: Push-Notifications-Infrastruktur, `EinsatzScopeGuard`, Prisma-Schema mit 11 Models und Seeds, Event-Registry, feature-slices im Backend und Frontend, Rollen-/Permission-Gerüst und die Eigenschutz-Basis-Route sind etabliert. Nach diesem Epic kann ein berechtigter Nutzer (Eigenschutz-Rolle via `EinsatzRollenbesetzung`) die leere Eigenschutz-Startseite seines Einsatzes öffnen; nicht-berechtigte Nutzer werden abgewiesen; alle nachfolgenden Epics haben ein stabiles technisches Fundament.

**FRs abgedeckt:** FR44, FR45, FR46, FR47, FR48 (Grundlage), FR49 (Grundlage), FR51, FR52, FR53
**ARs abgedeckt:** AR1, AR2, AR3, AR4, AR5 (Framework), AR6, AR7, AR15

---

### Epic 2: Gefährdungsbeurteilung & Sicherheitsregeln

**Epic Goal:** Als Sicherheitsbeauftragter (Markus) kann ich für einen Einsatzabschnitt eine Gefährdungsbeurteilung mit 5×5-Risikomatrix, Schutzmaßnahmen und Versionierung anlegen – ausgehend von 5 Seed-Vorlagen (MANV, VU, Großveranstaltung, Betreuung, CBRN-Patientenversorgung) oder von Null – und parallel Sicherheitsregeln als Freitext erfassen, zuweisen und durch Abschnittsleiter quittieren lassen. Jede Änderung ist versioniert und auditierbar. (Journey 1a + Sicherheitsregeln-Mini-Loop vollständig.)

**FRs abgedeckt:** FR1, FR2, FR3, FR4, FR5, FR6, FR23, FR24, FR25, FR41, FR42, FR43, FR54
**UX-DRs abgedeckt:** UX-DR2, UX-DR10, UX-DR13, UX-DR18

---

### Epic 3: PSA-Profile & kritische Bekanntgabe (CBRN-Signatur-Interaktion)

**Epic Goal:** Als Sicherheitsbeauftragter kann ich additive PSA-Profile (`BASIS | INFEKTION | VU | CBRN_PATIENT | VOLLSCHUTZ`) für einen oder mehrere Einsatzbereiche gleichzeitig aktivieren oder deaktivieren – mit Begründungs-Pflicht und Propagation an alle betroffenen Abschnittsleiter in ≤ 2 s. Als Abschnittsleiter (Steffi) empfange ich die Änderung als nicht-ignorierbaren Banner mit Ausrüstungs-Checkliste, quittiere sie oder melde Lücken zurück an den Stab. Parallele Änderungen auf dem gleichen Profil werden als Konflikt erkannt und über die `ConflictResolutionList` explizit aufgelöst. Push-Notifications (Tauri-Native + Web-Push) tragen kritische Events auch an nicht-aktive Clients. Telemetrie-Timestamps (`assess_started`, `all_banners_delivered`, `blind_ack`) messen den CBRN-Moment für das Pilot-Review. (Journey 1b + Journey 2 vollständig; Signatur-Interaktion ≤ 90 s.)

**FRs abgedeckt:** FR10, FR11, FR12, FR13, FR14, FR17, FR18, FR19, FR20, FR22, FR50
**ARs abgedeckt:** AR8 (Backend-Teil), AR9, AR11 (PSA-Teil), AR12
**UX-DRs abgedeckt:** UX-DR1, UX-DR3, UX-DR4, UX-DR6, UX-DR7, UX-DR8 (Badge-Teil), UX-DR19, UX-DR20, UX-DR22, UX-DR29 (Client-Teil)

---

### Epic 4: Sicherungsposten-Verwaltung & Lagekarten-Integration

**Epic Goal:** Als Sicherheitsbeauftragter kann ich Sicherungsposten mit Standort, zugewiesenem Personal, Zuständigkeitsbereich und Ablösezeiten anlegen, ändern und löschen. Die Sicherungsposten werden als Marker auf der MapGL-Lagekarte dargestellt; von der Karte aus navigiere ich direkt in die Detail-Ansicht – und umgekehrt. Jede Änderung ist versioniert. Das Eigenschutz-Modul und die Lagekarte sind bidirektional verzahnt.

**FRs abgedeckt:** FR27, FR28, FR29
**UX-DRs abgedeckt:** UX-DR12

---

### Epic 5: Vorfallmeldung & Unfallkassen-Export

**Epic Goal:** Als Einsatzkraft, Abschnittsleiter oder Sicherheitsbeauftragter kann ich einen Vorfall mit Was/Wann/Wo/Beteiligte/Maßnahmen erfassen und als „Unfallkasse-relevant" kennzeichnen. Das System hängt automatisch den zeitpunktgenauen Kontext-Snapshot (Gefährdungsbeurteilung + aktive PSA-Profile + Sicherheitsregeln zur Vorfallzeit) als unveränderlichen Anhang an – sichtbar, nicht veränderbar. Als Nachbereitung (Sabine) filtere ich Vorfälle nach Einsatz, Abschnitt, Unfallkassen-Relevanz und Zeitraum und exportiere einen Vorfall als PDF (≤ 5 s) oder strukturierten JSON-Datensatz (`EigenschutzVorfallExportV1`-Schema) für die Unfallkassen-Meldung. Jeder Export erzeugt einen `VorfallExportiert`-Audit-Eintrag. (Journey 4 vollständig + Innovations-Anker Kontext-Snapshot.)

**FRs abgedeckt:** FR31, FR32, FR33, FR34, FR35, FR36
**ARs abgedeckt:** AR10, AR13, AR14
**UX-DRs abgedeckt:** UX-DR5, UX-DR26

---

### Epic 6: Ampel-Dashboard & Live-Status-Übersicht

**Epic Goal:** Als Sicherheitsbeauftragter sehe ich auf der Eigenschutz-Startseite ein Ampel-Dashboard mit Rot/Gelb/Grün-Status pro Einsatzabschnitt – abgeleitet aus offenen Gefährdungen ohne Schutzmaßnahme, nicht-quittierten PSA-Änderungen und offenen Vorfällen – in < 2 s erfassbar. Eine Seitenpanel-Liste zeigt offene Vorfälle und ungelöste Rückmeldungen des aktuellen Einsatzes; Warn-Markierungen erscheinen bei unbearbeiteten Gefährdungen und nicht-quittierten PSA-Änderungen. Der Dashboard-View ist zwischen **Card Grid (Direction B, Default)** und **Focus + List (Direction C, opt-in ab ≥ 1024 px)** umschaltbar, persistent pro User. Die Ampel-Projektion wird event-getrieben aus allen Eigenschutz-Ereignissen ≤ 1 s aktualisiert.

**FRs abgedeckt:** FR38, FR39, FR40
**ARs abgedeckt:** AR11 (zentral, finalisiert für alle Event-Quellen)
**UX-DRs abgedeckt:** UX-DR8 (Dashboard-Teil), UX-DR11, UX-DR25

---

### Epic 7: MVP-Polish: Accessibility, Keyboard, Dark-Mode, Deep-Links & Telemetrie

**Epic Goal:** Das Eigenschutz-Modul ist pilot-ready: WCAG 2.1 AA + BITV 2.0 konform (axe-Audit ohne Violations, Screenreader-Durchläufe, Touch-Target ≥ 48 px Primary), Keyboard-Shortcuts als First-Class-Bedienungspfad (`⌘K`, `/`, `N`, `V`, `?`, kontextuelle Shortcuts), Command-Palette-Integration für alle MVP-Aktionen, Deep-Links pro Entität mit „Link kopieren"-Button, Dark-Mode-Severity-Tokens nachteinsatz-tauglich, Offline-UX ohne blockierende Modale (inkl. `SyncStatusBadge`), Zero-Success-Toast-Policy, Destructive-Actions-Pattern, Alarm-Budget (max. 3 `assertive`-Banner). Telemetrie-Backend-Endpoint + Prometheus-Metriken sind für das Piloteinsatz-Review einsatzbereit. Performance-Gates (Route-TTI ≤ 2 s, Bundle ≤ 150 kB gzip) sind verifiziert.

**FRs abgedeckt:** _keine neuen — querschnittlicher Feinschliff über Epic 1–6_
**ARs abgedeckt:** AR8 (Frontend-Telemetrie + Prometheus-Auswertung)
**UX-DRs abgedeckt:** UX-DR9, UX-DR14, UX-DR15, UX-DR16, UX-DR17, UX-DR21, UX-DR23, UX-DR24, UX-DR27, UX-DR28, UX-DR29 (Completeness-Teil)
**NFRs zentral abgedeckt:** NFR-A1-A7, NFR-P1, NFR-P7, NFR-M1 (E2E-Tests der Journeys), NFR-R3 (Client-Dedup)

---

### Epic-Abhängigkeiten

```
Epic 1 (Fundament)
  ├── Epic 2 (Gefährdung + Sicherheitsregeln)
  ├── Epic 3 (PSA + Konfliktauflösung)
  │    └── benötigt Epic 1 Push-Infrastruktur + EinsatzScopeGuard
  ├── Epic 4 (Sicherungsposten) — parallel zu Epic 2/3
  ├── Epic 5 (Vorfall + Export)
  │    └── Snapshot referenziert Epic 2 (Gefährdung) + Epic 3 (PSA-Profile)
  │        (funktioniert auch ohne sie: Snapshot kann leer/teilweise sein)
  ├── Epic 6 (Ampel-Dashboard)
  │    └── konsumiert Events aus Epic 2-5 (standalone implementierbar,
  │        zeigt aber echte Werte erst mit Event-Lieferanten)
  └── Epic 7 (MVP-Polish) — cross-cutting nach Epic 1-6
```

**Hinweis Out-of-Scope MVP (Phase 2/3):** FR7, FR8, FR9, FR15, FR16, FR21, FR26, FR30, FR37 werden in diesem Epic-Breakdown **nicht** behandelt. Architektur und Schema sind aber bereits so ausgelegt, dass sie ohne Breaking Changes ergänzt werden können (z. B. `GefaehrdungsbeurteilungVorlageVersion`-Tabelle für FR7).

---

## Epic 1: Plattform-Voraussetzungen & Eigenschutz-Fundament

Die Plattform ist bereit für Eigenschutz: Push-Notifications-Infrastruktur, `EinsatzScopeGuard`, Prisma-Schema mit 11 Models und Seeds, Event-Registry, Feature-Slices im Backend und Frontend, Rollen-/Permission-Gerüst und die Eigenschutz-Basis-Route sind etabliert. Nach diesem Epic kann ein berechtigter Nutzer die leere Eigenschutz-Startseite seines Einsatzes öffnen; nicht-berechtigte Nutzer werden abgewiesen; alle nachfolgenden Epics haben ein stabiles technisches Fundament.

### Story 1.1: Plattform Push-Notifications Backend (ADR-011)

As a **Plattform-Admin**,
I want **eine plattformweite Push-Notification-Infrastruktur mit VAPID-Signing, Subscription-Management und `web-push`-Integration**,
So that **Eigenschutz und andere Module kritische Events an Clients ausliefern können, auch wenn die Web-/Tauri-Anwendung nicht im Vordergrund ist**.

**Acceptance Criteria:**

**Given** ein authentifizierter Nutzer mit aktivem Browser-Tab
**When** er sein Gerät für Push-Notifications registriert (`POST /api/users/me/push-subscriptions` mit `{endpoint, keys.p256dh, keys.auth}`)
**Then** wird eine `PushSubscription`-Entity persistiert und der Endpoint ist für Server-seitiges Push verfügbar
**And** der Endpoint ist idempotent (doppeltes Registrieren desselben `endpoint` ersetzt die Subscription ohne Fehler).

**Given** eine gültige `PushSubscription`
**When** der `PushNotificationsService.send(userId, payload)` aufgerufen wird
**Then** wird die Notification mit VAPID signiert und über `web-push@^3` an den Browser-Push-Service gesendet
**And** fehlgeschlagene Endpoints (410 Gone, 404) werden automatisch aus der Datenbank entfernt
**And** der Service ist als `@Injectable()` über DI nutzbar (Import ohne `import type`, AC1).

**Given** das VAPID-Keypair
**When** die Anwendung startet
**Then** wird der Public-Key aus `import.meta.env.VITE_VAPID_PUBLIC_KEY` verfügbar gemacht
**And** der Private-Key wird über `@dotenvx/dotenvx` aus der Secret-Umgebung gelesen
**And** bei fehlendem Keypair startet der Service nicht (Fail-Fast).

**Given** eine neue Subscription wurde gespeichert
**When** das Ereignis protokolliert wird
**Then** erscheint ein strukturierter Log-Eintrag mit `userId`, `endpointHost`, `createdAt`
**And** es werden keine Secret-Keys geloggt.

**Given** die ADR-011 (Plattform-Push-Notifications)
**When** die Story abgeschlossen ist
**Then** ist die ADR-Datei `docs/adr/adr-011-plattform-push-notifications.md` unter Dokumentation der Entscheidung angelegt.

**And** `web-push@^3` ist als Backend-Dependency in `packages/backend/package.json` ergänzt (AR15).

### Story 1.2: Plattform Push-Clients (Service-Worker + Tauri-Bridge)

As a **Einsatzkraft**,
I want **dass kritische Events meiner Plattform auch dann bei mir ankommen, wenn die Anwendung im Hintergrund ist – auf Browser und Tauri-Desktop gleichermaßen**,
So that **ich PSA-Hochstufungen und Vorfall-Meldungen nicht verpasse**.

**Acceptance Criteria:**

**Given** ein Browser mit aktivem Service-Worker-Support
**When** der Nutzer Push-Benachrichtigungen zum ersten Mal akzeptiert
**Then** registriert die Anwendung `public/sw.js` als Service-Worker
**And** der Service-Worker ruft `self.registration.showNotification(...)` bei `push`-Events auf
**And** der angezeigte Notification-Payload enthält zwingend eine `eventId` zur Client-seitigen Deduplication (NFR-R3).

**Given** ein Tauri-Desktop-Client
**When** der Hook `useCriticalNotification` dispatched
**Then** nutzt er `@tauri-apps/plugin-notification` statt Web-Push (automatische Plattform-Erkennung)
**And** der Payload-Content ist identisch zum Web-Push-Format (gleiche `eventId`, gleiches Headline/Body-Schema).

**Given** der Nutzer hat Push-Berechtigungen verweigert
**When** er die Anwendung nutzt
**Then** fällt die UX auf In-App-Banner zurück
**And** es wird keine wiederholte Berechtigungs-Anfrage ausgelöst.

**Given** ein Component-Hook `useCriticalNotification`
**When** er von einem beliebigen Feature genutzt wird
**Then** akzeptiert er ein `{title, body, eventId, url?, priority}`-Objekt
**And** löst Browser-Notification oder Tauri-Notification transparent aus.

**And** der `eventId`-LRU-Cache (Größe ~200) im Client-Store verhindert, dass Banner doppelt angezeigt werden, wenn Push-Payload und WebSocket-Event parallel ankommen.

### Story 1.3: `EinsatzScopeGuard` als Plattform-Pattern (ADR-012)

As a **Backend-Entwickler eines einsatz-scoped Moduls**,
I want **einen wiederverwendbaren `EinsatzScopeGuard`, der User ↔ Einsatz validiert und Einsatz-Rollen/-Permissions in den Request-Kontext schreibt**,
So that **ich einsatzbezogene Endpoints einheitlich absichere, ohne Inline-Checks in jedem Controller**.

**Acceptance Criteria:**

**Given** ein Controller-Endpoint `@UseGuards(JwtAuthGuard, EinsatzScopeGuard)` mit Parameter `:einsatzId`
**When** ein authentifizierter Nutzer den Endpoint aufruft
**Then** extrahiert der Guard die `einsatzId` aus dem Request-Path (konfigurierbar via `@EinsatzParam`-Decorator)
**And** validiert über `EinsatzRollenbesetzung`, dass der Nutzer eine aktive, nicht-abgelaufene Besetzung für diesen Einsatz besitzt
**And** ergänzt den Request-Context um `{einsatzRollenNamen: string[], einsatzPermissions: string[]}`.

**Given** ein Nutzer ohne aktive `EinsatzRollenbesetzung` für den Einsatz
**When** er einen geschützten Endpoint aufruft
**Then** wirft der Guard eine `ForbiddenException` (HTTP 403)
**And** der Fehler wird im Security-Log der Plattform protokolliert (NFR-S7).

**Given** der Guard wird in einen Controller eingebunden
**When** der Entwickler keine `einsatzId`-Param-Annotation findet
**Then** fallback auf den Pfad-Parameter-Namen `einsatzId`
**And** bei fehlendem Pfad-Parameter wirft der Guard einen Initialisierungs-Fehler beim Modul-Load (Fail-Fast).

**Given** Tests für `EinsatzScopeGuard`
**When** sie ausgeführt werden
**Then** decken sie ab: (a) happy path mit aktiver Rollenbesetzung, (b) keine Rollenbesetzung, (c) abgelaufene Rollenbesetzung, (d) fehlende `einsatzId` im Pfad, (e) ungültige `einsatzId`
**And** erreichen ≥ 80 % Coverage (NFR-M1).

**Given** die ADR-012 (EinsatzScopeGuard als Plattform-Pattern)
**When** die Story abgeschlossen ist
**Then** ist `docs/adr/adr-012-einsatz-scope-guard.md` angelegt
**And** beschreibt das Pattern inkl. Beispiel-Einbindung in einen Controller.

### Story 1.4: Prisma-Migration `add_eigenschutz_module` + Seeds

As a **Backend-Entwickler**,
I want **eine einzige benannte Prisma-Migration, die alle 11 Eigenschutz-Models und 7 Enums anlegt und gleichzeitig die 4 Eigenschutz-`RollenDefinition`-Records und 5 Seed-Vorlagen idempotent seedet**,
So that **das Eigenschutz-Backend in einer lauffähigen Datenbank-Baseline startet**.

> **Architektonische Rationale (bewusster Trade-off):** Diese Story erzeugt alle 11 Models + 7 Enums + Seeds in **einer** Migration statt story-granularer Tabellen-Erstellung. Begründung: (a) **Hohe Entity-Kopplung** — `PsaProfilZuweisung` referenziert `EinsatzEinheit` + `Gefaehrdungsbeurteilung`, `EigenschutzVorfall` referenziert beide; stückweise Migration würde viele Teil-Zustände mit unvollständigen FK-Constraints erzeugen. (b) **Read-Model-Integrität** — `AmpelProjection` und `SyncConflict` müssen synchron mit den Quell-Tabellen existieren, sonst schlagen Event-Handler (AR11) beim Bootstrap fehl. (c) **Seeds als operatives Paket** — die 4 Rollen + 5 Vorlagen sind Pre-Requisites für alle nachfolgenden Epic-2-bis-6-Stories; getrennte Migration würde erste User-Value-Stories blockieren. Alternative „Splitting in Core/Projections/Seeds" wurde verworfen, da sie die operative Migration-Hygiene nicht verbessert, aber Team-Koordinations-Overhead erzeugt. Dieser Trade-off ist als **ADR-Kandidat** zu dokumentieren, falls nachgelagerte Planungs-Reviews ihn hinterfragen.

**Acceptance Criteria:**

**Given** eine leere oder bestehende Datenbank
**When** `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_eigenschutz_module` ausgeführt wird
**Then** werden 11 neue Models angelegt: `Gefaehrdungsbeurteilung`, `GefaehrdungsbeurteilungVersion`, `GefaehrdungsbeurteilungVorlage`, `PsaProfilZuweisung`, `Sicherheitsregel`, `SicherheitsregelVersion`, `Sicherungsposten`, `SicherungspostenVersion`, `EigenschutzVorfall`, `EigenschutzTelemetryEvent`, `AmpelProjection`, `SyncConflict`
**And** 7 Enums: `PsaProfil`, `AmpelStatus`, `Eintrittswahrscheinlichkeit`, `Schadensausmass`, `Risikoklasse`, `KonfliktResolution`, `TelemetryEventName`
**And** kein Prisma-Enum `EigenschutzRolle` (Q4-Revision)
**And** alle Models führen `version Int @default(1)` für Optimistic Concurrency (AR9).

**Given** die Migration ist ausgeführt
**When** `pnpm --filter @bluelight-hub/backend check:arch` läuft
**Then** meldet es **keine** neuen Circular Dependencies (NFR-M3).

**Given** das Seed-Skript `packages/backend/prisma/seed.ts`
**When** es ausgeführt wird
**Then** werden 4 `RollenDefinition`-Records idempotent via `upsert` auf `name` angelegt: `Eigenschutz: Sicherheitsbeauftragter`, `Eigenschutz: Abschnittsleiter`, `Eigenschutz: Einheitsführer`, `Eigenschutz: Nachbereitung`
**And** 5 `GefaehrdungsbeurteilungVorlage`-Records idempotent via `upsert` auf `slug`: MANV, VU-Patientenversorgung, Sanitätsdienst-Großveranstaltung, Betreuungseinsatz, CBRN-Patientenversorgung
**And** jede Vorlage enthält mindestens 3 vorbelegte Gefährdungs-Items (`items` JSONB).

**Given** die Migration ist ein zweites Mal ausgeführt
**When** sie regulär durchläuft
**Then** ändern sich weder Seeds noch Schema (Idempotenz)
**And** es werden keine Duplikate der Seeds erzeugt.

**And** die Prisma-Models folgen der Naming-Konvention PascalCase Deutsch, Felder camelCase Deutsch (Architecture §A).

### Story 1.5: Eigenschutz-Rollen + Permissions-Guard

As a **Sicherheitsbeauftragter (Eigenschutz-Rolle)**,
I want **dass meine Schreibrechte auf Gefährdungsbeurteilung, PSA-Profile, Sicherheitsregeln und Sicherungsposten technisch durchgesetzt werden, und Quittungen nur von der empfangenden Rolle abgegeben werden können**,
So that **ich sicher sein kann, dass kein falscher Nutzer den Schutz-Stand meines Einsatzes verändert**.

**Acceptance Criteria:**

**Given** ein Eigenschutz-Endpoint mit der Guard-Kette `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard)`
**When** ein Nutzer mit `EinsatzRollenbesetzung.rollenName = 'Eigenschutz: Sicherheitsbeauftragter'` und Permission `eigenschutz:gefaehrdungsbeurteilung:write` den Endpoint aufruft
**Then** lässt der Guard den Aufruf durch
**And** der Nutzer kann die Gefährdungsbeurteilung ändern (FR45).

**Given** ein Nutzer mit falscher Rolle (z. B. `Eigenschutz: Einheitsführer`)
**When** er versucht, eine PSA-Profil-Änderung zu submitten
**Then** antwortet der Server mit HTTP 403 + strukturiertem Body `{error: "InsufficientRole"}`
**And** der Versuch wird im Security-Log protokolliert.

**Given** ein Quittungs-Endpoint
**When** ein Nutzer ohne Permission `eigenschutz:sicherheitsregel:acknowledge` aufruft
**Then** antwortet der Server mit HTTP 403 (FR46).

**Given** ein Export-Endpoint für Vorfälle
**When** ein Nutzer ohne `Eigenschutz: Nachbereitung`-Rolle und ohne globale `UserRole.ADMIN` aufruft
**Then** antwortet der Server mit HTTP 403 (FR47).

**Given** der `EigenschutzRolleGuard`
**When** der Präfix-Check läuft
**Then** matcht er auf `EinsatzRollenbesetzung.rollenName` mit `^Eigenschutz: ` + exakten Match des im Decorator geforderten Rollen-Namens
**And** prüft, dass der Eintrag `istAktiv` ist und nicht abgelaufen (Q4 revidiert).

**Given** der TypeScript-Union-Type `EigenschutzRolle` in `domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`
**When** Decorator-Typen Rollen-Namen referenzieren
**Then** sind sie type-safe, aber **nicht** als Prisma-Enum persistiert.

**And** `check:di:imports` läuft ohne Violations (Pre-commit Hook, NFR-M2).

### Story 1.6: Eigenschutz-Feature-Slice + Route-Skeleton + Navigation

As a **Sicherheitsbeauftragter**,
I want **einen funktionierenden Einsprungspunkt in das Eigenschutz-Modul über die Einsatz-Navigation, der leer-aber-lauffähig ist**,
So that **meine Kollegen und ich die Navigationswege kennenlernen können, bevor die Features dahinter ausgerollt werden**.

**Acceptance Criteria:**

**Given** ein authentifizierter Nutzer mit aktiver Eigenschutz-Rolle in einem Einsatz
**When** er im Einsatz-Menü auf „Sicherheit → Eigenschutz" klickt
**Then** wird die Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz` geladen (TanStack Router, Singular-Konvention Frontend)
**And** die Brotkrume zeigt `Einsatz › Sicherheit › Eigenschutz`.

**Given** der Backend-Controller-Stub unter `modules/eigenschutz/eigenschutz.module.ts`
**When** ein GET auf `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/health` erfolgt
**Then** antwortet der Server mit HTTP 200 + `{status: "ready"}`
**And** die Route nutzt die Guard-Kette aus Story 1.5
**And** die Route-Convention folgt Plural `einsaetze` (Q5 + Architektur §A).

**Given** das neue Frontend-Feature `packages/frontend/src/features/eigenschutz/`
**When** die Ordner-Struktur geprüft wird
**Then** existieren die Unterordner: `api`, `hooks`, `schemas`, `stores`, `utils`, `ui/{atoms,molecules,organisms,pages}`, `constants`, `index.ts` (Architektur §B)
**And** Tailwind-/Design-System-Importe funktionieren.

**Given** das neue Backend-Feature
**When** der Ordner `packages/backend/src/` geprüft wird
**Then** existieren: `domain/eigenschutz/{aggregates,value-objects,events,repositories,enums,errors}`, `application/eigenschutz/{commands,queries,event-handlers,dto,errors}`, `infrastructure/eigenschutz/{repositories,projections,export,telemetry,conflict,event-adapters}`, `modules/eigenschutz/{controllers,guards}` (Architektur §B).

**Given** ein nicht berechtigter Nutzer (keine Eigenschutz-Rolle)
**When** er die Route öffnet
**Then** zeigt das UI einen freundlichen „Keine Berechtigung"-Empty-State mit Hinweis auf die benötigte Rolle
**And** ein 403-Toast wird nicht geworfen (Zero-Toast-Policy, UX-DR21).

### Story 1.7: Event-Registry-Framework für Eigenschutz

As a **Backend-Entwickler**,
I want **dass das Event-Registry-Pattern (Serializer, Deserializer, Adapters-Modul, Adapters-Index) ein dediziertes Eigenschutz-Segment hat, in das nachfolgende Stories einfach Events eintragen können**,
So that **neue Domain-Events Plattform-kompatibel registriert werden, ohne die bestehenden Module zu berühren**.

**Acceptance Criteria:**

**Given** die Plattform-Event-Registry
**When** ein neues Eigenschutz-Event `GefaehrdungsbeurteilungErstellt` definiert wird
**Then** ist es an **allen vier Stellen** registrierbar: `infrastructure/outbox/event-serializer.ts`, `infrastructure/outbox/event-deserializer.ts`, `infrastructure/events/event-adapters.module.ts`, `infrastructure/events/event-adapters/index.ts` (NFR-I3).

**Given** die Eigenschutz-Event-Adapter
**When** sie initialisiert werden
**Then** befinden sie sich in `infrastructure/eigenschutz/event-adapters/` (pro Event ein Adapter mit `@OnEvent(EventName)`)
**And** delegieren an Application-Layer-Handler via DI-Token.

**Given** die Basis-Klasse `DomainEvent` der Plattform
**When** ein neues Eigenschutz-Event davon erbt
**Then** enthält es Pflichtfelder: `eventId: string (CUID2)`, `occurredAt: Date`, `aggregateId: string`, `einsatzId: string`, `userId: string`, optional `einheitId: string` (Architektur §D).

**Given** das Framework
**When** diese Story abgeschlossen ist
**Then** sind **0 Events** (nur das Framework) registriert
**And** nachfolgende Stories (Epic 2-6) tragen ihre jeweiligen Events einzeln ein
**And** ein Test prüft, dass die Registrierung an 4 Stellen zusammenbleibt (Failure-Case: Event nur an 3 Stellen registriert).

**And** ein kleiner Smoke-Test publiziert ein Dummy-Event durch die Outbox und verifiziert, dass der WS-Broadcast an Room `einsatz:{einsatzId}` ankommt (ADR-006).

---

## Epic 2: Gefährdungsbeurteilung & Sicherheitsregeln

Als Sicherheitsbeauftragter (Markus) kann ich für einen Einsatzabschnitt eine Gefährdungsbeurteilung mit 5×5-Risikomatrix, Schutzmaßnahmen und Versionierung anlegen – ausgehend von 5 Seed-Vorlagen oder von Null – und parallel Sicherheitsregeln als Freitext erfassen, zuweisen und durch Abschnittsleiter quittieren lassen. Jede Änderung ist versioniert und auditierbar.

### Story 2.1: Gefährdungsbeurteilung anlegen aus Vorlage oder leer

As a **Sicherheitsbeauftragter**,
I want **für einen Einsatzabschnitt eine neue Gefährdungsbeurteilung anzulegen, wahlweise ausgehend von einer der 5 Seed-Vorlagen oder komplett leer**,
So that **ich nicht bei Null anfangen muss, wenn ein Standardszenario passt, aber die Option habe, bei Sonderlagen frei zu starten**.

**Acceptance Criteria:**

**Given** ein aktiver Einsatz mit mindestens einer `EinsatzEinheit`
**When** der Sicherheitsbeauftragte in der Eigenschutz-Route auf „Neue Gefährdungsbeurteilung" tippt
**Then** öffnet sich ein Drawer mit 5 `SeedTemplateEntryCard`-Optionen (MANV, VU-Patientenversorgung, Sanitätsdienst-Großveranstaltung, Betreuungseinsatz, CBRN-Patientenversorgung) plus einer gleichwertigen Option „Leeres Formular" (UX-DR13, FR5).

**Given** der Sicherheitsbeauftragte wählt eine Seed-Vorlage
**When** er die Einheit zuweist und bestätigt
**Then** wird eine neue `Gefaehrdungsbeurteilung`-Entity mit FK `einsatzId` + `einheitId` angelegt
**And** die Gefährdungs-Items aus `GefaehrdungsbeurteilungVorlage.items` werden **deep-kopiert** (kein Live-Link, PRD-Mitigation „Vorlagen-Drift")
**And** das Event `GefaehrdungsbeurteilungErstellt` wird über die Outbox publiziert.

**Given** der Sicherheitsbeauftragte wählt „Leeres Formular"
**When** er die Einheit zuweist
**Then** wird eine leere Gefährdungsbeurteilung angelegt (ohne Items)
**And** die UI navigiert direkt in die Item-Erfassung (Story 2.2).

**Given** ein Nutzer ohne Permission `eigenschutz:gefaehrdungsbeurteilung:write`
**When** er die Route öffnet
**Then** ist der „Neue Gefährdungsbeurteilung"-Button deaktiviert mit Tooltip-Hinweis.

**Given** das Anlegen einer neuen Gefährdungsbeurteilung
**When** der Sicherheitsbeauftragte einen räumlichen Bezug zu einer Gefahrenzone herstellen möchte
**Then** kann er optional eine bestehende `Gefahrenzone` (aus dem Gefahren-Modul) über die FK `gefahrenzoneId` referenzieren (FR54, Q6 MVP-Referenz)
**And** die Referenz ist nicht pflicht, keine automatische Übernahme von Gefährdungs-Daten (FR8 ist Phase 2).

**And** beim Anlegen wird der bestehende `TransactionalCommandHandler` verwendet (`CreateGefaehrdungsbeurteilungCommand`).

### Story 2.2: Gefährdung erfassen mit 5×5-Risikomatrix und Schutzmaßnahmen

As a **Sicherheitsbeauftragter**,
I want **einzelne Gefährdungen mit Titel, Beschreibung, Risikobewertung via 5×5-Matrix (Eintrittswahrscheinlichkeit × Schadensausmaß) und Schutzmaßnahmen als Freitext zu erfassen**,
So that **die Risikoklasse (Grün/Gelb/Orange/Rot) automatisch und nachvollziehbar entsteht und jede Gefährdung mit ihren Schutzmaßnahmen dokumentiert ist (FR2, FR4)**.

**Acceptance Criteria:**

**Given** eine offene Gefährdungsbeurteilung im Edit-Modus
**When** der Sicherheitsbeauftragte auf „+ Gefährdung" tippt
**Then** öffnet sich ein Inline-Eingabeblock mit Feldern: Titel (Pflicht, ≤ 120 Zeichen), Beschreibung (optional, ≤ 2000 Zeichen), `RiskMatrix5x5` zur Bewertung, **Schutzmaßnahmen als Freitext-Textarea (optional, ≤ 2000 Zeichen)**
**And** die Matrix zeigt 25 Zellen (5 Eintrittswahrscheinlichkeiten × 5 Schadensausmaße) in `role="grid"` (UX-DR2)
**And** das Schutzmaßnahmen-Feld ist per Tab-Order **nach** der Risikomatrix erreichbar (Progressive Disclosure — UX-Spec, Zeile 830: „Schutzmaßnahme-Feld optional, erscheint nach Risiko-Klasse").

**Given** der Sicherheitsbeauftragte tippt/klickt eine Zelle oder nutzt Pfeiltasten
**When** die Auswahl bestätigt ist (Enter/Space oder Tap)
**Then** errechnet das System die `Risikoklasse` (`GRUEN | GELB | ORANGE | ROT`) nach dem festen 5×5-Schema (Q1, FR2)
**And** die Zellen-Farbe folgt `warnstufe-*`-Tokens
**And** `aria-selected="true"` wird auf der aktiven Zelle gesetzt.

**Given** der Sicherheitsbeauftragte füllt das Schutzmaßnahmen-Feld aus (FR4)
**When** das Feld Inhalt enthält und die Gefährdung gespeichert wird
**Then** wird der Schutzmaßnahmen-Freitext als Teil des Gefährdungs-Items in `GefaehrdungsbeurteilungVersion.payload.items[].schutzmassnahmen` (JSONB) persistiert
**And** folgt dem gleichen Auto-Save-2s-Debounce-Mechanismus wie Titel/Beschreibung (Story 2.5)
**And** Änderungen am Schutzmaßnahmen-Feld erzeugen (gemeinsam mit anderen Item-Änderungen) eine neue Version (Story 2.3, FR41, FR42).

**Given** eine Gefährdung ohne Schutzmaßnahmen-Eintrag (Feld bleibt leer)
**When** das Item gespeichert wird
**Then** bleibt `schutzmassnahmen` `null` oder leer
**And** die Ampel-Projection (Story 6.1) erkennt „keine Schutzmaßnahme dokumentiert" und markiert die Einheit potenziell als `ROT` (FR40, Story 6.5 Warn-Badge).

**Given** Tablet-Nutzung mit Handschuhen
**When** die Matrix gerendert wird
**Then** sind alle Zellen mindestens 48×48 px groß (Touch-Target-Ziel UX-DR2, WCAG 2.5.5 AAA).

**Given** `prefers-reduced-motion: reduce` ist aktiv
**When** eine Zelle selektiert wird
**Then** wird keine Transition/Animation ausgelöst (UX-Spec-Regel).

**Given** das Schutzmaßnahmen-Feld
**When** es gerendert wird
**Then** hat es ein gekoppeltes `<label>` und `aria-describedby` mit Hinweistext „Freitext — konkrete Schutzmaßnahmen für diese Gefährdung (z. B. PSA-Profil, Sicherungsabstand, Funkspruch-Regelung)"
**And** Character-Count-Indikator erscheint ab 80 % der 2000-Zeichen-Grenze (UX-Spec Form-Pattern).

**And** die Gefährdung wird beim Speichern als Item in die aktuelle Version der Gefährdungsbeurteilung übernommen (nutzt Auto-Save aus Story 2.5).

### Story 2.3: Gefährdungen ändern/entfernen mit Version-Chain

As a **Sicherheitsbeauftragter**,
I want **Gefährdungen zu einer bestehenden Beurteilung hinzufügen, ändern oder entfernen zu können, wobei jede Änderung eine neue Version mit Urheber und Zeitstempel erzeugt**,
So that **der Audit-Trail vollständig ist und eine alte Version jederzeit nachvollzogen werden kann (FR3, FR41, FR42)**.

**Acceptance Criteria:**

**Given** eine Gefährdungsbeurteilung mit bestehenden Items
**When** der Sicherheitsbeauftragte ein Item ändert, hinzufügt oder entfernt und anschließend explizit „Speichern" klickt
**Then** wird eine neue Zeile in `GefaehrdungsbeurteilungVersion` mit `(entityId, version, payload JSONB, changedFields JSONB, gueltigVon, gueltigBis NULL, changedByUserId)` angelegt
**And** die vorherige Version erhält `gueltigBis = now()` (Architektur B1 State + Version-Chain)
**And** der „Speichern"-Flow ist in dieser Story bewusst manuell; Story 2.5 ergänzt darauf aufbauend einen Auto-Save-Trigger nach 2 s Inaktivität.

**Given** die Haupt-Tabelle `Gefaehrdungsbeurteilung`
**When** ein Update passiert
**Then** wird `version` um 1 erhöht (Optimistic Concurrency)
**And** `updatedAt` + `updatedByUserId` aktualisiert
**And** das Event `GefaehrdungsbeurteilungAktualisiert` in die Outbox mit `{entityId, fromVersion, toVersion, diff}` publiziert.

**Given** ein Item wird entfernt
**When** die neue Version gespeichert ist
**Then** ist das Item aus der aktuellen Items-Liste raus
**And** die Version-Historie enthält weiterhin den vorigen Zustand (append-only, nicht physisch gelöscht, FR42).

**Given** zwei Clients versuchen parallel die gleiche Version zu ändern
**When** der zweite Commit eintrifft
**Then** antwortet der Server mit HTTP 409 + `{error: "ConflictDetected", context: {currentVersion, attemptedVersion}}`
**And** der Client startet eine Konflikt-Auflösung (Story 3.10/3.11 bei PSA-Konflikten, hier nur Fehlermeldung im UI).

**And** der Event-Eintrag `GefaehrdungsbeurteilungAktualisiert` wird über die Event-Registry aus Story 1.7 registriert (4 Stellen).

### Story 2.4: Vorversionen einsehen und Versions-Timeline

As a **Sicherheitsbeauftragter**,
I want **die Änderungshistorie einer Gefährdungsbeurteilung einzusehen, inkl. Wer/Wann/Was der letzten Versionen**,
So that **ich im Einsatz nachvollziehen kann, ob die aktuelle Bewertung die letzte ist, und welche Entscheidungen vorher getroffen wurden (FR6, FR43)**.

**Acceptance Criteria:**

**Given** eine Gefährdungsbeurteilung mit mindestens 2 Versionen
**When** der Sicherheitsbeauftragte auf den `VersionTimestampFooter` klickt
**Then** öffnet sich ein Popover mit einer chronologischen Liste der Versionen
**And** jede Zeile zeigt: Versionsnummer, Zeitstempel (vollständiges Datum + Uhrzeit), Urheber (User-Name), Stichwort-Änderung („3 Items geändert")
**And** ein Klick auf eine Zeile öffnet eine Read-Only-Detail-Ansicht dieser Version (UX-DR10).

**Given** die Read-Only-Ansicht einer alten Version
**When** sie angezeigt wird
**Then** ist visuell klar abgegrenzt, dass es sich um eine historische Version handelt (Label „Version N von M – `gueltigVon` bis `gueltigBis`")
**And** keine interaktiven Änderungs-Controls sind verfügbar (`aria-readonly="true"`).

**Given** ein Nutzer mit Lese-Recht (beliebige Eigenschutz-Rolle)
**When** er die Historie öffnet
**Then** kann er alle Versionen lesen (FR43, gleich für alle Rollen mit Leserecht).

**And** die Timeline-Abfrage nutzt den Query `GetGefaehrdungsbeurteilungHistorieQuery`, der auf `GefaehrdungsbeurteilungVersion` indexiert nach `(entityId, gueltigVon DESC)` läuft.

### Story 2.5: Auto-Save mit 2s-Debounce + manuelles „Version abschließen"

As a **Sicherheitsbeauftragter**,
I want **dass meine Änderungen an einer Gefährdungsbeurteilung automatisch nach 2 Sekunden Inaktivität gespeichert werden, und ich explizit „Version abschließen" wählen kann, bevor ich sie bekannt gebe**,
So that **ich im Einsatz nicht an Speichern denken muss, aber die Audit-Trail-Schnitte bewusst setzen kann (UX-DR18)**.

**Acceptance Criteria:**

**Given** der Sicherheitsbeauftragte ändert ein Feld einer Gefährdungsbeurteilung
**When** 2 Sekunden vergangen sind ohne weitere Änderung
**Then** wird die aktuelle Version lokal gespeichert (`SyncStatusBadge` zeigt „Lokal gespeichert")
**And** bei Online-Verbindung wird der Save an den Server propagiert
**And** nach erfolgreichem Server-Save wechselt der Status zu „Synchronisiert".

**Given** der Sicherheitsbeauftragte tippt kontinuierlich
**When** er weniger als 2 Sekunden Pause macht
**Then** wird **nicht** jede Tastatur-Eingabe persistiert
**And** der Debounce-Timer wird bei jedem Keystroke zurückgesetzt.

**Given** der Sicherheitsbeauftragte klickt „Version abschließen"
**When** der Klick erfolgt
**Then** wird der aktuelle Stand sofort als neue Version commitiert (unabhängig von offenem Debounce-Timer)
**And** ein `GefaehrdungsbeurteilungAktualisiert`-Event wird mit Urheber und Zeitstempel veröffentlicht
**And** die UI zeigt kurz einen „Version N gespeichert"-Indikator in der Statuszeile (kein Toast, UX-DR21).

**Given** Offline-Betrieb
**When** der Auto-Save triggert
**Then** wird die Änderung im Platform Storage Adapter (ADR-010) als „pending command" lokal gespeichert
**And** bei Wiederverbindung wird sie automatisch an den Server repliziert (FR48, FR49).

**And** die Debounce-Logik ist zentral im Hook `useAutoSave(entityId, entityType, saveFn, debounceMs=2000)` verpackt und von anderen versionierten Entitäten (Sicherheitsregel, Sicherungsposten) wiederverwendbar.

### Story 2.6: Sicherheitsregeln erfassen und Abschnitt zuweisen

As a **Sicherheitsbeauftragter**,
I want **Sicherheitsregeln als Freitext erfassen und einem oder mehreren Einsatzabschnitten (oder dem gesamten Einsatz) zuweisen zu können**,
So that **ich spezifische Regelungen (z. B. „Absperrung 20 m", „Sichtkontakt nach Funkspruch") dokumentieren und an die richtigen Empfänger adressieren kann (FR23)**.

**Acceptance Criteria:**

**Given** ein aktiver Einsatz
**When** der Sicherheitsbeauftragte auf „+ Sicherheitsregel" tippt
**Then** öffnet sich ein Drawer mit Feldern: Titel (Pflicht, ≤ 80 Zeichen), Beschreibung (Freitext, ≤ 2000 Zeichen), Zuordnung (ein oder mehrere `EinsatzEinheit` oder „gesamter Einsatz")
**And** die Zuordnung ist Multi-Select (UX-DR19 als Default-Haltung).

**Given** der Sicherheitsbeauftragte speichert die Regel
**When** `SaveSicherheitsregelCommand` durchläuft
**Then** wird eine neue `Sicherheitsregel`-Entity mit FK `einsatzId` und `einheitId[]` (oder `null` für einsatzweit) angelegt
**And** das Event `SicherheitsregelAusgerufen` wird in der Outbox publiziert (Registry aus 1.7)
**And** die Regel erscheint in der Sicherheitsregel-Liste der zugewiesenen Abschnitte.

**Given** ein Nutzer ohne `eigenschutz:sicherheitsregel:write`
**When** er versucht, eine Regel zu speichern
**Then** antwortet der Server mit HTTP 403.

**And** Sicherheitsregeln sind **versioniert** (Änderungen erzeugen neue Zeilen in `SicherheitsregelVersion`, analog FR41 für Gefährdungsbeurteilung).

### Story 2.7: Sicherheitsregeln empfangen und quittieren

As a **Abschnittsleiter**,
I want **neue oder geänderte Sicherheitsregeln meines Abschnitts sichtbar zu bekommen und sie mit einem Tap quittieren zu können**,
So that **der Sicherheitsbeauftragte Gewissheit hat, dass die Regel angekommen ist, und der Audit-Trail vollständig ist (FR24, FR25)**.

**Acceptance Criteria:**

**Given** eine neue oder aktualisierte Sicherheitsregel ist für meinen Abschnitt relevant
**When** ich das Modul im aktiven Client geöffnet habe
**Then** wird die Regel in meiner Sicherheitsregel-Liste angezeigt (FR24)
**And** ein kleiner, nicht-ignorierbarer aber `polite`-Banner zeigt „Neue Sicherheitsregel" (UX-DR1 `tone="polite"`)
**And** der Banner ist per Enter/Space quittierbar.

**Given** ich quittiere die Regel
**When** die Quittung abgeschickt wird
**Then** wird `AckSicherheitsregelCommand` an das Backend gesendet
**And** das Event `SicherheitsregelQuittiert` wird mit `{regelId, einheitId, userId, quittiertAm}` publiziert
**And** der Banner verschwindet und der Quittungs-Status aktualisiert sich im Dashboard des Sicherheitsbeauftragten.

**Given** ich habe Permission `eigenschutz:sicherheitsregel:acknowledge` für die Rolle `Eigenschutz: Abschnittsleiter` (oder `Einheitsfuehrer`)
**When** ich quittiere
**Then** wird die Aktion akzeptiert (FR46, FR25)
**And** andere Rollen werden vom Server mit HTTP 403 abgelehnt.

**Given** die Sicherheitsregel wurde bereits quittiert
**When** ich den Banner erneut sehe
**Then** ist er bereits als „Quittiert" markiert und nicht mehr aktionsrequired
**And** ein erneuter Klick erzeugt keine zweite Quittung (idempotent).

**And** die Quittung reflektiert sich in der `AmpelProjection` (Baustein für Epic 6) durch Reduktion von `ausstehendeRegelQuittungen`.

---

## Epic 3: PSA-Profile & kritische Bekanntgabe (CBRN-Signatur-Interaktion)

Als Sicherheitsbeauftragter kann ich additive PSA-Profile für einen oder mehrere Einsatzbereiche gleichzeitig aktivieren oder deaktivieren – mit Begründungs-Pflicht und Propagation an alle betroffenen Abschnittsleiter in ≤ 2 s. Als Abschnittsleiter empfange ich die Änderung als nicht-ignorierbaren Banner mit Ausrüstungs-Checkliste, quittiere sie oder melde Lücken zurück. Parallele Änderungen auf dem gleichen Profil werden als Konflikt erkannt und explizit aufgelöst. Push-Notifications tragen kritische Events auch an nicht-aktive Clients. Telemetrie misst den CBRN-Moment. **Zielmetrik: End-to-End ≤ 90 s (p95) für CBRN-Hochstufung auf mehrere Abschnitte.**

### Story 3.1: PSA-Profil einer Einheit aktivieren/deaktivieren

As a **Sicherheitsbeauftragter**,
I want **für eine einzelne `EinsatzEinheit` ein PSA-Profil (`BASIS | INFEKTION | VU | CBRN_PATIENT | VOLLSCHUTZ`) zu aktivieren oder zu deaktivieren, mit Pflicht zur Begründung und automatischer Protokollierung**,
So that **der Schutzstand der Einheit jederzeit aktuell ist und jede Änderung auditierbar nachvollziehbar bleibt (FR10, FR12, FR14)**.

**Acceptance Criteria:**

**Given** eine aktive `EinsatzEinheit` ohne aktives Profil (oder mit bestehendem Profil-Set)
**When** der Sicherheitsbeauftragte im Drawer ein `PSAProfileMultiSelect`-Chip toggelt
**Then** wird ein `ChangePsaProfilCommand{einsatzId, einheitIds: [einheitId], profilToggles: [{profil, aktivieren}], begruendung, expectedVersion}` vorbereitet
**And** die UI zeigt einen Preview-Diff vorher/nachher (vor dem Commit).

**Given** der Sicherheitsbeauftragte versucht, eine Änderung ohne Begründung zu senden
**When** das Begründungs-Feld leer ist
**Then** ist der Bestätigungs-Button deaktiviert
**And** das Feld ist `aria-required="true"` markiert.

**Given** eine valide PSA-Profil-Änderung
**When** der Command erfolgreich durchläuft
**Then** wird die aktive Zuweisung in `psa_profil_zuweisung` geschlossen (`gueltigBis = now()`)
**And** die neue Zuweisung wird als neue Zeile mit `gueltigVon = now(), gueltigBis = NULL` angelegt
**And** das Event `PsaProfilGeaendert{einsatzId, einheitId, zuweisungId, propagationGroupId, profil, aktion, begruendung, userId}` wird in die Outbox publiziert
**And** die `propagationGroupId` ist ein CUID2, der in dieser Story für Single-Select-Aktionen einen Random-Wert enthält (für Bulk-Logik vgl. Story 3.2).

**Given** die Deaktivierung des letzten Basis-Profils (`BASIS`), während andere Profile noch aktiv sind
**When** der Sicherheitsbeauftragte den Toggle versucht
**Then** erscheint eine Bestätigungs-Modal „Letztes Basis-Profil – wirklich entfernen?" mit destruktivem Button (UX-DR27)
**And** erst nach Bestätigung + Begründung wird die Deaktivierung ausgeführt.

**Given** ein Nutzer ohne `eigenschutz:psa:write`
**When** er versucht zu togglen
**Then** antwortet der Server mit HTTP 403 (FR45).

**And** `PsaProfilGeaendert` wird an den vier Stellen der Event-Registry eingetragen (Story 1.7-Framework).

### Story 3.2: Multi-Select + Bulk-PSA-Änderung auf mehreren Einheiten

As a **Sicherheitsbeauftragter**,
I want **mehrere Einsatzabschnitte gleichzeitig auszuwählen und deren PSA-Profil-Set in einem einzigen Vorgang zu ändern, mit gemeinsamer Begründung**,
So that **ich im CBRN-Moment drei Abschnitte in einer Geste hochstufen kann (Journey 1b, FR11, UX-DR19)**.

**Acceptance Criteria:**

**Given** das Dashboard mit mehreren `AmpelCard`-Elementen
**When** der Sicherheitsbeauftragte auf einer Karte Long-Press (Touch, 500 ms) oder Shift-Klick (Desktop) ausführt
**Then** wird der Multi-Select-Modus aktiviert
**And** weitere Karten können per Tap/Klick markiert werden
**And** eine Batch-Action-Bar erscheint mit „PSA ändern für N Abschnitte" + „Abbrechen".

**Given** 3 markierte Abschnitte und gewählter Button „PSA ändern für 3 Abschnitte"
**When** der Drawer sich öffnet
**Then** zeigt er `w-[640px]` (statt Standard 480 px bei Single-Select, UX-DR25)
**And** die Profil-Chips zeigen den konsolidierten Status (alle aktiv / gemischt / alle inaktiv).

**Given** der Sicherheitsbeauftragte toggelt ein Profil und füllt Begründung aus
**When** er bestätigt
**Then** wird **ein** `ChangePsaProfilCommand{einheitIds: [id1, id2, id3], ...}` gesendet
**And** der Backend-Handler erzeugt in **einer Transaktion** alle Zuweisungs-Updates mit **derselben `propagationGroupId`** (AR Architecture B5)
**And** publiziert pro Einheit ein `PsaProfilGeaendert`-Event (gruppiert via `propagationGroupId`).

**Given** die UI erhält den Response
**When** der Multi-Select-Modus beendet wird
**Then** zeigen die drei Karten einen einmaligen 600 ms Orange-Fade als Propagations-Indikator (außer bei `prefers-reduced-motion: reduce`, UX-Spec)
**And** der Status je Karte wechselt auf „Wartend auf Quittung 0 von N".

**Given** einer der drei Bulk-Updates scheitert (z. B. Version-Mismatch für eine Einheit)
**When** der Server antwortet
**Then** wird die gesamte Transaktion zurückgerollt (atomar)
**And** der Client zeigt einen Konflikt-Banner mit Hinweis, welche Einheit betroffen ist, und Handlungsoptionen.

### Story 3.3: Kritische Bekanntgabe via `SeverityBanner` + Echtzeit-Propagation

As a **Abschnittsleiter**,
I want **eine unmissverständliche, nicht-ignorierbare Benachrichtigung zu erhalten, wenn sich das PSA-Profil-Set meines Abschnitts ändert, mit Informationen über altes/neues Profil, Begründung und den Sicherheitsbeauftragten-Namen**,
So that **ich sofort weiß, was zu tun ist (FR17, UX-DR1, UX-DR22)**.

**Acceptance Criteria:**

**Given** ich bin als `Eigenschutz: Abschnittsleiter` einer Einheit zugewiesen
**When** ein `PsaProfilGeaendert`-Event für meine Einheit über den WebSocket-Kanal (`einsatz:{einsatzId}`) eintrifft
**Then** zeigt das System binnen ≤ 2 s (NFR-P2) einen `SeverityBanner` mit `variant="critical" tone="assertive"` an
**And** der Banner enthält: Headline ≤ 60 Zeichen (z. B. „PSA-Profil CBRN-Patientenversorgung aktiviert"), Body ≤ 140 Zeichen, Begründung als eigene Zeile, Timestamp, Primary-Action „Details ansehen", Sekundär-Action „Später"
**And** `role="alert"` mit initial Fokus auf Primary-Action (UX-DR1).

**Given** bereits 3 `assertive`-Banner sind sichtbar (Alarm-Budget, UX-DR22)
**When** ein weiteres eintrifft
**Then** aggregiert das System die überzähligen zu einem Sammel-Banner „3 weitere kritische Ereignisse" (statt 4 separate Banner).

**Given** ich drücke Enter/Space auf dem Banner (oder tippe ihn)
**When** der Banner reagiert
**Then** öffnet sich die Detail-Ansicht mit Ausrüstungs-Checkliste (Story 3.5).

**Given** der WebSocket-Broadcast liefert den gleichen `eventId` erneut
**When** der Client ihn empfängt
**Then** wird er durch den `eventId`-LRU-Cache (Größe ~200) verworfen, kein zweiter Banner (NFR-R3).

**And** die Client-Propagations-Latenz wird via Telemetrie-Hook `all_banners_delivered` gemessen (Story 3.11).

### Story 3.4: PSA-Quittung + Quittungsstand-Anzeige

As a **Abschnittsleiter**,
I want **eine PSA-Profil-Änderung einfach quittieren zu können**, und **als Sicherheitsbeauftragter sehe ich live, welche Abschnitte bereits quittiert haben und welche nicht**,
So that **der Stab vertrauen kann, dass die Änderung wirklich angekommen ist (FR18, FR19, UX-DR4)**.

**Acceptance Criteria:**

**Given** ein aktiver `SeverityBanner` für eine PSA-Profil-Änderung
**When** ich als Abschnittsleiter auf „Verstanden, Ausrüstung vorhanden" tippe (oder Enter/Space drücke)
**Then** wird `AckQuittungCommand{propagationGroupId, einheitId}` an das Backend gesendet
**And** das Event `QuittungAbgegeben` wird mit `{einheitId, userId, quittiertAm, propagationGroupId}` publiziert
**And** der Banner verschwindet mit Fade-out (außer bei `prefers-reduced-motion`).

**Given** der Sicherheitsbeauftragte sieht die betroffene `AmpelCard`
**When** Quittungen live eintreffen
**Then** aktualisiert sich die `AcknowledgmentStatusBadge` live: „0 von 3 quittiert" → „1 von 3" → „2 von 3" → „3 von 3 – abgeschlossen"
**And** die Zahlen nutzen `tabular-nums` (keine Breiten-Sprünge, UX-DR4).

**Given** die Karte hat den Status „Wartend auf Quittung 0 von 3"
**When** der Sicherheitsbeauftragte auf `AcknowledgmentStatusBadge` klickt
**Then** öffnet sich ein Popover mit Liste der Empfänger + individuellem Status (quittiert um HH:MM / ausstehend).

**Given** ein Nutzer ohne Rolle `Eigenschutz: Abschnittsleiter` (oder `Einheitsfuehrer`)
**When** er versucht zu quittieren
**Then** antwortet der Server mit HTTP 403 (FR46).

**Given** alle 3 Abschnitte quittiert haben
**When** das letzte `QuittungAbgegeben`-Event verarbeitet ist
**Then** aktualisiert sich die `AmpelProjection` (Baustein für Epic 6) durch Dekrement von `ausstehendePsaQuittungen`
**And** die Karten-Farbe wechselt zu Grün (sofern keine anderen offenen Punkte).

### Story 3.5: Ausrüstungs-Checkliste je PSA-Profil bei Empfang

As a **Abschnittsleiter (Steffi)**,
I want **nach dem Öffnen der PSA-Änderung eine Checkliste der benötigten Ausrüstung pro Einheit zu sehen und je Einheit abzuhaken, ob die Ausrüstung verfügbar ist**,
So that **ich das neue PSA-Profil in der Realität umsetzen kann und Lücken direkt sichtbar werden (FR13, UX-DR7)**.

**Acceptance Criteria:**

**Given** ein geöffneter PSA-Änderungs-Banner/Drawer
**When** die Checkliste geladen wird
**Then** zeigt sie pro aktivem PSA-Profil einen Header mit Profilname + Icon
**And** darunter die Ausrüstungs-Items (für CBRN-Patientenversorgung z. B.: flüssigkeitsdichter Schutzanzug, Chemikalien-Handschuhe, Schutzbrille/Visier)
**And** pro Einheit eine Reihe mit Checkboxen für jedes Item (`EquipmentChecklist`-Organism).

**Given** ich als Abschnittsleiter habe 3 Einheiten
**When** ich für Einheit 1 alle Items abhake und für Einheit 2 ein Item fehlt
**Then** wird die Checkbox-Zeile für Einheit 2 optisch als „Lücke" markiert (Status `gap-reported` nach Submit, UX-DR7)
**And** ein Button „Ausrüstungs-Lücke melden" erscheint für diese Einheit.

**Given** die Checkliste wird für MVP aus einer fest hinterlegten Konfiguration geladen
**When** das Profil-Enum zu Items gemappt wird
**Then** liegt das Mapping in `domain/eigenschutz/value-objects/ausruestungs-checkliste.vo.ts`
**And** ist pro Profil statisch hinterlegt (FR13 MVP; admin-pflegbar erst Phase 2, FR16).

**Given** die Checkliste unterscheidet Einheiten
**When** die UI gerendert wird
**Then** sind Einheits-Rahmen klar abgegrenzt (Fieldset + Legend, UX-Spec Form-Pattern).

**And** das Abhaken der Checklisten-Items ist lokal im Banner-Drawer-State — es wird beim Quittieren (Story 3.4) oder bei der Lücken-Meldung (Story 3.6) an den Server übertragen.

### Story 3.6: Rückmeldung „Ausrüstungs-Lücke" an Sicherheitsbeauftragten

As a **Abschnittsleiter**,
I want **dem Sicherheitsbeauftragten eine strukturierte Rückmeldung zu senden, wenn für eine Einheit die Ausrüstung nicht verfügbar ist**,
So that **der Stab organisatorisch gegensteuern kann, ohne dass ich anrufen muss (FR20)**.

**Acceptance Criteria:**

**Given** eine Einheit mit gemeldeter Ausrüstungs-Lücke
**When** ich den „Lücke melden"-Button klicke
**Then** öffnet sich ein Inline-Dialog mit einem Freitextfeld (Placeholder „Schutzanzug Größe L fehlt Einheit 2 — nachgeordert 14:28")
**And** der Dialog hat einen „Senden"-Button (Enter schickt ab).

**Given** die Rückmeldung wird abgeschickt
**When** der Command `ReportLueckeCommand{einheitId, zuweisungId, meldung, userId}` durchläuft
**Then** wird das Event `LueckeGemeldet` in der Outbox publiziert
**And** der Status der Einheit bleibt „partiell quittiert" (die Quittung selbst wurde abgegeben, aber mit offener Lücke)
**And** die `AmpelCard` der Einheit wird amber markiert (statt grün, UX-DR11 + `AmpelProjection.ungelesteRueckmeldungen++`).

**Given** der Sicherheitsbeauftragte sieht das Dashboard
**When** die Lücke gemeldet wurde
**Then** erscheint ein `polite` Mikro-Banner (tone="polite", nicht assertive, UX-DR1)
**And** die betroffene Karte zeigt ein Badge „Lücke" mit Link zur Rückmelde-Detailseite.

**Given** die Lücke ist behoben (z. B. Ausrüstung nachgeliefert)
**When** der Sicherheitsbeauftragte den „Lücke geklärt"-Button klickt
**Then** publiziert das System ein `LueckeAufgeloestEvent` (Teil-Event von `QuittungAbgegeben` oder Eigenes — hier `LueckeAufgeloest` als Subtyp)
**And** die Karte wechselt zurück auf Grün (wenn keine anderen Punkte offen).

**And** die Rückmeldungs-Meldung ist zeitgestempelt und wird im Audit-Trail der Zuweisung gehalten.

### Story 3.7: Re-Prompt-Scheduler + Eskalation nach 5 min ohne Quittung

As a **Sicherheitsbeauftragter**,
I want **dass nicht-quittierte PSA-Änderungen nach 5 Minuten automatisch erneut angekündigt werden und gleichzeitig der Einsatzleiter eine dezente Eskalation erhält**,
So that **keine kritische Änderung im Nichts untergeht, auch wenn der Abschnittsleiter den Banner übersehen hat (AR12, UX-DR20)**.

**Acceptance Criteria:**

**Given** ein `PsaProfilGeaendert`-Event mit `occurredAt` vor mehr als 5 Minuten
**When** der `@nestjs/schedule`-Job alle 30 s läuft
**Then** sucht er nicht-quittierte Events (kein `QuittungAbgegeben` zur gleichen `propagationGroupId + einheitId`)
**And** emittiert pro offenem Empfänger ein `QuittungUeberfaelligEvent{zuweisungId, einheitId, originalEventId, ueberfaelligSeitMin}`.

**Given** das Event `QuittungUeberfaelligEvent` trifft beim Abschnittsleiter-Client ein
**When** der ursprüngliche Banner noch sichtbar ist
**Then** wird er mit einem „Erneut" - Label ergänzt (keine neue Instanz)
**And** falls der Banner geschlossen wurde, erscheint er erneut (UX-DR20 „Re-Prompt").

**Given** das Event `QuittungUeberfaelligEvent`
**When** es vom Einsatzleiter-Client konsumiert wird
**Then** erscheint dort ein `polite`-Banner „Quittung für Abschnitt X überfällig" (keine `assertive`, damit Einsatzleiter nicht überlastet wird)
**And** ein Link führt zum Dashboard mit Fokus auf die betroffene Karte.

**Given** die Quittung trifft nachträglich ein
**When** der Scheduler erneut läuft
**Then** findet er die Quittung und emittiert kein weiteres `QuittungUeberfaelligEvent` für diese Zuweisung.

**Given** Tests für den Scheduler
**When** sie laufen
**Then** decken sie ab: (a) Quittung innerhalb 5 min → kein Re-Prompt, (b) Quittung nach 5 min → Re-Prompt einmal, (c) mehrere parallele Zuweisungen, (d) Scheduler-Idempotenz bei Job-Überlappung.

**And** `QuittungUeberfaelligEvent` ist an den 4 Stellen der Event-Registry eingetragen.

### Story 3.8: Push-Notifications für kritische PSA-Events

As a **Abschnittsleiter**,
I want **kritische PSA-Änderungen auch dann zu erhalten, wenn mein Tab im Hintergrund ist oder das Tauri-Fenster nicht aktiv ist**,
So that **ich nicht verpasse, wenn der Einsatzleiter mich alarmiert (FR22 UX-hochgezogen)**.

**Acceptance Criteria:**

**Given** ein Nutzer hat Push-Benachrichtigungen aktiviert (Story 1.2) und ist als `Eigenschutz: Abschnittsleiter` einer Einheit zugewiesen
**When** ein `PsaProfilGeaendert`-Event für seine Einheit publiziert wird
**Then** sendet der Push-Notifications-Service (Story 1.1) parallel zum WebSocket-Broadcast eine Push-Notification an alle Subscriptions des Nutzers (AR7 Architektur)
**And** die Push-Payload enthält: `title` (z. B. „PSA-Hochstufung CBRN"), `body`, `eventId`, `url` (Deep-Link zur Einheit), `priority="high"`.

**Given** der Nutzer hat den Tab/das Tauri-Fenster im Hintergrund
**When** die Push eintrifft
**Then** erscheint eine System-Benachrichtigung (Web-Push via Service-Worker oder Tauri-Native, je nach Plattform)
**And** ein Klick auf die Benachrichtigung öffnet die Anwendung auf der zugehörigen Route (Deep-Link).

**Given** Push und WebSocket werden parallel empfangen (Tab aktiv)
**When** beide die gleiche `eventId` tragen
**Then** wird **nur einmal** ein `SeverityBanner` angezeigt (Client-Dedup via `eventId`-LRU, NFR-R3 + Story 1.2).

**Given** der Nutzer hat Push-Berechtigungen nicht erteilt
**When** das Event eintrifft
**Then** fällt die UX auf WebSocket-Banner + In-App zurück (kein Fehler, kein erneuter Berechtigungs-Prompt).

**And** der Push-Service sendet **nicht** für `polite`-Events (z. B. Sicherheitsregel-Quittung), sondern nur für `assertive`-kritische Events (PSA-Änderung, Vorfall-Meldung — letzteres in Epic 5).

### Story 3.9: Sync-Konflikt-Erkennung auf PSA-Profil (Backend)

As a **Backend-Entwickler**,
I want **dass parallele PSA-Profil-Änderungen (z. B. zwei Geräte toggeln das gleiche Profil) als Konflikt erkannt, persistiert und den Clients strukturiert zurückgegeben werden**,
So that **kritische Sicherheits-Updates nicht still überschrieben werden (FR50, AR9)**.

**Acceptance Criteria:**

**Given** zwei Clients halten dieselbe `PsaProfilZuweisung` mit `version=5`
**When** beide parallel einen `ChangePsaProfilCommand` mit `expectedVersion=5` senden
**Then** gewinnt der erste Commit (`version` steigt auf 6)
**And** der zweite Commit erhält HTTP 409 + `{error: "ConflictDetected", context: {entityId, currentVersion: 6, attemptedVersion: 5}}`.

**Given** der zweite Client erhält den Konflikt
**When** der Client-Hook `useChangePsaProfil` den 409 verarbeitet
**Then** wird ein `KonfliktErkanntEvent{einsatzId, einheitId, entityType: 'PSA_PROFIL_ZUWEISUNG', entityId, fieldPath, localPayload, serverVersion, localExpectedVersion, reportedByUserId}` in die Outbox publiziert
**And** ein Eintrag in `sync_conflict` (Architektur B6) wird angelegt
**And** der User erhält einen `warning`-Mikro-Banner „Sync-Konflikt auf Abschnitt X – jetzt auflösen".

**Given** die Konflikt-Erkennung läuft im `TransactionalCommandHandler`
**When** die Version-Prüfung fehlschlägt
**Then** wird `Result.fail('ConflictDetected', {currentVersion, attemptedVersion})` zurückgegeben
**And** ein standard NestJS `HttpException`-Mapper konvertiert auf HTTP 409.

**And** ein Test verifiziert: bei 5 parallelen Commits auf die gleiche Zuweisung gewinnt genau einer, die anderen erhalten Konflikt-Responses mit korrekten Versions-Angaben.

### Story 3.10: `ConflictResolutionList` UI — Konflikt-Auflösung durch Sicherheitsbeauftragten

As a **Sicherheitsbeauftragter**,
I want **eine tabellarische Liste offener Sync-Konflikte, in der ich je Konflikt sehe, welche Version lokal war, welche am Server und was gewählt wurde, und dann explizit eine Resolution wähle (`SERVER_WINS | LOCAL_WINS | MERGED`)**,
So that **ich Multi-Device-Konflikte skalierbar auflösen kann ohne Modal-Stacking (FR50, UX-DR6, NFR-C3)**.

**Acceptance Criteria:**

**Given** mindestens ein offener Eintrag in `sync_conflict` für meinen Einsatz
**When** ich auf das Mikro-Banner „Konflikte auflösen" klicke oder via Sub-Tab „Konflikte" navigiere
**Then** öffnet sich die `ConflictResolutionList` als Tabelle (`role="table"`, UX-DR6)
**And** jede Zeile enthält Spalten: Entität, Feld, Version A (mein Gerät), Version B (anderes Gerät), Reportet von, Aktionen.

**Given** die Liste hat ≥ 20 Konflikte
**When** ich sie scrolle
**Then** bleibt die Performance flüssig (virtualisiert via `@tanstack/react-virtual`, UX-Spec)
**And** kein modaler Dialog stapelt sich (UX-DR6 explizit).

**Given** ich wähle in einer Zeile „Server übernehmen" oder „Lokal behalten" oder „Zusammenführen"
**When** der `ResolveKonfliktCommand{konfliktId, resolution}` durchläuft
**Then** wird `KonfliktAufgeloest`-Event publiziert
**And** der Konflikt verschwindet aus der Liste
**And** die zugrundeliegende Entity wird auf die gewählte Version aktualisiert (oder bei `MERGED`: Felder aus beiden Versionen zusammengeführt via Zod-Schema).

**Given** die Liste wird nach Entität oder Zeitstempel sortiert
**When** ich auf eine Spalten-Überschrift klicke
**Then** sortiert sich die Liste (jede Spalte sortierbar, UX-DR6).

**Given** ich habe kein Permission `eigenschutz:psa:write`
**When** ich die Liste öffne
**Then** sind alle Aktionen deaktiviert und der UI-Status ist Read-Only (Nachbereitung sieht nur, Sicherheitsbeauftragter entscheidet).

**And** ein Filter-Bar über der Tabelle erlaubt Filter nach Entitätstyp und Schweregrad (UX-DR6 Skalierbarkeit).

### Story 3.11: Telemetrie-Capture für CBRN-Moment

As a **Product-Owner / Pilot-Auswerter**,
I want **dass die Signatur-Interaktion telemetriert wird — `assess_started` (Drawer geöffnet), `all_banners_delivered` (alle Empfänger-Banner empfangen), `quittung_abgegeben` (pro Empfänger), `blind_ack` (< 2 s Tap nach Öffnen)**,
So that **wir nach dem Piloteinsatz das End-to-End-Zielfenster (≤ 90 s) quantifizieren können (AR8, UX-DR29)**.

**Acceptance Criteria:**

**Given** der Sicherheitsbeauftragte öffnet den PSA-Änderungs-Drawer (Story 3.2)
**When** die Drawer-Animation abgeschlossen ist
**Then** wird `assess_started`-Event client-side erzeugt mit `{propagationGroupIdCandidate, abschnittCount, userId, sessionId, clientTime}`
**And** in einer lokalen Telemetrie-Queue gehalten (Batch-Upload alle 10 s oder bei Tab-Close).

**Given** die Bulk-PSA-Änderung wurde submitted
**When** der Client-Hook sieht, dass alle `propagationGroupId`-Mitglieder ihren Banner empfangen haben (via WebSocket-Bestätigung)
**Then** wird `all_banners_delivered` mit `{propagationGroupId, elapsedMs, bannerCount}` erzeugt.

**Given** ein Abschnittsleiter öffnet den Banner und klickt in weniger als 2 Sekunden auf „Verstanden"
**When** die Quittung abgegeben wird
**Then** wird zusätzlich ein `blind_ack`-Event erzeugt
**And** enthält `{einheitId, timeFromOpenMs}` für späteres Coaching im Piloteinsatz (Journey 1b Success-Kriterium).

**Given** die Telemetrie-Queue wird Batch-hochgeladen
**When** der Client `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/telemetry` mit Array aufruft
**Then** akzeptiert der Server die Events und persistiert sie in `eigenschutz_telemetry_event`
**And** die Permission-Anforderung ist `eigenschutz:telemetry:write` (implizit für alle Einsatz-Rollen, AR Architecture).

**Given** DSGVO-Konformität
**When** Telemetrie-Events gespeichert werden
**Then** enthalten sie **keine** unnötigen Personenbezüge
**And** die Retention folgt der Einsatz-Lebensdauer (Plattform-Löschkonzept).

**And** die Backend-Infrastruktur ist vorbereitet für Prometheus-Auswertung (eigentliches Prometheus-Dashboard ist Story 7.9).

---

## Epic 4: Sicherungsposten-Verwaltung & Lagekarten-Integration

Als Sicherheitsbeauftragter kann ich Sicherungsposten mit Standort, Personal, Zuständigkeitsbereich und Ablösezeiten anlegen, ändern und löschen. Die Sicherungsposten werden als Marker auf der MapGL-Lagekarte dargestellt; Karte und Detail-Ansicht sind bidirektional verzahnt.

### Story 4.1: Sicherungsposten-CRUD mit Versionierung

As a **Sicherheitsbeauftragter**,
I want **Sicherungsposten mit Standort (Koordinate oder Adresse), zugewiesenem Personal (User-Referenzen oder Freitext) und Zuständigkeitsbereich (Freitext) anlegen, ändern und als „aufgelöst" markieren zu können**,
So that **ich Sicherungs-Aufgaben strukturiert vergebe und auditierbar nachvollziehen kann, wer wo postiert war (FR27)**.

**Acceptance Criteria:**

**Given** ein aktiver Einsatz und das Eigenschutz-Sub-Tab „Sicherungsposten"
**When** der Sicherheitsbeauftragte auf „+ Sicherungsposten" klickt
**Then** öffnet sich ein Drawer mit Feldern: Titel (Pflicht), Standort (Koordinate via Map-Click **oder** Adresse/Freitext), Personal (Multi-Select User + Freitextfeld), Zuständigkeitsbereich (Textarea)
**And** Absenden erzeugt eine neue `Sicherungsposten`-Entity mit FK `einsatzId`, optional `einheitId`.

**Given** eine bestehende `Sicherungsposten`-Entity
**When** der Sicherheitsbeauftragte Felder ändert
**Then** wird beim Speichern eine neue Zeile in `SicherungspostenVersion` angelegt (State + Version-Chain, analog FR41)
**And** das Event `SicherungspostenAktualisiert` in die Outbox publiziert.

**Given** ein Sicherungsposten wird gelöscht
**When** der Sicherheitsbeauftragte „Auflösen" wählt
**Then** wird der Posten als `aufgeloestAm` markiert (Soft-Delete)
**And** erscheint in der aktiven Liste nicht mehr, bleibt aber in der Versions-Historie und auf einer „Aufgelöste Posten"-Untersicht
**And** Löschen ist destruktiv mit Begründungs-Feld (UX-DR27).

**Given** `SicherungspostenEingerichtet` und `SicherungspostenAktualisiert`
**When** sie im Event-Bus publiziert werden
**Then** sind sie an den 4 Stellen der Event-Registry eingetragen.

**And** ein Nutzer ohne `eigenschutz:sicherungsposten:write` erhält HTTP 403 auf Mutationen.

### Story 4.2: Ablösezeiten als Textfeld

As a **Sicherheitsbeauftragter**,
I want **Ablösezeiten für einen Sicherungsposten als freies Textfeld pflegen zu können (z. B. „08:00 – 12:00 Trupp 1, 12:00 – 16:00 Trupp 2")**,
So that **ich im MVP ohne vollwertigen Schichtplaner trotzdem dokumentieren kann, wer wann abgelöst wird (FR29)**.

**Acceptance Criteria:**

**Given** ein bestehender Sicherungsposten
**When** der Sicherheitsbeauftragte die Detail-Ansicht öffnet
**Then** zeigt sie ein Textarea-Feld „Ablösezeiten" (bis ≤ 2000 Zeichen)
**And** der Inhalt ist Teil der Versions-Chain (jede Änderung erzeugt eine neue Version).

**Given** das Textfeld wird editiert
**When** 2 Sekunden Pause (Auto-Save aus Story 2.5, wiederverwendet)
**Then** wird die neue Version persistiert.

**Given** die Ablösezeiten werden im Posten-Marker-Tooltip auf der Karte angezeigt
**When** der Nutzer den Marker hovert/tippt
**Then** erscheint ein kompakter Tooltip mit Titel + aktuellem Ablösezeit-Ausschnitt (≤ 120 Zeichen, gekürzt).

**And** die Schichtplanung als strukturierte Entity ist **explizit Phase 2** (FR30) und wird in diesem Epic nicht implementiert.

### Story 4.3: Sicherungsposten als MapGL-Marker-Layer

As a **Sicherheitsbeauftragter**,
I want **Sicherungsposten auf der Lagekarte als Marker zu sehen, optisch von anderen taktischen Zeichen unterscheidbar**,
So that **ich auf einen Blick sehe, wo postiert ist und wo ggf. Lücken bestehen (FR28, UX-DR12)**.

**Acceptance Criteria:**

**Given** die Lagekarte des Einsatzes
**When** sie mit einem Sicherungsposten-Layer initialisiert wird
**Then** erscheinen alle aktiven Sicherungsposten als Marker
**And** der Marker-Style nutzt `SecurityPostMapMarker` (UX-DR12) — SVG-Symbol mit Phosphor-Icon, abgesetzt von taktischen Zeichen anderer Module
**And** die Marker sind ≥ 32×32 px und unter `prefers-reduced-motion` ohne Animation.

**Given** MapGL (maplibre-gl + react-map-gl) ist die Map-Library
**When** der Sicherungsposten-Layer gerendert wird
**Then** nutzt er **ausschließlich** MapGL-Primitives (kein Leaflet, NFR-I4)
**And** integriert sich in die bestehende Layer-Verwaltung von `features/lagekarte/`.

**Given** ein Sicherungsposten hat keine Koordinate (nur Adresse/Freitext)
**When** der Layer gerendert wird
**Then** erscheint der Marker **nicht** auf der Karte
**And** in der Sicherungsposten-Liste wird ein Hinweis „Kein Standort – auf Karte nicht sichtbar" angezeigt.

**And** ein Legende-Eintrag „Sicherungsposten" ist in der Map-Legende vorhanden.

### Story 4.4: Bidirektionale Navigation Karte ↔ Detail-Ansicht

As a **Sicherheitsbeauftragter**,
I want **von einem Marker auf der Lagekarte direkt zur Sicherungsposten-Detail-Ansicht zu navigieren, und umgekehrt von einem Posten-Listeneintrag auf die Karte zu springen und den Marker zentriert zu sehen**,
So that **ich ohne Modus-Wechsel-Friktion zwischen Karte und Liste arbeiten kann (FR28 Teil 2)**.

**Acceptance Criteria:**

**Given** ein Sicherungsposten-Marker auf der Karte
**When** der Nutzer ihn tippt/klickt
**Then** öffnet sich ein Popover mit Titel, Personal, Ablösezeit-Ausschnitt und Link „Details öffnen"
**And** der Link navigiert zur Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id` (Deep-Link, Baustein für Story 7.4).

**Given** die Sicherungsposten-Liste im Sub-Tab
**When** der Nutzer auf „Auf Karte zeigen" bei einem Eintrag klickt
**Then** wechselt der Context zur Lagekarte-Ansicht
**And** die Karte zoomt/zentriert auf die Marker-Position
**And** der Marker wird kurzzeitig hervorgehoben (`prefers-reduced-motion`-konform: kein Blinken, nur ein einmaliger Highlight-Ring).

**Given** ein Sicherungsposten ohne Koordinate
**When** der Nutzer „Auf Karte zeigen" versucht
**Then** ist der Button deaktiviert mit Tooltip-Hinweis „Kein Standort hinterlegt".

**And** die Navigation erhält den Einsatz-Kontext (bleibt in `/app/einsatz/$einsatzId/...`).

---

## Epic 5: Vorfallmeldung & Unfallkassen-Export

Als Einsatzkraft, Abschnittsleiter oder Sicherheitsbeauftragter kann ich einen Vorfall mit Was/Wann/Wo/Beteiligte/Maßnahmen erfassen und als „Unfallkasse-relevant" kennzeichnen. Das System hängt automatisch einen zeitpunktgenauen Kontext-Snapshot an (Gefährdungsbeurteilung + aktive PSA-Profile + Sicherheitsregeln zur Vorfallzeit). Die Nachbereitung filtert, exportiert (PDF ≤ 5 s oder JSON) und jeder Export erzeugt einen Audit-Eintrag.

### Story 5.1: Vorfall erfassen mit Unfallkassen-Kennzeichnung

As a **Einsatzkraft (S-Stab, Abschnittsleiter oder Einheitsführer)**,
I want **einen Vorfall mit Pflichtfeldern Was/Wann/Wo/Beteiligte/Maßnahmen zu erfassen und optional als „Unfallkasse-relevant" zu kennzeichnen**,
So that **Vorfälle im laufenden Einsatz schnell dokumentiert werden, ohne Nacharbeit im Gerätehaus (FR31, FR32)**.

**Acceptance Criteria:**

**Given** ein aktiver Einsatz und eine berechtigte Rolle
**When** der Nutzer in der Eigenschutz-Route oder via Command Palette (`⌘K → Neuer Vorfall`, Story 7.3) auf „+ Vorfall" klickt
**Then** öffnet sich ein Drawer mit Feldern: Was (Freitext Titel ≤ 80 Zeichen, Pflicht), Wann (DateTime, Default = now, Pflicht), Wo (Freitext oder Koordinate, optional), Beteiligte (Multi-User + Freitext, optional), Maßnahmen (Textarea), Checkbox „Unfallkasse-relevant"
**And** alle Pflichtfelder sind mit `aria-required="true"` markiert.

**Given** der Nutzer füllt die Pflichtfelder aus
**When** er „Vorfall melden" klickt
**Then** wird ein `ReportVorfallCommand` abgeschickt
**And** der Server erzeugt einen `EigenschutzVorfall` mit FK `einsatzId` + `einheitId` + `erfasstVonUserId` + `erfasstAm`
**And** publiziert ein `VorfallGemeldet`-Event in die Outbox.

**Given** der Nutzer markiert „Unfallkasse-relevant"
**When** der Command durchläuft
**Then** wird `unfallkasseRelevant = true` gespeichert
**And** bei nicht-markierter Checkbox bleibt `unfallkasseRelevant = false`.

**Given** Rollen mit `eigenschutz:vorfall:report` (S-Stab, Abschnittsleiter, Einheitsführer)
**When** sie den Endpoint aufrufen
**Then** ist der Report erlaubt (FR31)
**And** andere Rollen erhalten HTTP 403.

**Given** der Nutzer arbeitet offline
**When** er einen Vorfall erfasst
**Then** wird die Meldung lokal im Platform Storage Adapter gespeichert (FR48)
**And** bei Wiederverbindung automatisch an den Server repliziert (FR49).

**And** `VorfallGemeldet` ist an den 4 Stellen der Event-Registry eingetragen.

### Story 5.2: Zeitpunkt-genauer Kontext-Snapshot + Nur-Lese-Viewer

As a **Sabine (Nachbereitung)**,
I want **dass beim Erfassen eines Vorfalls automatisch der Kontext (Gefährdungsbeurteilung, aktive PSA-Profile, zugeordnete Sicherheitsregeln) zur Vorfallzeit unveränderlich angehängt wird, und ich diesen Snapshot später in einer klar abgegrenzten Read-Only-Ansicht sehen kann**,
So that **ich juristisch belastbar nachvollziehen kann, welche Schutzmaßnahmen zum Vorfallzeitpunkt galten — unabhängig von späteren Änderungen (FR33, Innovations-Anker)**.

**Acceptance Criteria:**

**Given** der Server empfängt einen `ReportVorfallCommand`
**When** der `TransactionalCommandHandler` die Transaktion ausführt
**Then** wird in derselben Transaktion der `kontextSnapshot JSONB` in `eigenschutz_vorfall` gefüllt
**And** der Snapshot folgt dem Zod-Schema `EigenschutzKontextSnapshotV1` (AR10) aus `packages/shared/schemas/eigenschutz-snapshot.schema.ts`
**And** enthält: aktuelle Gefährdungsbeurteilungs-Version des Abschnitts (Temporal Query auf `GefaehrdungsbeurteilungVersion` mit `gueltigVon <= vorfallZeit AND (gueltigBis > vorfallZeit OR gueltigBis IS NULL)`), alle aktiven `psa_profil_zuweisung`-Zeilen mit `gueltigVon <= vorfallZeit AND (gueltigBis > vorfallZeit OR gueltigBis IS NULL)`, zugeordnete Sicherheitsregel-Versionen.

**Given** der Vorfall ist gespeichert
**When** der `kontextSnapshot` einmal geschrieben ist
**Then** wird er **niemals aktualisiert** (Invariante — Architekur B2)
**And** eine eventuelle Korrektur des Vorfall-Eintrags (Beteiligte, Maßnahmen) ändert **nicht** den Snapshot.

**Given** die Vorfall-Detail-Ansicht
**When** sie geladen wird
**Then** erscheint oben ein prominenter Header „Stand zum Vorfall-Zeitpunkt: HH:MM DD.MM.YYYY" in `surface-raised + border-strong` (UX-DR5)
**And** die Kontext-Blöcke darunter sind als Read-Only markiert (`aria-readonly="true"`)
**And** im Mikro-Footer steht „historischer Stand, nicht aktuell"
**And** die Sprache in den Kontext-Blöcken ist im Präteritum („PSA war: Basis, Infektion").

**Given** die `versionId`-Felder im Snapshot sind FK-Hinweise
**When** der Nutzer auf „Im Kontext zeigen" klickt (Option für S-Stab)
**Then** öffnet sich die vollständige Version der Gefährdungsbeurteilung/PSA-Zuweisung aus `*_version`-Tabelle in separatem Popup (Navigation zur Historie).

**And** ein Test verifiziert: nach einer `ReportVorfallCommand`-Transaktion enthält `kontextSnapshot` exakt den zum Zeitpunkt gültigen Stand — auch wenn unmittelbar danach die Gefährdungsbeurteilung neu bewertet wurde.

### Story 5.3: Vorfall-Liste mit Filtern

As a **Sabine (Nachbereitung)**,
I want **eine Liste aller Vorfälle eines Einsatzes nach Abschnitt, Zeitraum und „Unfallkasse-relevant" filtern zu können**,
So that **ich schnell genau die Vorfälle finde, die ich für die Unfallkassen-Meldung aufbereiten muss (FR36, UX-DR26)**.

**Acceptance Criteria:**

**Given** der Sub-Tab „Vorfälle" im Einsatz
**When** die Seite geladen wird
**Then** zeigt sie eine Filter-Bar (persistent via TanStack Store + URL-Query-Params, UX-DR26) mit: Abschnitt-Dropdown (Multi-Select), Zeitraum (von/bis), Checkbox „Nur Unfallkasse-relevant", Status (offen / geschlossen)
**And** die Filter sind deep-linkbar über URL-Params (Shared-Link-fähig, UX-Spec).

**Given** eine Liste gefilterter Vorfälle
**When** die UI rendert
**Then** zeigt jede Zeile: Zeitstempel, Titel, Abschnitt, Kennzeichnung „UK-rel." Badge, Erfasser, Aktionen
**And** `/`-Shortcut fokussiert das Filter-Such-Feld (UX-DR15 + UX-DR26).

**Given** der Nutzer klickt eine Zeile
**When** die Navigation erfolgt
**Then** öffnet sich die Vorfall-Detail-Seite (Story 5.2)
**And** die URL ist Deep-Link-fähig (`.../vorfaelle/$id`, Baustein für Story 7.4).

**Given** leere Filter-Ergebnisse
**When** keine Vorfälle matchen
**Then** zeigt ein EmptyState „Keine Vorfälle für diese Filter" + Button „Alle Filter zurücksetzen" (UX-Spec Empty States).

**Given** die Permission `eigenschutz:vorfall:read` (alle Einsatz-Rollen)
**When** die Liste geladen wird
**Then** werden nur Vorfälle des aktuellen Einsatzes angezeigt (via `EinsatzScopeGuard`).

### Story 5.4: PDF-Export eines Vorfalls

As a **Sabine (Nachbereitung)**,
I want **einen Vorfall als PDF mit eingebettetem Kontext-Snapshot (Gefährdung, PSA-Profile, Sicherheitsregeln zum Zeitpunkt) zu exportieren**,
So that **ich die Unfallkassen-Meldung ohne weitere Nachpflege einreichen kann (FR34, AR13)**.

**Acceptance Criteria:**

**Given** ein Vorfall mit vollständigem `kontextSnapshot`
**When** die Nachbereitungs-Rolle auf „Als PDF exportieren" klickt
**Then** wird `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle/:id/export?format=pdf` aufgerufen
**And** der Server generiert das PDF über `EigenschutzVorfallPdfRenderer` (Basis: `pdfkit@0.18`, AR13)
**And** das PDF arbeitet ausschließlich auf `kontextSnapshot` — kein Join auf aktuelle `*_version`-Tabellen (AR13 self-contained).

**Given** ein Standard-Vorfall (≤ 5 Beteiligte, ≤ 10 Gefährdungen)
**When** der Export durchläuft
**Then** wird das PDF in **≤ 5 s** erzeugt (NFR-P5).

**Given** das generierte PDF
**When** es geöffnet wird
**Then** enthält es: Header „Vorfall-Meldung Eigenschutz", Vorfall-Metadaten (Wann/Wo/Wer/Was/Maßnahmen), Abschnitt „Stand zum Vorfall-Zeitpunkt" mit: (a) Gefährdungsbeurteilungs-Items inkl. Risikoklasse, (b) aktive PSA-Profile zum Zeitpunkt, (c) Sicherheitsregeln, Footer mit „Erzeugt am DD.MM.YYYY HH:MM durch Sabine (Rolle Nachbereitung)" + Einsatz-ID.

**Given** ein Nutzer ohne `eigenschutz:vorfall:export`
**When** er den Export aufruft
**Then** antwortet der Server mit HTTP 403 (FR47).

**And** der Browser-Download startet automatisch mit sprechendem Dateinamen (z. B. `vorfall-{vorfallId}-{datum}.pdf`).

### Story 5.5: JSON-Export eines Vorfalls

As a **Sabine (Nachbereitung)**,
I want **einen Vorfall als strukturierten JSON-Datensatz nach einem versionierten Zod-Schema zu exportieren**,
So that **ich den Vorfall später automatisiert in Landesunfallkassen-Portale einspielen oder weiterverarbeiten kann (FR35)**.

**Acceptance Criteria:**

**Given** ein Vorfall
**When** der Export als JSON mit `?format=json` aufgerufen wird
**Then** antwortet der Server mit HTTP 200 + `application/json`-Body nach Schema `EigenschutzVorfallExportV1` aus `packages/shared/schemas/`
**And** das Schema enthält: `schemaVersion: 1`, alle Vorfall-Felder, den vollständigen `kontextSnapshot`, Metadaten-Block `exportedAt / exportedByUserId / exportFormat`.

**Given** das Schema ist im Shared-Package
**When** das Frontend/Backend den Typ nutzt
**Then** ist die Typ-Sicherheit über TypeScript/Zod gewährleistet (Runtime + Compile-Time)
**And** das Schema ist dokumentiert (Zod `describe()` für jedes Feld).

**Given** ein zukünftiges Phase-2-Format (FR37 Landesunfallkassen)
**When** der Export `?format=bayern-uk` aufgerufen wird (Phase 2)
**Then** kann das Schema-Modell ohne Breaking Change erweitert werden (schemaVersion-basiert, Architektur B11).

**And** der JSON-Export triggert denselben Audit-Pfad wie PDF (siehe Story 5.6).

### Story 5.6: Export-Audit-Trail (`VorfallExportiert`-Event)

As a **Administrator**,
I want **dass jeder Export (PDF oder JSON) eines Vorfalls einen auditierbaren Eintrag erzeugt**,
So that **ich nachvollziehen kann, wer wann was exportiert hat — für Compliance und Incident-Response (AR14)**.

**Acceptance Criteria:**

**Given** ein Export wurde erfolgreich durchgeführt
**When** der Server den Download ausliefert
**Then** publiziert er in derselben Transaktion ein `VorfallExportiert`-Event mit `{vorfallId, einsatzId, exportedByUserId, format: 'pdf' | 'json', downloadedAt}` in die Outbox
**And** das Event landet in der Audit-Timeline des Vorfalls.

**Given** die Audit-Timeline eines Vorfalls
**When** ein Nutzer sie öffnet
**Then** erscheinen Export-Einträge chronologisch mit „Export durch {userName} als {format} am DD.MM.YYYY HH:MM"
**And** die Historie ist Read-Only (append-only, NFR-S4).

**Given** `VorfallExportiert` ist ein Domain-Event
**When** es publiziert wird
**Then** ist es an den 4 Stellen der Event-Registry eingetragen (Serializer, Deserializer, Adapters-Modul, Adapters-Index)
**And** kann in Prometheus-Metriken (Story 7.9) für „Export-Rate pro Einsatz" aggregiert werden.

**And** ein fehlgeschlagener Export erzeugt **keinen** `VorfallExportiert`-Eintrag (nur erfolgreiche Downloads werden auditiert).

---

## Epic 6: Ampel-Dashboard & Live-Status-Übersicht

Als Sicherheitsbeauftragter sehe ich auf der Eigenschutz-Startseite ein Ampel-Dashboard mit Rot/Gelb/Grün-Status pro Einsatzabschnitt — in < 2 s erfassbar. Der Dashboard-View ist zwischen **Card Grid (Direction B)** und **Focus + List (Direction C, opt-in ab ≥ 1024 px)** umschaltbar. Die Ampel-Projektion wird event-getrieben aus allen Eigenschutz-Ereignissen ≤ 1 s aktualisiert.

### Story 6.1: Ampel-Projektion Backend (Read-Model + Event-Handler)

As a **Backend-Entwickler**,
I want **eine materialisierte `AmpelProjection`-Tabelle, die event-getrieben aus allen Eigenschutz-Events auf dem aktuellen Stand gehalten wird**,
So that **das Frontend die Ampel-Werte in ≤ 1 s abfragen kann, ohne Join-Navigation über die Historien-Tabellen (FR38, AR11, NFR-P4)**.

**Acceptance Criteria:**

**Given** das Schema aus Story 1.4
**When** die `AmpelProjection`-Tabelle angelegt ist
**Then** hat sie die Spalten: `einsatzId`, `einheitId`, `status AmpelStatus`, `aktivePsaProfile PsaProfil[]`, `offeneGefaehrdungenHoch INT`, `ausstehendePsaQuittungen INT`, `ausstehendeRegelQuittungen INT`, `offeneVorfaelle INT`, `ungelesteRueckmeldungen INT`, `letzteAenderungAm TIMESTAMPTZ`, `letzteAenderungVonUserId`
**And** Primary Key `(einsatzId, einheitId)` + Index für schnelle Abfragen.

**Given** ein Event aus der Eigenschutz-Event-Liste trifft ein
**When** der Event-Handler läuft
**Then** aktualisiert er die `AmpelProjection`-Zeile für die betroffene `(einsatzId, einheitId)`-Kombination
**And** die Re-Kalkulation ist idempotent via `eventId`-Dedup (keine Doppel-Updates bei Event-Replay).

**Given** die Event-Handler-Matrix (Architektur B4)
**When** sie registriert werden
**Then** reagieren Handler auf: `GefaehrdungsbeurteilungAktualisiert` (inkrementiert/dekrementiert `offeneGefaehrdungenHoch`), `PsaProfilGeaendert` (aktualisiert `aktivePsaProfile` + `ausstehendePsaQuittungen`), `QuittungAbgegeben` (dekrementiert Quittungs-Zähler), `QuittungUeberfaelligEvent` (kein direktes Update, nur zur Flagging-Logik), `VorfallGemeldet` (inkrementiert `offeneVorfaelle`), `SicherheitsregelAusgerufen` / `SicherheitsregelQuittiert` (Regel-Quittungen), `LueckeGemeldet` / `LueckeAufgeloest` (Rückmeldungen).

**Given** die `AmpelStatus`-Ableitung
**When** die Projection aktualisiert wird
**Then** gilt: `ROT` wenn `offeneGefaehrdungenHoch > 0 AND keine Schutzmaßnahme` **oder** `offeneVorfaelle > 0`; `GELB` wenn `ausstehendePsaQuittungen > 0 OR ausstehendeRegelQuittungen > 0 OR ungelesteRueckmeldungen > 0`; `GRUEN` sonst
**And** diese Logik ist zentral im Domain-Service `AmpelStatusBerechnungService` und unit-getestet.

**Given** ein Replay aus Version-Tabellen
**When** ein Admin eine Schema-Migration ausführt
**Then** lässt sich die `AmpelProjection` aus den Event-Logs + Version-Tabellen rekonstruieren (via Rebuild-Command).

**Given** das Read-Endpoint `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/ampel`
**When** es aufgerufen wird
**Then** antwortet es mit allen `AmpelProjection`-Zeilen für den Einsatz in **≤ 100 ms** (p95) und maximal ≤ 1 s für den gesamten Round-Trip inklusive WS-Event-Verarbeitung (NFR-P4).

### Story 6.2: `AmpelDashboard` + `AmpelCard` (Direction B, Default)

As a **Sicherheitsbeauftragter**,
I want **auf der Eigenschutz-Startseite ein Karten-Grid, das mir pro Einsatzabschnitt den aktuellen Sicherheits-Status in Farbe + Icon zeigt — zusammen mit aktiven PSA-Profilen, Quittungsstand und Primär-Aktion**,
So that **ich in < 2 s erkennen kann, wo Aufmerksamkeit nötig ist (FR38, UX-DR11, UX-DR8)**.

**Acceptance Criteria:**

**Given** die Eigenschutz-Startseite
**When** sie geladen wird
**Then** rendert sie das `AmpelDashboard` mit einer Karte pro Einheit
**And** das Grid ist responsiv: 1 Spalte (≤ 640 px), 2 Spalten (≤ 1440 px), 3 Spalten (≥ 1440 px) (UX-DR24).

**Given** eine `AmpelCard`
**When** sie rendert
**Then** zeigt sie: `StatusIndicator` (Ampel-Icon + Text-Label „Rot/Gelb/Grün") oben links (UX-DR8), Abschnitts-Name, aktive PSA-Profil-Chips, `AcknowledgmentStatusBadge` (Quittungsstand), Letzte-Änderung-Zeit, Primäraktion „PSA ändern" (falls Permission), Sekundäraktion „Verlauf"
**And** der Status ist **immer** redundant über Icon + Text kommuniziert (NFR-A2).

**Given** die Card hat Status `ROT`
**When** sie rendert
**Then** ist der Card-Rand `border-strong` + zusätzliche Icon-Prominenz (keine blinkende Animation, `prefers-reduced-motion`-freundlich).

**Given** die Card wird in einer schmalen Slot-Breite gerendert (z. B. im Seitenpanel)
**When** Container-Queries aktiv sind
**Then** passt sie sich an das Slot-Format an (UX-DR24 `@container`)
**And** zeigt weniger Info-Dichte (nur Status + Name + PSA-Chips).

**Given** ein Nutzer mit Touch-Gerät
**When** er eine Karte tippt
**Then** öffnet sich die Detail-Ansicht der Einheit (oder PSA-Drawer bei Tap auf Primary-Action).

**And** die `AmpelCard` ist in Storybook mit State-Matrix (idle/hover/focus/loading/error/empty) dokumentiert (UX-DR28).

### Story 6.3: Focus-View (Direction C) opt-in + View-Toggle persistent

As a **Sicherheitsbeauftragter am Desktop ≥ 1024 px**,
I want **optional auf eine „Fokus-Ansicht" umzuschalten, die links eine kompakte Liste und rechts das Detail des ausgewählten Abschnitts zeigt, und diese Entscheidung soll pro User persistiert werden**,
So that **ich bei großen Einsätzen Überblick + Tiefe gleichzeitig habe, ohne zwischen Karten hin und her zu springen (UX-DR11 Direction C)**.

**Acceptance Criteria:**

**Given** Viewport ≥ 1024 px (`lg`)
**When** der Nutzer den View-Toggle in der Dashboard-Toolbar sieht
**Then** zeigt er `[Überblick]` (Card Grid / Direction B, Default) und `[Fokus]` (Direction C) als gleichberechtigte Buttons
**And** ein Klick wechselt die Ansicht ohne Page-Reload.

**Given** Viewport < 1024 px
**When** der Toggle angezeigt wird
**Then** ist `[Fokus]` deaktiviert mit Tooltip-Hinweis „Fokus-Ansicht benötigt ≥ 1024 px".

**Given** Direction C aktiv
**When** die UI rendert
**Then** zeigt sie links eine `AmpelDashboardRow`-Liste (kompakt, 44-56 px Zeilen) und rechts ein Detail-Panel mit dem ausgewählten Abschnitt (Header, PSA-Status, Einheiten-Liste, Gefährdungen-Liste, Sicherheitsregeln-Liste)
**And** beide Spalten nutzen den **gleichen** TanStack-Query-Hook `useEigenschutzAmpelStatus(einsatzId)` — kein zweiter Endpoint (UX-Spec).

**Given** der User wechselt die Ansicht
**When** der View-Toggle klickt
**Then** wird der neue Wert in TanStack Store `eigenschutz.dashboardView: 'cards' | 'focus'` gesetzt
**And** im Platform Storage Adapter persistiert (Desktop über `@tauri-apps/plugin-store`, Browser über `localStorage`, Architektur B12)
**And** bleibt über Einsatz-Sessions hinweg erhalten (User-global, nicht einsatz-spezifisch).

**Given** `prefers-reduced-motion: reduce`
**When** zwischen den Views gewechselt wird
**Then** gibt es keine Transition-Animation, der Wechsel ist abrupt.

### Story 6.4: Offene Vorfälle + Rückmeldungen-Seitenpanel

As a **Sicherheitsbeauftragter**,
I want **im Dashboard ein Seitenpanel, das mir offene Vorfälle und ungelöste Rückmeldungen (Ausrüstungs-Lücken) des aktuellen Einsatzes zusammengefasst anzeigt**,
So that **ich Nicht-Abschnitt-spezifische Punkte nicht im Dashboard verliere (FR39)**.

**Acceptance Criteria:**

**Given** Viewport ≥ 1280 px (`xl`)
**When** das Dashboard rendert
**Then** erscheint rechts ein Seitenpanel mit zwei Abschnitten: „Offene Vorfälle" + „Ungelöste Rückmeldungen"
**And** unterhalb `xl` ist das Panel kollabiert (Chip-Indikator zeigt Anzahl, Klick öffnet Modal).

**Given** das Panel „Offene Vorfälle"
**When** es rendert
**Then** zeigt es die N offenen Vorfälle des aktuellen Einsatzes, sortiert nach neuestem zuerst
**And** jeder Eintrag zeigt: Titel, Zeitstempel, Abschnitt, UK-Relevanz-Badge, Link „Öffnen".

**Given** das Panel „Ungelöste Rückmeldungen"
**When** es rendert
**Then** zeigt es gemeldete Ausrüstungs-Lücken (aus Story 3.6) ohne Auflösungs-Event
**And** jeder Eintrag zeigt: Einheit, Kurz-Meldung, Zeitstempel, Link „Bearbeiten".

**Given** die Daten kommen aus der `AmpelProjection` und zusätzlichen Queries
**When** neue Events eintreffen
**Then** aktualisiert sich das Panel live (≤ 1 s, NFR-P4).

**And** ein leerer Zustand zeigt „Keine offenen Punkte" pro Abschnitt.

### Story 6.5: Warn-Markierungen für unbearbeitete Gefährdungen + nicht-quittierte PSA

As a **Sicherheitsbeauftragter**,
I want **im Dashboard Warn-Markierungen auf Karten, die auf unbearbeitete Gefährdungen (keine Schutzmaßnahme) oder nicht-quittierte PSA-Änderungen hinweisen**,
So that **ich ohne aktives Suchen Aufmerksamkeits-Punkte finde (FR40)**.

**Acceptance Criteria:**

**Given** eine `AmpelCard`
**When** die zugrundeliegende Einheit `offeneGefaehrdungenHoch > 0` hat und für mindestens eine dieser Gefährdungen keine Schutzmaßnahme dokumentiert ist
**Then** erscheint auf der Karte ein Warn-Badge „Gefährdung ohne Schutzmaßnahme" (redundant Icon + Text)
**And** der Badge ist klickbar und öffnet die entsprechende Gefährdungsbeurteilung mit Fokus auf das Item.

**Given** eine Karte mit `ausstehendePsaQuittungen > 0` und einer überfälligen Quittung (> 5 min, siehe Story 3.7)
**When** die Karte rendert
**Then** erscheint ein zweites Warn-Badge „Quittung überfällig (HH:MM)"
**And** ein Klick führt zum Banner-Re-Prompt (Story 3.7).

**Given** mehrere Warn-Markierungen auf einer Karte
**When** sie rendern
**Then** werden sie in einer kompakten Badge-Zeile dargestellt, maximal 3 Badges direkt sichtbar (darüber „+N weitere").

**Given** `prefers-reduced-motion`
**When** die Warn-Badges erscheinen
**Then** gibt es kein Blinken, kein Pulsieren
**And** die Aufmerksamkeit kommt aus Farbe + Kontrast, nicht aus Bewegung (WCAG 2.1 AA).

**And** die Warn-Ableitungs-Logik ist im Domain-Service `AmpelWarnBadgeService` zentral (unit-getestet).

---

## Epic 7: MVP-Polish: Accessibility, Keyboard, Dark-Mode, Deep-Links & Telemetrie

Das Eigenschutz-Modul ist pilot-ready: WCAG 2.1 AA + BITV 2.0 konform, Keyboard-Shortcuts als First-Class-Bedienungspfad, Command-Palette-Integration, Deep-Links pro Entität, Dark-Mode-Severity-Tokens nachteinsatz-tauglich, Offline-UX ohne blockierende Modale, Zero-Toast-Policy, Destructive-Actions-Pattern, Alarm-Budget. Telemetrie + Prometheus sind für Pilot-Review einsatzbereit. Performance-Gates sind verifiziert.

### Epic-6-Handoff: verbindliche Schärfung für Epic 7

Die Retrospektive `epic-6-retro-2026-05-08.md` hat keinen Richtungswechsel ausgelöst, aber Epic 7 als Pilotfähigkeits-Epic geschärft. Die Handoffs aus R6-A2 bis R6-A8 werden direkt in Story 7.4, 7.7, 7.8, 7.10 und 7.11 aufgenommen oder als explizite Hardening-Folgepunkte sichtbar gehalten.

**Direkt in Epic 7 einzuarbeiten:**

- Deep-Link-Fokusziele für Warn-Badges, PSA-Checklisten und Gefährdungsdetails sind Produktvertrag, nicht optionales UI-Verhalten.
- Generated-Client-Date-Verträge werden in UI-/Journey-Tests mit echten `Date`-Objekten abgesichert, nicht mit still passenden String-Fixtures.
- Epic-6-Komponenten sind expliziter A11y- und Responsive-Audit-Scope: `StatusIndicator`, `AmpelCard`, `AmpelDashboardRow`, `AbschnittDetailPanel`, `EigenschutzOffenePunktePanel` und `AmpelWarnBadgeList`.
- Story-Validierungen trennen story-blockierende Fehler, Sandbox-Effekte und unrelated Repo-Signale sichtbar im Bericht.

**Als Hardening sichtbar halten, nicht im Polish verstecken:**

- Ampel-Read-Model-Konsistenz: monotone `letzteAenderungAm`, konsistenter Recompute-Snapshot und Sicherheitsregel-Versionierung müssen vor belastbarer Performance-Aussage bewusst entschieden oder als explizites Risiko dokumentiert sein.
- Query-Layer-Port-Schnitt für offene Rückmeldungen: direkter `PrismaService`-Zugriff wird bewusst akzeptiert, refaktoriert oder als separater Architektur-Follow-up geführt.
- Die unrelated Backend-Failure aus Story 6.5 in `prisma-gefaehrdungsbeurteilung.repository.spec.ts` wird separat triagiert und darf Epic-7-Story-Scope nicht verdecken.

### Story 7.1: Dark-Mode-Severity-Tokens + Nacht-Einsatz-Verifikation

As a **Sicherheitsbeauftragter im Nachteinsatz**,
I want **ein Dark-Mode-Theme mit OLED-warmen, blendarmen Severity-Farben, das bei dunklem Umgebungslicht nicht blendet, aber trotzdem Ampel-Signale klar vermittelt**,
So that **ich das Tablet im Fahrzeug oder Stab ohne Augenbrennen nutzen kann (UX-DR14)**.

**Acceptance Criteria:**

**Given** das bestehende Design-Token-System in `shared/ui/`
**When** neue Eigenschutz-Tokens ergänzt werden
**Then** existieren: `severity-critical-assertive`, `severity-warning`, `severity-info`, `psa-profile-basis`, `psa-profile-infektion`, `psa-profile-vu`, `psa-profile-cbrn-patient`, `psa-profile-vollschutz`, `sync-synced`, `sync-pending`, `sync-offline`, `sync-conflict`, `focus-ring-critical`
**And** jedes Token hat eine Light- und eine Dark-Variante.

**Given** das Dark-Mode-Theme ist aktiv
**When** ein `SeverityBanner variant="critical"` gerendert wird
**Then** nutzt es ein OLED-warmes Rot (statt Standard-Rot), das bei schwachem Umgebungslicht blendarm ist
**And** der Kontrast zu Text bleibt ≥ 7:1 (WCAG AAA für kritische Warnungen, NFR-A5).

**Given** der Nutzer wechselt zwischen Light- und Dark-Mode via `next-themes`
**When** der Wechsel passiert
**Then** werden alle Severity-/PSA-Tokens konsistent umgeschaltet, keine Reststellen in „falscher" Farbe.

**Given** Farbenfehlsichtigkeits-Simulation (Protanopia, Deuteranopia, Tritanopia)
**When** das Theme geprüft wird
**Then** bleiben PSA-Profile und Ampel-Status durch Icon + Text (NFR-A2) unterscheidbar
**And** Simulations-Screenshots sind in Storybook dokumentiert.

**And** Tokens werden über CSS-Custom-Properties in Tailwind bereitgestellt, sodass alle `AmpelCard`/`SeverityBanner`-Komponenten sie ohne Hardcoding konsumieren.

### Story 7.2: Keyboard-Shortcuts (global + kontextuell) + `<Kbd>`-Legende

As a **Power-User / Sicherheitsbeauftragter**,
I want **globale Shortcuts (`⌘K`, `/`, `N`, `V`, `?`, `Esc`) und kontextuelle Shortcuts (Enter/Space/Pfeiltasten in Drawer/Matrix) als First-Class-Bedienungspfad, mit einer jederzeit per `?` abrufbaren Legende**,
So that **ich das Modul ohne Maus vollständig bedienen kann — schneller und barrierefrei (UX-DR15)**.

**Acceptance Criteria:**

**Given** das Eigenschutz-Modul ist geöffnet
**When** der Nutzer `⌘K` (macOS) / `Ctrl+K` (Windows/Linux) drückt
**Then** öffnet sich die Command-Palette (UX-DR16, Story 7.3).

**Given** der Fokus ist im Dashboard oder Vorfall-Archiv
**When** der Nutzer `/` drückt
**Then** wird das Filter-Such-Feld fokussiert.

**Given** die folgenden Shortcuts
**When** sie ausgelöst werden
**Then** verhalten sie sich konsistent: `N` → Neue Gefährdungsbeurteilung, `V` → Neuer Vorfall, `Esc` → Drawer/Dialog schließen, `?` → Shortcut-Hilfe-Popover.

**Given** ein Drawer ist offen
**When** kontextuelle Shortcuts aktiv sind
**Then** gilt: `Enter` → Bestätigen, `Shift+Enter` → Neue Zeile in Textarea, `Pfeiltasten` → Matrix-Navigation, `Space` → Chip-Toggle / Checkbox (UX-Spec Keyboard-Pattern).

**Given** der `<Kbd>`-Atom wird verwendet
**When** ein Shortcut angezeigt wird
**Then** nutzt er Plattform-Auto-Detect (`⌘N` auf macOS, `Ctrl+N` auf Windows/Linux).

**Given** der Nutzer drückt `?`
**When** das Shortcut-Popover öffnet
**Then** listet es alle globalen und kontextuell-aktiven Shortcuts in einer übersichtlichen Tabelle
**And** ist per Esc wieder schließbar.

**And** alle Shortcuts sind im Storybook dokumentiert und in Vitest-Tests (mit `@testing-library/user-event`) abgedeckt (NFR-M1).

### Story 7.3: Command-Palette-Integration für Eigenschutz-Aktionen

As a **Sicherheitsbeauftragter**,
I want **in der Command-Palette (`⌘K`) alle MVP-Aktionen des Eigenschutz-Moduls direkt aufrufen zu können, mit Präfix „Eigenschutz: …"**,
So that **ich ohne Navigation-Klicks zur gewünschten Aktion komme (UX-DR16)**.

**Acceptance Criteria:**

**Given** die `cmdk`-basierte Command-Palette ist im Plattform-Gerüst vorhanden
**When** sie mit `⌘K` geöffnet wird und der Nutzer „Eigenschutz" tippt
**Then** erscheinen Befehle: „Eigenschutz: Neue Gefährdungsbeurteilung", „Eigenschutz: Neuer Vorfall", „Eigenschutz: PSA-Profil ändern", „Eigenschutz: Sicherheitsregel erstellen", „Eigenschutz: Sicherungsposten anlegen", „Eigenschutz: Dashboard öffnen", „Eigenschutz: Konflikte auflösen", „Eigenschutz: Vorfall-Archiv öffnen".

**Given** ein Nutzer hat nicht die notwendige Permission für eine Aktion
**When** die Palette rendert
**Then** wird die Aktion ausgeblendet **oder** sichtbar aber deaktiviert mit Tooltip „Keine Berechtigung".

**Given** eine Aktion erzeugt einen Deep-Link-fähigen Zustand (z. B. PSA-Drawer öffnen)
**When** die Aktion ausgewählt wird
**Then** wird die URL aktualisiert, sodass ein Refresh den Drawer weiterhin offen zeigt (Baustein für Story 7.4).

**Given** die Command-Palette
**When** sie rendert
**Then** sind die Eigenschutz-Befehle in einer Gruppe „Eigenschutz" gebündelt (keine Verteilung über andere Modul-Gruppen).

**And** Fuzzy-Matching der `cmdk`-Library funktioniert mit deutschen Sonderzeichen (ä/ö/ü/ß).

### Story 7.4: Deep-Links pro Entität + „Link kopieren"-Button

As a **Sicherheitsbeauftragter**,
I want **für jede Eigenschutz-Entität (Gefährdungsbeurteilung, PSA-Zuweisung, Sicherheitsregel, Sicherungsposten, Vorfall) einen stabilen Deep-Link inkl. „Link kopieren"-Button, der direkt zur Detail-Ansicht führt**,
So that **ich einem Kollegen im Einsatz per Chat oder Funk einen Link schicken kann, der die genau richtige Ansicht öffnet (UX-DR17)**.

**Acceptance Criteria:**

**Given** jede Eigenschutz-Entität hat eine kanonische URL
**When** ein Detail-Header gerendert wird
**Then** zeigt er einen „Link kopieren"-Button (Icon + Text)
**And** ein Klick kopiert die vollständige URL in die Zwischenablage (Web-API `navigator.clipboard.writeText`, Tauri-Plugin falls nötig)
**And** ein kurzes Status-Feedback „Link kopiert" in der Statuszeile (kein Toast, UX-DR21).

**Given** die URL-Strukturen
**When** die Routen registriert werden
**Then** gilt: Gefährdungsbeurteilung `…/gefaehrdungen/$id`, PSA-Zuweisung `…/psa-profile/$zuweisungId`, Sicherheitsregel `…/sicherheitsregeln/$id`, Sicherungsposten `…/sicherungsposten/$id`, Vorfall `…/vorfaelle/$id`.

**Given** ein Nutzer öffnet einen Deep-Link in einem Tauri-Client
**When** die App noch nicht läuft
**Then** startet sie via `@tauri-apps/plugin-deep-link` und navigiert direkt zur Ziel-Route.

**Given** der Deep-Link verweist auf eine Entität eines anderen Einsatzes
**When** der Nutzer den Link öffnet
**Then** greift der `EinsatzScopeGuard` → HTTP 403
**And** das UI zeigt einen freundlichen „Diese Entität gehört zu einem anderen Einsatz"-Empty-State.

**And** die Deep-Link-Struktur ist in der OpenAPI-/Router-Doku als stabile URL-Contract dokumentiert.

**Given** ein Nutzer aktiviert einen Warn-Badge-, PSA-Checklisten- oder Gefährdungsdetail-Fokus aus `AmpelWarnBadgeList`, `AmpelCard`, `AmpelDashboardRow` oder `AbschnittDetailPanel`
**When** der Deep-Link geöffnet, kopiert oder nach Refresh wiederhergestellt wird
**Then** öffnet die Zielroute den richtigen Drawer bzw. das richtige Panel, scrollt das Ziel sichtbar in den Viewport und setzt den Tastaturfokus auf das fachlich gemeinte Element
**And** fehlende oder nicht mehr vorhandene Fokusziele zeigen einen zugänglichen Inline-Hinweis statt still auf die Oberseite zurückzufallen.

### Story 7.5: `SyncStatusBadge` + Offline-UX ohne blockierende Modale

As a **Nutzer im Einsatz**,
I want **jederzeit einen dezenten Sync-Status-Badge zu sehen (synchronisiert / lokal / offline / Konflikt), der bei Klick Detail-Informationen öffnet — aber mich nie mit blockierenden Modalen stoppt**,
So that **Offline-Betrieb ruhig und unspektakulär bleibt (UX-DR9, UX-DR23)**.

**Acceptance Criteria:**

**Given** eine beliebige Eigenschutz-Seite
**When** sie rendert
**Then** ist in der Statuszeile ein `SyncStatusBadge` mit einer der Varianten `synced | pending | offline | conflict` sichtbar
**And** das Badge-Label folgt dem Muster „Synchronisiert" / „Lokal · N ungesynct" / „Offline" / „Konflikt"
**And** Icon + Text immer kombiniert (NFR-A2).

**Given** der Badge wird geklickt
**When** der Popover öffnet
**Then** zeigt er Details: Anzahl offener Pending-Commands, Letzte Sync-Zeit, Zahl offener Konflikte, Link „Konflikte auflösen" (falls > 0).

**Given** die Netzwerkverbindung geht verloren
**When** der Client das merkt
**Then** wechselt das Badge auf `offline` **ohne** ein Modal zu öffnen
**And** alle UI-Flows bleiben bedienbar (FR48).

**Given** ein Konflikt ist entstanden (Story 3.9)
**When** das Badge wechselt auf `conflict`
**Then** erscheint zusätzlich ein kleiner `warning`-Mikro-Banner „Sync-Konflikt: jetzt auflösen" (UX-DR23)
**And** der Link führt zu `ConflictResolutionList` (Story 3.10).

**And** die Sync-Status-Logik nutzt den Platform Storage Adapter (ADR-010) als Quelle der Wahrheit — keine modul-eigene Queue.

### Story 7.6: Zero-Success-Toast-Policy + Destructive-Actions-Pattern (Konsistenz-Review)

As a **Design-System-Maintainer**,
I want **sicherstellen, dass alle Success-Feedbacks im Eigenschutz-Modul über Status-Änderung laufen (nicht über Pop-up-Toasts) und alle destruktiven Aktionen dem Destructive-Pattern folgen**,
So that **die UX ruhig und konsistent bleibt (UX-DR21, UX-DR27)**.

**Acceptance Criteria:**

**Given** alle Mutations-Flows im Eigenschutz-Modul
**When** sie erfolgreich sind
**Then** gibt es **keinen** Erfolgs-Toast (Sonner)
**And** das Feedback ist Status-Änderung der Zielzustand (Banner weg, Zeile grün, Statuszeile „Synchronisiert")
**And** die einzige Ausnahme ist der Export-Download in Story 5.4/5.5: dort ein einmaliger Info-Toast mit Retry-Link.

**Given** alle destruktiven Aktionen (z. B. letztes Basis-Profil entfernen, Sicherungsposten löschen, PSA-Herabstufung)
**When** sie aufgerufen werden
**Then** haben sie: Begründungs-Feld Pflicht, `status-danger`-Outline-Button (nicht filled), Hinweis „Diese Änderung wird historisiert und kann nicht gelöscht werden", keine „Bist du sicher?"-Modale (UX-DR27).

**Given** ein Destructive-Button
**When** er gerendert wird
**Then** ist er **rechts** positioniert, mit extra `gap-4` zum Primary-Button
**And** der Begründungs-Feld-Inhalt wird als Teil des Events gespeichert (gueltigVon-Notiz, FR12 für PSA).

**Given** ein automatisierter UX-Konsistenz-Test
**When** er über alle Eigenschutz-Komponenten läuft
**Then** verifiziert er: (a) keine `toast.success(...)`-Calls außerhalb des Export-Flows, (b) alle Destructive-Buttons haben die richtige Variant-Klasse, (c) alle destruktiven Aktionen haben ein Begründungs-Feld.

**And** die Policy ist in `frontend/src/features/eigenschutz/CONSISTENCY.md` (oder einer zentralen Eigenschutz-Doku) festgehalten.

### Story 7.7: Responsive-Verifikation auf Referenz-Geräten

As a **QA-Engineer**,
I want **sicherstellen, dass das Eigenschutz-Modul auf den Referenz-Geräten (iPad 11", Microsoft Surface 10", Desktop 1920×1080, Desktop 2560×1440, iPhone Mid-Range, Android Mid-Range) fehlerfrei funktioniert und die Breakpoint-Strategie greift**,
So that **Markus und Steffi auf ihren realen Geräten ohne Layout-Brüche arbeiten können (UX-DR24)**.

**Acceptance Criteria:**

**Given** die Breakpoint-Strategie (sm/md/lg/xl/2xl)
**When** das Dashboard auf jedem Referenz-Gerät getestet wird
**Then** passen sich die Layouts an: Smartphone ≤ 640 px = 1 Spalte + Drawer als Full-Screen-Modal; Tablet Portrait 641–767 px = 1 Spalte + Sub-Tab-Navigation; Tablet Landscape 768–1023 px = 2 Spalten; Desktop 1024–1440 px = 2-3 Spalten + Direction C verfügbar; Desktop ≥ 1440 px = 3 Spalten + Seitenpanel (UX-DR24).

**Given** Touch-Bedienung
**When** primäre Interaktionen getestet werden
**Then** sind alle interaktiven Elemente mindestens 44 px (Secondary) / 48 px (Primary) groß (WCAG 2.5.5).

**Given** Long-Press-Multi-Select (500 ms, UX-DR19)
**When** auf Touch-Geräten getestet
**Then** funktioniert die Geste konsistent auf iOS Safari und Android Chrome.

**Given** Pinch-Zoom auf der Lagekarte
**When** Nutzer zoomt
**Then** funktioniert er wie MapGL-Standard (keine Überlagerung durch Viewport-`maximum-scale=1`; WCAG 1.4.4).

**Given** ein Device-Test-Bericht
**When** er für die 6 Referenz-Geräte erstellt wird
**Then** dokumentiert er: (a) Breakpoint-Verifikation pro Gerät, (b) Touch-Target-Messung, (c) keine horizontalen Scrollbars bis 200 % Zoom (WCAG 1.4.10), (d) Performance-Kennzahlen (Route-TTI).

**Given** die in Epic 6 gelieferten Dashboard-Komponenten
**When** die Referenz-Geräte geprüft werden
**Then** umfasst die Checkliste mindestens `AmpelCard`, `AmpelDashboardRow`, `AbschnittDetailPanel`, `EigenschutzOffenePunktePanel`, `AmpelWarnBadgeList`, Cap-Hinweise und Seitenpanel/Dialog-Zustände
**And** Touch-Ziele, Row-Overflow, Badge-Umbruch, Fokuslinks und Warnanzahl bleiben auf allen Referenz-Geräten bedienbar und lesbar.

### Story 7.8: A11y-Audit + axe-core + Screenreader-Walk

As a **Accessibility-Advocate**,
I want **vor dem Pilot-Release einen dokumentierten A11y-Audit: axe-core 0 Violations auf allen Storybook-States, manuelle Screenreader-Durchläufe für Journey 1b (CBRN) auf NVDA + VoiceOver, und dokumentierte Abdeckung aller WCAG 2.1 AA Checkpoints**,
So that **das Modul BITV-2.0-kompatibel ist und Nutzer mit Einschränkungen es produktiv nutzen können (UX-DR28, NFR-A1-A7)**.

**Acceptance Criteria:**

**Given** alle Eigenschutz-Komponenten in Storybook
**When** ein automatisierter axe-core-Durchlauf (via `@axe-core/react` oder Storybook-Addon) läuft
**Then** zeigt er **0 Violations** auf allen State-Matrizen (idle/hover/focus/disabled/error/loading/empty).

**Given** Journey 1b (CBRN-Hochstufung)
**When** ein manueller Screenreader-Walk mit NVDA (Windows) und VoiceOver (macOS) durchgeführt wird
**Then** werden: (a) Ampel-Status korrekt angesagt („Rot: Abschnitt 1, zwei ausstehende Quittungen"), (b) `SeverityBanner` mit `assertive`-Live-Region vorgelesen, (c) Drawer-Fokus-Management ohne Fokus-Verlust, (d) PSA-Chip-Toggle via Space mit Screenreader-Feedback („Profil Infektion aktiviert. 2 Profile aktiv: Basis, Infektion").

**Given** die 11 WCAG-Checkpoints aus der UX-Spec (1.4.3, 1.4.10, 1.4.11, 1.4.13, 1.3.1, 2.1.1, 2.4.3, 2.4.7, 2.5.5, 3.3.1/3.3.3, 4.1.3)
**When** der Audit-Bericht erstellt wird
**Then** dokumentiert er pro Checkpoint: Anforderung + konkrete Eigenschutz-Umsetzung + Test-Ergebnis (UX-Spec A11y-Tabelle).

**Given** ein Keyboard-only-Test (ohne Maus)
**When** Journeys 1a, 1b, 2, 4 vollständig abgewickelt werden
**Then** alle Flows sind mit Tab / Shift-Tab / Shortcuts ohne Maus durchführbar
**And** Fokus-Indikator ist jederzeit sichtbar (`focus-ring` / `focus-ring-critical` Token, NFR-A6).

**Given** der A11y-Audit-Bericht
**When** er abgeschlossen ist
**Then** liegt er als Markdown-Dokument unter `docs/audits/eigenschutz-a11y-audit-{date}.md`
**And** enthält Kontrast-Verifikation (WCAG 1.4.3 ≥ 4.5:1 Normal, ≥ 7:1 Kritisch) in Light + Dark Mode.

**Given** der Audit-Scope wird festgelegt
**When** Epic-6-Komponenten aufgenommen werden
**Then** sind `StatusIndicator`, `AmpelCard`, `AmpelDashboardRow`, `AbschnittDetailPanel`, `EigenschutzOffenePunktePanel` und `AmpelWarnBadgeList` explizit gelistet
**And** der Audit prüft Statuskommunikation redundant über Text, Icon, zugänglichen Namen und Zähler, nicht nur über Farbe oder Position.

### Story 7.9: Prometheus-Metriken + Grafana-Ready

As a **SRE / Pilot-Auswerter**,
I want **dass aus den `EigenschutzTelemetryEvent`-Einträgen Prometheus-Histograms und -Counters erzeugt werden, aus denen ein Grafana-Dashboard die Signatur-KPIs (CBRN-Propagations-Dauer, Quittungs-Latenz, Blind-Ack-Rate) auslesen kann**,
So that **wir den Piloteinsatz objektiv ausrichten können (AR8 Frontend + Polish)**.

**Acceptance Criteria:**

**Given** das Telemetrie-Backend (Story 3.11)
**When** `EigenschutzTelemetryEvent`-Einträge verarbeitet werden
**Then** erzeugt ein Event-Handler Prometheus-Metriken via `@willsoto/nestjs-prometheus`: `eigenschutz_psa_propagation_duration_seconds` (Histogram, labels: `abschnittCount`), `eigenschutz_quittung_latency_seconds` (Histogram), `eigenschutz_blind_ack_total` (Counter, label: `einheitId`).

**Given** der Prometheus-Endpoint `/metrics`
**When** Grafana ihn scraped
**Then** sind die Metriken konsumierbar und in einem Grafana-Dashboard visualisierbar
**And** das Dashboard-JSON ist in `packages/backend/grafana-dashboards/eigenschutz-pilot.json` commited.

**Given** DSGVO-Konformität
**When** die Metriken gesammelt werden
**Then** enthalten Labels keine personenbezogenen Daten (nur `abschnittCount`, aggregierte `einheitId` sofern nicht direkt personenbezogen).

**Given** Prometheus + Grafana sind Plattform-Infrastruktur
**When** diese Story abgeschlossen ist
**Then** ist das Dashboard mit 4–5 Panels bereit: (1) CBRN-Propagations-Duration-Verteilung, (2) Quittungs-Latenz-Verteilung, (3) Blind-Ack-Rate über Zeit, (4) Anzahl Events pro Einsatz-Tag, (5) PDF-Export-Duration.

**And** die Dashboard-Abfrage-Geschwindigkeit ist < 5 s für typische Einsatzgrößen (20 Abschnitte, 100 Einheiten, 200 Telemetry-Events).

### Story 7.10: Performance-Audit + Bundle-Size-Gate

As a **Performance-Gatekeeper**,
I want **vor dem Pilot-Release einen dokumentierten Performance-Audit, der die NFR-P-Zielgrößen (Route-TTI ≤ 2 s, Propagation ≤ 2 s, Ampel-Refresh ≤ 1 s, PDF-Export ≤ 5 s, Sync ≤ 5 s, Bundle ≤ 150 kB gzip) verifiziert**,
So that **das Modul auch auf Stabs-Tablets flüssig läuft (NFR-P1–P7)**.

**Acceptance Criteria:**

**Given** das Eigenschutz-Frontend-Bundle
**When** ein Build-Report erstellt wird
**Then** ist das gzipped Feature-Bundle ≤ 150 kB (NFR-P7)
**And** die Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz` ist code-split (Route-Level-Splitting).

**Given** das Stabs-Tablet (Microsoft Surface 10" oder iPad 11")
**When** die Route mit warmem Cache geöffnet wird
**Then** beträgt die Time-to-Interactive ≤ 2 s (NFR-P1, Lighthouse-Messung).

**Given** Artillery-basierte Lasttests für die Signatur-Interaktion
**When** 50 parallele Clients die Route nutzen + PSA-Änderungen simulieren
**Then** bleibt die Propagations-Latenz ≤ 2 s (p95, NFR-P2)
**And** die Ampel-Aktualisierung ≤ 1 s (p95, NFR-P4).

**Given** die Ampel-Aktualisierung als NFR-P4 gemessen wird
**When** der Audit vorbereitet wird
**Then** ist vorher dokumentiert, wie `AmpelProjection` monotone `letzteAenderungAm`, konsistente Recompute-Snapshots und Sicherheitsregel-Versionierung behandelt
**And** falls eine dieser Konsistenzfragen noch offen ist, enthält der Performance-Audit ein explizites Risiko mit Owner und Folgepfad statt die Messung als uneingeschränkt belastbar zu markieren.

**Given** offene Rückmeldungen und offene Punkte in die Eigenschutz-Startseite einfließen
**When** der Performance- und Architektur-Hotspot-Check läuft
**Then** wird der direkte `PrismaService`-Zugriff im Rückmeldungs-Read bewusst akzeptiert, auf einen Read-Port-Schnitt refaktoriert oder als separater Architektur-Follow-up mit Owner dokumentiert.

**Given** ein PDF-Export für einen Standard-Vorfall
**When** er ausgelöst wird
**Then** ist er in ≤ 5 s fertig (NFR-P5).

**Given** ein Offline → Online Sync mit 50 Pending Commands auf 3 Clients
**When** die Verbindung wiederhergestellt wird
**Then** ist die Konsistenz in ≤ 5 s erreicht (NFR-P6).

**Given** der Audit-Bericht
**When** er abgeschlossen ist
**Then** liegt er unter `docs/audits/eigenschutz-performance-audit-{date}.md`
**And** enthält Messungen pro NFR-P-Kriterium + erreichte Werte + ggf. Mitigations falls Ziele nicht erreicht.

**Given** die Scalability-Zielgrößen NFR-C1 (20 Abschnitte, 100 Einheiten, 50 aktive Clients, 500 GB-Items, 200 Vorfälle) und NFR-C2 (`AmpelProjection` bleibt innerhalb NFR-P4 bei wachsender Historie)
**When** der Audit läuft
**Then** wird ein Artillery-Szenario mit diesen Parametern gefahren
**And** die Ergebnisse sind im Audit-Bericht dokumentiert.

**Given** die DSGVO-Anforderung NFR-S5 (Löschkonzept für abgeschlossene Einsätze)
**When** ein Einsatz von der Plattform-Lifecycle-Policy gelöscht wird
**Then** werden alle Eigenschutz-Entities (Gefährdung, PSA-Zuweisung, Vorfall inkl. Snapshot, Sicherheitsregeln, Sicherungsposten, Telemetrie-Events) kaskadierend mit-gelöscht
**And** das Verhalten ist als „Plattform-vererbt" dokumentiert (keine modul-eigene Löschlogik, ADR-010 Platform Storage + Plattform-Lifecycle)
**And** ein Integrationstest verifiziert: nach Einsatz-Löschung existieren keine Eigenschutz-Waisen-Einträge mehr.

### Story 7.11: E2E-Tests für Journeys 1b (CBRN) + 4 (Export)

As a **QA-Engineer**,
I want **zwei automatisierte E2E-Tests für die kritischen Pfade: (1) PSA-Hochstufung mit Bulk-Select + Quittung + Rück-Eskalation (Journey 1b), (2) Vorfall-Erfassung + Kontext-Snapshot + PDF/JSON-Export (Journey 4)**,
So that **Regressionen vor dem Pilot automatisch entdeckt werden (NFR-M1)**.

**Acceptance Criteria:**

**Given** die bestehende E2E-Test-Infrastruktur (Playwright oder Cypress, je nach Projekt-Standard)
**When** der Test „CBRN-Hochstufung" läuft
**Then** führt er durch: Login als Sicherheitsbeauftragter → Dashboard öffnen → 3 Abschnitte selektieren → PSA-Drawer öffnen → CBRN-Profil toggeln → Begründung eintragen → Submit → Verifikation: Event in Outbox, WebSocket-Broadcast, Banner bei allen 3 Abschnittsleiter-Sessions, Quittung durch 2 Abschnittsleiter, Rück-Eskalation durch 1 Abschnittsleiter → Dashboard zeigt Mix aus Grün/Amber.

**Given** der Test „Vorfall-Export"
**When** er läuft
**Then** führt er durch: Login als Einheitsführer → Vorfall erfassen (mit Unfallkasse-Relevanz) → Kontext-Snapshot wird automatisch erzeugt (Verifikation in DB) → Login als Nachbereitung → Vorfall filtern → Detail öffnen → Snapshot-Ansicht ist Read-Only → PDF-Export → Download-Verifikation (nicht 0 Bytes, enthält Vorfall-Titel) → JSON-Export → Schema-Validierung gegen `EigenschutzVorfallExportV1`.

**Given** die Tests laufen in CI
**When** sie triggered werden
**Then** nutzen sie isolierte Test-Datenbanken (Docker-Postgres oder testcontainers)
**And** die Coverage dieser Journeys zählt zur NFR-M1-Schwelle („kritische Pfade zusätzlich mit E2E-Tests").

**Given** die Signatur-Interaktion hat ein Zielfenster ≤ 90 s (Journey 1b)
**When** der Test ausgeführt wird
**Then** misst er die End-to-End-Dauer des Bulk-PSA-Changes + 3 Quittungen
**And** schlägt fehl bei Dauer > 90 s (Sanity-Check, kein Hard-Gate).

**Given** die CBRN- und Export-Journeys laufen
**When** fachliche Zustände erzeugt oder exportiert werden
**Then** wird die Eigenschutz-Startseite zusätzlich verifiziert: Ampelstatus, offene Punkte, Warn-Badges und relevante Fokuslinks zeigen den erwarteten Zustand nach den Journey-Schritten.

**Given** Tests oder Fixtures Ampel-Warnungen und Zeitdarstellungen prüfen
**When** Daten aus dem generierten Client verwendet werden
**Then** nutzen die Tests echte `Date`-Objekte gemäß Client-Vertrag und decken `AmpelWarnBadgeList` sowie verwandte Zeitdarstellungen gegen String-/Date-Drift ab.

**Given** der Validierungsbericht zu Story 7.11 erstellt wird
**When** einzelne Gates rot oder auffällig sind
**Then** trennt der Bericht story-blockierende Fehler, Sandbox-Effekte und unrelated Repo-Signale
**And** die aus Story 6.5 bekannte unrelated Failure in `prisma-gefaehrdungsbeurteilung.repository.spec.ts` ist separat triagiert oder mit Owner und Status verlinkt.

**And** die Tests sind als Teil der CI-Pipeline ausgeführt (nicht nur on-demand).

---

## Epic 8: Scope-Korrektur & Artefakt-Synchronisierung

Bereits umgesetzte Seeds, UI-Copy und Planungsartefakte des Eigenschutz-Moduls werden fachlich auf den dokumentierten Scope für weiße Hilfsorganisationen zurückgeführt, ohne abgeschlossene Fundament-Stories aus Epic 1 erneut zu öffnen. Das Epic ist bewusst klein und nachgelagert: keine neue Technikbasis, sondern Korrektur eines dokumentarischen und inhaltlichen Scope-Drifts.

### Story 8.1: Scope-Korrektur für Eigenschutz-Seeds und UI-Copy

As a **Produktverantwortlicher**,
I want **dass bereits umgesetzte Seed-Inhalte und MVP-Copy des Eigenschutz-Moduls sprachlich auf den dokumentierten Scope für weiße Hilfsorganisationen zurückgeführt werden**,
So that **die bestehende Implementierung keine feuerwehrspezifischen Atemschutz- oder Feuerwehr-Workflows als Teil des MVP suggeriert, obwohl diese explizit außerhalb der Zielausrichtung liegen**.

**Acceptance Criteria:**

**Given** die bereits umgesetzten Stories 1.4 und 2.1
**When** die Scope-Korrektur durchgeführt wird
**Then** werden Seed-Texte und UI-Kurzbeschreibungen in `packages/backend/prisma/seed.ts` und `packages/frontend/src/features/eigenschutz/constants/seed-szenarien.constants.ts` auf weiße HiOrg-Semantik ausgerichtet
**And** es bleiben **keine** feuerwehrspezifischen Atemschutz-Workflows als MVP-Beispieltext zurück.

**Given** CBRN-Patientenversorgung bleibt als Seed-Szenario im MVP
**When** die Seed-Inhalte beschrieben werden
**Then** fokussieren sie weiße-Zone-/Dekon-/Übergabepunkt-Logik und kontaminationsbezogenen Eigenschutz
**And** beschreiben **keine** Innenangriff-, Atemschutztrupp- oder Feuerwehr-Spezialabläufe.

**Given** die Kurskorrektur betrifft Scope, nicht Technikgrundlage
**When** die Umsetzung abgeschlossen ist
**Then** bleiben Prisma-Schema, Migrationen, Enums und API-Oberfläche unverändert
**And** die Änderung ist auf Copy-, Seed- und Planungsartefakte begrenzt.

**Given** die Planungsartefakte
**When** PRD, Architecture, UX-Spec und Epics synchronisiert sind
**Then** taucht dort keine feuerwehrspezifische Persona/Journey mehr als Teil des Eigenschutz-MVP auf
**And** spätere Spezialschutz-/Sonderlagen-Workflows werden nur noch generisch als separater Folgepfad benannt.

---
