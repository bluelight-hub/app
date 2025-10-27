import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { EtbFullscreenView } from './EtbFullscreenView';

// Mock dependencies
vi.mock('@/hooks/useEtb', () => ({
  useEtbInfinite: vi.fn(() => ({
    data: {
      pages: [
        {
          data: {
            eintraege: [
              {
                id: '1',
                text: 'Test Entry',
                sequenceNumber: 1,
                timestamp: new Date().toISOString(),
                kategorie: 'INFORMATION',
                createdBy: 'user-1',
                deletedAt: null,
                isAutomatic: false,
              },
            ],
          },
          pagination: { total: 1, page: 1, totalPages: 1 },
        },
      ],
    },
    isLoading: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
}));

vi.mock('@/hooks/useUsers', () => ({
  useUserNames: vi.fn(() => ({
    getUserName: vi.fn(() => 'Test User'),
  })),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/organisms/lagekarte/FullscreenCloseButton/FullscreenCloseButton', () => ({
  FullscreenCloseButton: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose} data-testid="close-button">
      Close
    </button>
  ),
}));

describe('EtbFullscreenView', () => {
  it('renders ETB entries in fullscreen mode', () => {
    render(<EtbFullscreenView einsatzId="test-einsatz-1" />);

    expect(screen.getByText('Einsatztagebuch')).toBeInTheDocument();
    expect(screen.getByText('Test Entry')).toBeInTheDocument();
  });

  it('displays close button', () => {
    render(<EtbFullscreenView einsatzId="test-einsatz-1" />);

    expect(screen.getByTestId('close-button')).toBeInTheDocument();
  });
});
