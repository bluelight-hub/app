import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { PiWarning } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button';
import { Card } from '@/shared/ui/atoms/card';
import { Heading } from '@/shared/ui/atoms/heading';
import { Text } from '@/shared/ui/atoms/text';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: ReactNode;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generische Error Boundary Komponente.
 *
 * Fängt Fehler in React-Komponenten ab und zeigt eine benutzerfreundliche
 * Fehlermeldung an, ohne die gesamte Anwendung zum Absturz zu bringen.
 *
 * @component
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example
 * // Mit Custom Fallback
 * ```tsx
 * <ErrorBoundary fallback={<div>Fehler aufgetreten</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example
 * // Mit Reset Keys (triggert automatisches Reset bei Änderung)
 * ```tsx
 * <ErrorBoundary resetKeys={[userId]}>
 *   <UserProfile userId={userId} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // State aktualisieren, damit beim nächsten Render die Fallback-UI angezeigt wird
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Fehler für Debugging loggen
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Optional: Callback für externe Error-Handler (z.B. Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset Error State wenn resetKeys sich ändern (z.B. Navigation zu anderer Seite)
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index]);
      if (hasResetKeyChanged) {
        this.handleReset();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom Fallback UI (falls übergeben)
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default Fallback UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <Card padding="lg" className="max-w-md">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <PiWarning className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <Heading size="md" className="mb-2">
                Ein Fehler ist aufgetreten
              </Heading>
              <Text className="mb-4 text-gray-600 dark:text-gray-400">{this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}</Text>
              <div className="flex gap-3">
                <Button onClick={this.handleReset} intent="primary">
                  Erneut versuchen
                </Button>
                <Button onClick={() => window.location.reload()} intent="secondary" appearance="ghost">
                  Seite neu laden
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
