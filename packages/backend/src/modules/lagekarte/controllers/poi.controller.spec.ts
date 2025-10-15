import { Test, type TestingModule } from '@nestjs/testing';
import { PoiController } from './poi.controller';
import { PoiService } from '../services/poi.service';
import { LagekarteService } from '../services/lagekarte.service';
import type { CreatePoiDto } from '../dto/create-poi.dto';
import type { UpdatePoiDto } from '../dto/update-poi.dto';
import type { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { type Lagekarte, type LagekartePoi, PoiType } from '@prisma/client';

describe('PoiController', () => {
  let controller: PoiController;
  let poiService: PoiService;
  let lagekarteService: LagekarteService;

  const mockLagekarte: Lagekarte = {
    id: 'lagekarte-1',
    einsatzId: 'einsatz-1',
    state: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPoi: LagekartePoi = {
    id: 'poi-1',
    lagekarteId: 'lagekarte-1',
    type: PoiType.EINSATZORT,
    name: 'Haupteinsatzstelle',
    adresse: 'Hauptstraße 1, 10115 Berlin',
    latitude: 52.52,
    longitude: 13.405,
    icon: 'fire',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: ValidatedUser = {
    userId: 'user-1',
  };

  const mockPoiService = {
    getPoisByLagekarteId: jest.fn(),
    getPoiById: jest.fn(),
    createPoi: jest.fn(),
    updatePoi: jest.fn(),
    deletePoi: jest.fn(),
  };

  const mockLagekarteService = {
    findByEinsatzId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoiController],
      providers: [
        {
          provide: PoiService,
          useValue: mockPoiService,
        },
        {
          provide: LagekarteService,
          useValue: mockLagekarteService,
        },
      ],
    }).compile();

    controller = module.get<PoiController>(PoiController);
    poiService = module.get<PoiService>(PoiService);
    lagekarteService = module.get<LagekarteService>(LagekarteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPois', () => {
    it('should return all POIs for a lagekarte', async () => {
      // Arrange
      const pois = [mockPoi, { ...mockPoi, id: 'poi-2', type: PoiType.FAHRZEUG }];
      mockLagekarteService.findByEinsatzId.mockResolvedValue(mockLagekarte);
      mockPoiService.getPoisByLagekarteId.mockResolvedValue(pois);

      // Act
      const result = await controller.getPois('einsatz-1');

      // Assert
      expect(result).toEqual(pois);
      expect(lagekarteService.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(poiService.getPoisByLagekarteId).toHaveBeenCalledWith('lagekarte-1');
    });

    it('should throw error if lagekarte not found', async () => {
      // Arrange
      mockLagekarteService.findByEinsatzId.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getPois('einsatz-1')).rejects.toThrow('Lagekarte not found');
      expect(lagekarteService.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(poiService.getPoisByLagekarteId).not.toHaveBeenCalled();
    });
  });

  describe('createPoi', () => {
    const dto: CreatePoiDto = {
      lagekarteId: 'lagekarte-1',
      type: PoiType.EINSATZORT,
      name: 'Haupteinsatzstelle',
      adresse: 'Hauptstraße 1, 10115 Berlin',
      latitude: 52.52,
      longitude: 13.405,
    };

    it('should create a POI', async () => {
      // Arrange
      mockPoiService.createPoi.mockResolvedValue(mockPoi);

      // Act
      const result = await controller.createPoi(dto, mockUser);

      // Assert
      expect(result).toEqual(mockPoi);
      expect(poiService.createPoi).toHaveBeenCalledWith(dto);
    });
  });

  describe('getPoi', () => {
    it('should return a single POI', async () => {
      // Arrange
      mockPoiService.getPoiById.mockResolvedValue(mockPoi);

      // Act
      const result = await controller.getPoi('poi-1');

      // Assert
      expect(result).toEqual(mockPoi);
      expect(poiService.getPoiById).toHaveBeenCalledWith('poi-1');
    });
  });

  describe('updatePoi', () => {
    const dto: UpdatePoiDto = {
      name: 'Updated Name',
      latitude: 52.53,
      longitude: 13.406,
    };

    it('should update a POI', async () => {
      // Arrange
      const updatedPoi = { ...mockPoi, ...dto };
      mockPoiService.updatePoi.mockResolvedValue(updatedPoi);

      // Act
      const result = await controller.updatePoi('poi-1', dto, mockUser);

      // Assert
      expect(result).toEqual(updatedPoi);
      expect(poiService.updatePoi).toHaveBeenCalledWith('poi-1', dto);
    });
  });

  describe('deletePoi', () => {
    it('should delete a POI', async () => {
      // Arrange
      mockPoiService.deletePoi.mockResolvedValue(undefined);

      // Act
      await controller.deletePoi('poi-1', mockUser);

      // Assert
      expect(poiService.deletePoi).toHaveBeenCalledWith('poi-1');
    });
  });
});
