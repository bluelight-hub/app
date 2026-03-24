import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { PiWarning, PiArrowClockwise } from 'react-icons/pi';

interface LayerErrorBoundaryProps {
  children: ReactNode;
  layerName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface LayerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary für Lagekarte-Layer.
 *
 * Fängt Fehler in Map-Layern (z.B. MarkerClusterGroup, DrawingLayer) ab
 * und zeigt eine benutzerfreundliche Fehlermeldung an, ohne die gesamte
 * Karte zum Absturz zu bringen.
 *
 * @component
 * @example
 * ```tsx
 * <LayerErrorBoundary layerName="POI-Layer">
 *   <ClusteredPoiLayer einsatzId={einsatzId} />
 * </LayerErrorBoundary>
 * ```
 */
export class LayerErrorBoundary extends Component<LayerErrorBoundaryProps, LayerErrorBoundaryState> {
  constructor(props: LayerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LayerErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`${this.props.layerName} Error:`, error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute top-4 right-4 z-50 max-w-sm rounded-lg border-2 border-status-danger-border bg-status-danger-surface p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-danger-surface">
              <PiWarning className="h-4 w-4 text-status-danger-text" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-status-danger-text text-sm">Fehler im {this.props.layerName}</h4>
              <p className="mt-1 text-body-xs text-status-danger-text">{this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}</p>
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-status-danger-text px-2 py-1 font-medium text-text-inverse text-body-xs hover:opacity-90 focus-visible:outline-none focus-visible:shadow-focus-ring"
              >
                <PiArrowClockwise className="h-3 w-3" />
                Erneut laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
