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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <PiWarning className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900 text-lg dark:text-gray-100">Fehler in der Command Palette</h3>
              <p className="mb-6 text-gray-600 text-sm dark:text-gray-400">{this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Erneut versuchen
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
