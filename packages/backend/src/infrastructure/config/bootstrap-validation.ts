import { Logger } from '@nestjs/common';
import { parseMasterSecretKey } from '@/infrastructure/security/master-key-crypto';

export interface BootstrapConfig {
  databaseUrl: string;
  masterSecretKey: Buffer | null;
}

interface MasterSecretInput {
  masterSecret?: string;
  masterSecretKey?: string;
}

type InsecureModeLogger = Pick<typeof Logger, 'warn' | 'error'>;

/**
 * Validiert INSECURE_MODE beim Bootstrap.
 *
 * Security-Regel:
 * - Nur der exakte String "true" aktiviert den Modus.
 * - In Produktion ist INSECURE_MODE strikt verboten (Startup-Abbruch).
 * - In Development wird nur eine Warnbox ausgegeben.
 */
export function validateInsecureMode(insecureMode: string | undefined, isProduction: boolean, logger: InsecureModeLogger = Logger): void {
  if (insecureMode !== 'true') {
    return;
  }

  if (isProduction) {
    logger.error('╔══════════════════════════════════════════════════════════╗', 'Bootstrap');
    logger.error('║                        FATAL                             ║', 'Bootstrap');
    logger.error('║             INSECURE_MODE IN PRODUCTION                  ║', 'Bootstrap');
    logger.error('║              APPLICATION STARTUP ABORTED                 ║', 'Bootstrap');
    logger.error('╚══════════════════════════════════════════════════════════╝', 'Bootstrap');
    throw new Error('INSECURE_MODE is not allowed in production environment');
  }

  logger.warn('╔══════════════════════════════════════════════════════════╗', 'Bootstrap');
  logger.warn('║                INSECURE_MODE ACTIVE                      ║', 'Bootstrap');
  logger.warn('║            Token validation is DISABLED                  ║', 'Bootstrap');
  logger.warn('║               DO NOT USE IN PRODUCTION                   ║', 'Bootstrap');
  logger.warn('╚══════════════════════════════════════════════════════════╝', 'Bootstrap');
}

/**
 * Validiert Bootstrap-Pflichtvariablen fuer ADR-002.
 *
 * Pflichtwerte:
 * - DATABASE_URL
 * Optional für Laufzeit-Secret-Features:
 * - MASTER_SECRET_KEY
 */
export function validateBootstrapConfig(
  input: {
    databaseUrl: string | undefined;
  } & MasterSecretInput,
  logger: typeof Logger = Logger,
): BootstrapConfig {
  const databaseUrl = input.databaseUrl?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist nicht gesetzt. Ohne Datenbank kann die Runtime-Konfiguration nicht geladen werden.');
  }

  let masterSecretKey: Buffer;
  const rawMasterSecret = input.masterSecret?.trim() || input.masterSecretKey?.trim();
  if (!rawMasterSecret) {
    logger.warn('[BOOTSTRAP] MASTER_SECRET ist nicht gesetzt. Legacy-Alias: MASTER_SECRET_KEY. Secret-Migration und -Entschlüsselung laufen im Fallback-Modus.');
    return {
      databaseUrl,
      masterSecretKey: null,
    };
  }

  try {
    masterSecretKey = parseMasterSecretKey(rawMasterSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[BOOTSTRAP] MASTER_SECRET ist ungültig: ${message}. Secret-Migration und -Entschlüsselung laufen im Fallback-Modus.`);
    return {
      databaseUrl,
      masterSecretKey: null,
    };
  }

  if (masterSecretKey.length !== 32) {
    logger.warn(`[BOOTSTRAP] MASTER_SECRET hat die falsche Länge: ${masterSecretKey.length} Bytes. Secret-Migration und -Entschlüsselung laufen im Fallback-Modus.`);
    return {
      databaseUrl,
      masterSecretKey: null,
    };
  }

  if (input.masterSecretKey && !input.masterSecret) {
    logger.warn('[BOOTSTRAP] Verwende Legacy-Alias MASTER_SECRET_KEY. Bitte auf MASTER_SECRET umstellen.');
  }

  logger.log('[BOOTSTRAP] Konfiguration validiert (DATABASE_URL, MASTER_SECRET).', 'Bootstrap');

  return {
    databaseUrl,
    masterSecretKey,
  };
}
