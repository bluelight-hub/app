// @ts-nocheck
import { BadRequestException } from '@nestjs/common';
import { AdminSetupController } from '@/modules/admin/controllers/admin-setup.controller';
import { Result } from '@/domain/common/result';
import { CompleteSetupCommand } from '@/application/admin/commands/complete-setup.command';
import type { CompleteSetupHandler } from '@/application/admin/commands/complete-setup.handler';
import type { CompleteSetupDto } from '@/application/admin/dto/complete-setup.dto';
import type { SetupResponseDto } from '@/application/admin/dto/setup-response.dto';

/**
 * Unit Tests fuer AdminSetupController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handler mit jest.fn()
 * - Focus: Controller-Orchestration, Command-Creation, Exception-Handling
 *
 * **Coverage Target:** >80% fuer AdminSetupController
 *
 * **Test Groups:**
 * 1. completeSetup() - POST /admin/setup
 *    - Success Case: Gibt SetupResponseDto zurueck
 *    - Failure Case: Wirft BadRequestException bei bereits abgeschlossenem Setup
 *    - Failure Case: Wirft BadRequestException bei ungueltigem Command
 */
describe('AdminSetupController', () => {
  let controller: AdminSetupController;
  let mockCompleteSetupHandler: jest.Mocked<CompleteSetupHandler>;

  // Standard-Erfolgsantwort fuer Mock
  const mockSuccessResponse: SetupResponseDto = {
    user: {
      id: 'cm5abc123def456ghi789jkl0',
      username: 'admin',
      role: 'ADMIN',
    },
    accessToken: {
      token: 'blh_testtoken12345678901234',
      name: 'Initial Setup Token',
      createdAt: new Date().toISOString(),
    },
    inviteCode: {
      code: 'ABC12345',
      expiresAt: new Date().toISOString(),
      maxUses: 10,
      label: 'Initial Setup Invite',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handler (Direct Instantiation Pattern)
    mockCompleteSetupHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Instantiate controller with mocks
    controller = new AdminSetupController(mockCompleteSetupHandler);
  });

  describe('completeSetup', () => {
    it('sollte Setup erfolgreich abschliessen und SetupResponseDto zurueckgeben', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      const result = await controller.completeSetup(dto);

      // Then (Assert)
      expect(result).toEqual(mockSuccessResponse);
      expect(mockCompleteSetupHandler.execute).toHaveBeenCalledTimes(1);

      // Verify command was created correctly
      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand.username).toBe('admin');
      expect(executedCommand.password).toBe('SecurePassword123!');
    });

    it('sollte Setup ohne optionale Felder abschliessen', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      const result = await controller.completeSetup(dto);

      // Then (Assert)
      expect(result).toEqual(mockSuccessResponse);
      expect(mockCompleteSetupHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('sollte BadRequestException werfen wenn Setup bereits abgeschlossen', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.fail('SETUP_ALREADY_COMPLETED'));

      // When (Act) & Then (Assert)
      await expect(controller.completeSetup(dto)).rejects.toThrow(BadRequestException);

      try {
        await controller.completeSetup(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse() as { statusCode: number; error: string; message: string };
        // Neues Format: statusCode + error + message (6.5 Fix)
        expect(response.statusCode).toBe(400);
        expect(response.error).toBe('Bad Request');
        expect(response.message).toBe('SETUP_ALREADY_COMPLETED');
      }
    });

    it('sollte BadRequestException werfen wenn Handler mit generischem Fehler fehlschlaegt', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.fail('DATABASE_ERROR'));

      // When (Act) & Then (Assert)
      await expect(controller.completeSetup(dto)).rejects.toThrow(BadRequestException);

      try {
        await controller.completeSetup(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const badRequestError = error as BadRequestException;
        const response = badRequestError.getResponse() as { statusCode: number; error: string; message: string };
        // Neues Format: statusCode + error + message (6.5 Fix)
        expect(response.statusCode).toBe(400);
        expect(response.error).toBe('Bad Request');
        expect(response.message).toBe('DATABASE_ERROR');
      }
    });

    it('sollte BadRequestException werfen wenn Command-Erstellung fehlschlaegt (zu kurzer Nutzername)', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'ab', // Zu kurz - muss mindestens 3 Zeichen haben
        password: 'SecurePassword123!',
      };

      // When (Act) & Then (Assert)
      await expect(controller.completeSetup(dto)).rejects.toThrow(BadRequestException);

      // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
      expect(mockCompleteSetupHandler.execute).not.toHaveBeenCalled();
    });

    it('sollte BadRequestException werfen wenn Command-Erstellung fehlschlaegt (zu kurzes Passwort)', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin',
        password: '1234567', // Nur 7 Zeichen - muss mindestens 8 haben
      };

      // When (Act) & Then (Assert)
      await expect(controller.completeSetup(dto)).rejects.toThrow(BadRequestException);

      // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
      expect(mockCompleteSetupHandler.execute).not.toHaveBeenCalled();
    });

    it('sollte BadRequestException werfen wenn Command-Erstellung fehlschlaegt (ungueltige Zeichen im Nutzernamen)', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin@test', // @ ist nicht erlaubt
        password: 'SecurePassword123!',
      };

      // When (Act) & Then (Assert)
      await expect(controller.completeSetup(dto)).rejects.toThrow(BadRequestException);

      // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
      expect(mockCompleteSetupHandler.execute).not.toHaveBeenCalled();
    });

    it('sollte Nutzername normalisieren (Kleinschreibung)', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'ADMIN',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.completeSetup(dto);

      // Then (Assert)
      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand.username).toBe('admin'); // Kleinschreibung
    });

    it('sollte Nutzername trimmen', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: '  admin  ',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.completeSetup(dto);

      // Then (Assert)
      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand.username).toBe('admin'); // Getrimmt
    });

    it('sollte Nutzername trimmen und normalisieren', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: '  Admin  ',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.completeSetup(dto);

      // Then (Assert)
      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand.username).toBe('admin'); // getrimmt und lowercase
    });

    it('sollte mit Underscore im Nutzernamen funktionieren', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin_user',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.completeSetup(dto);

      // Then (Assert)
      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand.username).toBe('admin_user');
    });

    it('sollte mit numerischem Nutzernamen funktionieren', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin123',
        password: 'SecurePassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.completeSetup(dto);

      // Then (Assert)
      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand.username).toBe('admin123');
    });
  });

  describe('Decorator Validation', () => {
    it('sollte Controller Instanz erfolgreich erstellen', () => {
      // Then (Assert)
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AdminSetupController);
    });

    it('sollte completeSetup Methode haben', () => {
      // Then (Assert)
      expect(controller.completeSetup).toBeDefined();
      expect(typeof controller.completeSetup).toBe('function');
    });
  });

  describe('Handler Integration', () => {
    it('sollte Handler mit korrektem Command aufrufen', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'testadmin',
        password: 'TestPassword123!',
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.completeSetup(dto);

      // Then (Assert)
      expect(mockCompleteSetupHandler.execute).toHaveBeenCalledTimes(1);

      const executedCommand = mockCompleteSetupHandler.execute.mock.calls[0]?.[0]!;
      expect(executedCommand).toBeInstanceOf(CompleteSetupCommand);
      expect(executedCommand.username).toBe('testadmin');
      expect(executedCommand.password).toBe('TestPassword123!');
    });

    it('sollte Handler-Ergebnis direkt zurueckgeben (kein Wrapper)', async () => {
      // Given (Arrange)
      const dto: CompleteSetupDto = {
        username: 'admin',
        password: 'SecurePassword123!',
      };

      const customResponse: SetupResponseDto = {
        user: {
          id: 'custom-id-123',
          username: 'admin',
          role: 'ADMIN',
        },
        accessToken: {
          token: 'blh_customtoken456',
          name: 'Initial Setup Token',
          createdAt: '2026-01-06T12:00:00.000Z',
        },
        inviteCode: {
          code: 'XYZ67890',
          expiresAt: '2026-01-13T12:00:00.000Z',
          maxUses: 10,
          label: 'Initial Setup Invite',
        },
      };

      mockCompleteSetupHandler.execute.mockResolvedValue(Result.ok(customResponse));

      // When (Act)
      const result = await controller.completeSetup(dto);

      // Then (Assert)
      // Der Controller gibt die SetupResponseDto direkt zurueck
      // TransformInterceptor wrappt sie dann in WrappedResponse
      expect(result).toBe(customResponse);
    });
  });
});
