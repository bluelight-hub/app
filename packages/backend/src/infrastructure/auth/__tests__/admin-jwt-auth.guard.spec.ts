import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AdminJwtStrategy, type AdminJwtPayload, type ValidatedAdminUser } from '@/modules/auth/strategies/admin-jwt.strategy';
import { AuthService } from '@/modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * Unit Tests für AdminJwtStrategy (via AdminJwtAuthGuard).
 *
 * Diese Tests validieren die Admin-Token-Validierung in der AdminJwtStrategy.validate() Methode.
 * AdminJwtAuthGuard nutzt intern die AdminJwtStrategy, daher testet dieser Test beide Komponenten.
 *
 * **Test Coverage:**
 * - Request ohne Token → 401 Unauthorized
 * - Request mit nur adminToken (ohne accessToken) → 401
 * - Request mit ungültigem accessToken → 401
 * - Request mit User-Token (ohne Admin) → 403 Forbidden
 * - Request mit gelöschtem User → 401
 * - Request mit User der Admin-Rechte verloren hat → 403
 * - Request mit Admin-Token + Access-Token → Success
 * - Request mit SUPER_ADMIN-Token → Success
 * - Request mit isAdmin Flag (neues Format) → Success
 * - Request ohne beide Cookies → 401
 * - Request mit undefined Rolle im Payload → 403
 * - Request mit null Rolle in DB → 403
 *
 * **Token-System:**
 * - accessToken: Normale Auth (muss vorhanden sein)
 * - adminToken: Admin-Berechtigung (enthält Rolle)
 * - Admin-Endpoints brauchen BEIDE Tokens
 * - isAdmin() akzeptiert nur ADMIN und SUPER_ADMIN
 *
 * **Mocking Strategy:**
 * - AuthService: Vollständig gemockt (verifyAccessToken, findUserById)
 * - ConfigService: Gemockt für JWT Secret
 *
 * **Test Patterns:**
 * - AAA Pattern: Arrange → Act → Assert
 * - Mock Reset: beforeEach() cleared alle Mocks
 * - Given-When-Then Comments für Lesbarkeit
 */
describe('AdminJwtStrategy (via AdminJwtAuthGuard)', () => {
  let strategy: AdminJwtStrategy;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<ILogger>;

  const TEST_ADMIN_SECRET = 'test-admin-jwt-secret';

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mocks
    // ME-1 Fix: Vollständige Mock-Type-Definitionen für AuthService
    mockAuthService = {
      verifyAccessToken: jest.fn(),
      findUserById: jest.fn(),
      // Alle genutzten AuthService Methoden vollständig typisiert
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      validateUser: jest.fn(),
      createAccessToken: jest.fn(),
      createAdminToken: jest.fn(),
      refreshToken: jest.fn(),
    } as jest.Mocked<AuthService>;

    mockConfigService = {
      get: jest.fn().mockReturnValue(TEST_ADMIN_SECRET),
      getOrThrow: jest.fn().mockReturnValue(TEST_ADMIN_SECRET),
      // Vollständige ConfigService Mock-Type-Definition
      set: jest.fn(),
    } as jest.Mocked<ConfigService>;

    // Setup Logger Mock
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminJwtStrategy, { provide: AuthService, useValue: mockAuthService }, { provide: ConfigService, useValue: mockConfigService }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();

    strategy = module.get<AdminJwtStrategy>(AdminJwtStrategy);
  });

  describe('validate()', () => {
    it('should throw UnauthorizedException when accessToken is missing', async () => {
      // Given: Request ohne accessToken Cookie
      const mockRequest = {
        cookies: {
          adminToken: 'valid-admin-token',
          // accessToken fehlt absichtlich
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAccessToken() (Zeile 112-116)
      // → Early exit wenn accessToken fehlt (!accessToken check)
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');

      // Verify: verifyAccessToken wurde NICHT aufgerufen (früher Abbruch)
      expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when accessToken is invalid', async () => {
      // Given: Request mit ungültigem accessToken
      const mockRequest = {
        cookies: {
          adminToken: 'valid-admin-token',
          accessToken: 'invalid-or-expired-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: verifyAccessToken wirft Fehler
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Token expired'));

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAccessToken() (Zeile 118-123)
      // → verifyAccessToken() catch Block wirft UnauthorizedException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');
    });

    it('should throw ForbiddenException when payload has no admin role', async () => {
      // Given: Request mit User-Token (keine Admin-Rolle)
      const mockRequest = {
        cookies: {
          adminToken: 'user-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'user@example.com',
        role: UserRole.USER, // Keine Admin-Rolle!
      };

      // Mock: accessToken ist gültig
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);

      // When/Then: Validierung sollte mit ForbiddenException fehlschlagen (403)
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAdminPayload() (Zeile 132-143)
      // → hasNewFormat=false, hasLegacyRole=false → wirft ForbiddenException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(ForbiddenException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Token is not an admin token');
    });

    it('should throw UnauthorizedException when user no longer exists', async () => {
      // Given: Request mit Admin-Token, aber User existiert nicht mehr
      const mockRequest = {
        cookies: {
          adminToken: 'admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'deleted-user-123',
        username: 'deleted-admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: accessToken ist gültig, aber User existiert nicht
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue(null);

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // ME-3: Code-Pfad: AdminJwtStrategy.validateUserExists() (Zeile 171-174)
      // → findUserById() gibt null zurück → wirft UnauthorizedException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');
    });

    it('should throw ForbiddenException when user lost admin rights', async () => {
      // Given: Request mit Admin-Token, aber User hat Admin-Rechte verloren
      const mockRequest = {
        cookies: {
          adminToken: 'admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'former-admin@example.com',
        role: UserRole.ADMIN, // Token sagt ADMIN
      };

      // Mock: accessToken ist gültig, aber User ist jetzt nur noch USER
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'former-admin@example.com',
        role: UserRole.USER, // Aktuelle Rolle in DB ist USER!
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // When/Then: Validierung sollte mit ForbiddenException fehlschlagen (403)
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAdminRights() (Zeile 186-193)
      // → isAdmin(user.role=USER) gibt false → wirft ForbiddenException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(ForbiddenException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('User is no longer an admin');
    });

    it('should successfully validate ADMIN token with valid accessToken', async () => {
      // Given: Request mit gültigem Admin-Token und accessToken
      const mockRequest = {
        cookies: {
          adminToken: 'valid-admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'admin-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: Beide Tokens gültig, User existiert und ist Admin
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue({
        id: 'admin-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // When: Validierung ausführen
      const result: ValidatedAdminUser = await strategy.validate(mockRequest, payload);

      // Then: Sollte ValidatedAdminUser zurückgeben
      expect(result).toEqual({
        userId: 'admin-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      });
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
      expect(mockAuthService.findUserById).toHaveBeenCalledWith('admin-123');
    });

    it('should successfully validate SUPER_ADMIN token with valid accessToken', async () => {
      // Given: Request mit gültigem SUPER_ADMIN-Token und accessToken
      const mockRequest = {
        cookies: {
          adminToken: 'valid-superadmin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'superadmin-123',
        username: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
      };

      // Mock: Beide Tokens gültig, User existiert und ist SUPER_ADMIN
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue({
        id: 'superadmin-123',
        username: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // When: Validierung ausführen
      const result: ValidatedAdminUser = await strategy.validate(mockRequest, payload);

      // Then: Sollte ValidatedAdminUser zurückgeben
      expect(result).toEqual({
        userId: 'superadmin-123',
        username: 'superadmin@example.com',
        role: UserRole.SUPER_ADMIN,
      });
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
      expect(mockAuthService.findUserById).toHaveBeenCalledWith('superadmin-123');
    });

    it('should successfully validate token with isAdmin flag (new format)', async () => {
      // Given: Request mit neuem Token-Format (mit isAdmin=true)
      const mockRequest = {
        cookies: {
          adminToken: 'new-format-admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload & { isAdmin: boolean } = {
        sub: 'admin-456',
        username: 'newadmin@example.com',
        role: UserRole.ADMIN,
        isAdmin: true, // Neues Format mit isAdmin Flag
      };

      // Mock: Beide Tokens gültig, User existiert und ist Admin
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue({
        id: 'admin-456',
        username: 'newadmin@example.com',
        role: UserRole.ADMIN,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // When: Validierung ausführen
      const result: ValidatedAdminUser = await strategy.validate(mockRequest, payload);

      // Then: Sollte ValidatedAdminUser zurückgeben
      expect(result).toEqual({
        userId: 'admin-456',
        username: 'newadmin@example.com',
        role: UserRole.ADMIN,
      });
    });

    it('should throw ForbiddenException when isAdmin=false in new payload format', async () => {
      // Given: Request mit neuem Token-Format, aber isAdmin=false
      const mockRequest = {
        cookies: {
          adminToken: 'invalid-admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload & { isAdmin: boolean } = {
        sub: 'user-789',
        username: 'notadmin@example.com',
        role: UserRole.ADMIN, // Rolle sagt ADMIN
        isAdmin: false, // Aber isAdmin Flag ist false!
      };

      // Mock: accessToken ist gültig
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);

      // When/Then: Validierung sollte mit ForbiddenException fehlschlagen (403)
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAdminPayload() (Zeile 145-152)
      // → hasNewFormat=true, aber payload.isAdmin=false → wirft ForbiddenException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(ForbiddenException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Token is not an admin token');

      // Verify: findUserById wurde NICHT aufgerufen (früher Abbruch)
      expect(mockAuthService.findUserById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when accessToken is empty string', async () => {
      // Given: Request mit leerem accessToken (trim() Pfad)
      const mockRequest = {
        cookies: {
          adminToken: 'valid-admin-token',
          accessToken: '   ', // Nur Whitespace
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-999',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAccessToken() (Zeile 113)
      // → accessToken.trim() === '' Check → wirft UnauthorizedException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');

      // Verify: verifyAccessToken wurde NICHT aufgerufen (früher Abbruch wegen trim)
      expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when findUserById throws exception', async () => {
      // Given: Request mit gültigem Token, aber DB-Fehler beim User-Lookup
      const mockRequest = {
        cookies: {
          adminToken: 'admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-888',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: accessToken ist gültig, aber findUserById wirft Exception
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockRejectedValue(new Error('Database connection failed'));

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // ME-3: Code-Pfad: AdminJwtStrategy.validateUserExists() (Zeile 164-169)
      // → findUserById() catch Block → wirft UnauthorizedException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');

      // Verify: findUserById wurde aufgerufen (Exception wurde geworfen)
      expect(mockAuthService.findUserById).toHaveBeenCalledWith('user-888');
    });

    it('should throw UnauthorizedException when both cookies are missing', async () => {
      // Given: Request ohne Cookies (weder accessToken noch adminToken)
      const mockRequest = {
        cookies: {}, // Beide Cookies fehlen
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAccessToken() (Zeile 112-116)
      // → accessToken ist undefined → wirft UnauthorizedException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');

      // Verify: findUserById wurde NICHT aufgerufen (früher Abbruch)
      expect(mockAuthService.findUserById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when payload role is undefined', async () => {
      // Given: Request mit Cookies, aber Payload ohne Rolle
      const mockRequest = {
        cookies: {
          adminToken: 'admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'admin@example.com',
        role: undefined as unknown as UserRole, // Rolle ist undefined
      };

      // Mock: accessToken ist gültig
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);

      // When/Then: Validierung sollte mit ForbiddenException fehlschlagen (403)
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAdminPayload() (Zeile 132-143)
      // → isAdmin(undefined) gibt false → hasLegacyRole=false → wirft ForbiddenException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(ForbiddenException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Token is not an admin token');

      // Verify: findUserById wurde NICHT aufgerufen (früher Abbruch)
      expect(mockAuthService.findUserById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user role is null in database', async () => {
      // Given: Request mit Admin-Token, aber User hat null als Rolle in DB
      const mockRequest = {
        cookies: {
          adminToken: 'admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN, // Token sagt ADMIN
      };

      // Mock: accessToken ist gültig, aber User hat null als Rolle in DB
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'admin@example.com',
        role: null as unknown as UserRole, // Rolle ist null in DB
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // When/Then: Validierung sollte mit ForbiddenException fehlschlagen (403)
      // ME-3: Code-Pfad: AdminJwtStrategy.validateAdminRights() (Zeile 186-193)
      // → isAdmin(null) gibt false → wirft ForbiddenException
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(ForbiddenException);
      // ME-2: Error-Message-Konsistenz prüfen
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('User is no longer an admin');

      // Verify: findUserById wurde aufgerufen (späterer Check)
      expect(mockAuthService.findUserById).toHaveBeenCalledWith('user-123');
    });

    it('should apply constant time delay on auth failure (timing attack mitigation)', async () => {
      // Given: Request ohne accessToken (wird 401 werfen)
      const mockRequest = {
        cookies: {
          adminToken: 'valid-admin-token',
          // accessToken fehlt absichtlich
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'user-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Spy auf private constantTimeDelay Methode
      // biome-ignore lint/suspicious/noExplicitAny: Test benötigt Zugriff auf private Methode
      const delaySpy = jest.spyOn(strategy as any, 'constantTimeDelay');

      // When: Validierung schlägt fehl
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);

      // Then: constantTimeDelay wurde genau einmal aufgerufen (Timing Attack Prevention)
      expect(delaySpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT apply constant time delay on successful auth', async () => {
      // Given: Request mit gültigem Admin-Token und accessToken
      const mockRequest = {
        cookies: {
          adminToken: 'valid-admin-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: 'admin-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: Beide Tokens gültig, User existiert und ist Admin
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);
      mockAuthService.findUserById.mockResolvedValue({
        id: 'admin-123',
        username: 'admin@example.com',
        role: UserRole.ADMIN,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Spy auf private constantTimeDelay Methode
      // biome-ignore lint/suspicious/noExplicitAny: Test benötigt Zugriff auf private Methode
      const delaySpy = jest.spyOn(strategy as any, 'constantTimeDelay');

      // When: Validierung erfolgreich
      await strategy.validate(mockRequest, payload);

      // Then: constantTimeDelay wurde NICHT aufgerufen (kein Delay bei Success)
      expect(delaySpy).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when payload.sub is empty string', async () => {
      // Given: Request mit leerem payload.sub (manipuliertes JWT)
      const mockRequest = {
        cookies: {
          adminToken: 'manipulated-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: '', // Leerer String - Angriffsvektor
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: accessToken ist gültig
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // Code-Pfad: AdminJwtStrategy.validateUserExists() - Input Validation
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');

      // Verify: findUserById wurde NICHT aufgerufen (Early Exit durch Input Validation)
      expect(mockAuthService.findUserById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when payload.sub is whitespace-only', async () => {
      // Given: Request mit Whitespace-only payload.sub (manipuliertes JWT)
      const mockRequest = {
        cookies: {
          adminToken: 'manipulated-token',
          accessToken: 'valid-access-token',
        },
      } as Request;

      const payload: AdminJwtPayload = {
        sub: '   ', // Nur Whitespace - Angriffsvektor
        username: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      // Mock: accessToken ist gültig
      mockAuthService.verifyAccessToken.mockResolvedValue(undefined);

      // When/Then: Validierung sollte mit UnauthorizedException fehlschlagen
      // Code-Pfad: AdminJwtStrategy.validateUserExists() - Input Validation (trim() Check)
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(mockRequest, payload)).rejects.toThrow('Unauthorized - Invalid admin credentials');

      // Verify: findUserById wurde NICHT aufgerufen (Early Exit durch Input Validation)
      expect(mockAuthService.findUserById).not.toHaveBeenCalled();
    });
  });
});
