import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { FindeDefaultZeichenQuery } from './finde-default-zeichen.query';

/**
 * DTO für einen Standard-Zeichen-Eintrag (Fahrzeugtyp oder Einheitentyp).
 */
export interface DefaultZeichenDto {
  /** ID des Fahrzeug- oder Einheitentyps (foreignKey) */
  referenzId: string;
  /** Typ-Bezeichnung (Fahrzeugtypcode oder Einheitentypname) */
  typBezeichnung: string;
  /** Zeichendefinition als JSON-Objekt */
  zeichenDefinition: Record<string, unknown>;
}

/**
 * Query Handler: Standard-Zeichen-Definitionen für Fahrzeug- oder Einheitentypen laden.
 * Liest direkt via PrismaService (kein Repository, da einfacher Lesezugriff auf Admin-Daten).
 */
@Injectable()
export class FindeDefaultZeichenHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindeDefaultZeichenQuery): Promise<Result<DefaultZeichenDto[]>> {
    if (query.typ === 'fahrzeugtypen') {
      const eintraege = await this.prisma.fahrzeugtypZeichenDefault.findMany({
        include: {
          fahrzeugtyp: {
            select: { id: true, code: true },
          },
        },
        orderBy: { fahrzeugtyp: { code: 'asc' } },
      });

      const dtos: DefaultZeichenDto[] = eintraege.map((eintrag) => ({
        referenzId: eintrag.fahrzeugtypId,
        typBezeichnung: eintrag.fahrzeugtyp.code,
        zeichenDefinition: eintrag.zeichenDefinition as Record<string, unknown>,
      }));

      return Result.ok<DefaultZeichenDto[]>(dtos);
    } else {
      // einheitentypen
      const eintraege = await this.prisma.einheitentypZeichenDefault.findMany({
        orderBy: { einheitentyp: 'asc' },
      });

      const dtos: DefaultZeichenDto[] = eintraege.map((eintrag) => ({
        referenzId: eintrag.id,
        typBezeichnung: eintrag.einheitentyp,
        zeichenDefinition: eintrag.zeichenDefinition as Record<string, unknown>,
      }));

      return Result.ok<DefaultZeichenDto[]>(dtos);
    }
  }
}
