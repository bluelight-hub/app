# Bluelight Hub – Frontend (React + Vite + Tauri)

## Überblick

- React 19, Vite, Tauri Desktop-Shell
- UI: Tailwind CSS, Atomic Design (atoms/molecules/organisms)
- State/Form/Async: TanStack Query, TanStack Form (+ Zod), TanStack Store, TanStack Pacer
- API-Zugriff: ausschließlich über den generierten OpenAPI-Client aus `packages/shared/client`

## Schnellstart

- Voraussetzungen: pnpm, Node LTS, Tauri-Prereqs (Rust, OS-Toolchain)
- Installation im Monorepo: `pnpm install`
- Dev (App + Backend via Root-Skript): `pnpm dev` (empfohlen) oder nur Frontend:
  `pnpm --filter @bluelight-hub/frontend dev:vite`
- Build: `pnpm --filter @bluelight-hub/frontend build`

## Wichtige Skripte (package.json)

- `dev`: Tauri Dev (Vite + Tauri)
- `dev:vite`: nur Vite-Dev-Server
- `build`: TypeScript-Check und Vite-Build
- Lint: `pnpm --filter @bluelight-hub/frontend lint` | Check: `lint:check`

## Konventionen

- TypeScript strikt, 2-Spaces, Prettier über Biome
- React-Komponenten: PascalCase, Hooks/Kleinteile: camelCase
- Keine DIY-API-Helper; nutze `@/api` mit dem generierten Client aus `packages/shared/client`

## API-Client verwenden

- Beispiel: `import { api } from '@/api'` und dann `api.einsatz().einsatzControllerFindAllVAlpha({...})`
- Bei Änderungen im Backend-Swagger: Backend starten und im Repo-Root ausführen:
  `pnpm --filter @bluelight-hub/shared generate-api`

## Architekturhinweise

- Query Keys zentral in `src/queryKeys.ts`
- Fehlerbehandlung zentral in `src/utils/apiErrorHandler.ts` bzw. `src/utils/error-handler.ts`
- Authentifizierung: Cookie-basiert; Fetch-Wrapper `src/api/fetchWithRefresh.ts` handhabt 401/Refresh

## Tests

- Unit: Vitest (`pnpm --filter @bluelight-hub/frontend test`)
- Aktuell ist FE-Coverage deaktiviert (siehe Scripts)

## Troubleshooting

- „Client nicht aktuell“: API neu generieren (siehe oben)
- 401-Schleifen: Cookies prüfen, ggf. Backend/Frontend-Base-URL (`getBaseUrl`) anpassen
