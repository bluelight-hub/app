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
- Lint/Format: Biome
- Im Produkt keine Komponenten oder Texte anzeigen, die Implementierungsdetails, technische Entscheidungen oder interne
  Architektur erklären. Solche Inhalte gehören in Dokumentation, nicht in die produktive UI.

### Backend DI-Regel

Bei `@Injectable()` Klassen **kein** `import type` verwenden, sondern normales `import`.

Beispiel:

```ts
import {MyService} from './my.service'; // korrekt
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
