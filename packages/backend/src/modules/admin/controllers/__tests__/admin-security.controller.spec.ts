import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { AdminSecurityController } from '@/modules/admin/controllers/admin-security.controller';
import { Result } from '@/domain/common/result';
import type { MigrateToSecureModeHandler } from '@/application/admin/commands/migrate-to-secure-mode.handler';
import type { GetSecurityStatusHandler } from '@/application/admin/queries/get-security-status.handler';
import type { SecurityStatusDto } from '@/application/admin/dto/security-status.dto';
import type { MigrateToSecureModeRequestDto, MigrateToSecureModeResponseDto } from '@/application/admin/dto/migrate-to-secure-mode.dto';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SECURITY_ERROR_CODES } from '@/application/admin/errors/security-error.codes';
import { ACCESS_TOKEN_ERROR_CODES } from '@/application/admin/errors/access-token-error.codes';

/**
 * Unit Tests fuer AdminSecurityController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handler mit jest.fn()
 * - Focus: Controller-Orchestration, Command/Query-Creation, Exception-Handling
 *
 * **Coverage Target:** >80% fuer AdminSecurityController
 *
 * **Test Groups:**
 * 1. getStatus() - GET /admin/security/status
 *    - Success Case: Gibt SecurityStatusDto zurueck
 *    - Failure Case: Wirft BadRequestException bei Query-Validierungsfehlern
 *    - Failure Case: Wirft InternalServerErrorException bei Repository-Fehlern
 *
 * 2. migrateToSecure() - POST /admin/security/migrate-to-secure
 *    - Success Case: Gibt MigrateToSecureModeResponseDto mit Token zurueck
 *    - Failure Case: Wirft ConflictException wenn bereits im SECURE Mode (AC3)
 *    - Failure Case: Wirft BadRequestException bei Name-Validierungsfehlern
 *    - Failure Case: Wirft InternalServerErrorException bei technischen Fehlern
 *
 * **Note:**
 * - Auth Guards (401/403) werden auf Controller-Ebene gemockt/nicht getestet,
 *   da Guards in NestJS separate Middleware sind
 * - Rate Limiting (5/min) ist Throttler-Decorator und wird nicht im Unit-Test abgedeckt
 */
describe('AdminSecurityController', () => {
  let controller: AdminSecurityController;
  let mockMigrateHandler: jest.Mocked<MigrateToSecureModeHandler>;
  let mockStatusHandler: jest.Mocked<GetSecurityStatusHandler>;

  // Standard-Erfolgsantwort fuer Mock (getStatus)
  const mockSecurityStatus: SecurityStatusDto = {
    insecureMode: true,
    setupComplete: true,
    activeTokenCount: 2,
    migratedAt: null,
  };

  // Standard-Erfolgsantwort fuer Mock (migrateToSecure)
  const mockMigrationResponse: MigrateToSecureModeResponseDto = {
    success: true,
    previousMode: 'INSECURE',
    newMode: 'SECURE',
    token: 'blh_abc123def456ghi789jkl012mno345pqr678',
    tokenName: 'Primary Server Token',
    tokenPrefix: 'blh_abc12345',
    migratedAt: '2026-01-13T10:30:00.000Z',
  };

  // Standard-Admin-User fuer Mock
  const mockAdminUser: ValidatedUser = {
    userId: 'user_admin123',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handlers (Direct Instantiation Pattern)
    mockMigrateHandler = {
      execute: jest.fn(),
    } as any;

    mockStatusHandler = {
      execute: jest.fn(),
    } as any;

    // Instantiate controller with mocks
    controller = new AdminSecurityController(mockMigrateHandler, mockStatusHandler);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. getStatus() - GET /admin/security/status
  // ══════════════════════════════════════════════════════════════════════════════
  describe('getStatus()', () => {
    describe('Success Cases', () => {
      it('sollte Security-Status erfolgreich abrufen und SecurityStatusDto zurueckgeben', async () => {
        // Given (Arrange)
        mockStatusHandler.execute.mockResolvedValue(Result.ok(mockSecurityStatus));

        // When (Act)
        const result = await controller.getStatus(mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockSecurityStatus);
        expect(mockStatusHandler.execute).toHaveBeenCalledTimes(1);

        // Verify query was created with correct requestedById
        const executedQuery = mockStatusHandler.execute.mock.calls[0]?.[0];
        expect(executedQuery?.requestedById).toBe(mockAdminUser.userId);
      });

      it('sollte Status mit insecureMode=false (SECURE Mode) zurueckgeben', async () => {
        // Given (Arrange)
        const secureStatus: SecurityStatusDto = {
          insecureMode: false,
          setupComplete: true,
          activeTokenCount: 3,
          migratedAt: '2026-01-13T10:30:00.000Z',
        };

        mockStatusHandler.execute.mockResolvedValue(Result.ok(secureStatus));

        // When (Act)
        const result = await controller.getStatus(mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(secureStatus);
        expect(result.insecureMode).toBe(false);
        expect(result.migratedAt).toBe('2026-01-13T10:30:00.000Z');
      });

      it('sollte Status mit setupComplete=false zurueckgeben (keine aktiven Tokens)', async () => {
        // Given (Arrange)
        const incompleteStatus: SecurityStatusDto = {
          insecureMode: true,
          setupComplete: false,
          activeTokenCount: 0,
          migratedAt: null,
        };

        mockStatusHandler.execute.mockResolvedValue(Result.ok(incompleteStatus));

        // When (Act)
        const result = await controller.getStatus(mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(incompleteStatus);
        expect(result.setupComplete).toBe(false);
        expect(result.activeTokenCount).toBe(0);
      });

      it('sollte Status mit hoher Token-Anzahl zurueckgeben', async () => {
        // Given (Arrange)
        const statusWithManyTokens: SecurityStatusDto = {
          insecureMode: false,
          setupComplete: true,
          activeTokenCount: 100,
          migratedAt: '2026-01-01T00:00:00.000Z',
        };

        mockStatusHandler.execute.mockResolvedValue(Result.ok(statusWithManyTokens));

        // When (Act)
        const result = await controller.getStatus(mockAdminUser);

        // Then (Assert)
        expect(result.activeTokenCount).toBe(100);
      });
    });

    describe('Failure Cases', () => {
      it('sollte InternalServerErrorException werfen bei Repository-Fehler', async () => {
        // Given (Arrange)
        mockStatusHandler.execute.mockResolvedValue(Result.fail('DB_CONNECTION_ERROR'));

        // When & Then (Act & Assert)
        await expect(controller.getStatus(mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        await expect(controller.getStatus(mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            statusCode: 500,
            error: 'Internal Server Error',
          }),
        });
      });

      it('sollte InternalServerErrorException werfen bei null Ergebnis', async () => {
        // Given (Arrange)
        mockStatusHandler.execute.mockResolvedValue(Result.ok(null as unknown as SecurityStatusDto));

        // When & Then (Act & Assert)
        await expect(controller.getStatus(mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei unbekanntem Fehler', async () => {
        // Given (Arrange)
        mockStatusHandler.execute.mockResolvedValue(Result.fail('UNEXPECTED_ERROR'));

        // When & Then (Act & Assert)
        await expect(controller.getStatus(mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte BadRequestException werfen bei zu kurzem requestedById', async () => {
        // Given (Arrange) - User ID mit weniger als 8 Zeichen
        const userWithShortId: ValidatedUser = {
          userId: 'short',
          role: 'ADMIN',
        };

        // When & Then (Act & Assert)
        // Die Query-Validierung in GetSecurityStatusQuery.create() sollte fehlschlagen
        await expect(controller.getStatus(userWithShortId)).rejects.toThrow(BadRequestException);
      });

      it('sollte BadRequestException werfen bei leerem requestedById', async () => {
        // Given (Arrange)
        const userWithEmptyId: ValidatedUser = {
          userId: '',
          role: 'ADMIN',
        };

        // When & Then (Act & Assert)
        await expect(controller.getStatus(userWithEmptyId)).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. migrateToSecure() - POST /admin/security/migrate-to-secure
  // ══════════════════════════════════════════════════════════════════════════════
  describe('migrateToSecure()', () => {
    describe('Success Cases', () => {
      it('sollte Migration erfolgreich durchfuehren und MigrateToSecureModeResponseDto zurueckgeben', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Primary Server Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(mockMigrationResponse));

        // When (Act)
        const result = await controller.migrateToSecure(dto, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockMigrationResponse);
        expect(mockMigrateHandler.execute).toHaveBeenCalledTimes(1);

        // Verify command was created with correct tokenName and requestedById (Audit Trail NFR-S8)
        const executedCommand = mockMigrateHandler.execute.mock.calls[0]?.[0];
        expect(executedCommand?.tokenName).toBe('Primary Server Token');
        expect(executedCommand?.requestedById).toBe(mockAdminUser.userId);
      });

      it('sollte Migration mit Default-Token-Namen durchfuehren wenn nicht angegeben', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {};

        const responseWithDefaultName: MigrateToSecureModeResponseDto = {
          ...mockMigrationResponse,
          tokenName: 'Primary Access Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(responseWithDefaultName));

        // When (Act)
        const result = await controller.migrateToSecure(dto, mockAdminUser);

        // Then (Assert)
        expect(result.tokenName).toBe('Primary Access Token');

        // Verify default name was used
        const executedCommand = mockMigrateHandler.execute.mock.calls[0]?.[0];
        expect(executedCommand?.tokenName).toBe('Primary Access Token');
      });

      it('sollte Migration mit minimalem Token-Namen (3 Zeichen) durchfuehren', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'ABC',
        };

        const responseWithMinName: MigrateToSecureModeResponseDto = {
          ...mockMigrationResponse,
          tokenName: 'ABC',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(responseWithMinName));

        // When (Act)
        const result = await controller.migrateToSecure(dto, mockAdminUser);

        // Then (Assert)
        expect(result.tokenName).toBe('ABC');
      });

      it('sollte Migration mit maximalem Token-Namen (50 Zeichen) durchfuehren', async () => {
        // Given (Arrange)
        const maxName = 'A'.repeat(50);
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: maxName,
        };

        const responseWithMaxName: MigrateToSecureModeResponseDto = {
          ...mockMigrationResponse,
          tokenName: maxName,
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(responseWithMaxName));

        // When (Act)
        const result = await controller.migrateToSecure(dto, mockAdminUser);

        // Then (Assert)
        expect(result.tokenName).toBe(maxName);
      });

      it('sollte ein vollstaendiges Token in der Response enthalten', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(mockMigrationResponse));

        // When (Act)
        const result = await controller.migrateToSecure(dto, mockAdminUser);

        // Then (Assert)
        expect(result.token).toBeDefined();
        expect(result.token).toContain('blh_');
        expect(result.tokenPrefix).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.previousMode).toBe('INSECURE');
        expect(result.newMode).toBe('SECURE');
      });
    });

    describe('Failure Cases - ALREADY_IN_SECURE_MODE (AC3: 409 Conflict)', () => {
      it('sollte ConflictException werfen wenn Server bereits im SECURE Mode ist', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(ConflictException);
      });

      it('sollte ConflictException mit korrektem Status-Code 409 werfen', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            statusCode: 409,
            error: 'Conflict',
            code: SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE,
          }),
        });
      });

      it('sollte ConflictException mit benutzerfreundlicher Fehlermeldung werfen', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {};

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            message: expect.stringContaining('SECURE Mode'),
          }),
        });
      });
    });

    describe('Failure Cases - Token Name Validation', () => {
      it('sollte BadRequestException werfen bei zu kurzem Token-Namen (< 3 Zeichen)', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'AB',
        };

        // When & Then (Act & Assert)
        // Command.create() sollte fehlschlagen bei zu kurzem Namen
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
      });

      it('sollte BadRequestException werfen mit NAME_TOO_SHORT Error Code', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'A',
        };

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            statusCode: 400,
            error: 'Bad Request',
            code: ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT,
          }),
        });
      });

      it('sollte BadRequestException werfen bei zu langem Token-Namen (> 50 Zeichen)', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'A'.repeat(51),
        };

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
      });

      it('sollte BadRequestException werfen mit NAME_TOO_LONG Error Code', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'A'.repeat(51),
        };

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            code: ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG,
          }),
        });
      });
    });

    describe('Failure Cases - Technical Errors', () => {
      it('sollte InternalServerErrorException werfen bei CONFIG_NOT_FOUND Fehler', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(SECURITY_ERROR_CODES.CONFIG_NOT_FOUND));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei CONFIG_UPDATE_FAILED Fehler', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(SECURITY_ERROR_CODES.CONFIG_UPDATE_FAILED));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei TOKEN_GENERATION_FAILED Fehler', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(SECURITY_ERROR_CODES.TOKEN_GENERATION_FAILED));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei SAVE_FAILED Fehler', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei TOKEN_HASH_FAILED Fehler', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei unbekanntem Fehler', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.fail('UNKNOWN_ERROR'));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen bei null Ergebnis', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'Test Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(null as unknown as MigrateToSecureModeResponseDto));

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('Error Message Mapping', () => {
      it('sollte bei nur Whitespace den Default-Token-Namen verwenden', async () => {
        // Given (Arrange)
        // Whitespace wird vom Command getrimmt und DEFAULT_TOKEN_NAME verwendet
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: '   ', // Nur Whitespace -> wird Default verwendet
        };

        const responseWithDefaultName: MigrateToSecureModeResponseDto = {
          ...mockMigrationResponse,
          tokenName: 'Primary Access Token',
        };

        mockMigrateHandler.execute.mockResolvedValue(Result.ok(responseWithDefaultName));

        // When (Act)
        const result = await controller.migrateToSecure(dto, mockAdminUser);

        // Then (Assert)
        expect(result.tokenName).toBe('Primary Access Token');
      });

      it('sollte benutzerfreundliche Fehlermeldung fuer NAME_TOO_SHORT zurueckgeben', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'AB',
        };

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            message: expect.stringContaining('3 Zeichen'),
          }),
        });
      });

      it('sollte benutzerfreundliche Fehlermeldung fuer NAME_TOO_LONG zurueckgeben', async () => {
        // Given (Arrange)
        const dto: MigrateToSecureModeRequestDto = {
          tokenName: 'A'.repeat(51),
        };

        // When & Then (Act & Assert)
        await expect(controller.migrateToSecure(dto, mockAdminUser)).rejects.toMatchObject({
          response: expect.objectContaining({
            message: expect.stringContaining('50 Zeichen'),
          }),
        });
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Edge Cases und Grenzwerte
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Edge Cases', () => {
    it('sollte Token-Namen mit Sonderzeichen akzeptieren', async () => {
      // Given (Arrange)
      const dto: MigrateToSecureModeRequestDto = {
        tokenName: 'CI/CD Pipeline Token (Test)',
      };

      mockMigrateHandler.execute.mockResolvedValue(Result.ok(mockMigrationResponse));

      // When (Act)
      const result = await controller.migrateToSecure(dto, mockAdminUser);

      // Then (Assert)
      expect(mockMigrateHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('sollte Token-Namen mit Unicode-Zeichen akzeptieren', async () => {
      // Given (Arrange)
      const dto: MigrateToSecureModeRequestDto = {
        tokenName: 'Server Token Umlaute ÄÖÜ',
      };

      mockMigrateHandler.execute.mockResolvedValue(Result.ok(mockMigrationResponse));

      // When (Act)
      const result = await controller.migrateToSecure(dto, mockAdminUser);

      // Then (Assert)
      expect(mockMigrateHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('sollte Token-Namen mit nur Leerzeichen durch Default ersetzen', async () => {
      // Given (Arrange)
      // Whitespace wird vom Command getrimmt und DEFAULT_TOKEN_NAME verwendet
      const dto: MigrateToSecureModeRequestDto = {
        tokenName: '     ',
      };

      const responseWithDefaultName: MigrateToSecureModeResponseDto = {
        ...mockMigrationResponse,
        tokenName: 'Primary Access Token',
      };

      mockMigrateHandler.execute.mockResolvedValue(Result.ok(responseWithDefaultName));

      // When (Act)
      const result = await controller.migrateToSecure(dto, mockAdminUser);

      // Then (Assert) - Default-Name wird verwendet statt Ablehnung
      expect(result.tokenName).toBe('Primary Access Token');
    });

    it('sollte Token-Namen mit fuehrenden/nachfolgenden Leerzeichen trimmen', async () => {
      // Given (Arrange)
      const dto: MigrateToSecureModeRequestDto = {
        tokenName: '  Valid Token Name  ',
      };

      mockMigrateHandler.execute.mockResolvedValue(Result.ok(mockMigrationResponse));

      // When (Act)
      await controller.migrateToSecure(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockMigrateHandler.execute.mock.calls[0]?.[0];
      expect(executedCommand?.tokenName).toBe('Valid Token Name');
    });
  });
});
