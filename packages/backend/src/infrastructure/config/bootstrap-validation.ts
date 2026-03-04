// biome-ignore lint/style/noRestrictedImports: Bootstrap-Funktion laeuft vor DI-Container, Logger direkt verwenden
import { Logger } from '@nestjs/common';
import { parseMasterSecretKey } from '@/infrastructure/security/master-key-crypto';

export interface BootstrapConfig {
  databaseUrl: string;
  masterSecretKey: Buffer | null;
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
    masterSecretKey: string | undefined;
  },
  logger: typeof Logger = Logger,
): BootstrapConfig {
  const databaseUrl = input.databaseUrl?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist nicht gesetzt. Ohne Datenbank kann die Runtime-Konfiguration nicht geladen werden.');
  }

  let masterSecretKey: Buffer;
  const rawMasterSecret = input.masterSecretKey?.trim();
  if (!rawMasterSecret) {
    logger.warn('[BOOTSTRAP] MASTER_SECRET_KEY ist nicht gesetzt. Secret-Migration und -Entschlüsselung laufen im ENV-Fallback-Modus.');
    return {
      databaseUrl,
      masterSecretKey: null,
    };
  }

  try {
    masterSecretKey = parseMasterSecretKey(rawMasterSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[BOOTSTRAP] MASTER_SECRET_KEY ist ungültig: ${message}. Secret-Migration und -Entschlüsselung laufen im ENV-Fallback-Modus.`);
    return {
      databaseUrl,
      masterSecretKey: null,
    };
  }

  if (masterSecretKey.length !== 32) {
    logger.warn(`[BOOTSTRAP] MASTER_SECRET_KEY hat die falsche Länge: ${masterSecretKey.length} Bytes. Secret-Migration und -Entschlüsselung laufen im ENV-Fallback-Modus.`);
    return {
      databaseUrl,
      masterSecretKey: null,
    };
  }

  logger.log('[BOOTSTRAP] Konfiguration validiert (DATABASE_URL). Optionales Secret ist nur für Secret-Features erforderlich.', 'Bootstrap');

  return {
    databaseUrl,
    masterSecretKey,
  };
}
