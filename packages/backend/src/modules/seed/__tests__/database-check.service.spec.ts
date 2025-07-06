import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseCheckService } from '../database-check.service';

describe('DatabaseCheckService', () => {
  let service: DatabaseCheckService;
  let prismaService: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Mock logger methods
    mockLogger = {
      error: jest.fn(),
    } as any;

    const mockPrismaService = {
      $queryRaw: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    } as any;

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseCheckService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DatabaseCheckService>(DatabaseCheckService);
    prismaService = module.get(PrismaService);

    // Replace the logger instance with our mock
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Instanziierung', () => {
    it('sollte erfolgreich instanziiert werden', () => {
      expect(service).toBeDefined();
      expect(service.isDatabaseReachable).toBeDefined();
      expect(service.doesTableExist).toBeDefined();
      expect(service.countRecords).toBeDefined();
      expect(service.executeWithTimeout).toBeDefined();
      expect(service.isDatabaseEmpty).toBeDefined();
    });

    it('sollte die korrekten queryTimeout Werte haben', () => {
      expect((service as any).queryTimeout).toBe(10000);
    });
  });

  describe('isDatabaseReachable', () => {
    it('sollte true zurückgeben wenn Datenbank erreichbar ist', async () => {
      // Arrange
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.isDatabaseReachable();

      // Assert
      expect(result).toBe(true);
      expect(prismaService.$queryRaw).toHaveBeenCalledWith(expect.anything());
    });

    it('sollte false zurückgeben und Fehler loggen wenn Datenbank nicht erreichbar ist', async () => {
      // Arrange
      const error = new Error('Connection failed');
      (prismaService.$queryRaw as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.isDatabaseReachable();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Datenbankverbindung konnte nicht hergestellt werden:',
        error,
      );
    });
  });

  describe('doesTableExist', () => {
    it('sollte true zurückgeben wenn Tabelle existiert', async () => {
      // Arrange
      const tableName = 'test_table';
      const queryResult = [{ exists: true }];
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(queryResult);

      // Act
      const result = await service.doesTableExist(tableName);

      // Assert
      expect(result).toBe(true);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('sollte false zurückgeben wenn Tabelle nicht existiert', async () => {
      // Arrange
      const tableName = 'nonexistent_table';
      const queryResult = [{ exists: false }];
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(queryResult);

      // Act
      const result = await service.doesTableExist(tableName);

      // Assert
      expect(result).toBe(false);
    });

    it('sollte false zurückgeben wenn Query result leer ist', async () => {
      // Arrange
      const tableName = 'test_table';
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.doesTableExist(tableName);

      // Assert
      expect(result).toBe(false);
    });

    it('sollte false zurückgeben und Fehler loggen bei Datenbankfehler', async () => {
      // Arrange
      const tableName = 'test_table';
      const error = new Error('Database error');
      (prismaService.$queryRaw as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.doesTableExist(tableName);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Fehler beim Prüfen der Existenz der Tabelle '${tableName}':`,
        error,
      );
    });
  });

  describe('countRecords', () => {
    it('sollte die Anzahl der Datensätze zurückgeben', async () => {
      // Arrange
      const tableName = 'test_table';
      const count = 42;
      const queryResult = [{ count: count.toString() }];
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(queryResult);

      // Act
      const result = await service.countRecords(tableName);

      // Assert
      expect(result).toBe(count);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('sollte 0 zurückgeben wenn Tabelle leer ist', async () => {
      // Arrange
      const tableName = 'empty_table';
      const queryResult = [{ count: '0' }];
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(queryResult);

      // Act
      const result = await service.countRecords(tableName);

      // Assert
      expect(result).toBe(0);
    });

    it('sollte 0 zurückgeben wenn Query result malformed ist', async () => {
      // Arrange
      const tableName = 'test_table';
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{}]);

      // Act
      const result = await service.countRecords(tableName);

      // Assert
      expect(result).toBe(0);
    });

    it('sollte 0 zurückgeben wenn count nicht parseable ist', async () => {
      // Arrange
      const tableName = 'test_table';
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: 'not-a-number' }]);

      // Act
      const result = await service.countRecords(tableName);

      // Assert
      expect(result).toBe(0);
    });

    it('sollte -1 zurückgeben und Fehler loggen bei Datenbankfehler', async () => {
      // Arrange
      const tableName = 'test_table';
      const error = new Error('Count failed');
      (prismaService.$queryRaw as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.countRecords(tableName);

      // Assert
      expect(result).toBe(-1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Fehler beim Zählen der Datensätze in Tabelle '${tableName}':`,
        error,
      );
    });
  });

  describe('executeWithTimeout', () => {
    it('sollte Query-Ergebnis zurückgeben bei erfolgreicher Ausführung', async () => {
      // Arrange
      const query = 'SELECT * FROM test';
      const params = ['param1'];
      const expectedResult = [{ id: 1, name: 'test' }];
      (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await service.executeWithTimeout(query, params);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith(query, ...params);
    });

    it('sollte null zurückgeben und Fehler loggen bei Query-Fehler', async () => {
      // Arrange
      const query = 'INVALID SQL';
      const error = new Error('Syntax error');
      (prismaService.$queryRawUnsafe as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.executeWithTimeout(query);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Fehler bei Datenbankabfrage:', error);
    });

    it('sollte mit leeren Parametern funktionieren', async () => {
      // Arrange
      const query = 'SELECT 1';
      const expectedResult = [{ result: 1 }];
      (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await service.executeWithTimeout(query);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith(query);
    });
  });

  describe('isDatabaseEmpty', () => {
    it('sollte true zurückgeben wenn keine Tabellen existieren', async () => {
      // Arrange
      const queryResult = [{ count: '0' }];
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(queryResult);

      // Act
      const result = await service.isDatabaseEmpty();

      // Assert
      expect(result).toBe(true);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('sollte false zurückgeben wenn Tabellen existieren', async () => {
      // Arrange
      const queryResult = [{ count: '5' }];
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue(queryResult);

      // Act
      const result = await service.isDatabaseEmpty();

      // Assert
      expect(result).toBe(false);
    });

    it('sollte true zurückgeben bei ungültigem Query-Ergebnis', async () => {
      // Arrange
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{}]);

      // Act
      const result = await service.isDatabaseEmpty();

      // Assert
      // When count is undefined/null, parseInt returns NaN
      // NaN || 0 becomes 0, and 0 === 0 is true
      // So isDatabaseEmpty returns true (assumes empty when uncertain)
      expect(result).toBe(true);
    });

    it('sollte true zurückgeben wenn count nicht parseable ist', async () => {
      // Arrange
      (prismaService.$queryRaw as jest.Mock).mockResolvedValue([{ count: 'not-a-number' }]);

      // Act
      const result = await service.isDatabaseEmpty();

      // Assert
      expect(result).toBe(true);
    });

    it('sollte false zurückgeben und Fehler loggen bei Datenbankfehler', async () => {
      // Arrange
      const error = new Error('Query failed');
      (prismaService.$queryRaw as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.isDatabaseEmpty();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Fehler beim Prüfen, ob die Datenbank leer ist:',
        error,
      );
    });
  });

  describe('executeWithTimeout', () => {
    it('should return null on timeout', async () => {
      // Arrange
      const query = 'SELECT 1';

      // Mock a query that never resolves to simulate timeout
      (prismaService.$queryRawUnsafe as jest.Mock).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      // Act - call with a short timeout
      const originalTimeout = (service as any).queryTimeout;
      (service as any).queryTimeout = 10; // Set very short timeout
      const result = await service.executeWithTimeout(query);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Datenbankabfrage Timeout nach 10ms');

      // Cleanup
      (service as any).queryTimeout = originalTimeout;
    });

    it('should return result on successful query', async () => {
      // Arrange
      const query = 'SELECT * FROM test';
      const expectedResult = [{ id: 1, name: 'test' }];
      (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(expectedResult);

      // Act
      const result = await service.executeWithTimeout(query);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith(query);
    });

    it('should return null on query error', async () => {
      // Arrange
      const query = 'SELECT * FROM test';
      const error = new Error('Query failed');
      (prismaService.$queryRawUnsafe as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await service.executeWithTimeout(query);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Fehler bei Datenbankabfrage:', error);
    });
  });
});
