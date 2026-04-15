import { KanalDetails } from '../kanal-details.vo';

describe('KanalDetails VO', () => {
  describe('tmo()', () => {
    it('akzeptiert Sprechgruppe', () => {
      const r = KanalDetails.tmo({ sprechgruppe: 'SG_FEUER_1' });
      expect(r.isSuccess).toBe(true);
      expect(r.value?.type).toBe('tmo');
    });

    it('akzeptiert Sprechgruppe + gssi', () => {
      const r = KanalDetails.tmo({ sprechgruppe: 'SG_1', gssi: '1234567' });
      expect(r.isSuccess).toBe(true);
      expect((r.value as any).gssi).toBe('1234567');
    });

    it('trimmt Whitespace', () => {
      const r = KanalDetails.tmo({ sprechgruppe: '  SG_1  ' });
      expect(r.value).toMatchObject({ type: 'tmo', sprechgruppe: 'SG_1' });
    });

    it('lehnt leere Sprechgruppe ab', () => {
      expect(KanalDetails.tmo({ sprechgruppe: '' }).isFailure).toBe(true);
      expect(KanalDetails.tmo({ sprechgruppe: '   ' }).isFailure).toBe(true);
    });
  });

  describe('dmo()', () => {
    it('akzeptiert DMO-Kanal', () => {
      const r = KanalDetails.dmo({ dmoKanal: '310' });
      expect(r.value?.type).toBe('dmo');
    });

    it('akzeptiert DMO-Kanal + Repeater', () => {
      const r = KanalDetails.dmo({ dmoKanal: '310', repeater: 'R-NORD' });
      expect((r.value as any).repeater).toBe('R-NORD');
    });

    it('lehnt leeren DMO-Kanal ab', () => {
      expect(KanalDetails.dmo({ dmoKanal: '' }).isFailure).toBe(true);
    });
  });

  describe('analog()', () => {
    it('akzeptiert 4m-Band', () => {
      const r = KanalDetails.analog({ band: '4m', frequenz: '84.800' });
      expect(r.value).toMatchObject({ type: 'analog', band: '4m', frequenz: '84.800' });
    });

    it('akzeptiert 2m-Band', () => {
      const r = KanalDetails.analog({ band: '2m', frequenz: '168.200' });
      expect(r.isSuccess).toBe(true);
    });

    it('lehnt anderes Band ab', () => {
      const r = KanalDetails.analog({ band: 'HF' as never, frequenz: '10' });
      expect(r.isFailure).toBe(true);
      expect(r.error).toContain('Band');
    });

    it('lehnt leere Frequenz ab', () => {
      expect(KanalDetails.analog({ band: '4m', frequenz: '' }).isFailure).toBe(true);
    });

    it('akzeptiert optionale Kanalnummer', () => {
      const r = KanalDetails.analog({ band: '4m', frequenz: '84.800', kanalnummer: '510' });
      expect((r.value as any).kanalnummer).toBe('510');
    });
  });

  describe('fromPersistence()', () => {
    it('dispatched TMO', () => {
      expect(KanalDetails.fromPersistence('tmo', { sprechgruppe: 'X' })).toMatchObject({ type: 'tmo' });
    });

    it('dispatched DMO', () => {
      expect(KanalDetails.fromPersistence('dmo', { dmoKanal: '1' })).toMatchObject({ type: 'dmo' });
    });

    it('dispatched Analog', () => {
      expect(KanalDetails.fromPersistence('analog', { band: '4m', frequenz: '84.800' })).toMatchObject({
        type: 'analog',
      });
    });

    it('wirft bei unbekanntem type', () => {
      expect(() => KanalDetails.fromPersistence('zigbee' as never, {})).toThrow(/KanalDetails-Type/);
    });
  });

  describe('toPersistence()', () => {
    it('TMO Roundtrip', () => {
      const original = KanalDetails.tmo({ sprechgruppe: 'SG', gssi: '123' }).value!;
      const persisted = KanalDetails.toPersistence(original);
      const restored = KanalDetails.fromPersistence('tmo', persisted);
      expect(restored).toMatchObject({ type: 'tmo', sprechgruppe: 'SG', gssi: '123' });
    });

    it('DMO Roundtrip', () => {
      const original = KanalDetails.dmo({ dmoKanal: '310', repeater: 'R1' }).value!;
      const persisted = KanalDetails.toPersistence(original);
      const restored = KanalDetails.fromPersistence('dmo', persisted);
      expect(restored).toMatchObject({ type: 'dmo', dmoKanal: '310', repeater: 'R1' });
    });

    it('Analog Roundtrip', () => {
      const original = KanalDetails.analog({ band: '2m', frequenz: '168.200', kanalnummer: '42' }).value!;
      const persisted = KanalDetails.toPersistence(original);
      const restored = KanalDetails.fromPersistence('analog', persisted);
      expect(restored).toMatchObject({ type: 'analog', band: '2m', frequenz: '168.200', kanalnummer: '42' });
    });
  });
});
