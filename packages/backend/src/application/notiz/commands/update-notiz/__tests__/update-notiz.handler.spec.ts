import { UpdateNotizHandler } from '../update-notiz.handler';
import { UpdateNotizCommand } from '../update-notiz.command';
import { Notiz } from '@domain/notiz/entities/notiz.entity';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import { UserId } from '@domain/value-objects/user-id';
import { NOTIZ_ERROR_CODES } from '../../../errors/notiz-error.codes';

describe('UpdateNotizHandler', () => {
  let handler: UpdateNotizHandler;
  let mockNotizRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
  };
  let mockKategorieRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
    existsByNameAndEinsatzId: jest.Mock;
    delete: jest.Mock;
  };
  let mockOutboxRepository: { save: jest.Mock };
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let mockResponseFactory: { create: jest.Mock };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockNotizRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
    };

    // Story 8.2: KategorieRepository Mock
    mockKategorieRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByNameAndEinsatzId: jest.fn(),
      delete: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockResponseFactory = {
      create: jest.fn().mockReturnValue({
        id: 'notiz-id',
        einsatzId: 'einsatz-123',
        titel: 'Aktualisierter Titel',
        inhalt: null,
        kategorie: null,
        erstelltVon: 'user-123',
        createdAt: '2026-02-03T10:00:00.000Z',
        updatedAt: '2026-02-03T10:30:00.000Z',
      }),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({});
      }),
    };

    handler = new UpdateNotizHandler(mockPrismaService as any, mockOutboxRepository as any, mockNotizRepository as any, mockKategorieRepository as any, mockLogger as any, mockResponseFactory as any);
  });

  const createValidNotiz = (): Notiz => {
    const id = NotizId.create().value! as NotizId;
    const titel = NotizTitel.create('Original Titel').value!;
    const erstelltVon = UserId.create().value!;
    return Notiz.reconstruct({
      id,
      einsatzId: 'einsatz-123',
      titel,
      inhalt: 'Originaler Inhalt',
      kategorie: 'Lage',
      kategorieId: null, // Story 8.2
      istTeamsichtbar: false,
      erstelltVon,
      createdAt: new Date('2026-02-03T10:00:00.000Z'),
      updatedAt: new Date('2026-02-03T10:00:00.000Z'),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
  };

  it('should update notiz successfully', async () => {
    // Given (Arrange)
    const notiz = createValidNotiz();
    mockNotizRepository.findById.mockResolvedValue(notiz);

    const commandResult = UpdateNotizCommand.create({
      notizId: notiz.id.toString(),
      titel: 'Neuer Titel',
      aktualisiertVon: 'user-456',
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockNotizRepository.findById).toHaveBeenCalled();
    expect(mockNotizRepository.save).toHaveBeenCalled();
    expect(mockResponseFactory.create).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Notiz aktualisiert'), 'UpdateNotizHandler');
  });

  it('should fail when notiz not found', async () => {
    // Given (Arrange)
    mockNotizRepository.findById.mockResolvedValue(null);

    const commandResult = UpdateNotizCommand.create({
      notizId: 'nonexistent-id',
      titel: 'Neuer Titel',
      aktualisiertVon: 'user-456',
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(NOTIZ_ERROR_CODES.NOT_FOUND);
    expect(mockNotizRepository.save).not.toHaveBeenCalled();
  });

  it('should fail when notiz is deleted', async () => {
    // Given (Arrange)
    const id = NotizId.create().value! as NotizId;
    const titel = NotizTitel.create('Geloeschte Notiz').value!;
    const deletedNotiz = Notiz.reconstruct({
      id,
      einsatzId: 'einsatz-123',
      titel,
      inhalt: null,
      kategorie: null,
      kategorieId: null, // Story 8.2
      istTeamsichtbar: false,
      erstelltVon: UserId.create().value!,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: UserId.create().value!,
    });
    mockNotizRepository.findById.mockResolvedValue(deletedNotiz);

    const commandResult = UpdateNotizCommand.create({
      notizId: id.toString(),
      titel: 'Neuer Titel',
      aktualisiertVon: 'user-456',
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('NOTIZ_ALREADY_DELETED');
    expect(mockNotizRepository.save).not.toHaveBeenCalled();
  });

  describe('UpdateNotizCommand.create()', () => {
    it('should fail when no changes provided', () => {
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        aktualisiertVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(NOTIZ_ERROR_CODES.NO_CHANGES);
    });

    it('should fail when aktualisiertVon is empty', () => {
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        titel: 'Neuer Titel',
        aktualisiertVon: '',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(NOTIZ_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    });

    it('should fail when notizId is empty', () => {
      const result = UpdateNotizCommand.create({
        notizId: '',
        titel: 'Neuer Titel',
        aktualisiertVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
    });

    it('should fail when titel is empty string', () => {
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        titel: '',
        aktualisiertVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(NOTIZ_ERROR_CODES.TITEL_REQUIRED);
    });

    it('should create command successfully with titel', () => {
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        titel: 'Neuer Titel',
        aktualisiertVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.titel).toBe('Neuer Titel');
    });

    it('should create command with null inhalt', () => {
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        inhalt: null,
        aktualisiertVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inhalt).toBeNull();
    });

    it('should create command with null kategorie', () => {
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        kategorie: null,
        aktualisiertVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorie).toBeNull();
    });
  });

  describe('kategorieId (Story 8.2)', () => {
    it('should update Notiz with new kategorieId', async () => {
      // Given (Arrange)
      const notiz = createValidNotiz();
      mockNotizRepository.findById.mockResolvedValue(notiz);

      const newKategorieId = 'clw3h8x9y0000kategorie2b';
      const commandResult = UpdateNotizCommand.create({
        notizId: notiz.id.toString(),
        kategorieId: newKategorieId,
        aktualisiertVon: 'user-456',
      });
      expect(commandResult.isSuccess).toBe(true);

      // Story 8.2: Mock Kategorie existiert und gehört zum selben Einsatz wie die Notiz
      const prismaTx = {
        kategorie: {
          findUnique: jest.fn().mockResolvedValue({
            id: newKategorieId,
            einsatzId: notiz.einsatzId,
            geloeschtAm: null,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(prismaTx));

      // When (Act)
      const result = await handler.execute(commandResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockNotizRepository.save).toHaveBeenCalled();
      // Verify kategorie was updated
      const savedNotiz = mockNotizRepository.save.mock.calls[0][0];
      expect(savedNotiz.kategorieId).toBe(newKategorieId);
    });

    it('should update Notiz and remove kategorieId (set to null)', async () => {
      // Given (Arrange) - Notiz MIT kategorieId
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Notiz mit Kategorie').value!;
      const erstelltVon = UserId.create().value!;
      const notizMitKategorie = Notiz.reconstruct({
        id,
        einsatzId: 'einsatz-123',
        titel,
        inhalt: 'Inhalt',
        kategorie: 'Lage',
        kategorieId: 'clw3h8x9y0000kategorie1a', // Hat bereits eine Kategorie
        istTeamsichtbar: false,
        erstelltVon,
        createdAt: new Date('2026-02-03T10:00:00.000Z'),
        updatedAt: new Date('2026-02-03T10:00:00.000Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      mockNotizRepository.findById.mockResolvedValue(notizMitKategorie);

      const commandResult = UpdateNotizCommand.create({
        notizId: id.toString(),
        kategorieId: null, // Kategorie entfernen
        aktualisiertVon: 'user-456',
      });
      expect(commandResult.isSuccess).toBe(true);

      // When (Act)
      const result = await handler.execute(commandResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockNotizRepository.save).toHaveBeenCalled();
      const savedNotiz = mockNotizRepository.save.mock.calls[0][0];
      expect(savedNotiz.kategorieId).toBeNull();
    });

    it('should update Notiz by changing kategorieId from one to another', async () => {
      // Given (Arrange) - Notiz mit kategorieId kat-1
      const id = NotizId.create().value! as NotizId;
      const titel = NotizTitel.create('Notiz wechselt Kategorie').value!;
      const erstelltVon = UserId.create().value!;
      const oldKategorieId = 'clw3h8x9y0000kategorie1a';
      const newKategorieId = 'clw3h8x9y0000kategorie2b';
      const einsatzId = 'einsatz-123';

      const notiz = Notiz.reconstruct({
        id,
        einsatzId,
        titel,
        inhalt: 'Inhalt',
        kategorie: 'Lage',
        kategorieId: oldKategorieId,
        istTeamsichtbar: false,
        erstelltVon,
        createdAt: new Date('2026-02-03T10:00:00.000Z'),
        updatedAt: new Date('2026-02-03T10:00:00.000Z'),
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      mockNotizRepository.findById.mockResolvedValue(notiz);

      const commandResult = UpdateNotizCommand.create({
        notizId: id.toString(),
        kategorieId: newKategorieId, // Von kat-1 zu kat-2
        aktualisiertVon: 'user-456',
      });
      expect(commandResult.isSuccess).toBe(true);

      // Story 8.2: Mock Kategorie existiert und gehört zum selben Einsatz wie die Notiz
      const prismaTx = {
        kategorie: {
          findUnique: jest.fn().mockResolvedValue({
            id: newKategorieId,
            einsatzId,
            geloeschtAm: null,
          }),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(prismaTx));

      // When (Act)
      const result = await handler.execute(commandResult.value!);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockNotizRepository.save).toHaveBeenCalled();
      const savedNotiz = mockNotizRepository.save.mock.calls[0][0];
      expect(savedNotiz.kategorieId).toBe(newKategorieId);
      expect(savedNotiz.kategorieId).not.toBe(oldKategorieId);
    });

    it('should create command with valid kategorieId', () => {
      // Given & When
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        kategorieId: 'clw3h8x9y0000kategorie1a',
        aktualisiertVon: 'user-123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorieId).toBe('clw3h8x9y0000kategorie1a');
    });

    it('should create command with null kategorieId', () => {
      // Given & When
      const result = UpdateNotizCommand.create({
        notizId: 'notiz-id',
        kategorieId: null,
        aktualisiertVon: 'user-123',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorieId).toBeNull();
    });
  });
});
