import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {PrismaModule} from '@/prisma/prisma.module';
import {EinsatzModule} from '@/modules/einsatz/einsatz.module';
import {SeedEinsatzCommand} from './commands/seed-einsatz.command';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        EinsatzModule,
    ],
    providers: [
        SeedEinsatzCommand,
    ],
})
export class CliModule {
}