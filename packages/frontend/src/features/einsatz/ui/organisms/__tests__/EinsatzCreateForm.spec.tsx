import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzCreateForm } from '../EinsatzCreateForm';

const mockMutateAsync = vi.fn();
const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/features/einsatz', () => ({
  useCreateEinsatz: vi.fn(),
}));

vi.mock('@/shared/ui/atoms/button.atom', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/shared/ui/atoms/input.atom', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/atoms/textarea.atom', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/shared/ui/atoms/date-input.atom', () => ({
  DateInput: ({
    value,
    onChange,
    showIcon: _showIcon,
    includeTime: _includeTime,
    showNatoFormat: _showNatoFormat,
    ...props
  }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
    value?: string;
    onChange: (date: Date | null) => void;
    showIcon?: boolean;
    includeTime?: boolean;
    showNatoFormat?: boolean;
  }) => <input aria-label="Einsatzdatum" value={value ?? ''} onChange={(event) => onChange(event.target.value ? new Date(event.target.value) : null)} {...props} />,
}));

vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: {
    SlideIn: ({ isOpen, title, description, children, footer }: { isOpen: boolean; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) =>
      isOpen ? (
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
          {children}
          {footer ? <div>{footer}</div> : null}
        </div>
      ) : null,
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/api/use-address-search', () => ({
  useAddressSearch: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock('@/shared/api/use-plz-lookup', () => ({
  usePlzLookup: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
}));

import { useCreateEinsatz } from '@/features/einsatz';

const mockedUseCreateEinsatz = vi.mocked(useCreateEinsatz);

describe('EinsatzCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'einsatz-neu' });

    mockedUseCreateEinsatz.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as ReturnType<typeof useCreateEinsatz>);
  });

  it('validiert das Alarmstichwort feldnah und verhindert leere Anlagen', async () => {
    const user = userEvent.setup();

    render(<EinsatzCreateForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

    expect(await screen.findByText(/alarmstichwort ist erforderlich/i)).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('übergibt bei erfolgreicher Anlage die neue Einsatz-ID an den Aufrufer', async () => {
    const user = userEvent.setup();

    render(<EinsatzCreateForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/alarmstichwort/i), '  B 4 Wohnungsbrand  ');
    await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmstichwort: 'B 4 Wohnungsbrand',
        }),
      );
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('einsatz-neu');
    });
  });
});
