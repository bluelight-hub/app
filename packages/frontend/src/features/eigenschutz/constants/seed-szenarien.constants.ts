import type { IconType } from 'react-icons';
import { PiAmbulance, PiCar, PiFirstAid, PiHeartbeat, PiRadioactive, PiUsers } from 'react-icons/pi';

/**
 * UI-Metadaten pro Seed-Szenario (Story 2.1).
 *
 * Die tatsächlichen Items, `name`, `id` und `version` kommen vom Backend
 * (`/gefaehrdungsbeurteilungs-vorlagen`). Hier liegen nur Icon und
 * Kurzbeschreibung als Frontend-Konstante, damit die `SeedTemplateEntryCard`
 * die Szenarien visuell differenzieren kann, ohne dass der UI-Text vom
 * Backend abhängt.
 *
 * **Slug-Bindung:** Die Keys matchen exakt die `slug`-Felder der Seeds aus
 * `packages/backend/prisma/seed.ts` (Story 1.4). Wird ein neuer Seed
 * hinzugefügt, muss der passende Eintrag hier ergänzt werden — fehlt er,
 * fällt die Card auf den generischen `FALLBACK_SZENARIO_META` zurück.
 */
export interface SeedSzenarioMeta {
  readonly icon: IconType;
  readonly kurzbeschreibung: string;
}

export const SEED_SZENARIO_META: Readonly<Record<string, SeedSzenarioMeta>> = {
  manv: {
    icon: PiAmbulance,
    kurzbeschreibung: 'Massenanfall von Verletzten — Triage, Sichtungsstellen, Chaoserwartung.',
  },
  'vu-patientenversorgung': {
    icon: PiCar,
    kurzbeschreibung: 'Verkehrsunfall-Patientenversorgung — Verkehr, eingeklemmte Personen, Flüssigkeiten.',
  },
  'sanitaetsdienst-grossveranstaltung': {
    icon: PiUsers,
    kurzbeschreibung: 'Sanitätsdienst bei Großveranstaltung — Menschenmengen, Hitze, lange Schichten.',
  },
  betreuungseinsatz: {
    icon: PiHeartbeat,
    kurzbeschreibung: 'Betreuungseinsatz — lange Dauer, Unterbringung, psychosoziale Belastungen.',
  },
  'cbrn-patientenversorgung': {
    icon: PiRadioactive,
    kurzbeschreibung: 'CBRN-Patientenversorgung — Kontaminationszonen, Vollschutz, Dekontamination.',
  },
};

export const FALLBACK_SZENARIO_META: SeedSzenarioMeta = {
  icon: PiFirstAid,
  kurzbeschreibung: 'Seed-Vorlage.',
};

export function resolveSzenarioMeta(slug: string): SeedSzenarioMeta {
  return SEED_SZENARIO_META[slug] ?? FALLBACK_SZENARIO_META;
}
