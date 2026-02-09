import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FuehrungsrhythmusTemplateCard } from '../FuehrungsrhythmusTemplateCard';

const mockEintraege = [
  { id: 'e1', titel: 'Lagebeurteilung', intervallMinuten: 30, offsetMinuten: 0, sortOrder: 0 },
  { id: 'e2', titel: 'Rueckmeldungen pruefen', intervallMinuten: 30, offsetMinuten: 5, sortOrder: 1 },
  { id: 'e3', titel: 'Ressourcen checken', intervallMinuten: 30, offsetMinuten: 10, sortOrder: 2 },
];

describe('FuehrungsrhythmusTemplateCard', () => {
  // --- AC2: Template in Liste anzeigen ---
  describe('Anzeige (Story 6.6 AC2)', () => {
    it('should display template name', () => {
      // Given ein Template mit Name
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Fuehrungsrhythmus 30min" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);

      // Then wird der Name angezeigt
      expect(screen.getByText('Fuehrungsrhythmus 30min')).toBeInTheDocument();
    });

    it('should display beschreibung when present', () => {
      // Given ein Template mit Beschreibung
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung="Standard-Rhythmus" eintraege={mockEintraege} einsatzId={null} />);

      // Then wird die Beschreibung angezeigt
      expect(screen.getByText('Standard-Rhythmus')).toBeInTheDocument();
    });

    it('should not display beschreibung when null', () => {
      // Given ein Template ohne Beschreibung
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);

      // Then ist keine Beschreibung sichtbar
      expect(screen.queryByText('Standard-Rhythmus')).not.toBeInTheDocument();
    });

    it('should display eintraege count badge', () => {
      // Given ein Template mit 3 Eintraegen
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);

      // Then wird die Anzahl angezeigt
      expect(screen.getByText('3 Erinnerungen')).toBeInTheDocument();
    });

    it('should display singular "Erinnerung" for single entry', () => {
      // Given ein Template mit 1 Eintrag
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={[mockEintraege[0]!]} einsatzId={null} />);

      // Then wird der Singular angezeigt
      expect(screen.getByText('1 Erinnerung')).toBeInTheDocument();
    });
  });

  // --- AC2: Aufklappen ---
  describe('Aufklappen (Story 6.6 AC2)', () => {
    it('should not show eintraege details initially', () => {
      // Given ein Template
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);

      // Then sind die Eintrag-Details NICHT sichtbar
      expect(screen.queryByText('Lagebeurteilung')).not.toBeInTheDocument();
    });

    it('should show eintraege details after clicking', async () => {
      // Given ein Template
      const user = userEvent.setup();
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);

      // When der Benutzer auf die Card klickt
      await user.click(screen.getByRole('button', { expanded: false }));

      // Then werden alle Eintraege angezeigt
      expect(screen.getByText('Lagebeurteilung')).toBeInTheDocument();
      expect(screen.getByText('Rueckmeldungen pruefen')).toBeInTheDocument();
      expect(screen.getByText('Ressourcen checken')).toBeInTheDocument();
    });

    it('should display intervall for each eintrag', async () => {
      // Given ein aufgeklapptes Template
      const user = userEvent.setup();
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);
      await user.click(screen.getByRole('button', { expanded: false }));

      // Then werden die Intervalle angezeigt
      const intervallTexts = screen.getAllByText('alle 30 Min');
      expect(intervallTexts).toHaveLength(3);
    });

    it('should display offset only when > 0', async () => {
      // Given ein aufgeklapptes Template
      const user = userEvent.setup();
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);
      await user.click(screen.getByRole('button', { expanded: false }));

      // Then werden nur Offsets > 0 angezeigt
      expect(screen.getByText('+5 Min Offset')).toBeInTheDocument();
      expect(screen.getByText('+10 Min Offset')).toBeInTheDocument();
      // Offset 0 wird NICHT angezeigt
      expect(screen.queryByText('+0 Min Offset')).not.toBeInTheDocument();
    });
  });

  // --- Story 6.8: Scope Badge ---
  describe('Scope Badge (Story 6.8 AC6)', () => {
    it('should display "Global" badge for GLOBAL scope', () => {
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} scope="GLOBAL" />);
      expect(screen.getByText('Global')).toBeInTheDocument();
    });

    it('should display "Einsatz" badge for EINSATZ scope', () => {
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} scope="EINSATZ" />);
      expect(screen.getByText('Einsatz')).toBeInTheDocument();
    });

    it('should not display scope badge when scope is undefined', () => {
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);
      expect(screen.queryByText('Global')).not.toBeInTheDocument();
      expect(screen.queryByText('Einsatz')).not.toBeInTheDocument();
    });
  });

  // --- Story 6.7: Aktivieren-Button ---
  describe('Aktivieren-Button (Story 6.7 AC1)', () => {
    it('should disable activate button when einsatzId is null', async () => {
      // Given ein aufgeklapptes Template ohne einsatzId
      const user = userEvent.setup();
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId={null} />);
      await user.click(screen.getByRole('button', { expanded: false }));

      // Then ist der Aktivieren-Button deaktiviert
      expect(screen.getByRole('button', { name: /aktivieren/i })).toBeDisabled();
    });

    it('should enable activate button when einsatzId is provided', async () => {
      // Given ein aufgeklapptes Template mit einsatzId
      const user = userEvent.setup();
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId="einsatz-123" />);
      await user.click(screen.getByRole('button', { expanded: false }));

      // Then ist der Aktivieren-Button aktiv
      expect(screen.getByRole('button', { name: /aktivieren/i })).toBeEnabled();
    });

    it('should call onActivate with template id when clicked', async () => {
      // Given ein aufgeklapptes Template mit einsatzId und onActivate callback
      const user = userEvent.setup();
      const onActivate = vi.fn();
      render(<FuehrungsrhythmusTemplateCard id="t1" name="Test" beschreibung={null} eintraege={mockEintraege} einsatzId="einsatz-123" onActivate={onActivate} />);
      await user.click(screen.getByRole('button', { expanded: false }));

      // When der Benutzer auf Aktivieren klickt
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));

      // Then wird onActivate mit der templateId aufgerufen
      expect(onActivate).toHaveBeenCalledWith('t1');
    });
  });
});
