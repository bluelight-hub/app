import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotizCard } from '../NotizCard';

const now = new Date().toISOString();
const defaultProps = {
  id: 'notiz-1',
  titel: 'Lagebericht',
  inhalt: '3 Verletzte, RTW angefordert',
  kategorieName: 'Lage',
  kategorieFarbe: '#3B82F6',
  erstelltVon: 'user-1',
  createdAt: now,
  updatedAt: now,
};

describe('NotizCard', () => {
  // --- Anzeige (Story 7.1) ---
  describe('Anzeige', () => {
    it('should render titel', () => {
      // Given eine Notiz mit Titel
      render(<NotizCard {...defaultProps} />);

      // Then wird der Titel angezeigt
      expect(screen.getByText('Lagebericht')).toBeInTheDocument();
    });

    it('should render kategorie badge when present', () => {
      // Given eine Notiz mit Kategorie
      render(<NotizCard {...defaultProps} kategorieName="Lage" kategorieFarbe="#3B82F6" />);

      // Then wird der Kategorie-Badge angezeigt
      expect(screen.getByText('Lage')).toBeInTheDocument();
    });

    it('should not render kategorie badge when kategorieName is null', () => {
      // Given eine Notiz ohne Kategorie
      render(<NotizCard {...defaultProps} kategorieName={null} kategorieFarbe={null} />);

      // Then ist kein Kategorie-Badge sichtbar
      expect(screen.queryByText('Lage')).not.toBeInTheDocument();
    });

    it('should not render kategorie badge when kategorieFarbe is null', () => {
      // Given eine Notiz mit Name aber ohne Farbe
      render(<NotizCard {...defaultProps} kategorieName="Lage" kategorieFarbe={null} />);

      // Then ist kein Kategorie-Badge sichtbar (beide Props erforderlich)
      expect(screen.queryByText('Lage')).not.toBeInTheDocument();
    });

    it('should render inhalt when present', () => {
      // Given eine Notiz mit Inhalt
      render(<NotizCard {...defaultProps} inhalt="3 Verletzte, RTW angefordert" />);

      // Then wird der Inhalt angezeigt
      expect(screen.getByText('3 Verletzte, RTW angefordert')).toBeInTheDocument();
    });

    it('should not render inhalt when null', () => {
      // Given eine Notiz ohne Inhalt
      render(<NotizCard {...defaultProps} inhalt={null} />);

      // Then ist kein Inhalt-Paragraph sichtbar
      expect(screen.queryByText('3 Verletzte, RTW angefordert')).not.toBeInTheDocument();
    });
  });

  // --- Zeitanzeige ---
  describe('Zeitanzeige', () => {
    it('should render relative time', () => {
      // Given eine Notiz mit aktuellem Zeitstempel
      const ts = new Date().toISOString();
      render(<NotizCard {...defaultProps} createdAt={ts} updatedAt={ts} />);

      // Then wird ein time-Element gerendert
      expect(screen.getByRole('time')).toBeInTheDocument();
    });

    it('should set dateTime attribute on time element', () => {
      // Given eine Notiz mit einem bestimmten Zeitstempel
      const isoString = '2026-01-15T10:30:00.000Z';
      render(<NotizCard {...defaultProps} createdAt={isoString} updatedAt={isoString} />);

      // Then hat das time-Element das korrekte dateTime-Attribut
      const timeElement = screen.getByRole('time');
      expect(timeElement).toHaveAttribute('dateTime', isoString);
    });
  });

  // --- Edit-Button (Story 7.3) ---
  describe('Edit-Button', () => {
    it('should render edit button when onEdit is provided', () => {
      // Given eine Notiz mit onEdit-Callback
      render(<NotizCard {...defaultProps} onEdit={() => {}} />);

      // Then wird der Edit-Button angezeigt
      expect(screen.getByRole('button', { name: /Notiz bearbeiten/ })).toBeInTheDocument();
    });

    it('should not render edit button when onEdit is not provided', () => {
      // Given eine Notiz ohne onEdit-Callback
      render(<NotizCard {...defaultProps} />);

      // Then ist kein Edit-Button sichtbar
      expect(screen.queryByRole('button', { name: /Notiz bearbeiten/ })).not.toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      // Given eine Notiz mit onEdit-Callback
      const onEdit = vi.fn();
      const user = userEvent.setup();
      render(<NotizCard {...defaultProps} onEdit={onEdit} />);

      // When der Edit-Button geklickt wird
      await user.click(screen.getByRole('button', { name: /Notiz bearbeiten/ }));

      // Then wird onEdit aufgerufen
      expect(onEdit).toHaveBeenCalledOnce();
    });
  });

  // --- Delete-Button (Story 7.4) ---
  describe('Delete-Button', () => {
    it('should render delete button when onDelete is provided', () => {
      // Given eine Notiz mit onDelete-Callback
      render(<NotizCard {...defaultProps} onDelete={() => {}} />);

      // Then wird der Delete-Button angezeigt
      expect(screen.getByRole('button', { name: /Notiz löschen/ })).toBeInTheDocument();
    });

    it('should not render delete button when onDelete is not provided', () => {
      // Given eine Notiz ohne onDelete-Callback
      render(<NotizCard {...defaultProps} />);

      // Then ist kein Delete-Button sichtbar
      expect(screen.queryByRole('button', { name: /Notiz löschen/ })).not.toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      // Given eine Notiz mit onDelete-Callback
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(<NotizCard {...defaultProps} onDelete={onDelete} />);

      // When der Delete-Button geklickt wird
      await user.click(screen.getByRole('button', { name: /Notiz löschen/ }));

      // Then wird onDelete aufgerufen
      expect(onDelete).toHaveBeenCalledOnce();
    });
  });

  // --- Convert-to-Erinnerung Button (Story 7.6 AC1) ---
  describe('Convert-to-Erinnerung Button', () => {
    it('should render convert button when onConvertToErinnerung is provided', () => {
      // Given eine Notiz mit onConvertToErinnerung-Callback
      render(<NotizCard {...defaultProps} onConvertToErinnerung={() => {}} />);

      // Then wird der Convert-Button angezeigt
      expect(screen.getByRole('button', { name: /Zu Erinnerung umwandeln/ })).toBeInTheDocument();
    });

    it('should not render convert button when onConvertToErinnerung is not provided', () => {
      // Given eine Notiz ohne onConvertToErinnerung-Callback
      render(<NotizCard {...defaultProps} />);

      // Then ist kein Convert-Button sichtbar
      expect(screen.queryByRole('button', { name: /Zu Erinnerung umwandeln/ })).not.toBeInTheDocument();
    });

    it('should call onConvertToErinnerung when convert button is clicked', async () => {
      // Given eine Notiz mit onConvertToErinnerung-Callback
      const onConvertToErinnerung = vi.fn();
      const user = userEvent.setup();
      render(<NotizCard {...defaultProps} onConvertToErinnerung={onConvertToErinnerung} />);

      // When der Convert-Button geklickt wird
      await user.click(screen.getByRole('button', { name: /Zu Erinnerung umwandeln/ }));

      // Then wird onConvertToErinnerung aufgerufen
      expect(onConvertToErinnerung).toHaveBeenCalledOnce();
    });
  });

  // --- Typ-Badge (Story 7.5 AC3) ---
  describe('ItemTypeBadge', () => {
    it('should render "Notiz" type badge', () => {
      // Given eine NotizCard
      render(<NotizCard {...defaultProps} />);

      // Then wird der Typ-Badge "Notiz" angezeigt
      expect(screen.getByText('Notiz')).toBeInTheDocument();
    });
  });

  // --- Team-Sichtbarkeit (Story 7.7) ---
  describe('Team-Sichtbarkeit (Story 7.7)', () => {
    it('should render team icon when istTeamsichtbar is true', () => {
      // Given eine teamsichtbare Notiz
      render(<NotizCard {...defaultProps} istTeamsichtbar={true} />);

      // Then wird das Team-Icon angezeigt
      expect(screen.getByText('Team')).toBeInTheDocument();
    });

    it('should NOT render team icon when istTeamsichtbar is false', () => {
      // Given eine private Notiz
      render(<NotizCard {...defaultProps} istTeamsichtbar={false} />);

      // Then ist kein Team-Icon sichtbar
      expect(screen.queryByText('Team')).not.toBeInTheDocument();
    });

    it('should render creator name for team notes', () => {
      // Given eine teamsichtbare Notiz mit Ersteller-Name
      render(<NotizCard {...defaultProps} istTeamsichtbar={true} erstelltVonName="Max Mustermann" />);

      // Then wird der Ersteller-Name angezeigt
      expect(screen.getByText('von Max Mustermann')).toBeInTheDocument();
    });

    it('should NOT render edit button when isOwner is false', () => {
      // Given eine Notiz, bei der der Benutzer nicht der Eigentümer ist
      render(<NotizCard {...defaultProps} isOwner={false} onEdit={() => {}} />);

      // Then ist kein Edit-Button sichtbar
      expect(screen.queryByRole('button', { name: /Notiz bearbeiten/ })).not.toBeInTheDocument();
    });

    it('should NOT render delete button when isOwner is false', () => {
      // Given eine Notiz, bei der der Benutzer nicht der Eigentümer ist
      render(<NotizCard {...defaultProps} isOwner={false} onDelete={() => {}} />);

      // Then ist kein Delete-Button sichtbar
      expect(screen.queryByRole('button', { name: /Notiz löschen/ })).not.toBeInTheDocument();
    });

    it('should ALWAYS render convert-to-erinnerung button even when isOwner is false', () => {
      // Given eine fremde Notiz mit onConvertToErinnerung-Callback
      render(<NotizCard {...defaultProps} isOwner={false} onConvertToErinnerung={() => {}} />);

      // Then wird der Convert-Button trotzdem angezeigt
      expect(screen.getByRole('button', { name: /Zu Erinnerung umwandeln/ })).toBeInTheDocument();
    });
  });

  // --- Highlight-Suche (Story 7.8) ---
  describe('Highlight-Suche (Story 7.8)', () => {
    it('should highlight matching text in titel when searchQuery is provided', () => {
      // Given eine Notiz mit searchQuery
      render(<NotizCard {...defaultProps} titel="Material bestellt" searchQuery="Material" />);

      // Then wird der Treffer hervorgehoben
      const marks = document.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveTextContent('Material');
    });

    it('should highlight matching text in inhalt when searchQuery is provided', () => {
      // Given eine Notiz mit Inhalt und searchQuery
      render(<NotizCard {...defaultProps} inhalt="RTW wurde angefordert" searchQuery="RTW" />);

      // Then wird der Treffer im Inhalt hervorgehoben
      const marks = document.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveTextContent('RTW');
    });

    it('should not crash when inhalt is null and searchQuery is provided', () => {
      // Given eine Notiz ohne Inhalt aber mit searchQuery
      render(<NotizCard {...defaultProps} inhalt={null} searchQuery="RTW" />);

      // Then wird der Titel gerendert und kein Fehler geworfen
      expect(screen.getByText('Lagebericht')).toBeInTheDocument();
      // Kein Inhalt-Paragraph vorhanden
      expect(screen.queryByText('3 Verletzte, RTW angefordert')).not.toBeInTheDocument();
    });

    it('should render titel without highlighting when no searchQuery is provided', () => {
      // Given eine Notiz ohne searchQuery
      render(<NotizCard {...defaultProps} titel="Lagebericht" />);

      // Then wird der Titel ohne mark-Element gerendert
      expect(screen.getByText('Lagebericht')).toBeInTheDocument();
      const marks = document.querySelectorAll('mark');
      expect(marks).toHaveLength(0);
    });
  });
});
