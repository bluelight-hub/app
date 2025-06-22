import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

jest.mock('otplib');
jest.mock('qrcode');
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

describe('MfaService', () => {
  let service: MfaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    mfaSecret: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    webAuthnCredential: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config = {
        MFA_SECRET_KEY: 'test-secret-key',
        WEBAUTHN_RP_NAME: 'TestApp',
        WEBAUTHN_RP_ID: 'localhost',
        WEBAUTHN_ORIGIN: 'http://localhost:3000',
      };
      return config[key];
    }),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    // Mock ConfigService to return encryption key
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'MFA_ENCRYPTION_KEY') {
        return 'test-encryption-key-at-least-32-characters-long';
      }
      if (key === 'APP_NAME') {
        return 'Test App';
      }
      if (key === 'WEBAUTHN_RP_ID') {
        return 'localhost';
      }
      if (key === 'WEBAUTHN_ORIGIN') {
        return 'http://localhost:5173';
      }
      return defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);

    jest.clearAllMocks();
  });

  describe('setupTotp', () => {
    it('should generate and save TOTP secret', async () => {
      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });
      (authenticator.generateSecret as jest.Mock).mockReturnValue('SECRET123');
      (authenticator.keyuri as jest.Mock).mockReturnValue(
        'otpauth://totp/TestApp:test@example.com?secret=SECRET123',
      );
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qrcode');
      mockPrismaService.mfaSecret.upsert.mockResolvedValue({
        id: '1',
        userId: '1',
        secret: 'encrypted-secret',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
      });

      const result = await service.setupTotp('1');

      expect(result).toHaveProperty('secret', 'SECRET123');
      expect(result).toHaveProperty('qrCode', 'data:image/png;base64,qrcode');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should regenerate secret if one already exists', async () => {
      const existingSecret = {
        id: '1',
        userId: '1',
        secret: 'old-secret',
        isVerified: false,
      };

      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(existingSecret);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });
      (authenticator.generateSecret as jest.Mock).mockReturnValue('NEWSECRET123');
      (authenticator.keyuri as jest.Mock).mockReturnValue(
        'otpauth://totp/TestApp:test@example.com?secret=NEWSECRET123',
      );
      (qrcode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,newqrcode');

      const result = await service.setupTotp('1');

      expect(mockPrismaService.mfaSecret.upsert).toHaveBeenCalled();
      expect(result.secret).toBe('NEWSECRET123');
    });
  });

  describe('verifyTotp', () => {
    it('should verify TOTP and mark as verified', async () => {
      const mockMfaSecret = {
        id: '1',
        userId: '1',
        secret: 'iv:authTag:encryptedData', // Properly formatted encrypted string
        isVerified: false,
      };

      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(mockMfaSecret);

      // Mock the decrypt method to return a known secret
      jest.spyOn(service as any, 'decrypt').mockReturnValue('DECRYPTED_SECRET');

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyTotp('1', '123456');

      expect(result).toBe(true);
      expect(mockPrismaService.mfaSecret.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isVerified: true, verifiedAt: expect.any(Date) },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isMfaEnabled: true },
      });
    });

    it('should throw error if MFA secret not found', async () => {
      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(null);

      await expect(service.verifyTotp('1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw exception for invalid code', async () => {
      const mockMfaSecret = {
        id: '1',
        userId: '1',
        secret: 'iv:authTag:encryptedData',
        isVerified: false,
      };

      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(mockMfaSecret);

      // Mock the decrypt method
      jest.spyOn(service as any, 'decrypt').mockReturnValue('DECRYPTED_SECRET');

      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyTotp('1', '123456')).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.mfaSecret.update).not.toHaveBeenCalled();
    });
  });

  describe('validateTotp', () => {
    it('should validate TOTP code successfully', async () => {
      const mockMfaSecret = {
        id: '1',
        userId: '1',
        secret: 'iv:authTag:encryptedData',
        isVerified: true,
        backupCodes: [],
      };

      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(mockMfaSecret);

      // Mock the decrypt and encrypt methods
      jest.spyOn(service as any, 'decrypt').mockReturnValue('DECRYPTED_SECRET');
      jest.spyOn(service as any, 'encrypt').mockReturnValue('ENCRYPTED_CODE');

      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.validateTotp('1', '123456');

      expect(result).toBe(true);
      expect(mockPrismaService.mfaSecret.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should throw error if MFA secret not found', async () => {
      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(null);

      await expect(service.validateTotp('1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if MFA not verified', async () => {
      const mockMfaSecret = {
        id: '1',
        userId: '1',
        secret: 'encrypted-secret',
        isVerified: false,
      };

      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(mockMfaSecret);

      await expect(service.validateTotp('1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('hasMfaEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        isMfaEnabled: true,
      });

      const result = await service.hasMfaEnabled('1');

      expect(result).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        isMfaEnabled: false,
      });

      const result = await service.hasMfaEnabled('1');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.hasMfaEnabled('1');

      expect(result).toBe(false);
    });
  });

  describe('getUserMfaMethods', () => {
    it('should return user MFA methods', async () => {
      const mockTotp = {
        isVerified: true,
        lastUsedAt: new Date(),
      };

      const mockWebAuthnCreds = [
        {
          id: 'cred1',
          name: 'Chrome on Mac',
          deviceType: 'platform',
          lastUsedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.mfaSecret.findUnique.mockResolvedValue(mockTotp);
      mockPrismaService.webAuthnCredential.findMany.mockResolvedValue(mockWebAuthnCreds);

      const result = await service.getUserMfaMethods('1');

      expect(result).toEqual({
        totp: { lastUsedAt: mockTotp.lastUsedAt },
        webauthn: [
          {
            id: 'cred1',
            name: 'Chrome on Mac',
            deviceType: 'platform',
            lastUsedAt: mockWebAuthnCreds[0].lastUsedAt,
            createdAt: mockWebAuthnCreds[0].createdAt,
          },
        ],
      });
    });
  });

  describe('disableTotp', () => {
    it('should disable TOTP and MFA if no WebAuthn', async () => {
      mockPrismaService.webAuthnCredential.count.mockResolvedValue(0);

      await service.disableTotp('1');

      expect(mockPrismaService.mfaSecret.delete).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isMfaEnabled: false },
      });
    });

    it('should keep MFA enabled if WebAuthn exists', async () => {
      mockPrismaService.webAuthnCredential.count.mockResolvedValue(1);

      await service.disableTotp('1');

      expect(mockPrismaService.mfaSecret.delete).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('removeWebAuthnCredential', () => {
    it('should remove credential and disable MFA if no other MFA methods exist', async () => {
      mockPrismaService.webAuthnCredential.delete.mockResolvedValue({});
      mockPrismaService.mfaSecret.count.mockResolvedValue(0);
      mockPrismaService.webAuthnCredential.count.mockResolvedValue(0);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.removeWebAuthnCredential('user-1', 'cred-1');

      expect(mockPrismaService.webAuthnCredential.delete).toHaveBeenCalledWith({
        where: {
          id: 'cred-1',
          userId: 'user-1',
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isMfaEnabled: false },
      });
    });

    it('should keep MFA enabled if TOTP is still active', async () => {
      mockPrismaService.webAuthnCredential.delete.mockResolvedValue({});
      mockPrismaService.mfaSecret.count.mockResolvedValue(1); // TOTP exists
      mockPrismaService.webAuthnCredential.count.mockResolvedValue(0);

      await service.removeWebAuthnCredential('user-1', 'cred-1');

      expect(mockPrismaService.webAuthnCredential.delete).toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should keep MFA enabled if other WebAuthn credentials exist', async () => {
      mockPrismaService.webAuthnCredential.delete.mockResolvedValue({});
      mockPrismaService.mfaSecret.count.mockResolvedValue(0);
      mockPrismaService.webAuthnCredential.count.mockResolvedValue(2); // Other credentials exist

      await service.removeWebAuthnCredential('user-1', 'cred-1');

      expect(mockPrismaService.webAuthnCredential.delete).toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });
});
