import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { EtbKategorie } from '../etb-kategorie.enum';
import { FilterEtbDto } from '../filter-etb.dto';

describe('FilterEtbDto', () => {
    describe('Transform logic for includeUeberschrieben', () => {
        it('should transform string "true" to boolean true', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: 'true'
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(true);
        });

        it('should transform boolean true to boolean true', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: true
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(true);
        });

        it('should transform string "1" to boolean true', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: '1'
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(true);
        });

        it('should transform number 1 to boolean true', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: 1
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(true);
        });

        it('should transform string "false" to boolean false', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: 'false'
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(false);
        });

        it('should transform boolean false to boolean false', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: false
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(false);
        });

        it('should transform number 0 to boolean false', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: 0
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(false);
        });

        it('should transform arbitrary string to boolean false', () => {
            // Arrange
            const plainObject = {
                includeUeberschrieben: 'someOtherValue'
            };

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(false);
        });

        it('should default to false when includeUeberschrieben is undefined', () => {
            // Arrange
            const plainObject = {};

            // Act
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Assert
            expect(filterDto.includeUeberschrieben).toBe(false);
        });
    });

    describe('Validation', () => {
        it('should pass validation for valid DTO', async () => {
            // Arrange
            const filterDto = new FilterEtbDto();
            filterDto.page = 1;
            filterDto.limit = 10;
            filterDto.kategorie = EtbKategorie.MELDUNG;
            filterDto.vonZeitstempel = '2023-01-01T00:00:00.000Z';
            filterDto.bisZeitstempel = '2023-12-31T23:59:59.999Z';
            filterDto.autorId = 'author-123';
            filterDto.search = 'test search';
            filterDto.includeUeberschrieben = false;

            // Act
            const errors = await validate(filterDto);

            // Assert
            expect(errors).toHaveLength(0);
        });

        it('should fail validation for invalid kategorie', async () => {
            // Arrange
            const plainObject = {
                kategorie: 'INVALID_KATEGORIE'
            };
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Act
            const errors = await validate(filterDto);

            // Assert
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('kategorie');
        });

        it('should fail validation for invalid vonZeitstempel', async () => {
            // Arrange
            const plainObject = {
                vonZeitstempel: 'invalid-date'
            };
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Act
            const errors = await validate(filterDto);

            // Assert
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('vonZeitstempel');
        });

        it('should fail validation for invalid bisZeitstempel', async () => {
            // Arrange
            const plainObject = {
                bisZeitstempel: 'invalid-date'
            };
            const filterDto = plainToClass(FilterEtbDto, plainObject);

            // Act
            const errors = await validate(filterDto);

            // Assert
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('bisZeitstempel');
        });
    });
}); 