/**
 * Unit Tests für ServerOnboardingPage Component
 *
 * Tests für Server Onboarding Page mit URL-Parameter Integration.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerOnboardingPage } from './ServerOnboardingPage';

// Mock dependencies
vi.mock('../../hooks/use-url-params', () => ({
  useUrlParams: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

// Import nach mock setup
import { useUrlParams } from '../../hooks/use-url-params';
import { useNavigate } from '@tanstack/react-router';

describe('ServerOnboardingPage', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    mockNavigate = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
  });

  describe('Loading State', () => {
    it('should show loading state when exchange is in progress', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: 'https://api.example.de',
        isExchanging: true,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.getByText(/Verbinde mit Server.../i)).toBeInTheDocument();
      expect(screen.getByText(/Tausche Einladungscode ein.../i)).toBeInTheDocument();
    });

    it('should show ServerConnectLoading component during exchange', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: 'https://api.example.de',
        isExchanging: true,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      // ServerConnectLoading renders server URL
      expect(screen.getByText(/api.example.de/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error UI when exchange fails', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: 'https://api.example.de',
        isExchanging: false,
        error: new Error('Invite code expired'),
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.getByText(/Fehler beim Verbinden/i)).toBeInTheDocument();
      expect(screen.getByText(/Dieser Einladungslink ist abgelaufen/i)).toBeInTheDocument();
    });

    it('should show manual form fallback when exchange fails', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: 'https://api.example.de',
        isExchanging: false,
        error: new Error('Invite code expired'),
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.getByText(/Du kannst es manuell versuchen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Server-URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Einladungscode/i)).toBeInTheDocument();
    });

    it('should prefill form with server URL when exchange fails', () => {
      // Given (Arrange)
      const serverUrl = 'https://api.example.de';
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: serverUrl,
        isExchanging: false,
        error: new Error('Invite code expired'),
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      expect(serverUrlInput).toHaveValue(serverUrl);
    });
  });

  describe('Prefill State', () => {
    it('should show prefill hint when only server parameter is present', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: 'https://api.example.de',
        isExchanging: false,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.getByText(/Server-URL wurde aus dem Link übernommen/i)).toBeInTheDocument();
      expect(screen.getByText(/Bitte gib deinen Einladungscode ein/i)).toBeInTheDocument();
    });

    it('should prefill server URL field', () => {
      // Given (Arrange)
      const serverUrl = 'https://api.example.de';
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: serverUrl,
        isExchanging: false,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      expect(serverUrlInput).toHaveValue(serverUrl);
    });

    it('should show form with correct heading', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: 'https://api.example.de',
        isExchanging: false,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.getByText(/Server hinzufügen/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty form when no URL parameters present', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: null,
        isExchanging: false,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      const serverUrlInput = screen.getByLabelText(/Server-URL/i);
      const inviteCodeInput = screen.getByLabelText(/Einladungscode/i);

      expect(serverUrlInput).toHaveValue('');
      expect(inviteCodeInput).toHaveValue('');
    });

    it('should NOT show prefill hint when no URL parameters present', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: null,
        isExchanging: false,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.queryByText(/Server-URL wurde aus dem Link übernommen/i)).not.toBeInTheDocument();
    });
  });

  describe('Layout & Branding', () => {
    it('should render Bluelight Hub logo and heading', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: null,
        isExchanging: false,
        error: null,
      });

      // When (Act)
      render(<ServerOnboardingPage />);

      // Then (Assert)
      expect(screen.getByText('Bluelight Hub')).toBeInTheDocument();
    });

    it('should use AuthLayout wrapper', () => {
      // Given (Arrange)
      (useUrlParams as ReturnType<typeof vi.fn>).mockReturnValue({
        prefillServerUrl: null,
        isExchanging: false,
        error: null,
      });

      // When (Act)
      const { container } = render(<ServerOnboardingPage />);

      // Then (Assert)
      // AuthLayout renders a specific container structure
      const authCard = container.querySelector('.max-w-md');
      expect(authCard).toBeInTheDocument();
    });
  });
});
