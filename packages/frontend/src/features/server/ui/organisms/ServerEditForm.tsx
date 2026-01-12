import { useState, useEffect, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { PiDatabase, PiKey, PiFloppyDisk, PiX, PiPlugsConnected, PiPalette } from 'react-icons/pi';
import { z } from 'zod';

import { Button } from '@/shared/ui/atoms/button.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
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
      className={cn('space-y-4', className)}
      data-testid="server-edit-form"
    >
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
            <div className="space-y-1">
              <label htmlFor="serverName" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
                Server-Name
              </label>
              <Input
                id="serverName"
                type="text"
                placeholder="z.B. Produktiv-Server"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                variant={fieldError ? 'error' : 'default'}
                leftIcon={<PiDatabase className="size-4" />}
                aria-label="Server-Name"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? 'serverName-error' : undefined}
              />
              {/* H2: ARIA Live-Region für Screen-Reader */}
              {fieldError && (
                <p id="serverName-error" className="text-red-600 text-sm dark:text-red-400" role="alert" aria-live="assertive">
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
            <div className="space-y-1">
              <label htmlFor="serverUrl" className="block font-medium text-gray-700 text-sm dark:text-gray-300">
                Server-URL
              </label>
              <Input
                id="serverUrl"
                type="url"
                placeholder="https://api.example.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                variant={fieldError ? 'error' : 'default'}
                leftIcon={<PiPlugsConnected className="size-4" />}
                aria-label="Server-URL"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? 'serverUrl-error' : undefined}
              />
              {/* H2: ARIA Live-Region für Screen-Reader */}
              {fieldError && (
                <p id="serverUrl-error" className="text-red-600 text-sm dark:text-red-400" role="alert" aria-live="assertive">
                  {fieldError}
                </p>
              )}
            </div>
          );
        }}
      </form.Field>

      {/* Token-Hinweis (nicht editierbar) */}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800" data-testid="token-hint">
        <p className="flex items-center text-gray-600 text-sm dark:text-gray-400">
          <PiKey className="mr-2 size-4" />
          {server.accessToken ? 'Access-Token gespeichert' : 'Kein Access-Token konfiguriert'}
        </p>
      </div>

      {/* Visuelle Unterscheidung - Icon und Farbe */}
      <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700" data-testid="visual-settings-section">
        <div className="flex items-center gap-2">
          <PiPalette className="size-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-medium text-gray-900 text-sm dark:text-gray-100">Visuelle Unterscheidung</h3>
        </div>

        {/* Farb-Auswahl - Validierung erfolgt durch den Picker selbst (nur gültige Presets) */}
        <form.Field name="color">
          {(field) => (
            <div className="space-y-2" data-testid="color-picker-section">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: ServerColorPicker ist ein radiogroup, kein einzelnes Input */}
              <label className="block font-medium text-gray-700 text-sm dark:text-gray-300">Farbe auswählen</label>
              <ServerColorPicker value={field.state.value} onChange={(color) => field.handleChange(color)} disabled={isSubmitting} aria-label="Farbe auswählen" />
            </div>
          )}
        </form.Field>

        {/* Icon-Auswahl - Validierung erfolgt durch den Picker selbst (nur gültige Presets) */}
        <form.Field name="icon">
          {(field) => (
            <div className="space-y-2" data-testid="icon-picker-section">
              <ServerIconPicker value={field.state.value} onChange={(icon) => field.handleChange(icon)} disabled={isSubmitting} aria-label="Icon auswählen" />
            </div>
          )}
        </form.Field>
      </div>

      {/* Verbindung testen Button - H3: Disabled auch während Submit, H4: Keyboard-Shortcut Hinweis */}
      <Button
        type="button"
        appearance="outline"
        size="sm"
        onClick={handleTestConnection}
        loading={healthCheck.isPending}
        disabled={isSubmitting || healthCheck.isPending}
        className="w-full"
        data-testid="test-connection-button"
        title="Verbindung testen (Ctrl+T / Cmd+T)"
      >
        <PiPlugsConnected className="mr-2 size-4" />
        Verbindung testen
      </Button>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" appearance="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1" data-testid="cancel-button">
          <PiX className="mr-2 size-4" />
          Abbrechen
        </Button>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit]) => (
            <Button type="submit" loading={isSubmitting} disabled={!canSubmit || isSubmitting} className="flex-1" data-testid="save-button">
              <PiFloppyDisk className="mr-2 size-4" />
              Speichern
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
