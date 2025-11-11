# Authentication

## JWT Cookie-basierte Authentifizierung

**Mechanismus:**
- **Access Token**: HTTP-Only Cookie (`accessToken`), Short-lived
- **Refresh Token**: HTTP-Only Cookie (`refreshToken`), Long-lived
- **Admin Token**: HTTP-Only Cookie (`adminToken`), für Admin-Rechte

**Cookie Settings:**
- **httpOnly**: `true` (XSS-Schutz)
- **secure**: `true` (nur in Production, HTTPS)
- **sameSite**: `strict` (CSRF-Schutz)

**Guards:**
- `@UseGuards(JwtAuthGuard)`: Validiert Access Token aus Cookie
- `@UseGuards(AdminJwtAuthGuard)`: Validiert Admin Token aus Cookie
- `@UseGuards(JwtRefreshGuard)`: Validiert Refresh Token aus Cookie

**Swagger Authorization:**
- `@ApiBearerAuth()`: Standard JWT Guard (nutzt `accessToken` Cookie)
- `@ApiBearerAuth('admin-jwt')`: Admin JWT Guard (nutzt `adminToken` Cookie)

---
