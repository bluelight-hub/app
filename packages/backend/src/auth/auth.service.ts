import { adminRoles, isAdmin } from '@/auth/utils/auth.utils';
import { PrismaService } from '@/prisma/prisma.service';
import { toNatDateTime } from '@/utils/date.util';
import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AdminSetupDto } from './dto/admin-setup.dto';
import type { AuthRequestDto } from './dto/auth-request.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { AuthUserDto, Role } from './dto/auth-user.dto';
import type { ValidatedUser } from './strategies/jwt.strategy';

/**
 * Service für Authentifizierungslogik
 *
 * Verwaltet Benutzerregistrierung und -anmeldung ohne Passwörter.
 * Der erste registrierte Benutzer wird automatisch zum SUPER_ADMIN.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Unified Auth - Kombiniert Login und automatische Registrierung
   *
   * Logik:
   * 1. Benutzer existiert + hat Passwort (Admin) → Passwort prüfen
   * 2. Benutzer existiert + kein Passwort (Normal) → Sofort einloggen
   * 3. Benutzer existiert nicht → Automatisch anlegen ohne Passwort
   *
   * @param dto - Auth Request mit Username und optionalem Passwort
   * @returns Auth Response mit Token und User-Info
   * @throws UnauthorizedException bei falschen Admin-Credentials
   */
  async unifiedAuth(dto: AuthRequestDto): Promise<AuthResponseDto & { accessToken: string; refreshToken: string }> {
    const user = await this.findUserByUsername(dto.username);

    // User existiert → Login durchführen
    if (user) {
      return this.loginExistingUser(user);
    }

    // User existiert nicht → Auto-Registrierung
    return this.autoRegisterUser(dto.username);
  }

  /**
   * Findet einen Benutzer anhand seiner ID
   * @param userId - Die ID des Benutzers
   * @returns Der gefundene Benutzer
   * @throws NotFoundException wenn der Benutzer nicht existiert
   */
  async findUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Benutzer nicht gefunden');
    return user;
  }

  /**
   * Erstellt ein neues access Token für einen Benutzer
   *
   * Das Token enthält die Benutzer-ID (sub), den Benutzernamen
   * und die Rolle des Benutzers. Es ist für kurze Zeit gültig
   * (standardmäßig 15 Minuten).
   *
   * @param user - Der Benutzer, für den das Token erstellt wird
   * @returns Das signierte JWT access Token mit Benutzer-ID, Benutzername und Rolle
   */
  signAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role, // Include a role in token payload
    };
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  /**
   * Erstellt ein neues Refreshtoken für einen Benutzer
   *
   * Das Token ist länger gültig als das access Token
   * und wird verwendet, um neue access Tokens zu generieren.
   *
   * @param user - Der Benutzer, für den das Token erstellt wird
   * @returns Das signierte JWT Refresh Token
   */
  signRefreshToken(user: User): string {
    const payload = { sub: user.id };
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  /**
   * Erstellt ein spezielles Admin-Token mit erweiterten Berechtigungen
   *
   * @param user - Der Admin-Benutzer
   * @returns Das signierte Admin-Token mit erweiterten Claims
   * @throws ForbiddenException wenn der Benutzer kein Admin ist
   */
  signAdminToken(user: User): string {
    if (!isAdmin(user.role)) {
      throw new ForbiddenException('Nur Admins können Admin-Tokens erhalten');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      isAdmin: true,
      permissions: this.getAdminPermissions(user.role),
    };

    const config = this.getAdminTokenConfig();
    return this.jwtService.sign(payload, config);
  }

  /**
   * Verifiziert ein access Token
   *
   * @param token - Das zu verifizierende Token
   * @returns Die dekodierten Token-Daten
   */
  async verifyAccessToken(token: string): Promise<ValidatedUser> {
    const decoded = await this.jwtService.verify(token);
    // Map JWT payload to ValidatedUser format
    return {
      userId: decoded.sub,
      role: decoded.role,
    };
  }

  /**
   * Verifiziert ein Admin-Token und prüft Admin-Rechte
   *
   * @param token - Das zu verifizierende Admin-Token
   * @returns Die dekodierten Token-Daten
   * @throws UnauthorizedException wenn das Token ungültig ist oder keine Admin-Rechte hat
   */
  async verifyAdminToken(token: string): Promise<{ userId: string; username: string; isAdmin: boolean }> {
    const config = this.getAdminTokenConfig();
    const decoded = await this.jwtService.verify(token, {
      secret: config.secret,
    });
    if (!decoded.isAdmin) throw new UnauthorizedException('Kein gültiges Admin-Token');
    return decoded;
  }

  /**
   * Prüft, ob bereits ein Admin-Account existiert
   *
   * @returns true wenn mindestens ein Admin existiert
   */
  async adminExists(): Promise<boolean> {
    const adminCount = await this.prisma.user.count({
      where: {
        role: {
          in: adminRoles,
        },
      },
    });

    this.logger.debug(`🔍 Admin-Check: ${adminCount} Admin(s) gefunden`);
    return adminCount > 0;
  }

  /**
   * Validiert Admin-Credentials
   *
   * @param userId - Admin-Benutzername
   * @param password - Admin-Passwort
   * @returns Der validierte Admin-User
   * @throws UnauthorizedException bei ungültigen Credentials
   */
  async validateAdminCredentials(userId: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: User nicht gefunden (${userId})`);
      throw new UnauthorizedException('Ungültige Admin-Zugangsdaten');
    }

    if (!isAdmin(user.role)) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: keine Admin-Rechte (${user.username})`);
      throw new UnauthorizedException('Keine Admin-Berechtigung');
    }

    if (!user.passwordHash) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Kein Passwort gesetzt (${user.username})`);
      throw new UnauthorizedException('Admin-Account nicht korrekt konfiguriert');
    }

    const isValid = bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Falsches Passwort (${user.username})`);
      throw new UnauthorizedException('Ungültige Admin-Zugangsdaten');
    }

    this.logger.log(`✅ Admin-Login erfolgreich: ${user.username}`);
    return user;
  }

  /**
   * Sets up an admin account by allowing an admin to set a password if not already set, and generates a new admin token for authentication.
   *
   * @param dto Object containing the password details required for setting up the admin account.
   * @param user The currently authenticated and validated user attempting the admin setup.
   * @return A promise resolving to an object containing the generated admin token and the updated user data (excluding password hash).
   * @throws NotFoundException If the authenticated user is not found in the database.
   * @throws ForbiddenException If the authenticated user lacks administrative privileges.
   * @throws ConflictException If the user already has a password set up.
   */
  async adminSetup(dto: AdminSetupDto, user: ValidatedUser): Promise<{ token: string; user: User }> {
    // Finde den aktuellen User
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!currentUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Prüfe, ob der User Admin-Rechte hat
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Nur Admins können ein Passwort setzen');
    }

    // Prüfe, ob bereits ein Passwort gesetzt ist
    if (currentUser.passwordHash) {
      throw new ConflictException('Passwort bereits gesetzt');
    }

    // Hash das Passwort
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Update den User mit dem Passwort
    const updatedUser = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash },
    });

    this.logger.log(`🔐 Admin-Passwort gesetzt für: ${updatedUser.username}`);

    // Erstelle ein neues Admin-Token
    const token = this.signAdminToken(updatedUser);

    // Return ohne passwordHash
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return {
      token,
      user: userWithoutPassword as User,
    };
  }

  /**
   * Gibt eine Liste aller Benutzenden ohne sensible Daten zurück
   *
   * @returns Array von Benutzenden ohne passwordHash
   */
  async getPublicUsers(): Promise<Pick<User, 'username'>[]> {
    // Entferne passwordHash von jedem User
    return await this.prisma.user.findMany({
      select: {
        username: true,
      },
      where: {
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gibt die Admin-Token-Konfiguration zurück
   *
   * @returns Konfigurationsobjekt mit secret und expiresIn
   */
  private getAdminTokenConfig(): { secret: string; expiresIn: string } {
    const adminSecret = this.configService.get<string>('ADMIN_JWT_SECRET');
    if (!adminSecret) {
      throw new Error('ADMIN_JWT_SECRET is not configured');
    }

    return {
      secret: adminSecret,
      expiresIn: this.configService.get<string>('JWT_ADMIN_EXPIRES_IN', '15m'),
    };
  }

  /**
   * Convert Prisma User to AuthUserDto
   * Strips sensitive data and formats dates properly
   */
  private toAuthUserDto(user: User): AuthUserDto {
    return {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      createdAtNato: toNatDateTime(user.createdAt),
    };
  }

  /**
   * Findet einen Benutzer anhand seines Usernamens
   * @param username - Der Username des Benutzers
   * @returns Der gefundene Benutzer oder null
   */
  private async findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Führt Login für existierenden Benutzer durch
   * @param user - Der existierende Benutzer
   * @returns Auth Response mit Tokens und User-Info
   */
  private async loginExistingUser(user: User): Promise<AuthResponseDto & { accessToken: string; refreshToken: string }> {
    // Normale Login - KEIN Passwort-Check für Admin-Accounts
    // Admin-Passwort wird nur bei /admin/login geprüft
    this.logger.debug(`🔑 User-Login erfolgreich: ${user.username} (Role: ${user.role})`);

    // Update lastLoginAt
    await this.updateLastLogin(user.id);

    return this.createAuthResponse(user, false);
  }

  /**
   * Registriert automatisch einen neuen Benutzer
   * @param username - Der Username des neuen Benutzers
   * @returns Auth Response mit Tokens und User-Info
   */
  private async autoRegisterUser(username: string): Promise<AuthResponseDto & { accessToken: string; refreshToken: string }> {
    try {
      const newUser = await this.createUser(username);
      this.logger.log(`⭐ Neuer Benutzer automatisch angelegt: ${newUser.username}`);

      // Update lastLoginAt for new user as well
      await this.updateLastLogin(newUser.id);

      return this.createAuthResponse(newUser, true);
    } catch (error) {
      // Handle race condition wenn zwei Requests gleichzeitig denselben User anlegen
      if (this.isUniqueConstraintError(error)) {
        // Retry login da User jetzt existiert
        const existingUser = await this.findUserByUsername(username);
        if (existingUser) {
          return this.loginExistingUser(existingUser);
        }
      }
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Benutzer
   * @param username - Der Username des neuen Benutzers
   * @returns Der erstellte Benutzer
   */
  private async createUser(username: string): Promise<User> {
    // Prüfe, ob bereits ein Admin existiert
    const adminCount = await this.prisma.user.count({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
    });

    // Der erste Benutzer wird automatisch SUPER_ADMIN
    const role = adminCount === 0 ? 'SUPER_ADMIN' : 'USER';

    return this.prisma.user.create({
      data: {
        username,
        passwordHash: null, // explizit null für normale User
        role,
        lastLoginAt: new Date(), // Set the initial login time
      },
    });
  }

  /**
   * Aktualisiert den lastLoginAt Zeitstempel
   * @param userId - Die ID des Benutzers
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Erstellt die Auth Response mit Tokens
   * @param user - Der Benutzer
   * @param isNewUser - Ob es ein neuer Benutzer ist
   * @returns Auth Response mit Tokens und User-Info
   */
  private createAuthResponse(user: User, isNewUser: boolean): AuthResponseDto & { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
      isNewUser,
      user: this.toAuthUserDto(user),
    };
  }

  /**
   * Prüft, ob ein Fehler ein Unique Constraint Fehler ist
   * @param error - Der zu prüfende Fehler
   * @returns true wenn es ein Unique Constraint Fehler für username ist
   */
  private isUniqueConstraintError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error && 'meta' in error) {
      const prismaError = error as {
        code: string;
        meta?: { target?: string[] };
      };
      return prismaError.code === 'P2002' && (prismaError.meta?.target?.includes('username') ?? false);
    }
    return false;
  }

  /**
   * Helper: Gibt Admin-Permissions basierend auf der Rolle zurück
   */
  private getAdminPermissions(role: string): string[] {
    switch (role) {
      case 'SUPER_ADMIN':
        return ['*']; // Alle Permissions
      case 'ADMIN':
        return ['users:*', 'system:read'];
      case 'MODERATOR':
        return ['users:read', 'users:update'];
      default:
        return [];
    }
  }
}
