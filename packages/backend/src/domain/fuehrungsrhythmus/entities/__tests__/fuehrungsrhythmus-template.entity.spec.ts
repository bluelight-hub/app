import { FuehrungsrhythmusTemplate } from '../fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusTemplateErstelltEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-erstellt.event';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { FuehrungsrhythmusTemplateName } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-name';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Unit Tests fuer FuehrungsrhythmusTemplate Entity (Aggregate Root).
 *
 * Testet die Factory Methods und Business Rules gemaess AAA Pattern
 * mit Given-When-Then Kommentaren.
 *
 * **Test Coverage:**
 * - create(): Erfolgreiche Erstellung + Event Emission
 * - create(): Validierungsfehler (Name, Eintraege, Intervall)
 * - reconstruct(): Rekonstruktion aus DB ohne Events
 * - softDelete(): Soft-Delete mit Business Rules
 */
describe('FuehrungsrhythmusTemplate Entity', () => {
  /**
   * Generiert eine gueltige UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  /**
   * Erzeugt einen gueltigen FuehrungsrhythmusEintrag fuer Tests.
   */
  const createValidEintrag = (overrides?: { titel?: string; intervallMinuten?: number; offsetMinuten?: number; sortOrder?: number }) => {
    const result = FuehrungsrhythmusEintrag.create({
      titel: overrides?.titel ?? 'Lagebesprechung',
      intervallMinuten: overrides?.intervallMinuten ?? 30,
      offsetMinuten: overrides?.offsetMinuten ?? 0,
      sortOrder: overrides?.sortOrder ?? 0,
    });
    return result.value!;
  };

  describe('create()', () => {
    it('should create fuehrungsrhythmus template successfully', () => {
      // Given (Arrange)
      const createdBy = generateValidUserId();
      const eintrag = createValidEintrag();
      const props = {
        name: 'Standard Fuehrungsrhythmus',
        beschreibung: 'Template fuer den Standardeinsatz',
        eintraege: [eintrag],
        createdBy,
      };

      // When (Act)
      const result = FuehrungsrhythmusTemplate.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();

      const template = result.value!;
      expect(template.id).toBeDefined();
      expect(template.name.value).toBe('Standard Fuehrungsrhythmus');
      expect(template.beschreibung).toBe('Template fuer den Standardeinsatz');
      expect(template.eintraege).toHaveLength(1);
      expect(template.eintraege[0].titel).toBe('Lagebesprechung');
      expect(template.createdBy.equals(createdBy)).toBe(true);
      expect(template.isDeleted).toBe(false);
      expect(template.deletedAt).toBeNull();
      expect(template.deletedBy).toBeNull();
      expect(template.createdAt).toBeInstanceOf(Date);
      expect(template.updatedAt).toBeInstanceOf(Date);
    });

    it('should create template without beschreibung', () => {
      // Given (Arrange)
      const props = {
        name: 'Minimales Template',
        eintraege: [createValidEintrag()],
        createdBy: generateValidUserId(),
      };

      // When (Act)
      const result = FuehrungsrhythmusTemplate.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBeNull();
    });

    it('should create template with multiple eintraege', () => {
      // Given (Arrange)
      const eintrag1 = createValidEintrag({ titel: 'Lagebesprechung', intervallMinuten: 30, sortOrder: 0 });
      const eintrag2 = createValidEintrag({ titel: 'Funkmeldecheck', intervallMinuten: 15, sortOrder: 1 });
      const eintrag3 = createValidEintrag({ titel: 'Abloesung', intervallMinuten: 60, sortOrder: 2 });

      const props = {
        name: 'Komplex Template',
        eintraege: [eintrag1, eintrag2, eintrag3],
        createdBy: generateValidUserId(),
      };

      // When (Act)
      const result = FuehrungsrhythmusTemplate.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.eintraege).toHaveLength(3);
    });

    it('should emit FuehrungsrhythmusTemplateErstelltEvent on create', () => {
      // Given (Arrange)
      const createdBy = generateValidUserId();
      const eintrag1 = createValidEintrag({ titel: 'Lagebesprechung' });
      const eintrag2 = createValidEintrag({ titel: 'Funkmeldecheck', sortOrder: 1 });
      const props = {
        name: 'Test Template',
        eintraege: [eintrag1, eintrag2],
        createdBy,
      };

      // When (Act)
      const result = FuehrungsrhythmusTemplate.create(props);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const template = result.value!;

      const events = template.getDomainEvents();
      expect(events.length).toBe(1);
      expect(events[0]).toBeInstanceOf(FuehrungsrhythmusTemplateErstelltEvent);

      const event = events[0] as FuehrungsrhythmusTemplateErstelltEvent;
      expect(event.templateId.toString()).toBe(template.id.toString());
      expect(event.name).toBe('Test Template');
      expect(event.eintraegeCount).toBe(2);
    });

    it('should fail when name is empty', () => {
      // Given & When (Arrange & Act)
      const result = FuehrungsrhythmusTemplate.create({
        name: '',
        eintraege: [createValidEintrag()],
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FR_TEMPLATE_NAME_REQUIRED');
    });

    it('should fail when name is whitespace only', () => {
      // Given & When (Arrange & Act)
      const result = FuehrungsrhythmusTemplate.create({
        name: '   ',
        eintraege: [createValidEintrag()],
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FR_TEMPLATE_NAME_REQUIRED');
    });

    it('should fail when name exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongName = 'A'.repeat(101);
      const result = FuehrungsrhythmusTemplate.create({
        name: tooLongName,
        eintraege: [createValidEintrag()],
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FR_TEMPLATE_NAME_TOO_LONG');
    });

    it('should fail when eintraege is empty array', () => {
      // Given & When (Arrange & Act)
      const result = FuehrungsrhythmusTemplate.create({
        name: 'Test Template',
        eintraege: [],
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FR_TEMPLATE_EINTRAEGE_EMPTY');
    });

    it('should fail when eintrag has invalid intervall (< 1)', () => {
      // Given & When (Arrange & Act)
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: 'Lagebesprechung',
        intervallMinuten: 0,
        offsetMinuten: 0,
        sortOrder: 0,
      });

      // Then (Assert)
      expect(eintragResult.isFailure).toBe(true);
      expect(eintragResult.error).toContain('FR_TEMPLATE_EINTRAG_INVALID');
    });

    it('should fail when beschreibung exceeds max length', () => {
      // Given & When (Arrange & Act)
      const tooLongBeschreibung = 'B'.repeat(501);
      const result = FuehrungsrhythmusTemplate.create({
        name: 'Test Template',
        eintraege: [createValidEintrag()],
        beschreibung: tooLongBeschreibung,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FR_TEMPLATE_BESCHREIBUNG_TOO_LONG');
    });

    it('should accept beschreibung with exactly 500 characters', () => {
      // Given & When (Arrange & Act)
      const maxBeschreibung = 'B'.repeat(500);
      const result = FuehrungsrhythmusTemplate.create({
        name: 'Test Template',
        eintraege: [createValidEintrag()],
        beschreibung: maxBeschreibung,
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.beschreibung).toBe(maxBeschreibung);
    });

    it('should trim name and beschreibung whitespace', () => {
      // Given & When (Arrange & Act)
      const result = FuehrungsrhythmusTemplate.create({
        name: '  Standard Fuehrungsrhythmus  ',
        beschreibung: '  Im ELW  ',
        eintraege: [createValidEintrag()],
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.name.value).toBe('Standard Fuehrungsrhythmus');
      expect(result.value!.beschreibung).toBe('Im ELW');
    });

    it('should return defensive copy of eintraege (no mutation)', () => {
      // Given (Arrange)
      const eintrag = createValidEintrag();
      const result = FuehrungsrhythmusTemplate.create({
        name: 'Test Template',
        eintraege: [eintrag],
        createdBy: generateValidUserId(),
      });

      // When (Act)
      const template = result.value!;
      const eintraege = template.eintraege;
      // @ts-expect-error - Absichtlicher Push auf die Kopie
      eintraege.push(createValidEintrag({ titel: 'Extra Eintrag' }));

      // Then (Assert) - Original bleibt unveraendert
      expect(template.eintraege).toHaveLength(1);
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct entity without emitting events', () => {
      // Given (Arrange)
      const id = FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId;
      const name = FuehrungsrhythmusTemplateName.create('Standard Fuehrungsrhythmus').value!;
      const eintrag = createValidEintrag();
      const createdBy = generateValidUserId();
      const createdAt = new Date('2026-01-19T10:00:00.000Z');
      const updatedAt = new Date('2026-01-19T10:30:00.000Z');

      // When (Act)
      const template = FuehrungsrhythmusTemplate.reconstruct({
        id,
        name,
        beschreibung: 'Test Beschreibung',
        eintraege: [eintrag],
        createdBy,
        createdAt,
        updatedAt,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(template).toBeDefined();
      expect(template.id.equals(id)).toBe(true);
      expect(template.name.value).toBe('Standard Fuehrungsrhythmus');
      expect(template.beschreibung).toBe('Test Beschreibung');
      expect(template.eintraege).toHaveLength(1);
      expect(template.createdBy.equals(createdBy)).toBe(true);
      expect(template.createdAt).toEqual(createdAt);
      expect(template.updatedAt).toEqual(updatedAt);
      expect(template.isDeleted).toBe(false);
      expect(template.deletedAt).toBeNull();
      expect(template.deletedBy).toBeNull();

      // CRITICAL: reconstruct() darf KEINE Domain Events emittieren
      const events = template.getDomainEvents();
      expect(events.length).toBe(0);
    });

    it('should reconstruct deleted entity correctly', () => {
      // Given (Arrange)
      const id = FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId;
      const name = FuehrungsrhythmusTemplateName.create('Geloeschtes Template').value!;
      const createdBy = generateValidUserId();
      const deletedBy = generateValidUserId();
      const deletedAt = new Date('2026-01-20T12:00:00.000Z');

      // When (Act)
      const template = FuehrungsrhythmusTemplate.reconstruct({
        id,
        name,
        beschreibung: null,
        eintraege: [createValidEintrag()],
        createdBy,
        createdAt: new Date('2026-01-19T10:00:00.000Z'),
        updatedAt: new Date('2026-01-20T12:00:00.000Z'),
        isDeleted: true,
        deletedAt,
        deletedBy,
      });

      // Then (Assert)
      expect(template.isDeleted).toBe(true);
      expect(template.deletedAt).toEqual(deletedAt);
      expect(template.deletedBy!.equals(deletedBy)).toBe(true);

      // CRITICAL: reconstruct() darf KEINE Domain Events emittieren
      expect(template.getDomainEvents().length).toBe(0);
    });

    it('should reconstruct entity with null beschreibung', () => {
      // Given (Arrange)
      const id = FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId;
      const name = FuehrungsrhythmusTemplateName.create('Ohne Beschreibung').value!;

      // When (Act)
      const template = FuehrungsrhythmusTemplate.reconstruct({
        id,
        name,
        beschreibung: null,
        eintraege: [createValidEintrag()],
        createdBy: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(template.beschreibung).toBeNull();
    });
  });

  describe('softDelete()', () => {
    /**
     * Erzeugt ein gueltiges FuehrungsrhythmusTemplate fuer SoftDelete-Tests.
     * Cleared automatisch die Create-Events.
     */
    const createTemplateForDelete = () => {
      const createdBy = generateValidUserId();
      const result = FuehrungsrhythmusTemplate.create({
        name: 'Zu loeschendes Template',
        beschreibung: 'Wird geloescht',
        eintraege: [createValidEintrag()],
        createdBy,
      });
      const template = result.value!;
      template.clearDomainEvents();
      return template;
    };

    it('should mark template as deleted (isDeleted=true)', () => {
      // Given (Arrange)
      const template = createTemplateForDelete();
      const userId = generateValidUserId();

      // When (Act)
      const result = template.softDelete(userId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(template.isDeleted).toBe(true);
    });

    it('should set deletedAt', () => {
      // Given (Arrange)
      const template = createTemplateForDelete();
      const userId = generateValidUserId();
      const beforeDelete = new Date();

      // When (Act)
      const result = template.softDelete(userId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(template.deletedAt).toBeDefined();
      expect(template.deletedAt).toBeInstanceOf(Date);
      expect(template.deletedAt!.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
    });

    it('should set deletedBy', () => {
      // Given (Arrange)
      const template = createTemplateForDelete();
      const userId = generateValidUserId();

      // When (Act)
      const result = template.softDelete(userId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(template.deletedBy).toBeDefined();
      expect(template.deletedBy!.equals(userId)).toBe(true);
    });

    it('should fail when already deleted (ALREADY_DELETED)', () => {
      // Given (Arrange)
      const template = createTemplateForDelete();
      const userId = generateValidUserId();
      template.softDelete(userId);

      // When (Act)
      const result = template.softDelete(userId);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('FR_TEMPLATE_ALREADY_DELETED');
    });

    it('should update updatedAt timestamp on delete', () => {
      // Given (Arrange)
      const template = createTemplateForDelete();
      const userId = generateValidUserId();
      const originalUpdatedAt = template.updatedAt;

      // When (Act)
      const result = template.softDelete(userId);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(template.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('Identity Equality', () => {
    it('should be equal when IDs match', () => {
      // Given (Arrange)
      const id = FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId;
      const name1 = FuehrungsrhythmusTemplateName.create('Template A').value!;
      const name2 = FuehrungsrhythmusTemplateName.create('Template B').value!;
      const eintrag = createValidEintrag();

      // When (Act)
      const template1 = FuehrungsrhythmusTemplate.reconstruct({
        id,
        name: name1,
        beschreibung: null,
        eintraege: [eintrag],
        createdBy: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      const template2 = FuehrungsrhythmusTemplate.reconstruct({
        id, // gleiche ID
        name: name2, // anderer Name
        beschreibung: 'Beschreibung',
        eintraege: [eintrag],
        createdBy: generateValidUserId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(template1.equals(template2)).toBe(true);
    });

    it('should not be equal when IDs differ', () => {
      // Given (Arrange)
      const name = FuehrungsrhythmusTemplateName.create('Gleicher Name').value!;
      const createdBy = generateValidUserId();
      const eintrag = createValidEintrag();

      // When (Act)
      const template1 = FuehrungsrhythmusTemplate.reconstruct({
        id: FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId,
        name,
        beschreibung: null,
        eintraege: [eintrag],
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      const template2 = FuehrungsrhythmusTemplate.reconstruct({
        id: FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId, // andere ID
        name,
        beschreibung: null,
        eintraege: [eintrag],
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      // Then (Assert)
      expect(template1.equals(template2)).toBe(false);
    });
  });

  describe('FuehrungsrhythmusEintrag boundary validation', () => {
    it('should accept eintrag with intervallMinuten at max boundary (1440)', () => {
      // Given & When (Arrange & Act)
      const result = FuehrungsrhythmusTemplate.create({
        name: 'Test Template',
        beschreibung: null,
        eintraege: [FuehrungsrhythmusEintrag.create({ titel: 'Daily Review', intervallMinuten: 1440, offsetMinuten: 0, sortOrder: 0 }).value!],
        createdBy: generateValidUserId(),
      });

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('should fail when eintrag has intervallMinuten over max (1441)', () => {
      // Given & When (Arrange & Act)
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: 'Daily Review',
        intervallMinuten: 1441,
        offsetMinuten: 0,
        sortOrder: 0,
      });

      // Then (Assert)
      expect(eintragResult.isFailure).toBe(true);
      expect(eintragResult.error).toContain('FR_TEMPLATE_EINTRAG_INVALID');
    });

    it('should accept eintrag with offsetMinuten at max boundary (1440)', () => {
      // Given & When (Arrange & Act)
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: 'Delayed Review',
        intervallMinuten: 30,
        offsetMinuten: 1440,
        sortOrder: 0,
      });

      // Then (Assert)
      expect(eintragResult.isSuccess).toBe(true);
      expect(eintragResult.value).toBeDefined();
    });

    it('should fail when eintrag has offsetMinuten over max (1441)', () => {
      // Given & When (Arrange & Act)
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: 'Delayed Review',
        intervallMinuten: 30,
        offsetMinuten: 1441,
        sortOrder: 0,
      });

      // Then (Assert)
      expect(eintragResult.isFailure).toBe(true);
      expect(eintragResult.error).toContain('FR_TEMPLATE_EINTRAG_INVALID');
    });

    it('should fail when eintrag has negative offsetMinuten (-1)', () => {
      // Given & When (Arrange & Act)
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: 'Negative Offset',
        intervallMinuten: 30,
        offsetMinuten: -1,
        sortOrder: 0,
      });

      // Then (Assert)
      expect(eintragResult.isFailure).toBe(true);
      expect(eintragResult.error).toContain('FR_TEMPLATE_EINTRAG_INVALID');
    });

    it('should fail when eintrag has negative sortOrder (-1)', () => {
      // Given & When (Arrange & Act)
      const eintragResult = FuehrungsrhythmusEintrag.create({
        titel: 'Negative SortOrder',
        intervallMinuten: 30,
        offsetMinuten: 0,
        sortOrder: -1,
      });

      // Then (Assert)
      expect(eintragResult.isFailure).toBe(true);
      expect(eintragResult.error).toContain('FR_TEMPLATE_EINTRAG_INVALID');
    });
  });
});
