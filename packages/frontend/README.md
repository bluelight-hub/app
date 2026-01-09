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

## Deep Link Integration (Desktop)

Die Bluelight Hub Desktop-App unterstützt Deep Links für automatisches Server-Onboarding.

### URL Schema

```
bluelight://connect?url=<server-url>&invite=<invite-code>&expires=<iso-timestamp>
```

**Parameter:**
- `url` (required): Server Base URL (z.B. `https://api.example.de`)
- `invite` (required): 8-Zeichen Invite Code (z.B. `INV_abc12345`)
- `expires` (optional): ISO 8601 Timestamp für Client-Side Expiry Check

### Entwickler-Setup

**1. Dev-Mode Limitation (macOS):**
- Deep Links funktionieren **NICHT** in `pnpm dev` (Tauri dev mode)
- Grund: macOS erfordert vollständig gebündeltes .app für URL-Schema-Registrierung

**2. Testing auf macOS:**
```bash
# Build Release Bundle
pnpm --filter @bluelight-hub/frontend tauri build

# App öffnen
open target/release/bundle/macos/Bluelight\ Hub.app

# Deep Link testen
open "bluelight://connect?url=https://api.example.de&invite=INV_12345678"
```

**3. Testing auf Windows/Linux:**
- Deep Links funktionieren mit Dev-Mode UND Release-Build
- Single-Instance Plugin verhindert Multiple App-Instanzen

### Architecture

- **DeepLinkService**: Event-basierter Service (Singleton Pattern)
- **useDeepLinkEffect**: React Hook für App Lifecycle Integration
- **useExchangeInvite**: TanStack Query Mutation für API-Call
- **ServerStore**: Automatische Persistierung (Story 2.2)

Weitere Details: `src/features/server/DEEP_LINK_INTEGRATION.md`

## Troubleshooting

- „Client nicht aktuell": API neu generieren (siehe oben)
- 401-Schleifen: Cookies prüfen, ggf. Backend/Frontend-Base-URL (`getBaseUrl`) anpassen
- Deep Links funktionieren nicht: macOS benötigt Release-Build (siehe Deep Link Integration)
