/**
 * ServerSetupForm Organism
 *
 * Formular zum Hinzufügen eines neuen Servers via Server-URL und Invite-Code.
 * Unterstützt Prefill aus URL-Parametern (?server=...).
 *
 * **Features:**
 * - Prefill server URL from props (URL params integration)
 * - Manual invite code entry
 * - Admin-Setup wenn Server noch nicht eingerichtet (setupComplete: false)
 * - Form validation with Zod
 * - TanStack Form integration
 * - Exchange invite mutation on submit
 * - Inline network error handling with Alert component (Story 2.7, AC3)
 *
 * **Flow:**
 * 1. User gibt Server-URL ein
 * 2. Health-Check prüft setupComplete Status
 * 3a. setupComplete: true → Invite-Code Eingabe
 * 3b. setupComplete: false → Admin-Setup (Username + Password)
 *
 * **Integration:**
 * - useExchangeInvite() (Story 2.4) - Server hinzufügen bei bestehendem Setup
 * - Admin-Setup API - Admin-Account erstellen bei neuem Server
 * - OnboardingErrorCard (Story 2.4) - Error UI
 * - Toast (sonner) - Success/Error notifications
 * - Inline Alert for network errors (Story 2.7, AC3, NFR-R2)
 */

import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { cn } from '@/shared/ui/cn';
import { serverUrlSchema, inviteCodeSchema, serverNameSchema, adminUsernameSchema, adminPasswordSchema } from '../../schemas/url-params.schema';
import { ExchangeInvitePersistenceError, useExchangeInvite } from '../../api/mutations';
import { useHealthCheck, HealthCheckError } from '../../api/use-health-check';
import { OnboardingErrorCard } from '../molecules/OnboardingErrorCard';
import { toast } from 'sonner';
import { PiDatabase, PiKey, PiBuildings, PiUser, PiLock, PiWarning, PiCheckCircle, PiArrowRight } from 'react-icons/pi';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { ServerPersistenceError } from '../../stores/server-persistence';
import { addServer, setActiveServer, isServerNameTaken } from '../../stores/server.store';
import { logger } from '@/shared/lib/logger';
import { createServerScopedAdminApi, normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { PasswordStrengthIndicator } from '@/shared/ui/molecules/password-strength-indicator.molecule';
import { CopyButton } from '@/shared/ui/molecules';

/**
 * Form-Modus: Welche Felder werden angezeigt?
 * - idle: Nur Server-URL Feld
 * - invite: Server-URL + Invite-Code (setupComplete: true)
 * - admin-setup: Server-URL + Username/Password (setupComplete: false)
 * - token-display: Token-Anzeige nach erfolgreichem Admin-Setup
 */
type FormMode = 'idle' | 'invite' | 'admin-setup' | 'token-display';

/**
 * Submit-Phase für Button-States
 */
type SubmitPhase = 'idle' | 'health-check' | 'exchange' | 'admin-setup';

/**
 * Helper function to extract Zod validation error message
 */
function getZodError(result: { success: boolean; error?: { issues?: Array<{ message?: string }> } }, fallback: string): string | undefined {
  if (result.success) return undefined;
  const firstIssue = result.error?.issues?.[0];
  return firstIssue?.message || fallback;
}

/**
 * Workaround: Erzwingt Sync des Field-Derived-Stores nach form.setFieldValue.
 *
 * TanStack Store (@tanstack/store@0.8.0) hat einen Bug in der Derived-Store-Kette:
 * Wenn form.setFieldValue aus einem setTimeout-Callback (z.B. Debounce) aufgerufen wird,
 * nachdem das Form einen Submit-Zyklus durchlaufen hat, propagiert die __flush-Kette
 * die Value-Änderung nicht zum Field-Derived-Store. Der Form-State ist korrekt,
 * aber das Field-React-Binding bekommt keine Notification und re-rendert nicht.
 *
 * Diese Funktion erzwingt manuell:
 * 1. Recompute des Field-Derived-Stores (liest aktuellen Form-State)
 * 2. Benachrichtigung der Listener (triggert React-Re-Render)
 *
 * Kann entfernt werden wenn @tanstack/store > 0.8.0 das Derived-Propagation-Problem behebt.
 */
// biome-ignore lint/suspicious/noExplicitAny: Zugriff auf TanStack Store Internals nötig für Workaround
function forceFieldStoreSync(form: any, fieldName: string): void {
  const fieldInfo = form.getFieldInfo(fieldName);
  const fieldStore = fieldInfo?.instance?.store;
  if (!fieldStore) return;

  // Recompute: Field-Derived-Store prüft ob sich Dependencies geändert haben
  if (typeof fieldStore.checkIfRecalculationNeededDeeply === 'function') {
    fieldStore.checkIfRecalculationNeededDeeply();
  }

  // Listener benachrichtigen: React (useSyncExternalStore) wird über die Änderung informiert
  if (fieldStore.listeners) {
    for (const listener of fieldStore.listeners) {
      listener({ prevVal: undefined, currentVal: fieldStore.state });
    }
  }
}

interface ServerSetupFormProps {
  /**
   * Server-URL zum Prefill (aus URL-Parametern)
   * Wenn gesetzt, wird das serverUrl-Feld vorausgefüllt.
   */
  prefillServerUrl?: string;

  /**
   * Callback bei erfolgreichem Server-Setup
   */
  onSuccess?: () => void;

  /**
   * CSS className für Container
   */
  className?: string;
}

/**
 * Server Setup Formular
 *
 * Ermöglicht das manuelle Hinzufügen eines Servers durch Eingabe
 * von Server-URL und Invite-Code oder Admin-Credentials.
 *
 * @example
 * ```tsx
 * // Mit Prefill aus URL params
 * <ServerSetupForm prefillServerUrl="https://api.example.de" />
 *
 * // Ohne Prefill (leeres Formular)
 * <ServerSetupForm />
 * ```
 */
export function ServerSetupForm({ prefillServerUrl, onSuccess, className }: ServerSetupFormProps) {
  const exchangeInvite = useExchangeInvite();
  const healthCheck = useHealthCheck();

  // UI States
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [healthCheckError, setHealthCheckError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('idle');
  const [isAdminSetupLoading, setIsAdminSetupLoading] = useState(false);
  const [adminSetupError, setAdminSetupError] = useState<string | null>(null);
  // Token-Anzeige nach erfolgreichem Admin-Setup
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  // Trackt ob User den Server-Namen manuell geändert hat (stoppt Auto-Fill)
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState(false);
  // Ref für Stale Closure Prevention in useCallback (Race Condition Fix)
  const hasManuallyEditedNameRef = useRef(hasManuallyEditedName);
  // Inline Network Error State (Story 2.7, AC3)
  // Zeigt Netzwerkfehler als Alert-Komponente oberhalb des Submit-Buttons
  const [inlineNetworkError, setInlineNetworkError] = useState<string | null>(null);

  // Synchronisiere Ref mit State
  useEffect(() => {
    hasManuallyEditedNameRef.current = hasManuallyEditedName;
  }, [hasManuallyEditedName]);

  // Auto-clear Token nach 60 Sekunden aus Sicherheitsgründen (Shoulder Surfing Prevention)
  useEffect(() => {
    if (!generatedToken) return;

    const timer = setTimeout(() => {
      setGeneratedToken(null);
      toast.info('Token ausgeblendet', {
        description: 'Aus Sicherheitsgründen wurde der Token nach 60 Sekunden entfernt.',
      });
    }, 60000);

    return () => clearTimeout(timer);
  }, [generatedToken]);

  // Speichere die verifizierte Server-URL für das Submit
  const [verifiedServerUrl, setVerifiedServerUrl] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      serverUrl: prefillServerUrl || '',
      inviteCode: '',
      serverName: '',
      username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      // Reset Fehler
      setHealthCheckError(null);
      setAdminSetupError(null);
      setInlineNetworkError(null);

      // M4 FIX: TOCTOU Re-Validierung - Server-Name Duplikat-Check direkt vor Submit
      // Verhindert Race Condition zwischen onChange-Validierung und Submit
      const serverName = value.serverName;
      if (serverName && isServerNameTaken(serverName)) {
        form.setFieldMeta('serverName', (prev) => ({
          ...prev,
          errors: ['Ein Server mit diesem Namen existiert bereits'],
        }));
        return; // Abort submit
      }

      try {
        // Wenn wir im idle-Modus sind, nur Health-Check durchführen
        if (formMode === 'idle') {
          setSubmitPhase('health-check');

          const healthResult = await healthCheck.mutateAsync({
            serverUrl: value.serverUrl,
          });

          // Speichere verifizierte URL
          setVerifiedServerUrl(value.serverUrl);

          // Bestimme Modus basierend auf setupComplete
          if (healthResult.setupComplete) {
            setFormMode('invite');
            toast.info('Server gefunden', {
              description: 'Gib deinen Einladungscode ein.',
            });
          } else {
            setFormMode('admin-setup');
            toast.info('Server nicht eingerichtet', {
              description: 'Erstelle einen Admin-Account um fortzufahren.',
            });
          }

          setSubmitPhase('idle');
          return;
        }

        // Invite-Code Exchange
        if (formMode === 'invite') {
          setSubmitPhase('exchange');

          const response = await exchangeInvite.mutateAsync({
            inviteCode: value.inviteCode,
            serverUrl: verifiedServerUrl || value.serverUrl || undefined,
            serverName: value.serverName || undefined,
          });

          const displayName = value.serverName || response.data.serverInfo.name;

          toast.success(`Server '${displayName}' hinzugefügt`, {
            description: 'Du wirst weitergeleitet...',
          });

          onSuccess?.();
          return;
        }

        // Admin-Setup
        if (formMode === 'admin-setup') {
          setSubmitPhase('admin-setup');
          setIsAdminSetupLoading(true);

          const serverUrl = verifiedServerUrl || value.serverUrl;

          // Temporärer API-Client für den Ziel-Server
          const normalizedUrl = normalizeServerBaseUrl(serverUrl);
          const adminApi = createServerScopedAdminApi(normalizedUrl);

          logger.debug('Starting admin setup', { serverUrl: normalizedUrl });

          // Admin-Setup durchführen
          const response = await adminApi.adminSetupControllerCompleteSetupVAlpha({
            completeSetupDto: {
              username: value.username,
              password: value.password,
            },
          });

          logger.info('Admin setup successful', {
            username: response.data.user.username,
          });

          // Server zum Store hinzufügen
          const displayServerName = value.serverName || new URL(serverUrl).hostname;
          const accessToken = response.data.accessToken.token;
          const newServerId = await addServer({
            name: displayServerName,
            url: normalizedUrl,
            accessToken,
            isDefault: false,
            lastUsedAt: new Date().toISOString(),
          });

          // Als aktiven Server setzen
          await setActiveServer(newServerId);

          toast.success(`Server '${displayServerName}' eingerichtet`, {
            description: `Admin-Account '${value.username}' erstellt.`,
          });

          // Token-Anzeige aktivieren (WICHTIG: Nicht sofort weiterleiten!)
          setGeneratedToken(accessToken);
          setFormMode('token-display');
        }
      } catch (error) {
        // Health-Check Fehler
        if (error instanceof HealthCheckError) {
          // Story 2.7, AC3: Network errors → Inline Alert
          // NFR-R2: Fehlerfeedback < 2s (wird direkt nach fetch-Fehler gesetzt)
          if (error.type === 'NETWORK') {
            setInlineNetworkError('Prüfe deine Internetverbindung und versuche es erneut.');
            return;
          }

          // Andere Health-Check Fehler (TIMEOUT, UNKNOWN) → Inline Text Error
          let errorMessage: string;
          switch (error.type) {
            case 'TIMEOUT':
              errorMessage = 'Server antwortet nicht (Timeout nach 5 Sekunden)';
              break;
            default:
              errorMessage = 'Unbekannter Fehler beim Verbindungstest.';
              break;
          }
          setHealthCheckError(errorMessage);
          return;
        }

        // F2: Duplikat-Check Error von addServer() - Race Condition zwischen Validierung und Submit
        if (error instanceof Error && error.message.includes('existiert bereits')) {
          toast.error('Server-Name bereits vergeben', {
            description: 'Bitte wähle einen anderen Namen für diesen Server.',
          });
          return;
        }

        if (error instanceof ServerPersistenceError || error instanceof ExchangeInvitePersistenceError) {
          toast.error('Server lokal nicht gespeichert', {
            description: 'Der Server wurde bestätigt, konnte aber auf diesem Gerät nicht konsistent gespeichert werden. Bitte prüfe Speicherrechte und versuche es erneut.',
          });
          return;
        }

        // Admin-Setup Fehler
        if (formMode === 'admin-setup') {
          // NIST SP 800-63B-4: Benutzerfreundliche Fehlermeldungen für Passwort-Validierung
          const errorMessage = await getApiErrorMessage(error, 'Admin-Setup fehlgeschlagen. Bitte versuchen Sie es erneut.', 'serverSetup');
          setAdminSetupError(errorMessage);
          toast.error('Admin-Setup fehlgeschlagen', {
            description: errorMessage,
          });
          return;
        }

        // Exchange-Fehler (nur wenn keiner der obigen Fälle zutrifft)
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast.error('Fehler beim Hinzufügen des Servers', {
          description: errorMessage,
        });
      } finally {
        setSubmitPhase('idle');
        setIsAdminSetupLoading(false);
      }
    },
  });

  /**
   * Auto-Fill Server-Name aus URL-Hostname.
   *
   * Wird nur ausgeführt wenn:
   * - URL valide ist
   * - User den Namen NICHT manuell editiert hat
   *
   * Aktualisiert den Namen direkt aus dem Hostname der URL.
   *
   * Nutzt Ref statt State um Stale Closures bei schnellem Tippen zu vermeiden.
   */
  const tryAutoFillServerName = useCallback(
    (serverUrl: string) => {
      // Nutze Ref statt State um Race Conditions bei schnellem Tippen zu vermeiden
      if (hasManuallyEditedNameRef.current) return;

      const urlValidation = serverUrlSchema.safeParse(serverUrl);
      if (!urlValidation.success) return;

      try {
        const url = new URL(serverUrl);
        const hostname = url.hostname;
        // Port mit anhängen wenn vorhanden und nicht Standard-Port (80/443)
        const port = url.port;
        const isDefaultPort = (url.protocol === 'https:' && port === '443') || (url.protocol === 'http:' && port === '80') || !port;
        const displayName = port && !isDefaultPort ? `${hostname}:${port}` : hostname;
        form.setFieldValue('serverName', displayName);
        // Workaround: TanStack Store Derived-Reactivity Bug (@tanstack/store@0.8.0)
        // form.setFieldValue aus setTimeout-Callbacks aktualisiert den internen Form-State
        // korrekt, aber nach Form-Submit-Zyklen propagiert die __flush-Kette des Schedulers
        // die Änderung nicht zuverlässig zum Field-Derived-Store. Dadurch bekommt React
        // keine Notification über die Value-Änderung und re-rendert das Feld nicht.
        // Fix: Manuell den Derived-Store recomputen und dessen Listener benachrichtigen.
        // Kann entfernt werden wenn @tanstack/store auf eine Version > 0.8.0 aktualisiert wird,
        // die dieses Derived-Propagation-Problem behebt.
        forceFieldStoreSync(form, 'serverName');
      } catch {
        // URL-Parsing fehlgeschlagen, ignorieren
      }
    },
    [form],
  );

  // H5: Debounced Auto-Fill Ref um Race Conditions bei schnellem Tippen zu vermeiden
  const autoFillTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * H5: Debounced Auto-Fill mit cleanup bei Unmount
   */
  const debouncedAutoFill = useCallback(
    (url: string) => {
      // Vorherigen Timeout clearen
      if (autoFillTimeoutRef.current) {
        clearTimeout(autoFillTimeoutRef.current);
      }
      // Neuen Timeout setzen
      autoFillTimeoutRef.current = setTimeout(() => {
        if (hasManuallyEditedNameRef.current) return;
        tryAutoFillServerName(url);
      }, 300);
    },
    [tryAutoFillServerName],
  );

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (autoFillTimeoutRef.current) {
        clearTimeout(autoFillTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Zurück zum URL-Eingabe Modus
   *
   * Setzt alle Form-States zurück und erlaubt erneutes Auto-Fill.
   * Ref wird synchron aktualisiert um Race Conditions zu vermeiden (F4 Fix).
   */
  const handleResetMode = useCallback(() => {
    setFormMode('idle');
    setVerifiedServerUrl(null);
    setHealthCheckError(null);
    setAdminSetupError(null);
    setInlineNetworkError(null);
    // Ref synchron aktualisieren für sofortigen Effekt in tryAutoFillServerName
    hasManuallyEditedNameRef.current = false;
    setHasManuallyEditedName(false);
  }, []);

  // Show error card if invite exchange failed with specific error codes
  const showErrorCard = exchangeInvite.isError;

  /**
   * Handler für "Erneut versuchen" Button bei Netzwerkfehlern
   *
   * Story 2.7, AC3: Cleart den Inline-Fehler und triggert erneuten Submit.
   * NFR-R2: Reaktion < 2s garantiert durch direktes State-Update.
   */
  const handleRetryNetworkError = useCallback(() => {
    setInlineNetworkError(null);
    // Re-trigger form submission
    form.handleSubmit();
  }, [form]);

  /**
   * Handler für "Weiter zur Anmeldung" Button in Token-Anzeige
   */
  const handleContinueAfterTokenDisplay = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  // Token-Anzeige nach erfolgreichem Admin-Setup
  if (formMode === 'token-display' && generatedToken) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Success Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900 text-xl dark:text-white">Setup abgeschlossen!</h2>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">Der Server ist jetzt einsatzbereit.</p>
        </div>

        {/* Warning Banner */}
        <Alert
          status="warning"
          icon={<PiWarning className="h-5 w-5" />}
          title="Wichtig - Nur einmal sichtbar!"
          description="Speichere diesen Token sicher. Er wird nach Verlassen dieser Seite nicht erneut angezeigt und kann nicht wiederhergestellt werden."
        />

        {/* Token Display Box */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50" aria-live="polite">
          <div className="mb-2 font-medium text-gray-700 text-sm dark:text-gray-300">Server Access Token</div>
          <div className="flex items-center gap-3">
            <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-gray-900 text-sm dark:bg-gray-900 dark:text-gray-100">{generatedToken}</code>
            <CopyButton text={generatedToken} size="sm" />
          </div>
        </div>

        {/* Continue Button */}
        <Button type="button" intent="primary" appearance="heavy" className="w-full gap-2" onClick={handleContinueAfterTokenDisplay}>
          <span>Weiter zur Anmeldung</span>
          <PiArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Error Card (reuse from Story 2.4) */}
      {showErrorCard && <OnboardingErrorCard errorCode="INVITE_EXPIRED" className="mb-4" />}

      {/* Admin-Setup Info Banner */}
      {formMode === 'admin-setup' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
          <PiWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800 text-sm dark:text-amber-200">Server nicht eingerichtet</p>
            <p className="text-amber-700 text-sm dark:text-amber-300">Dieser Server wurde noch nicht konfiguriert. Erstelle einen Admin-Account, um den Server zu initialisieren.</p>
          </div>
        </div>
      )}

      {/* Server gefunden Banner */}
      {formMode === 'invite' && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/50">
          <PiCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
          <div className="space-y-1">
            <p className="font-medium text-green-800 text-sm dark:text-green-200">Server gefunden</p>
            <p className="text-green-700 text-sm dark:text-green-300">Der Server ist erreichbar und eingerichtet. Gib deinen Einladungscode ein, um dich zu verbinden.</p>
          </div>
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Server URL Field */}
        <div className="space-y-2">
          <label htmlFor="serverUrl" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
            Server-URL
          </label>
          <form.Field
            name="serverUrl"
            validators={{
              // onChange: Nur validieren wenn Wert vorhanden (verhindert Fehler bei leerem Feld)
              onChange: ({ value }) => (value ? getZodError(serverUrlSchema.safeParse(value), 'Ungültige Server-URL') : undefined),
              // onBlur: Immer validieren (zeigt Fehler nach Verlassen des Feldes)
              onBlur: ({ value }) => getZodError(serverUrlSchema.safeParse(value), 'Ungültige Server-URL'),
            }}
          >
            {(field) => {
              const fieldError = field.state.meta.errors[0] as string | undefined;

              return (
                <div className="space-y-1">
                  <div className="flex w-full gap-2">
                    <Input
                      id="serverUrl"
                      type="url"
                      placeholder="https://api.example.de"
                      value={field.state.value}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        field.handleChange(newValue);
                        // Story 2.7, AC3: Clear inline network error on input change
                        setInlineNetworkError(null);
                        // Bei Änderung der URL: Modus zurücksetzen
                        if (formMode !== 'idle') {
                          handleResetMode();
                        }
                        // H5: Auto-Fill Server-Name aus URL (debounced für Race Condition Prevention)
                        debouncedAutoFill(newValue);
                      }}
                      onBlur={field.handleBlur}
                      variant={fieldError ? 'error' : 'default'}
                      leftIcon={<PiDatabase className="h-5 w-5" />}
                      autoComplete="url"
                      autoFocus={!prefillServerUrl}
                      disabled={formMode !== 'idle'}
                      className="min-w-0 flex-1"
                    />
                    {formMode !== 'idle' && (
                      <Button type="button" appearance="outline" onClick={handleResetMode}>
                        Ändern
                      </Button>
                    )}
                  </div>
                  {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                  {healthCheckError && !fieldError && (
                    <div className="space-y-2">
                      <p className="text-red-600 text-sm dark:text-red-400">{healthCheckError}</p>
                      <button type="button" onClick={() => setHealthCheckError(null)} className="font-medium text-blue-600 text-sm hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        Erneut versuchen
                      </button>
                    </div>
                  )}
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Invite Code Field (nur bei setupComplete: true) */}
        {formMode === 'invite' && (
          <div className="space-y-2">
            <label htmlFor="inviteCode" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
              Einladungscode
            </label>
            <form.Field
              name="inviteCode"
              validators={{
                onChange: ({ value }) => getZodError(inviteCodeSchema.safeParse(value), 'Ungültiger Invite-Code'),
                onBlur: ({ value }) => getZodError(inviteCodeSchema.safeParse(value), 'Ungültiger Invite-Code'),
              }}
            >
              {(field) => {
                const fieldError = field.state.meta.errors[0] as string | undefined;

                return (
                  <div className="space-y-1">
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="ABC12345"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      variant={fieldError ? 'error' : 'default'}
                      leftIcon={<PiKey className="h-5 w-5" />}
                      autoComplete="off"
                      autoFocus
                    />
                    {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                  </div>
                );
              }}
            </form.Field>
          </div>
        )}

        {/* Admin Setup Fields (nur bei setupComplete: false) */}
        {formMode === 'admin-setup' && (
          <>
            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
                Admin-Nutzername
              </label>
              <form.Field
                name="username"
                validators={{
                  onChange: ({ value }) => getZodError(adminUsernameSchema.safeParse(value), 'Ungültiger Nutzername'),
                  onBlur: ({ value }) => getZodError(adminUsernameSchema.safeParse(value), 'Ungültiger Nutzername'),
                }}
              >
                {(field) => {
                  const fieldError = field.state.meta.errors[0] as string | undefined;

                  return (
                    <div className="space-y-1">
                      <Input
                        id="username"
                        type="text"
                        placeholder="admin"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        variant={fieldError ? 'error' : 'default'}
                        leftIcon={<PiUser className="h-5 w-5" />}
                        autoComplete="username"
                        autoFocus
                      />
                      {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                      <p className="text-gray-500 text-xs dark:text-gray-400">3-20 Zeichen, nur Buchstaben, Zahlen, - und _</p>
                    </div>
                  );
                }}
              </form.Field>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
                Admin-Passwort
              </label>
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => getZodError(adminPasswordSchema.safeParse(value), 'Ungültiges Passwort'),
                  onBlur: ({ value }) => getZodError(adminPasswordSchema.safeParse(value), 'Ungültiges Passwort'),
                }}
              >
                {(field) => {
                  const fieldError = field.state.meta.errors[0] as string | undefined;

                  return (
                    <div className="space-y-2">
                      <Input
                        id="password"
                        type="password"
                        placeholder="Sicheres Passwort"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        variant={fieldError ? 'error' : 'default'}
                        leftIcon={<PiLock className="h-5 w-5" />}
                        autoComplete="new-password"
                      />
                      {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                      {/* Password Strength Indicator */}
                      <PasswordStrengthIndicator password={field.state.value} showLabel={true} />
                    </div>
                  );
                }}
              </form.Field>
            </div>

            {/* Admin Setup Error */}
            {adminSetupError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
                <p className="text-red-600 text-sm dark:text-red-400">{adminSetupError}</p>
              </div>
            )}
          </>
        )}

        {/* Server Name Field (immer sichtbar, Pflichtfeld) */}
        <div className="space-y-2">
          <label htmlFor="serverName" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
            Server-Name
          </label>
          <form.Field
            name="serverName"
            validators={{
              onChange: ({ value }) => {
                // Schema-Validierung (Pflichtfeld, min 1, max 100)
                const schemaResult = serverNameSchema.safeParse(value);
                if (!schemaResult.success) {
                  return getZodError(schemaResult, 'Ungültiger Server-Name');
                }
                // Duplikat-Check (case-insensitive)
                if (isServerNameTaken(value)) {
                  return 'Ein Server mit diesem Namen existiert bereits';
                }
                return undefined;
              },
              onBlur: ({ value }) => {
                const schemaResult = serverNameSchema.safeParse(value);
                if (!schemaResult.success) {
                  return getZodError(schemaResult, 'Ungültiger Server-Name');
                }
                if (isServerNameTaken(value)) {
                  return 'Ein Server mit diesem Namen existiert bereits';
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const fieldError = field.state.meta.errors[0] as string | undefined;

              return (
                <div className="space-y-1">
                  <Input
                    id="serverName"
                    type="text"
                    placeholder="z.B. Produktiv-Server"
                    value={field.state.value}
                    onChange={(e) => {
                      // Markiere als manuell editiert wenn User tippt
                      // Ref synchron aktualisieren für sofortigen Effekt (F1 Fix)
                      hasManuallyEditedNameRef.current = true;
                      setHasManuallyEditedName(true);
                      // NICHT setInlineNetworkError(null) - Server-Name hat keine Verbindung zu Netzwerkfehlern
                      // Network errors werden nur bei serverUrl-Änderung gecleart (Story 2.7, AC3)
                      field.handleChange(e.target.value);
                    }}
                    onBlur={field.handleBlur}
                    variant={fieldError ? 'error' : 'default'}
                    leftIcon={<PiBuildings className="h-5 w-5" />}
                    autoComplete="off"
                  />
                  {fieldError && <p className="text-red-600 text-sm dark:text-red-400">{fieldError}</p>}
                  <p className="text-gray-500 text-xs dark:text-gray-400">{hasManuallyEditedName ? 'Eindeutiger Anzeigename für diesen Server.' : 'Wird automatisch aus der URL befüllt.'}</p>
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Inline Network Error Alert (Story 2.7, AC3) */}
        {inlineNetworkError && (
          <div data-testid="inline-network-error">
            <Alert status="error" title="Server nicht erreichbar" description={inlineNetworkError}>
              <button
                type="button"
                onClick={handleRetryNetworkError}
                className="mt-2 font-medium text-red-800 text-sm underline hover:text-red-900 dark:text-red-300 dark:hover:text-red-200"
                data-testid="retry-network-error-button"
              >
                Erneut versuchen
              </button>
            </Alert>
          </div>
        )}

        {/* Submit Button */}
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => {
            const isLoading = isSubmitting || healthCheck.isPending || exchangeInvite.isPending || isAdminSetupLoading;

            const getButtonText = () => {
              if (submitPhase === 'health-check') return 'Prüfe Verbindung...';
              if (submitPhase === 'exchange') return 'Verbinde...';
              if (submitPhase === 'admin-setup') return 'Richte Server ein...';

              // Standard-Text basierend auf Modus
              switch (formMode) {
                case 'idle':
                  return 'Mit Server verbinden';
                case 'invite':
                  return 'Server hinzufügen';
                case 'admin-setup':
                  return 'Admin-Account erstellen';
                default:
                  return 'Weiter';
              }
            };

            return (
              <Button type="submit" size="lg" className="w-full" loading={isLoading} disabled={!canSubmit || isLoading}>
                {getButtonText()}
              </Button>
            );
          }}
        </form.Subscribe>
      </form>
    </div>
  );
}
