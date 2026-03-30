import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzBeitrittDialog } from '../EinsatzBeitrittDialog.organism';

type TeilnahmeState = {
  data: { data: { einsatzPersonId: string } } | null;
  isLoading: boolean;
};

const mockJoinMutateAsync = vi.fn();
const mockOnClose = vi.fn();
const mockOnReturnToOverview = vi.fn();
let mockMyTeilnahmeState: TeilnahmeState = {
  data: null,
  isLoading: false,
};

vi.mock('@/features/einsatz/api', () => ({
  useJoinEinsatz: vi.fn(),
  useMyEinsatzTeilnahme: vi.fn(),
  useEinsatzTeilnehmer: vi.fn(),
  useEinsatzPersonen: vi.fn(),
  useRegistrierePerson: vi.fn(),
}));

vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: vi.fn(() => ({ user: null, authStatus: 'authenticated', isLoading: false })),
}));

vi.mock('@/features/operative-roles', () => ({
  useOperativeRole: vi.fn(() => ({ role: 'EINSATZKRAFT' })),
}));

vi.mock('@/shared/ui/atoms/spinner.atom', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/shared', () => ({
  api: { kraefteStammPersonen: vi.fn() },
}));

vi.mock('react-icons/pi', () => ({
  PiArrowLeft: () => null,
  PiPlus: () => null,
  PiUser: () => null,
}));

vi.mock('@/features/kraefte/ui/molecules/EinsatzPersonenPicker', () => ({
  EinsatzPersonenPicker: ({ label, error, onChange }: { label: string; error?: string; onChange: (personId: string) => void }) => (
    <div>
      <span>{label}</span>
      {error ? <p>{error}</p> : null}
      <button type="button" onClick={() => onChange('person-1')}>
        Person 1 wählen
      </button>
    </div>
  ),
}));

vi.mock('@/features/einsatz', () => ({
  PersonHinzufuegenDialog: () => null,
}));

vi.mock('@/shared/ui/atoms/button.atom', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/shared/ui/molecules/dialog.molecule', () => {
  const DialogRoot = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div role="dialog">{children}</div> : null);
  DialogRoot.CloseButton = ({ onClose }: { onClose: () => void }) => (
    <button type="button" aria-label="Schließen" onClick={onClose}>
      Schließen
    </button>
  );
  DialogRoot.Title = ({ children, className }: { children: React.ReactNode; className?: string }) => <h2 className={className}>{children}</h2>;
  DialogRoot.Body = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
  DialogRoot.Footer = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;

  return {
    Dialog: DialogRoot,
  };
});

import { useEinsatzTeilnehmer, useJoinEinsatz, useMyEinsatzTeilnahme, useEinsatzPersonen, useRegistrierePerson } from '@/features/einsatz/api';

const mockedUseMyEinsatzTeilnahme = vi.mocked(useMyEinsatzTeilnahme);
const mockedUseEinsatzTeilnehmer = vi.mocked(useEinsatzTeilnehmer);
const mockedUseJoinEinsatz = vi.mocked(useJoinEinsatz);
const mockedUseEinsatzPersonen = vi.mocked(useEinsatzPersonen);
const mockedUseRegistrierePerson = vi.mocked(useRegistrierePerson);

describe('EinsatzBeitrittDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMyTeilnahmeState = { data: null, isLoading: false };

    mockedUseMyEinsatzTeilnahme.mockImplementation(
      () =>
        ({
          data: mockMyTeilnahmeState.data ? { data: mockMyTeilnahmeState.data.data } : null,
          isLoading: mockMyTeilnahmeState.isLoading,
        }) as ReturnType<typeof useMyEinsatzTeilnahme>,
    );

    mockedUseEinsatzTeilnehmer.mockReturnValue({
      data: { data: [] },
    } as ReturnType<typeof useEinsatzTeilnehmer>);

    mockJoinMutateAsync.mockResolvedValue(undefined);
    mockedUseJoinEinsatz.mockReturnValue({
      mutateAsync: mockJoinMutateAsync,
      isPending: false,
    } as ReturnType<typeof useJoinEinsatz>);

    mockedUseEinsatzPersonen.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useEinsatzPersonen>);

    mockedUseRegistrierePerson.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRegistrierePerson>);
  });

  it('zeigt ohne bestehende Zuordnung einen verpflichtenden AssignmentGate mit Fokus und ohne Dismiss-Aktion', () => {
    render(<EinsatzBeitrittDialog einsatzId="einsatz-1" isOpen={true} onClose={mockOnClose} onReturnToOverview={mockOnReturnToOverview} />);

    expect(screen.getByRole('heading', { name: /zuordnung erforderlich/i })).toHaveFocus();
    expect(screen.getByText(/arbeitsraum bleibt gesperrt/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abbrechen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /schließen/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zuordnung bestätigen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zur einsatzliste/i })).toBeInTheDocument();
  });

  it('bietet im Pflichtdialog einen Rückweg zur Einsatzliste an', async () => {
    const user = userEvent.setup();

    render(<EinsatzBeitrittDialog einsatzId="einsatz-1" isOpen={true} onClose={mockOnClose} onReturnToOverview={mockOnReturnToOverview} />);

    await user.click(screen.getByRole('button', { name: /zur einsatzliste/i }));

    expect(mockOnReturnToOverview).toHaveBeenCalledTimes(1);
  });

  it('schließt das Gate erst nach bestätigter Teilnahme im Cache/Query', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<EinsatzBeitrittDialog einsatzId="einsatz-1" isOpen={true} onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: /person 1 wählen/i }));
    await user.click(screen.getByRole('button', { name: /zuordnung bestätigen/i }));

    expect(mockJoinMutateAsync).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      data: { einsatzPersonId: 'person-1' },
    });
    expect(mockOnClose).not.toHaveBeenCalled();

    mockMyTeilnahmeState = {
      data: {
        data: {
          einsatzPersonId: 'person-1',
        },
      },
      isLoading: false,
    };

    rerender(<EinsatzBeitrittDialog einsatzId="einsatz-1" isOpen={true} onClose={mockOnClose} />);
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('lässt das Gate offen, wenn die Zuordnung fehlschlägt', async () => {
    const user = userEvent.setup();
    mockJoinMutateAsync.mockRejectedValueOnce(new Error('Zuordnung fehlgeschlagen'));

    render(<EinsatzBeitrittDialog einsatzId="einsatz-1" isOpen={true} onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: /person 1 wählen/i }));
    await user.click(screen.getByRole('button', { name: /zuordnung bestätigen/i }));

    expect(mockJoinMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('zeigt Edit-Modus mit Abbrechen, wenn bereits zugeordnet', () => {
    mockMyTeilnahmeState = {
      data: {
        data: {
          einsatzPersonId: 'person-1',
        },
      },
      isLoading: false,
    };

    render(<EinsatzBeitrittDialog einsatzId="einsatz-1" isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole('heading', { name: /zuordnung ändern/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
  });
});
