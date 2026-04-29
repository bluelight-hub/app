import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

/**
 * Spec für `AcknowledgmentStatusBadge` (Story 415-3-4, Task 9, AC12).
 *
 * Tests werden ausschließlich mit der `initialData`-Prop gefahren, damit
 * der noch nicht ausgelieferte `useEigenschutzPsaQuittungen`-Hook
 * irrelevant bleibt. Wir mocken das `queries`-Modul defensiv, damit kein
 * realer Netzwerk-Pfad ausgelöst wird.
 */
vi.mock('@/features/eigenschutz/api/queries', () => ({
  useEigenschutzPsaQuittungen: () => ({ data: undefined }),
}));

import { AcknowledgmentStatusBadge, deriveAcknowledgmentStatus, type PsaQuittungEntry } from '../AcknowledgmentStatusBadge';

function buildEntry(overrides: Partial<PsaQuittungEntry> = {}): PsaQuittungEntry {
  return {
    einheitId: `einheit-${Math.random().toString(36).slice(2, 8)}`,
    einheitName: 'Rettungswagen Alpha',
    status: 'AUSSTEHEND',
    ...overrides,
  };
}

describe('AcknowledgmentStatusBadge (Story 415-3-4 Task 9)', () => {
  describe('deriveAcknowledgmentStatus', () => {
    it('liefert `pending`, wenn 0 von 3 quittiert sind', () => {
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'a', status: 'AUSSTEHEND' }),
        buildEntry({ einheitId: 'b', status: 'AUSSTEHEND' }),
        buildEntry({ einheitId: 'c', status: 'AUSSTEHEND' }),
      ];

      expect(deriveAcknowledgmentStatus(entries)).toBe('pending');
    });

    it('liefert `partial`, wenn 1 von 3 quittiert ist', () => {
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z' }),
        buildEntry({ einheitId: 'b', status: 'AUSSTEHEND' }),
        buildEntry({ einheitId: 'c', status: 'AUSSTEHEND' }),
      ];

      expect(deriveAcknowledgmentStatus(entries)).toBe('partial');
    });

    it('liefert `complete`, wenn 3 von 3 quittiert sind', () => {
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z' }),
        buildEntry({ einheitId: 'b', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:31:00.000Z' }),
        buildEntry({ einheitId: 'c', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:32:00.000Z' }),
      ];

      expect(deriveAcknowledgmentStatus(entries)).toBe('complete');
    });

    it('liefert `overdue`, sobald mindestens ein Eintrag den Status `OVERDUE` hat (Story 3.7 Forward-Compat)', () => {
      const entries: PsaQuittungEntry[] = [buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z' }), buildEntry({ einheitId: 'b', status: 'OVERDUE' })];

      expect(deriveAcknowledgmentStatus(entries)).toBe('overdue');
    });
  });

  describe('Rendering & A11y', () => {
    it('rendert einen `aria-label` mit Volltext (Empfangen / Ausstehend)', () => {
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z' }),
        buildEntry({ einheitId: 'b', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:31:00.000Z' }),
        buildEntry({ einheitId: 'c', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:32:00.000Z' }),
        buildEntry({ einheitId: 'd', status: 'AUSSTEHEND' }),
        buildEntry({ einheitId: 'e', status: 'AUSSTEHEND' }),
      ];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);

      const badge = screen.getByTestId('acknowledgment-status-badge');
      expect(badge).toHaveAttribute('aria-label', 'Quittungsstand: 3 von 5 empfangen, 2 ausstehend');
    });

    it('hat die `tabular-nums`-Klasse auf dem Live-Counter (kein Breiten-Sprung beim WS-Update)', () => {
      const entries: PsaQuittungEntry[] = [buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z' }), buildEntry({ einheitId: 'b', status: 'AUSSTEHEND' })];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);

      const counter = screen.getByTestId('acknowledgment-status-badge-counter');
      expect(counter).toHaveClass('tabular-nums');
      expect(counter).toHaveTextContent('1/2');
    });

    it('öffnet beim Klick einen Popover mit der Empfänger-Liste (eine Zeile pro Einheit)', async () => {
      const user = userEvent.setup();
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'einheit-a', einheitName: 'Rettungswagen Alpha', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z', quittiertVonUserName: 'Ute Muster' }),
        buildEntry({ einheitId: 'einheit-b', einheitName: 'Sanitätsstaffel Bravo', status: 'AUSSTEHEND' }),
      ];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);

      await user.click(screen.getByTestId('acknowledgment-status-badge'));

      const list = await screen.findByTestId('acknowledgment-status-badge-list');
      expect(within(list).getByText('Rettungswagen Alpha')).toBeInTheDocument();
      expect(within(list).getByText('Sanitätsstaffel Bravo')).toBeInTheDocument();

      const rowA = within(list).getByTestId('acknowledgment-status-badge-row-einheit-a');
      const rowB = within(list).getByTestId('acknowledgment-status-badge-row-einheit-b');
      expect(within(rowA).getByText(/quittiert/i)).toBeInTheDocument();
      expect(within(rowB).getByText(/ausstehend/i)).toBeInTheDocument();
    });

    it('zeigt die HH:mm-Zeit für quittierte Einheiten und den User-Namen im Popover', async () => {
      const user = userEvent.setup();
      // Die Zeit `2026-04-24T08:30:00.000Z` ergibt User-Locale-frei den
      // lokalen HH:mm-Wert via `Date#getHours/getMinutes`. Wir vergleichen
      // gegen genau den Wert, den das gleiche `Date`-Objekt produzieren würde.
      const sampleAck = '2026-04-24T08:30:00.000Z';
      const expected = (() => {
        const d = new Date(sampleAck);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })();
      const entries: PsaQuittungEntry[] = [buildEntry({ einheitId: 'einheit-a', einheitName: 'Rettungswagen Alpha', status: 'QUITTIERT', quittiertAm: sampleAck, quittiertVonUserName: 'Ute Muster' })];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);

      await user.click(screen.getByTestId('acknowledgment-status-badge'));

      const row = await screen.findByTestId('acknowledgment-status-badge-row-einheit-a');
      expect(within(row).getByText(new RegExp(expected))).toBeInTheDocument();
      expect(within(row).getByText(/Ute Muster/)).toBeInTheDocument();
    });

    it('schließt den Popover bei Esc (Headless-UI-Default)', async () => {
      const user = userEvent.setup();
      const entries: PsaQuittungEntry[] = [buildEntry({ einheitId: 'einheit-a', status: 'AUSSTEHEND' })];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);

      await user.click(screen.getByTestId('acknowledgment-status-badge'));
      expect(await screen.findByTestId('acknowledgment-status-badge-list')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByTestId('acknowledgment-status-badge-list')).not.toBeInTheDocument();
      });
    });

    it('setzt das `data-status`-Attribut auf den abgeleiteten Status (für Severity-Token-Audits)', () => {
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z' }),
        buildEntry({ einheitId: 'b', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:31:00.000Z' }),
      ];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);

      expect(screen.getByTestId('acknowledgment-status-badge')).toHaveAttribute('data-status', 'complete');
    });
  });

  describe('Story 3.6 AC13 — Lücke-Pill + Notiz im Popover', () => {
    it('rendert Lücke-Pill für Empfänger mit `lueckeGemeldet === true`', async () => {
      const user = userEvent.setup();
      const entries: PsaQuittungEntry[] = [
        buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z', lueckeGemeldet: true, lueckeNotiz: 'Stiefel 44 fehlt' }),
        buildEntry({ einheitId: 'b', status: 'AUSSTEHEND' }),
      ];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);
      await user.click(screen.getByTestId('acknowledgment-status-badge'));

      expect(await screen.findByTestId('acknowledgment-status-badge-luecke-a')).toBeInTheDocument();
      expect(screen.getByText('Lücke gemeldet')).toBeInTheDocument();
      expect(screen.getByTestId('acknowledgment-status-badge-luecke-notiz-a')).toHaveTextContent('Stiefel 44 fehlt');

      // Empfänger ohne Lücke bekommt KEINEN Pill.
      expect(screen.queryByTestId('acknowledgment-status-badge-luecke-b')).toBeNull();
    });

    it('Lücke-Pill wird ohne Notiz korrekt gerendert (Notiz-Block bleibt aus)', async () => {
      const user = userEvent.setup();
      const entries: PsaQuittungEntry[] = [buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z', lueckeGemeldet: true })];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);
      await user.click(screen.getByTestId('acknowledgment-status-badge'));

      expect(await screen.findByTestId('acknowledgment-status-badge-luecke-a')).toBeInTheDocument();
      expect(screen.queryByTestId('acknowledgment-status-badge-luecke-notiz-a')).toBeNull();
    });

    it('rendert KEINEN Resolve-Button (Q1-Defer auf Story 6.x)', async () => {
      const user = userEvent.setup();
      const entries: PsaQuittungEntry[] = [buildEntry({ einheitId: 'a', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:30:00.000Z', lueckeGemeldet: true, lueckeNotiz: 'Stiefel 44 fehlt' })];

      render(<AcknowledgmentStatusBadge einsatzId="einsatz-1" propagationGroupId="prop-1" initialData={entries} />);
      await user.click(screen.getByTestId('acknowledgment-status-badge'));

      // Defense-in-Depth: kein „Lücke geklärt"-Button im Popover.
      expect(screen.queryByRole('button', { name: /Lücke geklärt|geklärt|aufgelöst/ })).toBeNull();
    });
  });
});
