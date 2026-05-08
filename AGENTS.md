# AGENTS.md - Bluelight Hub

Diese Datei enthält die wichtigsten, praxisnahen Regeln für Coding-Agents in diesem Repository.

## Kommunikation

- Antworte auf Deutsch.
- Code bleibt Englisch.
- Kommentare/JSDoc können Deutsch sein (wie im bestehenden Code).
- WICHTIG In allen Texten (insbesondere Dokumentation) müssen echte Umlaute verwendet werden: `ä`, `ö`, `ü` (bzw. `Ä`,
  `Ö`, `Ü`) statt `ae`, `oe`, `ue`.

## Projektüberblick

Bluelight Hub ist ein Monorepo mit Web- und Desktop-App:

- `packages/frontend`: React + Vite + Tauri
- `packages/backend`: NestJS + Prisma + PostgreSQL
- `packages/shared`: generierter API-Client und Shared Types

Wichtig:

- `packages/shared/client` ist generiert und wird **nicht** manuell editiert.

## Verbindliche Entwicklungsregeln

### Boyscout Rule

- Hier gilt die Boyscout Rule: Wenn du im Zuge einer Aufgabe klar abgegrenzten, naheliegenden Müll findest, räume ihn mit
  auf, auch wenn du ihn nicht verursacht hast.
- Das Aufräumen bleibt scoped: keine großen Nebenrefactorings, keine unrequested Architektur-Umbauten und keine Änderungen
  an generierten Dateien außerhalb des vorgesehenen Generierungs-Workflows.
- Wenn das Aufräumen riskant, umfangreich oder fachlich mehrdeutig ist, dokumentiere es als Follow-up statt es heimlich
  mitzuziehen.

### API-Workflow (immer so)

1. Backend Endpoint erstellen/ändern.
2. API-Client neu generieren: `pnpm run generate-api`.
3. Im Frontend über TanStack Query Hook nutzen.
4. Erst dann in Komponenten verwenden.

Nicht erlaubt:

- Manuelle `fetch()`-Aufrufe für reguläre API-Integration.
- Eigene parallele API-Helper, die den generierten Client umgehen.

### Frontend Stack Guardrails

- UI: Tailwind CSS + Headless UI
- Forms: `@tanstack/react-form` + Zod
- State: `@tanstack/react-query` (Server), `@tanstack/react-store` (Client)
- Lint/Format: OXC (oxlint + oxfmt)
- Im Produkt keine Komponenten oder Texte anzeigen, die Implementierungsdetails, technische Entscheidungen oder interne
  Architektur erklären. Solche Inhalte gehören in Dokumentation, nicht in die produktive UI.

### UI/UX-Arbeitsmodus

Bei jeder Frontend-, UI- oder UX-Aufgabe vor der Implementierung:

1. `docs/project-documentation/10-ui-ux-design-system.md` lesen.
2. `docs/frontend/00-design-system-overview.md` und bei Bedarf `docs/frontend/ui-ux-state-current.md` lesen.
3. Ähnliche bestehende Flächen und Komponenten in `packages/frontend/src/shared/ui/` und dem betroffenen Feature suchen.
4. Bestehende Tokens, `shared/ui`-Komponenten, Shell-Verträge und Statusmuster wiederverwenden, statt neue lokale
   Primitive, Farben, Layout-Shells oder API-Helfer zu erfinden.

Für produktive UI gilt zusätzlich:

- Bluelight Hub ist eine operative Arbeitsumgebung: dichte, scanbare, ruhige Oberflächen statt Marketing-Ästhetik.
- Status, Warnungen und Alarme nie nur über Farbe ausdrücken, sondern immer mit Text, Icon oder Zähler kombinieren.
- Loading-, Empty-, Error-, Offline-, Readonly- und Konfliktzustände bewusst gestalten.
- Nach sichtbaren UI-Änderungen nach Möglichkeit lokal im Browser prüfen, inklusive Desktop- und Mobile-Viewport.

Der verfügbare Agent-Kontext ist knapp. Bei größeren oder unklaren UI-/UX-Aufgaben:

- Doku und Code gezielt lesen, lange Dateien nur ausschnittsweise öffnen und Ergebnisse knapp zusammenfassen.
- Für klar getrennte Recherche- oder Review-Fragen dürfen Subagents parallel eingesetzt werden, z. B. für bestehende
  Komponenten, ähnliche Feature-Flächen, Accessibility-Risiken oder visuelle Review-Kriterien.
- Subagents bleiben read-only, solange die Hauptaufgabe keine ausdrücklich delegierte Implementierung verlangt.

### Backend DI-Regel

Bei `@Injectable()` Klassen **kein** `import type` verwenden, sondern normales `import`.

Beispiel:

```ts
import { MyService } from './my.service'; // korrekt
```

### Controller Response Decorators

In Backend-Controllern die projektspezifischen Wrapper-Decorators nutzen (z. B. `@ApiWrappedResponse`,
`@ApiWrappedCreatedResponse`) und keine Standard-`@ApiOkResponse`-Muster, wenn diese den Client-Generator brechen.

## Architekturgrenzen (Backend)

Layer-Reihenfolge:

`modules -> infrastructure -> application -> domain`

Regel:

- Abhängigkeiten fließen nur nach innen.
- Domain bleibt framework-agnostisch.

## Wichtige Commands

```bash
# Development
pnpm -r dev
pnpm --filter @bluelight-hub/frontend dev:vite
pnpm run generate-api

# Database
pnpm --filter @bluelight-hub/backend prisma:migrate --name <migration_name>

# Tests / Quality
pnpm --filter @bluelight-hub/backend test
pnpm lint
pnpm --filter @bluelight-hub/backend check:arch
pnpm --filter @bluelight-hub/backend check:di:imports
```

## Testing und Definition of Done

- Zunächst gezielte Tests für die konkret geänderte Funktion ausführen.
- Vor Abschluss die relevante Suite vollständig laufen lassen.
- Ergebnis transparent berichten (inkl. Anzahl bestandener Tests).
- Keine Fertigmeldung mit rot/instabilen Tests.

## Dokumentationspflicht

Bei Architektur- oder Verhaltensänderungen:

- `docs/adr/` aktualisieren oder neue ADR anlegen.
- betroffene technische Doku in `docs/` mitziehen.

## Commit-Hygiene

- Kein `--no-verify`.
- Nur relevante Dateien committen.
- Keine generierten Artefakte manuell anpassen, wenn sie per Command erzeugt werden.
