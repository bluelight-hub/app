import { Inject, Injectable } from '@nestjs/common';
import type { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { UserId } from '@domain/value-objects/user-id';
import { USER_REPOSITORY } from '@infrastructure/di-tokens';
import type { KategorieResponseDto } from './kategorie-response.dto';

/**
 * Factory zur Erstellung von KategorieResponseDtos.
 * Laedt den Ersteller-Namen via IUserRepository (analog zu NotizResponseFactory).
 */
@Injectable()
export class KategorieResponseFactory {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  /**
   * Konvertiert eine Domain Entity in ein Response DTO inkl. Namens-Aufloesung.
   */
  async create(kategorie: Kategorie): Promise<KategorieResponseDto> {
    const erstelltVonName = await this.resolveUserName(kategorie.erstelltVon);

    return {
      id: kategorie.id.toString(),
      name: kategorie.name.value,
      farbe: kategorie.farbe.value,
      einsatzId: kategorie.einsatzId,
      erstelltVon: kategorie.erstelltVon.toString(),
      erstelltVonName,
      createdAt: kategorie.createdAt.toISOString(),
      updatedAt: kategorie.updatedAt.toISOString(),
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
