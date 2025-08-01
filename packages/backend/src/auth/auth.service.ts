import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

/**
 * Service für Authentifizierungslogik
 *
 * Verwaltet Benutzerregistrierung und -anmeldung ohne Passwörter.
 * Der erste registrierte Benutzer wird automatisch zum SUPER_ADMIN.
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registriert einen neuen Benutzer
   *
   * @param dto - Registrierungsdaten
   * @returns Der erstellte Benutzer
   * @throws ConflictException wenn der Benutzername bereits existiert
   */
  async register(dto: RegisterUserDto): Promise<User> {
    // Prüfen, ob Benutzername bereits existiert
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Benutzername bereits vergeben');
    }

    // Prüfen, ob dies der erste Benutzer ist
    const userCount = await this.prisma.user.count();
    const isFirstUser = userCount === 0;

    // Benutzer erstellen
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        role: isFirstUser ? UserRole.SUPER_ADMIN : UserRole.USER,
      },
    });

    return user;
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
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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
}
