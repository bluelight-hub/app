# Projektübersicht

Dieses Feature vereinheitlicht die Authentifizierung der BlueLight Hub App durch ein kombiniertes Login/Register-Formular. Statt zwischen separaten Login- und Registrierungs-Formularen zu wechseln, wird ein einziges, intelligentes Formular implementiert, das automatisch zwischen Login und Registrierung unterscheidet. Dies verbessert die User Experience erheblich und reduziert Verwirrung bei neuen und wiederkehrenden Benutzern.

Das System erkennt automatisch, ob ein Benutzername bereits existiert und führt entweder einen Login durch oder erstellt einen neuen Account. Dies eliminiert die Notwendigkeit für Benutzer, sich zu erinnern, ob sie bereits registriert sind.

# Kernfunktionen

## Vereinheitlichtes Auth-Formular

- Ein einziges Formular für Login und Registrierung
- Automatische Erkennung ob Benutzer existiert
- Nahtloser Übergang zwischen Login und Account-Erstellung
- Klare visuelle Rückmeldung über den Status (neuer Account vs. Login)

## Automatische Benutzeranlage

- Bei nicht existierendem Benutzernamen wird automatisch ein neuer Account erstellt
- Passwort-Validierung mit Stärke-Indikator für neue Accounts
- Optional: E-Mail-Eingabe für Account-Recovery
- Sichere Passwort-Hashing mit bcrypt

## Backend-Integration

- Kombinierter Auth-Endpoint für Login/Register
- Einheitliche Response-Struktur mit JWT-Token
- Unterscheidung im Response zwischen neuem Account und Login
- Migration bestehender separater Endpoints

# Benutzererfahrung

## Zielgruppen

- **Neue Benutzer**: Benötigen schnellen, unkomplizierten Zugang ohne Verwirrung
- **Wiederkehrende Benutzer**: Erwarten nahtlosen Login ohne zusätzliche Schritte
- **Administratoren**: Benötigen klare Übersicht über neue Registrierungen

## Hauptabläufe

- **Erster Besuch**: Benutzer gibt Username und Passwort ein → Account wird automatisch erstellt → Direkte Weiterleitung zur App
- **Wiederkehrender Besuch**: Benutzer gibt Credentials ein → Login erfolgt → Zugang zur App
- **Falsches Passwort**: Klare Fehlermeldung ohne Preisgabe ob Account existiert (Security)

## UI/UX-Konzept

- Mobile-first Design mit Tailwind CSS
- Headless UI Komponenten für Barrierefreiheit
- Loading-States während der Authentifizierung
- Erfolgs-Animation bei Account-Erstellung
- Toast-Notifications für Feedback

# Technische Architektur

## Systemkomponenten

- **Frontend**: React + Vite mit TanStack Form
  - AuthForm Komponente mit Tailwind Styling
  - Zod-Schema für Validierung
  - TanStack Query für API-Calls
  - Optimistische UI-Updates

- **Backend**: NestJS mit Prisma
  - Unified Auth Controller
  - Auth Service mit Login/Register-Logik
  - JWT-Token-Generation
  - Prisma User-Model Updates

- **Shared Package**: API-Client Generation
  - OpenAPI Schema für Auth-Endpoint
  - Generierte TypeScript-Types
  - Shared Validation Schemas

## Datenmodelle

- **User**: Erweitert um optionale E-Mail, createdAt timestamp
- **AuthResponse**: Unified Response mit token, isNewUser flag, user data
- **AuthRequest**: Username, password, optional email

## APIs und Integrationen

- POST /api/auth/unified - Kombinierter Login/Register Endpoint
- Deprecation von /api/auth/login und /api/auth/register
- JWT Token mit 24h Gültigkeit
- Optional: E-Mail-Service für Willkommens-Mails

## Infrastrukturanforderungen

- **Datenbank**: PostgreSQL mit User-Table Updates
- **Security**: Rate-Limiting für Auth-Endpoint
- **Monitoring**: Logging für neue Registrierungen
- **Cache**: Redis für Session-Management (optional)

# Entwicklungs-Roadmap

## MVP-Anforderungen (Phase 1)

- Unified Auth-Formular im Frontend
- Backend-Endpoint für kombinierte Auth
- Automatische Account-Erstellung
- JWT-Token-Generation
- Basic Error-Handling

## Erweiterte Funktionen (Phase 2)

- E-Mail-Verifikation für neue Accounts
- Passwort-Stärke-Indikator
- Remember-Me Funktionalität
- Social Login Integration vorbereiten

## Zukunftspläne (Phase 3)

- OAuth2/Social Login (Google, GitHub)
- Two-Factor Authentication
- Account-Recovery via E-Mail
- Admin-Dashboard für User-Management

# Logische Abhängigkeitskette

## Grundlegender Aufbau

1. Prisma Schema Update für User-Model
2. Backend Auth-Service Refactoring
3. Unified Auth-Controller erstellen

## Kernsystem

4. API-Client Generation aktualisieren
5. Frontend AuthForm Komponente
6. TanStack Query Integration
7. Auth-Context Updates

## Erweiterung

8. Error-Handling und Validierung
9. Tests für Auth-Flow
10. Migration bestehender User

# Risiken und Gegenmaßnahmen

## Technische Herausforderungen

- **Security-Risiko bei automatischer Account-Erstellung**: Username-Enumeration möglich
  _Mitigation_: Rate-Limiting, generische Fehlermeldungen, Captcha bei wiederholten Versuchen

- **Migration bestehender Auth-Flows**: Breaking Changes für aktuelle User
  _Mitigation_: Parallelbetrieb alter Endpoints während Übergangsphase

## Projektrisiken

- **User-Akzeptanz**: Verwirrung bei bestehendem User-Base
  _Mitigation_: Klare Kommunikation, In-App Onboarding

- **Performance bei Account-Checks**: Zusätzliche DB-Abfrage
  _Mitigation_: Optimierte Queries, Caching-Layer

# Anhang

## Technische Spezifikationen

- React 18.x mit Vite
- NestJS 10.x mit Prisma 5.x
- PostgreSQL 15+
- TanStack Query v5
- TanStack Form v0.x
- Tailwind CSS 3.x + Headless UI

## Architekturentscheidungen

- Unified Endpoint statt separater Login/Register für bessere UX
- JWT statt Sessions für Stateless-Architecture
- TanStack Form für Type-Safe Forms mit Zod-Validation
- Automatische API-Client-Generation für Type-Safety
