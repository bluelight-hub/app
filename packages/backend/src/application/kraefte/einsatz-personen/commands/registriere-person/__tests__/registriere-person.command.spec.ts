// @ts-nocheck
import { createId } from '@paralleldrive/cuid2';
import { RegistrierePersonCommand } from '../registriere-person.command';

describe('RegistrierePersonCommand', () => {
  const validEinsatzId = '123e4567-e89b-12d3-a456-426614174000';
  const validStammPersonId = createId();
  const validRegistriertVon = createId();
  const validQualifikationId = createId();

  describe('create - Success Cases', () => {
    it('sollte Command mit allen Feldern erstellen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        stammPersonId: validStammPersonId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: [validQualifikationId],
        registriertVon: validRegistriertVon,
        position: { lat: 49.8728, lng: 8.6512 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.stammPersonId).toBe(validStammPersonId);
      expect(result.value?.vorname).toBe('Max');
      expect(result.value?.nachname).toBe('Mustermann');
      expect(result.value?.funktion).toBe('Helfer');
      expect(result.value?.qualifikationIds).toEqual([validQualifikationId]);
      expect(result.value?.registriertVon).toBe(validRegistriertVon);
      expect(result.value?.position).toEqual({ lat: 49.8728, lng: 8.6512 });
    });

    it('sollte Command ohne stammPersonId erstellen (manuelle Erfassung)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Extern',
        nachname: 'Helfer',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.stammPersonId).toBeUndefined();
    });

    it('sollte Command ohne Position erstellen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toBeUndefined();
    });

    it('sollte Command ohne qualifikationIds erstellen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationIds).toEqual([]);
    });

    it('sollte Whitespace trimmen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: `  ${validEinsatzId}  `,
        stammPersonId: `  ${validStammPersonId}  `,
        vorname: '  Max  ',
        nachname: '  Mustermann  ',
        funktion: '  Helfer  ',
        registriertVon: `  ${validRegistriertVon}  `,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.einsatzId).toBe(validEinsatzId);
      expect(result.value?.stammPersonId).toBe(validStammPersonId);
      expect(result.value?.vorname).toBe('Max');
      expect(result.value?.nachname).toBe('Mustermann');
      expect(result.value?.funktion).toBe('Helfer');
      expect(result.value?.registriertVon).toBe(validRegistriertVon);
    });

    it('sollte leere stammPersonId als undefined behandeln', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        stammPersonId: '  ', // Whitespace only
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.stammPersonId).toBeUndefined();
    });
  });

  describe('create - Validation: einsatzId', () => {
    it('sollte fehlschlagen mit leerem einsatzId', () => {
      // Given (Arrange)
      const props = {
        einsatzId: '',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });

    it('sollte fehlschlagen mit whitespace-only einsatzId', () => {
      // Given (Arrange)
      const props = {
        einsatzId: '   ',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('einsatzId ist erforderlich');
    });
  });

  describe('create - Validation: stammPersonId', () => {
    it('sollte fehlschlagen mit ungültiger stammPersonId (kein CUID2)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        stammPersonId: 'invalid-cuid',
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('stammPersonId muss ein gültiger CUID2-Identifier sein');
    });

    it('sollte fehlschlagen mit UUID statt CUID2 für stammPersonId', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        stammPersonId: '123e4567-e89b-12d3-a456-426614174000', // UUID
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('stammPersonId muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('create - Validation: vorname', () => {
    it('sollte fehlschlagen mit leerem Vornamen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: '',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Vorname ist erforderlich');
    });

    it('sollte fehlschlagen mit zu langem Vornamen (> 100 Zeichen)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'A'.repeat(101),
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('maximal 100 Zeichen');
    });

    it('sollte Vorname mit genau 100 Zeichen akzeptieren', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'A'.repeat(100),
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.vorname).toBe('A'.repeat(100));
    });
  });

  describe('create - Validation: nachname', () => {
    it('sollte fehlschlagen mit leerem Nachnamen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: '',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Nachname ist erforderlich');
    });

    it('sollte fehlschlagen mit zu langem Nachnamen (> 100 Zeichen)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'N'.repeat(101),
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('maximal 100 Zeichen');
    });
  });

  describe('create - Validation: funktion', () => {
    it('sollte fehlschlagen mit leerer Funktion', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: '',
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Funktion ist erforderlich');
    });

    it('sollte fehlschlagen mit zu langer Funktion (> 50 Zeichen)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'F'.repeat(51),
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('maximal 50 Zeichen');
    });

    it('sollte Funktion mit genau 50 Zeichen akzeptieren', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'F'.repeat(50),
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.funktion).toBe('F'.repeat(50));
    });
  });

  describe('create - Validation: registriertVon', () => {
    it('sollte fehlschlagen mit leerem registriertVon', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: '',
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('registriertVon ist erforderlich');
    });

    it('sollte fehlschlagen mit ungültigem registriertVon (kein CUID2)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: 'not-a-cuid',
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('registriertVon muss ein gültiger CUID2-Identifier sein');
    });
  });

  describe('create - Validation: qualifikationIds', () => {
    it('sollte fehlschlagen mit ungültiger Qualifikation-ID', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: ['invalid-id'],
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('ungültig');
    });

    it('sollte mehrere gültige Qualifikation-IDs akzeptieren', () => {
      // Given (Arrange)
      const qualIds = [createId(), createId(), createId()];
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: qualIds,
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationIds).toEqual(qualIds);
    });

    it('sollte leere qualifikationIds-Array trimmen', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        qualifikationIds: ['  ', ''],
        registriertVon: validRegistriertVon,
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.qualifikationIds).toEqual([]);
    });
  });

  describe('create - Validation: position', () => {
    it('sollte fehlschlagen mit ungültigem Breitengrad (> 90)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 91, lng: 0 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Breitengrad');
    });

    it('sollte fehlschlagen mit ungültigem Breitengrad (< -90)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: -91, lng: 0 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Breitengrad');
    });

    it('sollte fehlschlagen mit ungültigem Längengrad (> 180)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 0, lng: 181 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Längengrad');
    });

    it('sollte fehlschlagen mit ungültigem Längengrad (< -180)', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 0, lng: -181 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Längengrad');
    });

    it('sollte Grenzwerte für Position akzeptieren', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: 90, lng: 180 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toEqual({ lat: 90, lng: 180 });
    });

    it('sollte negative Grenzwerte für Position akzeptieren', () => {
      // Given (Arrange)
      const props = {
        einsatzId: validEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Helfer',
        registriertVon: validRegistriertVon,
        position: { lat: -90, lng: -180 },
      };

      // When (Act)
      const result = RegistrierePersonCommand.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.position).toEqual({ lat: -90, lng: -180 });
    });
  });
});
