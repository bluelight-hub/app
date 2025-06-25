# Admin Authentication - Quick Start Guide

Schnelleinstieg für Entwickler und Administratoren zur Verwendung des Admin Authentication Systems.

## 🚀 Schnellstart für Entwickler

### 1. Lokale Umgebung einrichten

```bash
# Repository klonen und Abhängigkeiten installieren
git clone <repository-url>
cd bluelight-hub
pnpm install

# Umgebungsvariablen konfigurieren
cp .env.example .env

# Datenbank initialisieren
npm run db:migrate
npm run db:seed

# Admin-Benutzer erstellen
npm run cli -- seed:admin --password="admin123"
```

### 2. Entwicklungsserver starten

```bash
# Backend starten (Port 3001)
pnpm --filter @bluelight-hub/backend dev

# Frontend starten (Port 3000)
pnpm --filter @bluelight-hub/frontend dev
```

### 3. Erste Anmeldung

1. Öffne http://localhost:3000
2. Klicke auf "Admin" in der Navigation
3. **Development**: Nutze die Mock-Login Buttons
   - "Login als SUPER_ADMIN"
   - "Login als ADMIN"
   - "Login als SUPPORT"
4. **Production**: Verwende die erstellten Credentials

## 🔐 Rollen-Übersicht

| Rolle         | Admin Panel    | Benutzer           | Einstellungen      | Audit Logs | ETB                | Einsätze           |
| ------------- | -------------- | ------------------ | ------------------ | ---------- | ------------------ | ------------------ |
| `SUPER_ADMIN` | ✅ Vollzugriff | ✅ Alle            | ✅ Alle            | ✅ Lesen   | ✅ Alle            | ✅ Alle            |
| `ADMIN`       | ✅ Verwaltung  | ✅ Lesen/Schreiben | ✅ Lesen/Schreiben | ✅ Lesen   | ✅ Lesen/Schreiben | ✅ Lesen/Schreiben |
| `SUPPORT`     | ✅ Lesezugriff | ✅ Lesen           | ❌                 | ✅ Lesen   | ✅ Lesen           | ✅ Lesen           |
| `USER`        | ❌             | ❌                 | ❌                 | ❌         | ✅ Lesen           | ✅ Lesen           |

## 🛠️ API-Endpoints

### Authentifizierung

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Response
{
  "data": {
    "user": {
      "id": "cm0...",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Geschützte Endpunkte

```bash
# Mit Token authentifizieren
export TOKEN="eyJ..."

# Benutzer auflisten (USERS_READ erforderlich)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/users

# Systemeinstellungen (SYSTEM_SETTINGS_READ erforderlich)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/settings

# Audit Logs (AUDIT_LOG_READ erforderlich)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/audit-logs
```

## 🧑‍💻 Frontend-Integration

### AuthContext verwenden

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, hasRole, hasPermission, logout } = useAuth();

  // Rollen-Check
  if (hasRole('ADMIN')) {
    return <AdminFeature />;
  }

  // Berechtigungs-Check
  return (
    <div>
      {hasPermission('USERS_READ') && <UserList />}
      {hasPermission('USERS_WRITE') && <CreateUser />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Route-Schutz

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/*" element={
          <ProtectedRoute requireAdmin>
            <AdminPanel />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute permission="USERS_READ">
            <UserManagement />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
```

## 🔧 Backend-Integration

### Controller schützen

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@/modules/auth/decorators/permissions.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get()
  @RequirePermissions('USERS_READ')
  async findAll() {
    // Nur mit USERS_READ Berechtigung
  }

  @Post()
  @RequirePermissions('USERS_WRITE')
  async create() {
    // Nur mit USERS_WRITE Berechtigung
  }
}
```

### Service-Layer

```typescript
import { Injectable } from '@nestjs/common';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';

@Injectable()
export class UserService {
  async getCurrentUser(@GetUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
```

## 🎯 Staging-Umgebung

### Deployment

```bash
# Build für Staging
NODE_ENV=staging pnpm build

# Umgebungsvariablen für Staging
export JWT_SECRET="staging-secret-key"
export DATABASE_URL="postgresql://..."

# Admin-Benutzer für Staging erstellen
npm run cli -- seed:admin \
  --email="admin@staging.bluelight-hub.com" \
  --password="secure-staging-password" \
  --role="SUPER_ADMIN"
```

### Staging-URLs

- **Frontend**: https://staging.bluelight-hub.com
- **API**: https://staging-api.bluelight-hub.com
- **API Docs**: https://staging-api.bluelight-hub.com/api-docs

## 🐛 Häufige Probleme

### Problem: "Unauthorized" bei API-Calls

**Lösung:**

```bash
# Token prüfen
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/me

# Neuen Token holen
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Cookie: refreshToken=..."
```

### Problem: Admin Panel nicht sichtbar

**Lösung:**

```typescript
// AuthContext prüfen
const { user, isAdmin } = useAuth();
console.log('User role:', user?.role);
console.log('Is admin:', isAdmin());

// Rolle muss SUPER_ADMIN, ADMIN oder SUPPORT sein
```

### Problem: Session läuft ab

**Lösung:**

```typescript
// Auto-Refresh implementieren
useEffect(() => {
  const interval = setInterval(
    async () => {
      try {
        await authService.refreshToken();
      } catch (error) {
        // Token abgelaufen, zur Login-Seite
        router.push('/login');
      }
    },
    14 * 60 * 1000,
  ); // Alle 14 Minuten

  return () => clearInterval(interval);
}, []);
```

## 📚 Weiterführende Docs

- **Architecture**: `docs/architecture/08-concepts.adoc` (Admin Auth Sektion)
- **ADRs**: `docs/architecture/adr/007-jwt-authentifizierung.adoc`
- **Developer Guide**: `docs/ADMIN_AUTH_DEVELOPER_GUIDE.md`
- **API Docs**: http://localhost:3001/api-docs (lokal)

## 🔗 Nützliche CLI-Befehle

```bash
# Admin-Benutzer erstellen
npm run cli -- seed:admin --help

# Benutzer-Info anzeigen
npm run cli -- auth:whoami --token="<jwt>"

# Aktive Sessions anzeigen
npm run cli -- auth:sessions --user-id="<id>"

# Berechtigungen prüfen
npm run cli -- auth:permissions --user-id="<id>"

# Datenbank zurücksetzen
npm run db:reset && npm run db:seed
npm run cli -- seed:admin --password="newpassword"
```

## ⚡ Performance-Tipps

1. **Token Caching**: Speichere Access Token im Memory, Refresh Token in HttpOnly Cookies
2. **Permission Caching**: Cache Berechtigungen im AuthContext für bessere Performance
3. **Lazy Loading**: Lade Admin-Komponenten nur bei Bedarf
4. **API Batching**: Kombiniere mehrere API-Calls wenn möglich

## 🔒 Sicherheits-Checkliste

- [ ] JWT_SECRET ist mindestens 32 Zeichen lang
- [ ] HTTPS ist in Production aktiviert
- [ ] Cookies haben secure und httpOnly flags
- [ ] CORS ist korrekt konfiguriert
- [ ] Rate Limiting ist aktiviert
- [ ] Account Lockout ist konfiguriert
- [ ] Security Headers sind gesetzt (CSP, HSTS, etc.)
- [ ] Admin-Passwörter sind stark (>12 Zeichen)
- [ ] Staging und Production verwenden verschiedene Secrets
