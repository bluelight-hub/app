import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
            type: 'better-sqlite3',
            database: join(__dirname, '..', '..', '..', 'data', 'database.sqlite'),
            entities: ['dist/**/*.entity.{ts,js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV !== 'production',
            autoLoadEntities: true,
        }),
        // TypeORM configuration will be added later
        // Import other modules here
    ],
    controllers: [],
    providers: [],
})
export class AppModule { } 