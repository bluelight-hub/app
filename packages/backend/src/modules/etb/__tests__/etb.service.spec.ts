import { PaginationService } from '@/common/services/pagination.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddAttachmentDto } from '../dto/add-attachment.dto';
import { CreateEtbDto } from '../dto/create-etb.dto';
import { EtbKategorie } from '../dto/etb-kategorie.enum';
import { UeberschreibeEtbDto } from '../dto/ueberschreibe-etb.dto';
import { UpdateEtbDto } from '../dto/update-etb.dto';
import { EtbEntryStatus } from '../entities/etb-entry.entity';
import { EtbService } from '../etb.service';
// Import des gemockten Loggers für Tests
import { logger as mockLogger } from '@/logger/consola.logger';

// Mock für sanitize-filename
jest.mock('sanitize-filename', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((filename) => filename),
}));

// Mock für Logger
jest.mock('@/logger/consola.logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock für Dateisystem-Operationen
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock für Path
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
}));

describe('EtbService', () => {
  let service: EtbService;

  // Mock für PrismaService
  const mockPrismaService = {
    etbEntry: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    etbAttachment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  // Mock für PaginationService
  const mockPaginationService = {
    paginate: jest.fn(),
  };

  /**
   * Hilfsfunktion zum Erstellen eines Mock-ETB-Eintrags
   */
  function createMockEtbEntry(overrides = {}) {
    return {
      id: 'test-id',
      timestampErstellung: new Date(),
      timestampEreignis: new Date(),
      autorId: 'test-author',
      autorName: 'Test Author',
      autorRolle: 'Tester',
      kategorie: EtbKategorie.MELDUNG,
      inhalt: 'Dies ist ein Test-Eintrag',
      referenzEinsatzId: '',
      referenzPatientId: '',
      referenzEinsatzmittelId: '',
      systemQuelle: '',
      version: 1,
      laufendeNummer: 1,
      status: EtbEntryStatus.AKTIV,
      istAbgeschlossen: false,
      timestampAbschluss: null,
      abgeschlossenVon: '',
      ueberschriebenDurch: null,
      ueberschriebenDurchId: null,
      ueberschriebeneEintraege: [],
      timestampUeberschrieben: null,
      ueberschriebenVon: null,
      anlagen: [],
      sender: '',
      receiver: '',
      ...overrides,
    };
  }

  /**
   * Hilfsfunktion zum Erstellen eines Mock-Attachments
   */
  function createMockAttachment(overrides = {}) {
    return {
      id: 'attachment-id',
      etbEntryId: 'test-id',
      dateiname: 'test.pdf',
      dateityp: 'application/pdf',
      speicherOrt: 'uploads/etb-attachments/test.pdf',
      beschreibung: 'Test Beschreibung',
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtbService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    service = module.get<EtbService>(EtbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNextLaufendeNummer', () => {
    it('sollte die nächste laufende Nummer zurückgeben, wenn Einträge existieren', async () => {
      // Arrange
      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: {
          laufendeNummer: 42,
        },
      });

      // Act
      const result = await service['getNextLaufendeNummer']();

      // Assert
      expect(result).toBe(43);
      expect(mockPrismaService.etbEntry.aggregate).toHaveBeenCalledWith({
        _max: {
          laufendeNummer: true,
        },
      });
    });

    it('sollte 1 zurückgeben, wenn keine Einträge existieren', async () => {
      // Arrange
      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: {
          laufendeNummer: null,
        },
      });

      // Act
      const result = await service['getNextLaufendeNummer']();

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('createEintrag', () => {
    it('sollte einen neuen ETB-Eintrag erstellen', async () => {
      // Arrange
      const createEtbDto: CreateEtbDto = {
        timestampEreignis: new Date().toISOString(),
        kategorie: EtbKategorie.MELDUNG,
        inhalt: 'Test Inhalt',
      };

      const mockCreatedEntry = createMockEtbEntry({
        kategorie: createEtbDto.kategorie,
        inhalt: createEtbDto.inhalt,
      });

      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: {
          laufendeNummer: 5,
        },
      });

      mockPrismaService.etbEntry.create.mockResolvedValue(mockCreatedEntry);

      // Act
      const result = await service.createEintrag(
        createEtbDto,
        'user-id',
        'User Name',
        'Benutzer Rolle',
      );

      // Assert
      expect(result).toEqual(mockCreatedEntry);
      expect(mockPrismaService.etbEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kategorie: createEtbDto.kategorie,
          inhalt: createEtbDto.inhalt,
          autorId: 'user-id',
          autorName: 'User Name',
          autorRolle: 'Benutzer Rolle',
          laufendeNummer: 6,
          status: EtbEntryStatus.AKTIV,
        }),
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('sollte alle ETB-Einträge paginiert zurückgeben', async () => {
      // Arrange
      const filterDto = {
        page: 1,
        limit: 10,
      };

      const mockEntries = [createMockEtbEntry(), createMockEtbEntry()];
      const mockPaginatedResponse = {
        items: mockEntries,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockPaginationService.paginate.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await service.findAll(filterDto);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.any(Object),
          include: expect.any(Object),
          orderBy: expect.any(Object),
        }),
        1,
        10,
      );
    });

    it('sollte Filter korrekt anwenden', async () => {
      // Arrange
      const filterDto = {
        page: 1,
        limit: 10,
        kategorie: EtbKategorie.MELDUNG,
        referenzEinsatzId: 'einsatz-123',
        includeUeberschrieben: false,
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.objectContaining({
            kategorie: EtbKategorie.MELDUNG,
          }),
        }),
        1,
        10,
      );
    });

    it('sollte autorId Filter anwenden', async () => {
      // Arrange
      const filterDto = {
        page: 1,
        limit: 10,
        autorId: 'author-123',
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.objectContaining({
            autorId: 'author-123',
          }),
        }),
        1,
        10,
      );
    });

    it('sollte Zeitstempel-Filter (vonZeitstempel) anwenden', async () => {
      // Arrange
      const vonZeitstempel = '2023-01-01T00:00:00.000Z';
      const filterDto = {
        page: 1,
        limit: 10,
        vonZeitstempel,
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.objectContaining({
            timestampEreignis: expect.objectContaining({
              gte: new Date(vonZeitstempel),
            }),
          }),
        }),
        1,
        10,
      );
    });

    it('sollte Zeitstempel-Filter (bisZeitstempel) anwenden', async () => {
      // Arrange
      const bisZeitstempel = '2023-12-31T23:59:59.999Z';
      const filterDto = {
        page: 1,
        limit: 10,
        bisZeitstempel,
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.objectContaining({
            timestampEreignis: expect.objectContaining({
              lte: new Date(bisZeitstempel),
            }),
          }),
        }),
        1,
        10,
      );
    });

    it('sollte Zeitstempel-Filter (von und bis) anwenden', async () => {
      // Arrange
      const vonZeitstempel = '2023-01-01T00:00:00.000Z';
      const bisZeitstempel = '2023-12-31T23:59:59.999Z';
      const filterDto = {
        page: 1,
        limit: 10,
        vonZeitstempel,
        bisZeitstempel,
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.objectContaining({
            timestampEreignis: expect.objectContaining({
              gte: new Date(vonZeitstempel),
              lte: new Date(bisZeitstempel),
            }),
          }),
        }),
        1,
        10,
      );
    });

    it('sollte Suchfilter anwenden', async () => {
      // Arrange
      const filterDto = {
        page: 1,
        limit: 10,
        search: 'Testsuche',
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { inhalt: { contains: 'Testsuche', mode: 'insensitive' } },
              { autorName: { contains: 'Testsuche', mode: 'insensitive' } },
            ],
          }),
        }),
        1,
        10,
      );
    });

    it('sollte includeUeberschrieben korrekt handhaben', async () => {
      // Arrange
      const filterDto = {
        page: 1,
        limit: 10,
        includeUeberschrieben: true,
      };

      mockPaginationService.paginate.mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      // Act
      await service.findAll(filterDto);

      // Assert
      expect(mockPaginationService.paginate).toHaveBeenCalledWith(
        'etbEntry',
        expect.objectContaining({
          where: expect.not.objectContaining({
            status: EtbEntryStatus.AKTIV,
          }),
        }),
        1,
        10,
      );
    });
  });

  describe('findOne', () => {
    it('sollte einen ETB-Eintrag nach ID finden', async () => {
      // Arrange
      const id = 'test-id';
      const mockEntry = createMockEtbEntry({ id });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockEntry);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(result).toEqual(mockEntry);
      expect(mockPrismaService.etbEntry.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { anlagen: true },
      });
    });

    it('sollte einen Fehler werfen, wenn kein Eintrag gefunden wird', async () => {
      // Arrange
      const id = 'non-existent-id';
      mockPrismaService.etbEntry.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateEintrag', () => {
    it('sollte einen ETB-Eintrag aktualisieren', async () => {
      // Arrange
      const id = 'test-id';
      const updateDto: Partial<{
        beschreibung: string;
        timestampEreignis: string;
        kategorie: EtbKategorie;
      }> = {
        beschreibung: 'Aktualisierte Beschreibung',
      };

      const existingEntry = createMockEtbEntry({ id, version: 1 });
      const updatedEntry = createMockEtbEntry({
        id,
        beschreibung: 'Aktualisierte Beschreibung',
        version: 2,
      });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(existingEntry);
      mockPrismaService.etbEntry.update.mockResolvedValue(updatedEntry);

      // Act
      const result = await service.updateEintrag(id, updateDto as UpdateEtbDto);

      // Assert
      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.etbEntry.update).toHaveBeenCalledWith({
        where: { id },
        data: expect.objectContaining({
          beschreibung: 'Aktualisierte Beschreibung',
          version: { increment: 1 },
        }),
        include: { anlagen: true },
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('sollte einen Fehler werfen, wenn der Eintrag bereits abgeschlossen ist', async () => {
      // Arrange
      const id = 'test-id';
      const updateDto: Partial<{
        beschreibung: string;
        timestampEreignis: string;
        kategorie: EtbKategorie;
      }> = {
        beschreibung: 'Aktualisierte Beschreibung',
      };

      const existingEntry = createMockEtbEntry({ id, istAbgeschlossen: true });
      mockPrismaService.etbEntry.findUnique.mockResolvedValue(existingEntry);

      // Act & Assert
      await expect(service.updateEintrag(id, updateDto as UpdateEtbDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.etbEntry.update).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('sollte einen ETB-Eintrag mit neuem timestampEreignis aktualisieren', async () => {
      // Arrange
      const id = 'test-id';
      const newTimestamp = new Date().toISOString();
      const updateDto: Partial<{
        beschreibung: string;
        timestampEreignis: string;
        kategorie: EtbKategorie;
      }> = {
        beschreibung: 'Aktualisierte Beschreibung',
        timestampEreignis: newTimestamp,
      };

      const existingEntry = createMockEtbEntry({ id, version: 1 });
      const updatedEntry = createMockEtbEntry({
        id,
        beschreibung: 'Aktualisierte Beschreibung',
        timestampEreignis: new Date(newTimestamp),
        version: 2,
      });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(existingEntry);
      mockPrismaService.etbEntry.update.mockResolvedValue(updatedEntry);

      // Act
      const result = await service.updateEintrag(id, updateDto as UpdateEtbDto);

      // Assert
      expect(result).toEqual(updatedEntry);
      expect(mockPrismaService.etbEntry.update).toHaveBeenCalledWith({
        where: { id },
        data: expect.objectContaining({
          beschreibung: 'Aktualisierte Beschreibung',
          timestampEreignis: new Date(newTimestamp),
          version: { increment: 1 },
        }),
        include: { anlagen: true },
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('closeEintrag', () => {
    it('sollte einen ETB-Eintrag abschließen', async () => {
      // Arrange
      const id = 'test-id';
      const userId = 'user-123';

      const existingEntry = createMockEtbEntry({ id, istAbgeschlossen: false });
      const closedEntry = createMockEtbEntry({
        id,
        istAbgeschlossen: true,
        timestampAbschluss: expect.any(Date),
        abgeschlossenVon: userId,
      });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(existingEntry);
      mockPrismaService.etbEntry.update.mockResolvedValue(closedEntry);

      // Act
      const result = await service.closeEintrag(id, userId);

      // Assert
      expect(result).toEqual(closedEntry);
      expect(mockPrismaService.etbEntry.update).toHaveBeenCalledWith({
        where: { id },
        data: expect.objectContaining({
          istAbgeschlossen: true,
          timestampAbschluss: expect.any(Date),
          abgeschlossenVon: userId,
        }),
        include: { anlagen: true },
      });
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('sollte einen Fehler werfen, wenn der Eintrag bereits abgeschlossen ist', async () => {
      // Arrange
      const id = 'test-id';
      const userId = 'user-123';

      const existingEntry = createMockEtbEntry({ id, istAbgeschlossen: true });
      mockPrismaService.etbEntry.findUnique.mockResolvedValue(existingEntry);

      // Act & Assert
      await expect(service.closeEintrag(id, userId)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.etbEntry.update).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('addAttachment', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test file content'),
    };

    const addAttachmentDto: AddAttachmentDto = {
      beschreibung: 'Test attachment description',
    };

    beforeEach(() => {
      // Mock file system
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation();
      fs.writeFileSync.mockImplementation();

      // Mock path
      const path = require('path');
      path.join.mockImplementation((...args) => args.join('/'));
    });

    it('sollte eine Anlage erfolgreich hinzufügen', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      const mockEntry = createMockEtbEntry({ id: etbEntryId, istAbgeschlossen: false });
      const mockAttachment = createMockAttachment({ etbEntryId });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrismaService.etbAttachment.create.mockResolvedValue(mockAttachment);

      // Act
      const result = await service.addAttachment(etbEntryId, mockFile, addAttachmentDto);

      // Assert
      expect(result).toEqual(mockAttachment);
      expect(mockPrismaService.etbAttachment.create).toHaveBeenCalledWith({
        data: {
          etbEntryId,
          dateiname: mockFile.originalname,
          dateityp: mockFile.mimetype,
          speicherOrt: expect.stringContaining('test.pdf'),
          beschreibung: addAttachmentDto.beschreibung,
        },
      });
    });

    it('sollte Fehler werfen wenn ETB-Eintrag abgeschlossen ist', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      const mockEntry = createMockEtbEntry({ id: etbEntryId, istAbgeschlossen: true });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockEntry);

      // Act & Assert
      await expect(service.addAttachment(etbEntryId, mockFile, addAttachmentDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Anlage kann nicht zu ETB-Eintrag'),
      );
    });

    it('sollte BadRequestException werfen bei Dateisystem-Fehler', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      const mockEntry = createMockEtbEntry({ id: etbEntryId, istAbgeschlossen: false });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockEntry);

      // Mock fs.writeFileSync to throw error
      const fs = require('fs');
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      // Act & Assert
      await expect(service.addAttachment(etbEntryId, mockFile, addAttachmentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sollte Upload-Verzeichnis erstellen wenn es nicht existiert', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      const mockEntry = createMockEtbEntry({ id: etbEntryId, istAbgeschlossen: false });
      const mockAttachment = createMockAttachment({ etbEntryId });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrismaService.etbAttachment.create.mockResolvedValue(mockAttachment);

      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      // Act
      await service.addAttachment(etbEntryId, mockFile, addAttachmentDto);

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('uploads'), {
        recursive: true,
      });
    });

    it('sollte eindeutigen Dateinamen generieren', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      const mockEntry = createMockEtbEntry({ id: etbEntryId, istAbgeschlossen: false });
      const mockAttachment = createMockAttachment({ etbEntryId });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrismaService.etbAttachment.create.mockResolvedValue(mockAttachment);

      // Mock Date.now() for predictable file name
      const mockNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Act
      await service.addAttachment(etbEntryId, mockFile, addAttachmentDto);

      // Assert
      const fs = require('fs');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${mockNow}-test.pdf`),
        mockFile.buffer,
      );

      // Cleanup
      jest.restoreAllMocks();
    });
  });

  describe('findAttachmentsByEtbEntryId', () => {
    it('sollte alle Anlagen eines ETB-Eintrags zurückgeben', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      const mockAttachments = [
        createMockAttachment({ id: 'attachment-1', etbEntryId }),
        createMockAttachment({ id: 'attachment-2', etbEntryId }),
      ];

      mockPrismaService.etbAttachment.findMany.mockResolvedValue(mockAttachments);

      // Act
      const result = await service.findAttachmentsByEtbEntryId(etbEntryId);

      // Assert
      expect(result).toEqual(mockAttachments);
      expect(mockPrismaService.etbAttachment.findMany).toHaveBeenCalledWith({
        where: { etbEntryId },
      });
    });

    it('sollte ein leeres Array zurückgeben, wenn keine Anlagen existieren', async () => {
      // Arrange
      const etbEntryId = 'test-id';
      mockPrismaService.etbAttachment.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAttachmentsByEtbEntryId(etbEntryId);

      // Assert
      expect(result).toEqual([]);
      expect(mockPrismaService.etbAttachment.findMany).toHaveBeenCalledWith({
        where: { etbEntryId },
      });
    });
  });

  describe('findAttachmentById', () => {
    it('sollte eine Anlage nach ID finden', async () => {
      // Arrange
      const attachmentId = 'attachment-id';
      const mockAttachment = createMockAttachment({ id: attachmentId });

      mockPrismaService.etbAttachment.findUnique.mockResolvedValue(mockAttachment);

      // Act
      const result = await service.findAttachmentById(attachmentId);

      // Assert
      expect(result).toEqual(mockAttachment);
      expect(mockPrismaService.etbAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: attachmentId },
      });
    });

    it('sollte einen Fehler werfen, wenn keine Anlage gefunden wird', async () => {
      // Arrange
      const attachmentId = 'non-existent-attachment';
      mockPrismaService.etbAttachment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findAttachmentById(attachmentId)).rejects.toThrow(NotFoundException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('ueberschreibeEintrag', () => {
    const ueberschreibeDto: UeberschreibeEtbDto = {
      inhalt: 'Überschriebener Inhalt',
      kategorie: EtbKategorie.KORREKTUR,
      timestampEreignis: new Date().toISOString(),
    };

    it('sollte einen ETB-Eintrag erfolgreich überschreiben', async () => {
      // Arrange
      const originalId = 'original-id';
      const userId = 'user-id';
      const userName = 'User Name';
      const userRole = 'Admin';

      const mockOriginalEntry = createMockEtbEntry({ id: originalId });
      const mockNewEntry = createMockEtbEntry({
        id: 'new-id',
        inhalt: ueberschreibeDto.inhalt,
        kategorie: ueberschreibeDto.kategorie,
        autorId: userId,
        autorName: userName,
        autorRolle: userRole,
        laufendeNummer: 2,
      });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockOriginalEntry);

      // Mock getNextLaufendeNummer for the new entry
      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: { laufendeNummer: 1 },
      });

      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          etbEntry: {
            update: jest.fn().mockResolvedValue(mockOriginalEntry),
            create: jest.fn().mockResolvedValue(mockNewEntry),
          },
        };
        return await callback(mockTx);
      });

      // Act
      const result = await service.ueberschreibeEintrag(
        originalId,
        ueberschreibeDto,
        userId,
        userName,
        userRole,
      );

      // Assert
      expect(result).toEqual(mockNewEntry);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`ETB-Eintrag mit ID ${originalId} wird überschrieben`),
      );
    });

    it('sollte ursprünglichen Eintrag als überschrieben markieren', async () => {
      // Arrange
      const originalId = 'original-id';
      const userId = 'user-id';
      const mockOriginalEntry = createMockEtbEntry({ id: originalId });
      const mockNewEntry = createMockEtbEntry({ id: 'new-id' });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockOriginalEntry);
      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: { laufendeNummer: 1 },
      });

      let updateCalled = false;
      let createCalled = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          etbEntry: {
            update: jest.fn().mockImplementation((params) => {
              updateCalled = true;
              expect(params.where.id).toBe(originalId);
              expect(params.data.status).toBe(EtbEntryStatus.UEBERSCHRIEBEN);
              expect(params.data.ueberschriebenVon).toBe(userId);
              expect(params.data.timestampUeberschrieben).toBeInstanceOf(Date);
              return mockOriginalEntry;
            }),
            create: jest.fn().mockImplementation(() => {
              createCalled = true;
              return mockNewEntry;
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await service.ueberschreibeEintrag(originalId, ueberschreibeDto, userId);

      // Assert
      expect(updateCalled).toBe(true);
      expect(createCalled).toBe(true);
    });

    it('sollte neue laufende Nummer für überschreibenden Eintrag verwenden', async () => {
      // Arrange
      const originalId = 'original-id';
      const userId = 'user-id';
      const mockOriginalEntry = createMockEtbEntry({ id: originalId });
      const mockNewEntry = createMockEtbEntry({ id: 'new-id', laufendeNummer: 5 });

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockOriginalEntry);
      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: { laufendeNummer: 4 },
      });

      let createCalledWithCorrectNumber = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          etbEntry: {
            update: jest.fn().mockResolvedValue(mockOriginalEntry),
            create: jest.fn().mockImplementation((params) => {
              expect(params.data.laufendeNummer).toBe(5);
              createCalledWithCorrectNumber = true;
              return mockNewEntry;
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await service.ueberschreibeEintrag(originalId, ueberschreibeDto, userId);

      // Assert
      expect(createCalledWithCorrectNumber).toBe(true);
    });

    it('sollte Originalwerte verwenden wenn DTO-Felder leer sind', async () => {
      // Arrange
      const originalId = 'original-id';
      const userId = 'user-id';
      const mockOriginalEntry = createMockEtbEntry({
        id: originalId,
        kategorie: EtbKategorie.MELDUNG,
        inhalt: 'Original Inhalt',
        referenzPatientId: 'patient-123',
      });
      const mockNewEntry = createMockEtbEntry({ id: 'new-id' });

      // Use minimal DTO with required inhalt field but no optional fields
      const minimalDto: UeberschreibeEtbDto = {
        inhalt: 'Minimal überschreibender Inhalt',
      };

      mockPrismaService.etbEntry.findUnique.mockResolvedValue(mockOriginalEntry);
      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: { laufendeNummer: 1 },
      });

      let createCalledWithOriginalValues = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          etbEntry: {
            update: jest.fn().mockResolvedValue(mockOriginalEntry),
            create: jest.fn().mockImplementation((params) => {
              // kategorie should use original value since not provided in DTO
              expect(params.data.kategorie).toBe(mockOriginalEntry.kategorie);
              // inhalt should use DTO value
              expect(params.data.inhalt).toBe(minimalDto.inhalt);
              // referenzPatientId should use original value since not provided in DTO
              expect(params.data.referenzPatientId).toBe(mockOriginalEntry.referenzPatientId);
              createCalledWithOriginalValues = true;
              return mockNewEntry;
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await service.ueberschreibeEintrag(originalId, minimalDto, userId);

      // Assert
      expect(createCalledWithOriginalValues).toBe(true);
    });
  });

  describe('createAutomaticEintrag', () => {
    beforeEach(() => {
      // Stelle sicher, dass die Mocks für diesen describe Block sauber sind
      jest.clearAllMocks();
    });

    it('sollte einen automatischen ETB-Eintrag erstellen', async () => {
      // Arrange
      const data = {
        timestampEreignis: new Date(),
        kategorie: EtbKategorie.AUTO_SONSTIGES,
        inhalt: 'Automatischer Test-Eintrag',
        referenzEinsatzId: 'einsatz-123',
        referenzPatientId: 'patient-456',
        referenzEinsatzmittelId: 'einsatzmittel-789',
      };
      const systemQuelle = 'TestSystem';

      const mockCreatedEntry = createMockEtbEntry({
        id: 'automatic-test-id',
        kategorie: data.kategorie,
        inhalt: data.inhalt,
        autorId: 'system',
        autorName: 'System',
        autorRolle: 'Automatisierung',
        systemQuelle,
        timestampEreignis: data.timestampEreignis,
        laufendeNummer: 11,
      });

      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: {
          laufendeNummer: 10,
        },
      });

      mockPrismaService.etbEntry.create.mockResolvedValue(mockCreatedEntry);

      // Act
      const result = await service.createAutomaticEintrag(data, systemQuelle);

      // Assert
      expect(result).toEqual(mockCreatedEntry);
      expect(mockPrismaService.etbEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kategorie: data.kategorie,
          inhalt: data.inhalt,
          autorId: 'system',
          autorName: 'System',
          autorRolle: 'Automatisierung',
          systemQuelle,
          laufendeNummer: 11,
          status: EtbEntryStatus.AKTIV,
        }),
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Automatischer ETB-Eintrag wird erstellt durch ${systemQuelle}`,
      );
    });

    it('sollte automatischen Eintrag ohne referenzEinsatzId erstellen', async () => {
      // Arrange
      const data = {
        timestampEreignis: new Date(),
        kategorie: EtbKategorie.AUTO_SONSTIGES,
        inhalt: 'Automatischer Test-Eintrag ohne Einsatz-Referenz',
      };
      const systemQuelle = 'TestSystem';

      const mockCreatedEntry = createMockEtbEntry({
        id: 'automatic-test-id-2',
        kategorie: data.kategorie,
        inhalt: data.inhalt,
        autorId: 'system',
        autorName: 'System',
        autorRolle: 'Automatisierung',
        systemQuelle,
        timestampEreignis: data.timestampEreignis,
        laufendeNummer: 6,
      });

      mockPrismaService.etbEntry.aggregate.mockResolvedValue({
        _max: {
          laufendeNummer: 5,
        },
      });

      mockPrismaService.etbEntry.create.mockResolvedValue(mockCreatedEntry);

      // Act
      const result = await service.createAutomaticEintrag(data, systemQuelle);

      // Assert
      expect(result).toEqual(mockCreatedEntry);
      expect(mockPrismaService.etbEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kategorie: data.kategorie,
          inhalt: data.inhalt,
          autorId: 'system',
          autorName: 'System',
          autorRolle: 'Automatisierung',
          systemQuelle,
          laufendeNummer: 6,
          status: EtbEntryStatus.AKTIV,
        }),
      });
    });
  });
});
