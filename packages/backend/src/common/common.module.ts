import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../modules/admin/admin.module';
import { ErrorHandlingService } from './services/error-handling.service';
import { PaginationService } from './services/pagination.service';
import { IpWhitelistMiddleware } from './middleware/ip-whitelist.middleware';

/**
 * Modul für gemeinsam genutzte Funktionalitäten wie Paginierung, Validierung, etc.
 */
@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        AdminModule,
    ],
    providers: [PaginationService, ErrorHandlingService, IpWhitelistMiddleware],
    exports: [PaginationService, ErrorHandlingService, IpWhitelistMiddleware],
})
export class CommonModule { } 