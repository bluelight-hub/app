import { PrismaService } from '@/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from './pagination.service';

describe('PaginationService', () => {
    let paginationService: PaginationService;

    // Mock-Daten
    const mockUsers = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' },
        { id: 4, name: 'User 4' },
        { id: 5, name: 'User 5' },
    ];

    // Mock für Prisma-Modelle
    const mockPrismaUserModel = {
        findMany: jest.fn(),
        count: jest.fn(),
    };

    // Mock für nicht existierendes Modell
    const mockPrismaService = {
        user: mockPrismaUserModel,
        // Andere Modelle sind nicht definiert
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaginationService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        paginationService = module.get<PaginationService>(PaginationService);

        // Reset der Mocks vor jedem Test
        jest.clearAllMocks();
    });

    it('sollte definiert sein', () => {
        expect(paginationService).toBeDefined();
    });

    describe('paginate', () => {
        it('sollte korrekt paginierte Daten zurückgeben', async () => {
            // Mock-Rückgabewerte für Prisma
            mockPrismaUserModel.findMany.mockResolvedValue(mockUsers.slice(0, 2));
            mockPrismaUserModel.count.mockResolvedValue(mockUsers.length);

            // Parameter für die Paginierung
            const model = 'user';
            const options = { where: { active: true } };
            const page = 1;
            const limit = 2;

            // Service aufrufen
            const result = await paginationService.paginate(model, options, page, limit);

            // Tests
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                where: { active: true },
                skip: 0, // (page - 1) * limit
                take: 2,
            });

            expect(mockPrismaUserModel.count).toHaveBeenCalledWith({
                where: { active: true },
            });

            // Überprüfe das Ergebnis
            expect(result).toBeInstanceOf(Object);
            expect(result.items).toHaveLength(2);
            expect(result.pagination.currentPage).toBe(1);
            expect(result.pagination.itemsPerPage).toBe(2);
            expect(result.pagination.totalItems).toBe(5);
            expect(result.pagination.totalPages).toBe(3);
            expect(result.pagination.hasNextPage).toBeTruthy();
            expect(result.pagination.hasPreviousPage).toBeFalsy();
        });

        it('sollte mit der zweiten Seite korrekt umgehen', async () => {
            // Mock-Rückgabewerte für Prisma
            mockPrismaUserModel.findMany.mockResolvedValue(mockUsers.slice(2, 4));
            mockPrismaUserModel.count.mockResolvedValue(mockUsers.length);

            // Parameter für die Paginierung
            const model = 'user';
            const options = {};
            const page = 2;
            const limit = 2;

            // Service aufrufen
            const result = await paginationService.paginate(model, options, page, limit);

            // Tests
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                skip: 2, // (page - 1) * limit
                take: 2,
            });

            // Überprüfe das Ergebnis
            expect(result.items).toHaveLength(2);
            expect(result.pagination.currentPage).toBe(2);
            expect(result.pagination.hasNextPage).toBeTruthy();
            expect(result.pagination.hasPreviousPage).toBeTruthy();
        });

        it('sollte mit der letzten Seite korrekt umgehen', async () => {
            // Mock-Rückgabewerte für Prisma
            mockPrismaUserModel.findMany.mockResolvedValue(mockUsers.slice(4, 5));
            mockPrismaUserModel.count.mockResolvedValue(mockUsers.length);

            // Parameter für die Paginierung
            const model = 'user';
            const options = {};
            const page = 3;
            const limit = 2;

            // Service aufrufen
            const result = await paginationService.paginate(model, options, page, limit);

            // Tests
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                skip: 4, // (page - 1) * limit
                take: 2,
            });

            // Überprüfe das Ergebnis
            expect(result.items).toHaveLength(1); // Nur ein Element auf der letzten Seite
            expect(result.pagination.currentPage).toBe(3);
            expect(result.pagination.hasNextPage).toBeFalsy(); // Keine weitere Seite
            expect(result.pagination.hasPreviousPage).toBeTruthy();
        });

        it('sollte mit komplexen Abfrageoptionen korrekt umgehen', async () => {
            // Mock-Rückgabewerte für Prisma
            mockPrismaUserModel.findMany.mockResolvedValue(mockUsers.slice(0, 2));
            mockPrismaUserModel.count.mockResolvedValue(2);

            // Komplexe Optionen
            const model = 'user';
            const options = {
                where: {
                    OR: [
                        { name: { contains: 'User' } },
                        { email: { contains: 'example.com' } }
                    ]
                },
                orderBy: { name: 'asc' },
                include: {
                    posts: true,
                    profile: true
                }
            };
            const page = 1;
            const limit = 2;

            // Service aufrufen
            const result = await paginationService.paginate(model, options, page, limit);

            // Tests
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                where: options.where,
                orderBy: options.orderBy,
                include: options.include,
                skip: 0,
                take: 2,
            });

            expect(mockPrismaUserModel.count).toHaveBeenCalledWith({
                where: options.where
            });

            // Überprüfe das Ergebnis
            expect(result.items).toHaveLength(2);
            expect(result.pagination.totalItems).toBe(2);
            expect(result.pagination.totalPages).toBe(1);
        });

        it('sollte mit leeren Ergebnissen korrekt umgehen', async () => {
            // Mock-Rückgabewerte für leere Ergebnisse
            mockPrismaUserModel.findMany.mockResolvedValue([]);
            mockPrismaUserModel.count.mockResolvedValue(0);

            // Service aufrufen
            const result = await paginationService.paginate('user', {}, 1, 10);

            // Tests
            expect(result.items).toHaveLength(0);
            expect(result.pagination.totalItems).toBe(0);
            expect(result.pagination.totalPages).toBe(0);
            expect(result.pagination.hasNextPage).toBeFalsy();
            expect(result.pagination.hasPreviousPage).toBeFalsy();
        });

        it('sollte mit ungültigen Seitenzahlen korrekt umgehen', async () => {
            // Mock-Rückgabewerte
            mockPrismaUserModel.findMany.mockResolvedValue([]);
            mockPrismaUserModel.count.mockResolvedValue(5);

            // Service mit ungültiger Seitennummer aufrufen (größer als die Gesamtseitenzahl)
            const result = await paginationService.paginate('user', {}, 10, 2);

            // Tests
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                skip: 18, // (page - 1) * limit -> (10 - 1) * 2
                take: 2,
            });

            // Auch bei ungültiger Seite sollte die Pagination korrekt berechnet werden
            expect(result.items).toHaveLength(0);
            expect(result.pagination.currentPage).toBe(10);
            expect(result.pagination.totalPages).toBe(3);
            expect(result.pagination.hasNextPage).toBeFalsy();
            expect(result.pagination.hasPreviousPage).toBeTruthy();
        });

        it('sollte mit negativen Seitenzahlen oder Limits korrekt umgehen', async () => {
            // Basierend auf der tatsächlichen Implementierung
            // Die Implementierung verwendet die Werte direkt ohne Validierung
            const page = -1;
            const limit = -10;

            // Service mit negativen Werten aufrufen
            await paginationService.paginate('user', {}, page, limit);

            // Tests - Entspricht dem aktuellen Verhalten ohne Validierung
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                skip: 20, // (page - 1) * limit = (-1 - 1) * (-10) = 20
                take: -10, // Wird direkt verwendet
            });
        });

        it('sollte einen Fehler werfen, wenn das Modell nicht existiert', async () => {
            // Erwarte, dass ein Fehler geworfen wird
            await expect(paginationService.paginate('nonExistingModel', {}, 1, 10))
                .rejects
                .toThrow("Prisma model 'nonExistingModel' not found");
        });

        it('sollte die Standardwerte für Seite und Limit verwenden, wenn keine angegeben sind', async () => {
            // Mock-Rückgabewerte
            mockPrismaUserModel.findMany.mockResolvedValue(mockUsers.slice(0, 10));
            mockPrismaUserModel.count.mockResolvedValue(mockUsers.length);

            // Service ohne Seite und Limit aufrufen
            await paginationService.paginate('user', {});

            // Tests - Sollte Standardwerte verwenden (Seite 1, Limit 10)
            expect(mockPrismaUserModel.findMany).toHaveBeenCalledWith({
                skip: 0,
                take: 10,
            });
        });
    });
}); 