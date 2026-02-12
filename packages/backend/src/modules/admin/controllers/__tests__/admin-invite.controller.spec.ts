import { BadRequestException } from '@nestjs/common';
import { AdminInviteController } from '@/modules/admin/controllers/admin-invite.controller';
import { Result } from '@/domain/common/result';
import type { CreateInviteHandler } from '@/application/admin/commands/create-invite.handler';
import type { ListInvitesHandler } from '@/application/admin/queries/list-invites.handler';
import type { RevokeInviteHandler } from '@/application/admin/commands/revoke-invite.handler';
import { CreateInviteDto } from '@/application/admin/dto/create-invite.dto';
import type { CreateInviteResponseDto } from '@/application/admin/dto/create-invite-response.dto';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { INVITE_ERROR_CODES } from '@/application/admin/errors/invite-error.codes';

/** Hilfsfunktion: Gibt ein ISO-Datum 24 Stunden in der Zukunft zurueck */
function futureIsoDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Unit Tests fuer AdminInviteController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handler mit jest.fn()
 * - Focus: Controller-Orchestration, Command-Creation, Exception-Handling
 *
 * **Coverage Target:** >80% fuer AdminInviteController
 *
 * **Test Groups:**
 * 1. createInvite() - POST /admin/invites
 *    - Success Case: Gibt CreateInviteResponseDto zurueck
 *    - Failure Case: Wirft BadRequestException bei abgelaufenem Datum
 *    - Failure Case: Wirft BadRequestException bei Handler-Fehler
 *
 * **Note:**
 * - Auth Guards (401/403) werden auf Controller-Ebene gemockt/nicht getestet,
 *   da Guards in NestJS separate Middleware sind
 * - Rate Limiting ist Throttler-Decorator und wird nicht im Unit-Test abgedeckt
 */
describe('AdminInviteController', () => {
  let controller: AdminInviteController;
  let mockCreateInviteHandler: jest.Mocked<CreateInviteHandler>;
  let mockListInvitesHandler: jest.Mocked<ListInvitesHandler>;
  let mockRevokeInviteHandler: jest.Mocked<RevokeInviteHandler>;

  // Standard-Erfolgsantwort fuer Mock
  const mockSuccessResponse: CreateInviteResponseDto = {
    id: 'inv_ckpf2xrkc0001zyp8jq8qzx9',
    code: 'ABC12345',
    expiresAt: '2026-02-01T12:00:00.000Z',
    maxUses: 5,
    useCount: 0,
    label: 'Team Nord',
    createdAt: '2026-01-07T10:30:00.000Z',
    deepLink: 'bluelight://connect?url=http%3A%2F%2Flocalhost%3A3091&invite=ABC12345&expires=2026-02-01T12%3A00%3A00.000Z',
    webLink: 'http://localhost:3090?server=http%3A%2F%2Flocalhost%3A3091&invite=ABC12345',
  };

  // Standard-Admin-User fuer Mock
  const mockAdminUser: ValidatedUser = {
    userId: 'user_admin123',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handlers (Direct Instantiation Pattern)
    mockCreateInviteHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockListInvitesHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockRevokeInviteHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Instantiate controller with all required mocks
    controller = new AdminInviteController(mockCreateInviteHandler, mockListInvitesHandler, mockRevokeInviteHandler);
  });

  describe('createInvite()', () => {
    describe('Success Cases', () => {
      it('sollte Invite-Code erfolgreich erstellen und CreateInviteResponseDto zurueckgeben', async () => {
        // Given (Arrange)
        const expiresAt = futureIsoDate();
        const dto: CreateInviteDto = {
          expiresAt,
          maxUses: 5,
          label: 'Team Nord',
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        const result = await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockSuccessResponse);
        expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);

        // Verify command was created correctly
        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.expiresAt).toEqual(new Date(expiresAt));
        expect(executedCommand.maxUses).toBe(5);
        expect(executedCommand.label).toBe('Team Nord');
        expect(executedCommand.createdById).toBe(mockAdminUser.userId);
      });

      it('sollte Invite-Code ohne optionale Felder erstellen (mit explizitem expiresAt)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
        };

        const responseWithoutOptionals: CreateInviteResponseDto = {
          ...mockSuccessResponse,
          maxUses: 1, // Default
          label: undefined,
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(responseWithoutOptionals));

        // When (Act)
        const result = await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(responseWithoutOptionals);
        expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);

        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.maxUses).toBe(1); // Default value
        expect(executedCommand.label).toBeUndefined();
      });

      it('sollte Invite-Code ohne expiresAt erstellen (Default: 7 Tage)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          maxUses: 5,
          label: 'Test ohne expiresAt',
        };

        const expectedDefaultExpiry = new Date(Date.now() + CreateInviteDto.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);

        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        // Pruefen, dass expiresAt ca. 7 Tage in der Zukunft liegt (mit 5 Sekunden Toleranz)
        const timeDiff = Math.abs(executedCommand.expiresAt.getTime() - expectedDefaultExpiry.getTime());
        expect(timeDiff).toBeLessThan(5000); // Max 5 Sekunden Abweichung
      });

      it('sollte Invite-Code komplett ohne optionale Felder erstellen (alle Defaults)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {};

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);

        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        // Default expiresAt: 7 Tage
        const expectedDefaultExpiry = new Date(Date.now() + CreateInviteDto.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const timeDiff = Math.abs(executedCommand.expiresAt.getTime() - expectedDefaultExpiry.getTime());
        expect(timeDiff).toBeLessThan(5000);
        // Default maxUses: 1
        expect(executedCommand.maxUses).toBe(1);
        // Default label: undefined
        expect(executedCommand.label).toBeUndefined();
      });

      it('sollte Invite-Code mit maxUses=1 erstellen (Minimum)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: 1,
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.maxUses).toBe(1);
      });

      it('sollte Invite-Code mit maxUses=100 erstellen (Maximum)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: 100,
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.maxUses).toBe(100);
      });
    });

    describe('Command Validation Failures', () => {
      it('sollte BadRequestException werfen wenn expiresAt in der Vergangenheit liegt', async () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // Gestern
        const dto: CreateInviteDto = {
          expiresAt: pastDate.toISOString(),
          maxUses: 5,
        };

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);

        // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
        expect(mockCreateInviteHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException mit korrektem Error-Code werfen (INVITE_EXPIRY_PAST)', async () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const dto: CreateInviteDto = {
          expiresAt: pastDate.toISOString(),
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createInvite(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { code: string };
          expect(response.code).toBe(INVITE_ERROR_CODES.EXPIRY_TOO_SOON);
        }
      });

      it('sollte BadRequestException werfen wenn maxUses zu klein ist (0)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: 0,
        };

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateInviteHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn maxUses negativ ist', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: -5,
        };

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateInviteHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn maxUses zu gross ist (101)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: 101,
        };

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateInviteHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn label zu lang ist (>100 Zeichen)', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          label: 'A'.repeat(101), // 101 Zeichen
        };

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateInviteHandler.execute).not.toHaveBeenCalled();
      });
    });

    describe('Handler Execution Failures', () => {
      it('sollte BadRequestException werfen wenn Handler mit CREATION_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: 5,
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.fail(INVITE_ERROR_CODES.CREATION_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte BadRequestException werfen wenn Handler mit SAVE_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const expiresAt = futureIsoDate();
        const dto: CreateInviteDto = {
          expiresAt,
          maxUses: 5,
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.fail(INVITE_ERROR_CODES.SAVE_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);

        try {
          mockCreateInviteHandler.execute.mockResolvedValue(Result.fail(INVITE_ERROR_CODES.SAVE_FAILED));
          await controller.createInvite(dto, mockAdminUser);
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { code: string };
          expect(response.code).toBe(INVITE_ERROR_CODES.SAVE_FAILED);
        }
      });

      it('sollte BadRequestException werfen wenn Handler mit unbekanntem Fehler fehlschlaegt', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.fail('UNKNOWN_ERROR'));

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte BadRequestException werfen wenn Handler undefined value zurueckgibt', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
        };

        // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(undefined as any));

        // When (Act) & Then (Assert)
        await expect(controller.createInvite(dto, mockAdminUser)).rejects.toThrow(BadRequestException);
      });
    });

    describe('User Context', () => {
      it('sollte createdById aus ValidatedUser korrekt an Command weitergeben', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
        };
        const customUser: ValidatedUser = {
          userId: 'custom_admin_789',
          role: 'SUPER_ADMIN',
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, customUser);

        // Then (Assert)
        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.createdById).toBe('custom_admin_789');
      });

      it('sollte mit ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
        };
        const adminUser: ValidatedUser = {
          userId: 'admin_user_123',
          role: 'ADMIN',
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        const result = await controller.createInvite(dto, adminUser);

        // Then (Assert)
        expect(result).toEqual(mockSuccessResponse);
      });

      it('sollte mit SUPER_ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
        };
        const superAdminUser: ValidatedUser = {
          userId: 'super_admin_456',
          role: 'SUPER_ADMIN',
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        const result = await controller.createInvite(dto, superAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('Date Handling', () => {
      it('sollte ISO-8601 Datum korrekt in Date Objekt konvertieren', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: '2026-12-31T23:59:59.999Z',
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.expiresAt).toEqual(new Date('2026-12-31T23:59:59.999Z'));
        expect(executedCommand.expiresAt).toBeInstanceOf(Date);
      });

      it('sollte Datum mit Zeitzone korrekt verarbeiten', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: '2026-06-15T14:30:00.000+02:00',
        };

        mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

        // When (Act)
        await controller.createInvite(dto, mockAdminUser);

        // Then (Assert)
        const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
        expect(executedCommand.expiresAt).toBeInstanceOf(Date);
        // Das Datum sollte korrekt geparst werden (UTC: 12:30)
        expect(executedCommand.expiresAt.toISOString()).toBe('2026-06-15T12:30:00.000Z');
      });
    });

    describe('Error Message Mapping', () => {
      it('sollte INVITE_EXPIRY_PAST zu benutzerfreundlicher Nachricht mappen', async () => {
        // Given (Arrange)
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const dto: CreateInviteDto = {
          expiresAt: pastDate.toISOString(),
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createInvite(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string };
          expect(response.message).toContain('Ablaufdatum');
          expect(response.message).toContain('Zukunft');
        }
      });

      it('sollte INVITE_MAX_USES_INVALID zu benutzerfreundlicher Nachricht mappen', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          maxUses: 0,
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createInvite(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string };
          expect(response.message).toContain('maxUses');
          expect(response.message).toContain('1');
          expect(response.message).toContain('100');
        }
      });

      it('sollte INVITE_LABEL_TOO_LONG zu benutzerfreundlicher Nachricht mappen', async () => {
        // Given (Arrange)
        const dto: CreateInviteDto = {
          expiresAt: futureIsoDate(),
          label: 'A'.repeat(101),
        };

        // When (Act) & Then (Assert)
        try {
          await controller.createInvite(dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string };
          expect(response.message).toContain('Label');
          expect(response.message).toContain('100');
        }
      });
    });
  });

  describe('Decorator Validation', () => {
    it('sollte Controller Instanz erfolgreich erstellen', () => {
      // Then (Assert)
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(AdminInviteController);
    });

    it('sollte createInvite Methode haben', () => {
      // Then (Assert)
      expect(controller.createInvite).toBeDefined();
      expect(typeof controller.createInvite).toBe('function');
    });
  });

  describe('Handler Integration', () => {
    it('sollte Handler mit korrektem Command aufrufen', async () => {
      // Given (Arrange)
      const dto: CreateInviteDto = {
        expiresAt: '2026-03-15T10:00:00.000Z',
        maxUses: 10,
        label: 'Integration Test',
      };

      mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createInvite(dto, mockAdminUser);

      // Then (Assert)
      expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);

      const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
      expect(executedCommand.expiresAt).toEqual(new Date('2026-03-15T10:00:00.000Z'));
      expect(executedCommand.maxUses).toBe(10);
      expect(executedCommand.label).toBe('Integration Test');
      expect(executedCommand.createdById).toBe(mockAdminUser.userId);
    });

    it('sollte Handler-Ergebnis direkt zurueckgeben (kein Wrapper)', async () => {
      // Given (Arrange)
      const dto: CreateInviteDto = {
        expiresAt: futureIsoDate(),
      };

      const customResponse: CreateInviteResponseDto = {
        id: 'inv_customid123456789012345',
        code: 'XYZ98765',
        expiresAt: '2027-02-01T12:00:00.000Z',
        maxUses: 1,
        useCount: 0,
        createdAt: '2026-01-07T15:00:00.000Z',
        deepLink: 'bluelight://connect?custom',
        webLink: 'http://localhost:3090?custom',
      };

      mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(customResponse));

      // When (Act)
      const result = await controller.createInvite(dto, mockAdminUser);

      // Then (Assert)
      // Der Controller gibt die CreateInviteResponseDto direkt zurueck
      // TransformInterceptor wrappt sie dann in WrappedResponse
      expect(result).toBe(customResponse);
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit Label am Grenzwert (100 Zeichen) funktionieren', async () => {
      // Given (Arrange)
      const dto: CreateInviteDto = {
        expiresAt: futureIsoDate(),
        label: 'A'.repeat(100), // Genau 100 Zeichen
      };

      mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createInvite(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
      expect(executedCommand.label).toHaveLength(100);
    });

    it('sollte leeren Label-String zu undefined normalisieren', async () => {
      // Given (Arrange)
      const dto: CreateInviteDto = {
        expiresAt: futureIsoDate(),
        label: '',
      };

      mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createInvite(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
      // CreateInviteCommand.create trimmt den Label und setzt ihn auf undefined wenn leer
      expect(executedCommand.label).toBeUndefined();
    });

    it('sollte Label mit Whitespace trimmen', async () => {
      // Given (Arrange)
      const dto: CreateInviteDto = {
        expiresAt: futureIsoDate(),
        label: '   Team Nord   ',
      };

      mockCreateInviteHandler.execute.mockResolvedValue(Result.ok(mockSuccessResponse));

      // When (Act)
      await controller.createInvite(dto, mockAdminUser);

      // Then (Assert)
      const executedCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
      expect(executedCommand.label).toBe('Team Nord');
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
 *    - Test in E2E: `supertest(app).post('/admin/invites').send(dto).expect(401)`
 *
 * 2. **403 Forbidden (Non-Admin User)**
 *    - Request mit gueltigem JWT aber ohne Admin-Rolle soll 403 zurueckgeben
 *    - AdminJwtStrategy prueft isAdmin Flag und wirft ForbiddenException
 *    - Test in E2E: Mit USER-Role Token authentifizieren, dann POST /admin/invites
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
