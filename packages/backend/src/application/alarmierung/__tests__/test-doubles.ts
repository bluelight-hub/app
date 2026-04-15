import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/**
 * Shared Test-Doubles für Alarmierungs-Application-Specs.
 *
 * Hält die Mock-Konstruktion an einer Stelle, damit die einzelnen Specs
 * nicht 6× dieselben `jest.fn()`-Listen wiederholen. Die zurückgegebenen
 * Mocks sind getypt — kein `any`, kein `@ts-nocheck` nötig.
 *
 * **Scope:** Bewusst nur für T3 / Application Layer; Infrastructure-Tests
 * nutzen eigene Test-Doubles.
 */

export type AlarmierungRepoMock = jest.Mocked<IAlarmierungRepository>;

/**
 * Liefert ein vollständiges {@link AlarmierungRepoMock}-Objekt.
 *
 * Default-Returns:
 * - `save` → Promise<void>
 * - `findById` → null (kann pro Test überschrieben werden)
 * - `findByEinsatzId` → []
 * - `findAktiveByFahrzeugId` → []
 */
export function createAlarmierungRepoMock(): AlarmierungRepoMock {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByEinsatzId: jest.fn().mockResolvedValue([]),
    findAktiveByFahrzeugId: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Minimal-Mock für `IOutboxRepository`. Wir benutzen nur `save`.
 */
export type OutboxRepoMock = Pick<jest.Mocked<IOutboxRepository>, 'save'>;

export function createOutboxRepoMock(): OutboxRepoMock {
  return {
    save: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Minimal-Mock für `PrismaService`, der nur `$transaction` exponiert. Der
 * Callback wird sofort mit einem Stub-`tx`-Objekt aufgerufen — die Repos
 * im Test sind ohnehin gemockt, also reicht ein leeres Stand-In.
 */
export interface PrismaServiceMock {
  $transaction: jest.Mock;
}

export function createPrismaMock(): PrismaServiceMock {
  return {
    $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => cb({})),
  };
}

/**
 * Cast-Helfer: liefert das `PrismaService`-Symbol-kompatible Mock-Objekt.
 * Spart das `as unknown as PrismaService` bei jedem `useValue`.
 */
export function asPrismaService(mock: PrismaServiceMock): PrismaService {
  return mock as unknown as PrismaService;
}

/**
 * Minimaler Kräfte-Repo-Mock: deckt nur `findById` ab — den einzigen
 * Aufruf, den die Application-Handler tätigen.
 */
export type EinsatzFahrzeugRepoMock = Pick<jest.Mocked<IEinsatzFahrzeugRepository>, 'findById'>;
export type EinsatzPersonRepoMock = Pick<jest.Mocked<IEinsatzPersonRepository>, 'findById'>;
export type EinsatzEinheitRepoMock = Pick<jest.Mocked<IEinsatzEinheitRepository>, 'findById'>;

export function createEinsatzFahrzeugRepoMock(): EinsatzFahrzeugRepoMock {
  return { findById: jest.fn() };
}
export function createEinsatzPersonRepoMock(): EinsatzPersonRepoMock {
  return { findById: jest.fn() };
}
export function createEinsatzEinheitRepoMock(): EinsatzEinheitRepoMock {
  return { findById: jest.fn() };
}
