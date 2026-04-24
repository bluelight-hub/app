---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
classification:
  projectType: web_app
  domain: govtech
  complexity: high
  projectContext: brownfield
inputDocuments:
  - github-issue:rubenvitt/bluelight-hub#415
  - docs/project-documentation/00-index.md
  - docs/project-documentation/01-projektueberblick.md
  - docs/project-documentation/06-datenmodell.md
workflowType: 'prd'
source_issue: 'https://github.com/rubenvitt/bluelight-hub/issues/415'
project_name: 'Bluelight Hub – Modul Eigenschutz (Einsatzkräfte-Sicherheit & PSA)'
documentCounts:
  briefs: 0
  research: 2
  brainstorming: 0
  projectDocs: 10
---

# Product Requirements Document – Modul Eigenschutz (Einsatzkräfte-Sicherheit & PSA)

**Author:** Ruben Vitt
**Date:** 2026-04-20
**Quelle:** [Issue #415 – Sicherheit: Eigenschutz](https://github.com/rubenvitt/bluelight-hub/issues/415)
**Status:** Draft – bereit für Review und Validation (siehe „Open Questions & Assumptions" am Ende)

## Inhalt

1. [Executive Summary](#executive-summary)
2. [Project Classification](#project-classification)
3. [User Journeys](#user-journeys)
4. [Success Criteria](#success-criteria)
5. [Product Scope](#product-scope)
6. [Domain-Specific Requirements](#domain-specific-requirements)
7. [Innovation & Novel Patterns](#innovation--novel-patterns)
8. [Web App (+ Tauri) Specific Requirements](#web-app--tauri-specific-requirements)
9. [Project Scoping & Phased Development](#project-scoping--phased-development)
10. [Functional Requirements](#functional-requirements)
11. [Non-Functional Requirements](#non-functional-requirements)
12. [Open Questions & Assumptions](#open-questions--assumptions)

## Executive Summary

Das Modul **Eigenschutz** digitalisiert die Arbeitsschutz-Aufgaben des Sicherheitsbeauftragten im Stab – in Echtzeit, während des Einsatzes, nicht danach. Zielnutzer sind Sicherheitsbeauftragte (S-Stab), Einsatzabschnittsleiter und Einheitsführer in weißen Hilfsorganisationen des Sanitätsdienstes und Katastrophenschutzes (z. B. DRK, JUH, MHD, ASB, DLRG).

Gelöst wird ein operatives Sicherheits-Problem: PSA-Anforderungen, Gefährdungsbeurteilungen und Sicherungsposten werden heute papierbasiert oder mental verwaltet. Informationen erreichen Abschnitte zu spät, Hochstufungen (z. B. auf CBRN) bleiben unbestätigt, Vorfälle werden erst nach dem Einsatz rekonstruiert – mit Lücken in der Unfallkasse-Meldung.

Das Modul liefert fünf zusammenhängende Fähigkeiten: **Gefährdungsbeurteilung** mit Risiko-Bewertung (Eintrittswahrscheinlichkeit × Schadensausmaß), **PSA-Verwaltung** mit vier Stufen pro Einsatzbereich, **Sicherheitsregeln** mit Bekanntgabe-Tracking, **Sicherungsposten-Dokumentation** mit Lagekarten-Verknüpfung und **Vorfallmeldung** mit Unfallkasse-Export. Alles versioniert, auditierbar, offline-fähig.

### What Makes This Special

Drei Differentiatoren heben das Modul von generischer Arbeitsschutz-Software ab:

1. **Tiefe Einsatz-Integration statt Compliance-Silo.** Sicherungsposten erscheinen direkt auf der Lagekarte, Gefährdungen aus dem Gefahren-Modul fließen in die PSA-Empfehlung. Kein Kontext-Wechsel zwischen Tools.
2. **Vorlagen-Bibliothek für Standardszenarien** (MANV, CBRN-Patientenversorgung, Betreuung, Sanitätsdienst-Großveranstaltung, Verkehrsunfall). Der Sicherheitsbeauftragte startet nicht bei Null – er passt vorgedachte Gefährdungs-Sets an die konkrete Lage an.
3. **Versionierung und Audit-Trail by design.** Jede Änderung an PSA-Stufe, Gefährdungsbeurteilung oder Sicherheitsregel ist mit Zeitstempel, Urheber und Begründung historisiert – auf Unfallkasse-Meldungen und interne Revisions-Anforderungen vorbereitet.

**Core Insight:** Arbeitsschutz im Einsatz ist operative Führungsaufgabe, kein Dokumentations-Nachspiel. Die Software muss während des Einsatzes handlungsfähig machen, nicht nach Einsatzende Lücken schließen.

**Value Proposition:** Der Sicherheitsbeauftragte wird vom reaktiven Dokumentierer zum proaktiven Schutz-Lotsen – mit Live-Ampel, vorbereiteten Vorlagen und rechtssicherer Historisierung in einem Werkzeug.

## Project Classification

- **Project Type:** Web App (React 19 + Vite) mit Tauri-Desktop-Shell
- **Domain:** GovTech / BOS (Behörden und Organisationen mit Sicherheitsaufgaben), Public Safety
- **Complexity:** High – Safety-Critical, Arbeitsschutz-regulatorisch (DGUV-Vorschriften als Referenz, Unfallkasse-Meldepflicht), tiefe Integration mit Lagekarte/Gefahren-Modul, Versionierungs- und Audit-Anforderungen
- **Project Context:** Brownfield – Neues Feature-Modul im bestehenden Bluelight-Hub-System (hexagonale Backend-Architektur, Feature-based Frontend)

## User Journeys

### Persona 1 — Markus, Sicherheitsbeauftragter im Stab (Primary)

**Hintergrund:** Markus, 42, ist Zugführer bei einem DRK-Kreisverband und seit drei Jahren als Sicherheitsbeauftragter für den Katastrophenschutz qualifiziert. Bei Einsätzen wird er vom Einsatzleiter regelmäßig als S-Stab eingebunden. Er kennt die DGUV-Vorschriften, aber unter Zeitdruck passieren ihm Lücken in der Doku, die ihn nachts wach halten.

#### Journey 1a — Happy Path: Gefährdungsbeurteilung für einen neuen Abschnitt

- **Opening Scene.** Freitagabend, MANV-Lage nach Busunfall. Markus wird in den Stab gerufen. Der Einsatzleiter hat drei Abschnitte gebildet (Patientenablage, Verkehr, Technik). Heute noch würde Markus mit Klemmbrett und vorgedruckten Papierformularen durch die Abschnitte laufen.
- **Rising Action.** Markus öffnet am Stabs-Tablet das Einsatz-Dashboard, navigiert zu Sicherheit → Eigenschutz. Er wählt den Abschnitt „Patientenablage", tippt auf „Neue Gefährdungsbeurteilung". Das System schlägt Standard-Gefährdungen für den Szenariotyp „MANV" vor (Nadelstichverletzung, psychische Belastung, Verkehr). Markus passt Eintrittswahrscheinlichkeit für zwei Items an, fügt eine einsatzstellenspezifische Gefährdung („Steile Böschung") hinzu.
- **Climax.** Das System errechnet Risikomatrix-Einstufung und schlägt PSA-Stufe 2 mit expliziter Warnweste vor. Markus bestätigt, das System propagiert die Stufe an den Abschnittsleiter, der eine Lese-Quittung gibt. Markus wechselt zum nächsten Abschnitt, repliziert die Vorlage, passt sie an. Drei Abschnitte in < 10 Minuten abgedeckt.
- **Resolution.** Markus hat Kapazität frei, um sich um den vierten Abschnitt zu kümmern, der spontan entsteht. Nach dem Einsatz existiert eine vollständige, versionierte Dokumentation — ohne Nacharbeit im Gerätehaus.
- **Revealed Capabilities.** Vorlagen-basierte Gefährdungsbeurteilung, Risikomatrix-Bewertung, automatische PSA-Empfehlung, Abschnitts-Zuordnung, Bekanntgabe-Kanal mit Quittung, Versionierung.

#### Journey 1b — Edge Case: Überraschende Hochstufung auf CBRN

- **Opening Scene.** Mitten im laufenden Einsatz meldet die Erkundung einen Gefahrstoff-Austritt. Der Einsatzleiter entscheidet: alle betroffenen Abschnitte sofort auf PSA-Stufe 3 (CBRN).
- **Rising Action.** Markus öffnet die PSA-Verwaltung, wählt die betroffenen Abschnitte per Mehrfachauswahl, wechselt Stufe 2 → Stufe 3. Das System verlangt eine Kurz-Begründung („Gefahrstoff-Austritt, Identifikation läuft") und markiert die Änderung als kritisch.
- **Climax.** Änderung propagiert binnen Sekunden an alle Abschnittsleiter. Wer nicht quittiert, erscheint rot markiert — Markus kann gezielt nachfragen. Parallel wird automatisch eine Notiz in der Gefahren-Modul-Verknüpfung erzeugt. Die alte Stufe bleibt im Versionsverlauf sichtbar.
- **Resolution.** Nach 90 Sekunden sind alle Abschnitte informiert und bestätigt. Markus dokumentiert die Stufenänderung nicht nachträglich — sie liegt bereits zeitgestempelt vor.
- **Revealed Capabilities.** Multi-Select auf Abschnitte, kritische Änderung mit Begründungs-Pflicht, Echtzeit-Propagation mit Quittungs-Tracking, Versionsverlauf, Querverlinkung zu Gefahren-Modul.

---

### Persona 2 — Steffi, Einsatzabschnittsleiterin (Secondary / Recipient)

**Hintergrund:** Steffi, 35, führt eine Sanitäts- und Betreuungseinheit in einem Kreisverband bei einer Unwetter-Lage. Sie hat fünf Einheiten unter sich. Für sie zählt: Keine Überraschungen, klare Ansagen zur PSA, sichtbarer Schutzstatus ihrer Leute.

#### Journey 2 — PSA-Änderung empfangen und umsetzen

- **Opening Scene.** Auf Steffis Tablet erscheint ein nicht-ignorierbarer Banner: „PSA-Stufe 2 → 3 für deinen Abschnitt. Grund: Gefahrstoff-Austritt".
- **Rising Action.** Tippt den Banner, sieht Checkliste der neuen Ausrüstung (z. B. flüssigkeitsdichter Schutzanzug, Chemikalienschutzhandschuhe, Schutzbrille/Visier). Markiert je Einheit, ob Ausrüstung verfügbar ist. Bei einer Einheit fehlt die Ausrüstung — sie setzt einen Vermerk, der den Sicherheitsbeauftragten benachrichtigt.
- **Climax.** Sobald alle Einheiten umgerüstet haben, bestätigt Steffi „Stufe umgesetzt". Der Stab sieht den Abschnitt im Dashboard wieder grün.
- **Resolution.** Steffi kann sich auf die taktische Führung konzentrieren — Dokumentation passiert beiläufig.
- **Revealed Capabilities.** Prominentes Alerting bei kritischen Änderungen, Ausrüstungs-Checkliste pro PSA-Stufe, Quittung je Einheit, Rück-Eskalations-Kanal bei Lücken.

---

### Persona 3 — Thomas, Stabs-Admin / Template-Pflege (Admin)

**Hintergrund:** Thomas, 51, organisationsweit zuständig für Standards und Schulungen. Er pflegt die Vorlagen-Bibliothek, damit Sicherheitsbeauftragte bei Lage X nicht jedes Mal neu denken müssen.

#### Journey 3 — Vorlage für Standardszenario anlegen/aktualisieren

- **Opening Scene.** Nach einer CBRN-Übung wird klar: die bestehende Gefährdungs-Vorlage hat zwei Lücken.
- **Rising Action.** Thomas öffnet den Admin-Bereich „Vorlagen", dupliziert die aktuelle CBRN-Vorlage in eine neue Version, ergänzt die beiden Gefährdungen, markiert die alte Version als „ausgelaufen".
- **Climax.** Veröffentlicht Version 1.3. Neue Einsätze bekommen automatisch die neue Vorlage; laufende Einsätze sehen einen Hinweis „neue Vorlage verfügbar".
- **Resolution.** Nächster CBRN-Einsatz profitiert — ohne dass Thomas direkt dabei sein muss.
- **Revealed Capabilities.** Vorlagen-Versionierung, Admin-Rolle mit separater Berechtigung, Benachrichtigung über Vorlagen-Updates, konsistentes Modell „laufend vs. neu".

---

### Persona 4 — Sabine, Einsatznachbereitung & Unfallkassen-Meldung (Compliance)

**Hintergrund:** Sabine, 48, Verwaltungskraft beim Kreisverband. Sie erstellt nach jedem größeren Einsatz die Unfallkassen-Meldung, wenn ein Vorfall gemeldet wurde.

#### Journey 4 — Vorfall-Export für Unfallkasse

- **Opening Scene.** Drei Tage nach dem Einsatz landet auf ihrem Schreibtisch: „Beinahe-Unfall — Patientenablage, Nadelstich-Situation, siehe Einsatzdoku".
- **Rising Action.** Sabine öffnet den Einsatz, filtert Vorfälle, öffnet den gemeldeten Eintrag. Sieht Was/Wann/Wo/Beteiligte/Maßnahmen, versionierte Gefährdungsbeurteilung zum Zeitpunkt des Vorfalls und PSA-Stufe zum Zeitpunkt.
- **Climax.** Klickt „Unfallkassen-Export". Das System erzeugt ein PDF mit Vorfall-Details und relevantem Kontext (Gefährdungsbeurteilung, PSA-Stufe, Sicherheitsregeln) und einen strukturierten Datensatz.
- **Resolution.** Sabine ergänzt den Brief, reicht die Meldung ein — ohne jemanden aus dem Einsatz anzurufen.
- **Revealed Capabilities.** Vorfall-Such-/Filter, zeitpunktgebundener Kontext-Abruf (Gefährdungs- und PSA-Stand zur Vorfallzeit), strukturierter + PDF-Export, Berechtigungs-getrennte Nachbereitungs-Rolle.

---

### Deferred Future Considerations

Weitergehende Spezialschutz- und Sonderlagen-Workflows sind **nicht** Bestandteil dieses PRD. Falls nach Pilotbetrieb zusätzlicher Bedarf sichtbar wird, werden diese Erweiterungen in einem **separaten Folge-PRD** spezifiziert, statt als halbintegrierter Nebenpfad im MVP-Narrativ mitzulaufen.

---

### Journey Requirements Summary

Die Journeys enthüllen folgende Capability-Gruppen (MVP-relevant sofern nicht anders markiert):

| Capability                                                                                                    | Quelle (Journey)                           |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Gefährdungsbeurteilung mit Risikomatrix, pro Abschnitt, versioniert                                           | 1a, 4                                      |
| Vorlagen-basierter Start (initial: wenige Basis-Vorlagen; Bibliothek Growth)                                  | 1a, 3                                      |
| Automatische PSA-Empfehlung aus Risikomatrix (Basis im MVP, Gefahren-Modul-Kopplung Growth)                   | 1a                                         |
| PSA-Stufen-Verwaltung pro Abschnitt mit Multi-Select                                                          | 1a, 1b                                     |
| Kritische Änderung mit Begründungs-Pflicht und Echtzeit-Propagation                                           | 1b, 2                                      |
| Quittungs-Tracking (pro Abschnitt / pro Einheit)                                                              | 1a, 1b, 2                                  |
| Ausrüstungs-Checkliste pro PSA-Stufe                                                                          | 2                                          |
| Rück-Eskalations-Kanal (Einheit meldet Lücke an S-Stab)                                                       | 2                                          |
| Ampel-Dashboard (Abschnitts-Status)                                                                           | 1a, 1b                                     |
| Sicherheitsregeln (Freitext + einfache Vorlagen), Bekanntgabe-Status                                          | 1a                                         |
| Sicherungsposten-Erfassung mit Lagekarte-Verknüpfung                                                          | implizit MVP, nicht eigenständig journey'd |
| Vorfallmeldung mit Kontext-Snapshot (Was/Wann/Wo/Beteiligte/Maßnahmen, zeitpunktgenaue Gefährdungs-/PSA-Lage) | 1a, 4                                      |
| Strukturierter Export inkl. PDF (Unfallkassen-tauglich; Landesunfallkassen-Formate Growth)                    | 4                                          |
| Versionierung / Audit-Trail aller sicherheitsrelevanten Entitäten                                             | 1a, 1b, 3, 4                               |
| Admin-Bereich für Vorlagen-Pflege inkl. Versionierung                                                         | 3                                          |
| Spezialschutz-/Sonderlagen-Workflows (Post-MVP, separater Folge-PRD)                                          | deferred                                   |
| Rollen-/Berechtigungs-Modell: S-Stab, Abschnittsleiter, Einheitsführer, Admin, Nachbereitung                  | übergreifend                               |
| Offline-Fähigkeit über alle Journeys                                                                          | übergreifend                               |

## Domain-Specific Requirements

Domain: **GovTech / BOS (Public Safety)**, Complexity: **High**. Arbeitsschutz und Einsatzdokumentation sind in Deutschland durch DGUV-Regelwerk und Unfallversicherungsrecht (SGB VII) gerahmt. Kein Medizinprodukt, kein FedRAMP — aber Rechenschaftspflicht und Nachvollziehbarkeit sind hoch.

### Compliance & Regulatory

- **DGUV-Vorschriften und -Informationen** (insbesondere DGUV Vorschrift 1 „Grundsätze der Prävention", branchenspezifische Regeln für Rettungsdienst, Sanitätsdienst und Katastrophenschutz) — das Modul unterstützt Dokumentationspflichten, ersetzt aber keine Rechtsberatung. Dokumentation muss so strukturiert sein, dass sie DGUV-Prüfungen standhält.
- **ArbSchG § 5 – Gefährdungsbeurteilung**: Pflicht zur Beurteilung der Arbeitsbedingungen. Das Modul muss Gefährdungsbeurteilungen pro Einsatzbereich **erstellbar, bewertbar, änderbar und historisierbar** machen.
- **SGB VII – Unfallversicherung**: Meldepflicht für Arbeitsunfälle. Vorfallmeldungen müssen für die Unfallkasse-Meldung nutzbar sein (strukturierter Kontext, zeitpunktgenau).
- **DSGVO**: Personenbezogene Daten (Einsatzkräfte-Namen, Rollen, ggf. Verletzungs-Informationen). **Datenminimierung** im Modul-Design, Löschkonzept für abgeschlossene Einsätze (bestehende Plattform-Policies nutzen).
- **Landesrechtliche Besonderheiten** (Katastrophenschutz- und organisationsbezogene Landesregelungen): Nicht im MVP hart kodiert; Landesunfallkassen-Exportformate als Growth-Feature.
- **Revisionssicherheit** der Änderungshistorie: Einträge nicht löschbar, nur durch neue Versionen überschreibbar; Urheber + Zeitstempel verpflichtend.

### Technical Constraints

- **Auditierbarkeit**: Jede Änderung an sicherheitsrelevanten Entitäten (Gefährdungsbeurteilung, PSA-Stufe, Sicherheitsregel, Vorfallmeldung, Sicherungsposten) erzeugt einen unveränderlichen Audit-Eintrag (wer, wann, was, ggf. warum). Nutzt bestehendes Event-Sourcing-/Outbox-Muster der Plattform (`backend/src/infrastructure/outbox/`).
- **Zeitpunktgenauer Kontext-Abruf**: Vorfallmeldungen müssen den Stand von Gefährdungsbeurteilung und PSA-Stufe zum Vorfall-Zeitpunkt reproduzieren können (Temporal Query bzw. versionierte Snapshots).
- **Offline-Fähigkeit**: Konsistent mit ADR-001/ADR-010 (Platform Storage Adapter Pattern). Schreibzugriffe offline möglich, deterministische Konflikt-Resolution bei Sync; kritische Konflikte (z. B. gleichzeitige PSA-Hochstufungen) werden explizit markiert und vom Stab aufgelöst.
- **Echtzeit-Propagation** (online): PSA-Änderungen in ≤ 2 s in allen betroffenen Clients sichtbar. Nutzt vorhandenes Event-/WebSocket-Stack der Plattform.
- **Zugriffskontrolle**: Rollen `sicherheitsbeauftragter`, `abschnittsleiter`, `einheitsfuehrer`, `admin`, `nachbereitung`. Schreibrechte auf Gefährdungsbeurteilung und PSA-Stufe nur für Sicherheitsbeauftragten/Admin. Bekanntgabe-Quittung durch Abschnittsleiter/Einheitsführer. Vorfallmeldungen erzeugbar durch alle Einsatz-Rollen.
- **Barrierefreiheit**: WCAG 2.1 AA; Ampel-Darstellung mit zusätzlichen Nicht-Farb-Hinweisen (Icon, Text). BITV als Ziel (öffentliche Organisationen).
- **Mehrsprachigkeit** nicht MVP-Pflicht, Struktur (i18n) aber so, dass Vision-Scope später ohne Breaking Changes möglich.

### Integration Requirements

- **Gefahren-Modul**: Gefährdungsbeurteilung referenziert Gefahren-Einträge (z. B. identifizierte Gefahrstoffe) als Quelle. PSA-Empfehlung konsumiert Gefahren-Daten.
- **Lagekarte (MapGL)**: Sicherungsposten werden als Marker auf der Lagekarte dargestellt und sind von dort aus zu Eigenschutz verlinkt. Bi-direktionale Navigation.
- **Einsatz-Modul**: Alle Eigenschutz-Entitäten sind an `einsatzId` gebunden (Einsatz-Routen-Nesting: `/einsatz/:einsatzId/sicherheit/eigenschutz`, inkl. Backend-Routen).
- **Benachrichtigungssystem**: Kritische Events (PSA-Hochstufung, neuer Vorfall) nutzen den plattformweiten Notification-Kanal.
- **Export-Schnittstelle**: PDF-Generierung (MVP) über vorhandene Report-Infrastruktur oder neu; strukturierter JSON-Export (MVP) für spätere Unfallkassen-Portale.

### Risk Mitigations

- **Silent Failures bei kritischen Änderungen.** Risiko: PSA-Hochstufung scheitert still (Sync-Fehler), Einheit bleibt ungeschützt. Mitigation: Lese-Quittung ist Pflicht; nicht-quittierte Änderungen werden im Dashboard rot markiert, mit Eskalations-Option.
- **Datenverlust bei Offline-Sync-Konflikten.** Risiko: Zwei Geräte ändern PSA-Stufe parallel. Mitigation: Event-Sourcing mit nachvollziehbarer Reihenfolge; kritische Konflikte werden nicht automatisch überschrieben, sondern explizit gekennzeichnet.
- **Fehlinterpretation der PSA-Empfehlung.** Risiko: Nutzer folgt System-Vorschlag unkritisch. Mitigation: System gibt Empfehlungen, keine Entscheidungen; Sicherheitsbeauftragter muss bestätigen; Empfehlung ist transparent (aus welcher Gefährdung abgeleitet).
- **Vorlagen-Drift.** Risiko: Laufender Einsatz nutzt veraltete Vorlage trotz Update. Mitigation: Laufender Einsatz behält seine Vorlagen-Version; Hinweis auf Update wird angezeigt, aber nicht automatisch angewendet (Stabilität > Aktualität während Einsatz).
- **DSGVO-Exposition in Vorfallmeldungen.** Risiko: Unnötige Personenbezogenheit. Mitigation: Minimalset an Pflichtfeldern (Rolle statt Name, wo möglich), optional volle Personen-Referenz bei Unfallkassen-Relevanz.
- **„Sicherheits-Theater" durch halbherzige Nutzung.** Risiko: Modul wird als Pflicht-Übel empfunden, Daten verrotten. Mitigation: UX-Priorität auf Schnelligkeit (Vorlagen, Multi-Select), Ampel-Dashboard liefert sofort sichtbaren Wert, nicht nur Dokumentation.

## Innovation & Novel Patterns

Dieses Modul ist vornehmlich die saubere Digitalisierung eines bestehenden Arbeitsprozesses — das ist bewusst und wertvoll. Es gibt jedoch zwei Stellen mit echtem Innovations-Anspruch; sie sind klar von „Execution"-Capabilities abgegrenzt.

### Detected Innovation Areas

1. **Zeitpunktgenauer Kontext-Snapshot bei Vorfallmeldungen.** Statt nur ein Vorfall-Formular zu speichern, bindet das System Gefährdungsbeurteilung und PSA-Stufe **zum exakten Zeitpunkt des Vorfalls** als unveränderlichen Kontext an. Das ist in BOS-Software untypisch und liefert Unfallkassen-Meldungen eine Aussagekraft, die Papier- oder nachgelagerte Systeme nicht haben.
2. **Vorlagen-gesteuerte Gefährdungsbeurteilung mit Versions-Stabilität im laufenden Einsatz.** Laufende Einsätze bekommen keine automatischen Vorlagen-Updates — aber klare Hinweise. Das kombiniert „aktuell bleibend" mit „stabil im Einsatz". Der Trade-off ist bewusst gesetzt: Stabilität > Aktualität während der Lage.

Keine der beiden Innovations-Flächen erfordert Forschungs-Investitionen oder neue Technologien — sie sind Entwurfs-Entscheidungen, die sich bei disziplinierter Umsetzung realisieren lassen.

### Market Context & Competitive Landscape

- **Bestehende BOS-Software** (FireBoard, MPFire, IGNIS, diverse kommerzielle Einsatzleit-Systeme): decken Einsatzdokumentation generell ab, Eigenschutz ist häufig ein nachrangiges Modul ohne tiefe Integration mit Lage/Karte. Differenzierung: Integrations-Tiefe und Bedien-Tempo (< 10 Minuten für drei Abschnitte).
- **Generische Arbeitsschutz-Software** (Quentic, iManSys u. ä.): für Dauerbetrieb optimiert, nicht für Einsatz-Dynamik. Keine Echtzeit-Abschnitts-Propagation, kein Lagekarten-Kontext.
- **Papier-/Excel-Status-quo** ist dominanter Wettbewerber. Hauptgegner ist nicht ein Konkurrenzprodukt, sondern die Gewohnheit.

### Validation Approach

- **Piloteinsatz** in 1–2 befreundeten weißen Hilfsorganisationen während Übungen — Messpunkte: Erfassungszeit, Fehlerquote Unfallkassen-Export, Akzeptanz durch S-Stab.
- **Gezielte User-Interviews** mit 3–5 aktiven Sicherheitsbeauftragten vor Release (Screens, Workflow-Mockups).
- **Dogfooding** in Übungsszenarien des Projekt-Teams.

### Risk Mitigation

- **„Wir bauen ein Feature, das niemand nutzt"-Risiko.** Mitigation: MVP auf Basis-Capabilities beschränken (siehe Scope), erst nach Pilot-Feedback die Vorlagen-Bibliothek und Growth-Features ausbauen.
- **„Offline-Sync-Komplexität verzettelt uns"-Risiko.** Mitigation: Konsistent mit ADR-010 / Platform Storage Adapter Pattern arbeiten, keine modul-spezifische Sync-Logik erfinden.
- **„Integrations-Versprechen nicht einlösbar"-Risiko.** Mitigation: Lagekarte- und Gefahren-Modul-Integration im MVP als minimal lauffähig (Marker + Reference), tiefere Automatisierung (PSA aus Gefahren) als Growth.

## Web App (+ Tauri) Specific Requirements

### Project-Type Overview

Das Modul ist Teil der bestehenden Bluelight-Hub-Web-App (React 19 + Vite, SPA) und wird in identischer Code-Basis als Tauri-Desktop-Shell ausgeliefert. Keine separate Mobile-App, keine separate Backend-Installation.

### Technical Architecture Considerations

**Frontend.** Feature-based Architektur analog `frontend/src/features/einsatz/`. Neues Feature `frontend/src/features/eigenschutz/` mit Unterordnern:

- `routes/` (TanStack Router-Routen unterhalb `/app/einsatz/$einsatzId/sicherheit/eigenschutz/...`)
- `components/` (Ampel-Dashboard, Gefährdungs-Editor, PSA-Stufen-Matrix, Vorfall-Formular, Sicherungsposten-Panel)
- `hooks/` (TanStack-Query-Hooks aus generiertem API-Client — nie manuelle `fetch()`)
- `forms/` (@tanstack/react-form + Zod-Schemas)
- `types/` (Re-Exports aus `shared/client/`)

**Backend.** Hexagonale Architektur:

- `domain/eigenschutz/` — Entities (`Gefaehrdungsbeurteilung`, `PsaAnforderung`, `Sicherheitsregel`, `Sicherungsposten`, `Vorfall`), Value Objects (`Risikobewertung`, `PsaStufe`), Invarianten via Result Pattern.
- `application/eigenschutz/` — Use Cases (`CreateGefaehrdungsbeurteilung`, `UpdatePsaStufe`, `ReportVorfall`, `ExportUnfallkassenReport`), Command/Query-Handler via `TransactionalCommandHandler`-Pattern.
- `infrastructure/eigenschutz/` — Prisma-Repositories, Event-Publisher (Outbox), Adapter für Lagekarte-/Gefahren-Modul-Integration, PDF-Generator-Adapter.
- `modules/eigenschutz/` — NestJS-Controller unter `/einsatz/:einsatzId/sicherheit/eigenschutz/...`, Custom Response-Decorators (`@ApiWrappedResponse`/`@ApiWrappedCreatedResponse`).
- **Events** (`EigenschutzEvents.*`): `GefaehrdungsbeurteilungErstellt`, `GefaehrdungsbeurteilungAktualisiert`, `PsaStufeGeaendert`, `SicherheitsregelAusgerufen`, `SicherungspostenEingerichtet`, `VorfallGemeldet`. Alle müssen in Event-Registry (`event-deserializer.ts`, Serializer, Adapters-Modul, Adapters-Index) registriert werden.

**Datenmodell.** Migrations-Pflicht mit benanntem Prisma-Migrate (`pnpm --filter @bluelight-hub/backend prisma:migrate --name add_eigenschutz_module`).

### Browser-/Client-Matrix

- **Desktop-Web (Primary)**: aktuelle Versionen von Chrome, Edge, Safari, Firefox (letzte 2 Hauptversionen).
- **Tauri-Desktop (Primary)**: macOS 13+, Windows 10/11, Linux (Ubuntu 22.04+). Konsistent mit Bluelight-Hub-Plattform-Baseline.
- **Mobile-Web (Secondary, responsive)**: aktuelle iOS Safari und Android Chrome — zoom-freundliche Ampel-Ansicht, Formular-UX tauglich für Tablet im Fahrzeug.
- **Kein IE/Legacy-Browser-Support**.

### Responsive Design

- **Primär-Layout**: Stabs-Tablet (10–13 Zoll, Landscape, Touch).
- **Sekundäre Layouts**: Desktop (≥ 1440 px), kompaktes Tablet/Phablet (≥ 768 px), Smartphone (≥ 360 px) für Einheitsführer.
- **Ampel-Dashboard**: Mobile-First-Variante zeigt Abschnitts-Liste mit Status-Farbe; Desktop-Variante ergänzt Karten-Panel und Seitenleiste mit offenen Vorfällen.

### Performance Targets

- **Time-to-Interactive** für Eigenschutz-Route < 2 s (auf Stabs-Tablet mit vorgeladenen Einsatz-Daten, warmer Cache).
- **Propagation** von PSA-Änderungen zu allen aktiven Clients ≤ 2 s (online).
- **Offline → Online Sync** bei typischer Einsatz-Sitzung (50 Änderungen, 3 Clients) < 5 s bis Konsistenz.
- **Bundle-Größe** zusätzlich durch Eigenschutz-Feature < 150 kB gzip (Route-Level-Splitting).

### Accessibility Level

- **WCAG 2.1 AA** als Mindest-Ziel, BITV 2.0 als Referenz.
- **Ampel-Status** zusätzlich durch Icon + Text-Label kommuniziert (nicht nur Farbe).
- **Kritische Änderungs-Banner** fokussierbar, ARIA-Live-Region `assertive`, Tastaturbedienbar (Quittung per Enter/Space).
- **Formulare** Label + Description, Fehlermeldungen an Feld gekoppelt (aria-describedby), Tastaturnavigation ohne Maus.
- **Farbkontraste** WCAG AA für Normal-Text (4.5:1), AAA für kritische Warnungen.

### SEO Strategy

Nicht anwendbar — Modul liegt hinter Authentifizierung, keine öffentlich indexierbaren Routen. `robots.txt` und Meta-Tags der Einsatz-Routen bestätigt auf `noindex`.

### Realtime Requirements

- **Optimistic Updates** im Frontend für PSA-Stufen-Änderung, mit Rollback bei Sync-Konflikt.
- **Server-Push** (bestehender WebSocket- oder SSE-Kanal der Plattform; kein neuer Transport-Mechanismus).
- **Konfliktauflösung**: Last-writer-wins bei unkritischen Feldern; bei PSA-Stufe und Gefährdungsbeurteilung-Item konfliktmarkierung mit manueller Auflösung durch S-Stab.

### Implementation Considerations

- **API-Workflow**: Backend-Endpoint → `pnpm run generate-api` → TanStack-Query-Hook → Komponente. Kein manueller Client-Code.
- **DI-Compliance**: Injectable Classes IMMER mit `import` (kein `import type`). Pre-commit-Hook greift.
- **Response Decorators**: `@ApiWrappedResponse(...)` / `@ApiWrappedCreatedResponse(...)` — Standard Swagger Decorators bricht Client-Generierung.
- **Route-Nesting**: Eigenschutz-Endpoints ausschließlich unter `/einsatz/:einsatzId/sicherheit/eigenschutz/...`, nicht Top-Level.
- **State-Management**: Server-State via TanStack Query; UI-State (z. B. Formular-Wizards) via TanStack Store; kein globaler Client-Store für Eigenschutz-Daten.
- **Forms**: `@tanstack/react-form` + Zod-Schemas, geteilt zwischen Frontend und ggf. Backend-DTO-Validation.
- **Lagekarte-Integration**: Verwendung der MapGL-Layer der bestehenden Lagekarte (nicht Leaflet). Sicherungsposten als Marker-Layer mit eigener Ikonographie.
- **Testing**: Backend-Jest mit Domain- und Application-Layer-Tests (Ziel ≥ 80 %), Frontend-Vitest + Testing-Library, E2E mit vorhandenem Test-Setup (Playwright/Cypress — je nach Projekt-Standard) für zwei kritische Szenarien: PSA-Hochstufung + Quittung, Vorfall-Erfassung + Export.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP-Approach:** **Problem-solving MVP** mit eingebautem Pilotpfad. Ziel ist nicht ein marktreifes Produkt in einem großen Wurf, sondern ein belastbarer Funktionskern, der in 1–2 Pilot-Einsätzen/Übungen echten Wert liefert und in < 3 Monaten nach Start messbare Adoption erzeugt. Alles darüber hinaus (Bibliotheken, Automatismen, Spezialistengruppen) folgt evidenz-getrieben.

**Leitplanken:**

- MVP muss die Journeys 1a, 1b, 2 und 4 vollständig tragen. Journey 3 (Admin/Template) im MVP in **minimaler Form** (Basis-Vorlagen werden ausgeliefert, keine vollwertige Vorlagen-Versionierungs-UI). Weitergehende Spezialschutz- und Sonderlagen-Workflows sind **nicht** Bestandteil des MVP.
- Keine neuen Transport-Mechanismen, kein separater Offline-Layer — alles durchgängig über die bestehende Platform-Storage- und Event-Infrastruktur.
- Kein DGUV-Zertifizierungs-Anspruch im MVP. Ziel: DGUV-kompatibel dokumentieren. Formelle Prüfung wird mit Juristen/DGUV-Referenten in späterer Phase geklärt.

**Resource Assumptions:** Umsetzung durch das bestehende Bluelight-Hub-Kernteam. Grobschätzung (ohne verbindliche Planung): 1 Backend-Developer + 1 Frontend-Developer + 1 Product/Design-Rolle über ~6–8 Wochen für MVP, plus Review-Zeit Sicherheits-/Rechts-Fachperson (externe Konsultation 1–2 Tage).

### MVP Feature Set (Phase 1)

**Core Journeys im MVP:** 1a, 1b, 2, 4 (vollständig); 3 als Basis-Seeding; weitergehende Spezialschutz-Workflows ausgeklammert.

**Must-Have Capabilities:**

1. **Gefährdungsbeurteilung**
   - CRUD pro Einsatzabschnitt
   - Risikomatrix (Eintrittswahrscheinlichkeit × Schadensausmaß, 3×3 oder 5×5 — genau 1 Schema MVP)
   - Freitext-Gefährdungen + kleine Seed-Vorlagen-Auswahl (3–5 Szenarien hardcoded / per Migration geseedet)
   - Versionierung, Zeitstempel, Urheber
2. **PSA-Verwaltung**
   - 4 Stufen pro Einsatzbereich, eindeutige Zuordnung
   - Hochstufung als „kritische Änderung" mit Begründungs-Pflicht
   - Ausrüstungs-Checkliste je Stufe (fest hinterlegt, MVP; admin-pflegbar ab Phase 2)
   - Multi-Select auf Abschnitte
3. **Bekanntgabe & Quittung**
   - PSA-Änderungen und Sicherheitsregeln sind durch Abschnittsleiter quittierbar
   - Nicht-quittierte Empfänger im Dashboard markiert
   - Rück-Eskalations-Notiz vom Empfänger an Stab
4. **Sicherheitsregeln**
   - Freitext-Regeln pro Abschnitt
   - Bekanntgabe-Status
5. **Sicherungsposten**
   - CRUD (Standort, Personal, Zuständigkeitsbereich)
   - Marker auf Lagekarte
   - Ablösezeiten als einfaches Textfeld (Schicht-Plan ist Phase 2)
6. **Vorfallmeldung**
   - Was/Wann/Wo/Beteiligte/Maßnahmen
   - Zeitpunkt-Snapshot: gebundene Gefährdungsbeurteilung und PSA-Stufe zur Vorfallzeit
   - Kennzeichnung „Unfallkasse-relevant"
   - **Export: generisches PDF** + strukturierter JSON-Export
7. **Ampel-Dashboard**
   - Rot/Gelb/Grün je Abschnitt, abgeleitet aus offenen Gefährdungen und PSA-Bestätigungs-Stand
   - Offene Vorfälle als Seitenpanel
8. **Versionierung & Audit-Trail**
   - Event-Log je Entität, über Outbox-/Event-Infrastruktur
9. **Rollen & Rechte**
   - `sicherheitsbeauftragter`, `abschnittsleiter`, `einheitsfuehrer`, `admin`, `nachbereitung` mit definierten Schreib-/Lese-/Quittungs-Rechten
10. **Offline-Fähigkeit**
    - Vollständiger Lese- und Schreibbetrieb offline, Sync bei Wiederverbindung (analog Platform-Storage-Strategie)
11. **Route & Integration**
    - `/app/einsatz/$einsatzId/sicherheit/eigenschutz/...`
    - Backend-Routen unter `/einsatz/:einsatzId/sicherheit/eigenschutz/...`
    - Verknüpfung zum Gefahren-Modul als Referenz-Feld (Basis-Kopplung, keine Automatismen)

### Post-MVP Features

**Phase 2 (Growth, nach erstem Pilot-Feedback):**

- Vorlagen-Bibliothek mit Admin-UI, Vorlagen-Versionierung, Benachrichtigung über Vorlagen-Updates
- Standardszenarien-Pack (MANV, CBRN-Patientenversorgung, Betreuung, Großlage, Verkehr)
- Automatische PSA-Empfehlung aus Gefahren-Modul-Einträgen
- Bekanntgabe an einzelne Einheiten (statt nur Abschnitts-Level)
- Push-Notifications (Web-Push, Tauri-Desktop-Notifications)
- Strukturierter Unfallkassen-Export im Format der jeweiligen Landesunfallkasse (konfigurierbar)
- Sicherungsposten-Ablöseplanung mit Schicht-/Zeit-Tracking
- Spezialschutz-/Sonderlagen-Workflows in separatem Folge-PRD

**Phase 3 (Vision / Expansion):**

- Gefährdungs-Analytics (einsatzübergreifend)
- KI-Vorlagen-Empfehlung aus Einsatz-Stichworten
- Integration GESTIS / Wetter-/Gefahrstoffdatenbanken
- Übungs-Modus für Ausbildung
- Mehrsprachigkeit für internationale Einsätze
- Direktschnittstelle zu Unfallkassen-Meldeportalen

### Risk Mitigation Strategy

**Technische Risiken:**

- _Risiko:_ Offline-Sync-Komplexität bei Multi-Device-Parallelnutzung. _Mitigation:_ Konsequente Nutzung der Platform-Storage-Strategie (ADR-010), keine Eigenentwicklung; Event-basierter Merge-Pfad; kritische Felder (PSA-Stufe) mit expliziter Konfliktmarkierung statt automatischem Überschreiben.
- _Risiko:_ Lagekarte-Integration aufwändiger als erwartet (MapGL-spezifisch). _Mitigation:_ Sicherungsposten-Marker als minimaler Feature-Cut im MVP; komplexere Karteninteraktionen Phase 2.
- _Risiko:_ Echtzeit-Propagation skaliert nicht auf viele Clients. _Mitigation:_ Bestehenden Event-Kanal benchmarken vor Modulentwicklung; Fallback-Pfad Polling-Backoff.

**Markt-/Anwendungs-Risiken:**

- _Risiko:_ Modul wird als „noch ein Papier-Ersatz" empfunden und nicht genutzt. _Mitigation:_ Piloteinsatz in 1–2 befreundeten Organisationen mit definierten Messgrößen; Ampel-Dashboard und Tempo-Garantien (< 2 min Gefährdungsbeurteilung) als Hauptargument; Post-Pilot-Interview-Runde als Kurs-Korrektur-Gate.
- _Risiko:_ Unfallkassen-Formate abweichend pro Bundesland. _Mitigation:_ MVP liefert generischen Export; Formatspezifik Phase 2 nach konkreter Pilot-Organisation.

**Ressourcen-Risiken:**

- _Risiko:_ Team-Kapazität kleiner als geplant. _Mitigation:_ Innerhalb des MVP-Featuresets Sub-Schnitte möglich — minimaler lauffähiger Kern (mMVP) wären Journeys 1a + 2 + 4 ohne Sicherungsposten und ohne Ampel-Dashboard. Ampel und Sicherungsposten als erste streichbare Features, wenn Kapazität eng.
- _Risiko:_ Externe Rechts-/Sicherheits-Konsultation verzögert sich. _Mitigation:_ Im MVP-Scope ist Entwurf & Implementierung von externer Freigabe unabhängig; Konsultation parallel; Release-Gate bleibt an Pilot-Akzeptanz, nicht an formaler Freigabe.

## Functional Requirements

Diese FR-Liste ist der **Capability-Contract** des Moduls: alles, was hier fehlt, existiert am Ende nicht. FRs beschreiben _was_ das System kann, nicht _wie_ es implementiert ist. Scope-Marker: `[MVP]`, `[Phase 2]`, `[Phase 3]`.

### A. Gefährdungsbeurteilung

- **FR1** `[MVP]` Der Sicherheitsbeauftragte kann für jeden Einsatzabschnitt eine Gefährdungsbeurteilung anlegen.
- **FR2** `[MVP]` Der Sicherheitsbeauftragte kann einzelne Gefährdungen mit Titel, Beschreibung, Eintrittswahrscheinlichkeit und Schadensausmaß erfassen; das System errechnet und zeigt die Risikostufe nach einem fest hinterlegten Schema.
- **FR3** `[MVP]` Der Sicherheitsbeauftragte kann Gefährdungen zu einer Beurteilung hinzufügen, ändern oder entfernen; jede Änderung wird als neue Version mit Zeitstempel und Urheber historisiert.
- **FR4** `[MVP]` Der Sicherheitsbeauftragte kann zu jeder Gefährdung Schutzmaßnahmen als Freitext hinterlegen.
- **FR5** `[MVP]` Der Sicherheitsbeauftragte kann zum Start einer Gefährdungsbeurteilung eine vorkonfigurierte Basis-Vorlage (Seed) wählen.
- **FR6** `[MVP]` Der Sicherheitsbeauftragte kann eine Gefährdungsbeurteilung jederzeit neu bewerten; die vorige Version bleibt einsehbar.
- **FR7** `[Phase 2]` Der Admin kann Vorlagen für Gefährdungsbeurteilungen erstellen, versionieren und als aktiv/ausgelaufen markieren.
- **FR8** `[Phase 2]` Das System kann Gefährdungen aus dem Gefahren-Modul automatisch in die Gefährdungsbeurteilung eines Abschnitts übernehmen.
- **FR9** `[Phase 3]` Das System kann einsatzübergreifende Gefährdungs-Analysen (Häufigkeit, Wirkung von Schutzmaßnahmen) bereitstellen.

### B. PSA-Verwaltung

- **FR10** `[MVP]` Der Sicherheitsbeauftragte kann eine PSA-Stufe (1–4) pro Einsatzbereich festlegen.
- **FR11** `[MVP]` Der Sicherheitsbeauftragte kann mehrere Einsatzbereiche gleichzeitig auswählen und deren PSA-Stufe in einem Vorgang ändern.
- **FR12** `[MVP]` Das System verlangt bei einer PSA-Stufenänderung (Hochstufung oder Herabstufung) eine Kurz-Begründung und markiert die Änderung als kritisches Ereignis.
- **FR13** `[MVP]` Das System hält zu jeder PSA-Stufe eine Ausrüstungs-Checkliste bereit, die dem Abschnittsleiter bei Empfang sichtbar ist.
- **FR14** `[MVP]` Das System protokolliert jede PSA-Stufenänderung mit Vorstufe, neuer Stufe, Urheber, Zeitstempel und Begründung.
- **FR15** `[Phase 2]` Das System kann auf Basis der aktuellen Gefährdungsbeurteilung und Gefahren-Daten eine PSA-Stufe als Empfehlung anzeigen.
- **FR16** `[Phase 2]` Der Admin kann die Ausrüstungs-Checklisten je PSA-Stufe pflegen.

### C. Bekanntgabe & Quittung

- **FR17** `[MVP]` Das System informiert alle betroffenen Abschnittsleiter bei einer PSA-Stufenänderung mit einem nicht-ignorierbaren Hinweis.
- **FR18** `[MVP]` Der Abschnittsleiter kann eine PSA-Stufenänderung quittieren.
- **FR19** `[MVP]` Das System zeigt dem Sicherheitsbeauftragten an, welche Abschnitte eine Änderung bereits quittiert haben und welche nicht.
- **FR20** `[MVP]` Der Abschnittsleiter kann bei einer Änderung eine Rückmeldung (z. B. „Ausrüstung nicht verfügbar") an den Sicherheitsbeauftragten senden.
- **FR21** `[Phase 2]` Die Bekanntgabe kann pro Einheit innerhalb eines Abschnitts quittiert werden (statt nur auf Abschnitts-Ebene).
- **FR22** `[MVP — UX-hochgezogen]` Das System kann Push-Notifications (Web-Push / Desktop) für kritische Ereignisse senden. _Ursprünglich `[Phase 2]`; durch UX-Spec (2026-04-21) in den MVP gehoben — Tauri-Plugin-Notification + Web-Push wo technisch zumutbar. Architektonisch abgedeckt in AR1 (F1 Plattform-Push-Infrastruktur, ADR-011-Kandidat). Siehe „Post-PRD Refinements"._

### D. Sicherheitsregeln

- **FR23** `[MVP]` Der Sicherheitsbeauftragte kann Sicherheitsregeln als Freitext erfassen und einem Abschnitt oder dem Einsatz zuordnen.
- **FR24** `[MVP]` Das System zeigt Sicherheitsregeln den zugeordneten Abschnittsleitern/Einheiten an.
- **FR25** `[MVP]` Der Abschnittsleiter kann eine Sicherheitsregel quittieren; das System hält den Bekanntgabe-Status fest.
- **FR26** `[Phase 2]` Der Admin kann Sicherheitsregeln als Vorlagen erstellen und versionieren.

### E. Sicherungsposten

- **FR27** `[MVP]` Der Sicherheitsbeauftragte kann Sicherungsposten mit Standort, zugewiesenem Personal und Zuständigkeitsbereich anlegen, ändern und löschen.
- **FR28** `[MVP]` Das System stellt Sicherungsposten als Marker auf der Lagekarte dar; von der Karte aus kann zur Detail-Ansicht navigiert werden.
- **FR29** `[MVP]` Der Sicherheitsbeauftragte kann Ablösezeiten als Textfeld zum Sicherungsposten pflegen.
- **FR30** `[Phase 2]` Das System kann Sicherungsposten-Schichten zeitlich planen und den aktuellen Schichtinhaber anzeigen.

### F. Vorfallmeldung & Export

- **FR31** `[MVP]` Jede berechtigte Einsatzrolle (S-Stab, Abschnittsleiter, Einheitsführer) kann eine Vorfallmeldung mit Was/Wann/Wo/Beteiligte/Maßnahmen erfassen.
- **FR32** `[MVP]` Der Meldende kann kennzeichnen, ob der Vorfall Unfallkassen-relevant ist.
- **FR33** `[MVP]` Das System bindet an einen Vorfall die Gefährdungsbeurteilung und PSA-Stufe des Abschnitts zum Vorfallzeitpunkt als unveränderlichen Snapshot an.
- **FR34** `[MVP]` Die Nachbereitungs-Rolle kann einen Vorfall als PDF mit zugehörigem Kontext exportieren.
- **FR35** `[MVP]` Die Nachbereitungs-Rolle kann einen Vorfall als strukturierten JSON-Datensatz exportieren.
- **FR36** `[MVP]` Die Nachbereitungs-Rolle kann Vorfälle nach Einsatz, Abschnitt, Kennzeichnung „Unfallkasse-relevant" und Zeitraum filtern.
- **FR37** `[Phase 2]` Das System kann Vorfall-Exports in spezifischen Formaten von Landesunfallkassen ausgeben.

### G. Ampel-Dashboard & Status

- **FR38** `[MVP]` Das System zeigt pro Abschnitt einen Sicherheitsstatus in drei Ausprägungen (Rot/Gelb/Grün), abgeleitet aus offenen Gefährdungen, ausstehenden Quittungen und gemeldeten Vorfällen.
- **FR39** `[MVP]` Das Dashboard listet offene Vorfälle und ungelöste Rückmeldungen des aktuellen Einsatzes.
- **FR40** `[MVP]` Das Dashboard bietet eine Warn-Markierung bei unbearbeiteten Gefährdungen (keine Schutzmaßnahme dokumentiert) und bei nicht-quittierten PSA-Änderungen.

### H. Versionierung, Audit & Historie

- **FR41** `[MVP]` Das System hält für jede Gefährdungsbeurteilung, PSA-Stufe, Sicherheitsregel und jeden Sicherungsposten einen vollständigen Änderungsverlauf (wer, wann, was, ggf. warum).
- **FR42** `[MVP]` Änderungen sind nicht löschbar; Korrekturen erzeugen neue Versionen.
- **FR43** `[MVP]` Jeder Nutzer mit Lese-Recht kann die Änderungshistorie einer Entität einsehen.

### I. Rollen & Berechtigungen

- **FR44** `[MVP]` Das System unterscheidet mindestens die Rollen `sicherheitsbeauftragter`, `abschnittsleiter`, `einheitsfuehrer`, `admin`, `nachbereitung`.
- **FR45** `[MVP]` Schreibzugriff auf Gefährdungsbeurteilung und PSA-Stufe ist auf `sicherheitsbeauftragter` und `admin` beschränkt.
- **FR46** `[MVP]` Quittungen werden nur von der jeweils empfangenden Rolle abgegeben.
- **FR47** `[MVP]` Der Unfallkassen-Export ist auf `nachbereitung` und `admin` beschränkt.

### J. Offline & Sync

- **FR48** `[MVP]` Alle Lese- und Schreib-Operationen des Moduls funktionieren ohne Netzverbindung.
- **FR49** `[MVP]` Bei Wiederverbindung synchronisiert das System automatisch, ohne Datenverlust bei unkritischen Feldern.
- **FR50** `[MVP]` Bei Konflikten auf kritischen Feldern (PSA-Stufe, Gefährdungsbeurteilungs-Item) markiert das System den Konflikt und verlangt eine explizite Auflösung durch den Sicherheitsbeauftragten.

### K. Integration mit Plattform

- **FR51** `[MVP]` Alle Eigenschutz-Entitäten sind an einen Einsatz (`einsatzId`) gebunden und nur im Kontext dieses Einsatzes zugreifbar.
- **FR52** `[MVP]` Das Modul ist über die Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz` erreichbar und in die bestehende Einsatz-Navigation integriert.
- **FR53** `[MVP]` Vorfallmeldungen, PSA-Hochstufungen und Sicherheitsregeln nutzen den plattformweiten Benachrichtigungs-Kanal.
- **FR54** `[MVP]` Gefährdungsbeurteilungen können auf Einträge aus dem Gefahren-Modul referenzieren.

## Non-Functional Requirements

Gelistet sind nur Kategorien, die für das Modul Eigenschutz relevant sind. Compliance-Detail siehe „Domain-Specific Requirements".

### Performance

- **NFR-P1** Das Öffnen der Eigenschutz-Route lädt im Regelfall (warmer Cache, Einsatz bereits geöffnet) in **≤ 2 s** auf dem Stabs-Tablet.
- **NFR-P2** Eine PSA-Stufenänderung wird online in **≤ 2 s** in allen aktiven Client-Instanzen des Einsatzes sichtbar (p95).
- **NFR-P3** Das Anlegen einer Gefährdungsbeurteilung inklusive Speichern und Propagation benötigt online **≤ 1 s** pro Speicher-Vorgang (p95).
- **NFR-P4** Das Ampel-Dashboard aktualisiert den Status nach einer Änderung in **≤ 1 s** (p95).
- **NFR-P5** Der Unfallkassen-PDF-Export für einen Standard-Vorfall (≤ 5 Beteiligte, ≤ 10 Gefährdungen) wird in **≤ 5 s** erzeugt.
- **NFR-P6** Offline-→-Online-Sync bei typischer Sitzung (50 Änderungen, 3 Clients) erreicht Konsistenz in **≤ 5 s** nach Wiederverbindung.
- **NFR-P7** Das zusätzliche JS-Bundle des Features überschreitet **150 kB gzip** nicht.

### Security

- **NFR-S1** Authentifizierung nutzt das bestehende Plattform-Auth-System; keine modul-spezifische Auth-Implementierung.
- **NFR-S2** Autorisierung wird serverseitig pro Endpoint gegen die definierten Rollen geprüft (FR44–FR47).
- **NFR-S3** Alle API-Calls nutzen HTTPS/TLS (Plattform-Default); modul-spezifische Klartext-Kommunikation ist verboten.
- **NFR-S4** Der Audit-Trail ist gegen nachträgliche Manipulation geschützt (append-only, keine Update/Delete-Operationen auf Historien-Events).
- **NFR-S5** Personenbezogene Daten in Vorfallmeldungen unterliegen dem Löschkonzept der Plattform; das Modul erzeugt keine separate Langzeit-Speicherung außerhalb der Einsatz-Lebensdauer.
- **NFR-S6** Exports (PDF, JSON) enthalten nur Daten, zu denen die exportierende Rolle Leserecht hat.
- **NFR-S7** Fehlgeschlagene Autorisierungs-Versuche werden im Security-Log der Plattform protokolliert.

### Reliability

- **NFR-R1** Das Modul kennt keine modul-spezifische Downtime-Toleranz, die schlechter ist als die Plattform-SLO.
- **NFR-R2** Der Offline-Modus (FR48) muss unabhängig von der Backend-Verfügbarkeit funktionieren; ein Backend-Ausfall darf nicht zu Datenverlust bei bereits lokal erfassten Änderungen führen.
- **NFR-R3** Kritische Änderungen (PSA-Stufe, Vorfall-Meldung) werden mit At-least-once-Semantik über das Event-System propagiert; Deduplication erfolgt am Empfänger über Event-IDs.
- **NFR-R4** Das System bietet pro Entität einen Wiederherstellungs-Pfad auf einen definierten früheren Versionsstand (aus dem Audit-Trail).

### Accessibility

- **NFR-A1** UI-Komponenten erfüllen **WCAG 2.1 Level AA** als Mindest-Anforderung.
- **NFR-A2** Alle Status-Informationen (Ampel, PSA-Stufe, Quittungs-Status) sind redundant durch Icon und Text (nicht nur Farbe) kommuniziert.
- **NFR-A3** Kritische Änderungs-Banner sind mit ARIA-Live-Region (`assertive`) an Screenreader ausgespielt und per Tastatur quittierbar.
- **NFR-A4** Formulare haben gekoppelte Labels, Fehlermeldungen sind per `aria-describedby` verknüpft; Pflichtfelder sind eindeutig markiert.
- **NFR-A5** Farbkontrast für normalen Text ≥ 4.5:1, für kritische Warnungen ≥ 7:1 (WCAG AAA).
- **NFR-A6** Alle primären Interaktionen sind vollständig per Tastatur erreichbar; Fokus-Indikator jederzeit sichtbar.
- **NFR-A7** Als Ziel-Konformität wird BITV 2.0 angestrebt (Ableitung aus WCAG 2.1 AA für öffentliche Organisationen).

### Integration

- **NFR-I1** Eigenschutz-APIs nutzen ausschließlich das bestehende Einsatz-Routen-Nesting (`/einsatz/:einsatzId/sicherheit/eigenschutz/...`).
- **NFR-I2** Alle Endpoints nutzen `@ApiWrappedResponse`/`@ApiWrappedCreatedResponse` und werden über `pnpm run generate-api` in den Shared-Client konsumiert; manuelle `fetch()`-Calls im Frontend sind nicht zulässig.
- **NFR-I3** Neue Backend-Events werden in der Event-Registry an allen vier Stellen registriert (Serializer, Deserializer, Adapters-Modul, Adapters-Index).
- **NFR-I4** Die Lagekarte-Integration nutzt die bestehenden MapGL-Layer; keine Wiedereinführung von Leaflet/Leaflet.PM.
- **NFR-I5** Offline-Schicht nutzt den Platform-Storage-Adapter (ADR-010); kein modul-spezifischer Storage-Mechanismus.

### Scalability & Capacity

- **NFR-C1** Ein Einsatz mit bis zu **20 Abschnitten, 100 Einheiten, 50 aktiven Clients, 500 Gefährdungsbeurteilungs-Items, 200 Vorfällen** wird ohne spürbare Performance-Regression gegenüber Baseline unterstützt (Zielgrößen für mittelgroßen Großschadens-Einsatz).
- **NFR-C2** Der Historien-Datenbestand eines Einsatzes kann beliebig wachsen, ohne dass die Abfrage aktueller Stände (FR38–FR40) langsamer als NFR-P4 wird (indexierte „Current State"-Projektion).
- **NFR-C3** Bei Konflikten im Sync (FR50) skaliert die Konfliktauflösungs-UI mit der Anzahl paralleler Konflikte (Tabellen-/Listen-Darstellung statt modalem Stau).

### Maintainability & Quality Gates

- **NFR-M1** Neue Domain-Logik (Backend) wird mit ≥ **80 %** Unit-Test-Coverage ausgeliefert; kritische Pfade (PSA-Hochstufung, Vorfall-Erfassung, Sync-Merge) zusätzlich mit E2E-Tests.
- **NFR-M2** Pre-commit-Hook `check:di:imports` muss ohne Violations durchlaufen.
- **NFR-M3** `pnpm --filter @bluelight-hub/backend check:arch` darf keine neuen Circular Dependencies melden.
- **NFR-M4** Linting (oxlint + oxfmt) muss ohne Fehler durchlaufen.
- **NFR-M5** Migrations werden benannt und idempotent-lauffähig angelegt (`prisma:migrate --name add_eigenschutz_*`).

## Resolved Open Questions (Review 2026-04-20)

Folgende Punkte wurden durch User-Entscheidung und Subagent-Research geklärt. Diese Entscheidungen sind **bindend** für Architecture und Epic-Breakdown — FR-Liste und NFRs sind, wo nötig, entsprechend zu lesen (Anpassungen folgen in der Architecture-Phase, nicht in dieser PRD-Iteration).

### Q1 — Risikomatrix ✅

**Entscheidung:** **5×5 qualitativ** (Eintrittswahrscheinlichkeit: selten / gelegentlich / häufig / oft / ständig; Schadensausmaß: vernachlässigbar / gering / mittel / hoch / katastrophal). Ergebnisklassen Grün / Gelb / Orange / Rot. Gilt für **FR2** und Risiko-Bewertung in Gefährdungsbeurteilungen.

### Q2 — PSA-Modellierung ⚠️ **Modell-Änderung**

**Fachlicher Befund:** Für weiße BOS existiert **keine lineare 4-Stufen-PSA-Skala**. Zwei parallele Logiken:

- **TRBA 250** → 4 Infektionsschutzstufen (nur biologisch)
- **DGUV Regel 105-003** → PSA nach Gefährdungsart (nicht Stufen)

**Entscheidung:** Statt linearer 4-Stufen-Skala wird das Modul auf **PSA-Profile** umgestellt:

- **Basis** — Grundausstattung RD/SanD (Dienstkleidung, Einmalhandschuhe, Sicherheitsschuhe, Warnschutz)
- **Infektion** — TRBA 250 SSt. 2/3 (FFP2/3-Maske, Schutzbrille/Visier, Einmalkittel, doppelte Handschuhe)
- **VU-/Absicherung** — Technische Rettung (Rettungshelm DIN EN 14052, schnittfeste Handschuhe, Warnweste Kl. 3)
- **CBRN-Patientenversorgung** — Einweg-Infektionsschutzanzug Kat. III, Chemikalien-Handschuhe, PAPR/Vollmaske + ABEK-P3
- **Vollschutz (Grenzbereich)** — gasdichter Chemikalienschutzanzug mit ergänzender Spezialschutz-Ausrüstung. Für weiße BOS **kein eigenständiger Regel-Workflow**; im Regelfall nur an Schnittstellen zu Spezialkräften bzw. in MTF-Kontexten relevant.

**Implikation für FR10–FR16:** Diese FRs sind wie folgt zu lesen:

- „4 PSA-Stufen" → **N PSA-Profile pro Einheit/Bereich**, mehrere gleichzeitig aktivierbar (Profil-Set)
- Multi-Select (FR11) bleibt, aber auf Profil-Set-Ebene statt Stufen-Ebene
- „Hochstufung" = Aktivierung zusätzlicher Profile (additiv) oder Wechsel des aktiven Sets
- Ausrüstungs-Checkliste (FR13, FR16) → pro Profil statt pro Stufe
- Referenz im UI: „nach TRBA 250 und DGUV Regel 105-003"

**Quellen:** [TRBA 250](https://www.baua.de/DE/Angebote/Regelwerk/TRBA/pdf/TRBA-250.pdf), [DGUV Regel 105-003](https://publikationen.dguv.de/regelwerk/dguv-regeln/1361/), [Sicherer Rettungsdienst (DGUV)](https://www.sicherer-rettungsdienst.de/).

### Q3 — Basis-Vorlagen (Seed) ✅

**Entscheidung:** Ziel-BOS ist **weiß** (RD, SEG, Katschutz — DRK/ASB/JUH/MHD/BRK/Malteser). Seed-Set für MVP:

1. **MANV** (Massenanfall von Verletzten/Erkrankten)
2. **Verkehrsunfall — Patientenversorgung**
3. **Sanitätsdienst Großveranstaltung**
4. **Betreuungseinsatz** (Evakuierung / Notunterkunft)
5. **Gefahrstoff/CBRN — Patientenversorgung**

Vegetationsbrand und Hochwasser-Bekämpfung fallen raus (rote Orgs). Hochwasser-**Betreuung** ist über „Betreuungseinsatz" abgedeckt.

### Q4 — Rollen-Modell ✅ **Hybrid-Ansatz** (in Epic-Phase revidiert)

> ⚠️ **Revision 2026-04-21 (Epic-Phase):** Die ursprüngliche Entscheidung sah einen neuen **Prisma-Enum `EigenschutzRolle`** vor. In der Epic-Phase wurde das zu **`RollenDefinition`-Seed-Records mit Präfix `Eigenschutz: …`** umgestellt — minimal-invasiver, kein Prisma-Enum, kein Schema-Change an `EinsatzRollenbesetzung`. Umsetzung in Story 1.4 (Seeds) + Story 1.5 (`EigenschutzRolleGuard` via Präfix-Matching). TypeScript-Union-Type `EigenschutzRolle` bleibt für Decorator-Typsicherheit, wird aber **nicht** in Prisma persistiert.

**Bestehende Plattform-Assets** (Subagent-Research):

- `User`-Entity mit `UserRole` (SUPER_ADMIN, ADMIN, USER), `OperativeRole` (FUEHRUNGSKRAFT, EINSATZKRAFT, EXTERNE) und `permissions` (JSON, Format `domain:action`)
- `EinsatzRollenbesetzung`-Model (Story 5.0) — verknüpft User ↔ Einsatz ↔ `RollenDefinition` mit Audit-Trail und Snapshots
- Guards: `JwtAuthGuard`, `RolesGuard`, `OperativeRoleGuard`; Decorators `@Roles()`, `@RequiresOperativeRole()`

**Ursprüngliche Entscheidung (vor Revision):** Hybrid, minimal-invasiv.

- **Globale Auth** bleibt `UserRole` + `JwtAuthGuard` (unverändert)
- **Einsatz-kontextuelle Eigenschutz-Rollen** über `EinsatzRollenbesetzung` — Eigenschutz bringt einen eigenen ~~`EigenschutzRolle`-Enum~~ mit (`SICHERHEITSBEAUFTRAGTER`, `ABSCHNITTSLEITER`, `EINHEITSFUEHRER`, `NACHBEREITUNG`; `ADMIN` wird auf globale `UserRole.ADMIN` gemappt)
- **Feingranulare Rechte** über Permissions-Array (z. B. `eigenschutz:psa:write`, `eigenschutz:vorfall:report`)
- **FR44–FR47** sind mit diesem Modell umsetzbar; kein Redesign der Plattform-Auth.

**Revidierte Umsetzung:**

- **`RollenDefinition`-Records** (Namenspräfix `Eigenschutz: …`) werden idempotent geseedet (Story 1.4); keine Prisma-Enum-Pflege nötig.
- **`EigenschutzRolleGuard`** prüft Präfix `^Eigenschutz: ` + exakten Match des im Decorator geforderten Rollen-Namens und verifiziert `istAktiv` sowie Nicht-Abgelaufenheit auf `EinsatzRollenbesetzung` (Story 1.5).
- **TypeScript-Union-Type** für Typsicherheit; **kein** Prisma-Enum. FR44–FR47 bleiben mit diesem Modell erfüllt.

**Code-Pfade zum Anpassen:**

- `packages/backend/prisma/seed.ts` — 4 `RollenDefinition`-Records idempotent via `upsert` auf `name`
- `packages/backend/src/modules/auth/guards/` — neuer `EigenschutzRolleGuard` (Präfix-Match) + `PermissionsGuard`

### Q5 — Abschnitts-Modell ✅ **Referenz auf `EinsatzEinheit`**

**Bestehende Plattform-Assets** (Subagent-Research):

- **Keine separate `Einsatzabschnitt`-Entity** — „Abschnitte" werden als `EinsatzEinheit`-Instanzen mit self-referential Hierarchie (`parentId`) abgebildet. Unbegrenzte Verschachtelung möglich (Stab → Zug → Gruppe → Trupp).
- Controller-Pattern: `/api/einsaetze/:einsatzId/einheiten/...` (Plural `einsaetze`).
- Aggregate-Root: `Einsatz` (`domain/einsatz.aggregate.ts`), Einheiten als Child-Aggregates oder Teil des Einsatz-Aggregates.

**Entscheidung:** Eigenschutz-Entities referenzieren `EinsatzEinheit` (FK `einheitId`) **statt** einer eigenen Abschnitts-Entity. „Abschnitt" ist im UI und in der Domäne synonym mit „EinsatzEinheit auf Führungsebene".

**Implikation für PRD:**

- Wo das PRD „Einsatzabschnitt" sagt, ist technisch `EinsatzEinheit` gemeint.
- Route-Korrektur: Plattform-Konvention ist **Plural `einsaetze`** — Eigenschutz-Backend-Routen entsprechend `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/...` (die Frontend-Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/...` bleibt, da TanStack Router im Frontend Singular nutzt — konsistent mit bestehendem Pattern).
- NFR-I1 gilt weiterhin (Einsatz-Routen-Nesting); genauer Plural-/Singular-Split Frontend vs. Backend wie bestehend.
- Neue Prisma-Models: `Gefaehrdungsbeurteilung`, `PSAProfilZuweisung`, `Sicherungsposten`, `EigenschutzVorfall`, `Sicherheitsregel` — alle mit FK `einsatzId` + `einheitId`.

### Q6 — Gefahren-Modul-API ✅ **Kopplung via `gefahrenzoneId`**

**Bestehende Plattform-Assets** (Subagent-Research):

- `Gefahrenzone`-Entity (räumliche Verortung, Geometrie via GeoJSON) — Issue #627
- `GefahrenmatrixBewertung`-Entity (Warnstufe pro `(einsatzId, gefahrentyp, schutzobjekt)`)
- Controller: `GefahrenzoneController`, `GefahrenmatrixController`
- Frontend: `features/gefahrenzone/`, `features/gefahrenmatrix/`, bereits MapGL-integriert
- Einsatz-scoped via `einsatzId`

**Entscheidung:**

- **MVP:** Gefährdungsbeurteilungen referenzieren `Gefahrenzone.id` via FK `gefahrenzoneId` (optional, kein Muss). Reine Referenz, keine automatische Übernahme. Passt zu FR-Hinweis in Q6-Ursprungsfrage.
- **Phase 2 (FR8, FR15):** Automatische Übernahme von `gefahrentyp`, `schutzobjekt` und `warnstufe` via Backend-Join in PSA-Profil-Empfehlung.

### Q7 — Unfallkassen-Export-Schema ✅ **In Architecture finalisiert**

**Entscheidung:** MVP liefert den im PRD vorgeschlagenen Pflicht-Feld-Satz als Obermenge (siehe Scoping-Abschnitt, Persona 4 / Journey 4 und FR31–FR37). Keine landesunfallkassen-spezifische Anpassung im MVP. Konkretes Schema in der Architecture-Phase als TypeScript-Interface + Zod-Schema finalisiert: **`EigenschutzVorfallExportV1`** (in `packages/shared/schemas/eigenschutz-vorfall-export.schema.ts`) mit `schemaVersion: 1`, Vorfall-Feldern, vollständigem `kontextSnapshot` (Zod-Schema `EigenschutzKontextSnapshotV1`) und Export-Metadaten-Block. Architecture B11 dokumentiert die Erweiterbarkeit für Phase 2 (FR37 Landesunfallkassen-Formate) via schemaVersion-Bump. Umsetzung in Story 5.5.

### Q8 — Rechts-Review ✅ **Nach Pilot, vor Rollout**

**Entscheidung:** Kein MVP-Release-Gate. Review durch DGUV-Referent und Landesunfallkasse nach Pilot-Übungen, vor breitem Rollout. Tracking-Issue: [rubenvitt/bluelight-hub#713](https://github.com/rubenvitt/bluelight-hub/issues/713).

## Open Questions & Assumptions (remaining)

Alle offenen Architecture-Blocker sind geklärt. Folgende Punkte bleiben als Arbeitsannahmen oder spätere Iterationen bestehen:

### Arbeitsannahmen (als Annahme dokumentiert, kein explizites Sign-off)

- **A1:** DGUV-Zertifizierung ist **kein Release-Gate**. Ziel ist fachliche Konformität, formale Prüfung später.
- **A2:** Modul nutzt **ausschließlich** bestehende Platform-Storage-Strategie (ADR-010) und Event-/Outbox-Infrastruktur; keine Eigenentwicklung von Sync-Mechanismen.
- **A3:** **Lagekarte = MapGL** (konsistent mit Plattform-Stand); Leaflet/Leaflet.PM wird nicht wieder eingeführt.
- **A4:** Benachrichtigungen nutzen bestehenden Plattform-Notification-Kanal; kein separater Transport-Layer.
- **A5:** PDF-Export ist **plattform-generisch** im MVP (einheitliches Report-Layout), nicht landesunfallkassen-formatspezifisch.
- **A6:** **Spezialschutz- und Sonderlagen-Workflows sind explizit Post-MVP**, selbst wenn Pilotpartner sie früh wünschen — MVP-Scope wird dafür nicht aufgeweicht.
- **A7:** MVP-Release-Gate ist **Pilot-Akzeptanz** (1–2 befreundete Organisationen in Übungen), nicht formale Organisations-weite Rollout-Freigabe.
- **A8:** **Frontend-Feature-Slice:** neues Feature `frontend/src/features/eigenschutz/` analog `einsatz/`-Struktur; keine Abweichung vom Plattform-Muster.
- **A9:** **Backend-Layering:** Hexagonale Struktur (`domain/eigenschutz`, `application/eigenschutz`, `infrastructure/eigenschutz`, `modules/eigenschutz`) konsistent mit bestehender Architektur.

### Abhängigkeiten / Vorbedingungen

- Gefahren-Modul muss über eine stabile API referenzierbar sein, bevor FR8 (Phase 2) implementiert wird.
- Lagekarte muss Marker-Layer für Sicherungsposten aufnehmen können (FR28); Integrationspunkt klären.
- Platform-Notification-Kanal muss „kritisch/nicht-ignorierbar"-Priorität unterstützen (FR17); sonst als eigener UI-Banner-Mechanismus MVP-intern implementiert.

## Post-PRD Refinements (2026-04-21)

Nach Abschluss des PRD wurden in der **UX-Design-Phase** und **Epic-Breakdown-Phase** folgende Anpassungen entschieden und in Architecture/Epics verbindlich umgesetzt. Dieses Kapitel synchronisiert das PRD mit den finalen Entscheidungen, damit spätere Leser nicht zwischen Dokumenten navigieren müssen.

### Scope-Änderungen (von Phase 2 in MVP gehoben)

| #   | FR/Thema                                                          | PRD ursprünglich                       | Revision                    | Begründung                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------- | -------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **FR22** Push-Notifications (Tauri-Native + Web-Push)             | Phase 2                                | **MVP**                     | UX-Spec-Analyse: Abschnittsleiter-Geräte sind oft im Hintergrund; kritische PSA-Events dürfen nicht verloren gehen. Architektonisch über AR1 (F1 Plattform-Push-Infrastruktur, ADR-011-Kandidat). Umsetzung Story 1.1, 1.2, 3.8. |
| R2  | **`ConflictResolutionList`** (NFR-C3 UI-Umsetzung)                | nicht explizit MVP-Pflicht             | **MVP**                     | Multi-Device-Parallelarbeit (≥ 50 Clients, NFR-C1) erzeugt Konflikte; modale Auflösung skaliert nicht. Tabellarische Listen-UX ist MVP-Anforderung. Umsetzung Story 3.10.                                                        |
| R3  | **Keyboard-Shortcuts** als First-Class-Feature                    | nicht explizit im PRD                  | **MVP**                     | UX-Research: Power-User (Stabs-Arbeit) brauchen Tastatur-Bedienung für Tempo-Ziel (≤ 90 s CBRN). Shortcuts: `⌘K`, `/`, `N`, `V`, `?`, `Esc` + kontextuelle. Umsetzung Story 7.2, 7.3.                                            |
| R4  | **Deep-Links pro Entität**                                        | nicht explizit im PRD                  | **MVP**                     | UX-Research: Teilen per Funk/Chat („schau dir Vorfall XY an"). Jede Entität mit stabiler URL + „Link kopieren"-Button. Umsetzung Story 7.4.                                                                                      |
| R5  | **Dashboard-Opt-in-View Direction C** (Focus + List ab ≥ 1024 px) | nicht im PRD (Implementierungs-Detail) | **MVP-Produktentscheidung** | Desktop-Stab-Arbeit profitiert von Überblick + Tiefe gleichzeitig; View-Toggle persistent pro User. Umsetzung Story 6.3.                                                                                                         |

### Q-Decisions-Updates

| Q                                        | Status nach Refinements                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Q1 (5×5 Risikomatrix)                    | Unverändert, in Epic 2 Story 2.2 als `RiskMatrix5x5` umgesetzt                      |
| Q2 (PSA-Profile)                         | Unverändert, in Epic 3 als `PSAProfileMultiSelect` umgesetzt                        |
| Q3 (5 Seed-Vorlagen)                     | Unverändert, in Story 1.4 als `GefaehrdungsbeurteilungVorlage`-Seeds umgesetzt      |
| Q4 (Rollen-Modell)                       | **Revidiert** — siehe Q4-Sektion: `RollenDefinition`-Seed-Records statt Prisma-Enum |
| Q5 (Abschnitt ≡ `EinsatzEinheit`)        | Unverändert, in allen Eigenschutz-FKs umgesetzt                                     |
| Q6 (Gefahren-Modul via `gefahrenzoneId`) | Unverändert, in Story 2.1 als optionale FK umgesetzt                                |
| Q7 (Export-Schema)                       | **Finalisiert** — siehe Q7-Sektion: `EigenschutzVorfallExportV1`-Zod-Schema         |
| Q8 (Rechts-Review)                       | Unverändert, Tracking-Issue #713                                                    |

### Neue Architektur-Anforderungen (aus Architecture-Phase, siehe `architecture.md`)

Die Architecture-Phase hat 15 Architecture-Requirements (AR1–AR15) identifiziert, die die FRs operationalisieren:

- **AR1** Plattform-Push-Infrastruktur (ADR-011-Kandidat) — Voraussetzung für FR22
- **AR2** `EinsatzScopeGuard` (ADR-012-Kandidat) — Plattform-neutraler Guard
- **AR3** Prisma-Migration `add_eigenschutz_module` (11 Models, 7 Enums)
- **AR4** Seed-Skript für 4 Rollen + 5 Vorlagen
- **AR5** Event-Registry-Erweiterung (14 neue Domain-Events, 4 Stellen)
- **AR6** Hexagonales Backend-Layout
- **AR7** Frontend-Feature-Slice
- **AR8** Telemetrie (`EigenschutzTelemetryEvent` + Prometheus)
- **AR9** Optimistic Concurrency (`version: Int @default(1)`, HTTP 409)
- **AR10** Materialisierter Vorfall-Snapshot (`kontextSnapshot JSONB`)
- **AR11** Ampel-Read-Model-Updater
- **AR12** Re-Prompt-Scheduler (30 s Job + Eskalation)
- **AR13** PDF-Export-Renderer (`pdfkit@0.18`)
- **AR14** Export-Audit (`VorfallExportiert`-Event)
- **AR15** Neue Dependency: `web-push@^3`

Details in `_bmad-output/planning-artifacts/architecture.md`.

### Neue UX-Design-Requirements (aus UX-Spec)

29 UX-DRs (UX-DR1–UX-DR29) konkretisieren Komponenten, Patterns und Qualitätsgates — u. a. `SeverityBanner`, `RiskMatrix5x5`, `PSAProfileMultiSelect`, `AcknowledgmentStatusBadge`, `IncidentContextSnapshot`, `ConflictResolutionList`, `EquipmentChecklist`, `AmpelDashboard`, Dark-Mode-Severity-Tokens, Zero-Success-Toast-Policy, Alarm-Budget (max 3 assertive), Re-Prompt nach 5 min.

Details in `_bmad-output/planning-artifacts/ux-design-specification.md`.

### Zusätzliche QA-Anforderungen

- **Senior-Operator-Testing (50+)** als Teil des Piloteinsatz-Reviews (UX-Spec, Zeile 1160) — realistische Primärgruppe bei BOS-Stäben.
- **E2E-Tests für Journey 1b (CBRN) + Journey 4 (Export)** verpflichtend (Story 7.11), Sanity-Check ≤ 90 s für CBRN-Bulk.
- **A11y-Audit** mit axe-core (0 Violations), manuelle NVDA + VoiceOver-Durchläufe für Journey 1b (Story 7.8).
- **Performance-Audit** mit Artillery-Lasttests für 50 parallele Clients (Story 7.10).
