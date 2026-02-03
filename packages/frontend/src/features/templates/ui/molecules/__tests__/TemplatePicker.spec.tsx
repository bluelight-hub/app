/**
 * Unit Tests fuer TemplatePicker Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 6.3 AC1:** Vorlage-Auswahl im Quick-Create
 * **Story 6.3 AC4:** Leere Vorlagen-Liste
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { TemplatePicker } from '../TemplatePicker';
import type { ErinnerungsvorlageResponseDto } from '@/shared';

// Mock TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

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
    titel: 'Rueckmeldung pruefen',
    minuten: 15,
    beschreibung: null,
    createdBy: 'user-1',
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
  },
  {
    id: 'v3',
    titel: 'Ressourcen-Check',
    minuten: 60,
    beschreibung: 'Alle verfuegbaren Ressourcen ueberpruefen',
    createdBy: 'user-1',
    createdAt: '2026-01-20T12:00:00Z',
    updatedAt: '2026-01-20T12:00:00Z',
  },
];

describe('TemplatePicker', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPicker = (overrides?: Partial<React.ComponentProps<typeof TemplatePicker>>) => {
    return renderWithProviders(<TemplatePicker vorlagen={mockVorlagen} isLoading={false} onSelect={mockOnSelect} {...overrides} />);
  };

  describe('Rendering (Story 6.3 AC1)', () => {
    it('sollte den "Aus Vorlage" Button rendern', () => {
      // Given (Arrange) - Picker mit Vorlagen

      // When (Act)
      renderPicker();

      // Then (Assert)
      expect(screen.getByRole('button', { name: /aus vorlage/i })).toBeInTheDocument();
    });

    it('sollte Vorlagen-Liste im Dropdown anzeigen nach Klick', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderPicker();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /aus vorlage/i }));

      // Then (Assert) - Alle Vorlagen mit Titel und Minuten sichtbar
      await waitFor(() => {
        expect(screen.getByText('Lagebesprechung')).toBeInTheDocument();
        expect(screen.getByText('Rueckmeldung pruefen')).toBeInTheDocument();
        expect(screen.getByText('Ressourcen-Check')).toBeInTheDocument();
      });
      expect(screen.getByText('30 Min')).toBeInTheDocument();
      expect(screen.getByText('15 Min')).toBeInTheDocument();
      expect(screen.getByText('60 Min')).toBeInTheDocument();
    });

    it('sollte Beschreibung anzeigen wenn vorhanden', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderPicker();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /aus vorlage/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText('Regelmaessige Lagebesprechung im Stab')).toBeInTheDocument();
      });
    });
  });

  describe('Vorlage-Auswahl (Story 6.3 AC2)', () => {
    it('sollte onSelect mit korrekter Vorlage aufrufen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderPicker();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /aus vorlage/i }));
      await waitFor(() => {
        expect(screen.getByText('Lagebesprechung')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Lagebesprechung'));

      // Then (Assert)
      expect(mockOnSelect).toHaveBeenCalledOnce();
      expect(mockOnSelect).toHaveBeenCalledWith(mockVorlagen[0]);
    });
  });

  describe('Leere Vorlagen-Liste (Story 6.3 AC4)', () => {
    it('sollte Hinweis "Keine Vorlagen vorhanden" anzeigen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderPicker({ vorlagen: [] });

      // When (Act)
      await user.click(screen.getByRole('button', { name: /aus vorlage/i }));

      // Then (Assert)
      await waitFor(() => {
        expect(screen.getByText('Keine Vorlagen vorhanden')).toBeInTheDocument();
      });
    });

    it('sollte Link zum Vorlagen-Manager anzeigen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderPicker({ vorlagen: [] });

      // When (Act)
      await user.click(screen.getByRole('button', { name: /aus vorlage/i }));

      // Then (Assert)
      await waitFor(() => {
        const link = screen.getByText(/vorlagen erstellen/i);
        expect(link).toBeInTheDocument();
        expect(link.closest('a')).toHaveAttribute('href', '/admin/erinnerungen');
      });
    });
  });

  describe('Loading State', () => {
    it('sollte Button deaktivieren waehrend Loading', () => {
      // Given (Arrange)
      renderPicker({ isLoading: true });

      // When (Act) - nichts, pruefe Initial State

      // Then (Assert)
      expect(screen.getByRole('button', { name: /aus vorlage/i })).toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    it('sollte Button deaktivieren wenn disabled=true', () => {
      // Given (Arrange)
      renderPicker({ disabled: true });

      // When (Act) - nichts

      // Then (Assert)
      expect(screen.getByRole('button', { name: /aus vorlage/i })).toBeDisabled();
    });
  });
});
