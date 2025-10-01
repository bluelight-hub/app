import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { EinsatzStatus } from '@prisma/client';
import { EinsatzRepository } from './einsatz.repository';
import { EinsatzService } from './einsatz.service';
import { EinsatzErstelltEvent } from './events/einsatz-erstellt.event';
import { EinsatzNotFoundException } from './exceptions/einsatz-not-found.exception';

describe('EinsatzService', () => {
  let service: EinsatzService;
  let repository: jest.Mocked<EinsatzRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUserId = 'user-123';
  const mockEinsatzId = 'einsatz-456';

  const mockEinsatz = {
    id: mockEinsatzId,
    alarmstichwort: 'Brand 3',
    alarmierungszeit: new Date('2025-01-27T14:30:00.000Z'),
    beschreibung: 'Beschreibung des Einsatzes',
    einsatzleiter: 'Einsatzleiter',
    einsatzort: 'Einsatzort',
    status: EinsatzStatus.ANGELEGT,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    createdBy: mockUserId,
    updatedBy: null,
    archivedBy: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findWithPagination: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EinsatzService,
        {
          provide: EinsatzRepository,
          useValue: mockRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<EinsatzService>(EinsatzService);
    repository = module.get(EinsatzRepository) as jest.Mocked<EinsatzRepository>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  describe('create', () => {
    it('sollte einen Einsatz erstellen und EinsatzErstelltEvent emittieren', async () => {
      const createDto = {
        alarmstichwort: 'Brand 3',
        alarmierungszeit: '2025-01-27T14:30:00.000Z',
      };

      repository.create.mockResolvedValue(mockEinsatz);

      const result = await service.create(createDto, mockUserId);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmstichwort: 'Brand 3',
          alarmierungszeit: expect.any(Date),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('einsatz.erstellt', expect.any(EinsatzErstelltEvent));
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'einsatz.erstellt',
        expect.objectContaining({
          einsatzId: mockEinsatzId,
          userId: mockUserId,
        }),
      );
      expect(result).toMatchObject({
        id: mockEinsatzId,
        alarmstichwort: 'Brand 3',
      });
    });

    it('sollte Event auch bei Fehler nicht blockieren', async () => {
      const createDto = {
        alarmstichwort: 'Brand 3',
      };

      repository.create.mockResolvedValue(mockEinsatz);
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Event-Fehler sollten die Erstellung nicht blockieren
      await expect(service.create(createDto, mockUserId)).rejects.toThrow();
    });
  });

  describe('archive', () => {
    it('sollte einen Einsatz archivieren wenn Status ABGESCHLOSSEN ist', async () => {
      const abgeschlossenerEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.ABGESCHLOSSEN,
      };

      const archiviertEinsatz = {
        ...abgeschlossenerEinsatz,
        status: EinsatzStatus.ARCHIVIERT,
        archivedAt: new Date(),
        archivedBy: mockUserId,
      };

      repository.findOne.mockResolvedValue(abgeschlossenerEinsatz);
      repository.update.mockResolvedValue(archiviertEinsatz);

      const result = await service.archive(mockEinsatzId, mockUserId);

      expect(repository.findOne).toHaveBeenCalledWith(mockEinsatzId);
      expect(repository.update).toHaveBeenCalledWith(
        mockEinsatzId,
        expect.objectContaining({
          status: 'ARCHIVIERT',
          archivedAt: expect.any(Date),
          archiver: { connect: { id: mockUserId } },
          updater: { connect: { id: mockUserId } },
        }),
      );
      expect(result).toMatchObject({
        id: mockEinsatzId,
        status: EinsatzStatus.ARCHIVIERT,
      });
    });

    it('sollte BadRequestException werfen wenn Status nicht ABGESCHLOSSEN ist', async () => {
      const angelegterEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.ANGELEGT,
      };

      repository.findOne.mockResolvedValue(angelegterEinsatz);

      await expect(service.archive(mockEinsatzId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.archive(mockEinsatzId, mockUserId)).rejects.toThrow(/kann nicht archiviert werden.*Nur Einsätze mit Status ABGESCHLOSSEN/);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('sollte bereits archivierten Einsatz zurückgeben ohne Änderung', async () => {
      const archiviertEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.ARCHIVIERT,
        archivedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(archiviertEinsatz);

      const result = await service.archive(mockEinsatzId, mockUserId);

      expect(repository.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockEinsatzId,
        status: EinsatzStatus.ARCHIVIERT,
      });
    });

    it('sollte EinsatzNotFoundException werfen wenn Einsatz nicht existiert', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.archive(mockEinsatzId, mockUserId)).rejects.toThrow(EinsatzNotFoundException);
    });
  });

  describe('update', () => {
    it('sollte Einsatz aktualisieren wenn nicht archiviert', async () => {
      const angelegterEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.ANGELEGT,
      };

      const aktualisierterEinsatz = {
        ...angelegterEinsatz,
        alarmstichwort: 'Brand 4',
        updatedBy: mockUserId,
      };

      repository.findOne.mockResolvedValue(angelegterEinsatz);
      repository.update.mockResolvedValue(aktualisierterEinsatz);

      const result = await service.update(mockEinsatzId, { alarmstichwort: 'Brand 4' }, mockUserId);

      expect(repository.update).toHaveBeenCalled();
      expect(result).toMatchObject({
        alarmstichwort: 'Brand 4',
      });
    });

    it('sollte BadRequestException werfen wenn Einsatz archiviert ist', async () => {
      const archiviertEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.ARCHIVIERT,
      };

      repository.findOne.mockResolvedValue(archiviertEinsatz);

      await expect(service.update(mockEinsatzId, { alarmstichwort: 'Brand 4' }, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.update(mockEinsatzId, { alarmstichwort: 'Brand 4' }, mockUserId)).rejects.toThrow(/archiviert und kann nicht mehr bearbeitet werden/);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('sollte Status-Übergang validieren', async () => {
      const inBearbeitungEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.IN_BEARBEITUNG,
      };

      repository.findOne.mockResolvedValue(inBearbeitungEinsatz);

      // Erlaubter Übergang: IN_BEARBEITUNG → ABGESCHLOSSEN
      repository.update.mockResolvedValue({
        ...inBearbeitungEinsatz,
        status: EinsatzStatus.ABGESCHLOSSEN,
      });

      await service.update(mockEinsatzId, { status: EinsatzStatus.ABGESCHLOSSEN }, mockUserId);

      expect(repository.update).toHaveBeenCalled();
    });

    it('sollte BadRequestException werfen bei unerlaubtem Status-Übergang', async () => {
      const inBearbeitungEinsatz = {
        ...mockEinsatz,
        status: EinsatzStatus.IN_BEARBEITUNG,
      };

      repository.findOne.mockResolvedValue(inBearbeitungEinsatz);

      // Unerlaubter Übergang: IN_BEARBEITUNG → ARCHIVIERT
      await expect(service.update(mockEinsatzId, { status: EinsatzStatus.ARCHIVIERT }, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.update(mockEinsatzId, { status: EinsatzStatus.ARCHIVIERT }, mockUserId)).rejects.toThrow(/Status-Übergang.*nicht erlaubt/);

      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
