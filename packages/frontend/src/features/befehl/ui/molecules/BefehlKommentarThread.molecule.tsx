/**
 * BefehlKommentarThread - Kommentar-Thread für Befehle
 *
 * Zeigt chronologische Kommentare mit Rückfrage-Badge
 * und Inline-Eingabe am Ende.
 */

import type { BefehlKommentarDto } from '@bluelight-hub/shared/client';
import { useCurrentUser } from '@/features/auth/api';
import { useAddBefehlKommentar } from '../../api/use-add-befehl-kommentar';
import { addBefehlKommentarSchema } from '../../schemas/add-befehl-kommentar.schema';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { format } from 'date-fns';
import { useRef } from 'react';
import { PiChatCircleDots, PiPaperPlaneRight } from 'react-icons/pi';

interface BefehlKommentarThreadProps {
  befehlId: string;
  einsatzId: string;
  kommentare: BefehlKommentarDto[];
}

/**
 * Kommentar-Thread Komponente
 *
 * Zeigt alle Kommentare eines Befehls in chronologischer Reihenfolge.
 * Rückfragen werden mit einem Badge markiert.
 * Am Ende ein Inline-Formular zum Hinzufügen neuer Kommentare.
 */
export function BefehlKommentarThread({ befehlId, einsatzId, kommentare }: BefehlKommentarThreadProps) {
  /** ID fuer Scroll/Focus vom Badge-Click (AC5) */
  const threadId = `befehl-thread-${befehlId}`;
  const { user } = useCurrentUser();
  const { mutateAsync, isPending } = useAddBefehlKommentar(einsatzId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm({
    defaultValues: {
      text: '',
      isRueckfrage: false,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmit: addBefehlKommentarSchema,
    },
    onSubmit: async ({ value }) => {
      await mutateAsync({
        befehlId,
        dto: {
          text: value.text,
          isRueckfrage: value.isRueckfrage,
        },
      });
      form.reset();
    },
  });

  const sortedKommentare = [...kommentare].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Container blocks bubbling to parent card and is not directly user-actionable.
    <div id={threadId} tabIndex={-1} className="mt-3 border-t border-border-subtle pt-3 focus:outline-none" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {/* Kommentar-Liste */}
      {sortedKommentare.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2" aria-label="Kommentare">
          {sortedKommentare.map((kommentar) => {
            const isOwn = kommentar.authorId === user?.id;
            const createdAt = typeof kommentar.createdAt === 'string' ? new Date(kommentar.createdAt) : kommentar.createdAt;

            return (
              <li key={kommentar.id} className="rounded-md bg-surface-raised px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium', isOwn ? 'text-action-primary' : 'text-text-secondary')}>{isOwn ? 'Du' : (kommentar.authorId?.substring(0, 8) ?? 'Anonym')}</span>
                  <time dateTime={createdAt.toISOString()} className="text-xs text-text-muted">
                    {format(createdAt, 'dd.MM. HH:mm')}
                  </time>
                  {kommentar.isRueckfrage && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">
                      <PiChatCircleDots className="h-3 w-3" />
                      Rückfrage
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-text-secondary">{kommentar.text}</p>
              </li>
            );
          })}
        </ul>
      )}

      {/* Inline Kommentar-Eingabe */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex items-start gap-2">
          <form.Field name="text">
            {(field) => (
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onBlur={field.handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      form.handleSubmit();
                    }
                  }}
                  placeholder="Kommentar schreiben..."
                  aria-label="Kommentar schreiben"
                  rows={1}
                  fullWidth
                  className="min-h-0"
                />
                {field.state.meta.errors?.length > 0 && <p className="mt-1 text-xs text-status-danger-text">{field.state.meta.errors[0]}</p>}
              </div>
            )}
          </form.Field>

          {/* Rückfrage Toggle */}
          <form.Field name="isRueckfrage">
            {(field) => (
              <button
                type="button"
                onClick={() => field.handleChange(!field.state.value)}
                title={field.state.value ? 'Als Rückfrage markiert' : 'Als Rückfrage markieren'}
                aria-label={field.state.value ? 'Als Rückfrage markiert' : 'Als Rückfrage markieren'}
                aria-pressed={field.state.value}
                className={cn(
                  'mt-0.5 rounded-md p-1.5 transition-colors',
                  field.state.value ? 'bg-status-warning-surface text-status-warning-text' : 'text-text-muted hover:bg-action-secondary hover:text-text-secondary',
                )}
              >
                <PiChatCircleDots className="h-4 w-4" />
              </button>
            )}
          </form.Field>

          {/* Senden */}
          <Button type="submit" intent="primary" size="icon" appearance="ghost" loading={isPending} disabled={isPending} className="mt-0.5" aria-label="Kommentar senden">
            <PiPaperPlaneRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
