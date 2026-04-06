import { MAP_STYLES } from '@/features/lagekarte/utils';
import { MAP_DEFAULTS } from '@/features/lagekarte/utils/map-config';
import { useColorMode } from '@/shared/hooks/use-color-mode';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import 'maplibre-gl/dist/maplibre-gl.css';
import type * as React from 'react';
import { useState } from 'react';
import { PiWarning } from 'react-icons/pi';
import { Map, NavigationControl } from 'react-map-gl/maplibre';
import './lagekarte-view.css';

export type LagekarteMode = 'standard' | 'fullscreen' | 'presentation';

export type LagekarteSearchParams = {
  mode?: LagekarteMode;
};

interface LagekarteViewProps {
  einsatzId: string;
  mode?: LagekarteMode;
}

export const LagekarteView: React.FC<LagekarteViewProps> = ({ mode = 'standard' }) => {
  const { resolvedColorMode } = useColorMode();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const mapStyle = resolvedColorMode === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light;

  if (hasError) {
    return (
      <div
        className={cn(
          'w-full overflow-hidden rounded-lg',
          'flex flex-col items-center justify-center',
          'bg-surface-raised',
          'border-2 border-dashed border-border-subtle',
          mode === 'standard' && 'h-[600px] md:h-[calc(100vh-120px)]',
          (mode === 'fullscreen' || mode === 'presentation') && 'h-screen',
        )}
        role="alert"
        aria-live="assertive"
      >
        <PiWarning className="mb-4 h-12 w-12 text-status-warning-text" />
        <h3 className="mb-2 text-lg font-semibold text-text-primary">Karte konnte nicht geladen werden</h3>
        <p className="mb-4 text-center text-sm text-text-muted">
          Die Karten-Tiles konnten nicht vom Server geladen werden.
          <br />
          Bitte überprüfen Sie Ihre Internetverbindung.
        </p>
        <Button
          intent="primary"
          appearance="filled"
          size="md"
          onClick={() => {
            setHasError(false);
            setIsLoading(true);
          }}
        >
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg', mode === 'standard' && 'h-[600px] md:h-[calc(100vh-180px)]', (mode === 'fullscreen' || mode === 'presentation') && 'h-screen')}>
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-panel/80">
          <Spinner type="ring" size="lg" />
        </div>
      )}

      <Map
        initialViewState={{
          longitude: MAP_DEFAULTS.longitude,
          latitude: MAP_DEFAULTS.latitude,
          zoom: MAP_DEFAULTS.zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        aria-label="Lagekarte"
      >
        <NavigationControl position="top-right" />
      </Map>
    </div>
  );
};
