import { ErrorHandlingService } from '@/common/services/error-handling.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEinsatzDto } from '../dto/create-einsatz.dto';
import { EinsatzController } from '../einsatz.controller';
import { EinsatzService } from '../einsatz.service';
import { Einsatz } from '../entities/einsatz.entity';

describe('EinsatzController', () => {
  let controller: EinsatzController;

  const mockEinsatzService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockErrorHandlingService = {
    executeWithErrorHandling: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EinsatzController],
      providers: [
        {
          provide: EinsatzService,
          useValue: mockEinsatzService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ErrorHandlingService,
          useValue: mockErrorHandlingService,
        },
      ],
    }).compile();

    controller = module.get<EinsatzController>(EinsatzController);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of einsatzs', async () => {
      // Arrange
      const expectedEinsatzs: Einsatz[] = [
        {
          id: 'test-id-1',
          name: 'Test Einsatz 1',
          beschreibung: 'Beschreibung 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'test-id-2',
          name: 'Test Einsatz 2',
          beschreibung: 'Beschreibung 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockEinsatzService.findAll.mockResolvedValue(expectedEinsatzs);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toBe(expectedEinsatzs);
      expect(mockEinsatzService.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a single einsatz', async () => {
      // Arrange
      const expectedEinsatz: Einsatz = {
        id: 'test-id-1',
        name: 'Test Einsatz 1',
        beschreibung: 'Beschreibung 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockEinsatzService.findById.mockResolvedValue(expectedEinsatz);

      // Act
      const result = await controller.findById('test-id-1');

      // Assert
      expect(result).toBe(expectedEinsatz);
      expect(mockEinsatzService.findById).toHaveBeenCalledWith('test-id-1');
    });
  });

  describe('create', () => {
    it('should create and return a new einsatz', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'New Einsatz',
        beschreibung: 'New Beschreibung',
      };

      const createdEinsatz: Einsatz = {
        id: 'new-test-id',
        name: 'New Einsatz',
        beschreibung: 'New Beschreibung',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock der ErrorHandlingService executeWithErrorHandling Methode
      mockErrorHandlingService.executeWithErrorHandling.mockImplementation(
        async (operation) => await operation(),
      );
      mockEinsatzService.create.mockResolvedValue(createdEinsatz);

      // Act
      const result = await controller.create(createEinsatzDto);

      // Assert
      expect(result).toBe(createdEinsatz);
      expect(mockErrorHandlingService.executeWithErrorHandling).toHaveBeenCalled();
    });

    it('should allow creation in production when ENABLE_EINSATZ_CREATION is true', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Production Einsatz',
        beschreibung: 'Production Beschreibung',
      };

      const createdEinsatz: Einsatz = {
        id: 'prod-test-id',
        name: 'Production Einsatz',
        beschreibung: 'Production Beschreibung',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock production environment
      mockConfigService.get
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce('true'); // ENABLE_EINSATZ_CREATION

      mockErrorHandlingService.executeWithErrorHandling.mockImplementation(
        async (operation) => await operation(),
      );
      mockEinsatzService.create.mockResolvedValue(createdEinsatz);

      // Act
      const result = await controller.create(createEinsatzDto);

      // Assert
      expect(result).toBe(createdEinsatz);
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENABLE_EINSATZ_CREATION', 'false');
      expect(mockErrorHandlingService.executeWithErrorHandling).toHaveBeenCalled();
    });

    it('should throw ForbiddenException in production when ENABLE_EINSATZ_CREATION is false', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Production Einsatz',
        beschreibung: 'Production Beschreibung',
      };

      // Mock production environment with disabled creation
      mockConfigService.get
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce('false'); // ENABLE_EINSATZ_CREATION

      // Act & Assert
      await expect(controller.create(createEinsatzDto)).rejects.toThrow(
        'Einsatzerstellung ist in der Produktionsumgebung nicht aktiviert',
      );
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENABLE_EINSATZ_CREATION', 'false');
      expect(mockErrorHandlingService.executeWithErrorHandling).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException in production for names containing "test"', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Test Einsatz in Production',
        beschreibung: 'Should not be allowed',
      };

      // Mock production environment with enabled creation
      mockConfigService.get
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce('true'); // ENABLE_EINSATZ_CREATION

      // Act & Assert
      await expect(controller.create(createEinsatzDto)).rejects.toThrow(
        'Test- oder Entwicklungsnamen sind in der Produktionsumgebung nicht erlaubt',
      );
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENABLE_EINSATZ_CREATION', 'false');
      expect(mockErrorHandlingService.executeWithErrorHandling).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException in production for names containing "dev"', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Development Einsatz',
        beschreibung: 'Should not be allowed',
      };

      // Mock production environment with enabled creation
      mockConfigService.get
        .mockReturnValueOnce('production') // NODE_ENV
        .mockReturnValueOnce('true'); // ENABLE_EINSATZ_CREATION

      // Act & Assert
      await expect(controller.create(createEinsatzDto)).rejects.toThrow(
        'Test- oder Entwicklungsnamen sind in der Produktionsumgebung nicht erlaubt',
      );
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
      expect(mockConfigService.get).toHaveBeenCalledWith('ENABLE_EINSATZ_CREATION', 'false');
      expect(mockErrorHandlingService.executeWithErrorHandling).not.toHaveBeenCalled();
    });

    it('should allow creation in development without restrictions', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Test Development Einsatz',
        beschreibung: 'Should be allowed in development',
      };

      const createdEinsatz: Einsatz = {
        id: 'dev-test-id',
        name: 'Test Development Einsatz',
        beschreibung: 'Should be allowed in development',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock development environment
      mockConfigService.get.mockReturnValueOnce('development'); // NODE_ENV

      mockErrorHandlingService.executeWithErrorHandling.mockImplementation(
        async (operation) => await operation(),
      );
      mockEinsatzService.create.mockResolvedValue(createdEinsatz);

      // Act
      const result = await controller.create(createEinsatzDto);

      // Assert
      expect(result).toBe(createdEinsatz);
      expect(mockConfigService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
      // Should not check ENABLE_EINSATZ_CREATION in development
      expect(mockConfigService.get).toHaveBeenCalledTimes(1);
      expect(mockErrorHandlingService.executeWithErrorHandling).toHaveBeenCalled();
    });
  });
});
