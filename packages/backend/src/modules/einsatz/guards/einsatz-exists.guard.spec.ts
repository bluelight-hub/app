import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EinsatzService } from '../einsatz.service';
import { EinsatzExistsGuard } from './einsatz-exists.guard';

describe('EinsatzExistsGuard', () => {
  let guard: EinsatzExistsGuard;
  let einsatzService: jest.Mocked<EinsatzService>;

  // Mock ExecutionContext
  const createMockExecutionContext = (einsatzId?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          params: einsatzId ? { einsatzId } : {},
        }),
      }),
    } as ExecutionContext;
  };

  // Mock EinsatzService
  const mockEinsatzService = {
    findById: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EinsatzExistsGuard,
        {
          provide: EinsatzService,
          useValue: mockEinsatzService,
        },
      ],
    }).compile();

    guard = module.get<EinsatzExistsGuard>(EinsatzExistsGuard);
    einsatzService = module.get(EinsatzService) as jest.Mocked<EinsatzService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Instanziierung', () => {
    it('sollte definiert sein', () => {
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(EinsatzExistsGuard);
    });

    it('sollte EinsatzService injiziert haben', () => {
      expect(einsatzService).toBeDefined();
    });
  });

  describe('canActivate', () => {
    it('sollte true zurückgeben wenn Einsatz existiert', async () => {
      // Arrange
      const einsatzId = 'existing-einsatz-123';
      const context = createMockExecutionContext(einsatzId);
      const mockEinsatz = { id: einsatzId, name: 'Test Einsatz' };

      einsatzService.findById.mockResolvedValue(mockEinsatz as any);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(einsatzService.findById).toHaveBeenCalledWith(einsatzId);
      expect(einsatzService.findById).toHaveBeenCalledTimes(1);
    });

    it('sollte NotFoundException werfen wenn EinsatzId fehlt', async () => {
      // Arrange
      const context = createMockExecutionContext(); // Keine einsatzId

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('EinsatzId missing');

      expect(einsatzService.findById).not.toHaveBeenCalled();
    });

    it('sollte NotFoundException werfen wenn EinsatzId leer ist', async () => {
      // Arrange
      const context = createMockExecutionContext(''); // Leere einsatzId

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('EinsatzId missing');

      expect(einsatzService.findById).not.toHaveBeenCalled();
    });

    it('sollte Exception weiterleiten wenn EinsatzService.findById fehlschlägt', async () => {
      // Arrange
      const einsatzId = 'non-existing-einsatz-456';
      const context = createMockExecutionContext(einsatzId);
      const notFoundError = new NotFoundException(`Einsatz mit ID ${einsatzId} nicht gefunden`);

      einsatzService.findById.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);

      expect(einsatzService.findById).toHaveBeenCalledWith(einsatzId);
      expect(einsatzService.findById).toHaveBeenCalledTimes(1);
    });

    it('sollte mit verschiedenen EinsatzId-Formaten funktionieren', async () => {
      // Test verschiedene gültige ID-Formate
      const testCases = ['einsatz-123', 'abc-def-ghi', '12345', 'test_einsatz_id', 'UPPERCASE-ID'];

      for (const einsatzId of testCases) {
        // Arrange
        const context = createMockExecutionContext(einsatzId);
        const mockEinsatz = { id: einsatzId, name: 'Test Einsatz' };

        einsatzService.findById.mockResolvedValue(mockEinsatz as any);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(einsatzService.findById).toHaveBeenCalledWith(einsatzId);

        // Reset for next iteration
        jest.clearAllMocks();
      }
    });

    it('sollte mit allgemeinen Fehlern von EinsatzService umgehen', async () => {
      // Arrange
      const einsatzId = 'some-einsatz-id';
      const context = createMockExecutionContext(einsatzId);
      const genericError = new Error('Database connection failed');

      einsatzService.findById.mockRejectedValue(genericError);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Database connection failed');

      expect(einsatzService.findById).toHaveBeenCalledWith(einsatzId);
    });
  });

  describe('Integration mit ExecutionContext', () => {
    it('sollte korrekt mit Request-Parametern arbeiten', async () => {
      // Arrange
      const einsatzId = 'integration-test-id';

      // Simuliere realistischeren ExecutionContext
      const mockRequest = {
        params: { einsatzId },
        method: 'GET',
        url: `/api/einsatz/${einsatzId}`,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockEinsatz = { id: einsatzId, name: 'Integration Test Einsatz' };
      einsatzService.findById.mockResolvedValue(mockEinsatz as any);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(einsatzService.findById).toHaveBeenCalledWith(einsatzId);
    });

    it('sollte mit falsy EinsatzId-Werten umgehen', async () => {
      const falsyValues = [null, undefined, 0, false];

      for (const falsyValue of falsyValues) {
        // Arrange
        const mockRequest = {
          params: { einsatzId: falsyValue },
        };

        const context = {
          switchToHttp: () => ({
            getRequest: () => mockRequest,
          }),
        } as ExecutionContext;

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
        await expect(guard.canActivate(context)).rejects.toThrow('EinsatzId missing');

        expect(einsatzService.findById).not.toHaveBeenCalled();

        // Reset for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit async/await Fehlern korrekt umgehen', async () => {
      // Arrange
      const einsatzId = 'async-error-test';
      const context = createMockExecutionContext(einsatzId);

      // Simuliere timeout oder async Fehler
      einsatzService.findById.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Async operation failed')), 10);
        });
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow('Async operation failed');
      expect(einsatzService.findById).toHaveBeenCalledWith(einsatzId);
    });

    it('sollte Performance bei wiederholten Aufrufen beibehalten', async () => {
      // Arrange
      const einsatzId = 'performance-test-id';
      const context = createMockExecutionContext(einsatzId);
      const mockEinsatz = { id: einsatzId, name: 'Performance Test' };

      einsatzService.findById.mockResolvedValue(mockEinsatz as any);

      // Act - Mehrfache Aufrufe
      const promises = Array.from({ length: 10 }, () => guard.canActivate(context));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toEqual(Array(10).fill(true));
      expect(einsatzService.findById).toHaveBeenCalledTimes(10);
    });
  });
});
