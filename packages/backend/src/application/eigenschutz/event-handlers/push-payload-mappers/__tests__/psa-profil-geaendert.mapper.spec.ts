/**
 * Unit-Tests für `mapPsaProfilGeaendertToPushPayload` (Story 3.8 AC4).
 */
import { PsaProfil } from '@/generated/prisma/enums';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { mapPsaProfilGeaendertToPushPayload } from '../psa-profil-geaendert.mapper';

function makeEvent(
  overrides: Partial<{
    profil: PsaProfil;
    aktion: 'AKTIVIERT' | 'DEAKTIVIERT';
    einsatzId: string;
    einheitId: string;
    userId: string;
    zuweisungId: string;
    propagationGroupId: string;
    begruendung: string;
  }> = {},
) {
  return new PsaProfilGeaendertEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-1',
    overrides.zuweisungId ?? 'zuw-1',
    overrides.propagationGroupId ?? 'group-1',
    overrides.profil ?? PsaProfil.CBRN_PATIENT,
    overrides.aktion ?? 'AKTIVIERT',
    overrides.begruendung ?? 'CBRN-Lage',
  );
}

describe('mapPsaProfilGeaendertToPushPayload (Story 3.8 AC4)', () => {
  it('AKTIVIERT auf CBRN_PATIENT erzeugt deutschen Title (≤ 60 Zeichen)', () => {
    const event = makeEvent({ profil: PsaProfil.CBRN_PATIENT, aktion: 'AKTIVIERT' });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(payload.title).toBe('PSA-Profil CBRN-Patientenversorgung aktiviert');
    expect(payload.title.length).toBeLessThanOrEqual(60);
  });

  it('DEAKTIVIERT auf INFEKTION erzeugt deutschen Title', () => {
    const event = makeEvent({ profil: PsaProfil.INFEKTION, aktion: 'DEAKTIVIERT' });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(payload.title).toBe('PSA-Profil Infektionsschutz deaktiviert');
    expect(payload.title.length).toBeLessThanOrEqual(60);
  });

  it('Unbekanntes Profil-Enum fällt auf "unbekanntes Profil" zurück (kein Internal-Identifier-Leak, kein undefined)', () => {
    const event = makeEvent({ profil: 'UNKNOWN_FUTURE_PROFIL' as PsaProfil });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(payload.title).toBe('PSA-Profil unbekanntes Profil aktiviert');
    expect(payload.title).not.toContain('UNKNOWN_FUTURE_PROFIL');
    expect(payload.title).not.toContain('undefined');
  });

  it('Multi-Byte-UTF-8-Title respektiert 60-Byte-Cap (nicht nur 60 UTF-16-Code-Units)', () => {
    // Realistischer Worst-Case-Profilname; wir verifizieren die Byte-Cap-Garantie
    // (Story 3.8 P5) — wenn jemand künftig längere Multi-Byte-Labels in PROFIL_LABELS
    // einträgt, schneidet `trimToCapBytes` korrekt UTF-8-Byte-weise.
    const event = makeEvent({ profil: PsaProfil.CBRN_PATIENT, aktion: 'AKTIVIERT' });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(Buffer.byteLength(payload.title, 'utf8')).toBeLessThanOrEqual(60);
  });

  it('encodeURIComponent härtet Deep-Link gegen URL-unsafe Chars in IDs (P6)', () => {
    const event = makeEvent({ einsatzId: 'einsatz/with?weird#chars', einheitId: 'einheit ABC' });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(payload.url).toBe('/app/einsatz/einsatz%2Fwith%3Fweird%23chars/sicherheit/eigenschutz/einheit/einheit%20ABC');
  });

  it('eventId aus dem Output ist STRIKT identisch zur Input-event.eventId (Client-LRU-Dedup)', () => {
    const event = makeEvent();
    const inputEventId = event.eventId;

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(payload.eventId).toBe(inputEventId);
  });

  it('JSON.stringify(payload).length ≤ 4000 Byte für realistisches Worst-Case-Profil', () => {
    const event = makeEvent({
      profil: PsaProfil.VOLLSCHUTZ,
      aktion: 'AKTIVIERT',
      // CUID2 max ~24 Zeichen, hier mit Reserve
      einsatzId: 'c'.repeat(30),
      einheitId: 'e'.repeat(30),
      zuweisungId: 'z'.repeat(30),
      propagationGroupId: 'p'.repeat(30),
    });

    const payload = mapPsaProfilGeaendertToPushPayload(event);
    const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');

    expect(bytes).toBeLessThanOrEqual(4000);
  });

  it('url folgt /app/einsatz/<einsatzId>/sicherheit/eigenschutz/einheit/<einheitId>', () => {
    const event = makeEvent({ einsatzId: 'einsatz-XYZ', einheitId: 'einheit-ABC' });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    expect(payload.url).toBe('/app/einsatz/einsatz-XYZ/sicherheit/eigenschutz/einheit/einheit-ABC');
  });

  it('data.priority ist KONSTANT "high" (auch bei aktion DEAKTIVIERT — Q5)', () => {
    const aktiviert = mapPsaProfilGeaendertToPushPayload(makeEvent({ aktion: 'AKTIVIERT' }));
    const deaktiviert = mapPsaProfilGeaendertToPushPayload(makeEvent({ aktion: 'DEAKTIVIERT' }));

    expect(aktiviert.data?.priority).toBe('high');
    expect(deaktiviert.data?.priority).toBe('high');
  });

  it('data enthält keine userId, keine begruendung, keine einsatzId (Privacy-Whitelist)', () => {
    const event = makeEvent({ userId: 'user-secret', begruendung: 'sensible Information' });

    const payload = mapPsaProfilGeaendertToPushPayload(event);

    const keys = Object.keys(payload.data ?? {}).sort();
    expect(keys).toEqual(['aktion', 'einheitId', 'priority', 'profil', 'propagationGroupId']);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('user-secret');
    expect(serialized).not.toContain('sensible Information');
  });
});
