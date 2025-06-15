import { describe, it, expect } from 'vitest';
import {
    paginate,
    getPageNumbers,
    validatePageNumber,
    calculatePageBounds,
    createPaginationState
} from './pagination';

describe('pagination utils', () => {
    describe('paginate', () => {
        const testData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

        it('should paginate data correctly', () => {
            const result = paginate(testData, 1, 10);
            
            expect(result.items).toHaveLength(10);
            expect(result.items[0].id).toBe(1);
            expect(result.items[9].id).toBe(10);
            expect(result.totalItems).toBe(100);
            expect(result.currentPage).toBe(1);
            expect(result.pageSize).toBe(10);
            expect(result.totalPages).toBe(10);
            expect(result.hasNextPage).toBe(true);
            expect(result.hasPreviousPage).toBe(false);
        });

        it('should handle middle page', () => {
            const result = paginate(testData, 5, 10);
            
            expect(result.items).toHaveLength(10);
            expect(result.items[0].id).toBe(41);
            expect(result.items[9].id).toBe(50);
            expect(result.currentPage).toBe(5);
            expect(result.hasNextPage).toBe(true);
            expect(result.hasPreviousPage).toBe(true);
        });

        it('should handle last page with partial items', () => {
            const result = paginate(testData, 10, 15);
            
            expect(result.items).toHaveLength(10); // Last page has only 10 items
            expect(result.items[0].id).toBe(91);
            expect(result.items[9].id).toBe(100);
            expect(result.totalPages).toBe(7);
            expect(result.hasNextPage).toBe(false);
            expect(result.hasPreviousPage).toBe(true);
        });

        it('should handle empty data', () => {
            const result = paginate([], 1, 10);
            
            expect(result.items).toHaveLength(0);
            expect(result.totalItems).toBe(0);
            expect(result.totalPages).toBe(0);
            expect(result.currentPage).toBe(1);
            expect(result.hasNextPage).toBe(false);
            expect(result.hasPreviousPage).toBe(false);
        });

        it('should handle out of bounds page numbers', () => {
            const result = paginate(testData, 20, 10);
            
            expect(result.currentPage).toBe(10); // Clamped to max page
            expect(result.items).toHaveLength(10);
            expect(result.items[0].id).toBe(91);
        });

        it('should handle negative page numbers', () => {
            const result = paginate(testData, -5, 10);
            
            expect(result.currentPage).toBe(1); // Clamped to min page
            expect(result.items[0].id).toBe(1);
        });
    });

    describe('getPageNumbers', () => {
        it('should return all pages when total is less than max', () => {
            const result = getPageNumbers(1, 5, 10);
            expect(result).toEqual([1, 2, 3, 4, 5]);
        });

        it('should show ellipsis for many pages - start', () => {
            const result = getPageNumbers(2, 20, 5);
            expect(result).toEqual([1, 2, 3, 4, '...', 20]);
        });

        it('should show ellipsis for many pages - middle', () => {
            const result = getPageNumbers(10, 20, 7);
            expect(result).toEqual([1, '...', 7, 8, 9, 10, 11, 12, 13, '...', 20]);
        });

        it('should show ellipsis for many pages - end', () => {
            const result = getPageNumbers(19, 20, 5);
            expect(result).toEqual([1, '...', 17, 18, 19, 20]);
        });

        it('should handle single page', () => {
            const result = getPageNumbers(1, 1, 5);
            expect(result).toEqual([1]);
        });

        it('should handle edge case with exact max pages', () => {
            const result = getPageNumbers(3, 5, 5);
            expect(result).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('validatePageNumber', () => {
        it('should return valid page number', () => {
            expect(validatePageNumber(5, 10)).toBe(5);
        });

        it('should clamp to minimum', () => {
            expect(validatePageNumber(0, 10)).toBe(1);
            expect(validatePageNumber(-5, 10)).toBe(1);
        });

        it('should clamp to maximum', () => {
            expect(validatePageNumber(15, 10)).toBe(10);
            expect(validatePageNumber(100, 10)).toBe(10);
        });

        it('should handle zero total pages', () => {
            expect(validatePageNumber(1, 0)).toBe(1);
        });
    });

    describe('calculatePageBounds', () => {
        it('should calculate correct bounds for first page', () => {
            const result = calculatePageBounds(1, 10);
            expect(result).toEqual({ startIndex: 0, endIndex: 10 });
        });

        it('should calculate correct bounds for middle page', () => {
            const result = calculatePageBounds(5, 10);
            expect(result).toEqual({ startIndex: 40, endIndex: 50 });
        });

        it('should calculate correct bounds for different page sizes', () => {
            const result = calculatePageBounds(3, 25);
            expect(result).toEqual({ startIndex: 50, endIndex: 75 });
        });
    });

    describe('createPaginationState', () => {
        it('should create initial state', () => {
            const { state } = createPaginationState(100, 1, 20);
            
            expect(state.currentPage).toBe(1);
            expect(state.pageSize).toBe(20);
            expect(state.totalItems).toBe(100);
        });

        it('should go to specific page', () => {
            const { state, goToPage } = createPaginationState(100, 1, 10);
            const newState = goToPage(5);
            
            expect(newState.currentPage).toBe(5);
            expect(newState.pageSize).toBe(10);
            expect(newState.totalItems).toBe(100);
        });

        it('should go to next page', () => {
            const { state, nextPage } = createPaginationState(100, 5, 10);
            const newState = nextPage();
            
            expect(newState.currentPage).toBe(6);
        });

        it('should not go past last page', () => {
            const { state, nextPage } = createPaginationState(100, 10, 10);
            const newState = nextPage();
            
            expect(newState.currentPage).toBe(10); // Stay on last page
        });

        it('should go to previous page', () => {
            const { state, previousPage } = createPaginationState(100, 5, 10);
            const newState = previousPage();
            
            expect(newState.currentPage).toBe(4);
        });

        it('should not go before first page', () => {
            const { state, previousPage } = createPaginationState(100, 1, 10);
            const newState = previousPage();
            
            expect(newState.currentPage).toBe(1); // Stay on first page
        });

        it('should change page size and adjust current page', () => {
            const { state, changePageSize } = createPaginationState(100, 10, 10);
            const newState = changePageSize(20);
            
            expect(newState.pageSize).toBe(20);
            expect(newState.currentPage).toBe(5); // Page 10 with size 10 -> Page 5 with size 20
        });

        it('should handle empty data', () => {
            const { state, nextPage } = createPaginationState(0, 1, 10);
            
            expect(state.currentPage).toBe(1);
            expect(state.totalItems).toBe(0);
            
            const newState = nextPage();
            expect(newState.currentPage).toBe(1); // Stay on first page
        });
    });
});