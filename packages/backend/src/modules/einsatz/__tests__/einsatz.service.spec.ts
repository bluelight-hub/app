import { PrismaService } from '@/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEinsatzDto } from '../dto/create-einsatz.dto';
import { EinsatzService } from '../einsatz.service';

describe('EinsatzService', () => {
  let service: EinsatzService;

  const mockPrismaService = {
    einsatz: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EinsatzService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EinsatzService>(EinsatzService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new Einsatz with the provided data', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Test Einsatz',
        beschreibung: 'Eine Beschreibung',
      };

      const expectedEinsatz = {
        id: 'test-uuid-1234',
        name: 'Test Einsatz',
        beschreibung: 'Eine Beschreibung',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.einsatz.create.mockResolvedValue(expectedEinsatz);

      // Act
      const result = await service.create(createEinsatzDto);

      // Assert
      expect(result).toEqual(expectedEinsatz);
      expect(mockPrismaService.einsatz.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Einsatz',
          beschreibung: 'Eine Beschreibung',
        },
      });
    });

    it('should create a new Einsatz without optional beschreibung', async () => {
      // Arrange
      const createEinsatzDto: CreateEinsatzDto = {
        name: 'Test Einsatz ohne Beschreibung',
      };

      const expectedEinsatz = {
        id: 'test-uuid-1234',
        name: 'Test Einsatz ohne Beschreibung',
        beschreibung: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.einsatz.create.mockResolvedValue(expectedEinsatz);

      // Act
      const result = await service.create(createEinsatzDto);

      // Assert
      expect(result).toEqual(expectedEinsatz);
      expect(mockPrismaService.einsatz.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Einsatz ohne Beschreibung',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of einsatzs', async () => {
      // Arrange
      const expectedEinsatzs = [
        {
          id: 'test-uuid-1',
          name: 'Einsatz 1',
          beschreibung: 'Beschreibung 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'test-uuid-2',
          name: 'Einsatz 2',
          beschreibung: 'Beschreibung 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.einsatz.findMany.mockResolvedValue(expectedEinsatzs);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedEinsatzs);
      expect(mockPrismaService.einsatz.findMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a single einsatz when it exists', async () => {
      // Arrange
      const expectedEinsatz = {
        id: 'test-uuid-1',
        name: 'Einsatz 1',
        beschreibung: 'Beschreibung 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.einsatz.findUnique.mockResolvedValue(expectedEinsatz);

      // Act
      const result = await service.findById('test-uuid-1');

      // Assert
      expect(result).toEqual(expectedEinsatz);
      expect(mockPrismaService.einsatz.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-uuid-1' },
      });
    });

    it('should throw NotFoundException when einsatz does not exist', async () => {
      // Arrange
      mockPrismaService.einsatz.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        'Einsatz non-existent-id not found',
      );
      expect(mockPrismaService.einsatz.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });
  });
});
