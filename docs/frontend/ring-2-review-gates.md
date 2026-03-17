# Ring-2-Review-Gates

## Zweck

Diese Doku definiert die verbindlichen Review-Gates für Ring-2-Workspaces. Sie ergänzt das technische Fundament aus [`workspace-fundament-ring-2.md`](./workspace-fundament-ring-2.md) um prüfbare Abnahmeregeln für Accessibility, Browser-Zielumgebungen, Zoom, Responsive-Verhalten und journey-basierte Qualität.

Die zugehörigen messbaren Performance-Gates für `Überblick`, `ETB` und `Befehle` sind in [`ring-2-performance-gates.md`](./ring-2-performance-gates.md) dokumentiert.

Die Gates sind absichtlich fachneutral formuliert. Sie gelten für neue Ring-2-Flächen unabhängig davon, ob die konkrete Story eine Lageübersicht, einen ETB-Ablauf oder eine Befehlsoberfläche liefert.

## Einsatz im Review

Jede Ring-2-Abnahme läuft in derselben Reihenfolge:

1. Universelle Gates prüfen.
2. Die vier Kern-Journeys gegen reale Anker im Workspace prüfen.
3. Automatisierte Repo-Checks ausführen.
4. Verbindliche manuelle Browser-, Zoom- und Assistive-Tech-Prüfpfade durchlaufen.

## Gate-Typen

### Universelle Gates

Diese Gates gelten immer, unabhängig von der Fachfläche:

- `WorkspaceShell` bleibt der kanonische Rahmen für Kontext, Navigation, Status und Overlay-Zugang.
- `ModuleRail`, `WorkspaceContextBar` und `StatusRail` bleiben die verbindlichen Namen in Code, Tests und Doku.
- Keyboard-first, sichtbare Fokusführung, semantische Statuskommunikation und konsistente Overlay-Regeln sind keine optionalen Verbesserungen, sondern Freigabekriterien.

### Journey- oder flächenspezifische Ergänzungen

Diese Gates ergänzen die universellen Regeln:

- konkrete Dialoge, Sheets oder Quick-Actions einer Fachfläche
- journeyspezifische Wiederaufnahme- oder Recovery-Schritte
- modul- oder seitenbezogene Statusindikatoren

Journey-spezifische Ergänzungen dürfen die universellen Gates verschärfen, aber nicht abschwächen.

## Universelle Review-Gates

### 1. `WCAG 2.1 AA`, Landmarken und semantische Struktur

- Prüffragen:
  - Sind Landmarken, Überschriften und Beschriftungen für Shell, Navigation und Status nachvollziehbar?
  - Wird Bedeutung nicht nur über Farbe vermittelt?
  - Sind Labels, Beschreibungen und Live-Status für Screenreader verständlich?
- Evidenz:
  - gerenderte Landmarken und Rollen in `WorkspaceShell`
  - semantische Link-Struktur in `WorkspaceContextBar`
  - Live-Status-Semantik in `StatusRail`
- Pass:
  - Navigation, Status und Kontext sind per Rolle oder Beschriftung auffindbar.
  - Statusmeldungen haben Text und bei Bedarf Live-Region-Semantik.
  - Es gibt keine verschachtelten interaktiven Elemente.
- Fail:
  - Status ist nur farblich erkennbar.
  - Fokusfähige Container sind semantisch falsch verschachtelt.
  - Landmarken oder sprechende Labels fehlen.

### 2. Fokusführung und Keyboard-only

- Prüffragen:
  - Ist jeder Kernpfad ohne Maus ausführbar?
  - Bleibt der Fokus bei Shell-nahen Interaktionen sichtbar und nachvollziehbar?
  - Wird Fokus nach Dialogen, Overlays oder Sheets sinnvoll zurückgegeben?
- Evidenz:
  - Fokus-Ringe und aktive Zustände in `WorkspaceShell` und `ModuleRail`
  - Overlay-Blocking im `SingleEinsatzLayout`
  - Keyboard-only-Durchläufe der Ring-2-Journeys
- Pass:
  - `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape` und definierte Shortcuts verhalten sich stabil.
  - Blockierende Overlays verhindern konkurrierende Hotkeys.
  - Nach dem Schließen eines Overlays bleibt der Arbeitskontext erhalten.
- Fail:
  - Fokus verschwindet, springt unkontrolliert oder landet hinter einem offenen Overlay.
  - Dialoge lassen parallel globale Hotkeys zu.
  - Eine Journey verlangt Mausinteraktion, obwohl sie als Ring-2-Kernpfad gilt.

### 3. Shortcut- und Navigationsvertrag

- Prüffragen:
  - Kommen Modul-Hotkeys aus dem Workspace-Contract und navigieren sie tatsächlich?
  - Bleibt die sichtbare Navigation mit der technischen Primärroute konsistent?
  - Entsteht auf kleineren Breakpoints keine zweite konkurrierende Navigationslogik?
- Evidenz:
  - `ModuleRail`
  - `ModuleOverviewCard`
  - `routeTarget`, `shortcut` und `badgeHint` aus dem Workspace-Contract
- Pass:
  - Alt-Shortcuts navigieren zur kanonischen Modulroute.
  - In editierbaren Feldern greifen globale Modul-Hotkeys nicht.
  - Reduzierte Navigation bleibt dieselbe Logik in anderer Darstellung.
- Fail:
  - Tooltips zeigen Shortcuts, aber die Navigation reagiert nicht.
  - Primärroute und sichtbare Navigation driften auseinander.
  - Ein Mobile- oder Tablet-Zustand führt eine eigene Navigationswelt ein.

### 4. Overlay- und Dialogverhalten

- Prüffragen:
  - Sperren blockierende Overlays globale Workspace-Hotkeys?
  - Sind Öffnen, Schließen und Fokus-Rückgabe für Overlays konsistent?
  - Bleibt der Hintergrundzustand nach dem Schließen erhalten?
- Evidenz:
  - `SingleEinsatzLayout`
  - `hasBlockingWorkspaceOverlay`
  - Modulübersicht, Command Palette und Shell-nahe Dialoge
- Pass:
  - Overlays blockieren konkurrierende globale Hotkeys.
  - `Escape` und definierte Close-Aktionen schließen reproduzierbar.
  - Der aktive Kontext bleibt nach dem Schließen derselbe.
- Fail:
  - Während eines blockierenden Overlays öffnet ein weiterer globaler Dialog.
  - Fokus wird nach dem Schließen nicht in den Arbeitskontext zurückgeführt.
  - Shell-nahe Overlays implementieren Sonderlogik neben dem bestehenden Dialogverhalten.

### 5. Statuskommunikation

- Prüffragen:
  - Kommunizieren Statusflächen Zustand und Bedeutung auch ohne Farbe?
  - Sind Live-Status für Screenreader als Status modelliert?
  - Wird Degradation oder Blockierung textlich eingeordnet?
- Evidenz:
  - `StatusRail`
  - statusnahe Inhalte in `WorkspaceShell` und `SingleEinsatzLayout`
- Pass:
  - Statuskarten haben Beschriftung, optional Wert und Beschreibung.
  - Live-Status nutzt `role="status"` und eine sinnvolle Beschreibung.
  - Degradierte oder blockierte Zustände bleiben lesbar.
- Fail:
  - Statusmeldungen sind nur Badge oder Farbe ohne Text.
  - Ein Live-Status ist technisch ein falsches semantisches Element.
  - Warnungen oder Blocker sind visuell sichtbar, aber nicht vorgelesen oder beschrieben.

Die Review-Gates gelten auch für den unauthentifizierten Einstieg: Der Server-, System- und Versionskontext muss immer sichtbar sein, eigene Statusflächen dürfen keine neuen API- oder Redirect-Pfade einführen, sondern basieren auf den zentralen Hooks (`useServerListHealth`, `useSystemHealth`, `useSystemVersion`, `ServerSelector`, `UnifiedAuthForm`). Ein semantischer Ladehinweis erscheint frühestens nach 300 ms, begleitet von `aria-live="polite"`-Text und klaren Folgeaktionen wie `Erneut prüfen`, `Server wechseln` oder `Server verwalten`. Die Reihenfolge `Banner → Kontextflächen → Primäraktion` darf nicht in eine alternative Navigationswelt abgleiten.

Dasselbe Gate gilt für die bestätigte Startfläche nach dem Login: Die Reihenfolge `Orientierung → bestätigter Konto-/Rollen-/Berechtigungskontext → Primäraktion → Einsatzliste/-anlage` muss in Desktop und Web gleich bleiben. Pending- oder Fehlerzustände im Login- und Startflächenpfad müssen als `role="status"` bzw. `role="alert"` verständlich lesbar sein; nicht zulässige Folgeaktionen werden verborgen oder deaktiviert und textlich eingeordnet, statt erst in einem späteren Fehler zu scheitern.

Ab Story `1.5` gilt zusätzlich:

- `/app/einsaetze` bleibt die einzige bestätigte Auswahl- und Anlagefläche vor dem Arbeitsraum.
- Das Öffnen oder Anlegen eines Einsatzes führt immer in denselben kanonischen Arbeitsraum `/app/einsatz/$einsatzId`; Legacy-Detailpfade dürfen keine konkurrierende Primärnavigation bilden.
- Falls eine gültige Teilnahme fehlt, blockiert ein `AssignmentGate` den Arbeitsraum sichtbar und tastaturbedienbar, bis die Zuordnung abgeschlossen ist.
- Feldnahe Validierung, Fokusführung und verständliche Disabled-/Hinweistexte auf der Startfläche sind Freigabekriterien, keine nachgelagerte UX-Verbesserung.

### 6. Browser-, Zoom- und Responsive-Freigabe

- Prüffragen:
  - Bleibt Ring 2 bei `200 %` Zoom arbeitsfähig?
  - Trägt die Shell dieselbe Logik in `Chrome`, `Edge`, `Safari` und `Firefox ESR`?
  - Bleiben Kontext, Status und Handlungsfähigkeit über alle Breakpoints erhalten?
- Evidenz:
  - manuelle Matrix aus diesem Dokument
  - Responsive-Verhalten von `WorkspaceShell` und `ModuleRail`
  - bestehende Repo-Guardrails für Shell- und Contract-Verhalten
- Pass:
  - Zoom zerstört weder Kontext noch Navigation.
  - Browser-spezifische Abweichungen sind dokumentiert oder behoben.
  - Reduktion auf kleineren Flächen erhält Orientierung und Handlungsfähigkeit.
- Fail:
  - Bei `200 %` Zoom werden zentrale Aktionen abgeschnitten oder verdeckt.
  - Ein Browser verliert Fokus, Labels oder Overlay-Verhalten.
  - Mobile- oder Tablet-Darstellungen opfern Kontext oder Status ohne definierte Ersatzdarstellung.

## Mindest-Gates aus Story `1.2`

Die folgenden Review-Follow-ups aus Story `1.2` gelten ab sofort als nicht verhandelbare Mindest-Gates für Ring 2:

- Blockierende Overlays deaktivieren globale Quick-Create-Hotkeys.
- Modul-Hotkeys navigieren aus dem Workspace-Contract heraus wirklich.
- `StatusRail` kommuniziert Live-Status semantisch korrekt.
- `WorkspaceContextBar` erzeugt keine verschachtelten interaktiven Elemente.

Ein Review gilt als fehlgeschlagen, wenn einer dieser Punkte regressiert.

## Journey-Matrix

| Journey | Kanonische Anker | Verbindliche Review-Schritte | Mindestevidenz |
| --- | --- | --- | --- |
| `arbeitsfähig werden` | `SingleEinsatzLayout`, `WorkspaceContextBar`, Beitrittsdialog | Einstieg ohne Maus prüfen, Kontext lesen, Arbeitszugriff über Beitritt oder Personenauswahl verstehen, Overlay schließen, Fokus-Rückgabe kontrollieren | Keyboard-only-Durchlauf, verständlicher Kontext, Fokus-Rückgabe |
| `Überblick unter Stress` | `WorkspaceShell`, `ModuleRail`, `BrowserSecurityBanner` | Modulwechsel, sichtbare Shortcut-Hilfe und aktive Orientierung prüfen | sichtbare aktive Navigation, sichtbare Shortcut-Hinweise, Browser-Hinweis falls relevant |
| `ETB oder Befehle unterbrechen und fortführen` | `ModuleRail`, Modulübersicht, Command Palette, blockierende Dialoge im `SingleEinsatzLayout` | Overlay öffnen, Hotkeys blockieren, Overlay schließen, Rückkehr in denselben Kontext prüfen | Hotkey-Blocking, Fokus-Rückgabe, keine zweite Navigationslogik |
| `Rückkehr in den Kontext ohne Verlust` | `WorkspaceContextBar`, `ModuleRail`, `SingleEinsatzLayout` | Nach Dialog, Overlay oder kleinerer Darstellung prüfen, ob Einsatzkontext und aktives Modul lesbar erhalten bleiben | gleicher Kontext, aktives Modul markiert, Kontext weiter verständlich |

## Responsive-Erwartungen

| Größenklasse | Erwartete Shell-/Navigationsform | Erlaubte Reduktion | Fail, wenn ... |
| --- | --- | --- | --- |
| `Mobile < 640px` | aktives Modul sichtbar, Modulübersicht über Overlay, Command Trigger erreichbar, Kontext und Status bleiben lesbar | direkte Rail darf auf aktive Auswahl plus Overlay reduziert sein | Navigation verschwindet ganz oder Kontext ist nur nach Scroll-/Sonderweg verständlich |
| `640-1023px` | kompakte Rail mit priorisierten Modulen plus Modulübersicht | nur die Menge sichtbarer Direktlinks darf reduziert sein | zusätzliche Navigation neben dem Contract entsteht |
| `>= 1024px` | Desktop ist Referenz: Shell vollständig nutzbar, Kontext und Status parallel lesbar | keine funktionale Reduktion | Kernaktionen oder Status nur in einer sekundären Ansicht erreichbar sind |
| `>= 1536px` | Wide Desktop zeigt die volle Navigation ohne inhaltliche Verdichtung zu erzwingen | keine | Information oder Status trotz Platzverlust weiter versteckt bleiben |

Zusätzliche Pflichtregel für kleinere Breakpoints:

- Touch Targets müssen ausreichend groß bleiben.
- Orientierung darf nicht davon abhängen, dass eine Person Hover oder Präzisionszeiger nutzt.

## Browser-, Zoom- und Assistive-Tech-Matrix

### Verbindliche Browser-Checks

| Zielumgebung | Pflichtprüfungen |
| --- | --- |
| `Chrome` | Kern-Journeys, Keyboard-only, Overlays, `200 %` Zoom |
| `Edge` | Kern-Journeys, Keyboard-only, Overlays, `200 %` Zoom |
| `Safari` | Kern-Journeys, Keyboard-only, Overlays, `200 %` Zoom |
| `Firefox ESR` | Kern-Journeys, Keyboard-only, Overlays, `200 %` Zoom |

Review-Basis für die Matrix:

- `Chrome`: aktuelle stabile Hauptversion plus direkte Vorgängerversion
- `Edge`: aktuelle stabile Hauptversion plus direkte Vorgängerversion
- `Safari`: aktuelle stabile Hauptversion auf unterstützten macOS-Versionen plus direkte Vorgängerversion
- `Firefox ESR`: aktuelle ESR-Linie

Stand der Story `1.2a` vom `2026-03-16`:

- `Chrome 146`
- `Edge 146`
- `Safari 26.2` plus direkte Vorgängerversion `26.1`
- `Firefox 140.7 ESR`

### Verbindliche Assistive-Tech-Pfade

| Assistive Tech | Pflichtprüfungen |
| --- | --- |
| `VoiceOver` auf macOS | Landmarken, Überschriften, Link-/Button-Namen, Live-Status, Fokus-Reihenfolge, Fokus-Rückgabe nach Overlays |
| `NVDA` auf Windows | Landmarken, Überschriften, Link-/Button-Namen, Live-Status, Fokus-Reihenfolge, Fokus-Rückgabe nach Overlays |

### Manueller Review-Ablauf

Für jede Zielumgebung ist mindestens einmal zu prüfen:

1. Journey `arbeitsfähig werden` komplett keyboard-only.
2. Journey `Überblick unter Stress` inklusive aktiver Navigation und Statuskommunikation.
3. Ein blockierendes Overlay öffnen, schließen und Fokus-Rückgabe prüfen.
4. `200 %` Zoom aktivieren und denselben Ablauf wiederholen.

## Automatisierungsgrenzen im Repo

### Heute automatisiert prüfbar

- automatisierte Accessibility-Checks über semantische Shell-, Landmarken-, Keyboard- und Status-Assertions im bestehenden `Vitest`-/`Testing Library`-Stack
- Shortcut-Verhalten und Input-Schutz in `ModuleRail`
- semantische Live-Status-Regeln in `StatusRail`
- semantische Back-Navigation ohne verschachtelte Interaktionen in `WorkspaceContextBar`
- Overlay-Blocking als Utility-Guardrail im `SingleEinsatzLayout`-Umfeld
- responsive Shell-Hilfsbereiche und `routeTarget`-/`visibility`-Contracts in `WorkspaceShell`, Registry und `ModuleOverviewCard`

### Weiterhin manuell zu führen

- echte Cross-Browser-Ausführung
- `200 %` Zoom in realen Browsern
- `VoiceOver`- und `NVDA`-Durchläufe
- Breakpoint-Verhalten im realen Layout, sobald reine DOM-Contracts nicht ausreichen
- visuelle Prüfung von Touch-Target-Größe und Fokusdarstellung

## Definition of Done für Ring-2-Reviews

Ein Ring-2-Review ist erst abgeschlossen, wenn:

- alle relevanten universellen Gates bestanden wurden
- die passende Journey-Matrix durchlaufen wurde
- die automatisierten Repo-Checks grün sind
- die manuellen Browser-, Zoom- und Assistive-Tech-Pfade dokumentiert wurden
- bekannte Abweichungen ausdrücklich als Follow-up erfasst wurden

Verbindliche Abschluss-Kommandos:

```bash
pnpm --filter @bluelight-hub/frontend exec vitest src/features/workspace/ui/__tests__/ModuleRail.spec.tsx src/features/workspace/ui/__tests__/WorkspaceShell.contract.spec.tsx src/shared/ui/organisms/workspace/__tests__/StatusRail.spec.tsx src/shared/ui/organisms/workspace/__tests__/WorkspaceContextBar.spec.tsx src/shared/ui/templates/__tests__/single-einsatz-layout.utils.spec.ts
pnpm --filter @bluelight-hub/frontend exec tsc --noEmit
pnpm --filter @bluelight-hub/frontend lint:check
```

## Repo-Grenzen dieser Story

Diese Story zieht bewusst keine stillen Scope-Sprünge ein:

- keine Backend- oder OpenAPI-Arbeit
- kein `pnpm run generate-api`
- keine neue `Playwright`-, `Cypress`-, `axe-core`- oder andere Accessibility-Toolchain ohne explizite Folgeentscheidung
- keine zweite Shell-, Shortcut- oder Status-Namenswelt neben dem Workspace-Contract

Wenn zusätzliche Automatisierung gewünscht ist, braucht sie eine eigene Architektur- oder Folgestory-Entscheidung.
