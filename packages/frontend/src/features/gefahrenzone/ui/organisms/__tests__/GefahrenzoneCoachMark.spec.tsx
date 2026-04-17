import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { GefahrenzoneCoachMark } from '../GefahrenzoneCoachMark';
import { onboardingActions, onboardingStore } from '../../../stores/onboarding.store';
import { splitViewActions } from '@/features/einsatz/stores/split-view.store';

const mockList = vi.fn();
vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerListVAlpha: mockList,
    }),
  },
}));

function makeZone(id: string): GefahrenzoneDto {
  return {
    id,
    einsatzId: 'e1',
    gefahrentyp: 'BRAND',
    schutzobjekt: 'MENSCHEN',
    geometryType: 'POLYGON',
    geometry: {} as unknown as { [key: string]: unknown },
    bezeichnung: null,
    warnstufe: 'HOCH',
    erstelltVon: 'u',
    aktualisiertVon: null,
    erstelltAm: new Date(),
    aktualisiertAm: new Date(),
  } as GefahrenzoneDto;
}

function wrapperWith(): ({ children }: { children: ReactNode }) => JSX.Element {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('GefahrenzoneCoachMark', () => {
  beforeEach(() => {
    onboardingActions.reset();
    splitViewActions.deactivate();
    mockList.mockReset();
  });

  it('rendert nichts, wenn Split-View inaktiv ist', async () => {
    mockList.mockResolvedValueOnce({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rendert nichts, wenn keine Zonen vorhanden sind', async () => {
    mockList.mockResolvedValueOnce({ data: { einsatzId: 'e1', zonen: [] } });
    splitViewActions.activate(null);
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rendert nichts, wenn coachMarkSeen=true', async () => {
    mockList.mockResolvedValueOnce({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    splitViewActions.activate(null);
    onboardingActions.markSeen();
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rendert bei Split-aktiv + Zonen vorhanden + !seen', async () => {
    mockList.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    splitViewActions.activate(null);
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });
    // Warte, bis der Query aufgelöst ist
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Schritt 1 von 4/)).toBeInTheDocument();
  });

  it('Weiter-Button geht zum nächsten Step, letzter Step setzt seen', async () => {
    mockList.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    splitViewActions.activate(null);
    const user = userEvent.setup();
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });

    await screen.findByRole('dialog');
    await user.click(screen.getByText('Weiter'));
    expect(screen.getByText(/Schritt 2 von 4/)).toBeInTheDocument();
    await user.click(screen.getByText('Weiter'));
    await user.click(screen.getByText('Weiter'));
    // Letzter Step → Button heißt „Verstanden"
    expect(screen.getByText('Verstanden')).toBeInTheDocument();
    await user.click(screen.getByText('Verstanden'));
    expect(onboardingStore.state.coachMarkSeen).toBe(true);
  });

  it('Skip-Button (X) setzt seen und schließt die Tour', async () => {
    mockList.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    splitViewActions.activate(null);
    const user = userEvent.setup();
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });

    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /überspringen/i }));
    expect(onboardingStore.state.coachMarkSeen).toBe(true);
  });

  it('Esc schließt die Tour', async () => {
    mockList.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    splitViewActions.activate(null);
    const user = userEvent.setup();
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });

    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(onboardingStore.state.coachMarkSeen).toBe(true);
  });

  it('ArrowRight / ArrowLeft navigiert zwischen Steps', async () => {
    mockList.mockResolvedValue({ data: { einsatzId: 'e1', zonen: [makeZone('z1')] } });
    splitViewActions.activate(null);
    const user = userEvent.setup();
    const Wrapper = wrapperWith();
    render(<GefahrenzoneCoachMark einsatzId="e1" />, { wrapper: Wrapper });

    await screen.findByRole('dialog');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(/Schritt 2 von 4/)).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText(/Schritt 1 von 4/)).toBeInTheDocument();
  });
});
