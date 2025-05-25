import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { FilterPaginationDto } from '../pagination.dto';

describe('FilterPaginationDto', () => {
    describe('Default Values', () => {
        it('should have default page value of 1', () => {
            const dto = new FilterPaginationDto();
            expect(dto.page).toBe(1);
        });

        it('should have default limit value of 10', () => {
            const dto = new FilterPaginationDto();
            expect(dto.limit).toBe(10);
        });
    });

    describe('Property Assignment', () => {
        it('should allow setting page and limit values', () => {
            const dto = new FilterPaginationDto();
            dto.page = 5;
            dto.limit = 20;

            expect(dto.page).toBe(5);
            expect(dto.limit).toBe(20);
        });

        it('should allow undefined values', () => {
            const dto = new FilterPaginationDto();
            dto.page = undefined;
            dto.limit = undefined;

            expect(dto.page).toBeUndefined();
            expect(dto.limit).toBeUndefined();
        });
    });

    describe('Validation - Page Property', () => {
        it('should pass validation with valid page number', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 5 });
            const errors = await validate(dto);
            const pageErrors = errors.filter(e => e.property === 'page');

            expect(pageErrors).toHaveLength(0);
        });

        it('should pass validation with undefined page (optional)', async () => {
            const dto = plainToClass(FilterPaginationDto, {});
            const errors = await validate(dto);
            const pageErrors = errors.filter(e => e.property === 'page');

            expect(pageErrors).toHaveLength(0);
        });

        it('should fail validation with page less than 1', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 0 });
            const errors = await validate(dto);
            const pageError = errors.find(e => e.property === 'page');

            expect(pageError).toBeDefined();
            expect(pageError.constraints).toHaveProperty('min');
            expect(pageError.constraints.min).toBe('Seite muss mindestens 1 sein');
        });

        it('should fail validation with negative page number', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: -1 });
            const errors = await validate(dto);
            const pageError = errors.find(e => e.property === 'page');

            expect(pageError).toBeDefined();
            expect(pageError.constraints).toHaveProperty('min');
        });

        it('should fail validation with non-integer page', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 3.5 });
            const errors = await validate(dto);
            const pageError = errors.find(e => e.property === 'page');

            expect(pageError).toBeDefined();
            expect(pageError.constraints).toHaveProperty('isInt');
            expect(pageError.constraints.isInt).toBe('Seite muss eine ganze Zahl sein');
        });

        it('should fail validation with string page value', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 'invalid' });
            const errors = await validate(dto);
            const pageError = errors.find(e => e.property === 'page');

            expect(pageError).toBeDefined();
            expect(pageError.constraints).toHaveProperty('isInt');
        });

        it('should convert string number to number via Type transformer', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: '5' });
            const errors = await validate(dto);
            const pageErrors = errors.filter(e => e.property === 'page');

            expect(pageErrors).toHaveLength(0);
            expect(dto.page).toBe(5);
            expect(typeof dto.page).toBe('number');
        });
    });

    describe('Validation - Limit Property', () => {
        it('should pass validation with valid limit number', async () => {
            const dto = plainToClass(FilterPaginationDto, { limit: 25 });
            const errors = await validate(dto);
            const limitErrors = errors.filter(e => e.property === 'limit');

            expect(limitErrors).toHaveLength(0);
        });

        it('should pass validation with undefined limit (optional)', async () => {
            const dto = plainToClass(FilterPaginationDto, {});
            const errors = await validate(dto);
            const limitErrors = errors.filter(e => e.property === 'limit');

            expect(limitErrors).toHaveLength(0);
        });

        it('should fail validation with limit less than 1', async () => {
            const dto = plainToClass(FilterPaginationDto, { limit: 0 });
            const errors = await validate(dto);
            const limitError = errors.find(e => e.property === 'limit');

            expect(limitError).toBeDefined();
            expect(limitError.constraints).toHaveProperty('min');
            expect(limitError.constraints.min).toBe('Limit muss mindestens 1 sein');
        });

        it('should fail validation with negative limit number', async () => {
            const dto = plainToClass(FilterPaginationDto, { limit: -5 });
            const errors = await validate(dto);
            const limitError = errors.find(e => e.property === 'limit');

            expect(limitError).toBeDefined();
            expect(limitError.constraints).toHaveProperty('min');
        });

        it('should fail validation with non-integer limit', async () => {
            const dto = plainToClass(FilterPaginationDto, { limit: 10.7 });
            const errors = await validate(dto);
            const limitError = errors.find(e => e.property === 'limit');

            expect(limitError).toBeDefined();
            expect(limitError.constraints).toHaveProperty('isInt');
            expect(limitError.constraints.isInt).toBe('Limit muss eine ganze Zahl sein');
        });

        it('should fail validation with string limit value', async () => {
            const dto = plainToClass(FilterPaginationDto, { limit: 'invalid' });
            const errors = await validate(dto);
            const limitError = errors.find(e => e.property === 'limit');

            expect(limitError).toBeDefined();
            expect(limitError.constraints).toHaveProperty('isInt');
        });

        it('should convert string number to number via Type transformer', async () => {
            const dto = plainToClass(FilterPaginationDto, { limit: '20' });
            const errors = await validate(dto);
            const limitErrors = errors.filter(e => e.property === 'limit');

            expect(limitErrors).toHaveLength(0);
            expect(dto.limit).toBe(20);
            expect(typeof dto.limit).toBe('number');
        });
    });

    describe('Combined Validation', () => {
        it('should pass validation with both valid page and limit', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 3, limit: 15 });
            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should fail validation with invalid page and valid limit', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: -1, limit: 15 });
            const errors = await validate(dto);

            expect(errors).toHaveLength(1);
            expect(errors[0].property).toBe('page');
        });

        it('should fail validation with valid page and invalid limit', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 3, limit: 0 });
            const errors = await validate(dto);

            expect(errors).toHaveLength(1);
            expect(errors[0].property).toBe('limit');
        });

        it('should fail validation with both invalid page and limit', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: -1, limit: -5 });
            const errors = await validate(dto);

            expect(errors).toHaveLength(2);
            const pageError = errors.find(e => e.property === 'page');
            const limitError = errors.find(e => e.property === 'limit');
            expect(pageError).toBeDefined();
            expect(limitError).toBeDefined();
        });

        it('should transform string numbers correctly for both properties', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: '2', limit: '50' });
            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
            expect(dto.page).toBe(2);
            expect(dto.limit).toBe(50);
            expect(typeof dto.page).toBe('number');
            expect(typeof dto.limit).toBe('number');
        });
    });

    describe('Edge Cases', () => {
        it('should handle large valid numbers', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 1000, limit: 100 });
            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should handle boundary value 1 for both properties', async () => {
            const dto = plainToClass(FilterPaginationDto, { page: 1, limit: 1 });
            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('should preserve default values when no input provided', async () => {
            const dto = plainToClass(FilterPaginationDto, {});
            const errors = await validate(dto);

            expect(errors).toHaveLength(0);
            expect(dto.page).toBe(1);
            expect(dto.limit).toBe(10);
        });
    });
}); 