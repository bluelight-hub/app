# E2E Test Setup

## Voraussetzungen

### Docker

Die E2E-Tests nutzen **Testcontainers** für automatisches PostgreSQL-Container-Management.

**Einzige Voraussetzung**: Docker muss installiert und laufend sein.

```bash
# Prüfe ob Docker läuft
docker --version
docker ps
```

### Automatische Datenbank-Verwaltung

Die Tests starten automatisch einen PostgreSQL-Container:

- Container wird beim Start der Tests erstellt
- Migrationen werden automatisch ausgeführt
- Container wird nach den Tests wieder entfernt
- Kein manuelles Setup erforderlich!

### Umgebungsvariablen

Die Test-Umgebung wird automatisch konfiguriert. Folgende Variablen werden von `test/setup.ts` gesetzt:

```env
NODE_ENV=test
JWT_SECRET=test-access-secret
JWT_REFRESH_SECRET=test-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
# DATABASE_URL wird automatisch von Testcontainers gesetzt
```

## Tests ausführen

### Alle E2E-Tests

```bash
pnpm test:e2e
```

### E2E-Tests im Watch-Modus

```bash
pnpm test:e2e:watch
```

### E2E-Tests mit Coverage

```bash
pnpm test:e2e:cov
```

### Einzelne Test-Datei

```bash
pnpm test:e2e -- auth/register.e2e-spec.ts
```

## Test-Struktur

```
test/
├── auth/                    # Auth-bezogene E2E-Tests
│   └── register.e2e-spec.ts
├── utils/                   # Test-Utilities
│   ├── test-app.factory.ts  # NestJS App Factory
│   ├── test-auth.utils.ts   # Auth Helpers
│   └── test-db.utils.ts     # Database Utilities
├── app.e2e-spec.ts         # Basis App Tests
├── jest-e2e.json           # Jest Konfiguration
├── README.md               # Diese Datei
└── setup.ts                # Globales Test-Setup
```

## Best Practices

1. **Datenbank-Cleanup**: Jeder Test sollte mit einer sauberen Datenbank starten
2. **Isolation**: Tests sollten unabhängig voneinander laufen können
3. **Authentifizierung**: Nutze `TestAuthUtils` für Auth-bezogene Tests
4. **Timeouts**: E2E-Tests haben ein Standard-Timeout von 30 Sekunden

## Troubleshooting

### "Cannot connect to Docker"

- Stelle sicher, dass Docker läuft: `docker ps`
- Prüfe Docker-Berechtigungen (Linux: User muss in docker-Gruppe sein)

### "Container startup timeout"

- Erhöhe das Timeout in `test/setup.ts` (Standard: 60 Sekunden)
- Prüfe Docker-Ressourcen (CPU/Memory)

### "Migration failed"

- Prüfe ob alle Migrations-Dateien vorhanden sind
- Logs zeigen Details zum Fehler

### Testcontainers Debug-Modus

Für detaillierte Logs:

```bash
DEBUG=testcontainers* pnpm test:e2e
```
