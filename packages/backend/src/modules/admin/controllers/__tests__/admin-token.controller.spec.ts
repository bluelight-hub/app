import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AdminTokenController } from '@/modules/admin/controllers/admin-token.controller';
import { Result } from '@/domain/common/result';
import type { CreateAccessTokenHandler } from '@/application/admin/commands/create-access-token.handler';
import type { CreateAccessTokenDto } from '@/application/admin/dto/create-access-token.dto';
import type { CreateAccessTokenResponseDto } from '@/application/admin/dto/create-access-token-response.dto';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ACCESS_TOKEN_ERROR_CODES } from '@/application/admin/errors/access-token-error.codes';

/**
 * Unit Tests fuer AdminTokenController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handler mit jest.fn()
 * - Focus: Controller-Orchestration, Command-Creation, Exception-Handling
 *
 * **Coverage Target:** >80% fuer AdminTokenController
 *
 * **Test Groups:**
 * 1. createToken() - POST /admin/tokens
 *    - Success Case: Gibt CreateAccessTokenResponseDto zurueck
 *    - Failure Case: Wirft BadRequestException bei Name-Validierungsfehlern
 *    - Failure Case: Wirft InternalServerErrorException bei technischen Fehlern
 *
 * **Note:**
 * - Auth Guards (401/403) werden auf Controller-Ebene gemockt/nicht getestet,
 *   da Guards in NestJS separate Middleware sind
 * - Rate Limiting ist Throttler-Decorator und wird nicht im Unit-Test abgedeckt
 */
describe('AdminTokenController', () => {
  let controller: AdminTokenController;
  let mockCreateAccessTokenHandler: jest.Mocked<CreateAccessTokenHandler>;

  // Standard-Erfolgsantwort fuer Mock
  const mockSuccessResponse: CreateAccessTokenResponseDto = {
    token: 'blh_abc123def456ghi789jkl012mno345pqr678',
    name: 'CI/CD Pipeline Token',
    prefix: 'blh_abc12345',
    createdAt: '2026-01-12T10:30:00.000Z',
  };

  // Standard-Admin-User fuer Mock
  const mockAdminUser: ValidatedUser = {
    userId: 'user_admin123',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handler (Direct Instantiation Pattern)
    mockCreateAccessTokenHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Instantiate controller with mocks
    controller = new AdminTokenController(mockCreateAccessTokenHandler);
  });

  describe('createToken()', () => {
    describe('Success Cases', () => {
      it('sollte Access-Token erfolgreich erstellen und CreateAccessTokenResponseDto zurueckgeben', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'CI/CD Pipeline Token',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        const result = await controller.createToken(dto, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockSuccessResponse);
        expect(mockCreateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);

        // Verify command was created correctly
        const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.name).toBe('CI/CD Pipeline Token');
        expect(executedCommand.createdById).toBe(mockAdminUser.userId);
      });

      it('sollte Token mit minimalem Namen (3 Zeichen) erstellen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'ABC',
        };

        const responseWithMinName: CreateAccessTokenResponseDto = {
          ...mockSuccessResponse,
          name: 'ABC',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(responseWithMinName));

        // When (Act)
        const result = await controller.createToken(dto, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(responseWithMinName);
        expect(mockCreateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);

        const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.name).toBe('ABC');
      });

      it('sollte Token mit maximalem Namen (50 Zeichen) erstellen', async () => {
        // Given (Arrange)
        const maxName = 'A'.repeat(50);
        const dto: CreateAccessTokenDto = {
          name: maxName,
        };

        const responseWithMaxName: CreateAccessTokenResponseDto = {
          ...mockSuccessResponse,
          name: maxName,
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(responseWithMaxName));

        // When (Act)
        const result = await controller.createToken(dto, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(responseWithMaxName);
        const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.name).toHaveLength(50);
      });

      it('sollte Name mit Whitespace am Anfang/Ende trimmen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: '  Test Token  ',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createToken(dto, mockAdminUser);

        // Then (Assert)
        const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.name).toBe('Test Token');
      });
    });

    describe('Command Validation Failures', () => {
      it('sollte BadRequestException werfen wenn Name leer ist', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: '',
        };

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(BadRequestException);

        // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
        expect(mockCreateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn Name nur Whitespace ist', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: '   ',
        };

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException mit korrektem Error-Code werfen (ACCESS_TOKEN_NAME_EMPTY)', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: '',
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createToken(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { code: string };
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY);
        }
      });

      it('sollte BadRequestException werfen wenn Name zu kurz ist (< 3 Zeichen)', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'AB',
        };

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException mit ACCESS_TOKEN_NAME_TOO_SHORT werfen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'AB',
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createToken(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { code: string };
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
        }
      });

      it('sollte BadRequestException werfen wenn Name zu lang ist (> 50 Zeichen)', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'A'.repeat(51),
        };

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException mit ACCESS_TOKEN_NAME_TOO_LONG werfen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'A'.repeat(51),
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createToken(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { code: string };
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG);
        }
      });
    });

    describe('Handler Execution Failures', () => {
      it('sollte InternalServerErrorException werfen wenn Handler mit CREATION_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        expect(mockCreateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit SAVE_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit TOKEN_HASH_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit unbekanntem Fehler fehlschlaegt', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.fail('UNKNOWN_ERROR'));

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        expect(mockCreateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte Exception werfen wenn Handler undefined value zurueckgibt', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };

        // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(undefined as any));

        // When (Act) & Then (Assert)
        await expect(controller.createToken(dto, mockAdminUser)).rejects.toThrow();
      });
    });

    describe('User Context', () => {
      it('sollte createdById aus ValidatedUser korrekt an Command weitergeben', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };
        const customUser: ValidatedUser = {
          userId: 'custom_admin_789',
          role: 'SUPER_ADMIN',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createToken(dto, customUser);

        // Then (Assert)
        const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.createdById).toBe('custom_admin_789');
      });

      it('sollte mit ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };
        const adminUser: ValidatedUser = {
          userId: 'admin_user_123',
          role: 'ADMIN',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        const result = await controller.createToken(dto, adminUser);

        // Then (Assert)
        expect(result).toEqual(mockSuccessResponse);
      });

      it('sollte mit SUPER_ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'Test Token',
        };
        const superAdminUser: ValidatedUser = {
          userId: 'super_admin_456',
          role: 'SUPER_ADMIN',
        };

        mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        const result = await controller.createToken(dto, superAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('Error Message Mapping', () => {
      it('sollte ACCESS_TOKEN_NAME_EMPTY zu benutzerfreundlicher Nachricht mappen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: '',
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createToken(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string };
          expect(response.message).toContain('leer');
        }
      });

      it('sollte ACCESS_TOKEN_NAME_TOO_SHORT zu benutzerfreundlicher Nachricht mappen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'AB',
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createToken(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string };
          expect(response.message).toContain('3');
          expect(response.message).toContain('Zeichen');
        }
      });

      it('sollte ACCESS_TOKEN_NAME_TOO_LONG zu benutzerfreundlicher Nachricht mappen', async () => {
        // Given (Arrange)
        const dto: CreateAccessTokenDto = {
          name: 'A'.repeat(51),
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createToken(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string };
          expect(response.message).toContain('50');
          expect(response.message).toContain('Zeichen');
        }
      });
    });
  });

  describe('Decorator Validation', () => {
    it('sollte Controller Instanz erfolgreich erstellen', () => {
      // Then (Assert)
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AdminTokenController);
    });

    it('sollte createToken Methode haben', () => {
      // Then (Assert)
      expect(controller.createToken).toBeDefined();
      expect(typeof controller.createToken).toBe('function');
    });
  });

  describe('Handler Integration', () => {
    it('sollte Handler mit korrektem Command aufrufen', async () => {
      // Given (Arrange)
      const dto: CreateAccessTokenDto = {
        name: 'Integration Test Token',
      };

      mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createToken(dto, mockAdminUser);

      // Then (Assert)
      expect(mockCreateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);

      const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
      expect(executedCommand.name).toBe('Integration Test Token');
      expect(executedCommand.createdById).toBe(mockAdminUser.userId);
    });

    it('sollte Handler-Ergebnis direkt zurueckgeben (kein Wrapper)', async () => {
      // Given (Arrange)
      const dto: CreateAccessTokenDto = {
        name: 'Test Token',
      };

      const customResponse: CreateAccessTokenResponseDto = {
        token: 'blh_custom123456789012345678901234567',
        name: 'Custom Token',
        prefix: 'blh_custom12',
        createdAt: '2026-01-12T15:00:00.000Z',
      };

      mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(customResponse));

      // When (Act)
      const result = await controller.createToken(dto, mockAdminUser);

      // Then (Assert)
      // Der Controller gibt die CreateAccessTokenResponseDto direkt zurueck
      // TransformInterceptor wrappt sie dann in WrappedResponse
      expect(result).toBe(customResponse);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit Name am Grenzwert (3 Zeichen) funktionieren', async () => {
      // Given (Arrange)
      const dto: CreateAccessTokenDto = {
        name: 'ABC',
      };

      mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createToken(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
      expect(executedCommand.name).toHaveLength(3);
    });

    it('sollte mit Name am Grenzwert (50 Zeichen) funktionieren', async () => {
      // Given (Arrange)
      const dto: CreateAccessTokenDto = {
        name: 'A'.repeat(50),
      };

      mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createToken(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
      expect(executedCommand.name).toHaveLength(50);
    });

    it('sollte Name mit Sonderzeichen akzeptieren', async () => {
      // Given (Arrange)
      const dto: CreateAccessTokenDto = {
        name: 'CI/CD Pipeline (Prod)',
      };

      mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createToken(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
      expect(executedCommand.name).toBe('CI/CD Pipeline (Prod)');
    });

    it('sollte Name mit Unicode akzeptieren', async () => {
      // Given (Arrange)
      const dto: CreateAccessTokenDto = {
        name: 'Test-Token für Produktion',
      };

      mockCreateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createToken(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateAccessTokenHandler.execute.mock.calls[0][0];
      expect(executedCommand.name).toBe('Test-Token für Produktion');
    });
  });
});

/**
 * Integration Test Notes (E2E):
 *
 * Die folgenden Tests erfordern echte NestJS Integration und werden hier dokumentiert:
 *
 * 1. **401 Unauthorized (No Auth)**
 *    - Request ohne adminToken Cookie soll 401 zurueckgeben
 *    - AdminJwtAuthGuard verwirft Request bevor Controller erreicht wird
 *    - Test in E2E: `supertest(app).post('/admin/tokens').send(dto).expect(401)`
 *
 * 2. **403 Forbidden (Non-Admin User)**
 *    - Request mit gueltigem JWT aber ohne Admin-Rolle soll 403 zurueckgeben
 *    - AdminJwtStrategy prueft isAdmin Flag und wirft ForbiddenException
 *    - Test in E2E: Mit USER-Role Token authentifizieren, dann POST /admin/tokens
 *
 * 3. **429 Too Many Requests (Rate Limiting)**
 *    - @Throttle({ default: { limit: 10, ttl: 60000 } })
 *    - Nach 10 Requests in 60s soll 429 zurueckgegeben werden
 *    - Test in E2E: 11 Requests schnell hintereinander senden
 *    - Note: ThrottlerGuard muss in Test-Module konfiguriert sein
 *
 * Diese E2E Tests erfordern:
 * - NestJS Test Module mit echten Guards
 * - Supertest fuer HTTP-Requests
 * - Authentifizierung mit echten JWT-Tokens
 * - ThrottlerModule Konfiguration
 */
