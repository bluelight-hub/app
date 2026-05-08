import * as fs from 'node:fs';
import * as path from 'node:path';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EventDeserializer } from '../event-deserializer';

/**
 * Konsistenz-Spec für die Eigenschutz-Event-Registry (Story 1.7 AC4).
 *
 * Diese Spec härtet die NFR-I3-Regel "neue Backend-Events werden an allen 4
 * Stellen registriert" für den Eigenschutz-Namespace (14 Namen aus
 * `EVENT_NAMES.EIGENSCHUTZ`) und fordert pro Name strikt "0 oder 4 Stellen".
 *
 * **Abweichung von der AC4-Text-Vorgabe (bewusst):** Der AC4-Text schlägt
 * "Substring-Match auf `'{eventName}'` literal" für ALLE 4 Stellen vor. Für
 * Stellen 1+2 (Serializer-Switch + Deserializer-Map) trifft das — dort
 * stehen die eventName-Strings wortgetreu im Code. Für Stellen 3+4
 * (AdaptersModule + Adapters-Barrel) ist das Pattern systemisch blind:
 *
 * - Plattform-Adapter referenzieren den eventName via `@OnEvent(EVENT_NAMES.X.Y)`
 *   (Symbol-Referenz, nicht String-Literal) → `event-adapters.module.ts`
 *   enthält nur PascalCase-Klassennamen, niemals den eventName-String.
 * - Adapter-Dateinamen folgen der Hyphen-Slug-Konvention
 *   (`system-warnung-websocket-event.adapter.ts`) → `adapters/index.ts`
 *   enthält den Slug, nicht den Dot-separierten eventName.
 *
 * Ein naives Substring-Match scheitert daher am Sanity-Check `system.warnung`
 * (würde 2/4 statt 4/4 liefern). Wir matchen deshalb:
 *
 * - Stelle 3 (AdaptersModule): PascalCase-Derivat des eventName als
 *   Token-Präfix von `*Adapter`-Bezeichnern (`SystemWarnung` findet
 *   `SystemWarnungWebSocketEventAdapter` und `SystemWarnungEtbEventAdapter`).
 * - Stelle 4 (Adapters-Barrel): Slug-Derivat des eventName als
 *   Adapter-Datei-Präfix (`system-warnung` findet
 *   `'./system-warnung-websocket-event.adapter'`).
 *
 * Der Sanity-Check mit `EVENT_NAMES.SYSTEM.WARNUNG` prüft, dass diese
 * Heuristik ≥ 4 liefert; die Eigenschutz-Iteration prüft, dass sie für alle
 * 14 Namen exakt 0 liefert. Schlägt der Sanity-Check fehl, ist die
 * Spec-Mechanik selbst defekt — klar unterscheidbar vom Story-Fehler.
 */

const REPO_BACKEND_SRC = path.resolve(__dirname, '../../..');
const SERIALIZER_PATH = path.join(REPO_BACKEND_SRC, 'infrastructure/outbox/event-serializer.ts');
const ADAPTERS_MODULE_PATH = path.join(REPO_BACKEND_SRC, 'infrastructure/events/event-adapters.module.ts');
const ADAPTERS_INDEX_PATH = path.join(REPO_BACKEND_SRC, 'infrastructure/events/adapters/index.ts');

const NOOP_LOGGER: ILogger = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  verbose: () => undefined,
};

const SITES = ['serializer', 'deserializer', 'adaptersModule', 'adaptersIndex'] as const;
type Site = (typeof SITES)[number];
type RegistrationTuple = Record<Site, 0 | 1>;

/**
 * Derive PascalCase klassenname prefix from eventName.
 * `'system.warnung'` → `'SystemWarnung'`.
 * `'eigenschutz.psa_profil_geaendert'` → `'EigenschutzPsaProfilGeaendert'`.
 */
function pascalCaseDerivative(eventName: string): string {
  return eventName
    .split(/[._]/)
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join('');
}

/**
 * Derive Hyphen-Slug from eventName.
 * `'system.warnung'` → `'system-warnung'`.
 * `'eigenschutz.psa_profil_geaendert'` → `'eigenschutz-psa-profil-geaendert'`.
 */
function slugDerivative(eventName: string): string {
  return eventName.replace(/[._]/g, '-');
}

function countSerializer(eventName: string): 0 | 1 {
  const source = fs.readFileSync(SERIALIZER_PATH, 'utf8');
  return source.includes(`case '${eventName}':`) ? 1 : 0;
}

function countDeserializer(eventName: string): 0 | 1 {
  const deserializer = new EventDeserializer(NOOP_LOGGER);
  return deserializer.getSupportedEventTypes().includes(eventName) ? 1 : 0;
}

function countAdaptersModule(eventName: string): 0 | 1 {
  const source = fs.readFileSync(ADAPTERS_MODULE_PATH, 'utf8');
  const derivative = pascalCaseDerivative(eventName);
  const pattern = new RegExp(String.raw`\b${derivative}[A-Za-z]*Adapter\b`);
  return pattern.test(source) ? 1 : 0;
}

function countAdaptersIndex(eventName: string): 0 | 1 {
  const source = fs.readFileSync(ADAPTERS_INDEX_PATH, 'utf8');
  const slug = slugDerivative(eventName);
  const pattern = new RegExp(String.raw`['"]\./${slug}[-.]`);
  return pattern.test(source) ? 1 : 0;
}

function countRegistrationSites(eventName: string): RegistrationTuple {
  return {
    serializer: countSerializer(eventName),
    deserializer: countDeserializer(eventName),
    adaptersModule: countAdaptersModule(eventName),
    adaptersIndex: countAdaptersIndex(eventName),
  };
}

function sumTuple(tuple: RegistrationTuple): number {
  return SITES.reduce((acc, site) => acc + tuple[site], 0);
}

function missingSites(tuple: RegistrationTuple): Site[] {
  return SITES.filter((site) => tuple[site] === 0);
}

describe('Eigenschutz Event Registry — Konsistenz "0 oder 4 Stellen" (Story 1.7 AC4)', () => {
  describe('Sanity-Check — bekanntes 4/4-Produktions-Event', () => {
    it('liefert für system.warnung Count 4/4 an allen 4 Stellen (sonst ist die Spec selbst defekt)', () => {
      const tuple = countRegistrationSites(EVENT_NAMES.SYSTEM.WARNUNG);
      const count = sumTuple(tuple);
      expect(count).toBe(4);
      expect(tuple).toEqual({ serializer: 1, deserializer: 1, adaptersModule: 1, adaptersIndex: 1 });
    });
  });

  describe('Eigenschutz-Iteration — alle 14 Namen aus EVENT_NAMES.EIGENSCHUTZ', () => {
    const EIGENSCHUTZ_NAMES = Object.values(EVENT_NAMES.EIGENSCHUTZ);

    it('enthält exakt die 14 erwarteten Namen', () => {
      expect(EIGENSCHUTZ_NAMES).toHaveLength(14);
    });

    it.each(EIGENSCHUTZ_NAMES)('Event "%s" ist an 0 oder 4 Stellen registriert (niemals 1–3)', (eventName) => {
      const tuple = countRegistrationSites(eventName);
      const count = sumTuple(tuple);
      const missing = missingSites(tuple);

      expect([0, 4]).toContain(count);
      if (count !== 0 && count !== 4) {
        throw new Error(`Event "${eventName}" ist an ${count}/4 Stellen registriert (erwartet: 0 oder 4). Fehlende Stellen: ${missing.join(', ')}`);
      }
    });

    it('Story-5.6-Fortschritt: alle 14 Eigenschutz-Events vollständig an 4/4', () => {
      const ERSTELLT = EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_ERSTELLT;
      const AKTUALISIERT = EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT;
      const SICHERHEITSREGEL_AUSGERUFEN = EVENT_NAMES.EIGENSCHUTZ.SICHERHEITSREGEL_AUSGERUFEN;
      const SICHERHEITSREGEL_QUITTIERT = EVENT_NAMES.EIGENSCHUTZ.SICHERHEITSREGEL_QUITTIERT;
      const PSA_PROFIL_GEAENDERT = EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT;
      const QUITTUNG_ABGEGEBEN = EVENT_NAMES.EIGENSCHUTZ.QUITTUNG_ABGEGEBEN;
      const LUECKE_GEMELDET = EVENT_NAMES.EIGENSCHUTZ.LUECKE_GEMELDET;
      const QUITTUNG_UEBERFAELLIG = EVENT_NAMES.EIGENSCHUTZ.QUITTUNG_UEBERFAELLIG;
      const KONFLIKT_ERKANNT = EVENT_NAMES.EIGENSCHUTZ.KONFLIKT_ERKANNT;
      const KONFLIKT_AUFGELOEST = EVENT_NAMES.EIGENSCHUTZ.KONFLIKT_AUFGELOEST;
      const SICHERUNGSPOSTEN_EINGERICHTET = EVENT_NAMES.EIGENSCHUTZ.SICHERUNGSPOSTEN_EINGERICHTET;
      const SICHERUNGSPOSTEN_AKTUALISIERT = EVENT_NAMES.EIGENSCHUTZ.SICHERUNGSPOSTEN_AKTUALISIERT;
      const VORFALL_GEMELDET = EVENT_NAMES.EIGENSCHUTZ.VORFALL_GEMELDET;
      const VORFALL_EXPORTIERT = EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT;
      expect(sumTuple(countRegistrationSites(ERSTELLT))).toBe(4);
      expect(sumTuple(countRegistrationSites(AKTUALISIERT))).toBe(4);
      expect(sumTuple(countRegistrationSites(SICHERHEITSREGEL_AUSGERUFEN))).toBe(4);
      expect(sumTuple(countRegistrationSites(SICHERHEITSREGEL_QUITTIERT))).toBe(4);
      expect(sumTuple(countRegistrationSites(PSA_PROFIL_GEAENDERT))).toBe(4);
      expect(sumTuple(countRegistrationSites(QUITTUNG_ABGEGEBEN))).toBe(4);
      expect(sumTuple(countRegistrationSites(LUECKE_GEMELDET))).toBe(4);
      expect(sumTuple(countRegistrationSites(QUITTUNG_UEBERFAELLIG))).toBe(4);
      expect(sumTuple(countRegistrationSites(KONFLIKT_ERKANNT))).toBe(4);
      expect(sumTuple(countRegistrationSites(KONFLIKT_AUFGELOEST))).toBe(4);
      expect(sumTuple(countRegistrationSites(SICHERUNGSPOSTEN_EINGERICHTET))).toBe(4);
      expect(sumTuple(countRegistrationSites(SICHERUNGSPOSTEN_AKTUALISIERT))).toBe(4);
      expect(sumTuple(countRegistrationSites(VORFALL_GEMELDET))).toBe(4);
      expect(sumTuple(countRegistrationSites(VORFALL_EXPORTIERT))).toBe(4);
    });
  });

  describe('Failure-Case-Regression — 1–3 Stellen müssen aussagekräftig fehlschlagen', () => {
    const FAKE_PARTIAL_EVENT = 'eigenschutz.__fake_partial_only_in_serializer_test__';

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('wirft mit Fehlermeldung, wenn ein Event in 1 von 4 Stellen auftaucht', () => {
      const originalReadFileSync = fs.readFileSync;
      jest.spyOn(fs, 'readFileSync').mockImplementation(((filePath: fs.PathOrFileDescriptor, options?: unknown) => {
        const real = originalReadFileSync(filePath as fs.PathLike, options as never);
        if (typeof filePath === 'string' && filePath === SERIALIZER_PATH) {
          return `${real as string}\n      case '${FAKE_PARTIAL_EVENT}':\n        return {} as never;\n`;
        }
        return real;
      }) as typeof fs.readFileSync);

      const tuple = countRegistrationSites(FAKE_PARTIAL_EVENT);
      const count = sumTuple(tuple);
      expect(count).toBe(1);
      expect(missingSites(tuple)).toEqual(['deserializer', 'adaptersModule', 'adaptersIndex']);
    });

    it('wirft mit Fehlermeldung, wenn ein Event in 3 von 4 Stellen auftaucht', () => {
      const originalReadFileSync = fs.readFileSync;
      jest.spyOn(fs, 'readFileSync').mockImplementation(((filePath: fs.PathOrFileDescriptor, options?: unknown) => {
        const real = originalReadFileSync(filePath as fs.PathLike, options as never);
        if (typeof filePath !== 'string') {
          return real;
        }
        if (filePath === SERIALIZER_PATH) {
          return `${real as string}\n      case '${FAKE_PARTIAL_EVENT}':\n        return {} as never;\n`;
        }
        if (filePath === ADAPTERS_MODULE_PATH) {
          // Simuliere einen Provider-Eintrag, der dem PascalCase-Derivat folgt.
          const fakeDerivate = pascalCaseDerivative(FAKE_PARTIAL_EVENT);
          return `${real as string}\n    ${fakeDerivate}WebSocketEventAdapter,\n`;
        }
        if (filePath === ADAPTERS_INDEX_PATH) {
          const slug = slugDerivative(FAKE_PARTIAL_EVENT);
          return `${real as string}\nexport * from './${slug}-websocket-event.adapter';\n`;
        }
        return real;
      }) as typeof fs.readFileSync);

      const tuple = countRegistrationSites(FAKE_PARTIAL_EVENT);
      const count = sumTuple(tuple);
      const missing = missingSites(tuple);
      expect(count).toBe(3);
      expect(missing).toEqual(['deserializer']);

      const assertion = () => {
        if (count !== 0 && count !== 4) {
          throw new Error(`Event "${FAKE_PARTIAL_EVENT}" ist an ${count}/4 Stellen registriert (erwartet: 0 oder 4). Fehlende Stellen: ${missing.join(', ')}`);
        }
      };

      expect(assertion).toThrow(/3\/4 Stellen registriert/);
      expect(assertion).toThrow(/Fehlende Stellen: deserializer/);
    });

    it('passiert den "0 oder 4 Stellen"-Check bei 1 Stelle NICHT — liefert die „fehlende Stellen"-Liste konkret', () => {
      const originalReadFileSync = fs.readFileSync;
      jest.spyOn(fs, 'readFileSync').mockImplementation(((filePath: fs.PathOrFileDescriptor, options?: unknown) => {
        const real = originalReadFileSync(filePath as fs.PathLike, options as never);
        if (typeof filePath === 'string' && filePath === SERIALIZER_PATH) {
          return `${real as string}\n      case '${FAKE_PARTIAL_EVENT}':\n        return {} as never;\n`;
        }
        return real;
      }) as typeof fs.readFileSync);

      const tuple = countRegistrationSites(FAKE_PARTIAL_EVENT);
      const count = sumTuple(tuple);
      const missing = missingSites(tuple);

      const assertion = () => {
        if (count !== 0 && count !== 4) {
          throw new Error(`Event "${FAKE_PARTIAL_EVENT}" ist an ${count}/4 Stellen registriert (erwartet: 0 oder 4). Fehlende Stellen: ${missing.join(', ')}`);
        }
      };

      expect(assertion).toThrow(/1\/4 Stellen registriert/);
      expect(assertion).toThrow(/Fehlende Stellen: deserializer, adaptersModule, adaptersIndex/);
    });
  });

  describe('Derivat-Helper — Schutz gegen Drift in der Namens-Konvention', () => {
    it('pascalCaseDerivative wandelt dot/underscore-Separator in PascalCase um', () => {
      expect(pascalCaseDerivative('system.warnung')).toBe('SystemWarnung');
      expect(pascalCaseDerivative('eigenschutz.psa_profil_geaendert')).toBe('EigenschutzPsaProfilGeaendert');
      expect(pascalCaseDerivative('eigenschutz.gefaehrdungsbeurteilung_aktualisiert')).toBe('EigenschutzGefaehrdungsbeurteilungAktualisiert');
    });

    it('slugDerivative wandelt dot/underscore in Hyphen-Slug um', () => {
      expect(slugDerivative('system.warnung')).toBe('system-warnung');
      expect(slugDerivative('eigenschutz.psa_profil_geaendert')).toBe('eigenschutz-psa-profil-geaendert');
    });
  });
});
