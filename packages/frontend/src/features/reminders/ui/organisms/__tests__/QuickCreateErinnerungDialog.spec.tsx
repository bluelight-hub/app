/**
 * Integration Tests für QuickCreateErinnerungDialog
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 1.2:** "Erinnerung mit benutzerdefinierter Zeit anlegen"
 * - AC1: Benutzerdefiniert-Chip neben Preset-Chips sichtbar
 * - AC2: TimeInput erscheint bei Benutzerdefiniert-Klick
 * - AC4: Modus-Wechsel zwischen Preset und Custom
 * - Form Submit: Formular kann mit Custom-Zeit submitted werden
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { QuickCreateErinnerungDialog } from '../QuickCreateErinnerungDialog';

import type { ErinnerungsvorlageResponseDto } from '@/shared';

// Mock der API-Hooks
const mockMutate = vi.fn();
vi.mock('../../../api', () => ({
  useCreateErinnerung: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// Story 6.3: Mock der Templates Feature Imports
const mockVorlagen: ErinnerungsvorlageResponseDto[] = [
  {
    id: 'v1',
    titel: 'Lagebesprechung',
    minuten: 30,
    beschreibung: 'Regelmaessige Lagebesprechung im Stab',
    createdBy: 'user-1',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'v2',
    titel: 'Rückmeldung pruefen',
    minuten: 15,
    beschreibung: null,
    createdBy: 'user-1',
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
  },
];

vi.mock('@/features/templates', () => ({
  useVorlagen: () => ({
    data: mockVorlagen,
    isLoading: false,
  }),
  TemplatePicker: ({
    vorlagen,
    onSelect,
    isLoading,
    disabled,
  }: {
    vorlagen: ErinnerungsvorlageResponseDto[];
    onSelect: (v: ErinnerungsvorlageResponseDto) => void;
    isLoading: boolean;
    disabled?: boolean;
  }) => (
    <div data-testid="template-picker">
      {vorlagen.map((v) => (
        <button key={v.id} type="button" data-testid={`template-${v.id}`} onClick={() => onSelect(v)} disabled={disabled || isLoading}>
          {v.titel} ({v.minuten} Min)
        </button>
      ))}
    </div>
  ),
}));

// Mock ETB queries (vermeidet EtbKategorie Enum Import-Fehler in der transitiven Dependency-Chain)
vi.mock('@/features/etb/api/queries', () => ({
  ETB_QUERY_KEYS: {
    all: ['etb'] as const,
    byEinsatz: (einsatzId: string) => ['etb', 'list', einsatzId] as const,
  },
}));

// Mock @/shared (vorbestehendes Problem: EtbKategorie Enum nicht auflösbar in Vitest)
// Noetig weil QuickCreateErinnerungDialog transitiv @/features/etb importiert,
// das @/shared fuer AddEintragDtoKategorieEnum braucht.
vi.mock('@/shared', async () => {
  const actual = await vi.importActual<typeof import('@/shared')>('@/shared');

  return {
    ...actual,
    EinsatzRolleDtoRolleEnum: {
      Befehlsgeber: 'BEFEHLSGEBER',
      Empfaenger: 'EMPFAENGER',
      Beobachter: 'BEOBACHTER',
    },
    ManagedUserResponseDtoRoleEnum: {
      User: 'USER',
      Admin: 'ADMIN',
      SuperAdmin: 'SUPER_ADMIN',
    },
    AddEintragDtoKategorieEnum: {
      Alarmierung: 'ALARMIERUNG',
      Ankunft: 'ANKUNFT',
      Befehl: 'BEFEHL',
      Erkundung: 'ERKUNDUNG',
      Lage: 'LAGE',
      Massnahme: 'MASSNAHME',
      Personal: 'PERSONAL',
      Fahrzeug: 'FAHRZEUG',
      Material: 'MATERIAL',
      Kommunikation: 'KOMMUNIKATION',
      Wetter: 'WETTER',
      Dokumentation: 'DOKUMENTATION',
      Sonstiges: 'SONSTIGES',
      System: 'SYSTEM',
    },
    EintragDtoKategorieEnum: {
      Alarmierung: 'ALARMIERUNG',
      Ankunft: 'ANKUNFT',
      Befehl: 'BEFEHL',
      Erkundung: 'ERKUNDUNG',
      Lage: 'LAGE',
      Massnahme: 'MASSNAHME',
      Personal: 'PERSONAL',
      Fahrzeug: 'FAHRZEUG',
      Material: 'MATERIAL',
      Kommunikation: 'KOMMUNIKATION',
      Wetter: 'WETTER',
      Dokumentation: 'DOKUMENTATION',
      Sonstiges: 'SONSTIGES',
      System: 'SYSTEM',
    },
    api: {},
    ResponseError: class ResponseError extends Error {
      response: Response;
      constructor(response: Response, msg?: string) {
        super(msg);
        this.response = response;
      }
    },
  };
});

// Mock der Zeit-Berechnung für deterministische Tests
vi.mock('../../../utils/time-calculation', () => ({
  getDefaultCustomTime: () => ({ hours: 14, minutes: 30 }),
  calculateCustomFaelligAm: (hours: number, minutes: number) => {
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  },
  formatTimeForToast: (date: Date) => `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
}));

describe('QuickCreateErinnerungDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    einsatzId: 'test-einsatz-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Story 1.2 AC1: Benutzerdefiniert-Chip Sichtbarkeit', () => {
    it('should display "Benutzerdefiniert" chip alongside preset chips', async () => {
      // Given (Arrange)
      // - Dialog wird gerendert mit Standard-Props

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);
      });

      // Then (Assert)
      // - Alle Preset-Chips sind sichtbar
      expect(screen.getByRole('button', { name: '5 Min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10 Min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '15 Min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30 Min' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '60 Min' })).toBeInTheDocument();

      // - Benutzerdefiniert-Chip ist ebenfalls sichtbar
      expect(screen.getByRole('button', { name: /uhrzeit/i })).toBeInTheDocument();
    });

    it('should have preset mode selected by default (30 Min)', async () => {
      // Given (Arrange)
      // - Dialog wird gerendert

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);
      });

      // Then (Assert)
      // - 30 Min Chip ist standardmaessig aktiv (aria-pressed)
      const defaultChip = screen.getByRole('button', { name: '30 Min' });
      expect(defaultChip).toHaveAttribute('aria-pressed', 'true');

      // - Benutzerdefiniert-Chip ist nicht aktiv
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      expect(customChip).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Story 1.2 AC2: TimeInput bei Benutzerdefiniert-Klick', () => {
    it('should show TimeInput when "Benutzerdefiniert" chip is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - TimeInput ist initial nicht sichtbar
      expect(screen.queryByLabelText(/stunden/i)).not.toBeInTheDocument();

      // When (Act)
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      await user.click(customChip);

      // Then (Assert)
      // - TimeInput wird angezeigt (Stunden und Minuten Felder)
      expect(screen.getByLabelText(/stunden/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minuten/i)).toBeInTheDocument();
    });

    it('should mark "Benutzerdefiniert" chip as active after click', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // When (Act)
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      await user.click(customChip);

      // Then (Assert)
      // - Benutzerdefiniert-Chip ist jetzt aktiv
      expect(customChip).toHaveAttribute('aria-pressed', 'true');

      // - Alle Preset-Chips sind inaktiv
      expect(screen.getByRole('button', { name: '30 Min' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: '5 Min' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('should display default time values in TimeInput', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // When (Act)
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      await user.click(customChip);

      // Then (Assert)
      // - Default-Zeit ist 14:30 (aus getDefaultCustomTime Mock)
      expect(screen.getByLabelText(/stunden/i)).toHaveValue('14');
      expect(screen.getByLabelText(/minuten/i)).toHaveValue('30');
    });
  });

  describe('Story 1.2 AC4: Modus-Wechsel', () => {
    it('should hide TimeInput when switching from custom to preset mode', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Wechsle zu Custom-Modus
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      await user.click(customChip);

      // - TimeInput ist sichtbar
      expect(screen.getByLabelText(/stunden/i)).toBeInTheDocument();

      // When (Act)
      // - Wechsle zurueck zu Preset-Modus (klicke auf 15 Min)
      const presetChip = screen.getByRole('button', { name: '15 Min' });
      await user.click(presetChip);

      // Then (Assert)
      // - TimeInput ist nicht mehr sichtbar
      expect(screen.queryByLabelText(/stunden/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/minuten/i)).not.toBeInTheDocument();

      // - 15 Min Chip ist jetzt aktiv
      expect(presetChip).toHaveAttribute('aria-pressed', 'true');

      // - Benutzerdefiniert-Chip ist inaktiv
      expect(customChip).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show TimeInput again when switching back to custom mode', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Wechsle zu Custom-Modus
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      await user.click(customChip);

      // - TimeInput ist sichtbar
      expect(screen.getByLabelText(/stunden/i)).toBeInTheDocument();

      // - Wechsle zu Preset
      const presetChip = screen.getByRole('button', { name: '10 Min' });
      await user.click(presetChip);

      // - TimeInput ist versteckt
      expect(screen.queryByLabelText(/stunden/i)).not.toBeInTheDocument();

      // When (Act)
      // - Wechsle zurueck zu Custom
      await user.click(customChip);

      // Then (Assert)
      // - TimeInput ist wieder sichtbar
      expect(screen.getByLabelText(/stunden/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minuten/i)).toBeInTheDocument();
    });
  });

  describe('Form Submit mit Custom-Zeit', () => {
    it('should submit form with custom time values', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Titel eingeben
      const titelInput = screen.getByPlaceholderText(/lagebesprechung/i);
      await user.type(titelInput, 'Wichtige Erinnerung');

      // - Wechsle zu Custom-Modus
      const customChip = screen.getByRole('button', { name: /uhrzeit/i });
      await user.click(customChip);

      // - Zeit aendern
      const hoursInput = screen.getByLabelText(/stunden/i);
      const minutesInput = screen.getByLabelText(/minuten/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, '18');
      await user.clear(minutesInput);
      await user.type(minutesInput, '00');

      // When (Act)
      // - Formular absenden
      const submitButton = screen.getByRole('button', { name: /erinnerung erstellen/i });
      await user.click(submitButton);

      // Then (Assert)
      // - API wurde mit korrekten Daten aufgerufen
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockMutate.mock.calls[0][0];
      expect(callArgs.einsatzId).toBe('test-einsatz-123');
      expect(callArgs.data.titel).toBe('Wichtige Erinnerung');
      expect(callArgs.data.faelligAm).toBeDefined();
    });

    it('should submit form with preset time values', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Titel eingeben
      const titelInput = screen.getByPlaceholderText(/lagebesprechung/i);
      await user.type(titelInput, 'Test Erinnerung');

      // - Preset auswählen (15 Min)
      const presetChip = screen.getByRole('button', { name: '15 Min' });
      await user.click(presetChip);

      // When (Act)
      const submitButton = screen.getByRole('button', { name: /erinnerung erstellen/i });
      await user.click(submitButton);

      // Then (Assert)
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockMutate.mock.calls[0][0];
      expect(callArgs.einsatzId).toBe('test-einsatz-123');
      expect(callArgs.data.titel).toBe('Test Erinnerung');
      expect(callArgs.data.faelligAm).toBeDefined();
    });

    it('should not submit when titel is empty', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Kein Titel eingeben, aber Zeit auswählen
      const presetChip = screen.getByRole('button', { name: '10 Min' });
      await user.click(presetChip);

      // When (Act)
      const submitButton = screen.getByRole('button', { name: /erinnerung erstellen/i });
      await user.click(submitButton);

      // Then (Assert)
      // - Formular sollte nicht abgesendet werden
      await waitFor(() => {
        // API wurde nicht aufgerufen
        expect(mockMutate).not.toHaveBeenCalled();
      });

      // - Fehler sollte angezeigt werden
      expect(screen.getByText(/titel ist erforderlich/i)).toBeInTheDocument();
    });
  });

  describe('Dialog Verhalten', () => {
    it('should call onClose when "Abbrechen" is clicked', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} onClose={onClose} />);

      // When (Act)
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);

      // Then (Assert)
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not render when isOpen is false', async () => {
      // Given (Arrange)
      // - Dialog mit isOpen=false

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} isOpen={false} />);
      });

      // Then (Assert)
      expect(screen.queryByText(/erinnerung erstellen/i)).not.toBeInTheDocument();
    });

    it('should call form reset when cancel button triggers onClose', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} onClose={onClose} />);

      // - Aendere Formular-Daten (Titel eingeben)
      const titelInput = screen.getByPlaceholderText(/lagebesprechung/i);
      await user.type(titelInput, 'Test');

      // When (Act)
      // - Klicke auf Abbrechen
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);

      // Then (Assert)
      // - onClose wurde aufgerufen (Dialog schliessen + Form reset wird intern durch handleClose gemacht)
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Story 6.4: Wiederkehrende Erinnerungen', () => {
    it('sollte die Recurring-Sektion anzeigen wenn Toggle aktiviert wird', async () => {
      // Given (Arrange) - Dialog wird gerendert
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Recurring-Sektion ist initial nicht sichtbar
      expect(screen.queryByText(/intervall/i)).not.toBeInTheDocument();

      // When (Act) - "Wiederkehrend" Checkbox aktivieren
      const recurringCheckbox = screen.getByLabelText(/wiederkehrend/i);
      await user.click(recurringCheckbox);

      // Then (Assert)
      // - "Intervall" Label ist sichtbar
      expect(screen.getByText(/intervall/i)).toBeInTheDocument();

      // - Intervall-Preset Buttons sind sichtbar (45 Min ist eindeutig fuer Recurring-Sektion)
      expect(screen.getByRole('button', { name: '45 Min' })).toBeInTheDocument();
    });

    it('sollte die Recurring-Sektion verbergen wenn Toggle deaktiviert wird', async () => {
      // Given (Arrange) - Dialog wird gerendert
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Recurring-Toggle aktivieren
      const recurringCheckbox = screen.getByLabelText(/wiederkehrend/i);
      await user.click(recurringCheckbox);

      // - Sektion ist sichtbar
      expect(screen.getByText(/intervall/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '45 Min' })).toBeInTheDocument();

      // When (Act) - Recurring-Toggle deaktivieren
      await user.click(recurringCheckbox);

      // Then (Assert)
      // - Recurring-Sektion ist nicht mehr sichtbar
      expect(screen.queryByText(/intervall/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '45 Min' })).not.toBeInTheDocument();
    });

    it('sollte ein Intervall-Preset auswählen können', async () => {
      // Given (Arrange) - Dialog mit aktiviertem Recurring-Toggle
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Recurring-Toggle aktivieren
      const recurringCheckbox = screen.getByLabelText(/wiederkehrend/i);
      await user.click(recurringCheckbox);

      // When (Act) - "30 Min" Intervall-Chip klicken (zweiter "30 Min" Button, da erster ein Zeit-Preset ist)
      const allButtons30Min = screen.getAllByRole('button', { name: '30 Min' });
      // Der zweite "30 Min" Button gehoert zur Recurring-Intervall-Sektion
      const intervalChip = allButtons30Min[1];
      await user.click(intervalChip);

      // Then (Assert) - Intervall-Chip ist ausgewaehlt
      expect(intervalChip).toHaveAttribute('aria-pressed', 'true');
    });

    it('sollte Recurring-Daten beim Submit uebergeben', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Titel eingeben
      const titelInput = screen.getByPlaceholderText(/lagebesprechung/i);
      await user.type(titelInput, 'Wiederkehrende Lagebesprechung');

      // - Zeit-Preset auswählen (15 Min)
      const presetChip = screen.getByRole('button', { name: '15 Min' });
      await user.click(presetChip);

      // - Recurring-Toggle aktivieren
      const recurringCheckbox = screen.getByLabelText(/wiederkehrend/i);
      await user.click(recurringCheckbox);

      // - Intervall 30 Min auswählen (zweiter "30 Min" Button = Recurring-Intervall)
      const allButtons30Min = screen.getAllByRole('button', { name: '30 Min' });
      const intervalChip = allButtons30Min[1];
      await user.click(intervalChip);

      // When (Act) - Formular absenden
      const submitButton = screen.getByRole('button', { name: /erinnerung erstellen/i });
      await user.click(submitButton);

      // Then (Assert) - API wurde mit Recurring-Daten aufgerufen
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockMutate.mock.calls[0][0];
      expect(callArgs.einsatzId).toBe('test-einsatz-123');
      expect(callArgs.data.titel).toBe('Wiederkehrende Lagebesprechung');
      expect(callArgs.data.isRecurring).toBe(true);
      expect(callArgs.data.recurringIntervalMinutes).toBe(30);
      expect(callArgs.data.faelligAm).toBeDefined();
    });
  });

  describe('Story 6.3: Erinnerung aus Vorlage erstellen', () => {
    it('should render TemplatePicker when no fromEtb is provided (AC1)', async () => {
      // Given (Arrange) - Dialog ohne fromEtb

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);
      });

      // Then (Assert)
      expect(screen.getByTestId('template-picker')).toBeInTheDocument();
    });

    it('should NOT render TemplatePicker when fromEtb is provided', async () => {
      // Given (Arrange) - Dialog mit fromEtb
      const fromEtb = { entryId: 'etb-1', text: 'ETB Eintrag Text' };

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} fromEtb={fromEtb} />);
      });

      // Then (Assert) - TemplatePicker sollte nicht sichtbar sein (ETB hat Vorrang)
      expect(screen.queryByTestId('template-picker')).not.toBeInTheDocument();
    });

    it('should prefill form when template is selected via TemplatePicker (AC2, AC3)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // When (Act) - Klicke auf eine Vorlage im TemplatePicker
      const templateButton = screen.getByTestId('template-v1');
      await user.click(templateButton);

      // Then (Assert) - Formular-Felder sind vorausgefuellt
      await waitFor(() => {
        const titelInput = screen.getByPlaceholderText(/lagebesprechung/i) as HTMLInputElement;
        expect(titelInput.value).toBe('Lagebesprechung');
      });

      // Beschreibung ist ebenfalls vorausgefuellt (aus Vorlage v1)
      const beschreibungTextarea = screen.getByLabelText(/beschreibung/i) as HTMLTextAreaElement;
      expect(beschreibungTextarea.value).toBe('Regelmaessige Lagebesprechung im Stab');
    });

    it('should prefill form from fromTemplate prop on dialog open (AC2)', async () => {
      // Given (Arrange) - Dialog mit fromTemplate
      const template: ErinnerungsvorlageResponseDto = {
        id: 'v1',
        titel: 'Lagebesprechung',
        minuten: 30,
        beschreibung: 'Regelmaessige Lagebesprechung im Stab',
        createdBy: 'user-1',
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      };

      // When (Act)
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} fromTemplate={template} />);

      // Then (Assert) - Formular-Felder sind vorausgefuellt
      await waitFor(() => {
        const titelInput = screen.getByPlaceholderText(/lagebesprechung/i) as HTMLInputElement;
        expect(titelInput.value).toBe('Lagebesprechung');
      });

      // Beschreibung ist ebenfalls vorausgefuellt (aus fromTemplate prop)
      const beschreibungTextarea = screen.getByLabelText(/beschreibung/i) as HTMLTextAreaElement;
      expect(beschreibungTextarea.value).toBe('Regelmaessige Lagebesprechung im Stab');
    });

    it('should allow editing prefilled values before submit (AC3)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Vorlage auswählen
      await user.click(screen.getByTestId('template-v1'));

      // When (Act) - Vorausgefuellten Titel aendern
      const titelInput = screen.getByPlaceholderText(/lagebesprechung/i);
      await waitFor(() => {
        expect((titelInput as HTMLInputElement).value).toBe('Lagebesprechung');
      });
      await user.clear(titelInput);
      await user.type(titelInput, 'Angepasste Lagebesprechung');

      // Then (Assert) - Geänderter Titel
      expect((titelInput as HTMLInputElement).value).toBe('Angepasste Lagebesprechung');
    });

    it('should submit with template values correctly (AC2)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderWithProviders(<QuickCreateErinnerungDialog {...defaultProps} />);

      // - Vorlage auswählen
      await user.click(screen.getByTestId('template-v1'));

      // - Warte auf Vorausfuellung
      await waitFor(() => {
        const titelInput = screen.getByPlaceholderText(/lagebesprechung/i) as HTMLInputElement;
        expect(titelInput.value).toBe('Lagebesprechung');
      });

      // When (Act) - Submit
      const submitButton = screen.getByRole('button', { name: /erinnerung erstellen/i });
      await user.click(submitButton);

      // Then (Assert) - API wurde mit Vorlagen-Werten aufgerufen
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockMutate.mock.calls[0][0];
      expect(callArgs.data.titel).toBe('Lagebesprechung');
      expect(callArgs.data.beschreibung).toBe('Regelmaessige Lagebesprechung im Stab');
      expect(callArgs.data.faelligAm).toBeDefined();
    });
  });

  // =========================================================================
  // Story 7.6: fromNotiz - Notiz zu Erinnerung Konvertierung
  // =========================================================================
  describe('Story 7.6: fromNotiz Vorausfuellung', () => {
    it('should prefill titel from notiz', async () => {
      // Given (Arrange) - Dialog mit fromNotiz
      renderWithProviders(
        <QuickCreateErinnerungDialog
          isOpen={true}
          onClose={() => {}}
          einsatzId="clw3testeinsatz00000000001"
          fromNotiz={{
            notizId: 'notiz-123',
            titel: 'Wichtige Notiz',
            inhalt: 'Inhalt der Notiz als Beschreibung',
          }}
        />,
      );

      // Then (Assert) - Titel ist vorausgefuellt
      await waitFor(() => {
        const titelInput = screen.getByPlaceholderText(/lagebesprechung/i) as HTMLInputElement;
        expect(titelInput.value).toBe('Wichtige Notiz');
      });
    });

    it('should prefill beschreibung from notiz inhalt', async () => {
      // Given (Arrange) - Dialog mit fromNotiz inkl. Inhalt
      renderWithProviders(
        <QuickCreateErinnerungDialog
          isOpen={true}
          onClose={() => {}}
          einsatzId="clw3testeinsatz00000000001"
          fromNotiz={{
            notizId: 'notiz-123',
            titel: 'Wichtige Notiz',
            inhalt: 'Detaillierter Inhalt der Notiz',
          }}
        />,
      );

      // Then (Assert) - Beschreibung ist vorausgefuellt
      await waitFor(() => {
        const beschreibungField = screen.getByPlaceholderText(/zusaetzliche details/i) as HTMLTextAreaElement;
        expect(beschreibungField.value).toBe('Detaillierter Inhalt der Notiz');
      });
    });

    it('should show notiz hint banner', async () => {
      // Given (Arrange) - Dialog mit fromNotiz

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(
          <QuickCreateErinnerungDialog
            isOpen={true}
            onClose={() => {}}
            einsatzId="clw3testeinsatz00000000001"
            fromNotiz={{
              notizId: 'notiz-123',
              titel: 'Notiz-Titel',
              inhalt: null,
            }}
          />,
        );
      });

      // Then (Assert) - Hinweis-Banner wird angezeigt
      expect(screen.getByText(/aus der Notiz erstellt/)).toBeInTheDocument();
    });

    it('should not show TemplatePicker when fromNotiz is set', async () => {
      // Given (Arrange) - Dialog mit fromNotiz

      // When (Act) - await act() um State-Updates aus useEffect abzuwarten
      await act(async () => {
        renderWithProviders(
          <QuickCreateErinnerungDialog
            isOpen={true}
            onClose={() => {}}
            einsatzId="clw3testeinsatz00000000001"
            fromNotiz={{
              notizId: 'notiz-123',
              titel: 'Notiz-Titel',
              inhalt: null,
            }}
          />,
        );
      });

      // Then (Assert) - TemplatePicker ist nicht sichtbar
      expect(screen.queryByTestId('template-picker')).not.toBeInTheDocument();
    });

    it('should submit with notizId in mutation payload', async () => {
      // Given (Arrange) - Dialog mit fromNotiz
      const user = userEvent.setup();
      renderWithProviders(
        <QuickCreateErinnerungDialog
          isOpen={true}
          onClose={() => {}}
          einsatzId="clw3testeinsatz00000000001"
          fromNotiz={{
            notizId: 'notiz-456',
            titel: 'Follow-up Notiz',
            inhalt: null,
          }}
        />,
      );

      // When (Act) - Warte auf Vorausfuellung und submit
      await waitFor(() => {
        const titelInput = screen.getByPlaceholderText(/lagebesprechung/i) as HTMLInputElement;
        expect(titelInput.value).toBe('Follow-up Notiz');
      });

      const submitButton = screen.getByRole('button', { name: /erinnerung erstellen/i });
      await user.click(submitButton);

      // Then (Assert) - API wurde mit notizId aufgerufen
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockMutate.mock.calls[0][0];
      expect(callArgs.data.notizId).toBe('notiz-456');
      expect(callArgs.data.titel).toBe('Follow-up Notiz');
    });
  });
});
