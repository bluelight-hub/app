import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { HealthModule } from './health/health.module';
import { ConsolaLogger } from './logger/consola.logger';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
            type: 'better-sqlite3',
            database: process.env.SQLITE_DB_PATH || join(__dirname, '..', '..', '..', 'data', 'database.sqlite'),
            entities: ['dist/**/*.entity.{ts,js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV !== 'production',
            autoLoadEntities: true,
        }),
        HealthModule,
    ],
    controllers: [],
    providers: [
        {
            provide: 'Logger',
            useClass: ConsolaLogger,
        },
    ],
})
export class AppModule { } 