import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { PiWarning } from 'react-icons/pi';

interface CommandPaletteErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface CommandPaletteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary für die Command Palette.
 *
 * Fängt Fehler in der Command Palette ab und zeigt eine benutzerfreundliche
 * Fehlermeldung an, ohne die gesamte Anwendung zum Absturz zu bringen.
 *
 * @component
 * @example
 * ```tsx
 * <CommandPaletteErrorBoundary>
 *   <CommandPalette {...props} />
 * </CommandPaletteErrorBoundary>
 * ```
 */
export class CommandPaletteErrorBoundary extends Component<CommandPaletteErrorBoundaryProps, CommandPaletteErrorBoundaryState> {
  constructor(props: CommandPaletteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): CommandPaletteErrorBoundaryState {
    // State aktualisieren, damit beim nächsten Render die Fallback-UI angezeigt wird
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Fehler an externe Logging-Services senden
    console.error('CommandPalette Error:', error, errorInfo);

    // Optional: Callback für externe Error-Handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback-UI bei Fehler
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-inverse/40 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-2xl bg-surface-panel p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-status-danger-surface">
                <PiWarning className="h-6 w-6 text-status-danger-text" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text-primary">Fehler in der Command Palette</h3>
              <p className="mb-6 text-sm text-text-secondary">{this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-action-primary-hover focus-visible:shadow-focus-ring focus-visible:outline-none"
                >
                  Erneut versuchen
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-border-subtle bg-surface-panel px-4 py-2 text-sm font-medium text-text-primary hover:bg-action-secondary focus-visible:shadow-focus-ring focus-visible:outline-none"
                >
                  Seite neu laden
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
