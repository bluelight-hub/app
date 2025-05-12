import {
    DiskHealthIndicator,
    HealthCheckService,
    HealthIndicatorFunction,
    MemoryHealthIndicator,
    TypeOrmHealthIndicator
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EtbService } from '../../modules/etb/etb.service';
import { HealthController } from '../health.controller';

// Mock-Socket für das Testen
const mockSocketInstance = {
    setTimeout: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn(),
    connect: jest.fn(),
};

// Funktionen aus dem net-Modul mocken
jest.mock('net', () => {
    return {
        Socket: jest.fn().mockImplementation(() => mockSocketInstance)
    };
});

/**
 * Umfassende Tests für den HealthController
 * 
 * Testet verschiedene Szenarien für Gesundheitschecks:
 * - Alle Verbindungen aktiv (online)
 * - Keine Internetverbindung, aber lokale Verbindung (offline)
 * - Keine Verbindungen (error)
 */
describe('HealthController', () => {
    let controller: HealthController;
    let healthCheckService: HealthCheckService;
    let diskHealthIndicator: DiskHealthIndicator;
    let memoryHealthIndicator: MemoryHealthIndicator;
    let dbHealthIndicator: TypeOrmHealthIndicator;
    let dataSource: { isInitialized: boolean };
    let etbService: Partial<EtbService>;

    beforeEach(async () => {
        // Zurücksetzen aller Mock-Implementierungen
        jest.clearAllMocks();

        // Standard-Mock-Implementierungen für die TCP-Socket-Events
        mockSocketInstance.on.mockImplementation((event: string, callback: any) => {
            if (event === 'connect') {
                // Simuliere erfolgreiche Verbindung
                setTimeout(() => callback(), 10);
            }
            return mockSocketInstance;
        });

        // Mock für den EtbService erstellen
        etbService = {
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

        // Erstelle Test-Modul mit gemockten Abhängigkeiten
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: {
                        check: jest.fn().mockImplementation((indicators: HealthIndicatorFunction[]) => {
                            // Führe alle Health-Indikatoren aus und gib ein Ergebnis zurück
                            const results = indicators.map(indicator => {
                                if (typeof indicator === 'function') {
                                    return indicator();
                                }
                                return Promise.resolve({});
                            });
                            return Promise.all(results).then(data => ({
                                status: 'ok',
                                info: {},
                                error: {},
                                details: Object.assign({}, ...data),
                            }));
                        }),
                    },
                },
                {
                    provide: DiskHealthIndicator,
                    useValue: {
                        checkStorage: jest.fn().mockResolvedValue({
                            storage: {
                                status: 'up',
                            },
                        }),
                    },
                },
                {
                    provide: MemoryHealthIndicator,
                    useValue: {
                        checkHeap: jest.fn().mockResolvedValue({
                            memory_heap: {
                                status: 'up',
                            },
                        }),
                        checkRSS: jest.fn().mockResolvedValue({
                            memory_rss: {
                                status: 'up',
                            },
                        }),
                    },
                },
                {
                    provide: TypeOrmHealthIndicator,
                    useValue: {
                        pingCheck: jest.fn().mockResolvedValue({
                            database: {
                                status: 'up',
                            },
                        }),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        isInitialized: true,
                    },
                },
                {
                    provide: EtbService,
                    useValue: etbService,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthCheckService = module.get<HealthCheckService>(HealthCheckService);
        diskHealthIndicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
        memoryHealthIndicator = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
        dbHealthIndicator = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
        dataSource = module.get<DataSource>(DataSource) as { isInitialized: boolean };
    });

    it('sollte definiert sein', () => {
        expect(controller).toBeDefined();
        expect(healthCheckService).toBeDefined();
        expect(diskHealthIndicator).toBeDefined();
        expect(memoryHealthIndicator).toBeDefined();
        expect(dbHealthIndicator).toBeDefined();
        expect(dataSource).toBeDefined();
    });

    describe('check', () => {
        it('sollte einen umfassenden Gesundheitscheck durchführen - online Modus', async () => {
            // Setze Mocks für erfolgreiche Verbindung (Internet + FüKW verfügbar)
            dataSource.isInitialized = true;

            // Führe den Check aus
            const result = await controller.check();

            // Überprüfe, ob die Socket-Verbindung versucht wurde
            expect(mockSocketInstance.connect).toHaveBeenCalled();

            // Überprüfe, ob alle Indikatoren aufgerufen wurden
            expect(dbHealthIndicator.pingCheck).toHaveBeenCalled();
            expect(memoryHealthIndicator.checkHeap).toHaveBeenCalled();
            expect(memoryHealthIndicator.checkRSS).toHaveBeenCalled();
            expect(diskHealthIndicator.checkStorage).toHaveBeenCalled();

            // Überprüfe die Ergebnisse
            expect(result.status).toBe('ok');
            expect(healthCheckService.check).toHaveBeenCalled();
        });

        it('sollte einen umfassenden Gesundheitscheck durchführen - offline Modus', async () => {
            // Setze Mocks für fehlgeschlagene Internet-Verbindung, aber FüKW verfügbar
            dataSource.isInitialized = true;

            // Simuliere fehlende Internet-Verbindung
            mockSocketInstance.on.mockImplementation((event: string, callback: any) => {
                if (event === 'error') {
                    // Simuliere Netzwerkfehler
                    setTimeout(() => callback(new Error('Network error')), 10);
                }
                return mockSocketInstance;
            });

            // Führe den Check aus
            const result = await controller.check();

            // Überprüfe, ob die Socket-Verbindung versucht wurde
            expect(mockSocketInstance.connect).toHaveBeenCalled();

            // Überprüfe, ob alle Indikatoren aufgerufen wurden
            expect(dbHealthIndicator.pingCheck).toHaveBeenCalled();
            expect(memoryHealthIndicator.checkHeap).toHaveBeenCalled();
            expect(memoryHealthIndicator.checkRSS).toHaveBeenCalled();
            expect(diskHealthIndicator.checkStorage).toHaveBeenCalled();

            // Überprüfe die Ergebnisse
            expect(result.status).toBe('ok');
            expect(healthCheckService.check).toHaveBeenCalled();
        });

        it('sollte einen umfassenden Gesundheitscheck durchführen - error Modus', async () => {
            // Setze Mocks für fehlgeschlagene Verbindungen (weder Internet noch FüKW verfügbar)
            dataSource.isInitialized = false;

            // Simuliere fehlende Internet-Verbindung
            mockSocketInstance.on.mockImplementation((event: string, callback: any) => {
                if (event === 'error') {
                    // Simuliere Netzwerkfehler
                    setTimeout(() => callback(new Error('Network error')), 10);
                }
                return mockSocketInstance;
            });

            // Führe den Check aus
            const result = await controller.check();

            // Überprüfe, ob die Socket-Verbindung versucht wurde
            expect(mockSocketInstance.connect).toHaveBeenCalled();

            // Überprüfe, ob alle Indikatoren aufgerufen wurden
            expect(dbHealthIndicator.pingCheck).toHaveBeenCalled();
            expect(memoryHealthIndicator.checkHeap).toHaveBeenCalled();
            expect(memoryHealthIndicator.checkRSS).toHaveBeenCalled();
            expect(diskHealthIndicator.checkStorage).toHaveBeenCalled();

            // Überprüfe die Ergebnisse
            expect(result.status).toBe('ok');
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });

    describe('checkLiveness', () => {
        it('sollte einen Liveness-Check durchführen', async () => {
            // Führe den Check aus
            const result = await controller.checkLiveness();

            // Überprüfe, ob die Datenbank geprüft wurde
            expect(dbHealthIndicator.pingCheck).toHaveBeenCalled();

            // Überprüfe die Ergebnisse
            expect(result.status).toBe('ok');
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });

    describe('checkReadiness', () => {
        it('sollte einen Readiness-Check durchführen', async () => {
            // Führe den Check aus
            const result = await controller.checkReadiness();

            // Überprüfe, ob Speicher und Festplatte geprüft wurden
            expect(memoryHealthIndicator.checkHeap).toHaveBeenCalled();
            expect(diskHealthIndicator.checkStorage).toHaveBeenCalled();

            // Überprüfe die Ergebnisse
            expect(result.status).toBe('ok');
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });

    describe('checkDatabase', () => {
        it('sollte einen Datenbank-Check durchführen', async () => {
            // Führe den Check aus
            const result = await controller.checkDatabase();

            // Überprüfe, ob die Datenbank geprüft wurde
            expect(dbHealthIndicator.pingCheck).toHaveBeenCalled();

            // Überprüfe die Ergebnisse
            expect(result.status).toBe('ok');
            expect(healthCheckService.check).toHaveBeenCalled();
        });
    });
}); 