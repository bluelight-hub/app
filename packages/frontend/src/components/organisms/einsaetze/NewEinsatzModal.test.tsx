import { CreateEinsatzDto } from '@bluelight-hub/shared/client/models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest';

// Mock für useCreateEinsatz Hook
vi.mock('../../../hooks/einsatz/useEinsatzQueries', () => ({
  useCreateEinsatz: vi.fn(),
}));

// Mock für logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock für react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock für EinsatzContext
const mockSelectEinsatz = vi.fn();
vi.mock('../../../contexts/EinsatzContext', () => ({
  useEinsatzContext: () => ({
    selectEinsatz: mockSelectEinsatz,
  }),
}));

// Mock für Ant Design notification
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    notification: {
      success: vi.fn(),
      error: vi.fn(),
    },
    Modal: ({ children, open, onCancel: _onCancel, title, onKeyDown }: any) => {
      if (!open) return null;
      return (
        <div data-testid="modal" role="dialog" aria-label={title} onKeyDown={onKeyDown}>
          <div data-testid="modal-title">{title}</div>
          {children}
        </div>
      );
    },
  };
});

import { useCreateEinsatz } from '../../../hooks/einsatz/useEinsatzQueries';
import { logger } from '../../../utils/logger';
import { NewEinsatzModal } from './NewEinsatzModal';

// Get mocked notification functions
import { notification } from 'antd';
const mockNotification = notification as { success: any; error: any };

describe('NewEinsatzModal', { timeout: 10000 }, () => {
  const mockMutateAsync = vi.fn();
  const mockUseCreateEinsatz = useCreateEinsatz as MockedFunction<typeof useCreateEinsatz>;

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockSelectEinsatz.mockClear();

    mockUseCreateEinsatz.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isIdle: true,
      isSuccess: false,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      status: 'idle',
      variables: undefined,
      submittedAt: 0,
      mutate: vi.fn(),
      reset: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders modal with correct title when open', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Neuer Einsatz');
    });

    it('does not render when closed', () => {
      render(<NewEinsatzModal {...defaultProps} open={false} />);

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('renders form fields with correct labels and placeholders', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      expect(screen.getByLabelText('Einsatz Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('z.B. Brandeinsatz Hauptstraße')).toBeInTheDocument();

      expect(screen.getByLabelText('Beschreibung (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Zusätzliche Details zum Einsatz...')).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /einsatz erstellen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty name field', async () => {
      const user = userEvent.setup();
      render(<NewEinsatzModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Bitte geben Sie einen Namen für den Einsatz ein')).toBeInTheDocument();
      });
    });

    it('shows validation error for name that is too short', async () => {
      const user = userEvent.setup();
      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'a');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Der Name muss mindestens 2 Zeichen lang sein')).toBeInTheDocument();
      });
    });

    it('shows validation error for name with only whitespace', async () => {
      const user = userEvent.setup();
      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, '   ');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Der Name darf nicht nur aus Leerzeichen bestehen')).toBeInTheDocument();
      });
    });

    it('limits name input to 100 characters via maxLength attribute', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      expect(nameInput).toHaveAttribute('maxlength', '100');
    });

    it('limits description input to 500 characters via maxLength attribute', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      const descriptionInput = screen.getByLabelText('Beschreibung (optional)');
      expect(descriptionInput).toHaveAttribute('maxlength', '500');
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'Test Einsatz' });

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const descriptionInput = screen.getByLabelText('Beschreibung (optional)');
      await user.type(descriptionInput, 'Test Beschreibung');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Test Einsatz',
          beschreibung: 'Test Beschreibung',
        } as CreateEinsatzDto);
      });
    });

    it('submits form with only name (no description)', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'Test Einsatz' });

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Test Einsatz',
          beschreibung: undefined,
        } as CreateEinsatzDto);
      });
    });

    it('trims whitespace from form values', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'Test Einsatz' });

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, '  Test Einsatz  ');

      const descriptionInput = screen.getByLabelText('Beschreibung (optional)');
      await user.type(descriptionInput, '  Test Beschreibung  ');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Test Einsatz',
          beschreibung: 'Test Beschreibung',
        } as CreateEinsatzDto);
      });
    });

    it('shows success notification and navigates to einsatzdaten page on successful submission', async () => {
      const user = userEvent.setup();
      const newEinsatz = { id: '123', name: 'Test Einsatz' };
      mockMutateAsync.mockResolvedValueOnce(newEinsatz);

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNotification.success).toHaveBeenCalledWith({
          message: 'Einsatz erstellt',
          description: 'Der Einsatz \"Test Einsatz\" wurde erfolgreich erstellt und geöffnet.',
          duration: 4,
          placement: 'topRight',
        });
        expect(mockSelectEinsatz).toHaveBeenCalledWith(newEinsatz);
        expect(mockNavigate).toHaveBeenCalledWith('/app/einsatzdaten');
        expect(defaultProps.onClose).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('shows error notification on failed submission', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Server error';
      mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith({
          message: 'Fehler beim Erstellen',
          description: errorMessage,
          duration: 6,
          placement: 'topRight',
        });
        expect(defaultProps.onClose).not.toHaveBeenCalled();
        expect(defaultProps.onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<NewEinsatzModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('resets form when modal is closed and reopened', () => {
      const { rerender } = render(<NewEinsatzModal {...defaultProps} open={false} />);

      // Open modal and fill form
      rerender(<NewEinsatzModal {...defaultProps} open={true} />);
      const nameInput = screen.getByLabelText('Einsatz Name') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      expect(nameInput.value).toBe('Test');

      // Close and reopen modal
      rerender(<NewEinsatzModal {...defaultProps} open={false} />);
      rerender(<NewEinsatzModal {...defaultProps} open={true} />);

      const newNameInput = screen.getByLabelText('Einsatz Name') as HTMLInputElement;
      expect(newNameInput.value).toBe('');
    });

    it('handles Escape key to close modal', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      const modal = screen.getByTestId('modal');
      fireEvent.keyDown(modal, { key: 'Escape' });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseCreateEinsatz.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isIdle: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: 'pending',
        variables: undefined,
        submittedAt: 0,
        mutate: vi.fn(),
        reset: vi.fn(),
      });
    });

    it('shows loading state on submit button when pending', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /wird erstellt/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('disables form and buttons when pending', () => {
      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      const descriptionInput = screen.getByLabelText('Beschreibung (optional)');
      const submitButton = screen.getByRole('button', { name: /wird erstellt/i });
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });

      expect(nameInput).toBeDisabled();
      expect(descriptionInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Logging', () => {
    it('logs debug message when creating Einsatz', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'Test Einsatz' });

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.debug).toHaveBeenCalledWith('Creating new Einsatz via modal', { name: 'Test Einsatz' });
      });
    });

    it('logs success message when Einsatz is created', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: '123', name: 'Test Einsatz' });

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith('Einsatz successfully created via modal', {
          name: 'Test Einsatz',
          id: '123',
        });
      });
    });

    it('logs error message when creation fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Server error';
      mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Failed to create Einsatz via modal', { error: errorMessage });
      });
    });

    it('selects created einsatz and navigates to einsatzdaten page', async () => {
      const user = userEvent.setup();
      const newEinsatz = {
        id: '456',
        name: 'Test Navigation Einsatz',
        beschreibung: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user123',
        user: {
          id: 'user123',
          email: 'test@example.com',
          username: 'testuser',
          profile: { firstName: 'Test', lastName: 'User' },
        },
      };
      mockMutateAsync.mockResolvedValueOnce(newEinsatz);

      render(<NewEinsatzModal {...defaultProps} />);

      const nameInput = screen.getByLabelText('Einsatz Name');
      await user.type(nameInput, 'Test Navigation Einsatz');

      const submitButton = screen.getByRole('button', { name: /einsatz erstellen/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSelectEinsatz).toHaveBeenCalledWith(newEinsatz);
        expect(mockNavigate).toHaveBeenCalledWith('/app/einsatzdaten');
      });
    });
  });
});
