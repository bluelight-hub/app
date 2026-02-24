# client-v1 (Generiert)

Dieser Ordner wird automatisch durch `pnpm generate-api:v1` generiert und enthaelt den stabilen v1 API-Client.

**Voraussetzung:** Backend muss laufen (`pnpm -r dev`), da die OpenAPI-Spec von `/api/v1-json` geladen wird.

```bash
# Nur v1 Client generieren
pnpm --filter @bluelight-hub/shared generate-api:v1

# Beide Clients (Alpha + v1)
pnpm --filter @bluelight-hub/shared generate-api:all
```

**Hinweis:** Dateien in diesem Ordner NICHT manuell bearbeiten!
