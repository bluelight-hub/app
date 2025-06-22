import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  AuthenticatorTransport,
  WebAuthnCredential,
} from '@simplewebauthn/types';

/**
 * Service zur Verwaltung von Multi-Factor Authentication (MFA).
 * Unterstützt TOTP (Time-based One-Time Password) und WebAuthn.
 */
@Injectable()
export class MfaService {
  private readonly encryptionKey: Buffer;
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Encryption key for TOTP secrets
    const key = this.configService.get<string>('MFA_ENCRYPTION_KEY');
    if (!key || key.length < 32) {
      throw new Error('MFA_ENCRYPTION_KEY must be at least 32 characters');
    }
    this.encryptionKey = Buffer.from(key.substring(0, 32));

    // WebAuthn configuration
    this.rpName = this.configService.get<string>('APP_NAME', 'Bluelight Hub');
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID', 'localhost');
    this.origin = this.configService.get<string>('WEBAUTHN_ORIGIN', 'http://localhost:5173');
  }

  /**
   * Setup TOTP for a user
   */
  async setupTotp(
    userId: string,
  ): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    // Check if user already has TOTP setup
    const existingSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
    });

    if (existingSecret && existingSecret.isVerified) {
      throw new BadRequestException('TOTP already setup for this user');
    }

    // Generate new secret
    const secret = authenticator.generateSecret();
    const encryptedSecret = this.encrypt(secret);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );
    const encryptedBackupCodes = backupCodes.map((code) => this.encrypt(code));

    // Get user email for QR code
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate QR code
    const otpauth = authenticator.keyuri(user.email, this.rpName, secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    // Save or update MFA secret
    await this.prisma.mfaSecret.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        isVerified: false,
      },
      update: {
        secret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        isVerified: false,
      },
    });

    return { secret, qrCode, backupCodes };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyTotp(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new BadRequestException('MFA not setup for this user');
    }

    const secret = this.decrypt(mfaSecret.secret);
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    // Mark as verified and enable MFA
    await this.prisma.mfaSecret.update({
      where: { id: mfaSecret.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: true },
    });

    return true;
  }

  /**
   * Validate TOTP code during login
   */
  async validateTotp(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { userId },
    });

    if (!mfaSecret || !mfaSecret.isVerified) {
      throw new BadRequestException('MFA not setup or not verified for this user');
    }

    // Check if it's a backup code
    const encryptedCode = this.encrypt(code.toUpperCase());
    const backupCodeIndex = mfaSecret.backupCodes.findIndex((bc) => bc === encryptedCode);

    if (backupCodeIndex !== -1) {
      // Remove used backup code
      const newBackupCodes = [...mfaSecret.backupCodes];
      newBackupCodes.splice(backupCodeIndex, 1);

      await this.prisma.mfaSecret.update({
        where: { id: mfaSecret.id },
        data: {
          backupCodes: newBackupCodes,
          lastUsedAt: new Date(),
        },
      });

      return true;
    }

    // Validate TOTP
    const secret = this.decrypt(mfaSecret.secret);
    const isValid = authenticator.verify({ token: code, secret });

    if (isValid) {
      await this.prisma.mfaSecret.update({
        where: { id: mfaSecret.id },
        data: { lastUsedAt: new Date() },
      });
    }

    return isValid;
  }

  /**
   * Start WebAuthn registration
   */
  async startWebAuthnRegistration(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get existing credentials
    const existingCredentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true },
    });

    const excludeCredentials = existingCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.username,
      userDisplayName: user.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge in session or cache (for now, we'll return it)
    return {
      options,
      challenge: options.challenge,
    };
  }

  /**
   * Complete WebAuthn registration
   */
  async completeWebAuthnRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    challenge: string,
    deviceName?: string,
  ): Promise<boolean> {
    let verification: VerifiedRegistrationResponse;

    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });
    } catch (_error) {
      throw new BadRequestException('WebAuthn registration verification failed');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('WebAuthn registration failed');
    }

    const { credential } = verification.registrationInfo;
    const credentialID = credential.id;
    const credentialPublicKey = credential.publicKey;
    const counter = credential.counter;

    // Extract device info from authenticatorExtensionResults if available
    const credentialDeviceType = 'unknown';
    const credentialBackedUp = false;

    // Save credential
    await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter: BigInt(counter),
        deviceType: credentialDeviceType || 'unknown',
        transports: response.response.transports || [],
        isBackupEligible: credentialBackedUp || false,
        isBackupState: credentialBackedUp || false,
        name: deviceName || 'WebAuthn Device',
      },
    });

    // Enable MFA for user if not already enabled
    await this.prisma.user.update({
      where: { id: userId },
      data: { isMfaEnabled: true },
    });

    return true;
  }

  /**
   * Start WebAuthn authentication
   */
  async startWebAuthnAuthentication(userId: string) {
    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    if (credentials.length === 0) {
      throw new BadRequestException('No WebAuthn credentials found for user');
    }

    const allowCredentials = credentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key' as const,
      transports: cred.transports as AuthenticatorTransport[],
    }));

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    return {
      options,
      challenge: options.challenge,
    };
  }

  /**
   * Complete WebAuthn authentication
   */
  async completeWebAuthnAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    challenge: string,
  ): Promise<boolean> {
    const credential = await this.prisma.webAuthnCredential.findFirst({
      where: {
        userId,
        credentialId: Buffer.from(response.id, 'base64url').toString('base64'),
      },
    });

    if (!credential) {
      throw new BadRequestException('WebAuthn credential not found');
    }

    // Create WebAuthnCredential object for verification
    const webauthnCredential: WebAuthnCredential = {
      id: credential.credentialId,
      publicKey: Buffer.from(credential.publicKey, 'base64'),
      counter: Number(credential.counter),
      transports: credential.transports as AuthenticatorTransport[],
    };

    let verification: VerifiedAuthenticationResponse;

    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: webauthnCredential,
      });
    } catch (_error) {
      throw new UnauthorizedException('WebAuthn authentication verification failed');
    }

    if (!verification.verified) {
      throw new UnauthorizedException('WebAuthn authentication failed');
    }

    // Update counter and last used
    await this.prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Disable TOTP for a user
   */
  async disableTotp(userId: string): Promise<void> {
    await this.prisma.mfaSecret.delete({
      where: { userId },
    });

    // Check if user has any WebAuthn credentials
    const hasWebAuthn = await this.prisma.webAuthnCredential.count({
      where: { userId },
    });

    // If no WebAuthn credentials, disable MFA entirely
    if (hasWebAuthn === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isMfaEnabled: false },
      });
    }
  }

  /**
   * Remove a WebAuthn credential
   */
  async removeWebAuthnCredential(userId: string, credentialId: string): Promise<void> {
    await this.prisma.webAuthnCredential.delete({
      where: {
        id: credentialId,
        userId, // Ensure user owns the credential
      },
    });

    // Check if user has any other MFA methods
    const hasTotp = await this.prisma.mfaSecret.count({
      where: { userId, isVerified: true },
    });

    const hasOtherWebAuthn = await this.prisma.webAuthnCredential.count({
      where: { userId },
    });

    // If no MFA methods left, disable MFA
    if (hasTotp === 0 && hasOtherWebAuthn === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isMfaEnabled: false },
      });
    }
  }

  /**
   * Check if user has any MFA method setup
   */
  async hasMfaEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isMfaEnabled: true },
    });

    return user?.isMfaEnabled || false;
  }

  /**
   * Get user's MFA methods
   */
  async getUserMfaMethods(userId: string) {
    const [totp, webauthn] = await Promise.all([
      this.prisma.mfaSecret.findUnique({
        where: { userId },
        select: { isVerified: true, lastUsedAt: true },
      }),
      this.prisma.webAuthnCredential.findMany({
        where: { userId },
        select: { id: true, name: true, deviceType: true, lastUsedAt: true, createdAt: true },
      }),
    ]);

    return {
      totp: totp?.isVerified ? { lastUsedAt: totp.lastUsedAt } : null,
      webauthn: webauthn.map((cred) => ({
        id: cred.id,
        name: cred.name,
        deviceType: cred.deviceType,
        lastUsedAt: cred.lastUsedAt,
        createdAt: cred.createdAt,
      })),
    };
  }

  /**
   * Encrypt string using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted;
  }

  /**
   * Decrypt string using AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
