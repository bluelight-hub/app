import { Logger } from '@nestjs/common';
import { DEFAULT_DUPLICATE_CONFIG, DuplicateDetectionUtil } from '../duplicate-detection.util';

describe('DuplicateDetectionUtil', () => {
  let util: DuplicateDetectionUtil;
  let mockLogger: jest.SpyInstance;

  beforeEach(() => {
    util = new DuplicateDetectionUtil({
      timeWindow: 1000, // 1 Sekunde für Tests
      maxCacheSize: 5,
      cleanupInterval: 5000,
    });

    // Mock Logger
    mockLogger = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    util.destroy();
    jest.clearAllMocks();
  });

  describe('executeIdempotent', () => {
    it('sollte Operation beim ersten Aufruf ausführen', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('result');
      const operationId = 'test-operation';
      const data = { key: 'value' };

      // Act
      const result = await util.executeIdempotent(operationId, mockOperation, data);

      // Assert
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Führe neue Operation aus: test-operation'),
      );
    });

    it('sollte gecachtes Ergebnis beim zweiten Aufruf zurückgeben', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('result');
      const operationId = 'test-operation';
      const data = { key: 'value' };

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, data);
      const result2 = await util.executeIdempotent(operationId, mockOperation, data);

      // Assert
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Nur einmal aufgerufen
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Idempotente Operation gefunden: test-operation'),
      );
    });

    it('sollte Fehler cachen und beim zweiten Aufruf wieder werfen', async () => {
      // Arrange
      const error = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(error);
      const operationId = 'test-operation';
      const data = { key: 'value' };

      // Act & Assert
      await expect(util.executeIdempotent(operationId, mockOperation, data)).rejects.toThrow(
        'Test error',
      );

      await expect(util.executeIdempotent(operationId, mockOperation, data)).rejects.toThrow(
        'Test error',
      );

      expect(mockOperation).toHaveBeenCalledTimes(1); // Nur einmal aufgerufen
    });

    it('sollte verschiedene Operationen mit gleichen Daten unterscheiden', async () => {
      // Arrange
      const mockOperation1 = jest.fn().mockResolvedValue('result1');
      const mockOperation2 = jest.fn().mockResolvedValue('result2');
      const data = { key: 'value' };

      // Act
      const result1 = await util.executeIdempotent('operation1', mockOperation1, data);
      const result2 = await util.executeIdempotent('operation2', mockOperation2, data);

      // Assert
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockOperation1).toHaveBeenCalledTimes(1);
      expect(mockOperation2).toHaveBeenCalledTimes(1);
    });

    it('sollte gleiche Operationen mit verschiedenen Daten unterscheiden', async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const operationId = 'test-operation';

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, { key: 'value1' });
      const result2 = await util.executeIdempotent(operationId, mockOperation, { key: 'value2' });

      // Assert
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('sollte nach Zeitfenster-Ablauf Operation erneut ausführen', async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const operationId = 'test-operation';
      const data = { key: 'value' };

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, data);

      // Warte länger als das Zeitfenster
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1100);
        timer.unref(); // Timer soll den Prozess nicht am Beenden hindern
      });

      const result2 = await util.executeIdempotent(operationId, mockOperation, data);

      // Assert
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Management', () => {
    it('sollte Cache-Größe begrenzen', async () => {
      // Arrange
      const mockOperation = jest.fn().mockImplementation((i) => Promise.resolve(`result${i}`));

      // Act - Füge mehr Operationen hinzu als die maximale Cache-Größe
      for (let i = 0; i < 7; i++) {
        await util.executeIdempotent(`operation${i}`, () => mockOperation(i), { index: i });
      }

      // Assert
      const stats = util.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(5); // maxCacheSize
      expect(mockOperation).toHaveBeenCalledTimes(7);
    });

    it('sollte Cache-Statistiken korrekt zurückgeben', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('result');

      // Act
      await util.executeIdempotent('operation1', mockOperation, { key: 'value1' });
      await util.executeIdempotent('operation2', mockOperation, { key: 'value2' });

      // Assert
      const stats = util.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.newestEntry).toBeGreaterThanOrEqual(stats.oldestEntry!);
    });

    it('sollte leere Cache-Statistiken für leeren Cache zurückgeben', () => {
      // Act
      const stats = util.getCacheStats();

      // Assert
      expect(stats.size).toBe(0);
      expect(stats.oldestEntry).toBeUndefined();
      expect(stats.newestEntry).toBeUndefined();
    });
  });

  describe('Data Normalization', () => {
    it('sollte gleiche Objekte mit unterschiedlicher Reihenfolge als identisch erkennen', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('result');
      const operationId = 'test-operation';
      const data1 = { b: 2, a: 1 };
      const data2 = { a: 1, b: 2 };

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, data1);
      const result2 = await util.executeIdempotent(operationId, mockOperation, data2);

      // Assert
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Nur einmal aufgerufen
    });

    it('sollte Arrays mit unterschiedlicher Reihenfolge als verschieden erkennen', async () => {
      // Arrange
      const mockOperation = jest
        .fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');
      const operationId = 'test-operation';
      const data1 = { items: [3, 1, 2] };
      const data2 = { items: [1, 2, 3] };

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, data1);
      const result2 = await util.executeIdempotent(operationId, mockOperation, data2);

      // Assert
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockOperation).toHaveBeenCalledTimes(2); // Arrays mit unterschiedlicher Reihenfolge sind verschieden
    });

    it('sollte Arrays mit gleicher Reihenfolge als identisch erkennen', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('result');
      const operationId = 'test-operation';
      const data1 = { items: [1, 2, 3] };
      const data2 = { items: [1, 2, 3] };

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, data1);
      const result2 = await util.executeIdempotent(operationId, mockOperation, data2);

      // Assert
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Identische Arrays werden als gleich erkannt
    });

    it('sollte null und undefined korrekt handhaben', async () => {
      // Arrange
      const mockOperation = jest.fn().mockResolvedValue('result');
      const operationId = 'test-operation';

      // Act
      const result1 = await util.executeIdempotent(operationId, mockOperation, null);
      const result2 = await util.executeIdempotent(operationId, mockOperation, undefined);

      // Assert
      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1); // null und undefined werden beide zu null normalisiert
    });
  });

  describe('Cleanup', () => {
    it('sollte destroy() korrekt ausführen', () => {
      // Arrange
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Act
      util.destroy();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(util.getCacheStats().size).toBe(0);

      clearIntervalSpy.mockRestore();
    });
  });

  describe('Default Configuration', () => {
    it('sollte Standard-Konfiguration verwenden', () => {
      // Arrange & Act
      const defaultUtil = new DuplicateDetectionUtil();

      // Assert
      expect(DEFAULT_DUPLICATE_CONFIG.timeWindow).toBe(60000);
      expect(DEFAULT_DUPLICATE_CONFIG.maxCacheSize).toBe(1000);
      expect(DEFAULT_DUPLICATE_CONFIG.cleanupInterval).toBe(300000);

      defaultUtil.destroy();
    });
  });
});
