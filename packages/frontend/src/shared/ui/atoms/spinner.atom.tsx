import { cn } from '@/shared/ui/cn';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type?: 'wave' | 'dots' | 'ring' | 'pulse';
  className?: string;
  label?: string;
}

/**
 * Spinner-Komponente für Ladezustände
 *
 * Zeigt einen animierten Ladeindikator in verschiedenen Stilen an.
 *
 * @param size - Größe des Spinners
 * @param type - Stil des Spinners (wave, dots, ring, pulse)
 * @param className - Zusätzliche CSS-Klassen
 * @param label - Accessibillity Label (Default: "Laden...")
 */
export function Spinner({ size = 'md', type = 'wave', className, label }: SpinnerProps) {
  switch (type) {
    case 'wave':
      return <WaveSpinner size={size} className={className} label={label} />;
    case 'dots':
      return <DotsSpinner size={size} className={className} label={label} />;
    case 'ring':
      return <RingSpinner size={size} className={className} label={label} />;
    case 'pulse':
      return <PulseSpinner size={size} className={className} label={label} />;
    default:
      return null;
  }
}

interface SpecificSpinnerProps extends Omit<SpinnerProps, 'type'> {
  label?: string;
}

/**
 * Wave-Spinner - Animierte Wellen
 */
function WaveSpinner({ size = 'md', className, label = 'Laden...' }: SpecificSpinnerProps) {
  const sizeConfig = {
    xs: { height: 'h-8', width: 'w-0.5', gap: 'gap-0.5' },
    sm: { height: 'h-12', width: 'w-1', gap: 'gap-1' },
    md: { height: 'h-16', width: 'w-1.5', gap: 'gap-1' },
    lg: { height: 'h-20', width: 'w-2', gap: 'gap-1.5' },
    xl: { height: 'h-24', width: 'w-2.5', gap: 'gap-2' },
  };

  const config = sizeConfig[size];
  const waves = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div role="status" aria-label={label} className={cn('flex items-center justify-center', config.gap, className)}>
      {waves.map((index) => (
        <div
          key={index}
          className={cn('origin-center animate-wave-clean rounded-sm bg-action-primary', config.width, config.height)}
          style={{
            animationDelay: `${index * 0.1}s`,
            // Initialer Filter-Zustand für sofortigen Effekt
            filter: 'hue-rotate(90deg) blur(8px)',
            transform: 'scale(0)',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Dots-Spinner - Drei pulsierende Punkte
 */
function DotsSpinner({ size = 'md', className, label = 'Laden...' }: SpecificSpinnerProps) {
  const sizeConfig = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
  };

  const dotSize = sizeConfig[size];
  // Nutze currentColor wenn text-color über className gesetzt wird
  const hasTextColor = className?.includes('text-');

  return (
    <div role="status" aria-label={label} className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn('animate-pulse rounded-full', !hasTextColor && 'bg-action-primary', dotSize)}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.4s',
            ...(hasTextColor && { backgroundColor: 'currentColor' }),
          }}
        />
      ))}
    </div>
  );
}

/**
 * Ring-Spinner - Rotierender Ring
 */
function RingSpinner({ size = 'md', className, label = 'Laden...' }: SpecificSpinnerProps) {
  const sizeConfig = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  const ringSize = sizeConfig[size];
  // Nutze currentColor wenn text-color über className gesetzt wird
  const hasTextColor = className?.includes('text-');

  if (hasTextColor) {
    return (
      <div role="status" aria-label={label} className={cn('relative', ringSize, className)}>
        <div className={cn('absolute inset-0 rounded-full border-2', ringSize)} style={{ borderColor: 'currentColor', opacity: 0.25 }} />
        <div className={cn('absolute inset-0 animate-spin rounded-full border-2', ringSize)} style={{ borderColor: 'transparent', borderTopColor: 'currentColor' }} />
      </div>
    );
  }

  return (
    <div role="status" aria-label={label} className={cn('relative', ringSize, className)}>
      <div className={cn('absolute inset-0 rounded-full border-2 border-border-subtle', ringSize)} />
      <div className={cn('absolute inset-0 animate-spin rounded-full border-2 border-t-action-primary', ringSize)} />
    </div>
  );
}

/**
 * Pulse-Spinner - Pulsierender Kreis
 */
function PulseSpinner({ size = 'md', className, label = 'Laden...' }: SpecificSpinnerProps) {
  const sizeConfig = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  const pulseSize = sizeConfig[size];
  // Nutze currentColor wenn text-color über className gesetzt wird
  const hasTextColor = className?.includes('text-');

  return (
    <div role="status" aria-label={label} className={cn('relative', pulseSize, className)}>
      <div
        className={cn('absolute inset-0 animate-ping rounded-full opacity-75', !hasTextColor && 'bg-action-primary', pulseSize)}
        style={hasTextColor ? { backgroundColor: 'currentColor' } : undefined}
      />
      <div className={cn('relative rounded-full', !hasTextColor && 'bg-action-primary', pulseSize)} style={hasTextColor ? { backgroundColor: 'currentColor' } : undefined} />
    </div>
  );
}

/**
 * InlineSpinner - Wrapper für RingSpinner mit inline-optimierten Defaults
 *
 * Nutzt den bestehenden RingSpinner mit angepassten Standardwerten für Inline-Verwendung.
 * Erbt automatisch die Textfarbe des Containers durch currentColor.
 *
 * @param size - Größe des Spinners (xs ist Standard für inline)
 * @param className - Zusätzliche CSS-Klassen (text-* Klassen setzen die Farbe)
 * @param label - Accessibility Label (Default: "Laden...")
 */
export function InlineSpinner({ size = 'xs', className, label }: { size?: 'xs' | 'sm' | 'md'; className?: string; label?: string }) {
  // Stelle sicher, dass text-current gesetzt ist, falls keine text-* Klasse vorhanden
  const hasTextColor = className?.includes('text-');
  const finalClassName = cn(!hasTextColor && 'text-current', 'inline-block', className);

  return <RingSpinner size={size} className={finalClassName} label={label} />;
}
