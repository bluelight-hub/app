import { z } from 'zod';

/**
 * 10 vordefinierte Farbpresets fuer Kategorien (Story 8.1).
 */
export const KATEGORIE_FARB_PRESETS = [
  { name: 'Rot', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Gelb', hex: '#eab308' },
  { name: 'Grün', hex: '#22c55e' },
  { name: 'Türkis', hex: '#14b8a6' },
  { name: 'Blau', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Lila', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Grau', hex: '#6b7280' },
] as const;

/**
 * Zod Schema fuer das Erstellen einer Kategorie.
 */
export const kategorieSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich').max(100, 'Name darf maximal 100 Zeichen lang sein'),
  farbe: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein gültiger Hex-Code sein (z.B. #3b82f6)')
    .default(KATEGORIE_FARB_PRESETS[0].hex),
});

export type KategorieFormValues = z.infer<typeof kategorieSchema>;
