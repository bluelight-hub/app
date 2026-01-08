import { z } from 'zod';

/**
 * Zod-Schema für die Validierung von Benutzernamen.
 *
 * Regeln:
 * - Mindestens 3 Zeichen
 * - Maximal 20 Zeichen (vereinheitlicht für Frontend/Backend)
 * - Nur Buchstaben, Zahlen, Unterstriche und Bindestriche
 *
 * WICHTIG: Dieses Schema wird sowohl im Frontend (Formulare)
 * als auch im Backend (DTOs) verwendet, um konsistente
 * Validierung zu garantieren.
 */
export const usernameSchema = z
  .string()
  .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein')
  .max(20, 'Benutzername darf maximal 20 Zeichen lang sein')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten');

/**
 * TypeScript-Typ für Benutzernamen
 */
export type Username = z.infer<typeof usernameSchema>;
