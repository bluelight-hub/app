import { Module } from '@nestjs/common';
import { IpWhitelistService } from './ip-whitelist.service';
import { IpWhitelistController } from './ip-whitelist.controller';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { CommonModule } from '../../../../common/common.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [PrismaModule, CommonModule, AuditLogModule],
    controllers: [IpWhitelistController],
    providers: [IpWhitelistService],
    exports: [IpWhitelistService],
})
export class IpWhitelistModule {}