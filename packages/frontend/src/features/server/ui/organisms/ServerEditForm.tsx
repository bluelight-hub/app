import { useState, useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { PiDatabase, PiKey, PiFloppyDisk, PiX, PiPlugsConnected, PiPalette, PiSpinner } from 'react-icons/pi';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/ui/cn';

import { serverUrlSchema, serverNameSchema } from '../../schemas/url-params.schema';
import { updateServer, isServerNameTaken } from '../../stores/server.store';
import { useHealthCheck } from '../../api/use-health-check';
import type { ServerConfig } from '../../types/server-config';
import { ServerColorPicker } from '../molecules/ServerColorPicker';
import { ServerIconPicker } from '../molecules/ServerIconPicker';

/**
 * Extrahiert Fehlermeldungen aus TanStack Form Errors.
 *
 * TanStack Form mit nativer Zod-Unterstützung gibt entweder Strings
 * oder Objekte mit `message` Property zurück. Diese Funktion normalisiert beide.
 */
function getFieldError(errors: unknown[]): string | undefined {
  const firstError = errors[0];
  if (!firstError) return undefined;
  if (typeof firstError === 'string') return firstError;
  if (firstError && typeof firstError === 'object' && 'message' in firstError) {
    return (firstError as { message: string }).message;
  }
  return undefined;
}

interface ServerEditFormProps {
  /** Server der bearbeitet werden soll */
  server: ServerConfig;
  /** Callback nach erfolgreichem Update */
  onSuccess?: () => void;
  /** Callback bei Abbrechen */
  onCancel?: () => void;
  /** CSS className */
  className?: string;
}

const EDIT_FORM_INPUT_CLASS =
  'h-11 rounded-lg border-slate-300 bg-white/95 text-slate-900 shadow-sm transition focus-visible:border-sky-500 focus-visible:ring-sky-500/35 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100';

const EDIT_FORM_OUTLINE_BUTTON_CLASS = '!rounded-md h-10 text-sm shadow-sm';
const EDIT_FORM_PRIMARY_BUTTON_CLASS = '!rounded-md h-10 text-sm shadow-sm';

/**
 * Formular zum Bearbeiten eines existierenden Servers.
 *
 * Features:
 * - Pre-filled mit bestehenden Server-Daten
 * - Name und URL editierbar
 * - Token bleibt erhalten (nur Hinweis angezeigt)
 * - Optionaler Connection-Test mit Ctrl+T / Cmd+T Shortcut
 * - Inline-Validierung mit Zod via @tanstack/zod-form-adapter
 *
 * Hinweis zur Trim-Logik (M6):
 * Der serverNameSchema trimmt automatisch via .trim(). Das Form übergibt
 * den getrimmten Wert an den Store. Der Store erwartet bereits getrimmte
 * Eingaben und führt kein zusätzliches Trimming durch.
 *
 * @example
 * ```tsx
 * <ServerEditForm
 *   server={selectedServer}
 *   onSuccess={() => setEditDialogOpen(false)}
 *   onCancel={() => setEditDialogOpen(false)}
 * />
 * ```
 */
export function ServerEditForm({ server, onSuccess, onCancel, className }: ServerEditFormProps) {
  const healthCheck = useHealthCheck();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // M5: Mounted-Flag um Race Condition bei schnellem Cancel zu verhindern
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Erweitertes serverName-Schema mit Duplikat-Check.
   *
   * Kombiniert das Basis-Schema mit einem zusätzlichen Check, ob der
   * Name bereits vergeben ist (außer für den aktuellen Server).
   */
  const serverNameWithDuplicateCheck = serverNameSchema.superRefine((value, ctx) => {
    if (isServerNameTaken(value, server.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ein Server mit dem Namen "${value}" existiert bereits`,
      });
    }
  });

  const form = useForm({
    defaultValues: {
      serverName: server.name,
      serverUrl: server.url,
      // Icon/Color als string-basierte Form-Felder (Picker liefern nur gültige Werte)
      icon: server.icon as string | undefined,
      color: server.color as string | undefined,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        // R1 Fix: Alle Änderungen in einem einzigen updateServer() Call zusammenführen
        // um Race Conditions zwischen separaten async Calls zu vermeiden
        const updates: Partial<Pick<ServerConfig, 'name' | 'url' | 'icon' | 'color'>> = {};

        if (value.serverName !== server.name) {
          updates.name = value.serverName;
        }
        if (value.serverUrl !== server.url) {
          updates.url = value.serverUrl;
        }
        if (value.icon !== server.icon) {
          // Type Assertion: Picker liefern nur gültige Werte oder undefined
          updates.icon = value.icon as ServerConfig['icon'];
        }
        if (value.color !== server.color) {
          // Type Assertion: Picker liefern nur gültige Werte oder undefined
          updates.color = value.color as ServerConfig['color'];
        }

        const hasChanges = Object.keys(updates).length > 0;

        // Atomares Update: Name, URL, Icon, Color in einem Call
        if (hasChanges) {
          await updateServer(server.id, updates);
        }

        // M5: Check ob Component noch gemounted ist
        if (!mountedRef.current) return;

        // Erfolgs- oder Info-Toast anzeigen
        if (hasChanges) {
          toast.success('Server aktualisiert', {
            description: `"${value.serverName}" wurde erfolgreich aktualisiert`,
          });
        } else {
          toast.info('Keine Änderungen', {
            description: 'Es wurden keine Änderungen vorgenommen',
          });
        }

        onSuccess?.();
      } catch (error) {
        // M5: Check ob Component noch gemounted ist
        if (!mountedRef.current) return;

        // M3: Differenzierte Fehlerbehandlung
        if (error instanceof Error) {
          if (error.message.includes('existiert bereits')) {
            toast.error('Name bereits vergeben', { description: error.message });
            return;
          }
          if (error.message.includes('Invalid server URL') || error.message.includes('Ungültige Server-URL')) {
            toast.error('Ungültige Server-URL', { description: 'Bitte eine gültige HTTPS-URL eingeben' });
            return;
          }
          if (error.message.includes('network') || error.message.includes('Network') || error.message.includes('fetch')) {
            toast.error('Netzwerkfehler', { description: 'Server nicht erreichbar. Bitte Verbindung prüfen.' });
            return;
          }
        }
        toast.error('Fehler beim Aktualisieren', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      } finally {
        // M5: Check ob Component noch gemounted ist
        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
  });

  /**
   * Testet die Verbindung zum Server.
   *
   * M4: Validiert die URL vor dem Test mittels Schema.
   */
  const handleTestConnection = async () => {
    const url = form.getFieldValue('serverUrl');
    if (!url) {
      toast.error('Bitte gib zuerst eine Server-URL ein');
      return;
    }

    // M4: URL-Validierung vor dem Test
    const validation = serverUrlSchema.safeParse(url);
    if (!validation.success) {
      toast.error('Ungültige Server-URL', {
        description: validation.error.issues[0]?.message ?? 'Bitte korrigiere die URL',
      });
      return;
    }

    try {
      await healthCheck.mutateAsync({ serverUrl: url });
      toast.success('Verbindung erfolgreich', {
        description: 'Der Server ist erreichbar',
      });
    } catch (error) {
      toast.error('Verbindung fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Server nicht erreichbar',
      });
    }
  };

  // H4: Keyboard-Shortcut Ctrl+T / Cmd+T für "Verbindung testen"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        if (!isSubmitting && !healthCheck.isPending) {
          handleTestConnection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // biome-ignore lint/correctness/useExhaustiveDependencies: handleTestConnection ist bewusst in Dependencies (F4 Feature)
  }, [isSubmitting, healthCheck.isPending, handleTestConnection]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={cn('flex min-h-0 flex-col overflow-hidden', className)}
      data-testid="server-edit-form"
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2" data-testid="server-edit-scroll-body" style={{ scrollbarGutter: 'stable' }}>
        <div className="grid gap-3">
          {/* Server Name Field */}
          <form.Field
            name="serverName"
            validators={{
              // C4: Direkte Zod-Schema Verwendung mit zodValidator()
              onChange: serverNameWithDuplicateCheck,
              onBlur: serverNameWithDuplicateCheck,
            }}
          >
            {(field) => {
              // zodValidator gibt Objekte zurück, daher getFieldError nutzen
              const fieldError = getFieldError(field.state.meta.errors);

              return (
                <div className="space-y-1.5">
                  <label htmlFor="serverName" className="block font-medium text-slate-700 text-sm dark:text-slate-200">
                    Server-Name
                  </label>
                  <div className="relative">
                    <PiDatabase className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <Input
                      id="serverName"
                      type="text"
                      placeholder="z.B. Produktiv-Server"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-label="Server-Name"
                      aria-invalid={!!fieldError}
                      aria-describedby={fieldError ? 'serverName-error' : undefined}
                      className={cn(EDIT_FORM_INPUT_CLASS, 'pl-10', fieldError && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30')}
                    />
                  </div>
                  {/* H2: ARIA Live-Region für Screen-Reader */}
                  {fieldError && (
                    <p id="serverName-error" className="text-destructive text-sm" role="alert" aria-live="assertive">
                      {fieldError}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          {/* Server URL Field */}
          <form.Field
            name="serverUrl"
            validators={{
              // C4: Direkte Zod-Schema Verwendung mit zodValidator()
              onChange: serverUrlSchema,
              onBlur: serverUrlSchema,
            }}
          >
            {(field) => {
              // zodValidator gibt Objekte zurück, daher getFieldError nutzen
              const fieldError = getFieldError(field.state.meta.errors);

              return (
                <div className="space-y-1.5">
                  <label htmlFor="serverUrl" className="block font-medium text-slate-700 text-sm dark:text-slate-200">
                    Server-URL
                  </label>
                  <div className="relative">
                    <PiPlugsConnected className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <Input
                      id="serverUrl"
                      type="url"
                      placeholder="https://api.example.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-label="Server-URL"
                      aria-invalid={!!fieldError}
                      aria-describedby={fieldError ? 'serverUrl-error' : undefined}
                      className={cn(EDIT_FORM_INPUT_CLASS, 'pl-10', fieldError && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30')}
                    />
                  </div>
                  {/* H2: ARIA Live-Region für Screen-Reader */}
                  {fieldError && (
                    <p id="serverUrl-error" className="text-destructive text-sm" role="alert" aria-live="assertive">
                      {fieldError}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>
        </div>

        {/* Token-Hinweis (nicht editierbar) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45 dark:shadow-none" data-testid="token-hint">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-slate-300">
              <PiKey className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-900 text-sm dark:text-slate-50">Zugangstoken</p>
              <p className="text-slate-600 text-sm dark:text-slate-300">{server.accessToken ? 'Access-Token gespeichert' : 'Kein Access-Token konfiguriert'}</p>
            </div>
          </div>
        </div>

        {/* Visuelle Unterscheidung - Icon und Farbe */}
        <div
          className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/45 dark:shadow-none"
          data-testid="visual-settings-section"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PiPalette className="size-5 text-slate-600 dark:text-slate-300" />
              <h3 className="font-medium text-slate-900 text-sm dark:text-slate-50">Visuelle Unterscheidung</h3>
            </div>
            <p className="text-slate-600 text-sm dark:text-slate-300">Kompakte Marker für die Server-Auswahl im Login.</p>
          </div>

          <div className="grid gap-3">
            {/* Farb-Auswahl - Validierung erfolgt durch den Picker selbst (nur gültige Presets) */}
            <form.Field name="color">
              {(field) => (
                <div className="space-y-1.5" data-testid="color-picker-section">
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: ServerColorPicker ist ein radiogroup, kein einzelnes Input */}
                  <label className="block font-medium text-slate-700 text-sm dark:text-slate-200">Farbe auswählen</label>
                  <ServerColorPicker value={field.state.value} onChange={(color) => field.handleChange(color)} disabled={isSubmitting} aria-label="Farbe auswählen" />
                </div>
              )}
            </form.Field>

            {/* Icon-Auswahl - Validierung erfolgt durch den Picker selbst (nur gültige Presets) */}
            <form.Field name="icon">
              {(field) => (
                <div className="space-y-1.5" data-testid="icon-picker-section">
                  <ServerIconPicker value={field.state.value} onChange={(icon) => field.handleChange(icon)} disabled={isSubmitting} aria-label="Icon auswählen" />
                </div>
              )}
            </form.Field>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-3 border-slate-200/80 border-t pt-4 dark:border-slate-800/80">
        {/* Verbindung testen Button - H3: Disabled auch während Submit, H4: Keyboard-Shortcut Hinweis */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleTestConnection}
          disabled={isSubmitting || healthCheck.isPending}
          className={cn(EDIT_FORM_OUTLINE_BUTTON_CLASS, 'w-full')}
          data-testid="test-connection-button"
          title="Verbindung testen (Ctrl+T / Cmd+T)"
        >
          {healthCheck.isPending ? <PiSpinner className="size-4 animate-spin" /> : <PiPlugsConnected className="size-4" />}
          Verbindung testen
        </Button>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isSubmitting} className={cn(EDIT_FORM_OUTLINE_BUTTON_CLASS, 'flex-1')} data-testid="cancel-button">
            <PiX className="size-4" />
            Abbrechen
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit]) => (
              <Button type="submit" size="lg" disabled={!canSubmit || isSubmitting} className={cn(EDIT_FORM_PRIMARY_BUTTON_CLASS, 'flex-1')} data-testid="save-button">
                {isSubmitting ? <PiSpinner className="size-4 animate-spin" /> : <PiFloppyDisk className="size-4" />}
                Speichern
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  );
}
