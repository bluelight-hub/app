import { useCreateEtbEintrag, useTextbausteine, useUpdateEtbEintrag } from '@/hooks/useEtb';
import { Button } from '@atoms/button.atom';
import { Spinner } from '@atoms/spinner.atom';
import { CreateEtbEintragDtoKategorieEnum as EtbKategorie, type EtbEintragDto } from '@bluelight-hub/shared/client';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { PiArrowCounterClockwise, PiCheckCircle, PiPaperPlaneTilt, PiWarningCircle, PiX } from 'react-icons/pi';
import { z } from 'zod';
import { EtbKategorieSelect } from './EtbKategorieSelect';
import { EtbTextbausteinSelect } from './EtbTextbausteinSelect';
import { EtbTextInput } from './EtbTextInput';
import { useEtbFormLogic } from './hooks/useEtbFormLogic';

const etbEntrySchema = z.object({
  kategorie: z.enum(EtbKategorie),
  text: z.string().min(1, 'Text ist erforderlich').max(2000, 'Maximal 2000 Zeichen'),
  timestamp: z.date().optional(),
});

type EtbEntryFormData = z.infer<typeof etbEntrySchema>;

interface EtbEntryFormProps {
  etbId: string;
  editingEntry?: EtbEintragDto | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Formular zur Erstellung und Bearbeitung von ETB-Einträgen
 */
export function EtbEntryForm({ etbId, editingEntry, onSuccess, onCancel, className }: EtbEntryFormProps) {
  const createEintrag = useCreateEtbEintrag();
  const updateEintrag = useUpdateEtbEintrag();
  const { data: textbausteineData } = useTextbausteine();
  const [selectedKategorie, setSelectedKategorie] = useState<EtbKategorie>(editingEntry?.kategorie || EtbKategorie.Lage);
  const [pendingTextbaustein, setPendingTextbaustein] = useState<{ id: string; text: string } | null>(null);
  const [lastAppliedTextbausteinText, setLastAppliedTextbausteinText] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const form = useForm({
    defaultValues: {
      kategorie: editingEntry?.kategorie || EtbKategorie.Lage,
      text: editingEntry?.text || '',
      timestamp: editingEntry ? new Date(editingEntry.timestamp) : new Date(),
    } as EtbEntryFormData,
    validators: {
      onSubmit: etbEntrySchema,
    },
    listeners: {
      onChangeDebounceMs: 100,
      onChange: ({ formApi }) => {
        setSelectedKategorie(formApi.getFieldValue('kategorie'));
      },
    },
    onSubmit: async ({ value }) => {
      try {
        if (editingEntry) {
          // Update existing entry
          await updateEintrag.mutateAsync({
            eintragId: editingEntry.id,
            data: {
              kategorie: value.kategorie,
              text: value.text.trim(),
              timestamp: value.timestamp,
            },
          });
        } else {
          // Create new entry
          await createEintrag.mutateAsync({
            etbId,
            data: {
              kategorie: value.kategorie,
              text: value.text.trim(),
              timestamp: value.timestamp,
            },
          });
        }

        form.reset();
        resetSelection();
        setPendingTextbaustein(null);
        setLastAppliedTextbausteinText(null);
        onSuccess?.();
      } catch (_error) {}
    },
  });

  const { selectedTextbaustein, setSelectedTextbaustein, filteredTextbausteine, resetSelection } = useEtbFormLogic(textbausteineData?.data || []);

  // Reset form when editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      form.reset({
        kategorie: editingEntry.kategorie,
        text: editingEntry.text,
        timestamp: new Date(editingEntry.timestamp),
      });
      setSelectedKategorie(editingEntry.kategorie);
    } else {
      form.reset({
        kategorie: EtbKategorie.Lage,
        text: '',
        timestamp: new Date(),
      });
      setSelectedKategorie(EtbKategorie.Lage);
    }
    resetSelection();
    setPendingTextbaustein(null);
    setLastAppliedTextbausteinText(null);
    setShowResetConfirm(false);
  }, [editingEntry, form, resetSelection]);

  const handleTextbausteinChange = (textbausteinId: string) => {
    setSelectedTextbaustein(textbausteinId);

    const textbaustein = filteredTextbausteine(form.state.values.kategorie).find((tb) => tb.id === textbausteinId);

    if (textbaustein?.volltext) {
      const currentText = form.state.values.text;

      // Check if text field has been manually modified
      // Show preview only if text exists, is not empty, and is different from the last applied textbaustein
      if (currentText && currentText.trim() !== '' && currentText !== lastAppliedTextbausteinText && currentText !== textbaustein.volltext) {
        // Show preview instead of directly applying
        setPendingTextbaustein({ id: textbausteinId, text: textbaustein.volltext });
      } else {
        // Directly apply if field is empty, same as last textbaustein, or already matches the new textbaustein
        form.setFieldValue('text', textbaustein.volltext);
        setLastAppliedTextbausteinText(textbaustein.volltext);
        setPendingTextbaustein(null);
      }
    }
  };

  const applyPendingTextbaustein = () => {
    if (pendingTextbaustein) {
      form.setFieldValue('text', pendingTextbaustein.text);
      setLastAppliedTextbausteinText(pendingTextbaustein.text);
      setPendingTextbaustein(null);
    }
  };

  const cancelPendingTextbaustein = () => {
    setPendingTextbaustein(null);
    // Reset selection to empty when canceling
    setSelectedTextbaustein('');
  };

  const handleReset = () => {
    if (editingEntry) {
      // If editing, cancel the edit mode
      onCancel?.();
    } else {
      // If creating new, reset the form
      form.reset();
      resetSelection();
      setPendingTextbaustein(null);
      setLastAppliedTextbausteinText(null);
      setShowResetConfirm(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <form.Field name="kategorie">
            {(field) => (
              <EtbKategorieSelect
                value={field.state.value}
                onChange={(value) => {
                  field.handleChange(value);
                  setSelectedTextbaustein('');
                }}
                error={field.state.meta.errors?.[0]?.message}
              />
            )}
          </form.Field>

          <EtbTextbausteinSelect kategorie={selectedKategorie} value={selectedTextbaustein} onChange={handleTextbausteinChange} textbausteine={filteredTextbausteine(selectedKategorie)} />
        </div>

        {/* Preview Banner */}
        {pendingTextbaustein && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-start gap-2">
              <PiWarningCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="flex-grow">
                <p className="font-medium text-sm text-yellow-800">Textbaustein-Vorschau</p>
                <p className="mt-1 text-sm text-yellow-700">Der vorhandene Text wird ersetzt mit:</p>
                <div className="mt-2 rounded border border-yellow-200 bg-white p-2">
                  <p className="line-clamp-2 text-gray-700 text-sm">{pendingTextbaustein.text}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" intent="primary" onClick={applyPendingTextbaustein}>
                    <PiCheckCircle className="mr-1 h-4 w-4" />
                    Text übernehmen
                  </Button>
                  <Button type="button" size="sm" intent="secondary" onClick={cancelPendingTextbaustein}>
                    <PiX className="mr-1 h-4 w-4" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form.Field name="text">
          {(field) => <EtbTextInput value={field.state.value} onChange={field.handleChange} onBlur={field.handleBlur} error={field.state.meta.errors?.[0]?.message} maxLength={2000} />}
        </form.Field>

        <div className="flex justify-end gap-3">
          <form.Subscribe selector={(state) => ({ textValue: state.values.text })}>
            {({ textValue }) => {
              const hasContent = (textValue || '').trim() !== '';
              return (
                <>
                  {showResetConfirm ? (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5">
                      <span className="text-sm text-yellow-700">{editingEntry ? 'Wirklich abbrechen?' : 'Wirklich zurücksetzen?'}</span>
                      <Button type="button" size="sm" intent="warning" onClick={handleReset} disabled={createEintrag.isPending || updateEintrag.isPending}>
                        {editingEntry ? 'Ja, abbrechen' : 'Ja, löschen'}
                      </Button>
                      <Button type="button" size="sm" intent="secondary" onClick={() => setShowResetConfirm(false)} disabled={createEintrag.isPending || updateEintrag.isPending}>
                        Behalten
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      intent="secondary"
                      size="sm"
                      onClick={() => {
                        if (hasContent) {
                          setShowResetConfirm(true);
                        } else {
                          handleReset();
                        }
                      }}
                      disabled={createEintrag.isPending || updateEintrag.isPending}
                      title={editingEntry ? 'Bearbeitung abbrechen' : hasContent ? 'Formular zurücksetzen' : 'Nichts zum Zurücksetzen'}
                    >
                      <PiArrowCounterClockwise className="mr-1.5 h-4 w-4" />
                      {editingEntry ? 'Abbrechen' : 'Zurücksetzen'}
                    </Button>
                  )}
                </>
              );
            }}
          </form.Subscribe>

          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" intent="primary" size="sm" disabled={!canSubmit || (editingEntry ? updateEintrag.isPending : createEintrag.isPending) || isSubmitting}>
                {(editingEntry ? updateEintrag.isPending : createEintrag.isPending) ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    <span>Wird gespeichert...</span>
                  </>
                ) : (
                  <>
                    <PiPaperPlaneTilt className="mr-2 h-4 w-4" />
                    <span>{editingEntry ? 'Eintrag aktualisieren' : 'Eintrag speichern'}</span>
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  );
}
