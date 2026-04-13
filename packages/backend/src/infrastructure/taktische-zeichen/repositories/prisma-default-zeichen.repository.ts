import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';
import type { DefaultZeichenEntry, IDefaultZeichenRepository } from '@domain/taktische-zeichen/ports/idefault-zeichen.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-Adapter für IDefaultZeichenRepository.
 *
 * Persistiert und liest Default-Zeichen-Zuordnungen für Fahrzeug- und Einheitentypen.
 * Upsert-Semantik: Erstellt oder aktualisiert Einträge anhand des natürlichen Schlüssels.
 */
@Injectable()
export class PrismaDefaultZeichenRepository implements IDefaultZeichenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllFahrzeugtypen(): Promise<Result<DefaultZeichenEntry[]>> {
    try {
      const eintraege = await this.prisma.fahrzeugtypZeichenDefault.findMany({
        include: {
          fahrzeugtyp: {
            select: { id: true, code: true },
          },
        },
        orderBy: { fahrzeugtyp: { code: 'asc' } },
      });

      const entries: DefaultZeichenEntry[] = [];
      for (const eintrag of eintraege) {
        const defResult = ZeichenDefinition.fromJson(eintrag.zeichenDefinition as Record<string, unknown>);
        if (defResult.isFailure || !defResult.value) continue;

        entries.push({
          referenzId: eintrag.fahrzeugtypId,
          typBezeichnung: eintrag.fahrzeugtyp.code,
          zeichenDefinition: defResult.value,
        });
      }

      return Result.ok(entries);
    } catch (error) {
      return Result.fail(`FAHRZEUGTYP_DEFAULTS_LOAD_FAILED: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async findAllEinheitentypen(): Promise<Result<DefaultZeichenEntry[]>> {
    try {
      const eintraege = await this.prisma.einheitentypZeichenDefault.findMany({
        orderBy: { einheitentyp: 'asc' },
      });

      const entries: DefaultZeichenEntry[] = [];
      for (const eintrag of eintraege) {
        const defResult = ZeichenDefinition.fromJson(eintrag.zeichenDefinition as Record<string, unknown>);
        if (defResult.isFailure || !defResult.value) continue;

        entries.push({
          referenzId: eintrag.id,
          typBezeichnung: eintrag.einheitentyp,
          zeichenDefinition: defResult.value,
        });
      }

      return Result.ok(entries);
    } catch (error) {
      return Result.fail(`EINHEITENTYP_DEFAULTS_LOAD_FAILED: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async saveFahrzeugtypDefault(fahrzeugtypId: string, definition: ZeichenDefinition, tx?: TransactionContext): Promise<Result<DefaultZeichenEntry>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const jsonDef = definition.toJson() as unknown as Prisma.InputJsonValue;

      const result = await client.fahrzeugtypZeichenDefault.upsert({
        where: { fahrzeugtypId },
        create: {
          fahrzeugtypId,
          zeichenDefinition: jsonDef,
        },
        update: {
          zeichenDefinition: jsonDef,
        },
      });

      // Fahrzeugtyp-Code separat laden (upsert gibt keine Relation zurück)
      const fahrzeugtyp = await client.fahrzeugtyp.findUniqueOrThrow({
        where: { id: fahrzeugtypId },
        select: { code: true },
      });

      return Result.ok<DefaultZeichenEntry>({
        referenzId: result.fahrzeugtypId,
        typBezeichnung: fahrzeugtyp.code,
        zeichenDefinition: definition,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003' || error.code === 'P2025') {
          return Result.fail('FAHRZEUGTYP_NOT_FOUND');
        }
      }
      return Result.fail(`FAHRZEUGTYP_DEFAULT_SAVE_FAILED: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async saveEinheitentypDefault(einheitentyp: string, definition: ZeichenDefinition, tx?: TransactionContext): Promise<Result<DefaultZeichenEntry>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const jsonDef = definition.toJson() as unknown as Prisma.InputJsonValue;

      const result = await client.einheitentypZeichenDefault.upsert({
        where: { einheitentyp: einheitentyp as any },
        create: {
          einheitentyp: einheitentyp as any,
          zeichenDefinition: jsonDef,
        },
        update: {
          zeichenDefinition: jsonDef,
        },
      });

      return Result.ok<DefaultZeichenEntry>({
        referenzId: result.id,
        typBezeichnung: result.einheitentyp,
        zeichenDefinition: definition,
      });
    } catch (error) {
      return Result.fail(`EINHEITENTYP_DEFAULT_SAVE_FAILED: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
