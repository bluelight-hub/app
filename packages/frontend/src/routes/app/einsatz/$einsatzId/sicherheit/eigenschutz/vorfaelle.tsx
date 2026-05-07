import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useAktiveEinsatzEinheit } from '@/features/eigenschutz/hooks/use-aktive-einsatz-einheit';
import { VorfaellePage } from '@/features/eigenschutz/ui/pages/VorfaellePage';

/**
 * Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle`
 * (Story 5.1, T5.5; Story 5.3 erweitert um `validateSearch` für Deep-Link-
 * fähige Filter).
 *
 * Search-Schema (Story 5.3, AC6):
 * - `abschnittIds`: CSV-String (kommasepariert) ODER Array, wird zu Array
 *   normalisiert; ungültige CUID2-Einträge werden still gefiltert (Defense-
 *   in-Depth). Leer = kein Filter.
 * - `von` / `bis`: ISO-date-only-String `yyyy-mm-dd`.
 * - `uk`: nur `'1'` — kompaktes URL-Format für „nur Unfallkasse-relevant".
 *   AC10 fordert kein Tri-State; ein expliziter `'0'`-Filter („nur NICHT-UK")
 *   ist deshalb URL-seitig nicht modellierbar (Reset-Button = Filter weg).
 *
 * Per-Feld `.catch(undefined)` + `.passthrough()` stellt sicher, dass ein
 * einzelner kaputter Param (z. B. `?bis=garbage`) nicht ALLE anderen Filter
 * verwirft (Lesson Story 3.10 — Code-Review-Patch P5).
 */
const CUID2_PATTERN = /^[a-z0-9]{24,32}$/;

const VorfaelleSearchSchema = z
  .object({
    abschnittIds: z
      .union([
        z.string().transform((s) =>
          s
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
        z.array(z.string()),
      ])
      .optional()
      .transform((v) => (Array.isArray(v) ? v : (v ?? [])))
      .transform((arr) => arr.filter((id) => CUID2_PATTERN.test(id)))
      .catch([]),
    von: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .catch(undefined),
    bis: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .catch(undefined),
    uk: z.literal('1').optional().catch(undefined),
  })
  .passthrough();

export type VorfaelleSearchParams = z.infer<typeof VorfaelleSearchSchema>;

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle')({
  validateSearch: (search: Record<string, unknown>): VorfaelleSearchParams => {
    const result = VorfaelleSearchSchema.safeParse(search);
    if (result.success) return result.data;
    // Catastrophic-Failure-Fallback: nur erreicht, wenn safeParse global
    // wirft (theoretisch unmöglich mit `.passthrough()` + per-Feld `.catch`),
    // aber Defense-in-Depth gegen Schema-Drift in Zukunft.
    if (typeof console !== 'undefined') console.warn('VorfaelleSearchSchema parse failed', result.error);
    return { abschnittIds: [] } as VorfaelleSearchParams;
  },
  component: VorfaelleRouteComponent,
});

function VorfaelleRouteComponent() {
  const { einsatzId } = Route.useParams();
  const search = Route.useSearch();
  const { einheitId } = useAktiveEinsatzEinheit(einsatzId);
  return <VorfaellePage einsatzId={einsatzId} einheitId={einheitId} initialSearch={search} />;
}
