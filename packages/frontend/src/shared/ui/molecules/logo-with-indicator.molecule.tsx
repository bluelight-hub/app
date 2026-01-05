import mobileLogo from '@/assets/brandbook/mobile-logo.png';
import mobileLogoWhite from '@/assets/brandbook/mobile-white.png';
import { useColorModeValue } from '@/shared/hooks/use-color-mode';

/**
 * Status-Typen für den Verbindungs-Indikator
 *
 * - `online`: Vollständig verbunden (grün, pulsierend)
 * - `offline`: Eingeschränkter Modus (gelb, statisch)
 * - `error`: Keine Verbindung (rot, statisch)
 * - `checking`: Verbindung wird geprüft (grau, pulsierend)
 */
export type IndicatorStatus = 'online' | 'offline' | 'error' | 'checking';

interface LogoWithIndicatorProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIndicator?: boolean;
  status?: IndicatorStatus;
}

const statusColorClasses: Record<IndicatorStatus, string> = {
  online: 'bg-green-400 animate-pulse-shadow',
  offline: 'bg-yellow-400',
  error: 'bg-red-500',
  checking: 'bg-gray-400 animate-pulse',
};

/**
 * Logo mit dynamischem Status-Indikator
 *
 * Zeigt das Bluelight Hub Logo mit einem optionalen
 * Status-Indikator, der den Verbindungszustand anzeigt.
 *
 * @param size - Größe des Logos
 * @param showIndicator - Ob der Indikator angezeigt werden soll
 * @param status - Verbindungsstatus für Indikator-Farbe
 */
export function LogoWithIndicator({ size = 'lg', showIndicator = true, status = 'online' }: LogoWithIndicatorProps) {
  const logoSrc = useColorModeValue(mobileLogo, mobileLogoWhite);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
    xl: 'h-24 w-24',
  };

  return (
    <div className="relative inline-block">
      <img src={logoSrc} alt="Bluelight Hub Logo" className={`${sizeClasses[size]} object-contain drop-shadow-[0_10px_30px_rgba(0,61,122,0.3)]`} />
      {showIndicator && <div className={`-right-0.5 -top-0.5 absolute h-4 w-4 rounded-full border-[3px] border-white dark:border-gray-800 ${statusColorClasses[status]}`} />}
    </div>
  );
}
