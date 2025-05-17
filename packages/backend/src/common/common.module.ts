import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaginationService } from './services/pagination.service';

/**
 * Modul für gemeinsam genutzte Funktionalitäten wie Paginierung, Validierung, etc.
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule
    ],
    providers: [PaginationService],
    exports: [PaginationService]
})
export class CommonModule { } 