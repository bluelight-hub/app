import { createId } from '@paralleldrive/cuid2';
import { RegistrierePersonViaQrCodeCommand } from '../registriere-person-qr.command';

describe('RegistrierePersonViaQrCodeCommand', () => {
  // Test fixtures
  const validEinsatzId = '550e8400-e29b-41d4-a716-446655440000';
  const validPersonalnummer = '12345678';
  const validVorname = 'Max';
  const validNachname = 'Mustermann';
  const validFunkkennung = '4711';
  const validRegistriertVon = createId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    describe('erfolgreiche Erstellung', () => {
      it('sollte Command mit allen Pflichtfeldern erstellen', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value!.einsatzId).toBe(validEinsatzId);
        expect(result.value!.personalnummer).toBe(validPersonalnummer);
        expect(result.value!.vorname).toBe(validVorname);
        expect(result.value!.nachname).toBe(validNachname);
        expect(result.value!.funkkennung).toBeUndefined();
        expect(result.value!.registriertVon).toBe(validRegistriertVon);
      });

      it('sollte Command mit optionaler Funkkennung erstellen', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          funkkennung: validFunkkennung,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.funkkennung).toBe(validFunkkennung);
      });

      it('sollte Whitespace trimmen', () => {
        // Given
        const props = {
          einsatzId: `  ${validEinsatzId}  `,
          personalnummer: `  ${validPersonalnummer}  `,
          vorname: `  ${validVorname}  `,
          nachname: `  ${validNachname}  `,
          funkkennung: `  ${validFunkkennung}  `,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.einsatzId).toBe(validEinsatzId);
        expect(result.value!.personalnummer).toBe(validPersonalnummer);
        expect(result.value!.vorname).toBe(validVorname);
        expect(result.value!.nachname).toBe(validNachname);
        expect(result.value!.funkkennung).toBe(validFunkkennung);
      });

      it('sollte leere Funkkennung zu undefined konvertieren', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          funkkennung: '   ',
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.funkkennung).toBeUndefined();
      });
    });

    describe('Validierungsfehler', () => {
      it('sollte fehlschlagen bei leerer einsatzId', () => {
        // Given
        const props = {
          einsatzId: '',
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('einsatzId ist erforderlich');
      });

      it('sollte fehlschlagen bei leerer Personalnummer', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: '',
          vorname: validVorname,
          nachname: validNachname,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Personalnummer ist erforderlich');
      });

      it('sollte fehlschlagen bei zu langer Personalnummer', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: 'a'.repeat(51),
          vorname: validVorname,
          nachname: validNachname,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Personalnummer darf maximal 50 Zeichen lang sein');
      });

      it('sollte fehlschlagen bei leerem Vorname', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: '',
          nachname: validNachname,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Vorname ist erforderlich');
      });

      it('sollte fehlschlagen bei zu langem Vorname', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: 'a'.repeat(101),
          nachname: validNachname,
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Vorname darf maximal 100 Zeichen lang sein');
      });

      it('sollte fehlschlagen bei leerem Nachname', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: '',
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Nachname ist erforderlich');
      });

      it('sollte fehlschlagen bei zu langem Nachname', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: 'a'.repeat(101),
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Nachname darf maximal 100 Zeichen lang sein');
      });

      it('sollte fehlschlagen bei zu langer Funkkennung', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          funkkennung: 'a'.repeat(51),
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Funkkennung darf maximal 50 Zeichen lang sein');
      });

      it('sollte fehlschlagen bei leerem registriertVon', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          registriertVon: '',
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon ist erforderlich');
      });

      it('sollte fehlschlagen bei ungueltigem CUID2 fuer registriertVon', () => {
        // Given
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: validPersonalnummer,
          vorname: validVorname,
          nachname: validNachname,
          registriertVon: 'invalid-cuid',
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('registriertVon muss ein gueltiger CUID2-Identifier sein');
      });
    });

    describe('DRK QR-Code Mapping', () => {
      it('sollte DRK QR-Parameter korrekt mappen (mnr -> personalnummer)', () => {
        // Given - Simulating data extracted from DRK QR code
        // drk://person?mnr=87654321&vn=Erika&nn=Musterfrau&fk=4711
        const props = {
          einsatzId: validEinsatzId,
          personalnummer: '87654321', // mnr from QR
          vorname: 'Erika', // vn from QR
          nachname: 'Musterfrau', // nn from QR
          funkkennung: '4711', // fk from QR
          registriertVon: validRegistriertVon,
        };

        // When
        const result = RegistrierePersonViaQrCodeCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value!.personalnummer).toBe('87654321');
        expect(result.value!.vorname).toBe('Erika');
        expect(result.value!.nachname).toBe('Musterfrau');
        expect(result.value!.funkkennung).toBe('4711');
      });
    });
  });
});
