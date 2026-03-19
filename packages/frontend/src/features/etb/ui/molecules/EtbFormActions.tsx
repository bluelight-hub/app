import { Button } from '@/shared/ui/atoms/button.atom';
import { ConfirmationPrompt } from '@/shared/ui/atoms/confirmation-prompt.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { PiArrowCounterClockwise, PiPaperPlaneTilt } from 'react-icons/pi';

/** Props für die ETB-Formular-Aktionsleiste */
interface EtbFormActionsProps {
  /** Ob ein bestehender Eintrag bearbeitet wird (beeinflusst Button-Labels) */
  isEditing: boolean;
  /** Ob das Formular Inhalt hat (für Reset-Button-Zustand) */
  hasContent: boolean;
  /** Ob das Formular validiert und absendbar ist */
  canSubmit: boolean;
  /** Ob gerade eine Submission läuft */
  isSubmitting: boolean;
  /** Ob eine Mutation aussteht (deaktiviert alle Aktionen) */
  isPending: boolean;
  /** Ob die Reset-Bestätigung angezeigt wird */
  showResetConfirm: boolean;
  /** Handler für Reset-/Abbrechen-Button-Klick */
  onReset: () => void;
  /** Handler für Bestätigung des Resets */
  onResetConfirm: () => void;
  /** Handler für Abbruch des Reset-Dialogs */
  onResetCancel: () => void;
}

/**
 * Aktionsleiste für das ETB-Eingabeformular (Zurücksetzen/Abbrechen und Speichern).
 *
 * Zeigt kontextabhängig entweder einen Bestätigungs-Dialog oder die
 * Standard-Aktionsbuttons. Der Submit-Button wird bei ungültiger
 * Validierung oder laufender Mutation deaktiviert.
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

      <Button type="submit" intent="primary" size="sm" disabled={!canSubmit || isPending || isSubmitting} aria-disabled={!canSubmit || isPending || isSubmitting}>
        {isPending ? (
          <>
            <Spinner className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Wird gespeichert...</span>
          </>
        ) : (
          <>
            <PiPaperPlaneTilt className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>{isEditing ? 'Eintrag aktualisieren' : 'Eintrag speichern'}</span>
          </>
        )}
      </Button>
    </div>
  );
}
