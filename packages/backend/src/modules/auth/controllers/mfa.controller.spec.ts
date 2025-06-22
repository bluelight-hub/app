import { Test, TestingModule } from '@nestjs/testing';
import { MfaController } from './mfa.controller';
import { MfaService } from '../services/mfa.service';
import { JWTPayload } from '../types/jwt.types';
import { RemoveWebAuthnCredentialDto } from '../dto/mfa.dto';

describe('MfaController', () => {
  let controller: MfaController;
  let mfaService: MfaService;

  const mockMfaService = {
    setupTotp: jest.fn(),
    verifyTotp: jest.fn(),
    validateTotp: jest.fn(),
    disableTotp: jest.fn(),
    startWebAuthnRegistration: jest.fn(),
    completeWebAuthnRegistration: jest.fn(),
    startWebAuthnAuthentication: jest.fn(),
    completeWebAuthnAuthentication: jest.fn(),
    removeWebAuthnCredential: jest.fn(),
    hasMfaEnabled: jest.fn(),
    getUserMfaMethods: jest.fn(),
  };

  const mockUser: JWTPayload = {
    sub: '1',
    email: 'test@example.com',
    roles: [],
    permissions: [],
    sessionId: 'session-123',
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 900,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfaController],
      providers: [
        {
          provide: MfaService,
          useValue: mockMfaService,
        },
      ],
    }).compile();

    controller = module.get<MfaController>(MfaController);
    mfaService = module.get<MfaService>(MfaService);

    jest.clearAllMocks();
  });

  describe('setupTotp', () => {
    it('should setup TOTP for user', async () => {
      const expectedResult = {
        secret: 'SECRET123',
        qrCode: 'data:image/png;base64,qrcode',
      };

      mockMfaService.setupTotp.mockResolvedValue(expectedResult);

      const result = await controller.setupTotp(mockUser);

      expect(mfaService.setupTotp).toHaveBeenCalledWith('1');
      expect(result).toBe(expectedResult);
    });
  });

  describe('verifyTotp', () => {
    it('should verify TOTP setup', async () => {
      const dto = { code: '123456' };

      mockMfaService.verifyTotp.mockResolvedValue(true);

      const result = await controller.verifyTotp(mockUser, dto);

      expect(mfaService.verifyTotp).toHaveBeenCalledWith('1', '123456');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getMfaMethods', () => {
    it('should return MFA methods', async () => {
      const expectedResult = {
        totp: { lastUsedAt: new Date() },
        webauthn: [],
      };

      mockMfaService.getUserMfaMethods.mockResolvedValue(expectedResult);

      const result = await controller.getMfaMethods(mockUser);

      expect(mfaService.getUserMfaMethods).toHaveBeenCalledWith('1');
      expect(result).toBe(expectedResult);
    });
  });

  describe('disableTotp', () => {
    it('should disable TOTP', async () => {
      await controller.disableTotp(mockUser);

      expect(mfaService.disableTotp).toHaveBeenCalledWith('1');
    });
  });

  describe('startWebAuthnRegistration', () => {
    it('should start WebAuthn registration', async () => {
      const expectedResult = {
        options: {},
        challenge: 'challenge123',
      };

      mockMfaService.startWebAuthnRegistration.mockResolvedValue(expectedResult);

      const result = await controller.startWebAuthnRegistration(mockUser);

      expect(mfaService.startWebAuthnRegistration).toHaveBeenCalledWith('1');
      expect(result).toBe(expectedResult);
    });
  });

  describe('completeWebAuthnRegistration', () => {
    it('should complete WebAuthn registration', async () => {
      const dto = {
        response: {
          id: 'cred-id',
          rawId: 'raw-id',
          response: {
            clientDataJSON: 'client-data',
            attestationObject: 'attestation',
          },
          clientExtensionResults: {},
          type: 'public-key' as const,
        },
        challenge: 'challenge123',
        deviceName: 'Chrome on Mac',
      };

      mockMfaService.completeWebAuthnRegistration.mockResolvedValue(true);

      const result = await controller.completeWebAuthnRegistration(mockUser, dto);

      expect(mfaService.completeWebAuthnRegistration).toHaveBeenCalledWith(
        '1',
        dto.response,
        dto.challenge,
        dto.deviceName,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('removeWebAuthnCredential', () => {
    it('should remove WebAuthn credential', async () => {
      const dto: RemoveWebAuthnCredentialDto = { credentialId: 'cred123' };

      await controller.removeWebAuthnCredential(mockUser, dto);

      expect(mfaService.removeWebAuthnCredential).toHaveBeenCalledWith('1', 'cred123');
    });
  });
});
