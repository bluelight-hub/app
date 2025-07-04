import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ErrorHandlingService } from './services/error-handling.service';
import { PaginationService } from './services/pagination.service';

/**
 * Modul für gemeinsam genutzte Funktionalitäten wie Paginierung, Validierung, etc.
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule
    ],
    providers: [PaginationService, ErrorHandlingService],
    exports: [PaginationService, ErrorHandlingService]
})
export class CommonModule { } 