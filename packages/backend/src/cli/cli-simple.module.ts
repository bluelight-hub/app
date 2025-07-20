import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SeedThreatRulesCommand } from './commands/seed-threat-rules.command';
import { ThreatRulesSeedService } from '@/modules/seed/threat-rules-seed.service';

/**
 * Minimales CLI-Modul ohne komplexe Dependencies
 *
 * Dieses Modul wird speziell für CLI-Befehle verwendet,
 * die keine komplexen Module-Dependencies haben dürfen.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
  ],
  providers: [SeedThreatRulesCommand, ThreatRulesSeedService],
})
export class CliSimpleModule {}
