import { Inject, Injectable } from '@nestjs/common';
import type { Notiz } from '@domain/notiz/entities/notiz.entity';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { UserId } from '@domain/value-objects/user-id';
import { USER_REPOSITORY } from '@infrastructure/di-tokens';
import type { NotizResponseDto } from './notiz-response.dto';

/**
 * Optionale Kategorie-Daten, die vom Repository via Include geladen werden.
 * Story 8.2: Kategorie-Name und -Farbe fuer die Anzeige.
 */
export interface KategorieData {
  name: string;
  farbe: string;
}

/**
 * Factory zur Erstellung von NotizResponseDtos.
 * Laedt den Ersteller-Namen via IUserRepository (analog zu ErinnerungResponseFactory).
 */
@Injectable()
export class NotizResponseFactory {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  /**
   * Konvertiert eine Domain Entity in ein Response DTO inkl. Namens-Aufloesung.
   *
   * @param notiz - Die Domain Entity
   * @param kategorieData - Optionale Kategorie-Daten (Name, Farbe) aus Repository-Include (Story 8.2)
   * @returns NotizResponseDto mit aufgeloesten Namen und Kategorie-Daten
   */
  async create(notiz: Notiz, kategorieData?: KategorieData | null): Promise<NotizResponseDto> {
    const erstelltVonName = await this.resolveUserName(notiz.erstelltVon);

    return {
      id: notiz.id.toString(),
      einsatzId: notiz.einsatzId,
      titel: notiz.titel.value,
      inhalt: notiz.inhalt,
      kategorie: notiz.kategorie,
      istTeamsichtbar: notiz.istTeamsichtbar,
      erstelltVon: notiz.erstelltVon.toString(),
      erstelltVonName,
      createdAt: notiz.createdAt.toISOString(),
      updatedAt: notiz.updatedAt.toISOString(),

      // Story 8.2: Kategorie-Daten
      kategorieId: notiz.kategorieId ?? null,
      kategorieName: kategorieData?.name ?? null,
      kategorieFarbe: kategorieData?.farbe ?? null,
    };
  }

  /**
   * Hilfsmethode zum Aufloesen eines Usernamens via ID.
   */
  private async resolveUserName(userId: UserId): Promise<string | null> {
    const result = await this.userRepository.findById(userId);
    if (result.isSuccess && result.value) {
      return result.value.username.value;
    }
    return null;
  }
}
