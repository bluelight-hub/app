import { renderWithProviders, screen, fireEvent, waitFor, act } from '@/test/utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EtbEntryForm } from '../EtbEntryForm';

// Mock API-Hooks
vi.mock('@/features/einsatz/api', () => ({
  useMyEinsatzTeilnahme: () => ({ data: null }),
  useEinsatzFahrzeuge: () => ({ data: [] }),
  useEinsatzPersonen: () => ({ data: [] }),
  useEinsatzTeilnehmer: () => ({ data: null }),
}));

// Mock non-validation UI Komponenten aus dem Barrel
vi.mock('@/features/etb', () => ({
  useCreateEtbEntry: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useTextbausteine: () => ({ data: null }),
  useEtbFormLogic: () => ({
    selectedTextbaustein: '',
    setSelectedTextbaustein: vi.fn(),
    filteredTextbausteine: () => [],
    resetSelection: vi.fn(),
  }),
  EtbFormActions: ({ canSubmit, isSubmitting, isPending }: { canSubmit: boolean; isSubmitting: boolean; isPending: boolean }) => (
    <button type="submit" disabled={!canSubmit || isPending || isSubmitting}>
      Eintrag speichern
    </button>
  ),
  EtbKategorieSelect: ({ error, onBlur }: { error?: string; onBlur?: () => void; value: string; onChange: (v: string) => void }) => (
    <div data-testid="kategorie-select">
      <select data-testid="kategorie-input" onBlur={onBlur} aria-invalid={!!error || undefined}>
        <option value="LAGE">Lage</option>
      </select>
      {error && (
        <p data-testid="kategorie-error" role="alert">
          {error}
        </p>
      )}
    </div>
  ),
  EtbTextbausteinPreview: () => null,
  EtbTextbausteinSelect: () => <div data-testid="textbaustein-select" />,
}));

// Mock Combobox fuer testbare Absender/Empfaenger-Felder
vi.mock('@/shared/ui/headless/combobox', () => ({
  Combobox: ({
    label,
    value,
    onChange,
    onBlur,
    error,
    autoFocus,
  }: {
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    error?: string;
    autoFocus?: boolean;
    items?: unknown[];
    placeholder?: string;
    allowCustomValue?: boolean;
  }) => {
    const safeLabel = label || 'combobox';
    const errorId = `${safeLabel.replace(/\s+/g, '-').toLowerCase()}-error`;
    return (
      <div data-testid={`combobox-${safeLabel}`}>
        <label htmlFor={`input-${safeLabel}`}>{safeLabel}</label>
        <input
          id={`input-${safeLabel}`}
          role="combobox"
          aria-label={safeLabel}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          autoFocus={autoFocus}
        />
        {error && (
          <p id={errorId} aria-live="polite" data-testid={`error-${safeLabel}`}>
            {error}
          </p>
        )}
      </div>
    );
  },
}));

describe('EtbEntryForm — Feldnahe Validierung (Story 3.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () => renderWithProviders(<EtbEntryForm etbId="etb-1" einsatzId="einsatz-1" />);

  // === AC1: Feldnahe Validierungsanzeige ===

  describe('AC1: Feldnahe Validierungsanzeige', () => {
    it('zeigt Validierungsfehler am Text-Feld bei Blur mit leerem Wert', async () => {
      // Given — Formular gerendert, Text-Feld leer
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      // When — Text-Feld fokussieren und verlassen (blur)
      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      // Then — Fehler "Text ist erforderlich" erscheint feldnah
      await waitFor(() => {
        expect(screen.getByText('Text ist erforderlich')).toBeInTheDocument();
      });
    });

    it('zeigt Absender-Fehler bei Überlänge nach Blur', async () => {
      // Given — Absender mit >100 Zeichen eingegeben
      renderForm();
      const absenderInput = screen.getByRole('combobox', { name: 'Absender (Funkrufname)' });
      const longValue = 'A'.repeat(101);

      // When — Wert setzen und Blur auslösen
      await act(async () => {
        fireEvent.change(absenderInput, { target: { value: longValue } });
        fireEvent.blur(absenderInput);
      });

      // Then — Fehler "Maximal 100 Zeichen" erscheint
      await waitFor(() => {
        expect(screen.getByText('Maximal 100 Zeichen')).toBeInTheDocument();
      });
    });

    it('zeigt Empfaenger-Fehler bei Überlänge nach Blur', async () => {
      // Given — Empfaenger mit >100 Zeichen eingegeben
      renderForm();
      const empfaengerInput = screen.getByRole('combobox', { name: 'Empfänger (Funkrufname)' });
      const longValue = 'B'.repeat(101);

      // When — Wert setzen und Blur auslösen
      await act(async () => {
        fireEvent.change(empfaengerInput, { target: { value: longValue } });
        fireEvent.blur(empfaengerInput);
      });

      // Then — Fehler "Maximal 100 Zeichen" erscheint
      await waitFor(() => {
        expect(screen.getByText('Maximal 100 Zeichen')).toBeInTheDocument();
      });
    });
  });

  // === AC2: Gültige Daten akzeptieren ===

  describe('AC2: Gültige Daten akzeptieren', () => {
    it('zeigt keine Fehler bei gültigen Eingaben', async () => {
      // Given — Formular gerendert
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      // When — Gültigen Text eingeben und Blur
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Gültige Lagemeldung' } });
        fireEvent.blur(textarea);
      });

      // Then — Kein Fehler sichtbar
      await waitFor(() => {
        expect(screen.queryByText('Text ist erforderlich')).not.toBeInTheDocument();
        expect(screen.queryByText('Maximal 2000 Zeichen')).not.toBeInTheDocument();
      });
    });

    it('akzeptiert leere optionale Felder ohne Fehler', async () => {
      // Given — Formular mit gültigem Text
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      // When — Nur Pflichtfeld ausfüllen
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Lagemeldung eingegeben' } });
        fireEvent.blur(textarea);
      });

      // Then — Absender/Empfänger zeigen keine Fehler
      expect(screen.queryByTestId('error-Absender (Funkrufname)')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-Empfänger (Funkrufname)')).not.toBeInTheDocument();
    });
  });

  // === AC3: Fehlerkorrektur mit Zustandserhalt ===

  describe('AC3: Fehlerkorrektur mit Zustandserhalt', () => {
    it('entfernt Fehlermeldung nach Korrektur und erneutem Blur', async () => {
      // Given — Text-Fehler provoziert durch Blur auf leerem Feld
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      await waitFor(() => {
        expect(screen.getByText('Text ist erforderlich')).toBeInTheDocument();
      });

      // When — Gültigen Text eingeben und erneut Blur (onBlur revalidiert)
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Korrigierter Text' } });
        fireEvent.blur(textarea);
      });

      // Then — Fehlermeldung verschwindet nachvollziehbar
      await waitFor(() => {
        expect(screen.queryByText('Text ist erforderlich')).not.toBeInTheDocument();
      });
    });

    it('behält Fokus auf dem Eingabefeld bei Validierung', async () => {
      // Given — Text eingeben und Blur auslösen um Fehler zu provozieren
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Eingabe' } });
        fireEvent.change(textarea, { target: { value: '' } });
        fireEvent.blur(textarea);
      });

      // When — Fehler erscheint, dann Fokus zurücksetzen
      await waitFor(() => {
        expect(screen.getByText('Text ist erforderlich')).toBeInTheDocument();
      });

      await act(async () => {
        textarea.focus();
        fireEvent.change(textarea, { target: { value: 'Korrigierter Text' } });
      });

      // Then — Fokus bleibt stabil auf dem Textarea trotz Fehleranzeige, eingegebener Text erhalten
      expect(document.activeElement).toBe(textarea);
      expect(textarea).toHaveValue('Korrigierter Text');
    });

    it('zeigt onChange-Fehler wenn Text eingegeben und wieder gelöscht wird', async () => {
      // Given — Formular gerendert, Text eingeben und Blur (aktiviert onChange-Validator)
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Hallo' } });
        fireEvent.blur(textarea);
      });

      // When — Text vollständig löschen (onChange-Validator greift)
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '' } });
      });

      // Then — Fehler erscheint durch onChange-Validator
      await waitFor(() => {
        expect(screen.getByText('Text ist erforderlich')).toBeInTheDocument();
      });
    });
  });

  // === AC4: Accessibility ===

  describe('AC4: Accessibility-Compliance', () => {
    it('setzt aria-invalid auf Text-Feld bei Fehler', async () => {
      // Given — Text-Feld leer
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      // When — Blur auf leerem Feld
      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      // Then — aria-invalid ist gesetzt
      await waitFor(() => {
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('setzt aria-describedby auf Text-Feld mit Fehlerverweis', async () => {
      // Given — Fehler provoziert
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      // Then — aria-describedby verweist auf Fehler-Element (dynamische ID via useId)
      await waitFor(() => {
        const describedBy = textarea.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        const errorElement = document.getElementById(describedBy!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Text ist erforderlich');
      });
    });

    it('hat aria-live="polite" auf Text-Fehler-Meldung', async () => {
      // Given/When — Fehler provoziert
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      // Then — Fehlermeldung hat aria-live="polite" für Screenreader (konsistent mit Combobox)
      await waitFor(() => {
        const describedBy = textarea.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        const errorEl = document.getElementById(describedBy!);
        expect(errorEl).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('setzt aria-invalid auf Combobox-Felder bei Fehler', async () => {
      // Given — Absender mit Überlänge
      renderForm();
      const absenderInput = screen.getByRole('combobox', { name: 'Absender (Funkrufname)' });

      // When — Überlanger Wert und Blur
      await act(async () => {
        fireEvent.change(absenderInput, { target: { value: 'A'.repeat(101) } });
        fireEvent.blur(absenderInput);
      });

      // Then — aria-invalid ist gesetzt
      await waitFor(() => {
        expect(absenderInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('setzt aria-describedby auf Combobox-Felder mit Fehlerverweis', async () => {
      // Given — Absender mit Überlänge
      renderForm();
      const absenderInput = screen.getByRole('combobox', { name: 'Absender (Funkrufname)' });

      // When — Überlanger Wert und Blur
      await act(async () => {
        fireEvent.change(absenderInput, { target: { value: 'A'.repeat(101) } });
        fireEvent.blur(absenderInput);
      });

      // Then — aria-describedby verweist auf Fehler-Element
      await waitFor(() => {
        expect(absenderInput).toHaveAttribute('aria-describedby');
      });
    });

    it('hat aria-live="polite" auf Combobox-Fehlermeldungen', async () => {
      // Given — Absender-Fehler provoziert
      renderForm();
      const absenderInput = screen.getByRole('combobox', { name: 'Absender (Funkrufname)' });

      await act(async () => {
        fireEvent.change(absenderInput, { target: { value: 'A'.repeat(101) } });
        fireEvent.blur(absenderInput);
      });

      // Then — Fehlermeldung hat aria-live="polite"
      await waitFor(() => {
        const errorEl = screen.getByTestId('error-Absender (Funkrufname)');
        expect(errorEl).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('keine Farb-only Semantik: Error als Text + roter Stil', async () => {
      // Given/When — Fehler provoziert
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      // Then — Fehler hat Text-Inhalt (nicht nur Farbe) — dynamische ID via useId
      await waitFor(() => {
        const describedBy = textarea.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        const errorEl = document.getElementById(describedBy!);
        expect(errorEl).toBeInTheDocument();
        expect(errorEl?.textContent).toBeTruthy();
        expect(errorEl?.textContent?.length).toBeGreaterThan(0);
      });
    });
  });

  // === AC4: Performance-Gate ===

  describe('5.5: Validierungs-Performance', () => {
    it('liefert Feedback innerhalb von 200ms nach Blur', async () => {
      // Given — Formular gerendert
      renderForm();
      const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');

      // When — Blur auslösen
      await act(async () => {
        fireEvent.focus(textarea);
        fireEvent.blur(textarea);
      });

      // Then — Fehler erscheint innerhalb von 200ms (waitFor-Timeout beweist dies)
      await waitFor(
        () => {
          expect(screen.getByText('Text ist erforderlich')).toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });
  });

  // === Story 3.5: Draft-Wiederaufnahme ===

  describe('Story 3.5: Draft-Wiederaufnahme via restoredDraftValues', () => {
    it('befüllt Formularfelder mit wiederhergestellten Draft-Werten', async () => {
      // Given — Draft-Werte vorhanden
      const onDraftRestored = vi.fn();
      const draftValues = {
        text: 'Hochwasser steigt weiter',
        kategorie: 'LAGE',
        absender: 'EL Musterstadt',
        empfaenger: 'Leitstelle',
      };

      renderWithProviders(<EtbEntryForm etbId="etb-1" einsatzId="einsatz-1" restoredDraftValues={draftValues} onDraftRestored={onDraftRestored} />);

      // Then — Text-Feld enthält den Draft-Text
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText('Beschreiben Sie das Ereignis oder die Maßnahme...');
        expect(textarea).toHaveValue('Hochwasser steigt weiter');
      });

      // Then — onDraftRestored wurde aufgerufen
      expect(onDraftRestored).toHaveBeenCalledOnce();
    });

    it('setzt keine Draft-Werte wenn restoredDraftValues null ist', () => {
      // Given — keine Draft-Werte
      const onDraftRestored = vi.fn();

      renderWithProviders(<EtbEntryForm etbId="etb-1" einsatzId="einsatz-1" restoredDraftValues={null} onDraftRestored={onDraftRestored} />);

      // Then — onDraftRestored wird nicht aufgerufen
      expect(onDraftRestored).not.toHaveBeenCalled();
    });
  });
});
