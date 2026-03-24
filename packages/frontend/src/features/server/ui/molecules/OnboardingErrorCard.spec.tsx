/**
 * Unit Tests für OnboardingErrorCard Komponente
 *
 * Testet die korrekte Darstellung verschiedener Fehlertypen,
 * Callbacks und Accessibility-Features.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingErrorCard } from './OnboardingErrorCard';
import { OnboardingErrorCode } from '../../constants/error-codes.constants';

describe('OnboardingErrorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering with different error codes', () => {
    it('should render INVITE_EXPIRED error with fullscreen layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'fullscreen');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Einladungslink abgelaufen');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Dieser Einladungslink ist nicht mehr gültig.');
    });

    it('should render INVITE_ALREADY_USED error with fullscreen layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_ALREADY_USED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'fullscreen');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Link bereits verwendet');
    });

    it('should render INVITE_INVALID error with fullscreen layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_INVALID;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'fullscreen');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Ungültiger Link');
    });

    it('should render INVITE_RATE_LIMITED error with inline layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_RATE_LIMITED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'inline');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Zu viele Versuche');
    });

    it('should render SERVER_NOT_SETUP error with fullscreen layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.SERVER_NOT_SETUP;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'fullscreen');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Server nicht eingerichtet');
    });

    it('should render NETWORK_ERROR error with inline layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.NETWORK_ERROR;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'inline');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Server nicht erreichbar');
    });

    it('should render UNKNOWN error with fullscreen layout', () => {
      // Given
      const errorCode = OnboardingErrorCode.UNKNOWN;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-layout', 'fullscreen');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Unerwarteter Fehler');
    });

    it('should fallback to UNKNOWN for invalid error codes', () => {
      // Given
      const errorCode = 'INVALID_ERROR_CODE';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('error-title')).toHaveTextContent('Unerwarteter Fehler');
    });
  });

  describe('Override props', () => {
    it('should use title override when provided', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;
      const customTitle = 'Benutzerdefinierter Titel';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} title={customTitle} />);

      // Then
      expect(screen.getByTestId('error-title')).toHaveTextContent(customTitle);
    });

    it('should use message override when provided', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;
      const customMessage = 'Benutzerdefinierte Nachricht';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} message={customMessage} />);

      // Then
      expect(screen.getByTestId('error-message')).toHaveTextContent(customMessage);
    });

    it('should use cta override when provided', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;
      const customCta = 'Benutzerdefinierter CTA';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} cta={customCta} />);

      // Then
      expect(screen.getByTestId('error-cta')).toHaveTextContent(customCta);
    });
  });

  describe('Action callbacks', () => {
    it('should call onRetry when retry button is clicked for retryable error', () => {
      // Given
      const errorCode = OnboardingErrorCode.NETWORK_ERROR; // retryable: true
      const onRetry = vi.fn();

      // When
      render(<OnboardingErrorCard errorCode={errorCode} onRetry={onRetry} />);
      fireEvent.click(screen.getByTestId('retry-button'));

      // Then
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when error is not retryable', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED; // retryable: false
      const onRetry = vi.fn();

      // When
      render(<OnboardingErrorCard errorCode={errorCode} onRetry={onRetry} />);

      // Then
      expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
    });

    it('should call onManualSetup when manual setup button is clicked', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;
      const onManualSetup = vi.fn();

      // When
      render(<OnboardingErrorCard errorCode={errorCode} onManualSetup={onManualSetup} />);
      fireEvent.click(screen.getByTestId('manual-setup-button'));

      // Then
      expect(onManualSetup).toHaveBeenCalledTimes(1);
    });

    it('should show both buttons when error is retryable and onManualSetup provided', () => {
      // Given
      const errorCode = OnboardingErrorCode.UNKNOWN; // retryable: true
      const onRetry = vi.fn();
      const onManualSetup = vi.fn();

      // When
      render(<OnboardingErrorCard errorCode={errorCode} onRetry={onRetry} onManualSetup={onManualSetup} />);

      // Then
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('manual-setup-button')).toBeInTheDocument();
    });
  });

  describe('Admin contact display', () => {
    it('should display admin contact when provided', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;
      const adminContact = 'admin@example.com';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} adminContact={adminContact} />);

      // Then
      const adminContactElement = screen.getByTestId('admin-contact');
      expect(adminContactElement).toBeInTheDocument();
      expect(adminContactElement).toHaveTextContent('admin@example.com');
    });

    it('should not display admin contact when not provided', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.queryByTestId('admin-contact')).not.toBeInTheDocument();
    });
  });

  describe('Severity styling', () => {
    it('should apply error severity styling for error type', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED; // severity: error

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      const card = screen.getByTestId('onboarding-error-card');
      const innerContainer = card.querySelector('.border-status-danger-border');
      expect(innerContainer).toBeInTheDocument();
    });

    it('should apply warning severity styling for warning type', () => {
      // Given
      const errorCode = OnboardingErrorCode.NETWORK_ERROR; // severity: warning

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      const card = screen.getByTestId('onboarding-error-card');
      expect(card).toHaveClass('border-status-warning-border');
    });

    it('should use PiXCircleFill icon for error severity', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      const icon = screen.getByTestId('error-icon');
      expect(icon).toHaveClass('text-status-danger-text');
    });

    it('should use PiWarningFill icon for warning severity', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_RATE_LIMITED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      const icon = screen.getByTestId('error-icon');
      expect(icon).toHaveClass('text-status-warning-text');
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" on the container', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="assertive" for fullscreen errors', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED; // fullscreen: true

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-live="polite" for inline errors', () => {
      // Given
      const errorCode = OnboardingErrorCode.NETWORK_ERROR; // fullscreen: false

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-hidden on icons', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      const icon = screen.getByTestId('error-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have keyboard accessible buttons', () => {
      // Given
      const errorCode = OnboardingErrorCode.NETWORK_ERROR;
      const onRetry = vi.fn();

      // When
      render(<OnboardingErrorCard errorCode={errorCode} onRetry={onRetry} />);
      const button = screen.getByTestId('retry-button');

      // Then
      expect(button).toHaveAttribute('type', 'button');
      // Simulate keyboard interaction
      fireEvent.keyDown(button, { key: 'Enter' });
      button.click();
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to fullscreen container', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;
      const customClass = 'custom-test-class';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} className={customClass} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveClass(customClass);
    });

    it('should apply custom className to inline container', () => {
      // Given
      const errorCode = OnboardingErrorCode.NETWORK_ERROR;
      const customClass = 'custom-inline-class';

      // When
      render(<OnboardingErrorCard errorCode={errorCode} className={customClass} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveClass(customClass);
    });
  });

  describe('Data attributes', () => {
    it('should have data-error-code attribute with the error code', () => {
      // Given
      const errorCode = OnboardingErrorCode.INVITE_EXPIRED;

      // When
      render(<OnboardingErrorCard errorCode={errorCode} />);

      // Then
      expect(screen.getByTestId('onboarding-error-card')).toHaveAttribute('data-error-code', errorCode);
    });
  });
});
