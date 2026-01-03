/**
 * AES-256-GCM Encryption Adapter - Implementierung des IEncryptionPort.
 *
 * Verwendet AES-256-GCM für authentifizierte Verschlüsselung von sensiblen Daten
 * wie API-Tokens für externe Integrationen.
 *
 * **Sicherheitsmerkmale:**
 * - AES-256-GCM bietet sowohl Verschlüsselung als auch Authentifizierung (AEAD)
 * - IV wird pro Verschlüsselung zufällig generiert (16 bytes)
 * - Auth-Tag verhindert Manipulation des Cipher-Texts
 * - Key aus Umgebungsvariable (nicht im Code)
 *
 * **Format des verschlüsselten Outputs:**
 * `{iv}:{authTag}:{cipherText}` (alle Base64-kodiert)
 *
 * @module infrastructure/security
 * @see IEncryptionPort - Domain Port Interface
 */

// biome-ignore lint/style/noRestrictedImports: Logger in Adapter ist erlaubt
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
// biome-ignore lint/style/useImportType: ConfigService wird für DI zur Laufzeit benötigt
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import type { IEncryptionPort } from '@domain/ports/i-encryption.port';

/** Algorithmus: AES-256-GCM (Authenticated Encryption with Associated Data) */
const ALGORITHM = 'aes-256-gcm';

/** IV Länge in Bytes (128 bit = 16 bytes, empfohlen für GCM) */
const IV_LENGTH = 16;

/** Auth Tag Länge in Bytes (128 bit = 16 bytes) */
const AUTH_TAG_LENGTH = 16;

/** Name der Umgebungsvariable für den Encryption Key */
const ENV_KEY_NAME = 'INTEGRATION_ENCRYPTION_KEY';

/** Erwartete Länge des Keys in Hex-Zeichen (64 hex chars = 32 bytes = 256 bit) */
const EXPECTED_KEY_LENGTH = 64;

/**
 * AES-256-GCM Encryption Adapter.
 *
 * **Initialisierung:**
 * Der Adapter validiert beim App-Start (OnModuleInit) dass der Encryption Key
 * korrekt konfiguriert ist. Bei fehlender/ungültiger Konfiguration wird die
 * App mit einem Fehler beendet (Hard-Fail für Security).
 *
 * **Verwendung:**
 * ```typescript
 * @Inject(INTEGRATIONS.ENCRYPTION_PORT) private readonly encryption: IEncryptionPort
 *
 * const encrypted = this.encryption.encrypt('secret-token');
 * const decrypted = this.encryption.decrypt(encrypted);
 * ```
 */
@Injectable()
export class AesEncryptionAdapter implements IEncryptionPort, OnModuleInit {
  private readonly logger = new Logger(AesEncryptionAdapter.name);
  private encryptionKey: Buffer | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Validiert den Encryption Key beim App-Start.
   *
   * **Hard-Fail für Security:**
   * - Fehlendes ENV: App-Start wird verhindert
   * - Falsches Format: App-Start wird verhindert
   * - Erfolgreich: Key als Buffer speichern
   *
   * @throws Error wenn der Encryption Key fehlt oder ungültig ist
   */
  onModuleInit(): void {
    const keyHex = this.configService.get<string>(ENV_KEY_NAME);

    if (!keyHex) {
      const errorMsg = `[SECURITY] ${ENV_KEY_NAME} ist nicht konfiguriert. Die App kann ohne Encryption Key nicht starten. Generiere einen Key mit: openssl rand -hex 32`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (keyHex.length !== EXPECTED_KEY_LENGTH) {
      const errorMsg =
        `[SECURITY] ${ENV_KEY_NAME} hat ungültige Länge (${keyHex.length} statt ${EXPECTED_KEY_LENGTH} Zeichen). ` +
        'Der Key muss 64 Hex-Zeichen (32 Bytes) haben. ' +
        'Generiere einen neuen Key mit: openssl rand -hex 32';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
      const errorMsg = `[SECURITY] ${ENV_KEY_NAME} enthält ungültige Zeichen (nur 0-9, a-f erlaubt). Generiere einen neuen Key mit: openssl rand -hex 32`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
      this.isInitialized = true;
      this.logger.log('[SECURITY] AES-256-GCM Encryption initialisiert');
    } catch (error) {
      const errorMsg = '[SECURITY] Fehler beim Parsen des Encryption Keys. Generiere einen neuen Key mit: openssl rand -hex 32';
      this.logger.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  /**
   * Verschlüsselt einen Klartext-String mit AES-256-GCM.
   *
   * @param plainText - Der zu verschlüsselnde Klartext
   * @returns Der verschlüsselte Text im Format `{iv}:{authTag}:{cipherText}` (Base64)
   * @throws Error wenn Encryption nicht initialisiert oder Verschlüsselung fehlschlägt
   */
  encrypt(plainText: string): string {
    this.ensureInitialized();

    // IV generieren (16 bytes, kryptografisch sicher)
    const iv = crypto.randomBytes(IV_LENGTH);

    // Cipher erstellen
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey!, iv);

    // Verschlüsseln
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

    // Auth Tag abrufen
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:cipherText (alle Base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Entschlüsselt einen verschlüsselten String.
   *
   * @param cipherText - Der verschlüsselte Text im Format `{iv}:{authTag}:{cipherText}`
   * @returns Der entschlüsselte Klartext
   * @throws Error wenn Format ungültig, Key falsch oder Daten manipuliert wurden
   */
  decrypt(cipherText: string): string {
    this.ensureInitialized();

    // Format parsen: iv:authTag:encrypted
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Ungültiges verschlüsseltes Format (erwartet iv:authTag:cipherText)');
    }

    const ivB64 = parts[0]!;
    const authTagB64 = parts[1]!;
    const encryptedB64 = parts[2]!;

    // Base64 dekodieren
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    // Längen validieren
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Ungültige IV Länge (${iv.length} statt ${IV_LENGTH} bytes)`);
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Ungültige Auth-Tag Länge (${authTag.length} statt ${AUTH_TAG_LENGTH} bytes)`);
    }

    // Decipher erstellen
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey!, iv);
    decipher.setAuthTag(authTag);

    // Entschlüsseln
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Prüft ob die Encryption initialisiert ist.
   *
   * @throws Error wenn nicht initialisiert
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.encryptionKey) {
      throw new Error(
        `Encryption nicht initialisiert - ${ENV_KEY_NAME} Umgebungsvariable fehlt oder ungültig. ` +
          "Generiere einen Key mit: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
  }
}
