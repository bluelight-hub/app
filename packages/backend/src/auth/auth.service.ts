import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { User } from '@prisma/client';
import { AuthRequestDto } from './dto/auth-request.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AdminSetupDto } from './dto/admin-setup.dto';
import { ValidatedUser } from './strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';
import { adminRoles, isAdmin } from '@/auth/utils/auth.utils';

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
  async unifiedAuth(
    dto: AuthRequestDto,
  ): Promise<AuthResponseDto & { accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 1) USER EXISTIERT
    if (user) {
      // Normale Login - KEIN Passwort-Check für Admin-Accounts
      // Admin-Passwort wird nur bei /admin/login geprüft
      this.logger.debug(`🔑 User-Login erfolgreich: ${user.username} (Role: ${user.role})`);

      // Update lastLoginAt
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Sanitize user data (remove passwordHash)
      const { passwordHash: _, ...sanitizedUser } = user;

      return {
        accessToken: this.signAccessToken(user),
        refreshToken: this.signRefreshToken(user),
        isNewUser: false,
        user: sanitizedUser,
      };
    }

    // 2) USER EXISTIERT NICHT → automatisch anlegen (ohne Passwort)
    try {
      const newUser = await this.prisma.user.create({
        data: {
          username: dto.username,
          passwordHash: null, // explizit null für normale User
          role: 'USER', // Neue User sind immer normale USER
        },
      });

      this.logger.log(`⭐ Neuer Benutzer automatisch angelegt: ${newUser.username}`);

      // Sanitize user data
      const { passwordHash: _, ...sanitizedUser } = newUser;

      return {
        accessToken: this.signAccessToken(newUser),
        refreshToken: this.signRefreshToken(newUser),
        isNewUser: true,
        user: sanitizedUser,
      };
    } catch (error) {
      // Handle race condition wenn zwei Requests gleichzeitig denselben User anlegen
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        // Retry login da User jetzt existiert
        return this.unifiedAuth(dto);
      }
      throw error;
    }
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
   * Erstellt ein neues Access Token für einen Benutzer
   *
   * Das Token enthält die Benutzer-ID und den Benutzernamen
   * und ist für kurze Zeit gültig (standardmäßig 15 Minuten).
   *
   * @param user - Der Benutzer für den das Token erstellt wird
   * @returns Das signierte JWT Access Token
   */
  signAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role, // Include role in token payload
    };
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  /**
   * Erstellt ein neues Refresh Token für einen Benutzer
   *
   * Das Token ist länger gültig als das Access Token
   * und wird verwendet, um neue Access Tokens zu generieren.
   *
   * @param user - Der Benutzer für den das Token erstellt wird
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

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ADMIN_EXPIRES_IN', '1h'),
    });
  }

  /**
   * Verifiziert ein Access Token
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
  async verifyAdminToken(token: string): Promise<any> {
    const decoded = await this.jwtService.verify(token);
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
   * @param username - Admin-Benutzername
   * @param password - Admin-Passwort
   * @returns Der validierte Admin-User
   * @throws UnauthorizedException bei ungültigen Credentials
   */
  async validateAdminCredentials(username: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: User nicht gefunden (${username})`);
      throw new UnauthorizedException('Ungültige Admin-Zugangsdaten');
    }

    if (!isAdmin(user.role)) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Keine Admin-Rechte (${username})`);
      throw new UnauthorizedException('Keine Admin-Berechtigung');
    }

    if (!user.passwordHash) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Kein Passwort gesetzt (${username})`);
      throw new UnauthorizedException('Admin-Account nicht korrekt konfiguriert');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Falsches Passwort (${username})`);
      throw new UnauthorizedException('Ungültige Admin-Zugangsdaten');
    }

    this.logger.log(`✅ Admin-Login erfolgreich: ${username}`);
    return user;
  }

  /**
   * Erstellt den ersten Admin-Account
   *
   * @param dto - Admin-Setup-Daten
   * @returns Der erstellte Admin-User
   * @throws ConflictException wenn bereits ein Admin existiert
   */
  async adminSetup(
    dto: AdminSetupDto,
    user: ValidatedUser,
  ): Promise<{ token: string; user: User }> {
    // Finde den aktuellen User
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!currentUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Prüfe ob der User Admin-Rechte hat
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Nur Admins können ein Passwort setzen');
    }

    // Prüfe ob bereits ein Passwort gesetzt ist
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
   * Gibt eine Liste aller Benutzer ohne sensible Daten zurück
   *
   * @returns Array von Benutzern ohne passwordHash
   */
  async getPublicUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Entferne passwordHash von jedem User
    return users.map(({ passwordHash: _, ...user }) => user);
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
