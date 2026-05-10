/**
 * Tests für `MeldeLueckeDialog` (Story 3.6 AC11).
 *
 * - Render mit + ohne `open` (geschlossen → null-render).
 * - Vor-Belegung wird im Textfeld dargestellt.
 * - Senden-Button disabled bei leerer Notiz; enabled nach Eingabe.
 * - `Cmd/Ctrl + Enter` triggert Submit.
 * - `Esc` ruft `onClose` (Headless-UI-Default).
 * - Mutation-Erfolg → `onSuccess` + `onClose`.
 * - Mutation-Fehler → `data-luecke-error="true"`, Dialog bleibt offen.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mutationMock } = vi.hoisted(() => ({
  mutationMock: { mutateAsync: vi.fn(), isPending: false } as { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean },
}));

vi.mock('../../../api/queries', () => ({
  useMeldeLuecke: () => mutationMock,
}));

vi.mock('../../../hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

import { MeldeLueckeDialog } from '../MeldeLueckeDialog';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const baseOpen = {
  propagationGroupId: 'group-1',
  einheitId: 'einheit-1',
  einheitName: 'Sangruppe 1',
  vorbereiteteNotiz: 'Schutzanzug Größe L, Stiefel 44',
};

beforeEach(() => {
  mutationMock.mutateAsync.mockReset();
  mutationMock.mutateAsync.mockResolvedValue(undefined);
  mutationMock.isPending = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MeldeLueckeDialog (Story 3.6 AC11)', () => {
  it('rendert null, wenn open === null', () => {
    const client = makeClient();
    const { container } = render(<MeldeLueckeDialog einsatzId="einsatz-1" open={null} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });
    expect(container.firstChild).toBeNull();
  });

  it('rendert mit Headline + Textarea + vorbereiteter Notiz', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    expect(screen.getByText(/Ausrüstungs-Lücke melden — Einheit Sangruppe 1/)).toBeInTheDocument();
    const textarea = screen.getByTestId('melde-luecke-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Schutzanzug Größe L, Stiefel 44');
  });

  it('Senden-Button ist disabled bei leerer Notiz, enabled nach Eingabe', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: '' }} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    const submit = screen.getByTestId('melde-luecke-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('melde-luecke-textarea'), { target: { value: 'echte Notiz' } });
    expect(submit).not.toBeDisabled();
  });

  it('rendert Destructive-Pattern mit Hinweistext und Outline-Danger-Submit', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    expect(screen.getByTestId('melde-luecke-destructive-hint')).toHaveTextContent('Diese Änderung wird historisiert und kann nicht gelöscht werden.');
    const submit = screen.getByTestId('melde-luecke-submit');
    expect(submit.className).toMatch(/border-status-danger-border/);
    expect(submit.className).not.toMatch(/bg-status-danger-text/);
  });

  it('Senden-Button bleibt disabled bei Whitespace-only-Notiz', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: '' }} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    const submit = screen.getByTestId('melde-luecke-submit');
    fireEvent.change(screen.getByTestId('melde-luecke-textarea'), { target: { value: '   \t\n  ' } });
    expect(submit).toBeDisabled();
  });

  it('zeigt Zeichen-Counter und schaltet ab > 900 auf Warning', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    const counter = screen.getByTestId('melde-luecke-counter');
    expect(counter.textContent).toContain('/1000');

    fireEvent.change(screen.getByTestId('melde-luecke-textarea'), { target: { value: 'x'.repeat(950) } });
    expect(counter.className).toMatch(/status-warning/);
  });

  it('Cmd + Enter im Textarea triggert Submit', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={onClose} onSuccess={onSuccess} />, { wrapper: wrapper(client) });

    fireEvent.keyDown(screen.getByTestId('melde-luecke-textarea'), { key: 'Enter', metaKey: true });

    await waitFor(() => expect(mutationMock.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutationMock.mutateAsync).toHaveBeenCalledWith({
      propagationGroupId: 'group-1',
      einheitId: 'einheit-1',
      meldung: 'Schutzanzug Größe L, Stiefel 44',
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ propagationGroupId: 'group-1', einheitId: 'einheit-1' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('Ctrl + Enter triggert Submit (Cross-Platform)', async () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.keyDown(screen.getByTestId('melde-luecke-textarea'), { key: 'Enter', ctrlKey: true });

    await waitFor(() => expect(mutationMock.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it('Enter ohne Modifier triggert KEIN Submit (Mehrzeilen-Native-Konvention)', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.keyDown(screen.getByTestId('melde-luecke-textarea'), { key: 'Enter' });

    expect(mutationMock.mutateAsync).not.toHaveBeenCalled();
  });

  it('Klick auf Senden ruft mutateAsync, dann onSuccess + onClose', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={onClose} onSuccess={onSuccess} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByTestId('melde-luecke-submit'));

    await waitFor(() => expect(mutationMock.mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it('trimmt Notiz vor Submit', async () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: '   notiz mit spaces   ' }} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByTestId('melde-luecke-submit'));

    await waitFor(() => expect(mutationMock.mutateAsync).toHaveBeenCalled());
    expect(mutationMock.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ meldung: 'notiz mit spaces' }));
  });

  it('Klick auf Abbrechen ruft onClose ohne Mutation', () => {
    const onClose = vi.fn();
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={onClose} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByTestId('melde-luecke-cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(mutationMock.mutateAsync).not.toHaveBeenCalled();
  });

  it('Mutation-Fehler: data-luecke-error="true", Dialog bleibt offen, kein onSuccess', async () => {
    mutationMock.mutateAsync.mockRejectedValue(new Error('boom'));
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={onClose} onSuccess={onSuccess} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByTestId('melde-luecke-submit'));

    await waitFor(() => expect(screen.getByTestId('melde-luecke-error-text')).toBeInTheDocument());
    expect(screen.getByTestId('melde-luecke-dialog')).toHaveAttribute('data-luecke-error', 'true');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Re-Open mit anderer Notiz setzt das Textfeld neu', () => {
    const client = makeClient();
    const { rerender } = render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    rerender(<MeldeLueckeDialog einsatzId="einsatz-1" open={null} onClose={vi.fn()} onSuccess={vi.fn()} />);
    rerender(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: 'andere Notiz' }} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect((screen.getByTestId('melde-luecke-textarea') as HTMLTextAreaElement).value).toBe('andere Notiz');
  });

  it('Parent-Re-Render mit neuem aber äquivalentem `open`-Object resettet getippten Notiz-Inhalt NICHT', () => {
    const client = makeClient();
    const { rerender } = render(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: 'prep' }} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.change(screen.getByTestId('melde-luecke-textarea'), { target: { value: 'manuelle Eingabe' } });
    expect((screen.getByTestId('melde-luecke-textarea') as HTMLTextAreaElement).value).toBe('manuelle Eingabe');

    // Parent renderiert mit frischem aber semantisch äquivalentem `open` (gleiche
    // propagationGroupId + einheitId, gleiche vorbereiteteNotiz).
    rerender(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: 'prep' }} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect((screen.getByTestId('melde-luecke-textarea') as HTMLTextAreaElement).value).toBe('manuelle Eingabe');
  });

  it('Esc ruft onClose, wenn nicht pending (closeOnEscape)', () => {
    const onClose = vi.fn();
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={onClose} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    // Headless-UI Dialog hört auf `keydown` Escape am Document und ruft
    // den `onClose`-Prop. `closeOnEscape={!isPending}` ist im DOM aktiv, weil
    // `mutationMock.isPending = false`.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('IME-Composition: Cmd+Enter im Composition-Mode triggert KEIN Submit', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    // Simuliert IME-Composition (z. B. Dead-Key-Eingabe für Umlaut). Der
    // Handler darf NICHT abschicken, sonst gehen In-Progress-Eingaben
    // verloren.
    fireEvent.keyDown(screen.getByTestId('melde-luecke-textarea'), {
      key: 'Enter',
      metaKey: true,
      isComposing: true,
    });

    expect(mutationMock.mutateAsync).not.toHaveBeenCalled();
  });

  it('Paste > 1000 Zeichen zeigt Truncation-Hinweis', () => {
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={{ ...baseOpen, vorbereiteteNotiz: '' }} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.change(screen.getByTestId('melde-luecke-textarea'), { target: { value: 'x'.repeat(1500) } });

    expect(screen.getByTestId('melde-luecke-truncated')).toHaveTextContent(/auf 1000 Zeichen gekürzt/i);
    expect((screen.getByTestId('melde-luecke-textarea') as HTMLTextAreaElement).value).toHaveLength(1000);
  });

  it('A11y-strukturell: textarea trägt aria-required, aria-labelledby, aria-describedby (Story 3.6 AC11)', () => {
    // Repo-Pattern: kein `vitest-axe` installiert (siehe
    // `PsaProfilEmpfangBanner.spec.tsx` Z. 264). Wir verifizieren statt
    // dessen die strukturellen A11y-Attribute, die der A11y-Snapshot
    // ebenfalls prüfen würde.
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    const textarea = screen.getByTestId('melde-luecke-textarea');
    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(textarea).toHaveAttribute('aria-labelledby');
    expect(textarea).toHaveAttribute('aria-describedby');

    // Mutation-Fehler rendert role="alert" für Screenreader.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Mutation-Fehler 404 → spezifische Message „nicht mehr offen"', async () => {
    mutationMock.mutateAsync.mockRejectedValue({ status: 404 });
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByTestId('melde-luecke-submit'));

    await waitFor(() => expect(screen.getByTestId('melde-luecke-error-text')).toHaveTextContent(/nicht mehr offen/));
  });

  it('Mutation-Fehler 422 → spezifische Message „Berechtigung oder Konsistenz"', async () => {
    mutationMock.mutateAsync.mockRejectedValue({ response: { status: 422 } });
    const client = makeClient();
    render(<MeldeLueckeDialog einsatzId="einsatz-1" open={baseOpen} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByTestId('melde-luecke-submit'));

    await waitFor(() => expect(screen.getByTestId('melde-luecke-error-text')).toHaveTextContent(/Berechtigung|Konsistenz/));
  });
});
