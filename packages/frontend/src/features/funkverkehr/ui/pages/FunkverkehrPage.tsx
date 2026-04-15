/**
 * FunkverkehrPage
 *
 * Einstiegspunkt für den Funkverkehr eines Einsatzes. Verdrahtet den
 * WebSocket-Hook `useEinsatzEvents` (Notfall-Toasts + Invalidierung)
 * und delegiert die eigentliche Darstellung an `FunkverkehrLayout`.
 */

import { useEinsatzEvents } from '@/features/funkverkehr/api/use-einsatz-events';
import { showNotfallAlertToast } from '@/features/funkverkehr/ui/molecules/NotfallAlertToast.molecule';
import { FunkverkehrLayout } from '@/features/funkverkehr/ui/organisms/FunkverkehrLayout.organism';

export interface FunkverkehrPageProps {
  einsatzId: string;
  tab: 'kanalplan' | 'protokoll';
  onTabChange: (tab: 'kanalplan' | 'protokoll') => void;
}

export function FunkverkehrPage({ einsatzId, tab, onTabChange }: FunkverkehrPageProps) {
  useEinsatzEvents({
    einsatzId,
    onNotfall: showNotfallAlertToast,
  });

  return <FunkverkehrLayout einsatzId={einsatzId} tab={tab} onTabChange={onTabChange} />;
}
