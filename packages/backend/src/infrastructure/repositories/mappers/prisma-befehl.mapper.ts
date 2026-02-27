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

    // befehlsgeberId ist jetzt optional
    let befehlsgeberId: UserId | undefined;
    if (prismaBefehl.befehlsgeberId) {
      const befehlsgeberIdResult = UserId.create(prismaBefehl.befehlsgeberId);
      if (befehlsgeberIdResult.isFailure) {
        throw new Error(`Ungültige BefehlsgeberId: ${prismaBefehl.befehlsgeberId}`);
      }
      befehlsgeberId = befehlsgeberIdResult.value!;
    }

    // erstellerId kann null sein bei anonymisierten Befehlen (DSGVO Story 5.5)
    let erstellerId: UserId | undefined;
    if (prismaBefehl.erstellerId) {
      const erstellerIdResult = UserId.create(prismaBefehl.erstellerId);
      if (erstellerIdResult.isFailure) {
        throw new Error(`Ungültige ErstellerId: ${prismaBefehl.erstellerId}`);
      }
      erstellerId = erstellerIdResult.value!;
    }

    // Map Child-Entities
    const empfaenger = prismaBefehl.empfaenger.map((e) => {
      let empfaengerId: UserId | undefined;
      if (e.empfaengerId) {
        const empfaengerIdResult = UserId.create(e.empfaengerId);
        if (empfaengerIdResult.isFailure) {
          throw new Error(`Ungültige EmpfaengerId: ${e.empfaengerId}`);
        }
        empfaengerId = empfaengerIdResult.value!;
      }
      return BefehlEmpfaenger.reconstitute(
        e.id,
        (e as PrismaBefehlEmpfaenger & { name: string }).name,
        empfaengerId,
        e.zugestelltAm ?? undefined,
        e.quittiertAm ?? undefined,
        (e.quittierungArt as QuittierungArt) ?? undefined,
        (e as PrismaBefehlEmpfaenger & { quittierungKommentar: string | null }).quittierungKommentar ?? undefined,
        e.createdAt,
      );
    });

    const kommentare = prismaBefehl.kommentare.map((k) => {
      // authorId kann null sein bei anonymisierten Kommentaren (DSGVO Story 5.5)
      let authorId: UserId | undefined;
      if (k.authorId) {
        const authorIdResult = UserId.create(k.authorId);
        if (authorIdResult.isFailure) {
          throw new Error(`Ungültige AuthorId: ${k.authorId}`);
        }
        authorId = authorIdResult.value!;
      }
      return BefehlKommentar.reconstitute(k.id, authorId, k.text, k.isRueckfrage, k.parentId ?? undefined, k.createdAt);
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
      befehlsgeberName: (prismaBefehl as PrismaBefehl & { befehlsgeberName: string }).befehlsgeberName,
      befehlsgeberId,
      erstellerId,
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
      isDeleted: prismaBefehl.isDeleted,
      deletedAt: prismaBefehl.deletedAt ?? undefined,
      deletedBy: prismaBefehl.deletedBy ?? undefined,
      anonymisiertAm: prismaBefehl.anonymisiertAm ?? undefined,
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
      befehlsgeberName: befehl.befehlsgeberName,
      befehlsgeberId: befehl.befehlsgeberId?.value ?? null,
      erstellerId: befehl.erstellerId?.value ?? null,
      status: befehl.status.value as 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' | 'KORRIGIERT',
      erteiltAm: befehl.erteiltAm,
      zeitvorgabe: befehl.zeitvorgabe ?? null,
      ereignis: befehl.ereignis ?? null,
      mittel: befehl.mittel ?? null,
      ziel: befehl.ziel ?? null,
      weg: befehl.weg ?? null,
      originalBefehlId: befehl.originalBefehlId?.value ?? null,
      isDeleted: befehl.isDeleted,
      deletedAt: befehl.deletedAt ?? null,
      deletedBy: befehl.deletedBy ?? null,
      anonymisiertAm: befehl.anonymisiertAm ?? null,
      empfaenger: befehl.empfaenger.map((e) => ({
        id: e.id,
        name: e.name,
        ...(e.empfaengerId ? { empfaenger: { connect: { id: e.empfaengerId.value } } } : {}),
        zugestelltAm: e.zugestelltAm ?? null,
        quittiertAm: e.quittiertAm ?? null,
        quittierungArt: e.quittierungArt ?? null,
        quittierungKommentar: e.quittierungKommentar ?? null,
        createdAt: e.createdAt,
      })),
      kommentare: befehl.kommentare.map((k) => ({
        id: k.id,
        ...(k.authorId ? { author: { connect: { id: k.authorId.value } } } : {}),
        text: k.text,
        isRueckfrage: k.isRueckfrage,
        ...(k.parentId ? { parent: { connect: { id: k.parentId } } } : {}),
        createdAt: k.createdAt,
      })),
    };
  }
}
