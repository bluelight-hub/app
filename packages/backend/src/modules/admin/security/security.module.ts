import { Module } from '@nestjs/common';
import { IpWhitelistModule } from './ip-whitelist/ip-whitelist.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
    imports: [IpWhitelistModule, AuditLogModule],
    exports: [IpWhitelistModule, AuditLogModule],
})
export class SecurityModule {}