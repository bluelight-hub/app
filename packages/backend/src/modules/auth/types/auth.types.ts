import { UserRole } from './jwt.types';

/**
 * Authentifizierte Benutzerdaten-Struktur
 *
 * Enthält alle relevanten Informationen eines authentifizierten Benutzers,
 * einschließlich Identität, Rollen, Berechtigungen und Status.
 * Wird nach erfolgreicher Authentifizierung im Request-Kontext gespeichert.
 *
 * @interface AuthUser
 *
 * @example
 * ```typescript
 * const authUser: AuthUser = {
 *   id: 'user_abc123def456',
 *   email: 'admin@bluelight-hub.com',
 *   roles: [UserRole.ADMIN, UserRole.USER],
 *   permissions: ['user:read', 'user:write', 'admin:access'],
 *   organizationId: 'org_xyz789',
 *   isActive: true,
 *   lastLoginAt: new Date('2024-01-15T10:30:00Z'),
 *   createdAt: new Date('2023-01-01T00:00:00Z'),
 *   updatedAt: new Date('2024-01-15T10:30:00Z')
 * };
 * ```
 */
export interface AuthUser {
  /**
   * Eindeutige Benutzer-ID
   *
   * Primärschlüssel zur Identifikation des Benutzers im System
   *
   * @property {string} id - Benutzer-Identifier
   * @example "user_abc123def456"
   */
  id: string;

  /**
   * E-Mail-Adresse des Benutzers
   *
   * Wird für Login und Kommunikation verwendet
   *
   * @property {string} email - Benutzer E-Mail
   * @example "admin@bluelight-hub.com"
   */
  email: string;

  /**
   * Array der zugewiesenen Benutzerrollen
   *
   * Definiert die Basis-Berechtigungen des Benutzers
   *
   * @property {UserRole[]} roles - Benutzerrollen
   * @example ["ADMIN", "USER"]
   */
  roles: UserRole[];

  /**
   * Array der spezifischen Berechtigungen
   *
   * Granulare Berechtigungen für Zugriffskontrolle
   *
   * @property {string[]} permissions - Berechtigungen
   * @example ["user:read", "user:write", "admin:access"]
   */
  permissions: string[];

  /**
   * ID der zugehörigen Organisation
   *
   * Optional, wenn Benutzer keiner Organisation zugeordnet ist
   *
   * @property {string} [organizationId] - Organisations-ID
   * @example "org_xyz789"
   */
  organizationId?: string;

  /**
   * Aktiv-Status des Benutzerkontos
   *
   * Inaktive Benutzer können sich nicht anmelden
   *
   * @property {boolean} isActive - Aktivstatus
   * @example true
   */
  isActive: boolean;

  /**
   * Zeitpunkt des letzten erfolgreichen Logins
   *
   * Wird bei jedem erfolgreichen Login aktualisiert
   *
   * @property {Date} [lastLoginAt] - Letzter Login
   * @example "2024-01-15T10:30:00Z"
   */
  lastLoginAt?: Date;

  /**
   * Erstellungszeitpunkt des Benutzerkontos
   *
   * @property {Date} createdAt - Erstellungsdatum
   * @example "2023-01-01T00:00:00Z"
   */
  createdAt: Date;

  /**
   * Zeitpunkt der letzten Kontoaktualisierung
   *
   * @property {Date} updatedAt - Aktualisierungsdatum
   * @example "2024-01-15T10:30:00Z"
   */
  updatedAt: Date;
}

/**
 * Benutzersitzungsdaten für Session-Management
 *
 * Verfolgt aktive Sitzungen mit Refresh-Tokens und Metadaten
 * zur Sicherheitsüberwachung und Multi-Device-Support.
 *
 * @interface Session
 *
 * @example
 * ```typescript
 * const session: Session = {
 *   id: 'sess_1234567890abcdef',
 *   userId: 'user_abc123def456',
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   expiresAt: new Date('2024-01-16T10:30:00Z'),
 *   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
 *   ipAddress: '192.168.1.100',
 *   createdAt: new Date('2024-01-15T10:30:00Z'),
 *   lastActivityAt: new Date('2024-01-15T11:45:00Z')
 * };
 * ```
 */
export interface Session {
  /**
   * Eindeutige Session-ID
   *
   * @property {string} id - Session-Identifier
   * @example "sess_1234567890abcdef"
   */
  id: string;

  /**
   * ID des zugehörigen Benutzers
   *
   * @property {string} userId - Benutzer-ID
   * @example "user_abc123def456"
   */
  userId: string;

  /**
   * Refresh-Token für diese Session
   *
   * Wird für Token-Erneuerung verwendet
   *
   * @property {string} refreshToken - JWT Refresh-Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  refreshToken: string;

  /**
   * Ablaufzeitpunkt der Session
   *
   * Nach diesem Zeitpunkt ist die Session ungültig
   *
   * @property {Date} expiresAt - Ablaufdatum
   * @example "2024-01-16T10:30:00Z"
   */
  expiresAt: Date;

  /**
   * User-Agent des Clients
   *
   * Hilft bei der Identifikation des verwendeten Browsers/Geräts
   *
   * @property {string} [userAgent] - Browser User-Agent
   * @example "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   */
  userAgent?: string;

  /**
   * IP-Adresse des Clients
   *
   * Für Sicherheitsüberwachung und Geo-Lokalisierung
   *
   * @property {string} [ipAddress] - Client IP-Adresse
   * @example "192.168.1.100"
   */
  ipAddress?: string;

  /**
   * Erstellungszeitpunkt der Session
   *
   * @property {Date} createdAt - Session-Start
   * @example "2024-01-15T10:30:00Z"
   */
  createdAt: Date;

  /**
   * Zeitpunkt der letzten Aktivität
   *
   * Wird bei jeder API-Anfrage aktualisiert
   *
   * @property {Date} lastActivityAt - Letzte Aktivität
   * @example "2024-01-15T11:45:00Z"
   */
  lastActivityAt: Date;
}

/**
 * Login-Anfrage-Datenstruktur
 *
 * Enthält Benutzeranmeldedaten und optionale Einstellungen
 * für die Authentifizierung.
 *
 * @interface LoginRequest
 *
 * @example
 * ```typescript
 * const loginRequest: LoginRequest = {
 *   email: 'user@bluelight-hub.com',
 *   password: 'SecurePassword123!',
 *   rememberMe: true
 * };
 * ```
 */
export interface LoginRequest {
  /**
   * E-Mail-Adresse des Benutzers
   *
   * @property {string} email - Benutzer E-Mail
   * @example "user@bluelight-hub.com"
   */
  email: string;

  /**
   * Passwort des Benutzers
   *
   * @property {string} password - Benutzerpasswort
   * @example "SecurePassword123!"
   */
  password: string;

  /**
   * Option für verlängerte Session-Dauer
   *
   * Wenn true, bleibt die Session länger aktiv
   *
   * @property {boolean} [rememberMe=false] - Remember-Me Option
   * @default false
   * @example true
   */
  rememberMe?: boolean;
}

/**
 * Login-Antwort-Datenstruktur
 *
 * Enthält Authentifizierungs-Tokens und Benutzerdaten
 * nach erfolgreicher Anmeldung.
 *
 * @interface LoginResponse
 *
 * @example
 * ```typescript
 * const loginResponse: LoginResponse = {
 *   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   user: {
 *     id: 'user_123',
 *     email: 'user@example.com',
 *     roles: ['USER'],
 *     permissions: ['read:own_profile'],
 *     isActive: true,
 *     createdAt: new Date(),
 *     updatedAt: new Date()
 *   }
 * };
 * ```
 */
export interface LoginResponse {
  /**
   * JWT Access-Token für API-Zugriffe
   *
   * Kurze Lebensdauer, wird in Authorization Header verwendet
   *
   * @property {string} accessToken - JWT Access-Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  accessToken: string;

  /**
   * Refresh-Token für Token-Erneuerung
   *
   * Längere Lebensdauer, wird für Token-Refresh verwendet
   *
   * @property {string} refreshToken - JWT Refresh-Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  refreshToken: string;

  /**
   * Vollständige Benutzerdaten
   *
   * @property {AuthUser} user - Authentifizierter Benutzer
   */
  user: AuthUser;
}

/**
 * Token-Refresh-Anfrage-Daten
 *
 * Enthält den Refresh-Token zur Erneuerung
 * abgelaufener Access-Tokens.
 *
 * @interface RefreshTokenRequest
 *
 * @example
 * ```typescript
 * const refreshRequest: RefreshTokenRequest = {
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 * };
 * ```
 */
export interface RefreshTokenRequest {
  /**
   * Gültiger Refresh-Token
   *
   * Muss ein nicht abgelaufener, gültiger Refresh-Token sein
   *
   * @property {string} refreshToken - JWT Refresh-Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  refreshToken: string;
}

/**
 * Token-Antwort-Datenstruktur
 *
 * Enthält neue Access- und Refresh-Tokens
 * nach erfolgreicher Token-Erneuerung.
 *
 * @interface TokenResponse
 *
 * @example
 * ```typescript
 * const tokenResponse: TokenResponse = {
 *   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 * };
 * ```
 */
export interface TokenResponse {
  /**
   * Neuer JWT Access-Token
   *
   * Ersetzt den abgelaufenen Access-Token
   *
   * @property {string} accessToken - Neuer Access-Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  accessToken: string;

  /**
   * Neuer Refresh-Token
   *
   * Ersetzt den verwendeten Refresh-Token
   *
   * @property {string} refreshToken - Neuer Refresh-Token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  refreshToken: string;
}
