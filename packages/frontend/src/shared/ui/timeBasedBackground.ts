import { useMemo } from 'react';
import dayImage from '@/assets/images/day.png';
import eveningImage from '@/assets/images/evening.png';
import nightImage from '@/assets/images/night.png';

/**
 * Zeitperioden für Hintergrundbilder
 */
export type TimeOfDay = 'night' | 'day' | 'evening';

/**
 * Ermittelt die aktuelle Tageszeit basierend auf der Stunde
 */
export function getCurrentTimeOfDay(): TimeOfDay {
  const currentHour = new Date().getHours();

  // 22:00 - 06:00: Nacht
  if (currentHour >= 22 || currentHour < 6) {
    return 'night';
  }

  // 06:00 - 18:00: Tag
  if (currentHour >= 6 && currentHour < 18) {
    return 'day';
  }

  // 18:00 - 22:00: Abend
  return 'evening';
}

/**
 * Gibt das entsprechende Hintergrundbild für die aktuelle Tageszeit zurück
 */
export function getCurrentBackgroundImage(): string {
  const timeOfDay = getCurrentTimeOfDay();

  switch (timeOfDay) {
    case 'night':
      return nightImage;
    case 'day':
      return dayImage;
    case 'evening':
      return eveningImage;
    default:
      return dayImage; // Fallback
  }
}

/**
 * Hook für zeitbasierte Hintergrundbilder mit automatischer Aktualisierung
 */
export function useTimeBasedBackground() {
  const image = useMemo(() => getCurrentBackgroundImage(), []);
  return image;
}
