---
project: bluelight-hub
date: 2026-01-06
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
documentsIncluded:
  - type: PRD
    selection: whole
    files:
      - _bmad-output/planning-artifacts/prd.md
  - type: Architecture
    selection: whole
    files:
      - _bmad-output/planning-artifacts/architecture.md
  - type: Epics
    selection: whole
    files:
      - _bmad-output/planning-artifacts/epics.md
  - type: UX
    selection: whole
    files:
      - _bmad-output/planning-artifacts/ux-design-specification.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-01-06
**Project:** bluelight-hub

## Document Inventory (Step 1)

### PRD Files Found
**Whole Documents:**
- prd.md (27 242 Bytes, 2026-01-06 07:49)

**Sharded Documents:**
- Keine

### Architecture Files Found
**Whole Documents:**
- architecture.md (33 744 Bytes, 2026-01-06 09:57)

**Sharded Documents:**
- Keine

### Epics & Stories Files Found
**Whole Documents:**
- epics.md (78 500 Bytes, 2026-01-06 10:37)

**Sharded Documents:**
- Keine

### UX Design Files Found
**Whole Documents:**
- ux-design-specification.md (48 106 Bytes, 2026-01-06 09:30)
- ux-design-directions.html (48 316 Bytes, 2026-01-06 09:15) — ignoriert (Beispiel)

**Sharded Documents:**
- Keine

## PRD Analysis

### Functional Requirements
FR1: Benutzer kann einen neuen Server zur Liste hinzufügen (Name, URL, optional Access-Token)
FR2: Benutzer kann gespeicherte Server in einer Liste einsehen
FR3: Benutzer kann einen Server aus der Liste auswählen
FR4: Benutzer kann Server-Details bearbeiten (Name, URL)
FR5: Benutzer kann einen Server aus der Liste entfernen
FR6: System speichert Server-Liste persistent zwischen App-Neustarts
FR7: System markiert den zuletzt verwendeten Server als Default
FR8: Benutzer kann einem Server ein visuelles Icon/Farbe zuweisen
FR9: System sendet Access-Token im HTTP-Header bei allen API-Requests
FR10: System blockiert Login-Versuch wenn kein Server konfiguriert ist
FR11: System erlaubt Server-Wechsel nur im ausgeloggten Zustand
FR12: Server validiert Access-Token bei jedem Request
FR13: Server liefert reduzierte Health-Informationen ohne gültigen Token
FR14: Server unterstützt INSECURE_MODE für lokale Entwicklung
FR15: System kann mehrere Access-Tokens pro Server verwalten
FR16: Admin kann Server von INSECURE zu SECURE migrieren mit Token-Setup
FR17: Admin kann Invite-Codes mit Ablaufdatum erstellen
FR18: Admin kann Invite-Codes widerrufen
FR19: Admin kann Liste aller Invite-Codes einsehen (Status, Ersteller, Einlösedatum)
FR20: Benutzer kann Invite-Code gegen Access-Token eintauschen
FR21: System validiert Invite-Code Ablaufdatum vor Einlösung
FR22: System markiert Invite-Code nach Einlösung als "verwendet"
FR23: Desktop-App verarbeitet Deep Links zum Server-Setup (bluelight://connect)
FR24: Web-App verarbeitet URL-Parameter zum Server-Setup (?server=...&invite=...)
FR25: Benutzer kann Server manuell per Formular hinzufügen (URL + Invite-Code)
FR26: Admin kann Access-Tokens mit Namen/Labels erstellen
FR27: Admin kann Access-Tokens deaktivieren
FR28: Admin kann Token-Usage-Statistiken einsehen (lastUsedAt)
FR29: Admin kann Token rotieren (neuen Token generieren, alten invalidieren)
FR30: Server zeigt Token nur einmalig bei Erstellung an (kein späteres Abrufen)
FR31: Admin muss Access-Token während initialem Server-Setup erstellen (Secure Mode)
FR32: Desktop-App speichert Credentials verschlüsselt (Tauri plugin-store)
FR33: Web-App speichert Credentials in localStorage mit Sicherheitswarnung
FR34: System erkennt Plattform und wendet entsprechende Speicher-Strategie an
FR35: Desktop-App reagiert auf Deep-Link-Aufrufe auch wenn App geschlossen
FR36: Web-App zeigt explizite Warnung bei unverschlüsselter Speicherung
FR37: Server startet im Setup-Pending-Mode wenn kein Admin existiert
FR38: Setup-Pending-Mode erlaubt nur /health und /admin/setup Endpoints
FR39: Benutzer kann Verbindung zu Server testen vor Speicherung
FR40: System zeigt klare Fehlermeldung bei abgelaufenem Invite-Code
Total FRs: 40

### Non-Functional Requirements
NFR-P1: Token-Validierung - <100ms Latenz pro Request
NFR-P2: Server-Wechsel-UX - Server-Dropdown reagiert in <50ms
NFR-P3: Deep Link Verarbeitung - App-Start + Server-Setup in <3s
NFR-P4: Health-Check - Timeout nach 5s, Feedback sofort
NFR-P5: Server-Liste laden - <200ms aus lokalem Storage
NFR-S1: Token-Hashing - bcrypt mit cost factor >=10
NFR-S2: Token-Format - Prefix blh_ + 32 random bytes (base64)
NFR-S3: Rate Limiting - Max 5 Invite-Einlösungen/Minute/IP
NFR-S4: Desktop-Speicherung - Verschlüsselt via Tauri plugin-store
NFR-S5: Invite-Code Entropie - Min. 128 Bit Zufälligkeit
NFR-S6: Token-Transmission - Nur über HTTPS (außer INSECURE_MODE)
NFR-S7: Token-Anzeige - Einmalig bei Erstellung, nie wieder abrufbar
NFR-S8: Audit-Trail - Alle Token-Operationen geloggt (ohne Token-Wert)
NFR-I1: Deep Link Schema - bluelight://connect registriert auf Desktop
NFR-I2: URL-Parameter - ?server= und ?invite= auf Web unterstützt
NFR-I3: Tauri Plugin Store - @tauri-apps/plugin-store v2.x kompatibel
NFR-I4: Backward Compatibility - Bestehende Auth-Flows unverändert nutzbar
NFR-I5: API-Versioning - Health-Endpoint Änderungen rückwärtskompatibel
NFR-R1: Offline-Verhalten - Server-Liste offline verfügbar
NFR-R2: Connection-Fehler - Klare Fehlermeldung in <2s
NFR-R3: Invite-Code Race - Atomare "used" Markierung (keine Doppelnutzung)
NFR-R4: Token-Persistenz - Token überlebt App-Updates und OS-Neustarts
NFR-R5: Graceful Degradation - Bei Token-Fehler -> Login-Screen (nicht Crash)
NFR-U1: Server-Setup - Neuer Server in <2 Minuten konfiguriert
NFR-U2: Server-Wechsel - Max. 3 Klicks von Login zu anderem Server
NFR-U3: Fehlermeldungen - Deutsch, actionable (was tun bei Fehler)
NFR-U4: Browser-Warnung - Sichtbar ohne Scrollen auf Login-Page
NFR-U5: Deep Link Feedback - Visuelles Feedback bei Link-Verarbeitung
Total NFRs: 28

### Additional Requirements
- Offene Security-Analyse: Invite-Code -> Token-Exchange, Option 1 empfohlen, Status offen
- Annahmen & Constraints:
  - Tauri plugin-store ist ausreichend sicher (Risiko: Müssten auf Stronghold upgraden)
  - Invite-Codes können 1x verwendet werden (Risiko: Race Conditions bei parallelem Einlösen)
  - Admins haben direkten Server-Zugang (Risiko: Kein Remote-Admin-Onboarding)
  - Web-User akzeptieren localStorage-Warnung (Risiko: Secure-Cookie-Alternative nötig)
- Risk Mitigation (aus PRD): Token-Exchange früh implementieren, Penetration-Test vor Production-Rollout, Usability-Test mit Einsatzkräften vor Release

### PRD Completeness Assessment
- PRD liefert 40 FRs und 28 NFRs mit klaren IDs zur Traceability.
- Offener Entscheid laut PRD: Invite-Code -> Token-Exchange (Option 1 empfohlen, final nicht beschlossen).
- Annahmen oben markieren Stellen, die noch zu verifizieren sind.

## Epic Coverage Validation

### Coverage Matrix
| FR  | PRD Requirement | Epic Coverage | Status |
| --- | --------------- | ------------- | ------ |
| FR1 | Benutzer kann einen neuen Server zur Liste hinzufügen (Name, URL, optional Access-Token) | Epic 2 | Covered |
| FR2 | Benutzer kann gespeicherte Server in einer Liste einsehen | Epic 3 | Covered |
| FR3 | Benutzer kann einen Server aus der Liste auswählen | Epic 3 | Covered |
| FR4 | Benutzer kann Server-Details bearbeiten (Name, URL) | Epic 3 | Covered |
| FR5 | Benutzer kann einen Server aus der Liste entfernen | Epic 3 | Covered |
| FR6 | System speichert Server-Liste persistent zwischen App-Neustarts | Epic 2 | Covered |
| FR7 | System markiert den zuletzt verwendeten Server als Default | Epic 3 | Covered |
| FR8 | Benutzer kann einem Server ein visuelles Icon/Farbe zuweisen | Epic 3 | Covered |
| FR9 | System sendet Access-Token im HTTP-Header bei allen API-Requests | Epic 1 | Covered |
| FR10 | System blockiert Login-Versuch wenn kein Server konfiguriert ist | Epic 3 | Covered |
| FR11 | System erlaubt Server-Wechsel nur im ausgeloggten Zustand | Epic 3 | Covered |
| FR12 | Server validiert Access-Token bei jedem Request | Epic 1 | Covered |
| FR13 | Server liefert reduzierte Health-Informationen ohne gültigen Token | Epic 1 | Covered |
| FR14 | Server unterstützt INSECURE_MODE für lokale Entwicklung | Epic 1 | Covered |
| FR15 | System kann mehrere Access-Tokens pro Server verwalten | Epic 4 | Covered |
| FR16 | Admin kann Server von INSECURE zu SECURE migrieren mit Token-Setup | Epic 4 | Covered |
| FR17 | Admin kann Invite-Codes mit Ablaufdatum erstellen | Epic 1 | Covered |
| FR18 | Admin kann Invite-Codes widerrufen | Epic 1 | Covered |
| FR19 | Admin kann Liste aller Invite-Codes einsehen (Status, Ersteller, Einlösedatum) | Epic 1 | Covered |
| FR20 | Benutzer kann Invite-Code gegen Access-Token eintauschen | Epic 2 | Covered |
| FR21 | System validiert Invite-Code Ablaufdatum vor Einlösung | Epic 2 | Covered |
| FR22 | System markiert Invite-Code nach Einlösung als "verwendet" | Epic 2 | Covered |
| FR23 | Desktop-App verarbeitet Deep Links zum Server-Setup (bluelight://connect) | Epic 2 | Covered |
| FR24 | Web-App verarbeitet URL-Parameter zum Server-Setup (?server=...&invite=...) | Epic 2 | Covered |
| FR25 | Benutzer kann Server manuell per Formular hinzufügen (URL + Invite-Code) | Epic 2 | Covered |
| FR26 | Admin kann Access-Tokens mit Namen/Labels erstellen | Epic 4 | Covered |
| FR27 | Admin kann Access-Tokens deaktivieren | Epic 4 | Covered |
| FR28 | Admin kann Token-Usage-Statistiken einsehen (lastUsedAt) | Epic 4 | Covered |
| FR29 | Admin kann Token rotieren (neuen Token generieren, alten invalidieren) | Epic 4 | Covered |
| FR30 | Server zeigt Token nur einmalig bei Erstellung an (kein späteres Abrufen) | Epic 4 | Covered |
| FR31 | Admin muss Access-Token während initialem Server-Setup erstellen (Secure Mode) | Epic 1 | Covered |
| FR32 | Desktop-App speichert Credentials verschlüsselt (Tauri plugin-store) | Epic 2 | Covered |
| FR33 | Web-App speichert Credentials in localStorage mit Sicherheitswarnung | Epic 2 | Covered |
| FR34 | System erkennt Plattform und wendet entsprechende Speicher-Strategie an | Epic 2 | Covered |
| FR35 | Desktop-App reagiert auf Deep-Link-Aufrufe auch wenn App geschlossen | Epic 2 | Covered |
| FR36 | Web-App zeigt explizite Warnung bei unverschlüsselter Speicherung | Epic 2 | Covered |
| FR37 | Server startet im Setup-Pending-Mode wenn kein Admin existiert | Epic 1 | Covered |
| FR38 | Setup-Pending-Mode erlaubt nur /health und /admin/setup Endpoints | Epic 1 | Covered |
| FR39 | Benutzer kann Verbindung zu Server testen vor Speicherung | Epic 2 | Covered |
| FR40 | System zeigt klare Fehlermeldung bei abgelaufenem Invite-Code | Epic 2 | Covered |

### Missing Requirements
- Keine fehlenden FRs; alle 40 PRD-FRs sind im FR Coverage Map den Epics zugeordnet.
- Keine Epics mit FR-Referenzen außerhalb der PRD-Liste gefunden.

### Coverage Statistics
- Total PRD FRs: 40
- FRs covered in epics: 40
- Coverage percentage: 100%

## UX Alignment Assessment

### UX Document Status
- Gefunden: `ux-design-specification.md` (primäres UX-Dokument). `ux-design-directions.html` ist ein Beispiel-Showcase und bleibt ausgeschlossen.

### Alignment Issues
- Scope-Abweichung: UX adressiert iOS/Android (Deep Link via Share-Sheet, Bottom-Sheet-Patterns), während PRD/Architektur Desktop/Web/Tauri als Zielplattformen definieren; kein Mobile-Client in der Architektur vorgesehen.
- Sharing/QR: UX beschreibt QR-Code-Share und Messaging-Share für Invites, in PRD/Architektur nicht spezifiziert; Implementierungspfad fehlt.
- Power-Features: UX nennt Keyboard-Shortcuts (Cmd+K) und Zero-Confirmation-Server-Add als UX-Prinzip; diese Features sind weder in PRD noch in Architektur als Anforderungen/NFRs hinterlegt.
- App-Store-Fallback im Deep-Link-Flow erwähnt, aber keine Architekturbasis für Mobile-Distribution dokumentiert.

### Warnings
- Klärung erforderlich, ob Mobile-Scope (iOS/Android) und QR-/Share-Funktionen geliefert werden sollen; aktuell nicht durch Architektur oder PRD gedeckt.
- Falls Mobile out-of-scope bleibt: UX-Flows für Share-Sheet/App-Store weglassen oder als spätere Phase kennzeichnen, um Umsetzungsrisiken zu vermeiden.

## Epic Quality Review

### Quality Findings
- Epics sind nutzerwert-orientiert (kein rein technischer Epic gefunden); FR-Coverage bleibt vollständig.
- Story 1.1 (Epic 1) bündelt Migration, Domain-Entity, Repository, Guard und Decorator in einem Paket. Das ist zu groß für eine unabhängige Story und verletzt das Single-Developer-Sizing aus create-epics-and-stories.
- Story 1.1 modelliert bereits `inviteCodeId`/Relation zu InviteCode, bevor InviteCode in Story 1.6 entsteht. Das ist ein Vorgriff auf spätere Tabellen (DB-Timing-Verstoß) und erzeugt eine Vorwärtsabhängigkeit.
- Story 4.5 (Epic 4) fasst mehrere Funktionen zusammen (Token-Liste, Paginierung, Suche, Status-Filter, Mehrfach-Tokens, Inaktivitätswarnung). Umfang überschreitet eine einzelne Story und gefährdet Unabhängigkeit/Sizing.

### Recommendations
- Story 1.1 aufteilen: a) ServerAccessToken Model/Repository + Hashing, b) Guard + Decorator. Relation zu InviteCode erst hinzufügen, wenn InviteCode (Story 1.6) umgesetzt wird.
- Story 4.5 in kleinere Stories schneiden: z.B. Basis-Token-Liste mit Mehrfach-Tokens, danach Paginierung/Suche/Filter, separat Inaktivitätswarnungen.

## Summary and Recommendations

### Overall Readiness Status
~~NEEDS WORK~~ → **READY FOR IMPLEMENTATION** ✅

### Critical Issues ~~Requiring Immediate Action~~ RESOLVED

| Issue | Status | Resolution |
|-------|--------|------------|
| Scope-Abgleich: UX fordert Mobile (iOS/Android) sowie QR-/Share-UX | ✅ BEHOBEN | UX-Spec aktualisiert: Mobile/QR als "Phase 2" gekennzeichnet, Phase 1 = Desktop + Web |
| Story 1.1 zu groß + InviteCode-Vorwärtsabhängigkeit | ✅ BEHOBEN | Story 1.1 aufgeteilt in 1.1 (Entity/Repository) + 1.1a (Guard/Decorator), inviteCodeId nach Story 1.6 verschoben |
| Story 4.5 oversized | ✅ BEHOBEN | Story 4.5 aufgeteilt in 4.5 (Basis Token-Liste), 4.5a (Paginierung/Filter), 4.5b (Letzten Token schützen) |

### Resolution Details (2026-01-06)

**1. UX Scope-Alignment:**
- `ux-design-specification.md` erweitert um Phase-Hinweise
- Platform Strategy Tabelle mit Phase-Spalte ergänzt
- Mobile, QR-Code-Sharing, App-Store-Fallback explizit als "Phase 2" markiert

**2. Story 1.1 Aufteilung:**
- Story 1.1: Server-Access-Token Entity & Repository (AC1-AC3)
- Story 1.1a: ServerAccessGuard & Decorator (AC4-AC5)
- `inviteCodeId` Relation aus AC1 entfernt, in Story 1.6 AC1 ergänzt

**3. Story 4.5 Aufteilung:**
- Story 4.5: Basis Token-Liste & Mehrfach-Token-Support (AC1-AC3)
- Story 4.5a: Token-Liste Paginierung & Filter
- Story 4.5b: Letzten aktiven Token schützen

### Recommended Next Steps
1. ~~Entscheiden, ob Mobile + QR-/Share-Funktionalität jetzt Teil des Scopes ist~~ → Entschieden: Phase 2
2. ~~Story 1.1 splitten~~ → Erledigt
3. ~~Story 4.5 in mehrere Stories zerlegen~~ → Erledigt
4. **Sprint Planning starten** mit `/bmad:bmm:workflows:sprint-planning`

### Final Note
Alle kritischen Issues wurden am 2026-01-06 behoben. Die Dokumente sind nun implementierungsbereit.
