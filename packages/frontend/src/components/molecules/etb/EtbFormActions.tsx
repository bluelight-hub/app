import { Button } from '@atoms/button.atom';
import { ConfirmationPrompt } from '@atoms/confirmation-prompt.atom';
import { Spinner } from '@atoms/spinner.atom';
import { PiArrowCounterClockwise, PiPaperPlaneTilt } from 'react-icons/pi';

interface EtbFormActionsProps {
  isEditing: boolean;
  hasContent: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  isPending: boolean;
  showResetConfirm: boolean;
  onReset: () => void;
  onResetConfirm: () => void;
  onResetCancel: () => void;
}

/**
 * Form action buttons (Reset/Cancel and Submit)
 */
export function EtbFormActions({ isEditing, hasContent, canSubmit, isSubmitting, isPending, showResetConfirm, onReset, onResetConfirm, onResetCancel }: EtbFormActionsProps) {
  return (
    <div className="flex justify-end gap-3">
      {showResetConfirm ? (
        <ConfirmationPrompt
          message={isEditing ? 'Wirklich abbrechen?' : 'Wirklich zurücksetzen?'}
          confirmLabel={isEditing ? 'Ja, abbrechen' : 'Ja, löschen'}
          cancelLabel="Behalten"
          onConfirm={onResetConfirm}
          onCancel={onResetCancel}
          disabled={isPending}
          intent="warning"
        />
      ) : (
        <Button
          type="button"
          intent="secondary"
          size="sm"
          onClick={onReset}
          disabled={isPending}
          title={isEditing ? 'Bearbeitung abbrechen' : hasContent ? 'Formular zurücksetzen' : 'Nichts zum Zurücksetzen'}
        >
          <PiArrowCounterClockwise className="mr-1.5 h-4 w-4" />
          {isEditing ? 'Abbrechen' : 'Zurücksetzen'}
        </Button>
      )}

      <Button type="submit" intent="primary" size="sm" disabled={!canSubmit || isPending || isSubmitting}>
        {isPending ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            <span>Wird gespeichert...</span>
          </>
        ) : (
          <>
            <PiPaperPlaneTilt className="mr-2 h-4 w-4" />
            <span>{isEditing ? 'Eintrag aktualisieren' : 'Eintrag speichern'}</span>
          </>
        )}
      </Button>
    </div>
  );
}
