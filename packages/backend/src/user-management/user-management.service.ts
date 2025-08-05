import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * Service für die Benutzerverwaltung durch Administratoren
 *
 * Stellt Funktionen zur Verfügung für:
 * - Auflisten aller Benutzer
 * - Erstellen neuer Benutzer
 * - Löschen von Benutzern mit Sicherheitsprüfungen
 */
@Injectable()
export class UserManagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gibt alle Benutzer mit nur den wichtigsten Feldern zurück
   *
   * @returns Array von Benutzern mit id, username und role
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Erstellt einen neuen Benutzer
   *
   * @param dto - Benutzerdaten (username und optionale role)
   * @returns Der erstellte Benutzer mit id, username und role
   * @throws ConflictException wenn der Benutzername bereits existiert
   */
  async create(dto: CreateUserDto) {
    // Prüfen, ob Benutzername bereits existiert
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Benutzername bereits vergeben');
    }

    // Benutzer erstellen mit Standardrolle USER
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        role: dto.role || UserRole.USER,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Löscht einen Benutzer mit Transaktionssicherheit
   *
   * Verhindert das Löschen des letzten SUPER_ADMIN Benutzers
   *
   * @param id - ID des zu löschenden Benutzers
   * @throws NotFoundException wenn der Benutzer nicht existiert
   * @throws BadRequestException wenn versucht wird, den letzten SUPER_ADMIN zu löschen
   */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      // Benutzer finden
      const userToDelete = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
        },
      });

      if (!userToDelete) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      // Prüfen, ob dies der letzte SUPER_ADMIN ist
      if (userToDelete.role === UserRole.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
          },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException('Der letzte SUPER_ADMIN kann nicht gelöscht werden');
        }
      }

      // Benutzer löschen
      await prisma.user.delete({
        where: { id },
      });
    });
  }
}
