/**
 * Tests fuer WeitergabeStatusListe Molecule
 *
 * Story 4.3 Task 6.2: Weitergabestatus-Liste
 *
 * Verifiziert:
 * - Alle 4 Status-Badges korrekt gerendert (VERSTANDEN, RUECKFRAGE, NICHT_VERSTANDEN, AUSSTEHEND)
 * - Leerzustand bei fehlenden Empfaengern
 * - Zugaenglichkeit: Farbunabhaengige Status-Kommunikation (Icons + Text-Labels)
 * - Handlungsbedarf-Markierung bei RUECKFRAGE und NICHT_VERSTANDEN
 * - Scrollbar bei > 5 Empfaengern
 * - Zeitstempel-Anzeige (Zugestellt, Quittiert)
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { WeitergabeStatusListe } from '../WeitergabeStatusListe.molecule';
import type { BefehlEmpfaengerDto } from '@bluelight-hub/shared/client';

function createTestEmpfaenger(overrides: Partial<BefehlEmpfaengerDto> = {}): BefehlEmpfaengerDto {
  return {
    id: 'emp-1',
    name: 'ZF Nord',
    empfaengerId: 'user-1',
    zugestelltAm: new Date('2026-03-23T10:00:00'),
    quittiertAm: undefined,
    quittierungArt: undefined,
    quittierungKommentar: undefined,
    istQuittierbar: true,
    ...overrides,
  };
}

describe('WeitergabeStatusListe (Story 4.3 Task 6.2)', () => {
  describe('Status-Badges', () => {
    it('zeigt VERSTANDEN Badge mit korrektem Label', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-v',
          name: 'ZF Nord',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText('Verstanden')).toBeInTheDocument();
      expect(screen.getByText('ZF Nord')).toBeInTheDocument();
    });

    it('zeigt RUECKFRAGE Badge mit korrektem Label', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-r',
          name: 'ZF Sued',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'RUECKFRAGE',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText('Rückfrage')).toBeInTheDocument();
      expect(screen.getByText('ZF Sued')).toBeInTheDocument();
    });

    it('zeigt NICHT_VERSTANDEN Badge mit korrektem Label', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-nv',
          name: 'ZF West',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText('Nicht verstanden')).toBeInTheDocument();
      expect(screen.getByText('ZF West')).toBeInTheDocument();
    });

    it('zeigt AUSSTEHEND Badge wenn keine Quittierung vorliegt', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-a',
          name: 'ZF Ost',
          quittiertAm: undefined,
          quittierungArt: undefined,
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
      expect(screen.getByText('ZF Ost')).toBeInTheDocument();
    });

    it('zeigt alle 4 Status-Typen gleichzeitig in einer Liste', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'Empf Verstanden',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
        createTestEmpfaenger({
          id: 'emp-2',
          name: 'Empf Rueckfrage',
          quittiertAm: new Date('2026-03-23T10:06:00'),
          quittierungArt: 'RUECKFRAGE',
        }),
        createTestEmpfaenger({
          id: 'emp-3',
          name: 'Empf NichtVerstanden',
          quittiertAm: new Date('2026-03-23T10:07:00'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
        createTestEmpfaenger({
          id: 'emp-4',
          name: 'Empf Ausstehend',
          quittiertAm: undefined,
          quittierungArt: undefined,
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText('Verstanden')).toBeInTheDocument();
      expect(screen.getByText('Rückfrage')).toBeInTheDocument();
      expect(screen.getByText('Nicht verstanden')).toBeInTheDocument();
      expect(screen.getByText('Ausstehend')).toBeInTheDocument();
    });
  });

  describe('Leerzustand', () => {
    it('zeigt "Keine Empfänger" bei leerer Empfaenger-Liste', () => {
      renderWithProviders(<WeitergabeStatusListe empfaenger={[]} />);

      expect(screen.getByText('Keine Empfänger')).toBeInTheDocument();
    });

    it('rendert keine role="list" bei leerem Zustand', () => {
      renderWithProviders(<WeitergabeStatusListe empfaenger={[]} />);

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('Handlungsbedarf', () => {
    it('zeigt "Rückfrage offen" bei RUECKFRAGE wenn showHandlungsbedarf aktiv', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-r',
          name: 'ZF Sued',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'RUECKFRAGE',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} showHandlungsbedarf />);

      expect(screen.getByText('Rückfrage offen')).toBeInTheDocument();
    });

    it('zeigt "Handlungsbedarf" bei NICHT_VERSTANDEN wenn showHandlungsbedarf aktiv', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-nv',
          name: 'ZF West',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} showHandlungsbedarf />);

      expect(screen.getByText('Handlungsbedarf')).toBeInTheDocument();
    });

    it('zeigt KEINE Handlungsbedarf-Markierung wenn showHandlungsbedarf nicht gesetzt', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-r',
          name: 'ZF Sued',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'RUECKFRAGE',
        }),
        createTestEmpfaenger({
          id: 'emp-nv',
          name: 'ZF West',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.queryByText('Rückfrage offen')).not.toBeInTheDocument();
      expect(screen.queryByText('Handlungsbedarf')).not.toBeInTheDocument();
    });

    it('zeigt keine Handlungsbedarf-Markierung bei VERSTANDEN oder AUSSTEHEND', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-v',
          name: 'ZF Nord',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
        createTestEmpfaenger({
          id: 'emp-a',
          name: 'ZF Ost',
          quittiertAm: undefined,
          quittierungArt: undefined,
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} showHandlungsbedarf />);

      expect(screen.queryByText('Rückfrage offen')).not.toBeInTheDocument();
      expect(screen.queryByText('Handlungsbedarf')).not.toBeInTheDocument();
    });

    it('zeigt Handlungsbedarf-Label bei RUECKFRAGE', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-r',
          name: 'ZF Sued',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'RUECKFRAGE',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} showHandlungsbedarf />);

      expect(screen.getByText('Rückfrage offen')).toBeInTheDocument();
    });

    it('zeigt Handlungsbedarf-Label bei NICHT_VERSTANDEN', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-nv',
          name: 'ZF West',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} showHandlungsbedarf />);

      expect(screen.getByText('Handlungsbedarf')).toBeInTheDocument();
    });
  });

  describe('Zeitstempel', () => {
    it('zeigt Zugestellt-Zeitstempel formatiert an', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'ZF Nord',
          zugestelltAm: new Date('2026-03-23T10:00:00'),
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText(/Zugestellt:/)).toBeInTheDocument();
      expect(screen.getByText(/23\.03\. 10:00/)).toBeInTheDocument();
    });

    it('zeigt Quittiert-Zeitstempel formatiert an', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'ZF Nord',
          zugestelltAm: new Date('2026-03-23T10:00:00'),
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText(/Quittiert:/)).toBeInTheDocument();
      expect(screen.getByText(/23\.03\. 10:05/)).toBeInTheDocument();
    });

    it('zeigt "Noch nicht zugestellt" wenn weder Zugestellt noch Quittiert vorhanden', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'ZF Nord',
          zugestelltAm: undefined,
          quittiertAm: undefined,
          quittierungArt: undefined,
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText('Noch nicht zugestellt')).toBeInTheDocument();
    });

    it('zeigt beide Zeitstempel mit Trennzeichen wenn beide vorhanden', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'ZF Nord',
          zugestelltAm: new Date('2026-03-23T10:00:00'),
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      expect(screen.getByText(/Zugestellt:/)).toBeInTheDocument();
      expect(screen.getByText(/Quittiert:/)).toBeInTheDocument();
      // Trennzeichen "|" wird angezeigt
      expect(screen.getByText('|')).toBeInTheDocument();
    });
  });

  describe('Scrollbar', () => {
    it('hat overflow-y-auto Klasse bei > 5 Empfaengern', () => {
      const empfaenger = Array.from({ length: 6 }, (_, i) =>
        createTestEmpfaenger({
          id: `emp-${i}`,
          empfaengerId: `user-${i}`,
          name: `Empfaenger ${i + 1}`,
        }),
      );

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      const list = screen.getByRole('list');
      expect(list.className).toContain('overflow-y-auto');
      expect(list.className).toContain('max-h-64');
    });

    it('hat KEINE overflow Klasse bei <= 5 Empfaengern', () => {
      const empfaenger = Array.from({ length: 5 }, (_, i) =>
        createTestEmpfaenger({
          id: `emp-${i}`,
          empfaengerId: `user-${i}`,
          name: `Empfaenger ${i + 1}`,
        }),
      );

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      const list = screen.getByRole('list');
      expect(list.className).not.toContain('overflow-y-auto');
      expect(list.className).not.toContain('max-h-64');
    });

    it('rendert alle 6 Empfaenger auch wenn scrollbar', () => {
      const empfaenger = Array.from({ length: 6 }, (_, i) =>
        createTestEmpfaenger({
          id: `emp-${i}`,
          empfaengerId: `user-${i}`,
          name: `Empfaenger ${i + 1}`,
        }),
      );

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(6);
    });
  });

  describe('Zugaenglichkeit', () => {
    it('hat role="list" und aria-label auf dem Container', () => {
      const empfaenger = [createTestEmpfaenger()];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      const list = screen.getByRole('list', { name: 'Weitergabestatus der Empfänger' });
      expect(list).toBeInTheDocument();
    });

    it('rendert jede Zeile als role="listitem"', () => {
      const empfaenger = [createTestEmpfaenger({ id: 'emp-1', name: 'ZF Nord' }), createTestEmpfaenger({ id: 'emp-2', name: 'ZF Sued', empfaengerId: 'user-2' })];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('kommuniziert Status farbunabhaengig durch Text-Labels', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'Verstanden User',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
        createTestEmpfaenger({
          id: 'emp-2',
          name: 'Rueckfrage User',
          empfaengerId: 'user-2',
          quittiertAm: new Date('2026-03-23T10:06:00'),
          quittierungArt: 'RUECKFRAGE',
        }),
        createTestEmpfaenger({
          id: 'emp-3',
          name: 'NichtVerstanden User',
          empfaengerId: 'user-3',
          quittiertAm: new Date('2026-03-23T10:07:00'),
          quittierungArt: 'NICHT_VERSTANDEN',
        }),
        createTestEmpfaenger({
          id: 'emp-4',
          name: 'Ausstehend User',
          empfaengerId: 'user-4',
          quittiertAm: undefined,
          quittierungArt: undefined,
        }),
      ];

      renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      // Jeder Status ist als sichtbarer Text vorhanden (nicht nur durch Farbe)
      expect(screen.getByText('Verstanden')).toBeVisible();
      expect(screen.getByText('Rückfrage')).toBeVisible();
      expect(screen.getByText('Nicht verstanden')).toBeVisible();
      expect(screen.getByText('Ausstehend')).toBeVisible();
    });

    it('versteckt dekorative Icons vor Screenreadern mit aria-hidden', () => {
      const empfaenger = [createTestEmpfaenger()];

      const { container } = renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      // Alle SVG-Icons sollten aria-hidden="true" haben
      const icons = container.querySelectorAll('svg');
      for (const icon of icons) {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('hat title-Attribut auf Status-Badges fuer Tooltip-Anzeige', () => {
      const empfaenger = [
        createTestEmpfaenger({
          id: 'emp-1',
          name: 'ZF Nord',
          quittiertAm: new Date('2026-03-23T10:05:00'),
          quittierungArt: 'VERSTANDEN',
        }),
      ];

      const { container } = renderWithProviders(<WeitergabeStatusListe empfaenger={empfaenger} />);

      const badge = container.querySelector('[title="Verstanden"]');
      expect(badge).toBeInTheDocument();
    });
  });
});
