import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ZEICHEN_KATALOG_STANDARD_EINTRAEGE } from './zeichen-katalog-daten';

/**
 * Befüllt den Zeichen-Katalog beim App-Start mit Standard-Einträgen (DV 102).
 *
 * Idempotent: Fügt nur ein wenn keine Standard-Einträge existieren.
 * Die sortOrder wird aus den Daten übernommen, die Sortierung beim
 * Abruf erfolgt im Repository nach Kategorie → Organisation → Name.
 */
@Injectable()
export class ZeichenKatalogSeederService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.prisma.zeichenKatalogEintrag.count({
      where: { istStandard: true },
    });

    if (count > 0) {
      this.logger.log(`Zeichen-Katalog enthält ${count} Standard-Einträge, überspringe Seeding`, 'ZeichenKatalogSeeder');
      return;
    }

    this.logger.log('Zeichen-Katalog ist leer, füge Standard-Einträge ein...', 'ZeichenKatalogSeeder');

    await this.prisma.zeichenKatalogEintrag.createMany({
      data: ZEICHEN_KATALOG_STANDARD_EINTRAEGE.map((e) => ({
        name: e.name,
        kategorie: e.kategorie,
        zeichenDefinition: e.zeichenDefinition as object,
        tags: [...e.tags],
        sortOrder: 0,
        istStandard: true,
      })),
    });

    this.logger.log(`${ZEICHEN_KATALOG_STANDARD_EINTRAEGE.length} Zeichen-Katalog-Einträge erstellt`, 'ZeichenKatalogSeeder');
  }
}
