import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpsertRuntimeConfigRequestDto } from './runtime-config.dto';

describe('UpsertRuntimeConfigRequestDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('akzeptiert value, sensitive und sourceHint als whitelisted Felder', async () => {
    const payload = {
      value: 'https://api.example.de',
      sensitive: false,
      sourceHint: 'ui',
    };

    const result = await pipe.transform(payload, {
      type: 'body',
      metatype: UpsertRuntimeConfigRequestDto,
      data: '',
    });

    expect(result).toEqual(payload);
  });

  it('lehnt unbekannte Felder weiterhin strikt ab', async () => {
    const payload = {
      value: 'https://api.example.de',
      unexpected: 'nope',
    };

    await expect(
      pipe.transform(payload, {
        type: 'body',
        metatype: UpsertRuntimeConfigRequestDto,
        data: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
