import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzCreateForm } from '../EinsatzCreateForm';

const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/einsatz', async () => {
  const actual = await vi.importActual<typeof import('@/features/einsatz')>('@/features/einsatz');

  return {
    ...actual,
    useCreateEinsatz: () => ({
      mutateAsync: mockMutateAsync,
    }),
  };
});

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: {
    SlideIn: ({ isOpen, title, description, children }: { isOpen: boolean; title: string; description: string; children: React.ReactNode }) =>
      isOpen ? (
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      ) : null,
  },
}));

describe('EinsatzCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      id: 'einsatz-42',
    });
  });

  it('führt nach erfolgreicher Erstellung direkt in den Workspace', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(<EinsatzCreateForm isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /einsatz erstellen und öffnen/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('einsatz-42');
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/übersicht',
      params: { einsatzId: 'einsatz-42' },
    });
  });

  it('behält Eingaben bei kurzem Schließen des Panels bei', () => {
    const onClose = vi.fn();
    const { rerender } = render(<EinsatzCreateForm isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/z\.b\. b1 - wohnungsbrand/i), {
      target: { value: 'Wohnungsbrand' },
    });

    rerender(<EinsatzCreateForm isOpen={false} onClose={onClose} />);
    rerender(<EinsatzCreateForm isOpen={true} onClose={onClose} />);

    expect(screen.getByDisplayValue('Wohnungsbrand')).toBeInTheDocument();
  });
});
