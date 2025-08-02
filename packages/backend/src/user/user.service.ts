import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * Service für Benutzerverwaltung
 *
 * Verwaltet CRUD-Operationen für Benutzer im System.
 * Nur Administratoren können neue Benutzer erstellen oder löschen.
 */
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gibt alle Benutzer zurück
   *
   * @returns Liste aller Benutzer (ohne Passwort-Hash)
   */
  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Passwort-Hash aus der Antwort entfernen
    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  /**
   * Findet einen Benutzer anhand der ID
   *
   * @param id - Benutzer-ID
   * @returns Der gefundene Benutzer (ohne Passwort-Hash)
   * @throws NotFoundException wenn der Benutzer nicht existiert
   */
  async findOne(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Erstellt einen neuen Benutzer
   *
   * @param dto - Benutzerdaten
   * @param createdById - ID des erstellenden Benutzers (Admin)
   * @returns Der erstellte Benutzer (ohne Passwort-Hash)
   * @throws ConflictException wenn der Benutzername bereits existiert
   */
  async create(dto: CreateUserDto, createdById: string): Promise<Omit<User, 'passwordHash'>> {
    // Prüfen, ob Benutzername bereits existiert
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Benutzername bereits vergeben');
    }

    // Benutzer erstellen
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        role: dto.role || UserRole.USER,
        createdBy: createdById,
      },
    });

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Löscht einen Benutzer
   *
   * @param id - ID des zu löschenden Benutzers
   * @param requestingUserId - ID des anfragenden Benutzers
   * @throws NotFoundException wenn der Benutzer nicht existiert
   * @throws BadRequestException wenn versucht wird, den letzten Admin zu löschen
   */
  async remove(id: string, requestingUserId: string): Promise<void> {
    // Benutzer finden
    const userToDelete = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Verhindern, dass sich ein Benutzer selbst löscht
    if (id === requestingUserId) {
      throw new BadRequestException('Sie können sich nicht selbst löschen');
    }

    // Prüfen, ob dies der letzte Admin ist
    if (userToDelete.role === UserRole.SUPER_ADMIN || userToDelete.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: {
          role: {
            in: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
          },
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Der letzte Administrator kann nicht gelöscht werden');
      }
    }

    // Benutzer löschen
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
