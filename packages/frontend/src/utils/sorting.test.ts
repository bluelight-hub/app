import { describe, it, expect } from 'vitest';
import {
    sortData,
    compareValues,
    getNestedValue,
    createMultiSort,
    toggleSortDirection,
    getNextSortConfig,
    sortByMultipleFields
} from './sorting';

describe('sorting utils', () => {
    describe('sortData', () => {
        const testData = [
            { id: 3, name: 'Charlie', age: 30, date: new Date('2023-03-01') },
            { id: 1, name: 'Alice', age: 25, date: new Date('2023-01-01') },
            { id: 2, name: 'Bob', age: 35, date: new Date('2023-02-01') }
        ];

        it('should sort by string field ascending', () => {
            const result = sortData(testData, { field: 'name', direction: 'asc' });
            
            expect(result[0].name).toBe('Alice');
            expect(result[1].name).toBe('Bob');
            expect(result[2].name).toBe('Charlie');
        });

        it('should sort by string field descending', () => {
            const result = sortData(testData, { field: 'name', direction: 'desc' });
            
            expect(result[0].name).toBe('Charlie');
            expect(result[1].name).toBe('Bob');
            expect(result[2].name).toBe('Alice');
        });

        it('should sort by number field', () => {
            const result = sortData(testData, { field: 'age', direction: 'asc' });
            
            expect(result[0].age).toBe(25);
            expect(result[1].age).toBe(30);
            expect(result[2].age).toBe(35);
        });

        it('should sort by date field', () => {
            const result = sortData(testData, { field: 'date', direction: 'asc' });
            
            expect(result[0].id).toBe(1);
            expect(result[1].id).toBe(2);
            expect(result[2].id).toBe(3);
        });

        it('should use custom compare function', () => {
            const customCompare = (a: any, b: any) => b.age - a.age; // Reverse numeric sort
            const result = sortData(testData, {
                field: 'age',
                direction: 'asc',
                customCompare
            });
            
            expect(result[0].age).toBe(35);
            expect(result[1].age).toBe(30);
            expect(result[2].age).toBe(25);
        });

        it('should not mutate original array', () => {
            const original = [...testData];
            sortData(testData, { field: 'name', direction: 'asc' });
            
            expect(testData).toEqual(original);
        });
    });

    describe('compareValues', () => {
        it('should handle null/undefined values', () => {
            expect(compareValues(null, null, 'asc')).toBe(0);
            expect(compareValues(null, 'test', 'asc')).toBe(1);
            expect(compareValues('test', null, 'asc')).toBe(-1);
            expect(compareValues(null, 'test', 'desc')).toBe(-1);
            expect(compareValues('test', null, 'desc')).toBe(1);
        });

        it('should compare dates', () => {
            const date1 = new Date('2023-01-01');
            const date2 = new Date('2023-02-01');
            
            expect(compareValues(date1, date2, 'asc')).toBeLessThan(0);
            expect(compareValues(date2, date1, 'asc')).toBeGreaterThan(0);
            expect(compareValues(date1, date2, 'desc')).toBeGreaterThan(0);
        });

        it('should compare numbers', () => {
            expect(compareValues(1, 2, 'asc')).toBeLessThan(0);
            expect(compareValues(2, 1, 'asc')).toBeGreaterThan(0);
            expect(compareValues(1, 1, 'asc')).toBe(0);
            expect(compareValues(1, 2, 'desc')).toBeGreaterThan(0);
        });

        it('should compare strings case-insensitively', () => {
            expect(compareValues('apple', 'Banana', 'asc')).toBeLessThan(0);
            expect(compareValues('APPLE', 'apple', 'asc')).toBe(0);
            expect(compareValues('zebra', 'apple', 'desc')).toBeLessThan(0);
        });

        it('should compare booleans', () => {
            expect(compareValues(true, false, 'asc')).toBeGreaterThan(0);
            expect(compareValues(false, true, 'asc')).toBeLessThan(0);
            expect(compareValues(true, true, 'asc')).toBe(0);
            expect(compareValues(true, false, 'desc')).toBeLessThan(0);
        });

        it('should fallback to string comparison for other types', () => {
            const obj1 = { toString: () => 'a' };
            const obj2 = { toString: () => 'b' };
            
            expect(compareValues(obj1, obj2, 'asc')).toBeLessThan(0);
        });

        it('should handle string comparison for fallback with same values', () => {
            const obj1 = { toString: () => 'same' };
            const obj2 = { toString: () => 'same' };
            
            expect(compareValues(obj1, obj2, 'asc')).toBe(0);
        });

        it('should handle string comparison for fallback in descending order', () => {
            const obj1 = { toString: () => 'z' };
            const obj2 = { toString: () => 'a' };
            
            expect(compareValues(obj1, obj2, 'desc')).toBeLessThan(0);
        });
    });

    describe('getNestedValue', () => {
        const testObj = {
            name: 'Test',
            user: {
                profile: {
                    firstName: 'John',
                    lastName: 'Doe'
                },
                settings: {
                    theme: 'dark'
                }
            }
        };

        it('should get top-level value', () => {
            expect(getNestedValue(testObj, 'name')).toBe('Test');
        });

        it('should get nested value', () => {
            expect(getNestedValue(testObj, 'user.profile.firstName')).toBe('John');
            expect(getNestedValue(testObj, 'user.settings.theme')).toBe('dark');
        });

        it('should return undefined for non-existent path', () => {
            expect(getNestedValue(testObj, 'user.profile.age')).toBeUndefined();
            expect(getNestedValue(testObj, 'nonexistent.path')).toBeUndefined();
        });

        it('should handle null/undefined objects', () => {
            expect(getNestedValue(null, 'any.path')).toBeUndefined();
            expect(getNestedValue(undefined, 'any.path')).toBeUndefined();
        });
    });

    describe('createMultiSort', () => {
        const testData = [
            { category: 'B', priority: 2, name: 'Item 3' },
            { category: 'A', priority: 1, name: 'Item 1' },
            { category: 'B', priority: 1, name: 'Item 2' },
            { category: 'A', priority: 2, name: 'Item 4' }
        ];

        it('should sort by multiple fields', () => {
            const configs = [
                { field: 'category', direction: 'asc' as const },
                { field: 'priority', direction: 'asc' as const }
            ];
            
            const result = [...testData].sort(createMultiSort(configs));
            
            expect(result[0]).toEqual({ category: 'A', priority: 1, name: 'Item 1' });
            expect(result[1]).toEqual({ category: 'A', priority: 2, name: 'Item 4' });
            expect(result[2]).toEqual({ category: 'B', priority: 1, name: 'Item 2' });
            expect(result[3]).toEqual({ category: 'B', priority: 2, name: 'Item 3' });
        });

        it('should handle mixed directions', () => {
            const configs = [
                { field: 'category', direction: 'asc' as const },
                { field: 'priority', direction: 'desc' as const }
            ];
            
            const result = [...testData].sort(createMultiSort(configs));
            
            expect(result[0]).toEqual({ category: 'A', priority: 2, name: 'Item 4' });
            expect(result[1]).toEqual({ category: 'A', priority: 1, name: 'Item 1' });
        });

        it('should use custom compare function in multi-sort', () => {
            const customCompare = (a: any, b: any) => {
                // Custom compare that reverses the order
                if (a.category < b.category) return 1;
                if (a.category > b.category) return -1;
                return 0;
            };
            
            const configs = [
                { field: 'category', direction: 'asc' as const, customCompare },
                { field: 'priority', direction: 'asc' as const }
            ];
            
            const result = [...testData].sort(createMultiSort(configs));
            
            // With custom compare reversing category order, B should come first
            expect(result[0].category).toBe('B');
            expect(result[1].category).toBe('B');
            expect(result[2].category).toBe('A');
            expect(result[3].category).toBe('A');
        });

        it('should apply direction to custom compare results', () => {
            const customCompare = (a: any, b: any) => a.priority - b.priority;
            
            const configs = [
                { field: 'category', direction: 'asc' as const },
                { field: 'priority', direction: 'desc' as const, customCompare }
            ];
            
            const result = [...testData].sort(createMultiSort(configs));
            
            // Within each category, priority should be descending due to desc direction
            expect(result[0]).toEqual({ category: 'A', priority: 2, name: 'Item 4' });
            expect(result[1]).toEqual({ category: 'A', priority: 1, name: 'Item 1' });
            expect(result[2]).toEqual({ category: 'B', priority: 2, name: 'Item 3' });
            expect(result[3]).toEqual({ category: 'B', priority: 1, name: 'Item 2' });
        });
    });

    describe('toggleSortDirection', () => {
        it('should toggle asc to desc', () => {
            expect(toggleSortDirection('asc')).toBe('desc');
        });

        it('should toggle desc to asc', () => {
            expect(toggleSortDirection('desc')).toBe('asc');
        });
    });

    describe('getNextSortConfig', () => {
        it('should toggle direction for same field', () => {
            const result = getNextSortConfig('name', 'asc', 'name');
            
            expect(result.field).toBe('name');
            expect(result.direction).toBe('desc');
        });

        it('should use default direction for new field', () => {
            const result = getNextSortConfig('name', 'desc', 'age');
            
            expect(result.field).toBe('age');
            expect(result.direction).toBe('asc');
        });

        it('should use custom default direction', () => {
            const result = getNextSortConfig('name', 'asc', 'age', 'desc');
            
            expect(result.field).toBe('age');
            expect(result.direction).toBe('desc');
        });

        it('should handle null current field', () => {
            const result = getNextSortConfig(null, 'asc', 'name');
            
            expect(result.field).toBe('name');
            expect(result.direction).toBe('asc');
        });
    });

    describe('sortByMultipleFields', () => {
        const testData = [
            { category: 'B', name: 'Zebra' },
            { category: 'A', name: 'Apple' },
            { category: 'B', name: 'Apple' },
            { category: 'A', name: 'Zebra' }
        ];

        it('should sort by primary field only when no secondary', () => {
            const result = sortByMultipleFields(testData, {
                field: 'category',
                direction: 'asc'
            });
            
            expect(result[0].category).toBe('A');
            expect(result[1].category).toBe('A');
            expect(result[2].category).toBe('B');
            expect(result[3].category).toBe('B');
        });

        it('should sort by primary and secondary fields', () => {
            const result = sortByMultipleFields(
                testData,
                { field: 'category', direction: 'asc' },
                { field: 'name', direction: 'asc' }
            );
            
            expect(result[0]).toEqual({ category: 'A', name: 'Apple' });
            expect(result[1]).toEqual({ category: 'A', name: 'Zebra' });
            expect(result[2]).toEqual({ category: 'B', name: 'Apple' });
            expect(result[3]).toEqual({ category: 'B', name: 'Zebra' });
        });
    });
});