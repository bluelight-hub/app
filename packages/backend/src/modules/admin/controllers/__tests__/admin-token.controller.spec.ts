import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AdminTokenController } from '@/modules/admin/controllers/admin-token.controller';
import { Result } from '@/domain/common/result';
import type { CreateAccessTokenHandler } from '@/application/admin/commands/create-access-token.handler';
import type { GetTokenListHandler } from '@/application/admin/queries/get-token-list.handler';
import type { RevokeAccessTokenHandler } from '@/application/admin/commands/revoke-access-token.handler';
import type { ReactivateAccessTokenHandler } from '@/application/admin/commands/reactivate-access-token.handler';
import type { RotateAccessTokenHandler } from '@/application/admin/commands/rotate-access-token.handler';
import type { RotateAccessTokenResult } from '@/application/admin/commands/rotate-access-token.command';
import type { CreateAccessTokenDto } from '@/application/admin/dto/create-access-token.dto';
import type { CreateAccessTokenResponseDto } from '@/application/admin/dto/create-access-token-response.dto';
import type { RotateAccessTokenRequestDto } from '@/application/admin/dto/rotate-access-token.dto';
import type { TokenListDto } from '@/application/admin/dto/token-list.dto';
import type { TokenListItemDto } from '@/application/admin/dto/token-list-item.dto';
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
 * 2. listTokens() - GET /admin/tokens
 *    - Success Case: Gibt TokenListItemDto[] zurueck mit Pagination
 *    - Failure Case: Wirft BadRequestException bei Query-Validierungsfehlern
 *    - Failure Case: Wirft InternalServerErrorException bei Repository-Fehlern
 *
 * 3. revokeToken() - POST /admin/tokens/:id/revoke
 *    - Success Case: Gibt TokenListItemDto mit status 'revoked' zurueck
 *    - Failure Case: Wirft NotFoundException bei ungueltigem Token-ID Format
 *    - Failure Case: Wirft NotFoundException bei nicht existierendem Token
 *    - Failure Case: Wirft InternalServerErrorException bei technischen Fehlern
 *
 * 4. reactivateToken() - POST /admin/tokens/:id/reactivate
 *    - Success Case: Gibt TokenListItemDto mit status 'active' zurueck
 *    - Failure Case: Wirft NotFoundException bei ungueltigem Token-ID Format
 *    - Failure Case: Wirft NotFoundException bei nicht existierendem Token
 *    - Failure Case: Wirft InternalServerErrorException bei technischen Fehlern
 *
 * 5. rotateToken() - POST /admin/tokens/:id/rotate
 *    - Success Case: Gibt RotateAccessTokenResponseDto mit neuem Token zurueck
 *    - Failure Case: Wirft NotFoundException bei nicht existierendem Token
 *    - Failure Case: Wirft BadRequestException wenn Token revoked ist
 *    - Failure Case: Wirft BadRequestException wenn Token expired ist
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
  let mockGetTokenListHandler: jest.Mocked<GetTokenListHandler>;
  let mockRevokeAccessTokenHandler: jest.Mocked<RevokeAccessTokenHandler>;
  let mockReactivateAccessTokenHandler: jest.Mocked<ReactivateAccessTokenHandler>;
  let mockRotateAccessTokenHandler: jest.Mocked<RotateAccessTokenHandler>;

  // Standard-Erfolgsantwort fuer Mock (createToken)
  const mockSuccessResponse: CreateAccessTokenResponseDto = {
    token: 'blh_abc123def456ghi789jkl012mno345pqr678',
    name: 'CI/CD Pipeline Token',
    prefix: 'blh_abc12345',
    createdAt: '2026-01-12T10:30:00.000Z',
  };

  // Standard-Token-Liste fuer Mock (listTokens)
  const mockTokenListItem: TokenListItemDto = {
    id: 'blh_test123456789012',
    name: 'Test Token',
    prefix: 'blh_test1234',
    createdAt: '2026-01-12T10:30:00.000Z',
    status: 'active',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
  };

  const mockTokenListResponse: TokenListDto = {
    data: [mockTokenListItem],
    meta: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  };

  // Standard-Admin-User fuer Mock
  const mockAdminUser: ValidatedUser = {
    userId: 'user_admin123',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock handlers (Direct Instantiation Pattern)
    mockCreateAccessTokenHandler = {
      execute: jest.fn(),
    } as any;

    mockGetTokenListHandler = {
      execute: jest.fn(),
    } as any;

    mockRevokeAccessTokenHandler = {
      execute: jest.fn(),
    } as any;

    mockReactivateAccessTokenHandler = {
      execute: jest.fn(),
    } as any;

    mockRotateAccessTokenHandler = {
      execute: jest.fn(),
    } as any;

    // Instantiate controller with mocks
    controller = new AdminTokenController(mockCreateAccessTokenHandler, mockGetTokenListHandler, mockRevokeAccessTokenHandler, mockReactivateAccessTokenHandler, mockRotateAccessTokenHandler);
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

  describe('listTokens()', () => {
    describe('Success Cases', () => {
      it('sollte Token-Liste mit Default-Pagination zurueckgeben', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        // Controller gibt PaginatedData<T> zurueck fuer TransformInterceptor
        expect(result).toEqual({
          items: [mockTokenListItem],
          total: 1,
          page: 1,
          limit: 20,
        });
        expect(mockGetTokenListHandler.execute).toHaveBeenCalledTimes(1);

        // Verify query was created correctly
        const executedQuery = mockGetTokenListHandler.execute.mock.calls[0][0];
        expect(executedQuery.page).toBe(1);
        expect(executedQuery.limit).toBe(20);
        expect(executedQuery.requestedById).toBe(mockAdminUser.userId);
      });

      it('sollte Custom page und limit an Handler weitergeben', async () => {
        // Given (Arrange)
        const customResponse: TokenListDto = {
          ...mockTokenListResponse,
          meta: {
            page: 3,
            pageSize: 50,
            total: 150,
            totalPages: 3,
          },
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(customResponse));

        // When (Act)
        const result = await controller.listTokens(3, 50, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        expect(result).toBeDefined();
        const executedQuery = mockGetTokenListHandler.execute.mock.calls[0][0];
        expect(executedQuery.page).toBe(3);
        expect(executedQuery.limit).toBe(50);
      });

      it('sollte leere Liste bei keinen Tokens zurueckgeben', async () => {
        // Given (Arrange)
        const emptyResponse: TokenListDto = {
          data: [],
          meta: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
          },
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(emptyResponse));

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        // Leere Liste als PaginatedData mit items: []
        expect(result).toEqual({
          items: [],
          total: 0,
          page: 1,
          limit: 20,
        });
        expect(mockGetTokenListHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte mehrere Tokens in korrekter Reihenfolge zurueckgeben', async () => {
        // Given (Arrange)
        const secondToken: TokenListItemDto = {
          id: 'blh_second12345678901',
          name: 'Second Token',
          prefix: 'blh_second12',
          createdAt: '2026-01-11T10:30:00.000Z',
          status: 'revoked',
          lastUsedAt: '2026-01-10T15:00:00.000Z',
          expiresAt: '2027-01-12T00:00:00.000Z',
          revokedAt: '2026-01-11T12:00:00.000Z',
        };
        const multiTokenResponse: TokenListDto = {
          data: [mockTokenListItem, secondToken],
          meta: {
            page: 1,
            pageSize: 20,
            total: 2,
            totalPages: 1,
          },
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(multiTokenResponse));

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual(mockTokenListItem);
        expect(result.items[1]).toEqual(secondToken);
        expect(result.total).toBe(2);
      });

      it('sollte limit bei maximum boundary (100) akzeptieren', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        await controller.listTokens(1, 100, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        const executedQuery = mockGetTokenListHandler.execute.mock.calls[0][0];
        expect(executedQuery.limit).toBe(100);
      });

      it('sollte limit bei minimum boundary (1) akzeptieren', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        await controller.listTokens(1, 1, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        const executedQuery = mockGetTokenListHandler.execute.mock.calls[0][0];
        expect(executedQuery.limit).toBe(1);
      });
    });

    describe('Query Validation Failures', () => {
      it('sollte BadRequestException werfen wenn page < 1', async () => {
        // Given (Arrange) - Query.create wird fehlschlagen bei page: 0

        // When (Act) & Then (Assert)
        await expect(controller.listTokens(0, 20, undefined, undefined, undefined, mockAdminUser)).rejects.toThrow(BadRequestException);

        // Handler sollte NICHT aufgerufen werden
        expect(mockGetTokenListHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn page negativ ist', async () => {
        // Given (Arrange) - Query.create wird fehlschlagen bei negativer page

        // When (Act) & Then (Assert)
        await expect(controller.listTokens(-1, 20, undefined, undefined, undefined, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockGetTokenListHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn limit < 1', async () => {
        // Given (Arrange) - Query.create wird fehlschlagen bei limit: 0

        // When (Act) & Then (Assert)
        await expect(controller.listTokens(1, 0, undefined, undefined, undefined, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockGetTokenListHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn limit > 100', async () => {
        // Given (Arrange) - Query.create wird fehlschlagen bei limit: 101

        // When (Act) & Then (Assert)
        await expect(controller.listTokens(1, 101, undefined, undefined, undefined, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockGetTokenListHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException mit korrekter Fehlermeldung werfen', async () => {
        // Given (Arrange) - Invalid limit

        // When (Act) & Then (Assert)
        try {
          await controller.listTokens(1, 0, undefined, undefined, undefined, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { statusCode: number; error: string };
          expect(response.statusCode).toBe(400);
          expect(response.error).toBe('Bad Request');
        }
      });
    });

    describe('Handler Execution Failures', () => {
      it('sollte InternalServerErrorException werfen wenn Handler fehlschlaegt', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.fail('Database connection error'));

        // When (Act) & Then (Assert)
        await expect(controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        expect(mockGetTokenListHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte InternalServerErrorException werfen wenn Handler null value zurueckgibt', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(null as any));

        // When (Act) & Then (Assert)
        await expect(controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException mit korrekter Fehlermeldung werfen', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.fail('Repository error'));

        // When (Act) & Then (Assert)
        try {
          await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);
          fail('Should have thrown InternalServerErrorException');
        } catch (error) {
          expect(error).toBeInstanceOf(InternalServerErrorException);
          const internalError = error as InternalServerErrorException;
          const response = internalError.getResponse() as { statusCode: number; error: string; message: string };
          expect(response.statusCode).toBe(500);
          expect(response.error).toBe('Internal Server Error');
          expect(response.message).toContain('Repository error');
        }
      });

      it('sollte PaginatedData mit undefined items zurueckgeben wenn Handler undefined data zurueckgibt', async () => {
        // Given (Arrange)
        const invalidResponse: TokenListDto = {
          data: undefined as any,
          meta: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
          },
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(invalidResponse));

        // When (Act)
        // Controller gibt PaginatedData zurueck, items ist undefined (Edge Case)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        // Der TransformInterceptor wuerde das dann als leere Liste behandeln
        expect(result.items).toBeUndefined();
        expect(result.total).toBe(0);
      });
    });

    describe('User Context', () => {
      it('sollte requestedById aus ValidatedUser korrekt an Query weitergeben', async () => {
        // Given (Arrange)
        const customUser: ValidatedUser = {
          userId: 'custom_admin_789',
          role: 'SUPER_ADMIN',
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        await controller.listTokens(1, 20, undefined, undefined, undefined, customUser);

        // Then (Assert)
        const executedQuery = mockGetTokenListHandler.execute.mock.calls[0][0];
        expect(executedQuery.requestedById).toBe('custom_admin_789');
      });

      it('sollte mit ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const adminUser: ValidatedUser = {
          userId: 'admin_user_123',
          role: 'ADMIN',
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, adminUser);

        // Then (Assert)
        expect(result.items).toEqual([mockTokenListItem]);
      });

      it('sollte mit SUPER_ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const superAdminUser: ValidatedUser = {
          userId: 'super_admin_456',
          role: 'SUPER_ADMIN',
        };
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, superAdminUser);

        // Then (Assert)
        expect(result.items).toEqual([mockTokenListItem]);
      });
    });

    describe('Response Mapping', () => {
      it('sollte PaginatedData zurueckgeben (TransformInterceptor wrappt zu data/meta/pagination)', async () => {
        // Given (Arrange)
        mockGetTokenListHandler.execute.mockResolvedValue(Result.ok(mockTokenListResponse));

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        // Controller gibt PaginatedData<T> zurueck fuer TransformInterceptor
        expect(result.items).toEqual([mockTokenListItem]);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
      });

      it('sollte Token-Status korrekt durchreichen (active)', async () => {
        // Given (Arrange)
        const activeToken: TokenListItemDto = {
          ...mockTokenListItem,
          status: 'active',
        };
        mockGetTokenListHandler.execute.mockResolvedValue(
          Result.ok({
            data: [activeToken],
            meta: mockTokenListResponse.meta,
          }),
        );

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        expect(result.items[0].status).toBe('active');
      });

      it('sollte Token-Status korrekt durchreichen (revoked)', async () => {
        // Given (Arrange)
        const revokedToken: TokenListItemDto = {
          ...mockTokenListItem,
          status: 'revoked',
        };
        mockGetTokenListHandler.execute.mockResolvedValue(
          Result.ok({
            data: [revokedToken],
            meta: mockTokenListResponse.meta,
          }),
        );

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        expect(result.items[0].status).toBe('revoked');
      });

      it('sollte Token-Status korrekt durchreichen (expired)', async () => {
        // Given (Arrange)
        const expiredToken: TokenListItemDto = {
          ...mockTokenListItem,
          status: 'expired',
        };
        mockGetTokenListHandler.execute.mockResolvedValue(
          Result.ok({
            data: [expiredToken],
            meta: mockTokenListResponse.meta,
          }),
        );

        // When (Act)
        const result = await controller.listTokens(1, 20, undefined, undefined, undefined, mockAdminUser);

        // Then (Assert)
        expect(result.items[0].status).toBe('expired');
      });
    });
  });

  describe('revokeToken()', () => {
    // Standard-TokenListItemDto fuer revoke Antwort
    const mockRevokedTokenResponse: TokenListItemDto = {
      id: 'blh_test123456789012345678',
      name: 'Revoked Token',
      prefix: 'blh_test1234',
      createdAt: '2026-01-12T10:30:00.000Z',
      status: 'revoked',
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: '2026-01-12T14:00:00.000Z',
    };

    describe('Success Cases', () => {
      it('sollte Token erfolgreich widerrufen und TokenListItemDto zurueckgeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRevokedTokenResponse));

        // When (Act)
        const result = await controller.revokeToken(tokenId, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockRevokedTokenResponse);
        expect(mockRevokeAccessTokenHandler.execute).toHaveBeenCalledTimes(1);

        // Verify command was created correctly
        const executedCommand = mockRevokeAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.tokenId).toBe(tokenId);
        expect(executedCommand.requestedById).toBe(mockAdminUser.userId);
      });

      it('sollte Status revoked in Response haben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRevokedTokenResponse));

        // When (Act)
        const result = await controller.revokeToken(tokenId, mockAdminUser);

        // Then (Assert)
        expect(result.status).toBe('revoked');
        expect(result.revokedAt).not.toBeNull();
      });

      it('sollte verschiedene User-IDs korrekt weitergeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const customUser: ValidatedUser = {
          userId: 'super_admin_custom_789',
          role: 'SUPER_ADMIN',
        };
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRevokedTokenResponse));

        // When (Act)
        await controller.revokeToken(tokenId, customUser);

        // Then (Assert)
        const executedCommand = mockRevokeAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.requestedById).toBe('super_admin_custom_789');
      });
    });

    describe('Command Validation Failures', () => {
      it('sollte NotFoundException werfen wenn Token-ID zu kurz ist (< 24 Zeichen)', async () => {
        // Given (Arrange) - Token-ID mit weniger als 24 Zeichen
        const shortTokenId = 'blh_short';

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(shortTokenId, mockAdminUser)).rejects.toThrow(NotFoundException);

        // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
        expect(mockRevokeAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException werfen wenn Token-ID leer ist', async () => {
        // Given (Arrange)
        const emptyTokenId = '';

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(emptyTokenId, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockRevokeAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException werfen wenn Token-ID nur Whitespace ist', async () => {
        // Given (Arrange)
        const whitespaceTokenId = '                        ';

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(whitespaceTokenId, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockRevokeAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException mit korrektem Error-Code werfen bei zu kurzem Token-ID', async () => {
        // Given (Arrange)
        const shortTokenId = 'short_id_123';

        // When (Act) & Then (Assert)
        try {
          await controller.revokeToken(shortTokenId, mockAdminUser);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          const notFoundError = error as NotFoundException;
          const response = notFoundError.getResponse() as { code: string };
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
        }
      });

      it('sollte Token mit exakt 24 Zeichen akzeptieren (minimum boundary)', async () => {
        // Given (Arrange)
        const validMinTokenId = 'blh_exact24characterss!!'; // Exactly 24 characters
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRevokedTokenResponse));

        // When (Act)
        await controller.revokeToken(validMinTokenId, mockAdminUser);

        // Then (Assert)
        expect(mockRevokeAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
        const executedCommand = mockRevokeAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.tokenId).toBe(validMinTokenId);
      });
    });

    describe('Handler Execution Failures', () => {
      it('sollte NotFoundException werfen wenn Token nicht existiert', async () => {
        // Given (Arrange)
        const tokenId = 'blh_nonexistent_token_12';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND));

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(tokenId, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockRevokeAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte NotFoundException mit korrekter Fehlermeldung werfen wenn Token nicht existiert', async () => {
        // Given (Arrange)
        const tokenId = 'blh_nonexistent_token_12';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND));

        // When (Act) & Then (Assert)
        try {
          await controller.revokeToken(tokenId, mockAdminUser);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          const notFoundError = error as NotFoundException;
          const response = notFoundError.getResponse() as { message: string; code: string };
          expect(response.message).toContain('nicht gefunden');
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
        }
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit SAVE_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(tokenId, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit unbekanntem Fehler fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.fail('UNKNOWN_TECHNICAL_ERROR'));

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(tokenId, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        expect(mockRevokeAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte Exception werfen wenn Handler undefined value zurueckgibt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(undefined as any));

        // When (Act) & Then (Assert)
        await expect(controller.revokeToken(tokenId, mockAdminUser)).rejects.toThrow();
      });
    });

    describe('User Context', () => {
      it('sollte mit ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const adminUser: ValidatedUser = {
          userId: 'admin_user_123456',
          role: 'ADMIN',
        };
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRevokedTokenResponse));

        // When (Act)
        const result = await controller.revokeToken(tokenId, adminUser);

        // Then (Assert)
        expect(result).toEqual(mockRevokedTokenResponse);
      });

      it('sollte mit SUPER_ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const superAdminUser: ValidatedUser = {
          userId: 'super_admin_456789',
          role: 'SUPER_ADMIN',
        };
        mockRevokeAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRevokedTokenResponse));

        // When (Act)
        const result = await controller.revokeToken(tokenId, superAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockRevokedTokenResponse);
      });
    });
  });

  describe('reactivateToken()', () => {
    // Standard-TokenListItemDto fuer reactivate Antwort
    const mockReactivatedTokenResponse: TokenListItemDto = {
      id: 'blh_test123456789012345678',
      name: 'Reactivated Token',
      prefix: 'blh_test1234',
      createdAt: '2026-01-12T10:30:00.000Z',
      status: 'active',
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
    };

    describe('Success Cases', () => {
      it('sollte Token erfolgreich reaktivieren und TokenListItemDto zurueckgeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        const result = await controller.reactivateToken(tokenId, mockAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockReactivatedTokenResponse);
        expect(mockReactivateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);

        // Verify command was created correctly
        const executedCommand = mockReactivateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.tokenId).toBe(tokenId);
        expect(executedCommand.requestedById).toBe(mockAdminUser.userId);
      });

      it('sollte Status active in Response haben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        const result = await controller.reactivateToken(tokenId, mockAdminUser);

        // Then (Assert)
        expect(result.status).toBe('active');
        expect(result.revokedAt).toBeNull();
      });

      it('sollte verschiedene User-IDs korrekt weitergeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const customUser: ValidatedUser = {
          userId: 'super_admin_custom_789',
          role: 'SUPER_ADMIN',
        };
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        await controller.reactivateToken(tokenId, customUser);

        // Then (Assert)
        const executedCommand = mockReactivateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.requestedById).toBe('super_admin_custom_789');
      });
    });

    describe('Command Validation Failures', () => {
      it('sollte NotFoundException werfen wenn Token-ID zu kurz ist (< 24 Zeichen)', async () => {
        // Given (Arrange) - Token-ID mit weniger als 24 Zeichen
        const shortTokenId = 'blh_short';

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(shortTokenId, mockAdminUser)).rejects.toThrow(NotFoundException);

        // Handler sollte NICHT aufgerufen werden, da Command-Erstellung fehlschlaegt
        expect(mockReactivateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException werfen wenn Token-ID leer ist', async () => {
        // Given (Arrange)
        const emptyTokenId = '';

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(emptyTokenId, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockReactivateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException werfen wenn Token-ID nur Whitespace ist', async () => {
        // Given (Arrange)
        const whitespaceTokenId = '                        ';

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(whitespaceTokenId, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockReactivateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException mit korrektem Error-Code werfen bei zu kurzem Token-ID', async () => {
        // Given (Arrange)
        const shortTokenId = 'short_id_123';

        // When (Act) & Then (Assert)
        try {
          await controller.reactivateToken(shortTokenId, mockAdminUser);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          const notFoundError = error as NotFoundException;
          const response = notFoundError.getResponse() as { code: string };
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
        }
      });

      it('sollte Token mit exakt 24 Zeichen akzeptieren (minimum boundary)', async () => {
        // Given (Arrange)
        const validMinTokenId = 'blh_exact24characterss!!'; // Exactly 24 characters
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        await controller.reactivateToken(validMinTokenId, mockAdminUser);

        // Then (Assert)
        expect(mockReactivateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
        const executedCommand = mockReactivateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.tokenId).toBe(validMinTokenId);
      });
    });

    describe('Handler Execution Failures', () => {
      it('sollte NotFoundException werfen wenn Token nicht existiert', async () => {
        // Given (Arrange)
        const tokenId = 'blh_nonexistent_token_12';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND));

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(tokenId, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockReactivateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte NotFoundException mit korrekter Fehlermeldung werfen wenn Token nicht existiert', async () => {
        // Given (Arrange)
        const tokenId = 'blh_nonexistent_token_12';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND));

        // When (Act) & Then (Assert)
        try {
          await controller.reactivateToken(tokenId, mockAdminUser);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          const notFoundError = error as NotFoundException;
          const response = notFoundError.getResponse() as { message: string; code: string };
          expect(response.message).toContain('nicht gefunden');
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
        }
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit SAVE_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(tokenId, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit unbekanntem Fehler fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.fail('UNKNOWN_TECHNICAL_ERROR'));

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(tokenId, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        expect(mockReactivateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte Exception werfen wenn Handler undefined value zurueckgibt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(undefined as any));

        // When (Act) & Then (Assert)
        await expect(controller.reactivateToken(tokenId, mockAdminUser)).rejects.toThrow();
      });
    });

    describe('User Context', () => {
      it('sollte mit ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const adminUser: ValidatedUser = {
          userId: 'admin_user_123456',
          role: 'ADMIN',
        };
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        const result = await controller.reactivateToken(tokenId, adminUser);

        // Then (Assert)
        expect(result).toEqual(mockReactivatedTokenResponse);
      });

      it('sollte mit SUPER_ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const superAdminUser: ValidatedUser = {
          userId: 'super_admin_456789',
          role: 'SUPER_ADMIN',
        };
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        const result = await controller.reactivateToken(tokenId, superAdminUser);

        // Then (Assert)
        expect(result).toEqual(mockReactivatedTokenResponse);
      });
    });

    describe('Response Mapping', () => {
      it('sollte Token-Status korrekt durchreichen (active nach Reaktivierung)', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const activeResponse: TokenListItemDto = {
          ...mockReactivatedTokenResponse,
          status: 'active',
        };
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(activeResponse));

        // When (Act)
        const result = await controller.reactivateToken(tokenId, mockAdminUser);

        // Then (Assert)
        expect(result.status).toBe('active');
      });

      it('sollte revokedAt auf null setzen nach Reaktivierung', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        mockReactivateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockReactivatedTokenResponse));

        // When (Act)
        const result = await controller.reactivateToken(tokenId, mockAdminUser);

        // Then (Assert)
        expect(result.revokedAt).toBeNull();
      });
    });
  });

  describe('rotateToken()', () => {
    // Standard-Response fuer rotate Antwort
    const mockRotateSuccessResponse: RotateAccessTokenResult = {
      token: 'blh_newtoken1234567890123456789012345678901234',
      name: 'Rotated Token',
      prefix: 'blh_newtoken',
      createdAt: '2026-01-12T14:30:00.000Z',
      rotatedFromId: 'blh_oldtoken1234567890123',
    };

    describe('Success Cases', () => {
      it('sollte Token erfolgreich rotieren und RotateAccessTokenResponseDto zurueckgeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, mockAdminUser);

        // Then (Assert)
        expect(result.token).toBe(mockRotateSuccessResponse.token);
        expect(result.name).toBe(mockRotateSuccessResponse.name);
        expect(result.prefix).toBe(mockRotateSuccessResponse.prefix);
        expect(result.rotatedFromId).toBe(mockRotateSuccessResponse.rotatedFromId);
        expect(mockRotateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);

        // Verify command was created correctly
        const executedCommand = mockRotateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.tokenId).toBe(tokenId);
        expect(executedCommand.requestedById).toBe(mockAdminUser.userId);
      });

      it('sollte Token mit neuem Namen rotieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = { newName: 'Rotiertes Token v2' };
        const responseWithNewName: RotateAccessTokenResult = {
          ...mockRotateSuccessResponse,
          name: 'Rotiertes Token v2',
        };
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(responseWithNewName));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, mockAdminUser);

        // Then (Assert)
        expect(result.name).toBe('Rotiertes Token v2');

        const executedCommand = mockRotateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.newName).toBe('Rotiertes Token v2');
      });

      it('sollte rotatedFromId in Response haben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, mockAdminUser);

        // Then (Assert)
        expect(result.rotatedFromId).toBe('blh_oldtoken1234567890123');
      });

      it('sollte verschiedene User-IDs korrekt weitergeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        const customUser: ValidatedUser = {
          userId: 'super_admin_custom_789',
          role: 'SUPER_ADMIN',
        };
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        await controller.rotateToken(tokenId, dto, customUser);

        // Then (Assert)
        const executedCommand = mockRotateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.requestedById).toBe('super_admin_custom_789');
      });
    });

    describe('Command Validation Failures', () => {
      it('sollte NotFoundException werfen wenn Token-ID zu kurz ist (< 24 Zeichen)', async () => {
        // Given (Arrange)
        const shortTokenId = 'blh_short';
        const dto: RotateAccessTokenRequestDto = {};

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(shortTokenId, dto, mockAdminUser)).rejects.toThrow(NotFoundException);

        // Handler sollte NICHT aufgerufen werden
        expect(mockRotateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte NotFoundException werfen wenn Token-ID leer ist', async () => {
        // Given (Arrange)
        const emptyTokenId = '';
        const dto: RotateAccessTokenRequestDto = {};

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(emptyTokenId, dto, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockRotateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn newName zu kurz ist (< 3 Zeichen)', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = { newName: 'AB' };

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockRotateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte BadRequestException werfen wenn newName zu lang ist (> 50 Zeichen)', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = { newName: 'A'.repeat(51) };

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockRotateAccessTokenHandler.execute).not.toHaveBeenCalled();
      });

      it('sollte Token mit exakt 24 Zeichen Token-ID akzeptieren', async () => {
        // Given (Arrange)
        const validMinTokenId = 'blh_exact24characterss!!'; // Exactly 24 characters
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        await controller.rotateToken(validMinTokenId, dto, mockAdminUser);

        // Then (Assert)
        expect(mockRotateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
        const executedCommand = mockRotateAccessTokenHandler.execute.mock.calls[0][0];
        expect(executedCommand.tokenId).toBe(validMinTokenId);
      });
    });

    describe('Handler Execution Failures', () => {
      it('sollte NotFoundException werfen wenn Token nicht existiert', async () => {
        // Given (Arrange)
        const tokenId = 'blh_nonexistent_token_12';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(NotFoundException);
        expect(mockRotateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte NotFoundException mit korrekter Fehlermeldung werfen wenn Token nicht existiert', async () => {
        // Given (Arrange)
        const tokenId = 'blh_nonexistent_token_12';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND));

        // When (Act) & Then (Assert)
        try {
          await controller.rotateToken(tokenId, dto, mockAdminUser);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          const notFoundError = error as NotFoundException;
          const response = notFoundError.getResponse() as { message: string; code: string };
          expect(response.message).toContain('nicht gefunden');
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
        }
      });

      it('sollte BadRequestException werfen wenn Token bereits revoked ist', async () => {
        // Given (Arrange)
        const tokenId = 'blh_revokedtoken12345678';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(BadRequestException);
        expect(mockRotateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte BadRequestException mit korrekter Fehlermeldung werfen wenn Token nicht rotierbar ist', async () => {
        // Given (Arrange)
        const tokenId = 'blh_revokedtoken12345678';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE));

        // When (Act) & Then (Assert)
        try {
          await controller.rotateToken(tokenId, dto, mockAdminUser);
          fail('Should have thrown BadRequestException');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const badRequestError = error as BadRequestException;
          const response = badRequestError.getResponse() as { message: string; code: string };
          expect(response.message).toContain('rotiert');
          expect(response.code).toBe(ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE);
        }
      });

      it('sollte BadRequestException werfen wenn Token expired ist', async () => {
        // Given (Arrange)
        const tokenId = 'blh_expiredtoken12345678';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_EXPIRED));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(BadRequestException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit SAVE_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit TOKEN_HASH_FAILED fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail(ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
      });

      it('sollte InternalServerErrorException werfen wenn Handler mit unbekanntem Fehler fehlschlaegt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.fail('UNKNOWN_TECHNICAL_ERROR'));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow(InternalServerErrorException);
        expect(mockRotateAccessTokenHandler.execute).toHaveBeenCalledTimes(1);
      });

      it('sollte Exception werfen wenn Handler undefined value zurueckgibt', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(undefined as any));

        // When (Act) & Then (Assert)
        await expect(controller.rotateToken(tokenId, dto, mockAdminUser)).rejects.toThrow();
      });
    });

    describe('User Context', () => {
      it('sollte mit ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        const adminUser: ValidatedUser = {
          userId: 'admin_user_123456',
          role: 'ADMIN',
        };
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, adminUser);

        // Then (Assert)
        expect(result.token).toBe(mockRotateSuccessResponse.token);
      });

      it('sollte mit SUPER_ADMIN role funktionieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        const superAdminUser: ValidatedUser = {
          userId: 'super_admin_456789',
          role: 'SUPER_ADMIN',
        };
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, superAdminUser);

        // Then (Assert)
        expect(result.token).toBe(mockRotateSuccessResponse.token);
      });
    });

    describe('Response Mapping', () => {
      it('sollte createdAt als ISO-String zurueckgeben', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(mockRotateSuccessResponse));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, mockAdminUser);

        // Then (Assert)
        // createdAt ist ein ISO-8601 String (konsistente API-Serialisierung)
        expect(typeof result.createdAt).toBe('string');
        expect(result.createdAt).toBe(mockRotateSuccessResponse.createdAt);
      });

      it('sollte name als null akzeptieren', async () => {
        // Given (Arrange)
        const tokenId = 'blh_validtoken123456789012';
        const dto: RotateAccessTokenRequestDto = {};
        const responseWithNullName: RotateAccessTokenResult = {
          ...mockRotateSuccessResponse,
          name: null,
        };
        mockRotateAccessTokenHandler.execute.mockResolvedValue(Result.ok(responseWithNullName));

        // When (Act)
        const result = await controller.rotateToken(tokenId, dto, mockAdminUser);

        // Then (Assert)
        expect(result.name).toBeNull();
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

    it('sollte listTokens Methode haben', () => {
      // Then (Assert)
      expect(controller.listTokens).toBeDefined();
      expect(typeof controller.listTokens).toBe('function');
    });

    it('sollte revokeToken Methode haben', () => {
      // Then (Assert)
      expect(controller.revokeToken).toBeDefined();
      expect(typeof controller.revokeToken).toBe('function');
    });

    it('sollte reactivateToken Methode haben', () => {
      // Then (Assert)
      expect(controller.reactivateToken).toBeDefined();
      expect(typeof controller.reactivateToken).toBe('function');
    });

    it('sollte rotateToken Methode haben', () => {
      // Then (Assert)
      expect(controller.rotateToken).toBeDefined();
      expect(typeof controller.rotateToken).toBe('function');
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
