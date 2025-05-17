import { PrismaService } from '@/prisma/prisma.service';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from './prisma-health.indicator';

describe('PrismaHealthIndicator', () => {
    let prismaHealthIndicator: PrismaHealthIndicator;
    let mockPrismaService: jest.Mocked<PrismaService>;
    let mockHealthIndicatorService: jest.Mocked<HealthIndicatorService>;

    // Mock für ein erfolgreiches Gesundheitsergebnis
    const mockHealthUpResult = {
        testKey: {
            status: 'up'
        }
    };

    // Mock für ein fehlgeschlagenes Gesundheitsergebnis
    const mockHealthDownResult = {
        testKey: {
            status: 'down',
            message: 'Datenbank nicht erreichbar'
        }
    };

    // Fehler für negative Tests
    const testError = new Error('Datenbank nicht erreichbar');

    beforeEach(async () => {
        // Mock für den PrismaService erstellen
        mockPrismaService = {
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
        } as unknown as jest.Mocked<PrismaService>;

        // Mock für den HealthIndicatorService erstellen
        mockHealthIndicatorService = {
            check: jest.fn().mockReturnValue({
                up: jest.fn().mockReturnValue(mockHealthUpResult),
                down: jest.fn().mockReturnValue(mockHealthDownResult)
            })
        } as unknown as jest.Mocked<HealthIndicatorService>;

        // TestingModule erstellen
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PrismaHealthIndicator,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService
                },
                {
                    provide: HealthIndicatorService,
                    useValue: mockHealthIndicatorService
                }
            ],
        }).compile();

        // Instanz des zu testenden Services erstellen
        prismaHealthIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    });

    it('sollte definiert sein', () => {
        expect(prismaHealthIndicator).toBeDefined();
    });

    describe('pingCheck', () => {
        it('sollte "up" Status zurückgeben, wenn die Datenbankabfrage erfolgreich ist', async () => {
            // Erfolgreiche Datenbankabfrage simulieren
            mockPrismaService.$queryRaw.mockResolvedValue(undefined);

            // pingCheck ausführen
            const result: HealthIndicatorResult = await prismaHealthIndicator.pingCheck('testKey');

            // Überprüfen, ob die Datenbankabfrage aufgerufen wurde
            expect(mockPrismaService.$queryRaw).toHaveBeenCalled();

            // Überprüfen, ob der HealthIndicatorService aufgerufen wurde
            expect(mockHealthIndicatorService.check).toHaveBeenCalledWith('testKey');

            // Überprüfen, ob das Ergebnis korrekt ist
            expect(result).toEqual(mockHealthUpResult);
        });

        it('sollte "down" Status zurückgeben, wenn die Datenbankabfrage fehlschlägt', async () => {
            // Fehlerhafte Datenbankabfrage simulieren
            mockPrismaService.$queryRaw.mockRejectedValue(testError);

            // pingCheck ausführen
            const result: HealthIndicatorResult = await prismaHealthIndicator.pingCheck('testKey');

            // Überprüfen, ob die Datenbankabfrage aufgerufen wurde
            expect(mockPrismaService.$queryRaw).toHaveBeenCalled();

            // Überprüfen, ob der HealthIndicatorService aufgerufen wurde
            expect(mockHealthIndicatorService.check).toHaveBeenCalledWith('testKey');

            // Überprüfen, ob das Ergebnis korrekt ist
            expect(result).toEqual(mockHealthDownResult);
        });
    });

    describe('isConnected', () => {
        it('sollte "up" Status zurückgeben, wenn die Verbindung aktiv ist', async () => {
            // Erfolgreiche Verbindung simulieren
            mockPrismaService.$executeRaw.mockResolvedValue(1);

            // isConnected ausführen
            const result: HealthIndicatorResult = await prismaHealthIndicator.isConnected('testKey');

            // Überprüfen, ob die Datenbankabfrage aufgerufen wurde
            expect(mockPrismaService.$executeRaw).toHaveBeenCalled();

            // Überprüfen, ob der HealthIndicatorService aufgerufen wurde
            expect(mockHealthIndicatorService.check).toHaveBeenCalledWith('testKey');

            // Überprüfen, ob das Ergebnis korrekt ist
            expect(result).toEqual(mockHealthUpResult);
        });

        it('sollte "down" Status zurückgeben, wenn die Verbindung nicht aktiv ist', async () => {
            // Fehlerhafte Verbindung simulieren
            mockPrismaService.$executeRaw.mockRejectedValue(testError);

            // isConnected ausführen
            const result: HealthIndicatorResult = await prismaHealthIndicator.isConnected('testKey');

            // Überprüfen, ob die Datenbankabfrage aufgerufen wurde
            expect(mockPrismaService.$executeRaw).toHaveBeenCalled();

            // Überprüfen, ob der HealthIndicatorService aufgerufen wurde
            expect(mockHealthIndicatorService.check).toHaveBeenCalledWith('testKey');

            // Überprüfen, ob das Ergebnis korrekt ist
            expect(result).toEqual(mockHealthDownResult);
        });

        it('sollte erweiterte Informationen zur Verbindung zurückgeben, wenn die Verbindung aktiv ist', async () => {
            // Mock für ein erweitertes Gesundheitsergebnis
            const mockHealthUpExtendedResult = {
                testKey: {
                    status: 'up',
                    connected: true
                }
            };

            // Mock erweitern, um den erweiterten Ergebnis-Fall abzudecken
            (mockHealthIndicatorService.check as jest.Mock).mockReturnValueOnce({
                up: jest.fn().mockReturnValue(mockHealthUpExtendedResult),
                down: jest.fn().mockReturnValue(mockHealthDownResult)
            });

            // Erfolgreiche Verbindung simulieren
            mockPrismaService.$executeRaw.mockResolvedValue(1);

            // isConnected ausführen
            const result: HealthIndicatorResult = await prismaHealthIndicator.isConnected('testKey');

            // Überprüfen, ob das Ergebnis die erweiterten Informationen enthält
            expect(result).toEqual(mockHealthUpExtendedResult);
        });
    });
}); 