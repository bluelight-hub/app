# Story 1.3: Einstieg mit sichtbarem Server- und Statuskontext

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Einsatzkraft,  
I want vor der Anmeldung einen klaren Server-, System- und Statuskontext im neuen Einstieg sehen,  
so that ich der Anwendung vertrauen und Verbindungs- oder Anmeldeprobleme ohne Rätsel einordnen kann.

## Acceptance Criteria

1. **Given** keine aktive Sitzung und die Desktop- oder Web-App wird geöffnet  
   **When** der Einstieg geladen wird  
   **Then** die Oberfläche zeigt im neuen Bluelight-Workspace-Stil einen klar erkennbaren Server- und Systemkontext, eine eindeutige Primäraktion zur Anmeldung und sichtbare Statusflächen  
   **And** Fokuszustände, Tastaturbedienung und semantische Struktur erfüllen `WCAG 2.1 AA` für diesen Einstieg
2. **Given** der konfigurierte Server ist nicht erreichbar oder der Vorab-Status schlägt fehl  
   **When** der Zustand erkannt wird  
   **Then** die Oberfläche zeigt innerhalb von `1 Sekunde` einen textlich verständlichen Fehler- oder Warnzustand statt nur einer Farbcodierung  
   **And** eine zulässige nächste Aktion wie `erneut versuchen` oder `Server wechseln` bleibt direkt erreichbar
3. **Given** der Nutzer startet eine Login-Interaktion und die Verarbeitung dauert länger als `300 Millisekunden`  
   **When** der Request noch läuft  
   **Then** die Oberfläche zeigt innerhalb von `300 Millisekunden` einen semantischen Ladezustand  
   **And** Mehrfachauslösung der Primäraktion wird verhindert, ohne bereits eingegebene Werte zu verlieren
4. **Given** der Einstieg wird in Light Mode, Dark Mode oder auf kleineren Zielbreiten dargestellt  
   **When** der Nutzer den Einstieg betrachtet oder per Tastatur bedient  
   **Then** Typografie, Spacing, Statusfarben und Fokusindikatoren bleiben konsistent, lesbar und nicht verspielt  
   **And** der Server- und Systemkontext bleibt auch auf kleineren Screens sichtbar

## Tasks / Subtasks

- [ ] Einstiegskontext im vorhandenen Auth-Rahmen sichtbar und semantisch schärfen (AC: 1, 4)
  - [ ] `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx` als zentrale Orchestrierung beibehalten und dort einen klaren, immer sichtbaren Kontextbereich für aktiven Server, Host, Systemstatus und Version ergänzen, statt diese Informationen nur implizit über Logo-Dot, Footer-Badges oder geöffnetes Dropdown zu transportieren.
  - [ ] `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx` weiter für Auswahl und Wechsel nutzen, aber den aktiven Serverkontext zusätzlich außerhalb des Dropdowns lesbar halten.
  - [x] Bestehende Ring-1-/Ring-2-Primitives aus `AuthLayout`, `AuthCard`, `AuthFooter`, `LogoWithIndicator` und `shared/ui` wiederverwenden oder klein erweitern; keine zweite UI-Schicht und keine neue Login-Sonderseite aufbauen.
- [ ] Handlungsleitende Status-, Fehler- und Warnflächen aus zentralen Hooks ableiten (AC: 1, 2, 4)
  - [x] Statusmodell ausschließlich aus `useRequireServer`, `useServerListHealth`, `useSystemHealth`, `useSystemVersion`, Server-Store und zentralen Session-/API-Pfaden ableiten; keine manuellen `fetch()`-Aufrufe und keine Route-/Komponenten-Schattenpfade.
  - [ ] Für `checking`, `offline`, `error`, Version-Mismatch oder degradierte Zustände textlich verständliche Statusflächen mit nächster zulässiger Aktion modellieren, z. B. `erneut versuchen`, `Server wechseln`, `Server verwalten` oder `Server einrichten`.
  - [x] Retry- und Recheck-Aktionen ausschließlich über bestehende Query-/Hook-Pfade wie React-Query-Refetch/Invalidierung oder vorhandene Server-Health-Hooks ausführen; keine ad-hoc-Timer, keine lokalen Schatten-Requests und keine zweite Statusmaschine in `LoginWindow` einführen.
  - [x] Für Setup- oder Manage-Folgeaktionen die bestehenden Routen `/server/setup` und `/server/manage` weiterverwenden; keine Inline-Setup- oder Inline-Management-Logik auf der Login-Fläche aufbauen.
  - [x] Statuskommunikation semantisch umsetzen: `role="status"`, redundantes `aria-live="polite"`, `aria-atomic="true"` und bei laufenden zusammengesetzten Updates gezielt `aria-busy`.
- [ ] Primäraktion und lange Requests robust machen, ohne Kontextverlust zu erzeugen (AC: 2, 3)
  - [x] `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx` und den Login-Submit so nutzen oder erweitern, dass der Ladezustand innerhalb von `300 Millisekunden` textlich erkennbar wird und Mehrfachauslösung zuverlässig blockiert bleibt.
  - [x] Nicht sensitive Eingaben wie Benutzername und Serverauswahl bei Fehlern oder Retries erhalten; keine sensiblen Werte ungeschützt weiterführen.
  - [ ] Login-, Serverwechsel- und Vorab-Status-Interaktionen so modellieren, dass Nutzer nie rätseln müssen, ob die Anwendung noch arbeitet, blockiert ist oder eine Folgeaktion erwartet.
- [ ] Accessibility-, Responsive- und Browser-Gates für den Einstieg konkret einlösen (AC: 1, 4)
  - [ ] Landmarken, Überschriftenhierarchie, sichtbare Fokusführung und Keyboard-only-Nutzbarkeit im Einstieg verlässlich machen; keine verschachtelten interaktiven Elemente erzeugen.
  - [ ] Kleine Zielbreiten (`< 640px`, `640-1023px`) so behandeln, dass Server- und Systemkontext sichtbar bleiben und keine konkurrierende zweite Navigationslogik entsteht.
  - [ ] `BrowserSecurityBanner` und statusnahe Einstiegsflächen so integrieren, dass Orientierung und Primäraktion auf Desktop und Web in derselben Aufgabenreihenfolge erhalten bleiben.
- [ ] Tests, Doku und Abnahme-Evidenz ergänzen (AC: 1-4)
  - [ ] Gezielte Frontend-Tests für `LoginWindow`, `UnifiedAuthForm`, `useSystemHealth`, `useSystemVersion`, `useRequireServer` und bei Bedarf `ServerSelector` ergänzen oder schärfen.
  - [x] Redirect-Regressionen rund um `packages/frontend/src/routes/auth.tsx`, `beforeLoad`, Setup-Redirect-Flag und die bestehenden Pfade `/server/setup` sowie `/server/manage` gezielt absichern.
  - [x] Wenn sich der sichtbare Einstiegskontrakt oder Session-/Statusregeln präzisieren, `docs/frontend/session-api-contract-ring-2.md` und bei Bedarf `docs/frontend/ring-2-review-gates.md` mitziehen.
  - [ ] Vor Abschluss mindestens gezielte Vitest-Specs, `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit` und `pnpm --filter @bluelight-hub/frontend lint:check` einplanen.

### Review Follow-ups (AI)

- [ ] [AI-Review][High] Gesunden Einstieg um eine dauerhaft sichtbare, textliche Statusfläche für den Online-Zustand ergänzen, damit Server-, System- und Statuskontext nicht nur über Dots oder implizite Marker transportiert werden. [`packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`]
- [ ] [AI-Review][High] Fehlerpfad für `useSystemVersion()` sichtbar machen und die globale Toast-Unterdrückung auf `/auth` auf die tatsächlich redundanten Einstiegskontext-Queries eingrenzen. [`packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`] [`packages/frontend/src/shared/lib/errors/error-handler.ts`]
- [ ] [AI-Review][Medium] Hydration-Race-Branch in `packages/frontend/src/routes/auth.tsx` gezielt in `packages/frontend/src/routes/__tests__/auth.spec.ts` absichern. [`packages/frontend/src/routes/auth.tsx`] [`packages/frontend/src/routes/__tests__/auth.spec.ts`]

## Dev Notes

### Scope und gewünschtes Ergebnis

- Story `1.3` modernisiert nicht den eigentlichen Auth-Erfolgspfad, sondern den unauthentifizierten Einstieg vor Story `1.4`. Ziel ist ein Einstieg, der bereits vor dem Login erklärt, mit welchem Server und welchem Systemzustand der Nutzer arbeitet und welche nächste Aktion gerade zulässig ist. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.3: Einstieg mit sichtbarem Server- und Statuskontext`]
- Der Nutzen entsteht aus Orientierung vor Aktion: Serverkontext, Verbindungsstatus, textlich verständliche Warnungen und klare Primäraktion reduzieren Interpretationsaufwand unter Zeitdruck. [Source: `_bmad-output/planning-artifacts/prd.md#Journey 1: Manfred steigt ein, prüft seinen Kontext und öffnet einen Einsatz`]
- Nicht in Scope dieser Story: bestätigter Konto-, Rollen- und Berechtigungskontext nach erfolgreichem Login (`1.4`), Einsatzwahl oder -anlage (`1.5`) sowie neue Auth- oder Storage-Architektur. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`]

### Story-Ziel im Gesamtplan

- `1.1` und `1.2` liefern Tokens, Primitives und den sichtbaren Rahmen, auf dem der Einstieg aufsetzen muss. `1.2a` und `1.2b` definieren die Review- und Performance-Gates, `1.2c` die zentrale Session-/API-Grenze. `1.3` ist die erste sichtbare Einstiegsstory, die alle diese Leitplanken konkret zusammenführt. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.1: Design-Tokens und visuelle Produktsprache für Ring 1 bereitstellen`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.2: Workspace-Primitives für Ring 2 bereitstellen`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.2a: Accessibility-, Browser- und Responsive-Review-Gates für Ring 2 festlegen`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.2b: Performance-Gates für Ring-2-Kernflächen messbar festlegen`] [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.2c: Zentrale Session- und API-Anbindung für Einstieg und Shell absichern`]
- Diese Story ist direkte fachliche Vorbedingung für `1.4`, weil erst ein verständlicher Server-/Systemkontext sichtbar sein muss, bevor der bestätigte Konto- und Rollenkontext überhaupt glaubwürdig anknüpfen kann. [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen`]

### Story Foundation aus PRD, UX und Epics

- Relevante funktionale Bezüge: `FR1`, `FR26`, `FR29`, `FR30`, `FR33`, `FR34`, `FR35`. Besonders wichtig sind verständliche nächste Aktionen in Fehlerzuständen, konsistente Bestandsflüsse sowie dieselbe Aufgabenreihenfolge in Desktop und Web. [Source: `_bmad-output/planning-artifacts/prd.md#Access, Identity & Session Management`] [Source: `_bmad-output/planning-artifacts/prd.md#Operative Zusammenarbeit & Informationsweitergabe`] [Source: `_bmad-output/planning-artifacts/prd.md#Administration, Integrationen & externe Services`] [Source: `_bmad-output/planning-artifacts/prd.md#Rollenangepasste Nutzung & konsistente Produktsprache`]
- Relevante nicht-funktionale Bezüge: `NFR3`, `NFR5`, `NFR6`, `NFR8`, `NFR10`, `NFR11` bis `NFR15`, `NFR20`, `NFR23`. Daraus folgen sichtbares Feedback unter `300 Millisekunden`, textliche Statuskommunikation, Keyboard-only-Nutzbarkeit, klare Folgeaktionen und keine neuen ungeschützten Speicherpfade. [Source: `_bmad-output/planning-artifacts/prd.md#Performance`] [Source: `_bmad-output/planning-artifacts/prd.md#Security`] [Source: `_bmad-output/planning-artifacts/prd.md#Accessibility`] [Source: `_bmad-output/planning-artifacts/prd.md#Reliability`]
- UX-seitig ist „Kontext vor Aktion“ leitend: Der Einstieg soll ruhig, professionell, nicht verspielt und im Arbeitskontext verankert sein. Statuskommunikation ist Teil der Oberfläche, nicht bloß Benachrichtigung. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Einstieg, Kontext prüfen und arbeitsfähig werden`] [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles`] [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns`]

### Brownfield-Kontext und aktuelle Code-Anker

- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx` ist bereits die zentrale Einstiegs-Orchestrierung und damit der primäre Änderungsanker für diese Story. Dort laufen Server-Guard, Serverauswahl, Auth-Mutation, System-Health und Versionshinweise bereits zusammen. [Source: `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`]
- Der sichtbare Rahmen ist vorhanden und soll inkrementell erweitert werden, nicht neu erfunden:
  - `packages/frontend/src/shared/ui/templates/AuthLayout.tsx`
  - `packages/frontend/src/shared/ui/molecules/auth-card.molecule.tsx`
  - `packages/frontend/src/shared/ui/molecules/logo-with-indicator.molecule.tsx`
  - `packages/frontend/src/shared/ui/molecules/auth-footer.molecule.tsx`  
  [Source: jeweilige Dateien]
- Server- und Statuskontext sind bereits teilweise vorhanden, aber aktuell noch zu implizit verteilt:
  - Serverkontext über `useRequireServer`, `useServerList`, `useActiveServer`, `useServerListHealth`, `ServerSelector`
  - Systemstatus über `useSystemHealth`, `useSystemVersion`, `getIndicatorStatus`, `STATUS_LABELS`, `STATUS_DOT_COLORS`
  - Browser-/Sicherheitskontext über `BrowserSecurityBanner`  
  [Source: `packages/frontend/src/features/server/hooks/use-require-server.ts`] [Source: `packages/frontend/src/features/server/hooks/use-server-list-health.ts`] [Source: `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx`] [Source: `packages/frontend/src/features/system/api/use-system-health.ts`] [Source: `packages/frontend/src/features/system/api/use-system-version.ts`] [Source: `packages/frontend/src/features/system/utils/status-mapping.ts`] [Source: `packages/frontend/src/features/server/ui/molecules/BrowserSecurityBanner.tsx`]
- Wichtiges aktuelles Risiko: Der aktive Serverkontext ist für Nutzer derzeit stark an Dropdown, Footer-Badges und Logo-Indikator gekoppelt. Story `1.3` sollte diesen Kontext expliziter und textlicher sichtbar machen, ohne einen neuen Parallelpfad zu bauen. [Source: `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`] [Source: `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx`]

### Architektur- und Session/API-Guardrails

- Frontend-Grenze bleibt strikt `routes -> features -> shared`. `routes/auth.tsx` darf dünn bleiben und keine neue Session-, Refresh- oder Parsing-Logik aufnehmen. Sichtbare Einstiegserweiterungen gehören in `features/auth/ui`, `features/system`, `features/server` oder kleine `shared/ui`-Bausteine. [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend Architecture`] [Source: `docs/frontend/workspace-fundament-ring-2.md#Architekturgrenzen`]
- Session-, Refresh-, Redirect- und Token-Handling bleiben zentral. Story `1.3` darf keine manuellen `fetch()`-Aufrufe und keine Schattenpfade in Komponenten oder Stores einführen. Kanonische Pfade sind:
  - `packages/frontend/src/shared/api/api.ts`
  - `packages/frontend/src/shared/api/fetchWithRefresh.ts`
  - `packages/frontend/src/shared/api/auth-session.ts`
  - `packages/frontend/src/features/auth/api/`
  - `packages/frontend/src/features/system/api/`
  - `packages/frontend/src/features/server/`  
  [Source: `docs/frontend/session-api-contract-ring-2.md#Kanonische Pfade`] [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`] [Source: `AGENTS.md#API-Workflow`]
- `useSystemVersion.ts` nutzt bewusst den zentralen Root-Helper `fetchBackendVersion()` wegen eines Generator-Gaps. Falls Story `1.3` weitere Vorab-Systemdaten braucht, müssen diese ebenfalls zentral gekapselt werden statt in `LoginWindow` direkt zu fetchen. [Source: `packages/frontend/src/features/system/api/use-system-version.ts`] [Source: `packages/frontend/src/shared/api/backend-root.ts`] [Source: `docs/frontend/session-api-contract-ring-2.md#Erlaubte Ausnahmen und Generator-Gaps`]
- Feature-Stores und UI-Komponenten halten keine JWTs, Roh-Tokens oder Server-Access-Tokens. Lokal persistiert werden dürfen nur nicht-sensitive Recovery- und Auswahlzustände. [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`] [Source: `docs/frontend/session-api-contract-ring-2.md#Server-Access-Token`] [Source: `docs/frontend/workspace-fundament-ring-2.md#Persistenz- und Recovery-Grenzen`]

### Previous Story Intelligence

- `1.2` und `workspace-fundament-ring-2.md` legen fest, dass Folge-Stories auf `shared/ui` und `features/workspace` aufbauen, statt neue Shell- oder UI-Namenswelten zu erfinden. Für `1.3` bedeutet das: Auth-Einstieg im bestehenden Ring-1/Ring-2-Rahmen schärfen, nicht neu scaffolden. [Source: `_bmad-output/implementation-artifacts/1-2-workspace-primitives-fur-ring-2-bereitstellen.md`] [Source: `docs/frontend/workspace-fundament-ring-2.md`]
- `1.2a` macht Keyboard-first, sichtbare Fokusführung, semantische Statuskommunikation, `200 %` Zoom sowie Browser-/Assistive-Tech-Matrix verbindlich. Diese Gates gelten auch für den Einstieg, obwohl er noch nicht die volle Workspace-Shell ist. [Source: `_bmad-output/implementation-artifacts/1-2a-accessibility-browser-und-responsive-review-gates-fur-ring-2-festlegen.md`] [Source: `docs/frontend/ring-2-review-gates.md`]
- `1.2b` etabliert die harte Regel, dass Spinner ohne Text nicht ausreichen und Zustände über `300 Millisekunden` semantisch sichtbar werden müssen. Das trifft in `1.3` direkt auf Login, Health-Checks und Serverwechsel zu. [Source: `_bmad-output/implementation-artifacts/1-2b-performance-gates-fur-ring-2-kernflachen-messbar-festlegen.md`] [Source: `docs/frontend/ring-2-performance-gates.md#Statusfeedback über 300 ms`]
- `1.2c` hat die Session-/API-Härtung bereits geleistet. `1.3` darf darauf aufbauen, aber nichts davon aufweichen. Besonders wichtig bleiben `auth-session.ts`, `fetchWithRefresh.ts`, zentrale Raw-Response-Adapter und die Vermeidung neuer Redirect-/Parsing-Logik in Routen oder UI. [Source: `_bmad-output/implementation-artifacts/1-2c-zentrale-session-und-api-anbindung-fur-einstieg-und-shell-absichern.md`]

### Git Intelligence und aktuelle Arbeitsmuster

- Commit `977563e9` hat gezeigt, wie Ring-2-Arbeit aktuell geliefert wird: inkrementelle Erweiterung bestehender Shell-Verträge, sehr breite Vitest-Abdeckung und klare Contract-Tests statt breitem Neuaufbau. Dieses Muster soll `1.3` weiterführen. [Source: `git show --stat --oneline 977563e9 -- packages/frontend`]
- Commit `4454a480` stabilisiert Performance-Gates nachträglich statt neue Architekturen einzuführen. Für `1.3` ist das ein Hinweis, sichtbare Statussemantik und Messbarkeit von Anfang an mitzuführen. [Source: `git show --stat --oneline 4454a480 -- packages/frontend`]
- Commit `41e07053` und `57a914b7` zeigen, dass `UnifiedAuthForm` und Combobox-Fokus aktuell aktiv gepflegt werden. Änderungen am Einstieg sollten daher klein, gezielt und regression-sicher bleiben. [Source: `git show --stat --oneline 41e07053 -- packages/frontend`] [Source: `git show --stat --oneline 57a914b7 -- packages/frontend`]

### UX-, Accessibility-, Responsive- und Statusleitplanken

- Status darf nie nur über Farbe oder Badge transportiert werden. Sichtbare Zustände brauchen Text, Beschreibung und bei dynamischen Updates sinnvolle Live-Region-Semantik. [Source: `docs/frontend/workspace-fundament-ring-2.md#Statusverhalten`] [Source: `docs/frontend/ring-2-review-gates.md#5. Statuskommunikation`]
- Der Einstieg soll dieselbe Statussprache wie die bestehenden Ring-2-Statusflächen verwenden, insbesondere für `checking`, `warning`, `error`, degradierte Verbindung und nächste Folgeaktion. Keine parallele Einstiegssprache neben `StatusRail` einführen. [Source: `docs/frontend/workspace-fundament-ring-2.md#Statusverhalten`] [Source: `docs/frontend/ring-2-review-gates.md#5. Statuskommunikation`] [Source: `packages/frontend/src/shared/ui/organisms/workspace/StatusRail.tsx`]
- Für den Einstieg gelten dieselben Kernprüfungen wie für Ring-2-Flächen:
  - Landmarken und semantische Struktur
  - Fokusführung und Keyboard-only
  - Statuskommunikation
  - Browser-, Zoom- und Responsive-Freigabe  
  [Source: `docs/frontend/ring-2-review-gates.md#Universelle Review-Gates`]
- Responsive bleibt desktop-first. Auf kleineren Breiten darf Komplexität reduziert werden, aber Server- und Systemkontext dürfen nicht in Menüs oder sekundäre Wege verschwinden. [Source: `_bmad-output/planning-artifacts/prd.md#Browser & Responsive Requirements`] [Source: `docs/frontend/ring-2-review-gates.md#Responsive-Erwartungen`]
- `BrowserSecurityBanner` bleibt relevant für Web-Nutzer, darf aber den Handlungsfluss nicht in eine konkurrierende Navigationslogik kippen. [Source: `packages/frontend/src/features/server/ui/molecules/BrowserSecurityBanner.tsx`] [Source: `docs/frontend/ring-2-review-gates.md#Journey-Matrix`]
- Version-Mismatch soll in Story `1.3` standardmäßig als sichtbarer Warn- oder Degradationszustand behandelt werden, nicht automatisch als blockierender Hard-Stop. Nur wenn der bestehende zentrale Auth-/Session-Vertrag Login fachlich unmöglich macht, darf daraus eine blockierende Folgeaktion entstehen. [Source: `packages/frontend/src/features/system/api/use-system-version.ts`] [Source: `packages/frontend/src/features/system/utils/status-mapping.ts`] [Source: `_bmad-output/planning-artifacts/prd.md#Rollenangepasste Nutzung & konsistente Produktsprache`]

### Aktuelle offizielle Technik-Hinweise

- TanStack Router dokumentiert `route.beforeLoad` als Middleware vor Child-Routen und empfiehlt Redirects auf Login/Setup dort so früh wie möglich. Das bestätigt, dass `routes/auth.tsx` bei Guarding dünn bleibt und Story `1.3` keine neue Status- oder Session-Orchestrierung in die Route ziehen soll. [Source: `https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes`]
- TanStack Query empfiehlt Status-Nachläufe über `onSuccess` plus `invalidateQueries()` oder `refetchQueries()`. Wenn `onSuccess` ein Promise zurückgibt, bleibt die Mutation pending, bis Folgedaten aktualisiert sind. Das passt direkt zu `useUnifiedAuth()` und den vorhandenen Refetch-Patterns im Einstieg. [Source: `https://tanstack.com/query/latest/docs/react/guides/invalidations-from-mutations`]
- MDN und W3C empfehlen für nicht blockierende Statusmeldungen `role="status"` mit implizitem `aria-live="polite"` und `aria-atomic="true"`; W3C rät zusätzlich zu explizitem `aria-atomic="true"` für bessere Unterstützung. Statusmeldungen sollen nicht fokussiert werden, sondern automatisch vorgelesen werden. [Source: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role`] [Source: `https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22`]
- MDN empfiehlt `aria-busy="true"` für Live-Regionen oder zusammengesetzte UI-Bereiche, solange mehrere Teile eines Statusupdates noch im Aufbau sind, damit Assistive Technologies nicht zu früh oder mehrfach unvollständige Änderungen ankündigen. [Source: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy`] [Source: `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live`]

### Testing Requirements

- Relevante Frontend-Testpfade:
  - `packages/frontend/src/features/auth/ui/organisms/__tests__/LoginWindow.test.tsx`
  - `packages/frontend/src/features/auth/ui/organisms/__tests__/UnifiedAuthForm.test.tsx`
  - `packages/frontend/src/features/system/api/__tests__/use-system-health.spec.tsx`
  - `packages/frontend/src/features/system/api/__tests__/use-system-version.spec.tsx`
  - `packages/frontend/src/features/server/hooks/__tests__/use-require-server.spec.tsx`
  - `packages/frontend/src/features/server/ui/molecules/__tests__/ServerSelector.test.tsx`
  - `packages/frontend/src/shared/ui/templates/__tests__/AuthLayout.spec.tsx`
  - bei Session-/Redirect-Berührung zusätzlich `packages/frontend/src/shared/api/__tests__/fetchWithRefresh.spec.ts`  
  [Source: bestehende Testpfade im Repo]
- Testfälle sollen ausdrücklich abdecken:
  - Einstieg ohne aktive Sitzung
  - konfigurierter Server erreichbar, nicht erreichbar oder degradierter Zustand
  - Version-Mismatch-/Warnpfad
  - semantischer Ladezustand über `300 Millisekunden`
  - Retry-/Serverwechsel-Aktion
  - Keyboard-only-Nutzung und sichtbare Fokusführung
  - kleinere Zielbreiten mit weiter sichtbarem Server-/Systemkontext  
  [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.3: Einstieg mit sichtbarem Server- und Statuskontext`] [Source: `docs/frontend/ring-2-review-gates.md`] [Source: `docs/frontend/ring-2-performance-gates.md`]
- Vor Abschluss mindestens einplanen:
  - gezielte Vitest-Läufe für die geänderten Einstiegspfade
  - `pnpm --filter @bluelight-hub/frontend exec tsc --noEmit`
  - `pnpm --filter @bluelight-hub/frontend lint:check`  
  [Source: `AGENTS.md#Testing und Definition of Done`] [Source: `_bmad-output/project-context.md#Testing Rules`]

### Project Structure Notes

- Wahrscheinliche Zielorte für die Umsetzung:
  - `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`
  - `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`
  - `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx`
  - `packages/frontend/src/features/server/hooks/use-require-server.ts`
  - `packages/frontend/src/features/system/api/use-system-health.ts`
  - `packages/frontend/src/features/system/api/use-system-version.ts`
  - `packages/frontend/src/features/system/utils/status-mapping.ts`
  - kleine ergänzende Shared/UI-Bausteine unter `packages/frontend/src/shared/ui/` oder `packages/frontend/src/features/auth/ui/`
  - bei Vertragsanpassungen Doku unter `docs/frontend/`
- Nicht Ziel dieser Story:
  - neues Auth-Modell
  - neue globale Storage- oder Session-Schicht
  - manueller API-Client außerhalb der zentralen Pfade
  - Ausbau von `SingleEinsatzLayout.tsx` oder `features/workspace` zur Einstiegs-Sonderwelt
  - Änderungen an `packages/shared/client/`  
  [Source: `AGENTS.md`] [Source: `docs/frontend/session-api-contract-ring-2.md`] [Source: `docs/frontend/workspace-fundament-ring-2.md`]

### Offene Annahmen für den Dev-Agent

- Es werden voraussichtlich keine Backend-Endpoint-Änderungen benötigt. Falls doch, gilt weiterhin strikt: Endpoint ändern, `pnpm run generate-api`, dann Hook und UI anpassen. [Source: `AGENTS.md#API-Workflow`]
- Der Einstieg braucht sehr wahrscheinlich keinen komplett neuen Screen, sondern eine präzisere Status-/Kontextkomposition innerhalb des bestehenden `LoginWindow`-Rahmens.
- Wenn der sichtbare Kontext `LoginWindow.tsx` zu stark aufbläht, ist eine kleine extrahierte Status-/Kontext-Komponente innerhalb `features/auth/ui` oder `shared/ui` vorzuziehen, solange die Orchestrierung in `LoginWindow` bleibt.

### References

- `_bmad-output/planning-artifacts/epics.md`
  - `Story 1.1: Design-Tokens und visuelle Produktsprache für Ring 1 bereitstellen`
  - `Story 1.2: Workspace-Primitives für Ring 2 bereitstellen`
  - `Story 1.2a: Accessibility-, Browser- und Responsive-Review-Gates für Ring 2 festlegen`
  - `Story 1.2b: Performance-Gates für Ring-2-Kernflächen messbar festlegen`
  - `Story 1.2c: Zentrale Session- und API-Anbindung für Einstieg und Shell absichern`
  - `Story 1.3: Einstieg mit sichtbarem Server- und Statuskontext`
  - `Story 1.4: Authentifizieren und Rollen-/Kontokontext bestätigt sehen`
  - `Story 1.5: Einsatz auswählen, neu anlegen und per AssignmentGate arbeitsfähig öffnen`
- `_bmad-output/planning-artifacts/prd.md`
  - `Journey 1: Manfred steigt ein, prüft seinen Kontext und öffnet einen Einsatz`
  - `Browser & Responsive Requirements`
  - `Access, Identity & Session Management`
  - `Administration, Integrationen & externe Services`
  - `Rollenangepasste Nutzung & konsistente Produktsprache`
  - `Performance`
  - `Security`
  - `Accessibility`
  - `Reliability`
- `_bmad-output/planning-artifacts/architecture.md`
  - `Data Architecture`
  - `Authentication & Security`
  - `API & Communication Patterns`
  - `Frontend Architecture`
- `_bmad-output/project-context.md`
- `_bmad-output/implementation-artifacts/1-2-workspace-primitives-fur-ring-2-bereitstellen.md`
- `_bmad-output/implementation-artifacts/1-2a-accessibility-browser-und-responsive-review-gates-fur-ring-2-festlegen.md`
- `_bmad-output/implementation-artifacts/1-2b-performance-gates-fur-ring-2-kernflachen-messbar-festlegen.md`
- `_bmad-output/implementation-artifacts/1-2c-zentrale-session-und-api-anbindung-fur-einstieg-und-shell-absichern.md`
- `docs/frontend/workspace-fundament-ring-2.md`
- `docs/frontend/ring-2-review-gates.md`
- `docs/frontend/ring-2-performance-gates.md`
- `docs/frontend/session-api-contract-ring-2.md`
- `docs/adr/adr-004-frontend-workspace-orchestrierung.md`
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`
- `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`
- `packages/frontend/src/routes/auth.tsx`
- `packages/frontend/src/features/server/hooks/use-require-server.ts`
- `packages/frontend/src/features/server/hooks/use-server-list-health.ts`
- `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx`
- `packages/frontend/src/features/server/ui/molecules/BrowserSecurityBanner.tsx`
- `packages/frontend/src/features/system/api/use-system-health.ts`
- `packages/frontend/src/features/system/api/use-system-version.ts`
- `packages/frontend/src/features/system/utils/status-mapping.ts`
- `packages/frontend/src/shared/api/api.ts`
- `packages/frontend/src/shared/api/fetchWithRefresh.ts`
- `packages/frontend/src/shared/api/auth-session.ts`
- `packages/frontend/src/shared/api/backend-root.ts`
- `packages/frontend/src/shared/ui/templates/AuthLayout.tsx`
- `packages/frontend/src/shared/ui/molecules/auth-card.molecule.tsx`
- `packages/frontend/src/shared/ui/molecules/logo-with-indicator.molecule.tsx`
- `packages/frontend/src/shared/ui/molecules/auth-footer.molecule.tsx`
- Offizielle Referenzen:
  - `https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes`
  - `https://tanstack.com/query/latest/docs/react/guides/invalidations-from-mutations`
  - `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role`
  - `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy`
  - `https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live`
  - `https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Subagent-Analyse Planungsartefakte
- Subagent-Analyse Architektur und Guardrails
- Subagent-Analyse Codebasis, bestehende Patterns und Git-Historie

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Story-Metadaten mit aktuellem Implementierungsstand und Review-Ergebnis synchronisiert
- Offene Code-Review-Follow-ups für sichtbaren Healthy-State-Kontext, Versions-Preflight und Hydration-Race als Aufgaben ergänzt

### File List

- `_bmad-output/implementation-artifacts/1-3-einstieg-mit-sichtbarem-server-und-statuskontext.md`
- `docs/frontend/ring-2-review-gates.md`
- `docs/frontend/session-api-contract-ring-2.md`
- `packages/frontend/src/features/auth/ui/organisms/LoginWindow.tsx`
- `packages/frontend/src/features/auth/ui/organisms/UnifiedAuthForm.tsx`
- `packages/frontend/src/features/auth/ui/organisms/__tests__/LoginWindow.test.tsx`
- `packages/frontend/src/features/auth/ui/organisms/__tests__/UnifiedAuthForm.test.tsx`
- `packages/frontend/src/features/server/ui/molecules/ServerSelector.tsx`
- `packages/frontend/src/routes/__tests__/auth.spec.ts`
- `packages/frontend/src/shared/lib/errors/error-handler.ts`
- `packages/frontend/src/shared/lib/errors/error-handler.test.ts`
- `packages/frontend/src/shared/ui/atoms/alert.atom.tsx`
