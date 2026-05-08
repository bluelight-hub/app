import { AmpelStatusBerechnungService, type AmpelStatusInput } from '../ampel-status-berechnung.service';

describe('AmpelStatusBerechnungService', () => {
  const service = new AmpelStatusBerechnungService();

  const basisInput = (overrides: Partial<AmpelStatusInput> = {}): AmpelStatusInput => ({
    offeneGefaehrdungenHoch: 0,
    ausstehendePsaQuittungen: 0,
    ausstehendeRegelQuittungen: 0,
    offeneVorfaelle: 0,
    ungeloesteRueckmeldungen: 0,
    ...overrides,
  });

  it('liefert GRUEN, wenn keine offenen Sicherheitsindikatoren vorliegen', () => {
    expect(service.berechneStatus(basisInput()).value).toBe('GRUEN');
  });

  it('liefert ROT, wenn offene Vorfälle vorhanden sind', () => {
    expect(service.berechneStatus(basisInput({ offeneVorfaelle: 1 })).value).toBe('ROT');
  });

  it('liefert ROT, wenn offene hohe Gefährdungen vorhanden sind', () => {
    expect(service.berechneStatus(basisInput({ offeneGefaehrdungenHoch: 1 })).value).toBe('ROT');
  });

  it('lässt ROT Vorrang vor GELB durch ausstehende PSA-Quittungen haben', () => {
    expect(service.berechneStatus(basisInput({ offeneVorfaelle: 1, ausstehendePsaQuittungen: 3 })).value).toBe('ROT');
  });

  it('liefert GELB, wenn PSA-Quittungen ausstehen', () => {
    expect(service.berechneStatus(basisInput({ ausstehendePsaQuittungen: 1 })).value).toBe('GELB');
  });

  it('liefert GELB, wenn Regel-Quittungen ausstehen', () => {
    expect(service.berechneStatus(basisInput({ ausstehendeRegelQuittungen: 1 })).value).toBe('GELB');
  });

  it('liefert GELB, wenn ungelöste Rückmeldungen vorhanden sind', () => {
    expect(service.berechneStatus(basisInput({ ungeloesteRueckmeldungen: 1 })).value).toBe('GELB');
  });

  it('liefert einen Domain-Fehler bei negativen Zählern', () => {
    const result = service.berechneStatus(basisInput({ ausstehendePsaQuittungen: -1 }));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('ValidationFailed:AmpelStatus:negativeCounter:ausstehendePsaQuittungen');
  });
});
