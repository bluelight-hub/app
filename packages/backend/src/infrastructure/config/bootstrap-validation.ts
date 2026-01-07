// biome-ignore lint/style/noRestrictedImports: Bootstrap-Funktion laeuft vor DI-Container, Logger direkt verwenden
import { Logger } from '@nestjs/common';

/**
 * Validiert INSECURE_MODE Konfiguration beim App-Start.
 *
 * **Verhalten:**
 * - Development + INSECURE_MODE=true → Warning Log, App startet
 * - Production + INSECURE_MODE=true → Error Log + Exception (App crasht)
 * - INSECURE_MODE=false/undefined → Keine Aktion
 *
 * **Rationale:**
 * INSECURE_MODE deaktiviert die Token-Validierung komplett.
 * In Production ist das ein kritisches Sicherheitsrisiko und MUSS
 * zum sofortigen App-Crash fuehren.
 *
 * @param insecureMode - Wert von INSECURE_MODE Env-Variable ('true' | 'false' | undefined)
 * @param isProduction - true wenn NODE_ENV=production
 * @param logger - Optional: Custom Logger (fuer Tests)
 * @throws Error wenn INSECURE_MODE in Production aktiviert ist
 */
export function validateInsecureMode(insecureMode: string | undefined, isProduction: boolean, logger: typeof Logger = Logger): void {
  const isInsecure = insecureMode === 'true';

  if (!isInsecure) {
    return;
  }

  // CRITICAL: In Production MUSS die App crashen - INSECURE_MODE ist NIEMALS erlaubt
  if (isProduction) {
    logger.error('💀 ====================================', 'Bootstrap');
    logger.error('💀 FATAL: INSECURE_MODE IN PRODUCTION', 'Bootstrap');
    logger.error('💀 Token validation would be DISABLED', 'Bootstrap');
    logger.error('💀 APPLICATION STARTUP ABORTED', 'Bootstrap');
    logger.error('💀 ====================================', 'Bootstrap');
    throw new Error('INSECURE_MODE is not allowed in production environment. Set INSECURE_MODE=false or remove the variable.');
  }

  // Development Warning
  logger.warn('⚠️ ====================================', 'Bootstrap');
  logger.warn('⚠️ INSECURE_MODE ACTIVE', 'Bootstrap');
  logger.warn('⚠️ Token validation is DISABLED', 'Bootstrap');
  logger.warn('⚠️ DO NOT USE IN PRODUCTION', 'Bootstrap');
  logger.warn('⚠️ ====================================', 'Bootstrap');
}
