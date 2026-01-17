import { useCreateEtbEntry, useTextbausteine, useUpdateEtbEntry } from '@/features/etb';
import { useMyEinsatzTeilnahme, useEinsatzFahrzeuge, useEinsatzPersonen, useEinsatzTeilnehmer } from '@/features/einsatz/api';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { AddEintragDtoKategorieEnum, type EintragDto } from '@bluelight-hub/shared/client';
import { EtbFormActions } from '../molecules/EtbFormActions';
import { EtbTextbausteinPreview } from '../molecules/EtbTextbausteinPreview';
import { EtbKategorieSelect } from './EtbKategorieSelect';
import { EtbTextbausteinSelect } from './EtbTextbausteinSelect';
import { EtbTextInput } from './EtbTextInput';
import { EtbAbsenderInput } from './EtbAbsenderInput';
import { useEtbFormLogic } from '../../hooks/useEtbFormLogic';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

// Zod Schema mit Kategorie als String-Union (Enum-Werte)
const KATEGORIE_VALUES = Object.values(AddEintragDtoKategorieEnum) as [string, ...string[]];

const etbEntrySchema = z.object({
  kategorie: z.enum(KATEGORIE_VALUES),
  text: z.string().min(1, 'Text ist erforderlich').max(2000, 'Maximal 2000 Zeichen'),
  absender: z.string().max(100, 'Maximal 100 Zeichen').optional(),
  empfaenger: z.string().max(100, 'Maximal 100 Zeichen').optional(),
});

type EtbEntryFormData = z.infer<typeof etbEntrySchema>;

interface EtbEntryFormProps {
  etbId: string;
  einsatzId?: string;
  editingEntry?: EintragDto | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Formular zur Erstellung und Bearbeitung von ETB-Einträgen
 *
 * Unterstützt automatisches Ausfüllen des Absender-Feldes basierend auf
 * dem Funkrufnamen des Users für diesen Einsatz (via EinsatzTeilnehmer).
 */
export function EtbEntryForm({ etbId, einsatzId, editingEntry, onSuccess, onCancel, className }: EtbEntryFormProps) {
  const createEintrag = useCreateEtbEntry();
  const updateEintrag = useUpdateEtbEntry();
  const { data: textbausteineData } = useTextbausteine();
  const { data: teilnahmeData } = useMyEinsatzTeilnahme(einsatzId);
  const { data: fahrzeuge } = useEinsatzFahrzeuge(einsatzId ?? null);
  const { data: personen } = useEinsatzPersonen(einsatzId ?? null);
  const { data: alleTeilnehmer } = useEinsatzTeilnehmer(einsatzId);

  const [selectedKategorie, setSelectedKategorie] = useState<AddEintragDtoKategorieEnum>(editingEntry?.kategorie || AddEintragDtoKategorieEnum.Lage);
  const [pendingTextbaustein, setPendingTextbaustein] = useState<{ id: string; text: string } | null>(null);
  const [lastAppliedTextbausteinText, setLastAppliedTextbausteinText] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Auto-Fill Absender aus Teilnahme-Daten
  const autoFillAbsender = teilnahmeData?.data?.funkrufname || '';

  // Funkrufname-Vorschläge aus allen EinsatzKräften (Fahrzeuge + Personen + Teilnehmer)
  const funkrufnameVorschlaege = useMemo(() => {
    const suggestions: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    // Eigener Funkrufname zuerst (wenn vorhanden)
    if (autoFillAbsender) {
      suggestions.push({ value: autoFillAbsender, label: `${autoFillAbsender} (Mein Funkrufname)` });
      seen.add(autoFillAbsender);
    }

    // Alle aktiven Einsatz-Teilnehmer (andere User mit Funkrufnamen)
    alleTeilnehmer?.data?.forEach((teilnehmer) => {
      if (teilnehmer.funkrufname && !seen.has(teilnehmer.funkrufname)) {
        suggestions.push({ value: teilnehmer.funkrufname, label: `${teilnehmer.funkrufname} (Teilnehmer)` });
        seen.add(teilnehmer.funkrufname);
      }
    });

    // Fahrzeuge (z.B. "Florian Musterstadt 11/1")
    fahrzeuge?.forEach((fz) => {
      if (fz.funkrufname && !seen.has(fz.funkrufname)) {
        suggestions.push({ value: fz.funkrufname, label: `${fz.funkrufname} (Fahrzeug)` });
        seen.add(fz.funkrufname);
      }
    });

    // Personen (z.B. "GF", "ZF")
    personen?.forEach((p) => {
      if (p.funkrufname && !seen.has(p.funkrufname)) {
        suggestions.push({ value: p.funkrufname, label: `${p.funkrufname} (Person)` });
        seen.add(p.funkrufname);
      }
    });

    return suggestions;
  }, [autoFillAbsender, alleTeilnehmer, fahrzeuge, personen]);

  const form = useForm({
    defaultValues: {
      kategorie: editingEntry?.kategorie || AddEintragDtoKategorieEnum.Lage,
      text: editingEntry?.text || '',
      absender: editingEntry?.absender || autoFillAbsender,
      empfaenger: editingEntry?.empfaenger || '',
    } as EtbEntryFormData,
    validators: {
      onSubmit: etbEntrySchema,
    },
    listeners: {
      onChangeDebounceMs: 100,
      onChange: ({ formApi }) => {
        const kategorieValue = formApi.getFieldValue('kategorie') as AddEintragDtoKategorieEnum;
        setSelectedKategorie(kategorieValue);
      },
    },
    onSubmit: async ({ value }) => {
      try {
        if (editingEntry) {
          // Update existing entry
          // Backend erwartet nur newText (UpdateEintragDto)
          await updateEintrag.mutateAsync({
            etbId,
            eintragId: editingEntry.id,
            data: {
              newText: value.text.trim(),
            },
          });
        } else {
          // Create new entry mit absender/empfaenger
          await createEintrag.mutateAsync({
            etbId,
            data: {
              kategorie: value.kategorie as AddEintragDtoKategorieEnum,
              text: value.text.trim(),
              einsatzId,
              absender: value.absender?.trim() || undefined,
              empfaenger: value.empfaenger?.trim() || undefined,
            },
          });
        }

        form.reset();
        resetSelection();
        setPendingTextbaustein(null);
        setLastAppliedTextbausteinText(null);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to save ETB entry:', error);

        const context = editingEntry ? 'updateEtbEintrag' : 'createEtbEintrag';
        const fallbackMessage = editingEntry ? 'Beim Aktualisieren des ETB-Eintrags ist ein Fehler aufgetreten.' : 'Beim Erstellen des ETB-Eintrags ist ein Fehler aufgetreten.';

        const errorMessage = await getApiErrorMessage(error, fallbackMessage, context);

        toast.error(editingEntry ? 'Aktualisierung fehlgeschlagen' : 'Erstellung fehlgeschlagen', {
          description: errorMessage,
        });
      }
    },
  });

  // Textbausteine extrahieren (API gibt { data: Array<TextbausteinListResponse> } zurück)
  const textbausteine = (textbausteineData as { data?: unknown[] } | undefined)?.data ?? [];
  const { selectedTextbaustein, setSelectedTextbaustein, filteredTextbausteine, resetSelection } = useEtbFormLogic(textbausteine as import('../../types/etb.types').TextbausteinData[]);

  // Auto-Fill Absender wenn Teilnahme-Daten geladen werden (nur für neue Einträge)
  useEffect(() => {
    if (!editingEntry && autoFillAbsender && !form.getFieldValue('absender')) {
      form.setFieldValue('absender', autoFillAbsender);
    }
  }, [autoFillAbsender, editingEntry, form]);

  // Reset form when editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      form.reset({
        kategorie: editingEntry.kategorie,
        text: editingEntry.text,
        absender: editingEntry.absender || '',
        empfaenger: editingEntry.empfaenger || '',
      });
      setSelectedKategorie(editingEntry.kategorie);
    } else {
      form.reset({
        kategorie: AddEintragDtoKategorieEnum.Lage,
        text: '',
        absender: autoFillAbsender,
        empfaenger: '',
      });
      setSelectedKategorie(AddEintragDtoKategorieEnum.Lage);
    }
    resetSelection();
    setPendingTextbaustein(null);
    setLastAppliedTextbausteinText(null);
    setShowResetConfirm(false);
  }, [editingEntry, form, resetSelection, autoFillAbsender]);

  const handleTextbausteinChange = (textbausteinId: string) => {
    setSelectedTextbaustein(textbausteinId);

    const textbaustein = filteredTextbausteine(form.state.values.kategorie as AddEintragDtoKategorieEnum).find((tb) => tb.id === textbausteinId);

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
                value={field.state.value as AddEintragDtoKategorieEnum}
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

        {/* Absender/Empfänger Felder (nur beim Erstellen neuer Einträge) */}
        {!editingEntry && (
          <form.Subscribe selector={(state) => ({ absender: state.values.absender, empfaenger: state.values.empfaenger })}>
            {({ absender, empfaenger }) => (
              <EtbAbsenderInput
                absenderValue={absender || ''}
                empfaengerValue={empfaenger || ''}
                onAbsenderChange={(value: string) => form.setFieldValue('absender', value)}
                onEmpfaengerChange={(value: string) => form.setFieldValue('empfaenger', value)}
                absenderSuggestions={funkrufnameVorschlaege}
                empfaengerSuggestions={funkrufnameVorschlaege}
              />
            )}
          </form.Subscribe>
        )}

        {/* Preview Banner */}
        {pendingTextbaustein && <EtbTextbausteinPreview text={pendingTextbaustein.text} onApply={applyPendingTextbaustein} onCancel={cancelPendingTextbaustein} />}

        <form.Field name="text">
          {(field) => (
            <EtbTextInput
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              onSubmit={() => form.handleSubmit()}
              error={field.state.meta.errors?.[0]?.message}
              maxLength={2000}
            />
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            textValue: state.values.text,
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ textValue, canSubmit, isSubmitting }) => {
            const hasContent = (textValue || '').trim() !== '';
            const isPending = editingEntry ? updateEintrag.isPending : createEintrag.isPending;

            return (
              <EtbFormActions
                isEditing={!!editingEntry}
                hasContent={hasContent}
                canSubmit={canSubmit}
                isSubmitting={isSubmitting}
                isPending={isPending}
                showResetConfirm={showResetConfirm}
                onReset={() => {
                  if (hasContent) {
                    setShowResetConfirm(true);
                  } else {
                    handleReset();
                  }
                }}
                onResetConfirm={handleReset}
                onResetCancel={() => setShowResetConfirm(false)}
              />
            );
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}
