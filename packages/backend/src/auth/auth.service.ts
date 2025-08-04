import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AdminSetupDto } from './dto/admin-setup.dto';
import { ValidatedUser } from './strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';

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
   * Registriert einen neuen Benutzer
   *
   * @param dto - Registrierungsdaten
   * @returns Der erstellte Benutzer
   * @throws ConflictException wenn der Benutzername bereits existiert
   */
  async register(dto: RegisterUserDto): Promise<User> {
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Check if username already exists within the transaction
        const existingUser = await tx.user.findUnique({
          where: { username: dto.username },
        });

        if (existingUser) {
          throw new ConflictException('Benutzername bereits vergeben');
        }

        // Check if this is the first user
        const userCount = await tx.user.count();
        const isFirstUser = userCount === 0;

        // Create the user
        return await tx.user.create({
          data: {
            username: dto.username,
            role: isFirstUser ? UserRole.SUPER_ADMIN : UserRole.USER,
          },
        });
      });

      const isFirstUser = user.role === UserRole.SUPER_ADMIN;
      if (isFirstUser) {
        this.logger.warn(`🦁 Erster Benutzer registriert: ${user.username} (SUPER_ADMIN)`);
      } else {
        this.logger.debug(`⭐ Neuer Benutzer registriert: ${user.username} (USER)`);
      }

      return user;
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        throw new ConflictException('Benutzername bereits vergeben');
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Meldet einen Benutzer an
   *
   * @param dto - Anmeldedaten
   * @returns Der angemeldete Benutzer
   * @throws NotFoundException wenn der Benutzer nicht existiert
   */
  async login(dto: LoginUserDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      this.logger.warn(`🔍 Anmeldeversuch mit unbekanntem Benutzernamen: ${dto.username}`);
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.debug(`🔑 Benutzer angemeldet: ${user.username} (Rolle: ${user.role})`);

    return user;
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
   * @param userId - Die ID des Benutzers
   * @returns Das signierte JWT Access-Token
   */
  signAccessToken(userId: string): string {
    const payload = { sub: userId };
    this.logger.debug(`🔑 Generiere Access-Token für Benutzer: ${userId}`);
    return this.jwtService.sign(payload);
  }

  /**
   * Generiert ein Refresh-Token für einen Benutzer
   *
   * @param userId - Die ID des Benutzers
   * @returns Das signierte JWT Refresh-Token
   */
  signRefreshToken(userId: string): string {
    const payload = { sub: userId };
    this.logger.debug(`🔄 Generiere Refresh-Token für Benutzer: ${userId}`);
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
      isAdmin: true,
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
   * Prüft, ob bereits ein Admin-Benutzer mit Passwort existiert
   *
   * @returns true wenn mindestens ein Benutzer mit Admin-Rolle und Passwort existiert, sonst false
   */
  async adminExists(): Promise<boolean> {
    const adminCount = await this.prisma.user.count({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
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
   * @returns Der validierte Admin-Benutzer oder null bei ungültigen Anmeldedaten
   */
  async validateAdminCredentials(userId: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!user || !user.passwordHash) {
      this.logger.debug(
        `🔍 Admin-Login fehlgeschlagen: Benutzer nicht gefunden oder kein Passwort`,
      );
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`🚫 Admin-Login fehlgeschlagen: Ungültiges Passwort für ${user.username}`);
      return null;
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

    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN) {
      this.logger.warn(
        `🚫 Admin-Setup verweigert: Keine Admin-Berechtigung für ${currentUser.username}`,
      );
      throw new ConflictException('Nur Admin-Benutzer können diese Funktion nutzen');
    }

    if (await this.adminExists()) {
      this.logger.warn(`🚫 Admin-Setup verweigert: Admin existiert bereits`);
      throw new ConflictException('Ein Admin-Account existiert bereits');
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
}
