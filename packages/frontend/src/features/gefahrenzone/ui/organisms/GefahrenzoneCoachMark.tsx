/**
 * GefahrenzoneCoachMark (Issue #627, G5)
 *
 * Einmalige Onboarding-Tour, die erscheint, wenn der Nutzer erstmals die
 * Verknüpfte Ansicht (Split-View) mit aktiven Gefahrenzonen öffnet.
 * 4 Steps; Skip- oder „Verstanden"-Button setzt den Persist-Flag.
 *
 * Bewusst kein Headless-UI-Dialog — das würde einen Focus-Trap erzwingen und
 * über die Karten-/Matrix-Controls „schwimmen". Stattdessen ein leichter
 * Overlay + zentriertes Panel, das per `Esc` oder Button geschlossen wird.
 * `@media (prefers-reduced-motion: reduce)` wird respektiert (keine Entry-
 * Transitions).
 */

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { PiArrowRight, PiMapPin, PiSiren, PiSquaresFour, PiX } from 'react-icons/pi';
import { splitViewStore } from '@/features/einsatz/stores/split-view.store';
import { useGefahrenzonen } from '../../api';
import { onboardingActions, onboardingStore } from '../../stores/onboarding.store';

interface CoachStep {
  title: string;
  body: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const STEPS: CoachStep[] = [
  {
    title: 'Gefahrenmatrix',
    body: 'Die Matrix zeigt alle Gefahren × Schutzobjekte auf einen Blick. Klick eine Zelle an, um die Warnstufe zu ändern.',
    Icon: PiSquaresFour,
  },
  {
    title: 'Zonen auf der Karte',
    body: 'Rechts zeichnest du Gefahrenzonen auf die Lagekarte. Jede Zone ist mit einer Matrix-Zelle verknüpft.',
    Icon: PiMapPin,
  },
  {
    title: 'Verknüpfte Ansicht',
    body: 'Klick auf eine Matrix-Zelle zoomt die Karte auf die zugehörigen Zonen. Klick auf eine Zone scrollt die Matrix zur passenden Zelle.',
    Icon: PiArrowRight,
  },
  {
    title: 'AKUT-Broadcast',
    body: 'Wechselst du eine Warnstufe auf AKUT, bestätigst du einen Broadcast an alle Teilnehmer: Toast + Sound. Wichtig wird so nicht übersehen.',
    Icon: PiSiren,
  },
];

export interface GefahrenzoneCoachMarkProps {
  einsatzId: string;
}

export function GefahrenzoneCoachMark({ einsatzId }: GefahrenzoneCoachMarkProps) {
  const coachMarkSeen = useStore(onboardingStore, (s) => s.coachMarkSeen);
  const isSplitActive = useStore(splitViewStore, (s) => s.isActive);
  const { data: zonen = [] } = useGefahrenzonen(einsatzId);
  const [stepIndex, setStepIndex] = useState(0);

  const shouldShow = !coachMarkSeen && isSplitActive && zonen.length > 0;

  const handleSkip = useCallback(() => {
    onboardingActions.markSeen();
    setStepIndex(0);
  }, []);

  const handleNext = useCallback(() => {
    setStepIndex((idx) => {
      if (idx >= STEPS.length - 1) {
        onboardingActions.markSeen();
        return 0;
      }
      return idx + 1;
    });
  }, []);

  const handlePrev = useCallback(() => {
    setStepIndex((idx) => Math.max(0, idx - 1));
  }, []);

  useEffect(() => {
    if (!shouldShow) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleSkip();
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        handleNext();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shouldShow, handleSkip, handleNext, handlePrev]);

  if (!shouldShow) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const { Icon } = step;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="coach-mark-title"
      aria-describedby="coach-mark-body"
      data-coach-mark
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto w-full max-w-lg rounded-panel border border-border-subtle bg-surface-panel p-panel shadow-panel">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-action-primary/10 text-action-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 id="coach-mark-title" className="text-title-sm font-semibold text-text-primary">
                {step.title}
              </h2>
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Tour überspringen"
                className="rounded-control p-1 text-text-muted hover:bg-surface-raised hover:text-text-primary focus:shadow-focus focus:outline-none"
              >
                <PiX className="size-4" aria-hidden />
              </button>
            </div>
            <p id="coach-mark-body" className="mt-1 text-body-sm text-text-secondary">
              {step.body}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-body-xs text-text-muted" aria-live="polite">
                Schritt {stepIndex + 1} von {STEPS.length}
              </span>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button type="button" onClick={handlePrev} className="rounded-control px-3 py-1 text-body-sm text-text-secondary hover:bg-surface-raised focus:shadow-focus focus:outline-none">
                    Zurück
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-control bg-action-primary px-3 py-1 text-body-sm font-semibold text-text-inverse shadow-button-primary hover:bg-action-primary-hover focus:shadow-focus focus:outline-none"
                  autoFocus
                >
                  {isLast ? 'Verstanden' : 'Weiter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
