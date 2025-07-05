import { validate } from 'class-validator';
import { CreateEinsatzDto } from '../dto/create-einsatz.dto';

describe('CreateEinsatzDto', () => {
  it('should validate with all required fields', async () => {
    // Arrange
    const dto = new CreateEinsatzDto();
    dto.name = 'Test Einsatz';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
  });

  it('should validate with all fields', async () => {
    // Arrange
    const dto = new CreateEinsatzDto();
    dto.name = 'Test Einsatz';
    dto.beschreibung = 'Eine Beschreibung';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0);
  });

  it('should fail validation when name is missing', async () => {
    // Arrange
    const dto = new CreateEinsatzDto();

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail validation when name is empty', async () => {
    // Arrange
    const dto = new CreateEinsatzDto();
    dto.name = '';

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail validation when name is not a string', async () => {
    // Arrange
    const dto = new CreateEinsatzDto();
    (dto as any).name = 123;

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should fail validation when beschreibung is not a string', async () => {
    // Arrange
    const dto = new CreateEinsatzDto();
    dto.name = 'Test Einsatz';
    (dto as any).beschreibung = 123;

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('beschreibung');
    expect(errors[0].constraints).toHaveProperty('isString');
  });
});
