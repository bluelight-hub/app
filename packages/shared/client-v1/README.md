# client-v1 (Generiert)

Dieser Ordner wird automatisch durch `pnpm --filter @bluelight-hub/shared generate-api:v1` generiert und enthält den stabilen v1 API-Client.

**Voraussetzung:** Backend muss laufen (`pnpm -r dev`). Standardmäßig wird die Spec von `https://localhost:3091/api/v1-json` geladen. Für lokale HTTP-Setups kann die Basis-URL überschrieben werden:

```bash
BLUELIGHT_OPENAPI_BASE_URL=http://localhost:3091 pnpm --filter @bluelight-hub/shared generate-api:v1
```

```bash
# Nur v1 Client generieren
pnpm --filter @bluelight-hub/shared generate-api:v1

# Beide Clients (Alpha + v1)
pnpm --filter @bluelight-hub/shared generate-api:all
```

**Hinweis:** Dateien in diesem Ordner NICHT manuell bearbeiten!
