import { EinsatzModule } from '@/modules/einsatz/einsatz.module';
import { SeedModule } from '@/modules/seed/seed.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SeedEinsatzCommand } from './commands/seed-einsatz.command';
import { SeedImportCommand } from './commands/seed-import.command';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        EinsatzModule,
        SeedModule,
    ],
    providers: [
        SeedEinsatzCommand,
        SeedImportCommand,
    ],
})
export class CliModule {
}