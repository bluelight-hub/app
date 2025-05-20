import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EinsatzService } from '../modules/einsatz/einsatz.service';
import { LoggerService } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const service = app.get(EinsatzService);
    const logger = app.get<LoggerService>('Logger');

    const nameIndex = process.argv.indexOf('--name');
    let name = '';
    if (nameIndex >= 0 && process.argv[nameIndex + 1]) {
        name = process.argv[nameIndex + 1];
    }
    if (!name) {
        name = `Einsatz ${new Date().toISOString()}`;
    }

    await service.create({ name });
    logger.log(`Einsatz "${name}" wurde angelegt`);
    await app.close();
}

bootstrap();

