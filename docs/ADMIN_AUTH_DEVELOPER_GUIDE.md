# Admin Authentication System - Developer Guide

Dieser Guide erklärt die Implementierung und Verwendung des Admin Authentication Systems im Bluelight-Hub.

## Übersicht

Das Admin Authentication System implementiert eine rollenbasierte Zugriffskontrolle (RBAC) mit JWT-Token für die Verwaltung administrativer Funktionen. Das System wurde ohne Multi-Faktor-Authentifizierung (MFA) implementiert, um schnellen Zugriff in Notfallsituationen zu gewährleisten.

## Architektur-Referenzen

- **ADR-007**: JWT-Authentifizierung Entscheidung
- **ADR-010**: MFA-Entfernung Entscheidung
- **ADR-011**: Rollenbasiertes Admin-System
- **Architecture Docs**: `docs/architecture/08-concepts.adoc` (Admin-Authentifizierung Sektion)

## Rollen und Berechtigungen

### Verfügbare Rollen

| Rolle         | Beschreibung                                | Anwendungsfall          |
| ------------- | ------------------------------------------- | ----------------------- |
| `SUPER_ADMIN` | Vollständiger Systemzugriff                 | Systemadministratoren   |
| `ADMIN`       | Administrative Rechte ohne Rollenverwaltung | Tägliche Administration |
| `SUPPORT`     | Hauptsächlich Lesezugriff                   | Support-Personal        |
| `USER`        | Basiszugriff auf ETB/Einsatz                | Operative Nutzer        |

### Berechtigungen-Matrix

#### Benutzerverwaltung

- `USERS_READ`: Benutzerdaten anzeigen (SUPER_ADMIN, ADMIN, SUPPORT)
- `USERS_WRITE`: Benutzer erstellen/bearbeiten (SUPER_ADMIN, ADMIN)
- `USERS_DELETE`: Benutzer löschen (SUPER_ADMIN, ADMIN)

#### Systemeinstellungen

- `SYSTEM_SETTINGS_READ`: Einstellungen anzeigen (SUPER_ADMIN, ADMIN)
- `SYSTEM_SETTINGS_WRITE`: Einstellungen ändern (SUPER_ADMIN, ADMIN)
- `AUDIT_LOG_READ`: Audit-Logs anzeigen (SUPER_ADMIN, ADMIN, SUPPORT)
- `ROLE_MANAGE`: Rollen verwalten (nur SUPER_ADMIN)

#### Anwendung

- `ETB_READ`: ETB-Einträge anzeigen (alle Rollen)
- `ETB_WRITE`: ETB-Einträge bearbeiten (SUPER_ADMIN, ADMIN)
- `ETB_DELETE`: ETB-Einträge löschen (nur SUPER_ADMIN)
- `EINSATZ_READ`: Einsätze anzeigen (alle Rollen)
- `EINSATZ_WRITE`: Einsätze bearbeiten (SUPER_ADMIN, ADMIN)
- `EINSATZ_DELETE`: Einsätze löschen (nur SUPER_ADMIN)

## Token-Management

### Token-Typen

1. **Access Token**

   - Lebensdauer: 15 Minuten
   - Enthält: Benutzer-ID, Rolle, Berechtigungen
   - Speicherung: HttpOnly Cookie + Authorization Header Fallback

2. **Refresh Token**
   - Lebensdauer: 7 Tage
   - Zweck: Erneuerung von Access Tokens
   - Speicherung: HttpOnly Cookie mit SameSite=Strict

### Cookie-Konfiguration

```typescript
const cookieOptions = {
  httpOnly: true,
  secure: true, // Nur HTTPS
  sameSite: 'strict', // CSRF-Schutz
  path: '/api', // Beschränkter Pfad
  maxAge: tokenExpiry,
};
```

## Backend-Integration

### Guards verwenden

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RequirePermissions } from '@/modules/auth/decorators/permissions.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  @Get()
  @RequirePermissions('USERS_READ')
  async getUsers() {
    // Nur mit USERS_READ Berechtigung zugänglich
  }

  @Post()
  @RequirePermissions('USERS_WRITE')
  async createUser() {
    // Nur mit USERS_WRITE Berechtigung zugänglich
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN') // Nur für SUPER_ADMIN
  async deleteUser() {
    // Nur SUPER_ADMIN kann Benutzer löschen
  }
}
```

### Benutzer-Informationen abrufen

```typescript
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';

@Get('profile')
async getProfile(@GetUser() user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  };
}
```

## Frontend-Integration

### AuthContext verwenden

```typescript
import { useAuth } from '@/contexts/AuthContext';

function AdminPanel() {
  const { user, hasRole, hasPermission, isAdmin } = useAuth();

  if (!isAdmin()) {
    return <Redirect to="/unauthorized" />;
  }

  return (
    <div>
      {hasPermission('USERS_WRITE') && (
        <CreateUserButton />
      )}

      {hasRole('SUPER_ADMIN') && (
        <DeleteUserButton />
      )}
    </div>
  );
}
```

### Bedingte Darstellung

```typescript
import { PermissionGate } from '@/components/PermissionGate';

function UserManagement() {
  return (
    <div>
      <PermissionGate permission="USERS_READ">
        <UserList />
      </PermissionGate>

      <PermissionGate permission="USERS_WRITE">
        <CreateUserForm />
      </PermissionGate>

      <PermissionGate role="SUPER_ADMIN">
        <DangerZone />
      </PermissionGate>
    </div>
  );
}
```

## API-Endpunkte

### Authentifizierung

```bash
# Login
POST /api/auth/login
Content-Type: application/json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}

# Response: 200 OK
{
  "data": {
    "user": {
      "id": "user123",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  },
  "meta": {
    "timestamp": "2025-01-03T10:00:00Z"
  }
}

# Token erneuern
POST /api/auth/refresh
# Cookies werden automatisch gesendet

# Logout
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Geschützte Endpunkte

```bash
# Benutzer abrufen (USERS_READ erforderlich)
GET /api/admin/users
Authorization: Bearer <access_token>

# Benutzer erstellen (USERS_WRITE erforderlich)
POST /api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

# Systemeinstellungen (SYSTEM_SETTINGS_READ erforderlich)
GET /api/admin/settings
Authorization: Bearer <access_token>
```

## Lokale Entwicklung

### Admin-Benutzer erstellen

```bash
# Datenbank seeden mit Admin-Benutzer
npm run cli -- seed:admin --password="dev-password"

# Oder mit spezifischer Rolle
npm run cli -- seed:admin --role=SUPER_ADMIN --email="admin@dev.local"
```

### Mock-Authentication (Development)

Die Login-Seite bietet in der Entwicklungsumgebung Mock-Buttons:

```typescript
// Entwicklungs-Mock Buttons (nur in dev-Mode sichtbar)
<button onClick={() => mockLogin('SUPER_ADMIN')}>
  Login als SUPER_ADMIN
</button>
<button onClick={() => mockLogin('ADMIN')}>
  Login als ADMIN
</button>
<button onClick={() => mockLogin('SUPPORT')}>
  Login als SUPPORT
</button>
```

### Umgebungsvariablen

```env
# JWT Konfiguration
JWT_SECRET=your-super-secure-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Konfiguration
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
```

## Sicherheitsfeatures

### Account-Lockout

- Nach 5 fehlgeschlagenen Login-Versuchen
- Sperrung für 15 Minuten
- Admin-Override für Entsperrung verfügbar

### Security Headers

```typescript
// Automatisch via Helmet.js konfiguriert
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

### Session-Tracking

- Alle aktiven Sessions werden in der Datenbank verfolgt
- Admins können Sessions anderer Benutzer beenden
- Automatische Bereinigung abgelaufener Sessions

## Testing

### Backend Tests

```typescript
describe('AuthController', () => {
  it('should authenticate admin user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body.data.user.role).toBe('ADMIN');
  });

  it('should require USERS_READ permission', async () => {
    const token = await getTokenForRole('SUPPORT');

    await request(app).get('/admin/users').set('Authorization', `Bearer ${token}`).expect(200); // SUPPORT hat USERS_READ
  });
});
```

### Frontend Tests

```typescript
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';

test('shows admin panel for admin users', () => {
  const mockUser = { role: 'ADMIN', permissions: ['USERS_READ'] };

  render(
    <AuthProvider value={{ user: mockUser, isAdmin: () => true }}>
      <AdminPanel />
    </AuthProvider>
  );

  expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
});
```

## Troubleshooting

### Häufige Probleme

1. **Token wird nicht gesetzt**

   - Prüfen ob HTTPS aktiviert ist (secure cookies)
   - Domain-Konfiguration für SameSite überprüfen

2. **Berechtigung verweigert**

   - JWT-Payload auf enthaltene Berechtigungen prüfen
   - Datenbank-Seeding überprüfen

3. **Session abgelaufen**
   - Refresh-Token Mechanismus testen
   - Token-Rotation prüfen

### Debug-Befehle

```bash
# Aktuellen Benutzer prüfen
npm run cli -- auth:whoami --token="<jwt_token>"

# Berechtigungen auflisten
npm run cli -- auth:permissions --user-id="<user_id>"

# Session-Status prüfen
npm run cli -- auth:sessions --user-id="<user_id>"
```

## API-Dokumentation

Die vollständige API-Dokumentation ist über Swagger verfügbar:

- **Development**: http://localhost:3001/api-docs
- **Staging**: https://staging-api.bluelight-hub.com/api-docs

Swagger dokumentiert automatisch alle Auth-Endpunkte mit erforderlichen Berechtigungen und Beispiel-Payloads.

## Weiterführende Dokumentation

- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [NIST RBAC Model](https://csrc.nist.gov/projects/role-based-access-control)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
