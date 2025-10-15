import { Test, type TestingModule } from '@nestjs/testing';
import { LagekarteController } from './lagekarte.controller';
import { LagekarteService } from '../services/lagekarte.service';
import type { SaveLagekarteStateDto } from '../dto/save-lagekarte-state.dto';
import type { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import type { Lagekarte } from '@prisma/client';

describe('LagekarteController', () => {
  let controller: LagekarteController;
  let service: LagekarteService;

  const mockLagekarte: Lagekarte = {
    id: 'lagekarte-1',
    einsatzId: 'einsatz-1',
    state: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: ValidatedUser = {
    userId: 'user-1',
  };

  const mockLagekarteService = {
    getOrCreateLagekarte: jest.fn(),
    findByEinsatzId: jest.fn(),
    updateState: jest.fn(),
    deleteLagekarte: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LagekarteController],
      providers: [
        {
          provide: LagekarteService,
          useValue: mockLagekarteService,
        },
      ],
    }).compile();

    controller = module.get<LagekarteController>(LagekarteController);
    service = module.get<LagekarteService>(LagekarteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLagekarte', () => {
    it('should return a lagekarte (existing)', async () => {
      // Arrange
      mockLagekarteService.getOrCreateLagekarte.mockResolvedValue(mockLagekarte);

      // Act
      const result = await controller.getLagekarte('einsatz-1');

      // Assert
      expect(result).toEqual(mockLagekarte);
      expect(service.getOrCreateLagekarte).toHaveBeenCalledWith('einsatz-1');
    });

    it('should lazy-create a lagekarte if not exists', async () => {
      // Arrange
      const newLagekarte = { ...mockLagekarte, id: 'lagekarte-new' };
      mockLagekarteService.getOrCreateLagekarte.mockResolvedValue(newLagekarte);

      // Act
      const result = await controller.getLagekarte('einsatz-2');

      // Assert
      expect(result).toEqual(newLagekarte);
      expect(service.getOrCreateLagekarte).toHaveBeenCalledWith('einsatz-2');
    });
  });

  describe('saveLagekarteState', () => {
    const dto: SaveLagekarteStateDto = {
      einsatzId: 'einsatz-1',
      state: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    it('should save lagekarte state', async () => {
      // Arrange
      const updatedLagekarte = { ...mockLagekarte, state: dto.state };
      mockLagekarteService.findByEinsatzId.mockResolvedValue(mockLagekarte);
      mockLagekarteService.updateState.mockResolvedValue(updatedLagekarte);

      // Act
      const result = await controller.saveLagekarteState('einsatz-1', dto, mockUser);

      // Assert
      expect(result).toEqual(updatedLagekarte);
      expect(service.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(service.updateState).toHaveBeenCalledWith(mockLagekarte.id, dto.state);
    });

    it('should throw error if lagekarte not found', async () => {
      // Arrange
      mockLagekarteService.findByEinsatzId.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.saveLagekarteState('einsatz-1', dto, mockUser)).rejects.toThrow('Lagekarte not found');
      expect(service.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(service.updateState).not.toHaveBeenCalled();
    });
  });

  describe('deleteLagekarte', () => {
    it('should delete lagekarte', async () => {
      // Arrange
      mockLagekarteService.findByEinsatzId.mockResolvedValue(mockLagekarte);
      mockLagekarteService.deleteLagekarte.mockResolvedValue(undefined);

      // Act
      await controller.deleteLagekarte('einsatz-1', mockUser);

      // Assert
      expect(service.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(service.deleteLagekarte).toHaveBeenCalledWith(mockLagekarte.id);
    });

    it('should throw error if lagekarte not found', async () => {
      // Arrange
      mockLagekarteService.findByEinsatzId.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.deleteLagekarte('einsatz-1', mockUser)).rejects.toThrow('Lagekarte not found');
      expect(service.findByEinsatzId).toHaveBeenCalledWith('einsatz-1');
      expect(service.deleteLagekarte).not.toHaveBeenCalled();
    });
  });
});
