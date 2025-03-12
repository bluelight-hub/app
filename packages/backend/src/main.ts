import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import packageJson from '../package.json';
import { AppModule } from './app.module';
import { logger } from './logger/consola.logger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
    });

    const config = new DocumentBuilder()
        .setTitle('BlueLight Hub API')
        .setDescription('BlueLight Hub API for the BlueLight Hub application')
        .setVersion(packageJson.version)
        .build();

    const document = SwaggerModule.createDocument(app, config);
    document.servers = [{
        url: 'http://localhost:3000',
        description: 'Local Environment',
    }];
    SwaggerModule.setup('api', app, document, {});

    app.enableCors();

    // Enable validation pipes globally
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));

    const configService = app.get(ConfigService);
    const port = configService.get('PORT') || 3000;

    await app.listen(port);
    logger.success(`Application is running on: http://localhost:${port}`);
}

bootstrap(); 