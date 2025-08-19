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
  async unifiedAuth(dto: AuthRequestDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 1) USER EXISTIERT
    if (user) {
      // Admin-Account mit Passwort → Vergleich durchführen
      if (user.passwordHash) {
        const valid = await bcrypt.compare(dto.password ?? '', user.passwordHash);
        if (!valid) {
          // Generische Fehlermeldung für Sicherheit
          this.logger.warn(`🚫 Auth fehlgeschlagen für Admin: ${dto.username}`);
          throw new UnauthorizedException('Ungültige Zugangsdaten');
        }
        this.logger.debug(`✅ Admin-Login erfolgreich: ${user.username}`);
      } else {
        // Normale Accounts haben kein Passwort → sofort akzeptieren
        this.logger.debug(`🔑 User-Login erfolgreich: ${user.username}`);
      }

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
   * Findet einen Benutzer anhand der ID
   *
   * @param id - Benutzer-ID
   * @returns Der gefundene Benutzer oder null
   */
  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Generiert ein Access-Token für einen Benutzer
   *
   * @returns Das signierte JWT Access-Token
   * @param user - Der Benutzer für den das Token generiert werden soll
   */
  signAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    this.logger.debug(
      `🔑 Generiere Access-Token für Benutzer: ${user.username} (${user.id}) mit Rolle: ${user.role}`,
    );
    return this.jwtService.sign(payload);
  }

  /**
   * Generiert ein Refresh-Token für einen Benutzer
   *
   * @param userId - Die ID des Benutzers
   * @returns Das signierte JWT Refresh-Token
   */
  signRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    this.logger.debug(`🔄 Generiere Refresh-Token für Benutzer: ${user.username} (${user.id})`);
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  /**
   * Generiert ein Admin-Token für einen Benutzer
   *
   * @param user - Der Benutzer für den das Token generiert werden soll
   * @returns Das signierte JWT Admin-Token mit 15 Minuten Gültigkeit
   */
  signAdminToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      type: 'admin', // Wichtig: Markiert dies als Admin-Token
    };
    const adminJwtSecret = this.configService.getOrThrow<string>('ADMIN_JWT_SECRET');
    const adminJwtExpiration = this.configService.getOrThrow<string>('ADMIN_JWT_EXPIRATION');

    this.logger.debug(`🔐 Generiere Admin-Token für Benutzer: ${user.username} (${user.id})`);
    return this.jwtService.sign(payload, {
      secret: adminJwtSecret,
      expiresIn: adminJwtExpiration,
    });
  }

  /**
   * Verifiziert ein Access-Token und gibt die Payload zurück
   *
   * @param token - Das zu verifizierende JWT Access-Token
   * @returns Die JWT-Payload
   * @throws Error wenn das Token ungültig ist
   */
  async verifyAccessToken(token: string): Promise<any> {
    return this.jwtService.verify(token);
  }

  /**
   * Verifiziert ein Admin-JWT-Token
   * @param token Der zu verifizierende Admin-Token
   * @returns Token-Payload
   * @throws Error wenn das Token ungültig ist
   */
  async verifyAdminToken(token: string): Promise<any> {
    const adminJwtSecret = this.configService.getOrThrow<string>('ADMIN_JWT_SECRET');
    return this.jwtService.verify(token, { secret: adminJwtSecret });
  }

  /**
   * Prüft, ob bereits ein Admin-Benutzer mit Passwort existiert
   *
   * @returns true wenn mindestens ein Benutzer mit Admin-Rolle und Passwort existiert, sonst false
   */
  async adminExists(): Promise<boolean> {
    const adminCount = await this.prisma.user.count({
      where: {
        role: {
          in: adminRoles,
        },
        passwordHash: {
          not: null,
        },
      },
    });

    return adminCount > 0;
  }

  /**
   * Validiert die Anmeldedaten eines Admin-Benutzers
   *
   * @param userId - Die ID des Admin-Accounts
   * @param password - Das Passwort des Admin-Accounts
   * @returns Der validierte Admin-Benutzer
   * @throws NotFoundException wenn der Benutzer nicht existiert
   * @throws ForbiddenException wenn der Benutzer keine Admin-Rechte hat
   * @throws UnauthorizedException wenn kein Passwort gesetzt ist oder das Passwort ungültig ist
   */
  async validateAdminCredentials(userId: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      this.logger.debug(`🔍 Admin-Login fehlgeschlagen: Benutzer nicht gefunden`);
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Check if user has admin rights
    if (!isAdmin(user.role)) {
      this.logger.debug(
        `🚫 Admin-Login fehlgeschlagen: Benutzer ${user.username} hat keine Admin-Rechte`,
      );
      throw new ForbiddenException('Benutzer hat keine Admin-Rechte');
    }

    if (!user.passwordHash) {
      this.logger.debug(`🔍 Admin-Login fehlgeschlagen: Kein Passwort für ${user.username}`);
      throw new UnauthorizedException('Ungültiges Passwort');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Ungültiges Passwort für ${user.username}`);
      throw new UnauthorizedException('Ungültiges Passwort');
    }

    this.logger.debug(`✅ Admin-Login erfolgreich: ${user.username} (Rolle: ${user.role})`);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  /**
   * Richtet das Passwort für einen Admin-Account ein
   *
   * @param dto - Admin-Setup-Daten mit Passwort
   * @param validatedUser - Der aktuelle authentifizierte Benutzer
   * @returns Der aktualisierte Benutzer ohne Passwort-Hash und optional das Admin-Token
   * @throws ConflictException wenn bereits ein Admin existiert
   */
  async adminSetup(
    dto: AdminSetupDto,
    validatedUser: ValidatedUser,
  ): Promise<{ user: Omit<User, 'passwordHash'>; token?: string }> {
    const currentUser = await this.findUserById(validatedUser.userId);
    if (!currentUser) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    if (!isAdmin(currentUser.role)) {
      this.logger.warn(
        `🚫 Admin-Setup verweigert: Keine Admin-Berechtigung für ${currentUser.username}`,
      );
      throw new ConflictException('Nur Admin-Benutzer können diese Funktion nutzen');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: validatedUser.userId },
      data: {
        passwordHash: passwordHash,
      },
    });

    this.logger.warn(`✅ Admin-Setup erfolgreich für Benutzer: ${updatedUser.username}`);

    const adminToken = this.signAdminToken(updatedUser);

    const { passwordHash: _, ...sanitizedUser } = updatedUser;

    return {
      user: sanitizedUser,
      token: adminToken,
    };
  }

  /**
   * Gibt eine öffentliche Liste aller Benutzer zurück
   *
   * Diese Methode ist für den öffentlichen Login-Screen gedacht
   * und gibt nur die Benutzernamen zurück.
   *
   * @returns Array mit öffentlichen Benutzerinformationen
   */
  async getPublicUsers(): Promise<Array<{ username: string }>> {
    const users = await this.prisma.user.findMany({
      select: {
        username: true,
        lastLoginAt: true,
      },
      orderBy: {
        lastLoginAt: 'desc',
      },
    });

    return users
      .sort((a, b) => (a.lastLoginAt < b.lastLoginAt ? 1 : -1))
      .map((user) => ({ username: user.username }));
  }
}
