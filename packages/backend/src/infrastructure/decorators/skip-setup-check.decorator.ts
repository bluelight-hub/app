import { SetMetadata } from '@nestjs/common';

/**
 * Metadata-Key fuer SkipSetupCheck Decorator.
 *
 * **Warum eine Konstante statt String-Literal?**
 * - **Type Safety:** Zentralisierte Konstante verhindert Tippfehler
 * - **Refactoring:** Single Source of Truth fuer den Metadata-Key
 * - **Testing:** Tests koennen dieselbe Konstante wie der Guard importieren
 *
 * Wird vom SetupPendingGuard verwendet um zu pruefen, ob ein Endpoint
 * die Setup-Status-Validierung ueberspringen soll.
 */
export const SKIP_SETUP_CHECK_KEY = 'skipSetupCheck';

/**
 * Decorator zum Ueberspringen der SetupPendingGuard-Pruefung.
 *
 * Verwende diesen Decorator fuer Endpoints die waehrend des
 * Server-Setup-Prozesses erreichbar sein muessen.
 *
 * **Whitelist-Endpoints:**
 * - Health-Check (Monitoring)
 * - Admin-Setup (Initialisierung)
 * - Invite-Exchange (Onboarding)
 *
 * Kann auf Controller-Klasse ODER einzelne Methoden angewendet werden.
 *
 * @example
 * ```typescript
 * // Auf Methoden-Ebene (einzelner Endpoint)
 * @SkipSetupCheck()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 *
 * // Auf Controller-Ebene (alle Endpoints)
 * @SkipSetupCheck()
 * @Controller('admin/setup')
 * export class AdminSetupController { ... }
 * ```
 */
export const SkipSetupCheck = () => SetMetadata(SKIP_SETUP_CHECK_KEY, true);
