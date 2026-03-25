# Bluelight Hub – Shared (OpenAPI TypeScript Client)

## Überblick

- Enthält den generierten TypeScript-Fetch-Client aus der Backend-Swagger-Definition
- Dient als einzige Quelle für API-Aufrufe im Frontend (keine handgeschriebenen Helpers)

## Wichtig

- Dateien unter `client/` werden automatisch generiert. Nicht manuell bearbeiten.
- Änderungen am Backend-Schema/Swagger erfordern eine Regeneration.

## API-Client generieren

1. Backend lokal starten
2. Standardmäßig wird die Alpha-Spec von `https://localhost:3091/api/alpha-json` geladen
3. Für lokale HTTP-Setups ohne TLS die Basis-URL überschreiben:

```bash
BLUELIGHT_OPENAPI_BASE_URL=http://localhost:3091 pnpm --filter @bluelight-hub/shared generate-api
```

4. Ausführen: `pnpm --filter @bluelight-hub/shared generate-api`
5. Linter formatiert den Output automatisch

Versionierte Specs:

- Alpha UI: `https://localhost:3091/api` oder `https://localhost:3091/api/alpha`
- Alpha JSON: `https://localhost:3091/api/alpha-json` (`/api-json` bleibt als Alias verfügbar)
- v1 UI: `https://localhost:3091/api/v1`
- v1 JSON: `https://localhost:3091/api/v1-json`

## Build/CI

- Build: `pnpm --filter @bluelight-hub/shared build`
- CI nutzt `build:ci` und überspringt die Regeneration (Client sollte vorab generiert sein)

## Verwendung im Frontend

- Import über das Paket: `@bluelight-hub/shared`
- Beispiel:
  ```ts
  import { api } from '@/api';
  const res = await api.einsatz().einsatzControllerFindAllVAlpha({ page: 1, limit: 20 });
  ```

## Troubleshooting

- Falsche Typen/Signaturen: prüfen, ob Backend läuft und Client aktuell ist (Regeneration durchführen)
