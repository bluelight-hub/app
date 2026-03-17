# Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Einsatzkraft,  
I want mich erfolgreich anmelden und meinen Konto-, Rollen- und Berechtigungskontext direkt bestätigt sehen,  
so that ich weiß, mit welcher Identität und mit welchen Rechten ich in den weiteren Einsatzfluss starte.

## Acceptance Criteria

1. **Given** ein erreichbarer Server und gültige Zugangsdaten  
   **When** der Nutzer die Anmeldung abschickt  
   **Then** wird eine gültige Sitzung aufgebaut und der Nutzer erreicht in höchstens `1` bestätigenden Schritt eine authentifizierte Startfläche  
   **And** diese Startfläche zeigt Konto, aktive Rolle und Berechtigungsstufe klar sichtbar an
2. **Given** ungültige Zugangsdaten, ein abgelaufener Vorzustand oder ein nicht zulässiger Zugriff  
   **When** die Anmeldung fehlschlägt  
   **Then** erscheint innerhalb von `1 Sekunde` ein textlich verständlicher Fehlerzustand mit nächster zulässiger Aktion  
   **And** nicht sensitive Eingaben wie Benutzerkennung oder Serverauswahl bleiben erhalten, ohne Sicherheitsdaten ungeschützt weiterzuführen
3. **Given** die Anmeldung oder Sitzungsinitialisierung dauert länger als `300 Millisekunden`  
   **When** der Request noch verarbeitet wird  
   **Then** zeigt die Oberfläche innerhalb von `300 Millisekunden` einen semantischen Ladezustand  
   **And** Mehrfachauslösung wird verhindert, ohne den Nutzer aus dem aktuellen Fokus- oder Eingabekontext zu werfen
4. **Given** die authentifizierte Startfläche ist geladen  
   **When** der Nutzer sie per Tastatur oder Screenreader nutzt  
   **Then** sind Primäraktion, Konto-/Rollenkontext und Statusinformationen vollständig erreichbar und verständlich  
   **And** die Oberfläche verhält sich in Desktop und Web in derselben Aufgabenreihenfolge konsistent

## Tasks / Subtasks

- [x] Auth-Erfolgspfad auf die authentifizierte Startfläche stabilisieren (AC: 1, 3)
  - [x] Den bestehenden Flow `LoginWindow` → `useUnifiedAuth` → `useCurrentUser` → Guard/Redirect beibehalten und so schärfen, dass nach erfolgreicher Authentifizierung der kanonische Zielpfad direkt in die authentifizierte Startfläche führt, ohne eine zweite Login-Erfolgssonderroute einzuführen.
  - [x] Bestehende Redirect-Quellen aus Search-Param, Auth-Store und zentraler Redirect-Sanitization weiterverwenden; keine neue lokale Redirect-Logik in Page-Komponenten aufbauen.
  - [x] Query- und Session-Orchestrierung so absichern, dass Guard und Startfläche den bestätigten User-Kontext sehen, bevor die Navigation abgeschlossen ist; Race-Conditions zwischen Login-Mutation, `auth/check` und Route-Guard vermeiden.

- [x] Sichtbaren Konto-, Rollen- und Berechtigungskontext auf der bestehenden Startfläche ergänzen (AC: 1, 4)
  - [x] Die bestehende authentifizierte Startfläche unter `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx` als Ziel beibehalten und dort einen klaren, persistenten Kontextblock für Konto, Rolle, Berechtigungsstufe und aktiven Server ergänzen, statt eine konkurrierende Ring-2-Shell vor Story `1.6` vorwegzunehmen.
  - [x] Falls dafür ein neuer UI-Baustein nötig ist, einen kleinen, wiederverwendbaren Context-Summary-Baustein unter `features/auth/ui/` oder `shared/ui/` einführen; keine Fachlogik in `shared/ui` ablegen.
  - [x] Primäraktion und nächste sinnvolle Folgeaktion auf der Startfläche klar halten, damit Story `1.5` direkt an die Einsatzwahl/-anlage anschließen kann.

- [x] Berechtigungsstufe fachlich sauber modellieren statt ad hoc im UI zu raten (AC: 1, 2, 4)
  - [x] Prüfen, ob `auth/check` und/oder die Unified-Auth-Response den für Story `1.4` nötigen Berechtigungskontext bereits liefern; falls nicht, den Backend-Vertrag gezielt erweitern, den API-Client via `pnpm run generate-api` regenerieren und den Frontend-Hook darauf aufsetzen.
  - [x] Falls keine Backend-Erweiterung nötig ist, eine zentrale Frontend-Ableitung für Anzeige von Rolle und Berechtigungsstufe definieren, die nicht in mehreren Komponenten dupliziert wird.
  - [x] Nicht zulässige Folgeaktionen auf der Startfläche klar verborgen oder deaktiviert halten und textlich erläutern, statt sie nur scheitern zu lassen.
  - [x] Wenn Login- oder Serverwechselpfade berührt werden, `packages/frontend/src/features/auth/api/use-public-users.ts` auf einen server-gescopten Query-Key heben, damit Benutzernamen nicht serverübergreifend gecacht oder geleakt werden.

- [x] Fehler-, Lade- und Zugriffszustände im Login- und Startflächenpfad handlungsleitend machen (AC: 2, 3, 4)
  - [x] Inline-Fehler und Statuskommunikation im bestehenden `LoginWindow`/`UnifiedAuthForm` weiterverwenden oder klein erweitern; keine Toast-only-Strategie für kritische Auth-Fehler.
  - [x] Nicht sensitive Eingaben wie Benutzername und Serverauswahl bei Fehlern erhalten; keine Passwörter oder Session-Geheimnisse in Stores, Komponentenstate oder zusätzlichem Storage halten.
  - [x] Für abgelaufene Session, nicht zulässigen Zugriff oder serverseitig verweigerte Auth-Zustände die nächste zulässige Aktion explizit zeigen, z. B. `erneut versuchen`, `Server wechseln`, `zur Anmeldung`, `Admin-Login öffnen`.

- [x] Accessibility-, Plattform- und Test-Gates für den bestätigten Einstieg erfüllen (AC: 3, 4)
  - [x] Fokusreihenfolge und Landmarken so gestalten, dass auf der authentifizierten Startfläche zuerst Orientierung, dann Primäraktion und dann die Einsatzliste/-anlage erreichbar sind.
  - [x] Den bestätigten Konto-/Rollenkontext in Desktop und Web in derselben Aufgabenreihenfolge bereitstellen; keine plattformspezifisch abweichende Anordnung der Kernschritte.
  - [x] Gezielte Tests für Login-Redirect, Current-User-Refetch, Kontextanzeige, Fehlerpfade und Keyboard-/Screenreader-Relevanz ergänzen.

- [x] Doku und Abnahme-Evidenz nachziehen (AC: 1-4)
  - [x] Bei Vertrags- oder Verhaltensänderungen `docs/frontend/session-api-contract-ring-2.md` und bei Bedarf `docs/frontend/ring-2-review-gates.md` aktualisieren.
  - [x] Wenn sich der Auth- oder Kontextvertrag architektonisch erweitert, betroffene ADR-/Architektur-Doku unter `docs/` bzw. `_bmad-output/planning-artifacts/architecture.md` spiegeln.
  - [x] Vor Abschluss mindestens gezielte Vitest-Specs, `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit` und `pnpm --filter @bluelight-hub/frontend lint:check` einplanen.

## Dev Notes

### Scope und gewünschtes Ergebnis

- Story `1.4` ist der Brückenschritt zwischen dem unauthentifizierten Einstieg aus `1.3` und der Einsatzwahl/-anlage aus `1.5`: Nach erfolgreichem Login muss eine authentifizierte Startfläche erscheinen, die Identität, Rolle und Berechtigungsstufe bestätigt, bevor der Nutzer in den fachlichen Einsatzfluss weitergeht. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen`] [Source: `_bmad-output/planning-artifacts/prd.md#Journey 1: Manfred steigt ein, prüft seinen Kontext und öffnet einen Einsatz`]
- Die Startfläche ist nicht nur „Login erfolgreich“, sondern der erste bestätigte Arbeitskontext. Der Nutzer soll sofort verstehen, wer er im System ist, welche Rolle aktiv ist und welche nächste Handlung zulässig ist. [Source: `_bmad-output/planning-artifacts/prd.md#Journey 1: Manfred steigt ein, prüft seinen Kontext und öffnet einen Einsatz`] [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Kontext vor Aktion.`]
- Nicht in Scope dieser Story: Einsatzwahl oder -anlage selbst (`1.5`), der blockierende `AssignmentGate` im aktiven Einsatz (`1.5`), die stabile Workspace-Shell mit Kontextleiste (`1.6`) oder ein neues Token-/Auth-Modell. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.6: Mit stabiler Shell und Kontextleiste in den Kernarbeitsraum wechseln`] [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`]

### Story-Ziel im Gesamtplan

- `1.3` liefert sichtbaren Server-, System- und Statuskontext vor dem Login. `1.4` muss diesen Pfad fortsetzen, nicht ersetzen: Nach der Authentifizierung folgt die bestätigte Identitäts- und Berechtigungsfläche, erst danach kommt die eigentliche Einsatzwahl aus `1.5`. [Source: `_bmad-output/implementation-artifacts/1-3-einstieg-mit-sichtbarem-server-und-statuskontext.md#Story-Ziel im Gesamtplan`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`]
- `FR1`, `FR2`, `FR30`, `FR33`, `FR34` und `FR35` hängen direkt an diesem Schritt: erfolgreicher Einstieg, sichtbarer Konto-/Rollenkontext, identische Auth-Flüsse wie im Bestand, gleiche Aufgabenreihenfolge in Desktop/Web und wiedererkennbare Statusfläche. [Source: `_bmad-output/planning-artifacts/prd.md#Access, Identity & Session Management`] [Source: `_bmad-output/planning-artifacts/prd.md#Administration, Integrationen & externe Services`] [Source: `_bmad-output/planning-artifacts/prd.md#Rollenangepasste Nutzung & konsistente Produktsprache`]
- UX-seitig ist dieser Schritt Make-or-Break, weil der erste bestätigte Auth-Kontext Vertrauen und Kontrolle erzeugen muss, bevor der Nutzer einen Einsatz öffnet oder anlegt. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Wenn Nutzer Kontrolle und Ruhe empfinden sollen, muss die Oberfläche Informationen streng priorisieren und den aktiven Einsatz-, Rollen- und Statuskontext jederzeit sichtbar halten.`] [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Beim ersten Einstieg oder bei der Rückkehr in einen Einsatz soll Bluelight Hub sofort Orientierung und Sicherheit vermitteln.`]

### Story Foundation aus PRD, UX und Epics

- Funktional relevant sind vor allem:
  - `FR1`: Login und Weiterführung in höchstens einem bestätigenden Schritt.
  - `FR2`: aktives Konto, Rolle und Berechtigungsstufe persistent sichtbar.
  - `FR26`: aus Fehlerzuständen muss die nächste zulässige Folgeaktion erkennbar sein.
  - `FR30`: dieselben fachlichen Daten- und Auth-Flüsse wie im Bestand nutzen.
  - `FR33` bis `FR35`: identische Aufgabenreihenfolge, schnelle Zustandslesbarkeit und wiedererkennbare Status-/Kontextflächen in Desktop und Web. [Source: `_bmad-output/planning-artifacts/prd.md#Access, Identity & Session Management`] [Source: `_bmad-output/planning-artifacts/prd.md#Operative Zusammenarbeit & Informationsweitergabe`] [Source: `_bmad-output/planning-artifacts/prd.md#Administration, Integrationen & externe Services`] [Source: `_bmad-output/planning-artifacts/prd.md#Rollenangepasste Nutzung & konsistente Produktsprache`]
- Nicht-funktional bindend sind:
  - `NFR5`: semantischer Ladezustand ab `300 Millisekunden`
  - `NFR6`, `NFR8`, `NFR10`: keine Abschwächung von Auth-/Berechtigungsregeln, keine neuen ungeschützten Speicherpfade, keine widersprüchlichen Status-/Handlungszustände
  - `NFR11` bis `NFR15`: Keyboard-only, sichtbarer Fokus, verständliche Statuskommunikation, Zoom-/Responsive-Fähigkeit
  - `NFR20`, `NFR22`: kontrollierbare Zustände auch bei Störungen und schnelle Wiedererfassbarkeit des Arbeitskontexts. [Source: `_bmad-output/planning-artifacts/prd.md#Performance`] [Source: `_bmad-output/planning-artifacts/prd.md#Security`] [Source: `_bmad-output/planning-artifacts/prd.md#Accessibility`] [Source: `_bmad-output/planning-artifacts/prd.md#Reliability`]
- UX-Direction: Der Einstiegspfad soll `Kontext vor Aktion` umsetzen. Nutzer müssen erst ihren bestätigten Identitäts- und Berechtigungsrahmen verstehen und erst dann in Einsatzwahl oder Wiederaufnahme gehen. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Kontext vor Aktion.`] [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Der Nutzer meldet sich an oder kehrt in die Anwendung zurück, sieht sofort seinen Konto-, Rollen- und Berechtigungskontext und öffnet einen aktiven Einsatz oder nimmt den letzten Einsatz wieder auf.`]

### Brownfield-Kontext und aktuelle Code-Anker

- Der Login-Pfad ist bereits zentral in `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx` gebündelt. Dort laufen Server-Guard, Serverwechsel, Statuskontext, Unified-Login und Redirect-Vorbereitung zusammen. [Source: `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`] [Source: `docs/frontend/session-api-contract-ring-2.md#Sichtbarer Einstiegskontext`]
- Der eigentliche Login-Submit läuft aktuell über `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx` und `useUnifiedAuth()`. Die Form bringt den verlangten semantischen Pending-Hinweis nach `300 Millisekunden` bereits mit. [Source: `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`] [Source: `packages/frontend/src/features/auth/api/use-login.ts`]
- Der bestätigte User-Kontext kommt derzeit aus `useCurrentUser()` via zentralem Raw-Adapter `shared/api/auth-session.ts`. Der Hook liefert `user`, `authStatus`, `isAdminAuthenticated` und `adminStatus`, aber aktuell keine explizite fachliche „Berechtigungsstufe“ jenseits von Rolle und Admin-Session. [Source: `packages/frontend/src/features/auth/api/use-current-user.ts`] [Source: `packages/frontend/src/shared/api/auth-session.ts`] [Source: `packages/backend/src/modules/auth/dto/auth-check-response.dto.ts`]
- Die authentifizierte Startfläche existiert bereits unter `/app/einsaetze`:
  - `/` leitet auf `/app/einsaetze` weiter.
  - `AppGuard` schützt `/app`.
  - `IndexPage` zeigt aktuell Benutzername, aktiven Server und das `EinsatzDashboard`, aber noch keinen vollständigen Rollen-/Berechtigungskontext. [Source: `packages/frontend/src/routes/index.tsx`] [Source: `packages/frontend/src/routes/app.tsx`] [Source: `packages/frontend/src/features/auth/guards/app-guard.tsx`] [Source: `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx`]
- `EinsatzDashboard.tsx` ist bereits die operative Auswahl-/Anlagefläche. Story `1.4` sollte dort höchstens den bestätigten Identitätskontext ergänzen, aber noch nicht die fachliche Auswahl-/Anlagelogik aus `1.5` umgestalten. [Source: `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`]
- `usePublicUsers()` lädt die öffentliche Benutzerauswahl derzeit ohne server-gescopten Query-Key. Wenn `1.4` den Login-Pfad erweitert oder Serverwechsel enger an die Startfläche bindet, muss dieser Cache-Pfad mit betrachtet werden. [Source: `packages/frontend/src/features/auth/api/use-public-users.ts`]

### Architektur- und Session/API-Guardrails

- Frontend-Grenze bleibt strikt `routes -> features -> shared`. Redirects, Guarding und URL-Vertrag bleiben in `routes/`, Session- und Auth-Orchestrierung in zentralen Hooks/Wrappern, sichtbare UI in `features/*/ui` oder `shared/ui`. [Source: `_bmad-output/planning-artifacts/architecture.md#Architectural Boundaries`] [Source: `_bmad-output/planning-artifacts/architecture.md#Structure Patterns`]
- Für Einstieg und bestätigte Startfläche gelten nur die kanonischen Session-/API-Pfade:
  - `packages/frontend/src/shared/api/api.ts`
  - `packages/frontend/src/shared/api/fetchWithRefresh.ts`
  - `packages/frontend/src/shared/api/auth-session.ts`
  - `packages/frontend/src/features/auth/api/`
  - `packages/frontend/src/features/system/api/`
  - `packages/frontend/src/features/server/`  
  Keine manuellen `fetch()`-Aufrufe, keine Shadow-Helper, kein verteiltes Parsing von `auth/check`. [Source: `docs/frontend/session-api-contract-ring-2.md#Kanonische Pfade`] [Source: `AGENTS.md#API-Workflow`]
- Tokens, Refresh und Server-Access-Token bleiben vollständig zentral. Feature-Stores oder UI-Komponenten dürfen weder JWTs noch Roh-Tokens oder sensible Session-Geheimnisse halten. Persistiert werden nur erlaubte, nicht-sensitive Zustände wie Redirect-Ziele oder Recovery-Kontext. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`] [Source: `docs/frontend/session-api-contract-ring-2.md#Server-Access-Token`] [Source: `docs/frontend/workspace-fundament-ring-2.md#Persistenz- und Recovery-Grenzen`]
- Story `1.4` darf noch keine konkurrierende Ring-2-Shell oder neue `WorkspaceContextBar` auf die Startfläche ziehen. Bis Story `1.6` bleibt die Startfläche eine Einstieg-/Dashboard-Komposition und keine vorgezogene Workspace-Shell. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.6: Mit stabiler Shell und Kontextleiste in den Kernarbeitsraum wechseln`] [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend Architecture`]

### Bekannte Brownfield-Risiken

- `packages/backend/src/modules/auth/auth.service.ts` verwendet in `validateAdminCredentials()` aktuell `bcrypt.compare(...)` ohne `await`. Wenn `1.4` die aktivierte Admin-Berechtigung sichtbar bestätigt oder fachlich voraussetzt, ist dieser Bug nicht ignorierbar. [Source: `packages/backend/src/modules/auth/auth.service.ts`]
- `packages/frontend/src/features/auth/api/use-public-users.ts` ist noch nicht server-gescopt. Im Multi-Server-Betrieb kann die öffentliche Benutzerauswahl dadurch den Kontext des aktiven Servers verwischen. [Source: `packages/frontend/src/features/auth/api/use-public-users.ts`]
- `LoginWindow` redirectet nach erfolgreicher Authentifizierung derzeit sehr direkt in den geschützten Bereich. Falls der bestätigte Rollen-/Kontokontext nicht auf der bestehenden Startfläche gelöst wird, entsteht schnell eine zweite, konkurrierende Erfolgsroute mit zusätzlicher Redirect- und Fokuskomplexität. [Source: `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`] [Source: `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx`]

### Previous Story Intelligence

- Story `1.3` ist noch `in-progress`. Ihre offenen Follow-ups betreffen genau den Einstiegspfad, auf dem `1.4` aufsetzt: sichtbarer Healthy-State-Kontext, expliziter Version-Mismatch-/Fehlerpfad und eine gezielte Absicherung des Hydration-Race im Auth-Route-Guard. `1.4` darf diese Baustellen nicht duplizieren, sondern muss dieselben Komponenten weiterverwenden oder zusammen mit den Follow-ups schließen. [Source: `_bmad-output/implementation-artifacts/1-3-einstieg-mit-sichtbarem-server-und-statuskontext.md#Review Follow-ups (AI)`]
- Aus `1.3` bereits verbindlich:
  - Statusflächen sind inline und handlungsleitend, nicht toast-only.
  - `LoginWindow` bleibt zentrale Einstiegs-Orchestrierung.
  - `ServerSelector`, `useSystemHealth`, `useSystemVersion` und `useRequireServer` bleiben die einzige sichtbare Einstiegsschicht vor dem Login. [Source: `_bmad-output/implementation-artifacts/1-3-einstieg-mit-sichtbarem-server-und-statuskontext.md#Brownfield-Kontext und aktuelle Code-Anker`] [Source: `docs/frontend/session-api-contract-ring-2.md#Sichtbarer Einstiegskontext`]
- Stories `1.2`, `1.2a`, `1.2b` und `1.2c` liefern die Guardrails, die auch für `1.4` gelten: gemeinsame Primitives, Accessibility-/Responsive-Gates, semantisches Statusfeedback ab `300 Millisekunden` und strikt zentrale Session-/API-Pfade. [Source: `_bmad-output/implementation-artifacts/1-2-workspace-primitives-fur-ring-2-bereitstellen.md`] [Source: `_bmad-output/implementation-artifacts/1-2a-accessibility-browser-und-responsive-review-gates-fur-ring-2-festlegen.md`] [Source: `_bmad-output/implementation-artifacts/1-2b-performance-gates-fur-ring-2-kernflachen-messbar-festlegen.md`] [Source: `_bmad-output/implementation-artifacts/1-2c-zentrale-session-und-api-anbindung-fur-einstieg-und-shell-absichern.md`]

### Git Intelligence und aktuelle Arbeitsmuster

- Commit `bab48c08` zentralisiert Auth-Session-Flüsse, `auth-session.ts`, `fetchWithRefresh.ts`, `useCurrentUser()` und die Session-Doku. Für `1.4` ist das ein klares Signal: auf dieser Schicht aufsetzen, nichts davon umgehen. [Source: `git show --stat --oneline bab48c08 -- packages/frontend packages/backend docs`]
- Commit `04f7ced7` synchronisiert die Story- und Review-Metadaten zu `1.3`. Die Review-Follow-ups sind damit nicht implizit erledigt, sondern bewusst dokumentiert und für `1.4` zu berücksichtigen. [Source: `git show --stat --oneline 04f7ced7 -- _bmad-output docs packages/frontend`]
- Commit `977563e9` baut die Ring-2-Workspace-Shell und die zugehörigen Performance-/Review-Gates aus. Für `1.4` heißt das: vorhandene Vertragsbegriffe respektieren, aber die Shell nicht auf die Startfläche vorziehen. [Source: `git show --stat --oneline 977563e9 -- packages/frontend docs`]

### Aktuelle offizielle Technik-Hinweise

- TanStack Router dokumentiert Auth- und Redirect-Entscheidungen vor Child-Routen explizit über `beforeLoad`. Für `1.4` bestätigt das: route-nahe Redirects bleiben in `routes/*`; UI-Komponenten oder Seitenscreens sollten keine konkurrierende Guard-Logik aufbauen. [Source: `https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes`]
- TanStack Query empfiehlt nach Mutationen gezielte Invalidierungen/Refetches; wenn ein Callback ein Promise zurückgibt oder awaited wird, kann der Pending-Zustand kontrolliert bis zur Datenkonsistenz gehalten werden. Das passt direkt zur bestehenden `useUnifiedAuth()`- plus `useCurrentUser()`-Orchestrierung gegen Guard-Races. [Source: `https://tanstack.com/query/latest/docs/react/guides/invalidations-from-mutations`]
- MDN/WAI empfehlen für nicht blockierende Statusmeldungen `role="status"` mit verständlichem Text, `aria-atomic="true"` und bei zusammengesetzten Updates optional `aria-busy="true"`. Das gilt sowohl für Login-Pending/Fehler als auch für Statushinweise auf der bestätigten Startfläche. [Source: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role`] [Source: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy`] [Source: `https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22`]

### Testing Requirements

- Bestehende Frontend-Testanker, die für `1.4` wahrscheinlich angepasst oder erweitert werden müssen:
  - `packages/frontend/src/features/auth/ui/organisms/__tests__/LoginWindow.test.tsx`
  - `packages/frontend/src/features/auth/ui/organisms/__tests__/UnifiedAuthForm.test.tsx`
  - `packages/frontend/src/features/auth/api/__tests__/use-current-user.spec.tsx`
  - `packages/frontend/src/features/auth/guards/__tests__/app-guard.spec.tsx`
  - `packages/frontend/src/routes/__tests__/auth.spec.ts`
  - neue oder ergänzende Tests für `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx` und/oder `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`  
  [Source: bestehende Testpfade im Repo]
- Falls der Backend-Vertrag für `auth/check` oder Unified Auth erweitert wird, zusätzlich Controller-/DTO-/Client-nahe Tests im Auth-Modul ergänzen und den API-Client regenerieren. [Source: `packages/backend/src/modules/auth/controllers/auth.controller.ts`] [Source: `packages/backend/src/modules/auth/dto/auth-check-response.dto.ts`] [Source: `AGENTS.md#API-Workflow`]
- Relevante Testfälle:
  - erfolgreicher Login mit Weiterleitung auf die authentifizierte Startfläche
  - Erhalt von Benutzername/Serverauswahl bei Fehlern
  - sichtbarer Konto-/Rollen-/Berechtigungskontext auf der Startfläche
  - nicht zulässige Aktion klar verborgen/deaktiviert plus erläuternde Folgeaktion
  - semantischer Pending-Hinweis ab `300 Millisekunden`
  - Keyboard-only- und Screenreader-taugliche Fokusreihenfolge auf Startfläche und Login  
  [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen`] [Source: `docs/frontend/ring-2-review-gates.md`]

### Project Structure Notes

- Wahrscheinliche Zielorte für die Umsetzung:
  - `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`
  - `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`
  - `packages/frontend/src/features/auth/api/use-login.ts`
  - `packages/frontend/src/features/auth/api/use-current-user.ts`
  - `packages/frontend/src/features/auth/guards/app-guard.tsx`
  - `packages/frontend/src/shared/api/auth-session.ts`
  - `packages/frontend/src/routes/auth.tsx`
  - `packages/frontend/src/routes/index.tsx`
  - `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx`
  - `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`
  - optional kleiner neuer UI-Baustein unter `packages/frontend/src/features/auth/ui/` oder `packages/frontend/src/shared/ui/`
  - falls Vertragslücke: `packages/backend/src/modules/auth/dto/auth-check-response.dto.ts`, `packages/backend/src/modules/auth/dto/auth-user-response.dto.ts`, `packages/backend/src/modules/auth/mappers/user-response.mapper.ts`, `packages/backend/src/modules/auth/controllers/auth.controller.ts`  
  [Source: `_bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping`] [Source: `docs/frontend/session-api-contract-ring-2.md#Kanonische Pfade`]
- Nicht Ziel dieser Story:
  - neue manuelle API-Pfade
  - neue Token-/Storage-Mechanik
  - vorgezogene `WorkspaceShell`/`WorkspaceContextBar` auf der Startfläche
  - direkte Änderungen in `packages/shared/client/` ohne `pnpm run generate-api`  
  [Source: `AGENTS.md`] [Source: `_bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines`]

### Offene Annahmen für den Dev-Agent

- Aktuell ist `/auth` faktisch ein passwortloser Unified-Login für normale Nutzer, während privilegierte Admin-Authentifizierung separat über `/admin-login` mit Passwort läuft. Die Epic-Formulierung `gültige Zugangsdaten` in `1.4` sollte daher nur dann als gemeinsamer Passwort-Login interpretiert werden, wenn Produkt/Architektur das explizit verlangen; sonst bleibt der separate Admin-Login-Pfad bestehen. [Source: `packages/frontend/src/features/admin/ui/pages/AdminLogin.tsx`] [Source: `packages/frontend/src/routes/admin-login.tsx`] [Source: `packages/backend/src/modules/auth/auth.service.ts`]
- Die bestehende `auth/check`-Response enthält noch keine explizite fachliche Berechtigungsstufe. Wenn die UI diese Information nicht sauber aus `role` plus `isAdminAuthenticated` ableiten kann, ist eine kleine Backend-Vertragserweiterung wahrscheinlich die robustere Lösung. Dann gilt strikt: Backend ändern → `pnpm run generate-api` → Hook anpassen → UI nutzen. [Source: `packages/frontend/src/features/auth/api/use-current-user.ts`] [Source: `packages/backend/src/modules/auth/dto/auth-check-response.dto.ts`] [Source: `AGENTS.md#API-Workflow`]
- Story `1.4` sollte die Startfläche wahrscheinlich auf dem bestehenden `/app/einsaetze`-Pfad verankern, weil dort bereits die Einsatzliste/-anlage lebt und Story `1.5` direkt daran anschließt. Eine separate „Login erfolgreich“-Zwischenroute würde mehr Redirect- und Fokuskomplexität einführen als sie löst. [Source: `packages/frontend/src/routes/index.tsx`] [Source: `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`]

### References

- `_bmad-output/planning-artifacts/epics.md`
  - `Story 1.3: Einstieg mit sichtbarem Server- und Statuskontext`
  - `Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen`
  - `Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`
  - `Story 1.6: Mit stabiler Shell und Kontextleiste in den Kernarbeitsraum wechseln`
- `_bmad-output/planning-artifacts/prd.md`
  - `Journey 1: Manfred steigt ein, prüft seinen Kontext und öffnet einen Einsatz`
  - `Access, Identity & Session Management`
  - `Operative Zusammenarbeit & Informationsweitergabe`
  - `Administration, Integrationen & externe Services`
  - `Rollenangepasste Nutzung & konsistente Produktsprache`
  - `Performance`
  - `Security`
  - `Accessibility`
  - `Reliability`
- `_bmad-output/planning-artifacts/architecture.md`
  - `Authentication & Security`
  - `API & Communication Patterns`
  - `Frontend Architecture`
  - `Structure Patterns`
  - `Architectural Boundaries`
  - `Requirements to Structure Mapping`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `Kontext vor Aktion.`
  - `Beim ersten Einstieg oder bei der Rückkehr in einen Einsatz soll Bluelight Hub sofort Orientierung und Sicherheit vermitteln.`
- `_bmad-output/planning-artifacts/ux-design-specification-revision-2026-03-14T120000+0100.md`
  - `Einsatz neu anlegen und arbeitsfähig werden`
  - `AssignmentGate`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-3-einstieg-mit-sichtbarem-server-und-statuskontext.md`
- `_bmad-output/implementation-artifacts/1-2-workspace-primitives-fur-ring-2-bereitstellen.md`
- `_bmad-output/implementation-artifacts/1-2a-accessibility-browser-und-responsive-review-gates-fur-ring-2-festlegen.md`
- `_bmad-output/implementation-artifacts/1-2b-performance-gates-fur-ring-2-kernflachen-messbar-festlegen.md`
- `_bmad-output/implementation-artifacts/1-2c-zentrale-session-und-api-anbindung-fur-einstieg-und-shell-absichern.md`
- `docs/frontend/session-api-contract-ring-2.md`
- `docs/frontend/ring-2-review-gates.md`
- `docs/frontend/workspace-fundament-ring-2.md`
- `docs/adr/adr-004-frontend-workspace-orchestrierung.md`
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`
- `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`
- `packages/frontend/src/features/auth/api/use-login.ts`
- `packages/frontend/src/features/auth/api/use-current-user.ts`
- `packages/frontend/src/features/auth/api/use-public-users.ts`
- `packages/frontend/src/features/auth/guards/app-guard.tsx`
- `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx`
- `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`
- `packages/frontend/src/shared/api/auth-session.ts`
- `packages/frontend/src/routes/index.tsx`
- `packages/frontend/src/routes/auth.tsx`
- `packages/frontend/src/features/admin/ui/pages/AdminLogin.tsx`
- `packages/frontend/src/routes/admin-login.tsx`
- `packages/backend/src/modules/auth/auth.service.ts`
- `packages/backend/src/modules/auth/controllers/auth.controller.ts`
- `packages/backend/src/modules/auth/dto/auth-check-response.dto.ts`
- `packages/backend/src/modules/auth/dto/auth-user-response.dto.ts`
- `packages/backend/src/modules/auth/mappers/user-response.mapper.ts`
- Offizielle Referenzen:
  - `https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes`
  - `https://tanstack.com/query/latest/docs/react/guides/invalidations-from-mutations`
  - `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role`
  - `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy`
  - `https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Subagent-Analyse Planungsartefakte
- Subagent-Analyse Architektur und Guardrails
- Subagent-Analyse Codebasis, bestehende Patterns und Git-Historie

### Implementation Plan

- Den bestehenden Login- und Redirect-Pfad auf `LoginWindow` → `useUnifiedAuth` → `useCurrentUser` → `AppGuard`/`/app/einsaetze` festziehen und Pending bis zum bestätigten User-Kontext halten.
- Konto-, Rollen-, Berechtigungs- und Serverkontext als eigenen Startflächen-Baustein ergänzen, ohne die Ring-2-Shell aus `1.6` vorwegzunehmen.
- Berechtigungsstufe zentral im Frontend aus `role` plus `isAdminAuthenticated` ableiten und Folgeaktionen darauf abgestimmt sichtbar bzw. deaktiviert erläutern.
- Servergescopte Query-Keys und handlungsleitende Fehlerzustände im Login-/Startflächenpfad vervollständigen.
- Vitest-, TypeScript- und Lint-Gates für Redirect, Kontextanzeige, Fehlerzustände und A11y-relevante Struktur ergänzen bzw. ausführen.

### Completion Notes List

- Servergescopte Query-Keys für `auth/check`, `auth/admin/status` und `public-users` eingeführt, damit Login-, Refetch- und Serverwechselpfade keinen serverübergreifenden Cache-Kontext leaken.
- Die bestehende Startfläche `/app/einsaetze` zeigt jetzt einen bestätigten Kontextblock für Konto, Rolle, Berechtigungsstufe, aktiven Server und nächste zulässige Aktion, ohne Story `1.6` vorwegzunehmen.
- `LoginWindow` und `UnifiedAuthForm` liefern semantische Inline-Fehler und Ladezustände; globale Auth-Route-Toasts für Netzwerk-/Serverfehler werden zugunsten des lokalen Handlungsfeedbacks unterdrückt.
- Review-Fix 2026-03-17: `IndexPage` rendert den bestätigten Kontext jetzt über `AuthContextSummary` und fällt bei schlanken Hook-Mocks kontrolliert auf die zentrale Rollenableitung zurück.
- Review-Verifikation 2026-03-17: Story-Suite mit `62` grünen Frontend-Tests, gezielte Backend-Suite für Setup-/Filterpfad mit `18` grünen Tests, `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit` und `pnpm --filter @bluelight-hub/frontend lint:check`.

### File List

- `_bmad-output/implementation-artifacts/1-4-authentifizieren-und-rollen-kontokontext-bestatigt-sehen.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/frontend/session-api-contract-ring-2.md`
- `docs/frontend/ring-2-review-gates.md`
- `packages/frontend/src/features/auth/api/queries.ts`
- `packages/frontend/src/features/auth/api/use-admin-setup.ts`
- `packages/frontend/src/features/auth/api/__tests__/use-public-users.spec.tsx`
- `packages/frontend/src/features/auth/api/use-public-users.ts`
- `packages/frontend/src/features/auth/ui/molecules/AuthContextSummary.tsx`
- `packages/frontend/src/features/auth/ui/molecules/AuthLoading.tsx`
- `packages/frontend/src/features/auth/ui/molecules/index.ts`
- `packages/frontend/src/features/auth/utils/auth.ts`
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`
- `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`
- `packages/frontend/src/features/auth/api/use-login.ts`
- `packages/frontend/src/features/auth/api/use-current-user.ts`
- `packages/frontend/src/features/einsatz/ui/pages/index.page.tsx`
- `packages/frontend/src/features/einsatz/ui/pages/__tests__/index.page.spec.tsx`
- `packages/frontend/src/features/einsatz/ui/organisms/EinsatzDashboard.tsx`
- `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx`
- `packages/frontend/src/shared/api/auth-session.ts`
- `packages/frontend/src/shared/api/__tests__/auth-session.spec.ts`
- `packages/frontend/src/shared/lib/errors/error-handler.ts`
- `packages/frontend/src/shared/lib/errors/error-handler.test.ts`
- `packages/frontend/src/shared/ui/atoms/alert.atom.tsx`
- `packages/backend/src/infrastructure/http/filters/http-exception.filter.ts`
- `packages/backend/src/infrastructure/http/filters/__tests__/http-exception.filter.spec.ts`
- `packages/frontend/src/features/auth/ui/organisms/__tests__/LoginWindow.test.tsx`
- `packages/frontend/src/features/auth/ui/organisms/__tests__/UnifiedAuthForm.test.tsx`
- `packages/frontend/src/features/auth/api/__tests__/use-current-user.spec.tsx`
- `packages/frontend/src/features/auth/guards/__tests__/app-guard.spec.tsx`
- `packages/frontend/src/routes/__tests__/auth.spec.ts`

### Change Log

- 2026-03-17: Bestätigten Auth-Kontext auf `/app/einsaetze` umgesetzt, Login-/Session-Orchestrierung servergescopet, semantische Fehler- und Ladezustände geschärft, Story-nahe Tests ergänzt, Mock-Regressionsfix nachgezogen, Review-Fixes aus dem adversarial Code Review umgesetzt und die Story auf `done` synchronisiert.
