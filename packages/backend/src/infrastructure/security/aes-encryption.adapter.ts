// biome-ignore lint/style/noRestrictedImports: Logger in Adapter ist erlaubt
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import type { IEncryptionPort } from '@domain/ports/i-encryption.port';
import { decryptV1String, encryptV1String, isLegacyCiphertextFormat, parseMasterSecretKey } from './master-key-crypto';

const LEGACY_ENV_KEY_NAME = 'INTEGRATION_ENCRYPTION_KEY';
const LEGACY_EXPECTED_KEY_LENGTH = 64;
const LEGACY_ALGORITHM = 'aes-256-gcm';
const LEGACY_IV_LENGTH = 16;
const LEGACY_AUTH_TAG_LENGTH = 16;
const INTEGRATION_SECRET_SCOPE = 'bluelight-hub/integration-secrets/v1';

@Injectable()
export class AesEncryptionAdapter implements IEncryptionPort, OnModuleInit {
  private readonly logger = new Logger(AesEncryptionAdapter.name);
  private masterKey: Buffer | null = null;
  private legacyKey: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const masterSecret = this.configService.get<string>('MASTER_SECRET_KEY');

    if (!masterSecret) {
      throw new Error('[SECURITY] MASTER_SECRET_KEY ist nicht konfiguriert. Secret-Verschlüsselung kann nicht initialisiert werden.');
    }

    try {
      this.masterKey = parseMasterSecretKey(masterSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[SECURITY] MASTER_SECRET_KEY ist ungültig: ${message}`);
    }

    if (this.masterKey.length !== 32) {
      throw new Error(`[SECURITY] MASTER_SECRET_KEY muss 32 Bytes ergeben (aktuell: ${this.masterKey.length}).`);
    }

    this.legacyKey = this.tryLoadLegacyKey();

    if (this.legacyKey) {
      this.logger.warn('[SECURITY] Legacy-Key INTEGRATION_ENCRYPTION_KEY erkannt. Dual-Read aktiv, neue Writes erfolgen nur als v1-Payload.');
    }

    this.logger.log('[SECURITY] Secret-Verschlüsselung (v1) initialisiert');
  }

  encrypt(plainText: string): string {
    const masterKey = this.getMasterKeyOrThrow();

    return encryptV1String(plainText, {
      masterKey,
      scope: INTEGRATION_SECRET_SCOPE,
      key: 'integration_credential',
    });
  }

  decrypt(cipherText: string): string {
    const masterKey = this.getMasterKeyOrThrow();

    if (isLegacyCiphertextFormat(cipherText)) {
      return this.decryptLegacy(cipherText);
    }

    return decryptV1String(cipherText, {
      masterKey,
      expectedScope: INTEGRATION_SECRET_SCOPE,
    });
  }

  private decryptLegacy(cipherText: string): string {
    if (!this.legacyKey) {
      throw new Error('[SECURITY] Legacy-Ciphertext erkannt, aber INTEGRATION_ENCRYPTION_KEY ist nicht verfügbar.');
    }

    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Ungültiges Legacy-Ciphertext-Format (erwartet iv:authTag:ciphertext)');
    }

    const iv = Buffer.from(parts[0]!, 'base64');
    const authTag = Buffer.from(parts[1]!, 'base64');
    const encrypted = Buffer.from(parts[2]!, 'base64');

    if (iv.length !== LEGACY_IV_LENGTH) {
      throw new Error(`Ungültige Legacy-IV Länge (${iv.length} statt ${LEGACY_IV_LENGTH} bytes)`);
    }

    if (authTag.length !== LEGACY_AUTH_TAG_LENGTH) {
      throw new Error(`Ungültige Legacy-Auth-Tag Länge (${authTag.length} statt ${LEGACY_AUTH_TAG_LENGTH} bytes)`);
    }

    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, this.legacyKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private tryLoadLegacyKey(): Buffer | null {
    const legacyKey = this.configService.get<string>(LEGACY_ENV_KEY_NAME);
    if (!legacyKey) {
      return null;
    }

    if (legacyKey.length !== LEGACY_EXPECTED_KEY_LENGTH) {
      this.logger.warn(`[SECURITY] ${LEGACY_ENV_KEY_NAME} hat ungültige Länge und wird ignoriert.`);
      return null;
    }

    if (!/^[0-9a-fA-F]+$/.test(legacyKey)) {
      this.logger.warn(`[SECURITY] ${LEGACY_ENV_KEY_NAME} enthält ungültige Zeichen und wird ignoriert.`);
      return null;
    }

    return Buffer.from(legacyKey, 'hex');
  }

  private getMasterKeyOrThrow(): Buffer {
    if (!this.masterKey) {
      throw new Error('Encryption nicht initialisiert: MASTER_SECRET_KEY fehlt oder ist ungültig.');
    }

    return this.masterKey;
  }
}
