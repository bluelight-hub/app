import { Result } from '@domain/common/result';
import type { IEinsatzRepository } from '@domain/repositories';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';

export const createMockEinsatzRepository = (): jest.Mocked<IEinsatzRepository> =>
  ({
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn(),
    findActive: jest.fn(),
    findByNummer: jest.fn(),
    exists: jest.fn(),
    countByStatus: jest.fn(),
    findAllPaginated: jest.fn(),
    findEligibleForArchival: jest.fn(),
    findPreviousId: jest.fn(),
    findNextId: jest.fn(),
    getNextSequenceNumber: jest.fn(),
  }) as unknown as jest.Mocked<IEinsatzRepository>;

export const createMockErinnerungRepository = (): jest.Mocked<IErinnerungRepository> =>
  ({
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn(),
    findByEinsatzId: jest.fn(),
    exists: jest.fn(),
    findOverdue: jest.fn(),
    getStatistik: jest.fn(),
    getPersonStatistik: jest.fn(),
    getZeitverlaufStatistik: jest.fn(),
    getEskalationsAnalyse: jest.fn(),
    getReaktionszeitStatistik: jest.fn(),
    findActiveChildByParentId: jest.fn(),
    getErinnerungenForExport: jest.fn(),
    getFuehrungsrhythmusStatistik: jest.fn(),
    getVergleichsStatistik: jest.fn(),
    getErinnerungenForRawExport: jest.fn(),
  }) as unknown as jest.Mocked<IErinnerungRepository>;

export const createMockQualifikationRepository = (): jest.Mocked<IQualifikationRepository> =>
  ({
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn(),
    findByAbkuerzung: jest.fn(),
    findAll: jest.fn(),
    exists: jest.fn(),
    existsMany: jest.fn(),
    findByIds: jest.fn(),
  }) as unknown as jest.Mocked<IQualifikationRepository>;

export const asJestMock = <T extends (...args: never[]) => unknown>(fn: T): jest.MockedFunction<T> => fn as unknown as jest.MockedFunction<T>;
