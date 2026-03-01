/**
 * Unit Tests für BefehlKommentarThread
 *
 * Verifiziert:
 * - Leere Liste rendert nur Eingabefeld
 * - Root-Kommentare werden angezeigt
 * - "Anonym" bei authorId null/undefined
 * - "Du" bei eigenem Kommentar
 * - Rückfrage-Badge sichtbar
 * - Kein "Antworten"-Button vorhanden
 * - Klicks im Thread bubblen nicht zum Parent (Detail-Panel)
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BefehlKommentarThread } from '../BefehlKommentarThread.molecule';
import { createKommentar } from '../../../__fixtures__/befehl-test-utils';

// Mock useCurrentUser
vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', name: 'Test User' }, isLoading: false }),
}));

// Mock useAddBefehlKommentar
vi.mock('../../../api/use-add-befehl-kommentar', () => ({
  useAddBefehlKommentar: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('BefehlKommentarThread', () => {
  const defaultProps = {
    befehlId: 'befehl-1',
    einsatzId: 'einsatz-1',
  };

  it('rendert leere Liste mit nur Eingabefeld', () => {
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={[]} />);

    expect(screen.getByLabelText('Kommentar schreiben')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Kommentare' })).toBeNull();
  });

  it('rendert Kommentar mit Autor-Kürzel', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: 'user-2', text: 'Hallo Welt' })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.getByText('Hallo Welt')).toBeTruthy();
    expect(screen.getByText('user-2')).toBeTruthy();
  });

  it('zeigt "Anonym" bei authorId null', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: null, text: 'Anonym-Kommentar' })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.getByText('Anonym')).toBeTruthy();
  });

  it('zeigt "Anonym" bei authorId undefined', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: undefined, text: 'Anonym-Kommentar' })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.getByText('Anonym')).toBeTruthy();
  });

  it('zeigt "Du" bei eigenem Kommentar', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: 'user-1', text: 'Mein Kommentar' })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.getByText('Du')).toBeTruthy();
  });

  it('zeigt Rückfrage-Badge', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: 'user-2', text: 'Frage?', isRueckfrage: true })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.getByText('Rückfrage')).toBeTruthy();
  });

  it('zeigt kein Rückfrage-Badge bei normalem Kommentar', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: 'user-2', text: 'Normal', isRueckfrage: false })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.queryByText('Rückfrage')).toBeNull();
  });

  it('hat keinen "Antworten"-Button', () => {
    const kommentare = [createKommentar({ id: 'k1', authorId: 'user-2', text: 'Test' })];
    renderWithProviders(<BefehlKommentarThread {...defaultProps} kommentare={kommentare} />);

    expect(screen.queryByText('Antworten')).toBeNull();
  });

  it('stoppt Click-Propagation zum Parent', () => {
    const parentClick = vi.fn();
    const kommentare = [createKommentar({ id: 'k1', authorId: 'user-2', text: 'Test' })];

    renderWithProviders(
      <div onClick={parentClick}>
        <BefehlKommentarThread {...defaultProps} kommentare={kommentare} />
      </div>,
    );

    fireEvent.click(screen.getByText('Test'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
