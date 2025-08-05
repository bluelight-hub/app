# BlueLight Hub

<!-- Coverage temporarily disabled -->
<!-- [![codecov](https://codecov.io/gh/bluelight-hub/app/graph/badge.svg?token=I5Z3C0FSLL)](https://codecov.io/gh/bluelight-hub/app) -->

[![GitHub Actions](https://github.com/bluelight-hub/app/actions/workflows/test.yml/badge.svg)](https://github.com/bluelight-hub/app/actions/workflows/test.yml)
[![doccov](https://backend-docs.bluelight-hub.rubeen.dev/images/coverage-badge-documentation.svg)](https://backend-docs.bluelight-hub.rubeen.dev)

## Übersicht

BlueLight Hub ist eine moderne Anwendung, die mit einer Monorepo-Struktur entwickelt wurde. Die Anwendung besteht aus einem Frontend (Vite/React mit Tauri-Integration) und einem Backend (
NestJS), die über ein gemeinsames Modul kommunizieren.

<!-- Coverage temporarily disabled -->
<!-- ## Charts

### Coverage

![Coverage](https://codecov.io/gh/bluelight-hub/app/graphs/sunburst.svg?token=I5Z3C0FSLL) -->

## Projektstruktur

```
bluelight-hub/
├── packages/
│   ├── frontend/     # Vite/React mit Tauri Integration
│   ├── backend/      # NestJS-Backend
│   └── shared/       # Gemeinsame Typen und Schnittstellen
├── docs/             # Projektdokumentation
└── ...
```

## Voraussetzungen

- Node.js (LTS Version)
- pnpm (v10.5.2 oder höher)
- Weitere Abhängigkeiten je nach Modul (siehe unten)

## Installation

1. Repository klonen:

   ```bash
   git clone https://github.com/bluelight-hub/app.git
   cd app
   ```

2. Abhängigkeiten installieren:

   ```bash
   pnpm install
   ```

3. Umgebungsvariablen konfigurieren:
   - Kopiere `.env.example` zu `.env` (falls vorhanden)
   - Passe die Konfiguration nach Bedarf an

## Entwicklung

Starte den Entwicklungsmodus für alle Pakete:

```bash
pnpm dev
```

Oder starte Pakete individuell:

```bash
# Nur Frontend
pnpm --filter @bluelight-hub/frontend dev

# Nur Backend
pnpm --filter @bluelight-hub/backend dev
```

## Authentication

Die Anwendung verwendet JWT-basierte Authentifizierung mit httpOnly-Cookies für erhöhte Sicherheit.

### Auth-Endpoints

- `POST /api/auth/login` - Benutzer-Login
  - Request: `{ username: string, password: string }`
  - Response: `{ user: UserResponseDto }`
- `POST /api/auth/register` - Benutzer-Registrierung
  - Request: `{ username: string, password: string, email: string }`
  - Response: `{ user: UserResponseDto }`
- `POST /api/auth/refresh` - Token-Refresh
  - Request: Keine (Refresh-Token wird aus Cookie gelesen)
  - Response: `{ success: true }`
- `POST /api/auth/admin/login` - Admin-Login
  - Request: `{ username: string, password: string }`
  - Response: `{ user: UserResponseDto }`

### Cookie-Handling

Alle Auth-Endpoints setzen JWT-Tokens als httpOnly-Cookies:

- **accessToken**: Kurzlebiger Access-Token (15 Minuten)
- **refreshToken**: Langlebiger Refresh-Token (7 Tage)

Cookie-Eigenschaften:

- `httpOnly: true` - Schutz vor XSS-Angriffen
- `sameSite: strict` - CSRF-Schutz
- `secure: true` - Nur über HTTPS (in Production)

### Frontend-Integration

```typescript
// Login-Beispiel
const response = await api.auth.login({
  username: 'user@example.com',
  password: 'password',
});
// Tokens werden automatisch als Cookies gesetzt
// Response enthält nur User-Daten: { user: { id, username, email, ... } }

// Authenticated Requests werden automatisch mit Cookies gesendet
const userData = await api.users.getCurrentUser();
```

## Tests

Führe Tests für alle Pakete aus:

```bash
pnpm test
```

Oder mit Coverage-Report:

```bash
pnpm test:cov
```

Führe Tests im UI-Modus aus (für Frontend):

```bash
pnpm test:ui
```

## Docker

Das Projekt unterstützt Docker für die Entwicklung und Bereitstellung:

```bash
# Starte mit Docker Compose
docker-compose up
```

## Lizenz

Dieses Projekt steht unter der Lizenz, die in [LICENSE.md](LICENSE.md) zu finden ist.
