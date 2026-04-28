import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EquipmentChecklistEinheit } from '../EquipmentChecklist';

const { ackMutationMock } = vi.hoisted(() => ({
  ackMutationMock: {
    mutateAsync: vi.fn() as ReturnType<typeof vi.fn>,
    isPending: false,
  },
}));

vi.mock('../../../api/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/queries')>();
  return {
    ...actual,
    useAckPsaQuittung: () => ackMutationMock,
  };
});

import { PsaProfilDetailDrawer } from '../PsaProfilDetailDrawer';

const EINHEITEN: EquipmentChecklistEinheit[] = [{ einheitId: 'einheit-1', einheitName: 'Sani-1' }];

beforeEach(() => {
  ackMutationMock.mutateAsync.mockReset();
  ackMutationMock.mutateAsync.mockResolvedValue(undefined);
  ackMutationMock.isPending = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PsaProfilDetailDrawer (Story 3.5 AC7/AC14)', () => {
  it('rendert NICHTS, wenn propagationGroupId null ist (closed-State)', () => {
    render(<PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId={null} einheiten={EINHEITEN} aktiveProfile={['BASIS']} onClose={() => undefined} />);
    expect(screen.queryByTestId('psa-profil-detail-drawer')).toBeNull();
  });

  it('rendert Drawer mit Begründung + Profile + Checkliste, wenn propagationGroupId gesetzt ist', () => {
    render(
      <PsaProfilDetailDrawer
        einsatzId="einsatz-1"
        propagationGroupId="pg-1"
        einheiten={EINHEITEN}
        aktiveProfile={['BASIS']}
        begruendung="Brand mit Atemschutz"
        onClose={() => undefined}
        onQuittieren={() => undefined}
      />,
    );

    expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('psa-profil-detail-begruendung')).toHaveTextContent('Brand mit Atemschutz');
    expect(screen.getByTestId('psa-profil-detail-aktive-profile')).toHaveTextContent('Basis');
    expect(screen.getByTestId('psa-profil-detail-checklist')).toBeInTheDocument();
  });

  it('zeigt Lade-Platzhalter, wenn keine Begründung übergeben', () => {
    render(<PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId="pg-1" einheiten={EINHEITEN} aktiveProfile={['BASIS']} onClose={() => undefined} onQuittieren={() => undefined} />);
    expect(screen.getByTestId('psa-profil-detail-begruendung')).toHaveTextContent('Begründung wird geladen');
  });

  it('Sender-Read-Only-Modus rendert keine Quittungs-/Lücke-Buttons (AC11)', () => {
    render(
      <PsaProfilDetailDrawer
        einsatzId="einsatz-1"
        propagationGroupId="pg-1"
        einheiten={EINHEITEN}
        aktiveProfile={['BASIS']}
        begruendung="Test"
        onClose={() => undefined}
        // KEIN onQuittieren → Sender-Sicht
      />,
    );

    expect(screen.queryByTestId('psa-profil-detail-quittieren')).toBeNull();
    expect(screen.queryByTestId('psa-profil-detail-luecke')).toBeNull();
    expect(screen.getByTestId('psa-profil-detail-read-only-hint')).toBeInTheDocument();
    expect(screen.getByTestId('psa-profil-detail-drawer')).toHaveAttribute('data-read-only', 'true');
  });

  it('Quittungs-Klick triggert useAckPsaQuittung mit korrektem Input und schließt Drawer bei Erfolg (AC14)', async () => {
    const onClose = vi.fn();
    const onQuittieren = vi.fn();
    render(<PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId="pg-1" einheiten={EINHEITEN} aktiveProfile={['BASIS']} begruendung="Test" onClose={onClose} onQuittieren={onQuittieren} />);

    fireEvent.click(screen.getByTestId('psa-profil-detail-quittieren'));

    await waitFor(() => {
      expect(ackMutationMock.mutateAsync).toHaveBeenCalledWith({ propagationGroupId: 'pg-1', einheitId: 'einheit-1' });
      expect(onQuittieren).toHaveBeenCalledWith('einheit-1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('Bei Mutation-Fehler bleibt der Drawer offen und setzt data-ack-error (AC14)', async () => {
    const onClose = vi.fn();
    ackMutationMock.mutateAsync.mockRejectedValueOnce(new Error('500 Server'));

    render(
      <PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId="pg-1" einheiten={EINHEITEN} aktiveProfile={['BASIS']} begruendung="Test" onClose={onClose} onQuittieren={() => undefined} />,
    );

    fireEvent.click(screen.getByTestId('psa-profil-detail-quittieren'));

    await waitFor(() => {
      expect(screen.getByTestId('psa-profil-detail-drawer')).toHaveAttribute('data-ack-error', 'true');
      expect(screen.getByTestId('psa-profil-detail-ack-error')).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Footer-Schließen-Button ruft onClose', () => {
    const onClose = vi.fn();
    render(
      <PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId="pg-1" einheiten={EINHEITEN} aktiveProfile={['BASIS']} begruendung="Test" onClose={onClose} onQuittieren={() => undefined} />,
    );
    // Im Footer (nicht der Header-X). Headless-UI rendert den X-Close-Button mit
    // SR-only-Label „Schließen", deshalb gibt es zwei Buttons mit dem Namen — wir
    // wählen den letzten (Footer).
    const buttons = screen.getAllByRole('button', { name: 'Schließen' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('Sender-Read-Only-Modus: Checkliste ist disabled (P1)', () => {
    render(<PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId="pg-1" einheiten={EINHEITEN} aktiveProfile={['BASIS']} begruendung="Test" onClose={() => undefined} />);
    const checklist = screen.getByTestId('psa-profil-detail-checklist');
    expect(checklist).toHaveAttribute('data-read-only', 'true');
    const checkboxes = checklist.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const cb of checkboxes) {
      expect(cb).toBeDisabled();
    }
  });

  it('Footer-Lücke-Button füllt vorbereiteteNotiz aus nicht-gehakten Items (P4)', () => {
    const onMeldeLuecke = vi.fn();
    render(
      <PsaProfilDetailDrawer
        einsatzId="einsatz-1"
        propagationGroupId="pg-1"
        einheiten={EINHEITEN}
        aktiveProfile={['BASIS']}
        begruendung="Test"
        onClose={() => undefined}
        onQuittieren={() => undefined}
        onMeldeLuecke={onMeldeLuecke}
      />,
    );
    fireEvent.click(screen.getByTestId('psa-profil-detail-luecke'));
    expect(onMeldeLuecke).toHaveBeenCalledWith(
      expect.objectContaining({
        einheitId: 'einheit-1',
        // P4: nicht mehr leerer String — ergibt sich aus den nicht-gehakten Items.
        vorbereiteteNotiz: expect.stringMatching(/.+/),
      }),
    );
  });

  it('Empty einheiten: Drawer rendert Inline-Hinweis (P15)', () => {
    render(
      <PsaProfilDetailDrawer einsatzId="einsatz-1" propagationGroupId="pg-1" einheiten={[]} aktiveProfile={['BASIS']} begruendung="Test" onClose={() => undefined} onQuittieren={() => undefined} />,
    );
    expect(screen.getByTestId('psa-profil-detail-einheiten-empty')).toHaveTextContent(/Keine betroffenen Einheiten/);
  });

  it('profileLoading=true zeigt Skeleton-Hinweise statt leerer Sektionen (P8)', () => {
    render(
      <PsaProfilDetailDrawer
        einsatzId="einsatz-1"
        propagationGroupId="pg-1"
        einheiten={EINHEITEN}
        aktiveProfile={[]}
        begruendung="Test"
        profileLoading
        onClose={() => undefined}
        onQuittieren={() => undefined}
      />,
    );
    expect(screen.getByTestId('psa-profil-detail-profile-loading')).toBeInTheDocument();
    expect(screen.getByTestId('psa-profil-detail-checklist-loading')).toBeInTheDocument();
  });

  it('profilToggles differenziert Section B in Aktiviert + Deaktiviert (Decision)', () => {
    render(
      <PsaProfilDetailDrawer
        einsatzId="einsatz-1"
        propagationGroupId="pg-1"
        einheiten={EINHEITEN}
        aktiveProfile={['CBRN_PATIENT']}
        profilToggles={[
          { profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' },
          { profil: 'BASIS', aktion: 'DEAKTIVIERT' },
        ]}
        begruendung="Test"
        onClose={() => undefined}
        onQuittieren={() => undefined}
      />,
    );
    expect(screen.getByTestId('psa-profil-detail-aktiviert')).toHaveTextContent(/Aktiviert/);
    expect(screen.getByTestId('psa-profil-detail-deaktiviert')).toHaveTextContent(/Deaktiviert/);
  });
});
