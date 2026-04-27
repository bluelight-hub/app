import { z } from 'zod';

/**
 * Backend-Mirror der Shared-Sicherheitsregel-Zod-Schemas (Story 2.6 AC5).
 *
 * Der Backend-Bundle ist aktuell CJS, das `@bluelight-hub/shared`-Paket ist
 * ESM-only — direkter Import ist daher (noch) nicht möglich (siehe TODO in
 * `complete-setup.dto.ts` und Plattform-Issue „Backend ESM Migration").
 * Bis dahin halten wir die Constraints hier wortgleich; ein
 * Konsistenz-Test (`__tests__/sicherheitsregel.zod.spec.ts`) sichert die
 * Werte gegen das Shared-Schema ab.
 *
 * **Warum nicht nur class-validator?** Der diskriminierte Union-Type
 * `{einsatzweit:true}` XOR `{einsatzweit:false, einheitIds:[…]}` lässt sich
 * mit `@ValidateIf` nur einseitig prüfen — `einsatzweit:true` plus
 * `einheitIds:['x']` rutscht heute durch. Die `ZodValidationPipe` rejected
 * solche Kombinationen mit HTTP 400.
 */
const cuidIdSchema = z.string().regex(/^[a-z][a-z0-9]{23,31}$/, 'CUID2 erwartet');

const zuordnungSchema = z.discriminatedUnion('einsatzweit', [
  z.object({
    einsatzweit: z.literal(true),
  }),
  z.object({
    einsatzweit: z.literal(false),
    einheitIds: z.array(cuidIdSchema).min(1, 'Mindestens eine Einheit muss ausgewählt werden'),
  }),
]);

export const SicherheitsregelCreateBodySchema = z
  .object({
    titel: z.string().trim().min(1, 'Titel darf nicht leer sein').max(80, 'Titel darf maximal 80 Zeichen lang sein'),
    inhalt: z.string().trim().min(1, 'Inhalt darf nicht leer sein').max(2000, 'Inhalt darf maximal 2000 Zeichen lang sein'),
  })
  .and(zuordnungSchema);

export type SicherheitsregelCreateBody = z.infer<typeof SicherheitsregelCreateBodySchema>;

export const SicherheitsregelUpdateBodySchema = z
  .object({
    titel: z.string().trim().min(1, 'Titel darf nicht leer sein').max(80, 'Titel darf maximal 80 Zeichen lang sein'),
    inhalt: z.string().trim().min(1, 'Inhalt darf nicht leer sein').max(2000, 'Inhalt darf maximal 2000 Zeichen lang sein'),
    expectedVersion: z.number().int().positive('expectedVersion muss eine positive Ganzzahl sein').max(2_000_000_000, 'expectedVersion ist außerhalb des erwarteten Bereichs'),
  })
  .and(zuordnungSchema);

export type SicherheitsregelUpdateBody = z.infer<typeof SicherheitsregelUpdateBodySchema>;
