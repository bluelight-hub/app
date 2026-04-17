import type { ComponentType } from 'react';
import { PiFire, PiShieldCheck, PiSquare, PiWarning, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { WARNSTUFE_CHIP_STYLES } from '@/features/lagekarte/detail-providers/warnstufe-style';
import { WARNSTUFE_LABELS, type WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const WARNSTUFE_ICONS: Record<WarnstufeValue, IconType> = {
  KEINE: PiSquare,
  NIEDRIG: PiShieldCheck,
  MITTEL: PiWarning,
  HOCH: PiWarningCircle,
  AKUT: PiFire,
};

/**
 * Größen-Stile — pro Variante das Padding, die Textgröße und die Icon-Größe.
 * `xs` und `sm` blenden den vollen Namen aus und zeigen nur das Kürzel (compact).
 */
const SIZE_STYLES: Record<WarnstufeChipSize, { container: string; icon: string; kuerzelText: string }> = {
  xs: { container: 'gap-0.5 px-1 py-0 text-[10px] leading-tight', icon: 'size-3', kuerzelText: 'text-[10px]' },
  sm: { container: 'gap-1 px-1.5 py-0.5 text-xs leading-tight', icon: 'size-3.5', kuerzelText: 'text-xs' },
  md: { container: 'gap-1.5 px-2 py-0.5 text-sm leading-snug', icon: 'size-4', kuerzelText: 'text-sm' },
};

export type WarnstufeChipVariant = 'solid' | 'outline' | 'ghost';
export type WarnstufeChipSize = 'xs' | 'sm' | 'md';

export interface WarnstufeChipProps {
  warnstufe: WarnstufeValue;
  /** Darstellungsvariante (solid = gefüllt, outline = nur Rand, ghost = minimal). Default: solid. */
  variant?: WarnstufeChipVariant;
  /** Größe. Default: md. */
  size?: WarnstufeChipSize;
  /** Zeigt den vollständigen Warnstufen-Namen (sonst nur Icon + Kürzel). Default: true ab `md`. */
  showLabel?: boolean;
  /** Optionale zusätzliche Klassen. */
  className?: string;
  /** aria-label überschreibt die Default-Beschreibung "Warnstufe {Label}". */
  'aria-label'?: string;
}

/**
 * Atom-Komponente für eine Warnstufe-Anzeige mit drei Signalen (Ring-1-Regel):
 * Farbe, Icon und Kürzel. Der volle Name wird ab `size="md"` und `showLabel` sichtbar.
 *
 * AKUT trägt zusätzlich eine Ring-Pulse-Animation (`animate-warnstufe-akut-pulse`).
 * Bei `prefers-reduced-motion: reduce` wird die Animation im globalen CSS durch
 * einen statischen Doppel-Ring ersetzt — die Stufe bleibt visuell eindeutig.
 */
export function WarnstufeChip({ warnstufe, variant = 'solid', size = 'md', showLabel, className, 'aria-label': ariaLabel }: WarnstufeChipProps) {
  const style = WARNSTUFE_CHIP_STYLES[warnstufe];
  const sizeStyle = SIZE_STYLES[size];
  const Icon = WARNSTUFE_ICONS[warnstufe];
  const label = WARNSTUFE_LABELS[warnstufe];

  const resolvedShowLabel = showLabel ?? size === 'md';
  const variantClasses = getVariantClasses(variant);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        sizeStyle.container,
        variantClasses.bg(style.bg),
        variantClasses.text(style.text),
        variantClasses.border(style.border),
        warnstufe === 'AKUT' && 'animate-warnstufe-akut-pulse',
        className,
      )}
      role={resolvedShowLabel ? undefined : 'img'}
      aria-label={ariaLabel ?? `Warnstufe ${label}`}
      data-warnstufe={warnstufe}
    >
      <Icon className={cn(sizeStyle.icon, style.icon)} aria-hidden />
      <span className={cn('font-mono font-bold', sizeStyle.kuerzelText, style.text)}>{style.kuerzel}</span>
      {resolvedShowLabel ? <span className="font-sans">{label}</span> : null}
    </span>
  );
}

/**
 * Mappt die Variant auf Tailwind-Klassen. Wir übergeben die Basis-Klassen als Parameter,
 * damit die Varianten gezielt aus der Ring-1-Basis-Palette wählen können.
 */
function getVariantClasses(variant: WarnstufeChipVariant) {
  return {
    bg: (base: string) => (variant === 'solid' ? base : variant === 'outline' ? 'bg-transparent' : 'bg-transparent'),
    text: (base: string) => base,
    border: (base: string) => (variant === 'ghost' ? 'border-transparent' : base),
  };
}
