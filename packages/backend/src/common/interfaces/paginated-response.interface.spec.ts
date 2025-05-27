import { PaginatedResponse } from './paginated-response.interface';

describe('PaginatedResponse', () => {
    describe('create', () => {
        it('sollte eine korrekte paginierte Antwort erstellen', () => {
            // Testdaten
            const items = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
            const totalItems = 10;
            const page = 1;
            const limit = 2;

            // PaginatedResponse erstellen
            const result = PaginatedResponse.create(items, totalItems, page, limit);

            // Tests
            expect(result).toBeDefined();
            expect(result.items).toEqual(items);
            expect(result.pagination).toBeDefined();
            expect(result.pagination.currentPage).toBe(1);
            expect(result.pagination.itemsPerPage).toBe(2);
            expect(result.pagination.totalItems).toBe(10);
            expect(result.pagination.totalPages).toBe(5); // ceil(10/2)
            expect(result.pagination.hasNextPage).toBeTruthy();
            expect(result.pagination.hasPreviousPage).toBeFalsy();
        });

        it('sollte hasPreviousPage korrekt berechnen', () => {
            // PaginatedResponse für Seite 2 erstellen
            const result = PaginatedResponse.create([], 10, 2, 2);

            // Tests
            expect(result.pagination.currentPage).toBe(2);
            expect(result.pagination.hasPreviousPage).toBeTruthy();
        });

        it('sollte hasNextPage korrekt berechnen', () => {
            // PaginatedResponse für die letzte Seite erstellen
            const result = PaginatedResponse.create([], 10, 5, 2);

            // Tests
            expect(result.pagination.currentPage).toBe(5);
            expect(result.pagination.hasNextPage).toBeFalsy();
        });

        it('sollte mit einer leeren Ergebnisliste umgehen können', () => {
            // PaginatedResponse mit leerer Liste erstellen
            const result = PaginatedResponse.create([], 0, 1, 10);

            // Tests
            expect(result.items).toEqual([]);
            expect(result.pagination.totalItems).toBe(0);
            expect(result.pagination.totalPages).toBe(0);
            expect(result.pagination.hasNextPage).toBeFalsy();
            expect(result.pagination.hasPreviousPage).toBeFalsy();
        });

        it('sollte totalPages korrekt berechnen, wenn totalItems nicht genau durch limit teilbar ist', () => {
            // 11 Items mit Limit 3 -> 4 Seiten (nicht genau teilbar)
            const result = PaginatedResponse.create([], 11, 1, 3);

            // Tests
            expect(result.pagination.totalPages).toBe(4); // ceil(11/3) = 4
        });

        it('sollte totalPages korrekt berechnen, wenn totalItems genau durch limit teilbar ist', () => {
            // 12 Items mit Limit 3 -> 4 Seiten (genau teilbar)
            const result = PaginatedResponse.create([], 12, 1, 3);

            // Tests
            expect(result.pagination.totalPages).toBe(4); // 12/3 = 4
        });
    });
}); 