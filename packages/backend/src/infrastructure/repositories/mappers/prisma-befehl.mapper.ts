import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import type { QuittierungArt } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { Befehl as PrismaBefehl, BefehlEmpfaenger as PrismaBefehlEmpfaenger, BefehlKommentar as PrismaBefehlKommentar } from '@/generated/prisma/client';

/**
 * Prisma Befehl mit eager-loaded Child-Entities.
 */
type BefehlWithRelations = PrismaBefehl & {
  empfaenger: PrismaBefehlEmpfaenger[];
  kommentare: PrismaBefehlKommentar[];
};

/**
 * Bidirektionaler Mapper: Befehl Aggregate ↔ Prisma Model.
 *
 * - toDomain(): Prisma → Befehl Aggregate (via reconstitute(), keine Events)
 * - toPersistence(): Befehl Aggregate → Prisma-kompatible Daten
 */
export class PrismaBefehlMapper {
  /**
   * Konvertiert Prisma Befehl (mit Relations) zu Domain Befehl Aggregate.
   * Nutzt Befehl.reconstitute() — KEINE Domain Events.
   */
  static toDomain(prismaBefehl: BefehlWithRelations): Befehl {
    const befehlIdResult = BefehlId.create(prismaBefehl.id);
    if (befehlIdResult.isFailure) {
      throw new Error(`Ungültige BefehlId: ${prismaBefehl.id}`);
    }

    const einsatzIdResult = EinsatzId.create(prismaBefehl.einsatzId);
    if (einsatzIdResult.isFailure) {
      throw new Error(`Ungültige EinsatzId: ${prismaBefehl.einsatzId}`);
    }

    const statusResult = BefehlStatus.create(prismaBefehl.status);
    if (statusResult.isFailure) {
      throw new Error(`Ungültiger BefehlStatus: ${prismaBefehl.status}`);
    }

    const befehlsgeberIdResult = UserId.create(prismaBefehl.befehlsgeberId);
    if (befehlsgeberIdResult.isFailure) {
      throw new Error(`Ungültige BefehlsgeberId: ${prismaBefehl.befehlsgeberId}`);
    }

    const erstellerIdResult = UserId.create(prismaBefehl.erstellerId);
    if (erstellerIdResult.isFailure) {
      throw new Error(`Ungültige ErstellerId: ${prismaBefehl.erstellerId}`);
    }

    // Map Child-Entities
    const empfaenger = prismaBefehl.empfaenger.map((e) => {
      const empfaengerIdResult = UserId.create(e.empfaengerId);
      if (empfaengerIdResult.isFailure) {
        throw new Error(`Ungültige EmpfaengerId: ${e.empfaengerId}`);
      }
      return BefehlEmpfaenger.reconstitute(e.id, empfaengerIdResult.value!, e.zugestelltAm ?? undefined, e.quittiertAm ?? undefined, (e.quittierungArt as QuittierungArt) ?? undefined, e.createdAt);
    });

    const kommentare = prismaBefehl.kommentare.map((k) => {
      const authorIdResult = UserId.create(k.authorId);
      if (authorIdResult.isFailure) {
        throw new Error(`Ungültige AuthorId: ${k.authorId}`);
      }
      return BefehlKommentar.reconstitute(k.id, authorIdResult.value!, k.text, k.isRueckfrage, k.parentId ?? undefined, k.createdAt);
    });

    // Optional: originalBefehlId
    let originalBefehlId: BefehlId | undefined;
    if (prismaBefehl.originalBefehlId) {
      const originalIdResult = BefehlId.create(prismaBefehl.originalBefehlId);
      if (originalIdResult.isFailure) {
        throw new Error(`Ungültige OriginalBefehlId: ${prismaBefehl.originalBefehlId}`);
      }
      originalBefehlId = originalIdResult.value! as BefehlId;
    }

    return Befehl.reconstitute({
      id: befehlIdResult.value! as BefehlId,
      nummer: prismaBefehl.nummer,
      einsatzId: einsatzIdResult.value! as EinsatzId,
      auftrag: prismaBefehl.auftrag,
      befehlsgeberId: befehlsgeberIdResult.value!,
      erstellerId: erstellerIdResult.value!,
      status: statusResult.value!,
      erteiltAm: prismaBefehl.erteiltAm,
      empfaenger,
      kommentare,
      zeitvorgabe: prismaBefehl.zeitvorgabe ?? undefined,
      ereignis: prismaBefehl.ereignis ?? undefined,
      mittel: prismaBefehl.mittel ?? undefined,
      ziel: prismaBefehl.ziel ?? undefined,
      weg: prismaBefehl.weg ?? undefined,
      originalBefehlId,
      createdAt: prismaBefehl.createdAt,
      updatedAt: prismaBefehl.updatedAt,
    });
  }

  /**
   * Konvertiert Befehl Aggregate zu Prisma-kompatiblen Daten für Upsert.
   * Flattened Value Objects → Primitives, nested create für Child-Entities.
   */
  static toPersistence(befehl: Befehl) {
    return {
      id: befehl.id.value,
      nummer: befehl.nummer,
      einsatzId: befehl.einsatzId.value,
      auftrag: befehl.auftrag,
      befehlsgeberId: befehl.befehlsgeberId.value,
      erstellerId: befehl.erstellerId.value,
      status: befehl.status.value as 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' | 'KORRIGIERT',
      erteiltAm: befehl.erteiltAm,
      zeitvorgabe: befehl.zeitvorgabe ?? null,
      ereignis: befehl.ereignis ?? null,
      mittel: befehl.mittel ?? null,
      ziel: befehl.ziel ?? null,
      weg: befehl.weg ?? null,
      originalBefehlId: befehl.originalBefehlId?.value ?? null,
      empfaenger: befehl.empfaenger.map((e) => ({
        id: e.id,
        empfaengerId: e.empfaengerId.value,
        zugestelltAm: e.zugestelltAm ?? null,
        quittiertAm: e.quittiertAm ?? null,
        quittierungArt: e.quittierungArt ?? null,
        createdAt: e.createdAt,
      })),
      kommentare: befehl.kommentare.map((k) => ({
        id: k.id,
        authorId: k.authorId.value,
        text: k.text,
        isRueckfrage: k.isRueckfrage,
        parentId: k.parentId ?? null,
        createdAt: k.createdAt,
      })),
    };
  }
}
