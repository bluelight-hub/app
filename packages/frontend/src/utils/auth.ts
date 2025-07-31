import { message } from 'antd';
import { logger } from '@/utils/logger.ts';

/**
 * Zentrale Logout-Funktion
 * Führt den Logout-Prozess durch und leitet zur Login-Seite weiter
 *
 * @param clearEinsatz - Optional: Funktion zum Zurücksetzen des aktuellen Einsatzes
 */
export const logout = async (clearEinsatz?: () => void): Promise<void> => {
  try {
    // TODO: API-Call zum Ausloggen implementieren
    // Hier würde normalerweise ein API-Call erfolgen:
    // await authApi.logout();

    // Simulierter API-Call für Mock-Zwecke
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Auth-Token aus localStorage entfernen
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    // Aktuellen Einsatz zurücksetzen, falls Funktion übergeben wurde
    if (clearEinsatz) {
      clearEinsatz();
    }

    // Session Storage leeren
    sessionStorage.clear();

    message.success('Erfolgreich ausgeloggt');

    // Zur Login-Seite weiterleiten
    window.location.href = '/login';
  } catch (error) {
    logger.error('Logout error:', error);
    message.error('Fehler beim Ausloggen');
    throw error;
  }
};
