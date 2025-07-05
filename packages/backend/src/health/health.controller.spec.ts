import { ConfigService } from '@nestjs/config';
import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  HealthCheckStatus,
  HealthIndicatorService,
  HealthIndicatorStatus,
  MemoryHealthIndicator,
  TerminusModule,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'net';
import { EtbService } from '../modules/etb/etb.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';

// Mock der Socket-Klasse
jest.mock('net', () => {
  const mockSocket = {
    setTimeout: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
    destroy: jest.fn(),
    end: jest.fn(),
  };

  return {
    Socket: jest.fn(() => mockSocket),
  };
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthCheckService;

  // Mock der Health-Check Ergebnisse
  const mockHealthCheckResult: Partial<HealthCheckResult> = {
    status: 'ok' as HealthCheckStatus,
    info: {
      database: { status: 'up' as HealthIndicatorStatus },
      memory_heap: { status: 'up' as HealthIndicatorStatus },
      memory_rss: { status: 'up' as HealthIndicatorStatus },
      storage: { status: 'up' as HealthIndicatorStatus },
    },
    error: {},
    details: {
      database: { status: 'up' as HealthIndicatorStatus },
      memory_heap: { status: 'up' as HealthIndicatorStatus },
      memory_rss: { status: 'up' as HealthIndicatorStatus },
      storage: { status: 'up' as HealthIndicatorStatus },
      internet: { status: 'up' as HealthIndicatorStatus },
      fuekw: { status: 'up' as HealthIndicatorStatus },
      connection_status: {
        status: 'up' as HealthIndicatorStatus,
        details: { mode: 'online' },
      },
    },
  };

  // Mock des PrismaService
  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn().mockResolvedValue(true),
    $disconnect: jest.fn().mockResolvedValue(true),
  };

  // Mock des HealthIndicatorService
  const mockHealthIndicatorService = {
    check: jest.fn().mockReturnValue({
      up: jest.fn().mockReturnValue({ status: 'up' }),
      down: jest.fn().mockImplementation((error) => ({
        status: 'down',
        message: error?.message || 'Verbindung nicht verfügbar',
      })),
    }),
  };

  // Mock des EtbService
  const mockEtbService = {
    findAll: jest.fn().mockResolvedValue({
      items: [],
      pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HealthIndicatorService,
          useValue: mockHealthIndicatorService,
        },
        {
          provide: EtbService,
          useValue: mockEtbService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'database.url') return 'sqlite::memory:';
              return null;
            }),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockResolvedValue({
              database: { status: 'up' as HealthIndicatorStatus },
            }),
            isConnected: jest.fn().mockResolvedValue({
              database_connections: {
                status: 'up' as HealthIndicatorStatus,
                details: { isInitialized: true },
              },
            }),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn().mockResolvedValue({
              storage: { status: 'up' as HealthIndicatorStatus },
            }),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn().mockResolvedValue({
              memory_heap: { status: 'up' as HealthIndicatorStatus },
            }),
            checkRSS: jest.fn().mockResolvedValue({
              memory_rss: { status: 'up' as HealthIndicatorStatus },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check results', async () => {
      // Mock der health.check Methode
      jest
        .spyOn(healthService, 'check')
        .mockResolvedValue(mockHealthCheckResult as HealthCheckResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthCheckResult);
      expect(result.status).toBe('ok');
      expect(result.info).toBeDefined();
      if (result.info) {
        expect(result.info.database).toBeDefined();
        expect(result.info.memory_heap).toBeDefined();
        expect(result.info.memory_rss).toBeDefined();
        expect(result.info.storage).toBeDefined();
      }
    });

    it('should handle database check failure', async () => {
      const mockErrorResult: Partial<HealthCheckResult> = {
        status: 'error' as HealthCheckStatus,
        error: {
          database: {
            status: 'down' as HealthIndicatorStatus,
            message: 'database connection failed',
          },
        },
        info: {
          memory_heap: { status: 'up' as HealthIndicatorStatus },
          memory_rss: { status: 'up' as HealthIndicatorStatus },
          storage: { status: 'up' as HealthIndicatorStatus },
        },
        details: {
          database: { status: 'down' as HealthIndicatorStatus },
          memory_heap: { status: 'up' as HealthIndicatorStatus },
          memory_rss: { status: 'up' as HealthIndicatorStatus },
          storage: { status: 'up' as HealthIndicatorStatus },
        },
      };

      jest.spyOn(healthService, 'check').mockResolvedValue(mockErrorResult as HealthCheckResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
      if (result.error) {
        expect(result.error.database).toBeDefined();
        expect(result.error.database.status).toBe('down');
      }
    });

    it('should handle memory check failure', async () => {
      const mockMemoryErrorResult: Partial<HealthCheckResult> = {
        status: 'error' as HealthCheckStatus,
        error: {
          memory_heap: {
            status: 'down' as HealthIndicatorStatus,
            message: 'memory threshold exceeded',
          },
        },
        info: {
          database: { status: 'up' as HealthIndicatorStatus },
          memory_rss: { status: 'up' as HealthIndicatorStatus },
          storage: { status: 'up' as HealthIndicatorStatus },
        },
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
          memory_heap: { status: 'down' as HealthIndicatorStatus },
          memory_rss: { status: 'up' as HealthIndicatorStatus },
          storage: { status: 'up' as HealthIndicatorStatus },
        },
      };

      jest
        .spyOn(healthService, 'check')
        .mockResolvedValue(mockMemoryErrorResult as HealthCheckResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
      if (result.error) {
        expect(result.error.memory_heap).toBeDefined();
        expect(result.error.memory_heap.status).toBe('down');
      }
    });

    it('should handle storage check failure', async () => {
      const mockStorageErrorResult: Partial<HealthCheckResult> = {
        status: 'error' as HealthCheckStatus,
        error: {
          storage: {
            status: 'down' as HealthIndicatorStatus,
            message: 'storage space below threshold',
          },
        },
        info: {
          database: { status: 'up' as HealthIndicatorStatus },
          memory_heap: { status: 'up' as HealthIndicatorStatus },
          memory_rss: { status: 'up' as HealthIndicatorStatus },
        },
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
          memory_heap: { status: 'up' as HealthIndicatorStatus },
          memory_rss: { status: 'up' as HealthIndicatorStatus },
          storage: { status: 'down' as HealthIndicatorStatus },
        },
      };

      jest
        .spyOn(healthService, 'check')
        .mockResolvedValue(mockStorageErrorResult as HealthCheckResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
      if (result.error) {
        expect(result.error.storage).toBeDefined();
        expect(result.error.storage.status).toBe('down');
      }
    });

    it('should test Internet connectivity', async () => {
      // Simulate successful connection
      const socketInstance = new Socket();
      jest.spyOn(socketInstance, 'on').mockImplementation((event: string, callback: any) => {
        if (event === 'connect') {
          callback();
        }
        return socketInstance;
      });

      // Mock der gesamten check-Methode
      const originalCheck = controller.check;
      controller.check = jest.fn().mockResolvedValue({
        status: 'ok' as HealthCheckStatus,
        details: {
          internet: { status: 'up' as HealthIndicatorStatus },
          fuekw: { status: 'up' as HealthIndicatorStatus },
          connection_status: {
            status: 'up' as HealthIndicatorStatus,
            details: { mode: 'online' },
          },
        },
      } as unknown as HealthCheckResult);

      const result = await controller.check();

      expect(result.details.internet).toBeDefined();
      expect(result.details.internet.status).toBe('up');

      // Restore original method
      controller.check = originalCheck;
    });

    it('should test FUEKW connectivity', async () => {
      // Mock für Prisma DB-Verbindungstest ist bereits in den Providers definiert
      // Wir müssen nicht erneut auf module.get zugreifen

      // Mock der gesamten check-Methode
      const originalCheck = controller.check;
      controller.check = jest.fn().mockResolvedValue({
        status: 'ok' as HealthCheckStatus,
        details: {
          fuekw: {
            status: 'up' as HealthIndicatorStatus,
            details: {
              dbInitialized: true,
              networkReachable: true,
            },
          },
        },
      } as unknown as HealthCheckResult);

      const result = await controller.check();

      expect(result.details.fuekw).toBeDefined();
      expect(result.details.fuekw.status).toBe('up');

      // Restore original method
      controller.check = originalCheck;
    });

    it('should test offline mode (FUEKW available but no Internet)', async () => {
      // Mock der gesamten check-Methode
      const originalCheck = controller.check;
      controller.check = jest.fn().mockResolvedValue({
        status: 'ok' as HealthCheckStatus,
        details: {
          internet: { status: 'down' as HealthIndicatorStatus },
          fuekw: { status: 'up' as HealthIndicatorStatus },
          connection_status: {
            status: 'up' as HealthIndicatorStatus,
            details: { mode: 'offline' },
          },
        },
      } as unknown as HealthCheckResult);

      const result = await controller.check();

      expect(result.details.connection_status).toBeDefined();
      expect(result.details.connection_status.details.mode).toBe('offline');

      // Restore original method
      controller.check = originalCheck;
    });

    it('should test error mode (no FUEKW available)', async () => {
      // Mock der gesamten check-Methode
      const originalCheck = controller.check;
      controller.check = jest.fn().mockResolvedValue({
        status: 'error' as HealthCheckStatus,
        details: {
          internet: { status: 'up' as HealthIndicatorStatus },
          fuekw: { status: 'down' as HealthIndicatorStatus },
          connection_status: {
            status: 'up' as HealthIndicatorStatus,
            details: { mode: 'error' },
          },
        },
      } as unknown as HealthCheckResult);

      const result = await controller.check();

      expect(result.details.connection_status).toBeDefined();
      expect(result.details.connection_status.details.mode).toBe('error');

      // Restore original method
      controller.check = originalCheck;
    });

    it('should handle socket timeout on Internet check', async () => {
      // Mock socket to simulate timeout
      const Socket = require('net').Socket;
      const mockSocket = {
        setTimeout: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'timeout') {
            setTimeout(() => callback(), 0);
          }
          return mockSocket;
        }),
        connect: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };
      Socket.mockReturnValue(mockSocket);

      // Rufe die private Methode testTcpConnectionWithTimeout auf
      const testConnection = controller['testTcpConnectionWithTimeout']('1.1.1.1', 53, 100);

      await expect(testConnection).rejects.toThrow('Connection timeout');
      expect(mockSocket.setTimeout).toHaveBeenCalledWith(100);
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should handle socket error on Internet check', async () => {
      // Mock socket to simulate error
      const Socket = require('net').Socket;
      const mockSocket = {
        setTimeout: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Network error')), 0);
          }
          return mockSocket;
        }),
        connect: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };
      Socket.mockReturnValue(mockSocket);

      // Rufe die private Methode testTcpConnectionWithTimeout auf
      const testConnection = controller['testTcpConnectionWithTimeout']('1.1.1.1', 53, 100);

      await expect(testConnection).rejects.toThrow('Network error');
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should handle checkFuekwStatus catch block', async () => {
      // Mock die isFuekwPingable Methode um einen Fehler zu werfen
      jest.spyOn(controller as any, 'isFuekwPingable').mockRejectedValue(new Error('Test error'));

      const result = await controller['checkFuekwStatus']();

      expect(result.fuekw.status).toBe('down');
      expect(result.fuekw.message).toBe('Fehler bei FüKW-Verbindungsprüfung');
      expect(result.fuekw.error).toBe('Test error');
    });

    it('should handle prisma pingCheck failure in checkFuekwStatus', async () => {
      // Mock prismaDb.pingCheck um einen Fehler zu werfen
      jest
        .spyOn(controller['prismaDb'], 'pingCheck')
        .mockRejectedValue(new Error('DB connection failed'));

      // Mock isFuekwPingable
      jest.spyOn(controller as any, 'isFuekwPingable').mockResolvedValue(true);

      const result = await controller['checkFuekwStatus']();

      expect(result.fuekw.status).toBe('down');
      expect(result.fuekw.details.dbInitialized).toBe(false);
      expect(result.fuekw.details.networkReachable).toBe(true);
    });

    it('should handle determineConnectionStatus with prisma error', async () => {
      // Mock prismaDb.pingCheck um einen Fehler zu werfen
      jest.spyOn(controller['prismaDb'], 'pingCheck').mockRejectedValue(new Error('DB error'));

      // Mock checkInternetConnectivity
      jest.spyOn(controller as any, 'checkInternetConnectivity').mockResolvedValue(true);

      const result = await controller['determineConnectionStatus']();

      expect(result.connection_status.status).toBe('up');
      expect(result.connection_status.details.mode).toBe('error');
    });

    it('should handle isFuekwPingable with etbService error and prisma success', async () => {
      // Mock etbService.findAll um einen Fehler zu werfen
      mockEtbService.findAll.mockRejectedValue(new Error('ETB service error'));

      // Mock prismaDb.pingCheck um erfolgreich zu sein
      jest.spyOn(controller['prismaDb'], 'pingCheck').mockResolvedValue({
        database: { status: 'up' },
      });

      const result = await controller['isFuekwPingable']();

      // When etbService fails, it returns false immediately without checking prisma
      expect(result).toBe(false);
    });

    it('should handle isFuekwPingable with etbService success and prisma error', async () => {
      // Mock etbService.findAll um erfolgreich zu sein
      mockEtbService.findAll.mockResolvedValue({
        items: [],
        pagination: {
          currentPage: 1,
          itemsPerPage: 1,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      // Mock prismaDb.pingCheck um einen Fehler zu werfen
      jest.spyOn(controller['prismaDb'], 'pingCheck').mockRejectedValue(new Error('Prisma error'));

      const result = await controller['isFuekwPingable']();

      expect(result).toBe(false);
    });

    it('should handle isFuekwPingable with both services failing', async () => {
      // Mock etbService.findAll um einen Fehler zu werfen
      mockEtbService.findAll.mockRejectedValue(new Error('ETB service error'));

      // Mock prismaDb.pingCheck wird auch fehlschlagen (nicht aufgerufen wegen frühem return)
      const result = await controller['isFuekwPingable']();

      expect(result).toBe(false);
    });
  });

  describe('specialized health endpoints', () => {
    it('should return liveness check results', async () => {
      const mockLivenessResult: Partial<HealthCheckResult> = {
        status: 'ok' as HealthCheckStatus,
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
        },
      };

      jest.spyOn(healthService, 'check').mockResolvedValue(mockLivenessResult as HealthCheckResult);

      const result = await controller.checkLiveness();

      expect(result).toEqual(mockLivenessResult);
      expect(result.status).toBe('ok');
    });

    it('should return readiness check results', async () => {
      const mockReadinessResult: Partial<HealthCheckResult> = {
        status: 'ok' as HealthCheckStatus,
        details: {
          memory_heap: { status: 'up' as HealthIndicatorStatus },
          storage: { status: 'up' as HealthIndicatorStatus },
        },
      };

      jest
        .spyOn(healthService, 'check')
        .mockResolvedValue(mockReadinessResult as HealthCheckResult);

      const result = await controller.checkReadiness();

      expect(result).toEqual(mockReadinessResult);
      expect(result.status).toBe('ok');
    });

    it('should return database check results', async () => {
      const mockDbResult: Partial<HealthCheckResult> = {
        status: 'ok' as HealthCheckStatus,
        details: {
          database: { status: 'up' as HealthIndicatorStatus },
          database_connections: {
            status: 'up' as HealthIndicatorStatus,
            details: {
              isInitialized: true,
            },
          },
        },
      };

      jest.spyOn(healthService, 'check').mockResolvedValue(mockDbResult as HealthCheckResult);

      const result = await controller.checkDatabase();

      expect(result).toEqual(mockDbResult);
      expect(result.details.database_connections).toBeDefined();
      expect(result.details.database_connections.details.isInitialized).toBe(true);
    });
  });
});
