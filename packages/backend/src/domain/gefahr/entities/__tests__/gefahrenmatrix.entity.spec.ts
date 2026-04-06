// @ts-nocheck
import { GefahrenmatrixBewertung } from '../gefahrenmatrix.entity';
import { Gefahrentyp } from '../../value-objects/gefahrentyp';
import { Schutzobjekt } from '../../value-objects/schutzobjekt';
import { Warnstufe } from '../../value-objects/warnstufe';

describe('GefahrenmatrixBewertung', () => {
  const validProps = {
    einsatzId: 'test-einsatz-id-1234567',
    gefahrentyp: Gefahrentyp.ATEMGIFTE,
    schutzobjekt: Schutzobjekt.MENSCHEN,
    warnstufe: Warnstufe.HOCH,
    aktualisiertVon: 'test-user-id-12345678',
  };

  describe('create', () => {
    it('erstellt eine Bewertung mit gültigen Props', () => {
      const result = GefahrenmatrixBewertung.create(validProps);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.gefahrentyp).toBe(Gefahrentyp.ATEMGIFTE);
      expect(result.value!.schutzobjekt).toBe(Schutzobjekt.MENSCHEN);
      expect(result.value!.warnstufe).toBe(Warnstufe.HOCH);
    });

    it('emittiert GefahrenmatrixAktualisiertEvent', () => {
      const result = GefahrenmatrixBewertung.create(validProps);

      expect(result.isSuccess).toBe(true);
      const events = result.value!.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('GefahrenmatrixAktualisiertEvent');
    });

    it('schlägt fehl bei ungültigem Gefahrentyp', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        gefahrentyp: 'INVALID' as Gefahrentyp,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GEFAHR_GEFAHRENTYP_INVALID');
    });

    it('schlägt fehl bei ungültigem Schutzobjekt', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        schutzobjekt: 'INVALID' as Schutzobjekt,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GEFAHR_SCHUTZOBJEKT_INVALID');
    });

    it('schlägt fehl bei ungültiger Warnstufe', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        warnstufe: 'INVALID' as Warnstufe,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('GEFAHR_WARNSTUFE_INVALID');
    });

    it('speichert optionale Beschreibung', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        beschreibung: 'Chlorgasaustritt in Halle 3',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe('Chlorgasaustritt in Halle 3');
    });

    it('trimmt Beschreibung', () => {
      const result = GefahrenmatrixBewertung.create({
        ...validProps,
        beschreibung: '  Test  ',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe('Test');
    });
  });

  describe('updateWarnstufe', () => {
    it('aktualisiert die Warnstufe', () => {
      const bewertung = GefahrenmatrixBewertung.create(validProps).value!;
      bewertung.clearDomainEvents();

      const result = bewertung.updateWarnstufe(Warnstufe.AKUT, 'updater-id-1234567');

      expect(result.isSuccess).toBe(true);
      expect(bewertung.warnstufe).toBe(Warnstufe.AKUT);
    });

    it('emittiert Event bei Änderung', () => {
      const bewertung = GefahrenmatrixBewertung.create(validProps).value!;
      bewertung.clearDomainEvents();

      bewertung.updateWarnstufe(Warnstufe.AKUT, 'updater-id-1234567');

      const events = bewertung.getDomainEvents();
      expect(events).toHaveLength(1);
    });
  });

  describe('reconstruct', () => {
    it('rekonstruiert Bewertung ohne Events', () => {
      const created = GefahrenmatrixBewertung.create(validProps).value!;

      const reconstructed = GefahrenmatrixBewertung.reconstruct({
        id: created.id,
        einsatzId: created.einsatzId,
        gefahrentyp: created.gefahrentyp,
        schutzobjekt: created.schutzobjekt,
        warnstufe: created.warnstufe,
        beschreibung: created.beschreibung,
        gemeldetVon: created.gemeldetVon,
        aktualisiertVon: created.aktualisiertVon,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });

      expect(reconstructed.getDomainEvents()).toHaveLength(0);
      expect(reconstructed.gefahrentyp).toBe(created.gefahrentyp);
    });
  });
});
