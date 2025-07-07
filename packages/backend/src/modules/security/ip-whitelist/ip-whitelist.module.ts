import { Module } from '@nestjs/common';
import { IpWhitelistController } from './controllers/ip-whitelist.controller';
import { IpWhitelistService } from './services/ip-whitelist.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../../audit';
import { CommonModule } from '../../../common/common.module';

/**
 * Modul für die Verwaltung der IP-Whitelist.
 * Ermöglicht die Verwaltung von erlaubten IP-Adressen für den Plattformzugriff.
 */
@Module({
  imports: [PrismaModule, AuditModule, CommonModule],
  controllers: [IpWhitelistController],
  providers: [IpWhitelistService],
  exports: [IpWhitelistService],
})
export class IpWhitelistModule {}
