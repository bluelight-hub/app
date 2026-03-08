// @ts-nocheck
import { createId } from '@paralleldrive/cuid2';
import { CreateFuehrungsrhythmusTemplateCommand } from '../create-fuehrungsrhythmus-template.command';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../../errors/fuehrungsrhythmus-template-error.codes';

/**
 * Unit Tests fuer CreateFuehrungsrhythmusTemplateCommand.
 *
 * Testet die Command Factory Method Validierung gemaess AAA Pattern mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - Erfolgreiche Erstellung mit allen Feldern
 * - Erfolgreiche Erstellung mit Pflichtfeldern only
 * - Name Validierung (leer, zu lang, Trimming)
 * - Eintraege Validierung (leer / fehlend)
 * - CreatedBy Validierung (leer, kein CUID2)
 * - Beschreibung Validierung (zu lang)
 */
describe('CreateFuehrungsrhythmusTemplateCommand', () => {
  const validCreatedBy = createId();

  const validEintraege = [
    { titel: 'Lagebeurteilung', intervallMinuten: 30, offsetMinuten: 0 },
    { titel: 'Funkmeldecheck', intervallMinuten: 15 },
  ];

  describe('create', () => {
    it('should create command successfully with all fields', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Fuehrungsrhythmus 30min',
        beschreibung: 'Standard-Fuehrungsrhythmus mit 30-Minuten-Takt',
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.name).toBe('Fuehrungsrhythmus 30min');
      expect(result.value?.beschreibung).toBe('Standard-Fuehrungsrhythmus mit 30-Minuten-Takt');
      expect(result.value?.eintraege).toHaveLength(2);
      expect(result.value?.createdBy).toBe(validCreatedBy);
    });

    it('should create command successfully with required fields only', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Basis-Rhythmus',
        eintraege: [{ titel: 'Lagebeurteilung', intervallMinuten: 30 }],
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.name).toBe('Basis-Rhythmus');
      expect(result.value?.beschreibung).toBeUndefined();
      expect(result.value?.eintraege).toHaveLength(1);
      expect(result.value?.createdBy).toBe(validCreatedBy);
    });

    it('should fail when name is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: '',
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_REQUIRED);
    });

    it('should fail when name is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: '   ',
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_REQUIRED);
    });

    it('should fail when name exceeds max length (>100 Zeichen)', () => {
      // Given & When (Arrange & Act)
      const tooLongName = 'A'.repeat(101);
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: tooLongName,
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should trim name whitespace', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: '  Fuehrungsrhythmus 30min  ',
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('Fuehrungsrhythmus 30min');
    });

    it('should accept name with exactly 100 characters', () => {
      // Given & When (Arrange & Act)
      const maxName = 'A'.repeat(100);
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: maxName,
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe(maxName);
    });

    it('should fail when eintraege is empty array', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        eintraege: [],
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NO_EINTRAEGE);
    });

    it('should fail when eintraege is undefined', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        eintraege: undefined as unknown as [],
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NO_EINTRAEGE);
    });

    it('should fail when createdBy is empty', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        eintraege: validEintraege,
        createdBy: '',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should fail when createdBy is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        eintraege: validEintraege,
        createdBy: '   ',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should fail when createdBy is not a valid CUID2', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        eintraege: validEintraege,
        createdBy: 'not-a-valid-cuid',
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATED_BY_REQUIRED);
    });

    it('should fail when beschreibung exceeds max length (>500 Zeichen)', () => {
      // Given & When (Arrange & Act)
      const tooLongBeschreibung = 'B'.repeat(501);
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        beschreibung: tooLongBeschreibung,
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
    });

    it('should accept beschreibung with exactly 500 characters', () => {
      // Given & When (Arrange & Act)
      const maxBeschreibung = 'B'.repeat(500);
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        beschreibung: maxBeschreibung,
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.beschreibung).toBe(maxBeschreibung);
    });

    it('should trim beschreibung whitespace and treat empty as undefined', () => {
      // Given & When (Arrange & Act)
      const result = CreateFuehrungsrhythmusTemplateCommand.create({
        name: 'Test Template',
        beschreibung: '   ',
        eintraege: validEintraege,
        createdBy: validCreatedBy,
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.beschreibung).toBeUndefined();
    });
  });
});
