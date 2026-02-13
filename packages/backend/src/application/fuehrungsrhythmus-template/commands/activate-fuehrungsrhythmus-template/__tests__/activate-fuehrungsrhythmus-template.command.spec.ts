import { createId } from '@paralleldrive/cuid2';
import { ActivateFuehrungsrhythmusTemplateCommand } from '../activate-fuehrungsrhythmus-template.command';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../../errors/fuehrungsrhythmus-template-error.codes';

/**
 * Unit Tests fuer ActivateFuehrungsrhythmusTemplateCommand.
 *
 * Testet die Command Factory Method Validierung gemaess AAA Pattern mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - Erfolgreiche Erstellung mit gültigen Props
 * - TemplateId Validierung (leer, Whitespace, kein CUID2)
 * - EinsatzId Validierung (leer, Whitespace, kein CUID2)
 * - AktiviertVon Validierung (leer, Whitespace, kein CUID2)
 */
describe('ActivateFuehrungsrhythmusTemplateCommand', () => {
  const validTemplateId = createId();
  const validEinsatzId = createId();
  const validAktiviertVon = createId();

  describe('create', () => {
    it('should create command successfully with valid props', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: validEinsatzId,
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.templateId).toBe(validTemplateId);
      expect(result.value!.einsatzId).toBe(validEinsatzId);
      expect(result.value!.aktiviertVon).toBe(validAktiviertVon);
    });

    // --- templateId Validierung ---

    it('should fail when templateId is empty', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: '',
        einsatzId: validEinsatzId,
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    });

    it('should fail when templateId is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: '   ',
        einsatzId: validEinsatzId,
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    });

    it('should fail when templateId is not a valid CUID2', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: 'not-a-valid-cuid',
        einsatzId: validEinsatzId,
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    });

    // --- einsatzId Validierung ---

    it('should fail when einsatzId is empty', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: '',
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    });

    it('should fail when einsatzId is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: '   ',
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    });

    it('should fail when einsatzId is not a valid CUID2', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: 'not-a-valid-cuid',
        aktiviertVon: validAktiviertVon,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    });

    // --- aktiviertVon Validierung ---

    it('should fail when aktiviertVon is empty', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: validEinsatzId,
        aktiviertVon: '',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTIVIERT_VON_REQUIRED);
    });

    it('should fail when aktiviertVon is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: validEinsatzId,
        aktiviertVon: '   ',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTIVIERT_VON_REQUIRED);
    });

    it('should fail when aktiviertVon is not a valid CUID2', () => {
      // Given & When (Arrange & Act)
      const result = ActivateFuehrungsrhythmusTemplateCommand.create({
        templateId: validTemplateId,
        einsatzId: validEinsatzId,
        aktiviertVon: 'not-a-valid-cuid',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTIVIERT_VON_REQUIRED);
    });
  });
});
