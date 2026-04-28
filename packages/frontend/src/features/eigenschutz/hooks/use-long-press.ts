import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface UseLongPressOptions {
  /**
   * Callback bei abgeschlossenem Long-Press (Pointer mind. `delay` ms gehalten).
   *
   * Kann `false` zurückgeben, um zu signalisieren, dass der Callback im
   * aktuellen Zustand ein No-Op war (z. B. weil bereits Multi-Modus aktiv
   * ist und ein erneuter Long-Press nichts triggert). In diesem Fall wird
   * der nachfolgende synthetische Click NICHT als Long-Press-Suppress
   * konsumiert, sodass ein regulärer Toggle-Click korrekt durchgeht
   * (Story 3.2 Code-Review F2).
   */
  onLongPress: () => boolean | void;
  /**
   * Verzögerung in Millisekunden, bevor der Long-Press feuert. Default 500 ms
   * (UX-Spec Z. 1085–1100, Long-Press-Konvention).
   */
  delay?: number;
}

export interface UseLongPressReturn {
  onPointerDown: (event?: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: ReactPointerEvent<HTMLElement>) => void;
  /**
   * Konsumiert das „Long-Press hat gefeuert"-Flag und liefert `true`, wenn
   * der gerade verarbeitete Click vom Long-Press-Trigger ausgelöst wurde
   * und vom Caller ignoriert werden sollte. Liefert `false`, wenn es ein
   * regulärer Click ist. Nach jedem Aufruf ist das Flag wieder `false`.
   *
   * Hintergrund: Browser feuern nach `pointerdown`/`pointerup` einen
   * synthetischen `click`-Event auf demselben Target. Wenn ein Long-Press
   * bereits vor dem Pointer-Up ausgelöst hat (und z. B. einen Modus-Wechsel
   * triggert), würde der nachfolgende `click` im neuen Modus eine
   * Selection-Toggle-Aktion auslösen, die die gerade gesetzte Selection
   * sofort wieder wegnimmt. Dieses Helper-Flag erlaubt dem Caller, den
   * Click in dem Fall zu suppressen.
   */
  consumeClickIfLongPressFired: () => boolean;
}

const DEFAULT_DELAY_MS = 500;

/**
 * Long-Press-Trigger via Pointer-Events (Touch + Mouse + Pen).
 *
 * Liefert ein Spread-Object für die Karte. Der Timer wird auf
 * `pointerdown` gestartet und bei jedem `pointerup` / `pointerleave` /
 * `pointercancel` gecleart, sodass kurze Klicks **kein** Long-Press
 * auslösen.
 *
 * **`onContextMenu`-Workaround:** Mobile-Browser feuern auf langem Touch
 * den nativen `contextmenu`-Event und zeigen das System-Menü; wir
 * `preventDefault()`-en das, damit der eigene Long-Press die alleinige
 * Aktion bleibt.
 *
 * **Closure-Stabilität:** `onLongPress` wird in einem Ref gehalten und
 * im Effect synchronisiert, damit ein verzögerter Timer-Resolve nicht
 * mit einer veralteten Caller-Closure feuert (typisch bei Inline-
 * Lambdas auf Re-Renders).
 *
 * **Unmount-Cleanup:** Der Timer wird bei Component-Unmount aktiv
 * gecleart, damit ein Long-Press auf einer in der Zwischenzeit aus dem
 * DOM entfernten Karte nicht mehr feuert.
 */
export function useLongPress({ onLongPress, delay = DEFAULT_DELAY_MS }: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLongPressRef = useRef(onLongPress);
  const justFiredRef = useRef(false);

  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const onPointerDown = useCallback(
    (event?: ReactPointerEvent<HTMLElement>) => {
      // E6: nur primärer Pointer-Button (links/Touch/Pen-Tip). Rechtsklick,
      // Mausrad-Klick und Multi-Touch-Gesten dürfen den Long-Press-Timer
      // nicht starten. Wenn der Caller das Event nicht reicht (Tests/Synthetics),
      // gehen wir vom Default „primärer Klick" aus.
      if (event && (event.button !== 0 || event.isPrimary === false)) {
        return;
      }
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // F2: nur dann den Click-Suppress-Flag setzen, wenn der Caller-Callback
        // tatsächlich eine Action ausgeführt hat (Default-Annahme: void/true).
        // Ein No-Op-Callback (Return `false`) lässt den nachfolgenden
        // synthetischen Click ungefiltert durch.
        const result = onLongPressRef.current();
        if (result !== false) {
          justFiredRef.current = true;
        }
      }, delay);
    },
    [clearTimer, delay],
  );

  const onContextMenu = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    // Verhindert das Browser-Context-Menü, das Mobile-Safari/Chrome auf
    // langem Touch zeigt — sonst kollidiert es mit unserem Long-Press.
    event.preventDefault();
  }, []);

  const consumeClickIfLongPressFired = useCallback(() => {
    if (justFiredRef.current) {
      justFiredRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    onPointerDown,
    onPointerUp: clearTimer,
    onPointerLeave: clearTimer,
    onPointerCancel: clearTimer,
    onContextMenu,
    consumeClickIfLongPressFired,
  };
}
