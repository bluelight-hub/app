import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { CreateEtbDto } from './dto/create-etb.dto';
import { EtbKategorie } from './dto/etb-kategorie.enum';
import { FilterEtbDto } from './dto/filter-etb.dto';
import { UeberschreibeEtbDto } from './dto/ueberschreibe-etb.dto';
import { UpdateEtbDto } from './dto/update-etb.dto';
import { EtbController } from './etb.controller';
import { EtbService } from './etb.service';

// Logger mocking
jest.mock('@/logger/consola.logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }
}));

// Import des gemockten Loggers für Tests
import { logger as mockLogger } from '@/logger/consola.logger';
import { EtbAttachment } from './dto/etb-entry-response.dto';
import { EtbEntry, EtbEntryStatus } from './entities/etb-entry.entity';

// Mock RequestWithUser based on its actual behavior in tests
type MockRequestWithUser = Partial<Request> & {
    user?: {
        id: string;
        name: string;
        role: string;
    };
};

describe('EtbController', () => {
    let controller: EtbController;
    let service: jest.Mocked<EtbService>;
    let req: MockRequestWithUser;

    /**
     * Helfer-Funktion zum Erstellen eines Mock-ETB-Eintrags für Tests
     */
    function createMockEtbEntry(overrides = {}): EtbEntry {
        const entry = {
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
            // Add toPrisma and fromPrisma methods for type compatibility
            toPrisma: () => ({}),
        };

        return entry as EtbEntry;
    }

    // Mock-Objekte für den Service
    const mockEtbService = {
        createEintrag: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        updateEintrag: jest.fn(),
        closeEintrag: jest.fn(),
        findAttachmentsByEtbEntryId: jest.fn(),
        findAttachmentById: jest.fn(),
        addAttachment: jest.fn(),
        ueberschreibeEintrag: jest.fn(),
    };

    // Mock für Request mit User
    const requestWithUser: MockRequestWithUser = {
        user: {
            id: 'user-id',
            name: 'Test User',
            role: 'Tester',
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EtbController],
            providers: [
                {
                    provide: EtbService,
                    useValue: mockEtbService,
                },
            ],
        }).compile();

        controller = module.get<EtbController>(EtbController);
        service = module.get(EtbService) as jest.Mocked<EtbService>;
        req = requestWithUser;

        // Service-Methoden zurücksetzen
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    /**
     * Tests für create-Methode
     */
    describe('create', () => {
        it('sollte einen neuen ETB-Eintrag erstellen', async () => {
            // Arrange
            const createEtbDto: CreateEtbDto = {
                timestampEreignis: new Date().toISOString(),
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Test Inhalt',
            };
            const mockEntry = createMockEtbEntry();
            mockEtbService.createEintrag.mockResolvedValue(mockEntry);

            // Act
            const result = await controller.create(createEtbDto, req as any);

            // Assert
            expect(service.createEintrag).toHaveBeenCalledWith(
                createEtbDto,
                req.user.id,
                req.user.name,
                req.user.role
            );
            expect(result).toEqual(mockEntry);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte mit Mock-Benutzerinformationen funktionieren, wenn keine Benutzerinformationen im Request vorhanden sind', async () => {
            // Arrange
            const createEtbDto: CreateEtbDto = {
                timestampEreignis: new Date().toISOString(),
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Test Inhalt',
            };
            const mockEntry = createMockEtbEntry();
            mockEtbService.createEintrag.mockResolvedValue(mockEntry);

            const reqWithoutUser = {} as MockRequestWithUser; // Request ohne User-Objekt

            // Act
            const result = await controller.create(createEtbDto, reqWithoutUser as any);

            // Assert
            expect(service.createEintrag).toHaveBeenCalledWith(
                createEtbDto,
                'mock-user-id', // Standard-Wert, wenn keine User-ID vorhanden
                'Mock User',     // Standard-Name
                'Einsatzleiter'  // Standard-Rolle
            );
            expect(result).toEqual(mockEntry);
        });

        it('sollte alle optionalen Felder korrekt an den Service weiterleiten', async () => {
            // Arrange
            const createEtbDto: CreateEtbDto = {
                timestampEreignis: new Date().toISOString(),
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Test Inhalt',
                referenzPatientId: 'patient-456',
                referenzEinsatzmittelId: 'em-789',
                sender: 'sender-123',
                receiver: 'receiver-456'
            };
            const mockEntry = createMockEtbEntry();
            mockEtbService.createEintrag.mockResolvedValue(mockEntry);

            // Act
            await controller.create(createEtbDto, req as any);

            // Assert
            expect(service.createEintrag).toHaveBeenCalledWith(expect.objectContaining(createEtbDto), expect.any(String), expect.any(String), expect.any(String));
        });
    });

    /**
     * Tests für findAll-Methode
     */
    describe('findAll', () => {
        it('sollte alle ETB-Einträge mit Filteroptionen zurückgeben', async () => {
            // Arrange
            const filterDto: FilterEtbDto = {
                page: 1,
                limit: 10,
            };
            const mockEntries = [createMockEtbEntry()];
            const paginatedResponse = {
                items: mockEntries,
                pagination: {
                    currentPage: 1,
                    itemsPerPage: 10,
                    totalItems: 1,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            };
            mockEtbService.findAll.mockResolvedValue(paginatedResponse);

            // Act
            const result = await controller.findAll(filterDto);

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(filterDto);
            expect(result).toEqual({ items: expect.any(Array), pagination: expect.any(Object) });
        });

        it('sollte mit includeUeberschrieben=true korrekt umgehen', async () => {
            // Arrange
            const filterDto: FilterEtbDto = {
                includeUeberschrieben: true
            };
            const mockEntries = [createMockEtbEntry()];
            mockEtbService.findAll.mockResolvedValue([mockEntries, 1]);

            // Act
            await controller.findAll(filterDto);

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({
                includeUeberschrieben: true
            }));
        });

        it('sollte mit komplexen Filterkriterien korrekt umgehen', async () => {
            // Arrange
            const filterDto: FilterEtbDto = {
                kategorie: EtbKategorie.MELDUNG,
                referenzEinsatzId: 'einsatz-123',
                referenzPatientId: 'patient-456',
                page: 2,
                limit: 15
            };
            mockEtbService.findAll.mockResolvedValue([[], 0]);

            // Act
            await controller.findAll(filterDto);

            // Assert
            expect(service.findAll).toHaveBeenCalledWith(filterDto);
        });
    });

    /**
     * Tests für findOne-Methode
     */
    describe('findOne', () => {
        it('sollte einen ETB-Eintrag anhand seiner ID zurückgeben', async () => {
            // Arrange
            const id = 'test-id';
            const mockEntry = createMockEtbEntry({ id });

            mockEtbService.findOne.mockResolvedValue(mockEntry);

            // Act
            const result = await controller.findOne(id);

            // Assert
            expect(service.findOne).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockEntry);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte die NotFoundException vom Service weiterleiten', async () => {
            // Arrange
            const id = 'non-existent-id';
            mockEtbService.findOne.mockRejectedValue(new NotFoundException(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`));

            // Act & Assert
            await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
            expect(service.findOne).toHaveBeenCalledWith(id);
            expect(mockLogger.info).toHaveBeenCalled();
        });
    });

    /**
     * Tests für update-Methode
     */
    describe('update', () => {
        it('sollte einen ETB-Eintrag aktualisieren', async () => {
            // Arrange
            const id = 'test-id';
            const updateDto: UpdateEtbDto = {
                titel: 'Aktualisierter Titel',
                beschreibung: 'Aktualisierte Beschreibung',
            };
            const mockEntry = createMockEtbEntry({
                id,
                titel: 'Aktualisierter Titel',
                beschreibung: 'Aktualisierte Beschreibung',
                version: 2
            });

            mockEtbService.updateEintrag.mockResolvedValue(mockEntry);

            // Act
            const result = await controller.update(id, updateDto);

            // Assert
            expect(service.updateEintrag).toHaveBeenCalledWith(id, updateDto);
            expect(result).toEqual(mockEntry);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte nur die übermittelten Felder aktualisieren', async () => {
            // Arrange
            const id = 'test-id';
            const updateDto: UpdateEtbDto = {
                titel: 'Nur Titel aktualisieren'
                // Beschreibung bleibt unverändert
            };
            const mockEntry = createMockEtbEntry({
                id,
                titel: 'Nur Titel aktualisieren',
                version: 2
            });
            mockEtbService.updateEintrag.mockResolvedValue(mockEntry);

            // Act
            await controller.update(id, updateDto);

            // Assert
            expect(service.updateEintrag).toHaveBeenCalledWith(id, updateDto);
        });

        it('sollte die BadRequestException vom Service weiterleiten', async () => {
            // Arrange
            const id = 'test-id';
            const updateDto: UpdateEtbDto = {
                titel: 'Aktualisierter Titel',
            };

            mockEtbService.updateEintrag.mockRejectedValue(
                new BadRequestException(`ETB-Eintrag kann nicht aktualisiert werden, da er bereits abgeschlossen ist`)
            );

            // Act & Assert
            await expect(controller.update(id, updateDto)).rejects.toThrow(BadRequestException);
            expect(service.updateEintrag).toHaveBeenCalledWith(id, updateDto);
            expect(mockLogger.info).toHaveBeenCalled();
        });
    });

    /**
     * Tests für closeEntry-Methode
     */
    describe('closeEntry', () => {
        it('sollte einen ETB-Eintrag abschließen', async () => {
            // Arrange
            const id = 'test-id';
            const mockEntry = createMockEtbEntry({
                id,
                istAbgeschlossen: true,
                timestampAbschluss: new Date(),
                abgeschlossenVon: 'user-id'
            });

            mockEtbService.closeEintrag.mockResolvedValue(mockEntry);

            // Act
            const result = await controller.closeEntry(id, req as any);

            // Assert
            expect(service.closeEintrag).toHaveBeenCalledWith(id, req.user.id);
            expect(result).toEqual(mockEntry);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte mit mock-user-id funktionieren, wenn keine Benutzerinformationen im Request vorhanden sind', async () => {
            // Arrange
            const id = 'test-id';
            const mockEntry = createMockEtbEntry({
                id,
                istAbgeschlossen: true,
                timestampAbschluss: new Date(),
                abgeschlossenVon: 'mock-user-id'
            });

            mockEtbService.closeEintrag.mockResolvedValue(mockEntry);
            const reqWithoutUser = {} as MockRequestWithUser;

            // Act
            const result = await controller.closeEntry(id, reqWithoutUser as any);

            // Assert
            expect(service.closeEintrag).toHaveBeenCalledWith(id, 'mock-user-id');
            expect(result).toEqual(mockEntry);
        });

        it('sollte die BadRequestException vom Service weiterleiten', async () => {
            // Arrange
            const id = 'test-id';

            mockEtbService.closeEintrag.mockRejectedValue(
                new BadRequestException(`ETB-Eintrag ist bereits abgeschlossen`)
            );

            // Act & Assert
            await expect(controller.closeEntry(id, req as any)).rejects.toThrow(BadRequestException);
            expect(service.closeEintrag).toHaveBeenCalledWith(id, req.user.id);
            expect(mockLogger.info).toHaveBeenCalled();
        });
    });

    /**
     * Tests für Anlagen-bezogene Methoden
     */
    describe('Anlagen', () => {
        it('sollte alle Anlagen zu einem ETB-Eintrag zurückgeben', async () => {
            // Arrange
            const id = 'test-id';
            const mockAttachments = [
                {
                    id: 'attach-1',
                    etbEntryId: id,
                    dateiname: 'test1.pdf',
                    dateityp: 'application/pdf',
                    speicherOrt: '/uploads/test1.pdf',
                    beschreibung: 'Test Attachment 1',
                    toPrisma: () => ({})
                },
                {
                    id: 'attach-2',
                    etbEntryId: id,
                    dateiname: 'test2.jpg',
                    dateityp: 'image/jpeg',
                    speicherOrt: '/uploads/test2.jpg',
                    beschreibung: 'Test Attachment 2',
                    toPrisma: () => ({})
                },
            ] as unknown as EtbAttachment[];

            mockEtbService.findOne.mockResolvedValue(createMockEtbEntry({ id }));
            mockEtbService.findAttachmentsByEtbEntryId.mockResolvedValue(mockAttachments);

            // Act
            const result = await controller.findAttachments(id);

            // Assert
            expect(service.findOne).toHaveBeenCalledWith(id);
            expect(service.findAttachmentsByEtbEntryId).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockAttachments);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte einen Fehler werfen, wenn der ETB-Eintrag nicht existiert', async () => {
            // Arrange
            const id = 'non-existent-id';
            mockEtbService.findOne.mockRejectedValue(new NotFoundException(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`));

            // Act & Assert
            await expect(controller.findAttachments(id)).rejects.toThrow(NotFoundException);
            expect(service.findOne).toHaveBeenCalledWith(id);
            expect(service.findAttachmentsByEtbEntryId).not.toHaveBeenCalled();
        });

        it('sollte eine leere Liste zurückgeben, wenn keine Anlagen vorhanden sind', async () => {
            // Arrange
            const id = 'test-id';
            mockEtbService.findOne.mockResolvedValue(createMockEtbEntry({ id }));
            mockEtbService.findAttachmentsByEtbEntryId.mockResolvedValue([]);

            // Act
            const result = await controller.findAttachments(id);

            // Assert
            expect(result).toEqual([]);
        });

        it('sollte eine Anlage anhand ihrer ID zurückgeben', async () => {
            // Arrange
            const id = 'attach-1';
            const mockAttachment = {
                id,
                etbEntryId: 'test-id',
                dateiname: 'test1.pdf',
                dateityp: 'application/pdf',
                speicherOrt: '/uploads/test1.pdf',
                // Add toPrisma method for compatibility
                toPrisma: () => ({}),
            } as EtbAttachment;

            mockEtbService.findAttachmentById.mockResolvedValue(mockAttachment);

            // Act
            const result = await controller.findAttachment(id);

            // Assert
            expect(service.findAttachmentById).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockAttachment);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte die NotFoundException vom Service weiterleiten, wenn eine Anlage nicht gefunden wird', async () => {
            // Arrange
            const id = 'non-existent-attachment';
            mockEtbService.findAttachmentById.mockRejectedValue(new NotFoundException(`Anlage mit ID ${id} wurde nicht gefunden`));

            // Act & Assert
            await expect(controller.findAttachment(id)).rejects.toThrow(NotFoundException);
        });

        it('sollte eine Anlage zu einem ETB-Eintrag hinzufügen', async () => {
            // Arrange
            const id = 'test-id';
            const file = {
                fieldname: 'file',
                originalname: 'test.pdf',
                encoding: '7bit',
                mimetype: 'application/pdf',
                buffer: Buffer.from('test'),
                size: 4
            };
            const beschreibung = 'Test Anlage';

            const mockAttachment = {
                id: 'attach-1',
                etbEntryId: id,
                dateiname: file.originalname,
                dateityp: file.mimetype,
                speicherOrt: '/uploads/test.pdf',
                beschreibung: beschreibung,
                toPrisma: () => ({})
            } as EtbAttachment;

            mockEtbService.addAttachment.mockResolvedValue(mockAttachment);

            // Act
            const result = await controller.addAttachment(id, file, beschreibung);

            // Assert
            expect(service.addAttachment).toHaveBeenCalledWith(id, file, beschreibung);
            expect(result).toEqual(mockAttachment);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte eine Anlage ohne Beschreibung hinzufügen können', async () => {
            // Arrange
            const id = 'test-id';
            const file = {
                fieldname: 'file',
                originalname: 'test.pdf',
                encoding: '7bit',
                mimetype: 'application/pdf',
                buffer: Buffer.from('test'),
                size: 4
            };

            mockEtbService.addAttachment.mockResolvedValue({} as EtbAttachment);

            // Act
            await controller.addAttachment(id, file, undefined);

            // Assert
            expect(service.addAttachment).toHaveBeenCalledWith(id, file, undefined);
        });

        it('sollte einen Fehler werfen, wenn keine Datei hochgeladen wurde', async () => {
            // Arrange
            const id = 'test-id';
            const file = null;

            // Act & Assert
            await expect(controller.addAttachment(id, file, 'Test Anlage')).rejects.toThrow(BadRequestException);
            expect(service.addAttachment).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    /**
     * Tests für ueberschreibeEintrag-Methode
     */
    describe('ueberschreibeEintrag', () => {
        it('sollte einen ETB-Eintrag überschreiben', async () => {
            // Arrange
            const id = 'test-id';
            const ueberschreibeEtbDto: UeberschreibeEtbDto = {
                inhalt: 'Übergeschriebene Beschreibung',
            };

            const originalEntry = createMockEtbEntry({
                id,
                beschreibung: 'Original Beschreibung'
            });

            const mockNewEntry = createMockEtbEntry({
                id: 'new-id',
                beschreibung: 'Übergeschriebene Beschreibung',
                status: EtbEntryStatus.AKTIV,
                ueberschriebeneEintraege: [
                    {
                        ...originalEntry,
                        status: EtbEntryStatus.UEBERSCHRIEBEN,
                        timestampUeberschrieben: new Date(),
                        ueberschriebenVon: req.user.id
                    }
                ]
            });

            mockEtbService.ueberschreibeEintrag.mockResolvedValue(mockNewEntry);

            // Act
            const result = await controller.ueberschreibeEintrag(id, ueberschreibeEtbDto, req as any);

            // Assert
            expect(service.ueberschreibeEintrag).toHaveBeenCalledWith(
                id,
                ueberschreibeEtbDto,
                req.user.id,
                req.user.name,
                req.user.role
            );
            expect(result).toMatchObject({
                id: mockNewEntry.id,
                inhalt: mockNewEntry.inhalt,
                status: mockNewEntry.status
            });
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('sollte mit Mock-Benutzerinformationen funktionieren, wenn keine Benutzerinformationen im Request vorhanden sind', async () => {
            // Arrange
            const id = 'test-id';
            const ueberschreibeEtbDto: UeberschreibeEtbDto = {
                inhalt: 'Übergeschriebene Beschreibung',
            };
            const mockNewEntry = createMockEtbEntry();
            mockEtbService.ueberschreibeEintrag.mockResolvedValue(mockNewEntry);

            const reqWithoutUser = {} as MockRequestWithUser; // Request ohne User-Objekt

            // Act
            const result = await controller.ueberschreibeEintrag(id, ueberschreibeEtbDto, reqWithoutUser as any);

            // Assert
            expect(service.ueberschreibeEintrag).toHaveBeenCalledWith(
                id,
                ueberschreibeEtbDto,
                'mock-user-id', // Standard-Wert, wenn keine User-ID vorhanden
                'Mock User',     // Standard-Name
                'Einsatzleiter'  // Standard-Rolle
            );
            expect(result).toEqual(mockNewEntry);
        });

        it('sollte die NotFoundException vom Service weiterleiten', async () => {
            // Arrange
            const id = 'non-existent-id';
            const ueberschreibeEtbDto: UeberschreibeEtbDto = {
                inhalt: 'Übergeschriebene Beschreibung',
            };

            mockEtbService.ueberschreibeEintrag.mockRejectedValue(
                new NotFoundException(`ETB-Eintrag mit ID ${id} wurde nicht gefunden`)
            );

            // Act & Assert
            await expect(controller.ueberschreibeEintrag(id, ueberschreibeEtbDto, req as any))
                .rejects.toThrow(NotFoundException);
        });

        it('sollte alle optionalen Felder korrekt an den Service weiterleiten', async () => {
            // Arrange
            const id = 'test-id';
            const ueberschreibeEtbDto: UeberschreibeEtbDto = {
                timestampEreignis: new Date().toISOString(),
                kategorie: EtbKategorie.MELDUNG,
                inhalt: 'Übergeschriebene Beschreibung',
                referenzEinsatzId: 'einsatz-123',
                referenzPatientId: 'patient-456',
                referenzEinsatzmittelId: 'em-789'
            };
            const mockNewEntry = createMockEtbEntry();
            mockEtbService.ueberschreibeEintrag.mockResolvedValue(mockNewEntry);

            // Act
            await controller.ueberschreibeEintrag(id, ueberschreibeEtbDto, req as any);

            // Assert
            expect(service.ueberschreibeEintrag).toHaveBeenCalledWith(
                id,
                expect.objectContaining(ueberschreibeEtbDto),
                req.user.id,
                req.user.name,
                req.user.role
            );
        });
    });
}); 