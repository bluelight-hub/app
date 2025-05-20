import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EinsatzService } from './einsatz.service';

/**
 * Erstellt im Entwicklungsmodus automatisch einen Einsatz, falls keiner existiert.
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
    constructor(
        private readonly einsatzService: EinsatzService,
        private readonly configService: ConfigService,
        @Inject('Logger') private readonly logger: LoggerService,
    ) { }

    async onModuleInit() {
        if (this.configService.get<string>('NODE_ENV') !== 'development') {
            return;
        }
        if (this.configService.get<string>('SEED_INITIAL_EINSATZ') === 'false') {
            this.logger.debug('Initialer Einsatz-Seed deaktiviert');
            return;
        }
        const count = await this.einsatzService.count();
        if (count > 0) {
            return;
        }
        const name = this.configService.get<string>('DEV_EINSATZ_NAME')
            || `Dev-Einsatz ${new Date().toISOString()}`;
        await this.einsatzService.create({ name });
        this.logger.log(`Initialer Einsatz "${name}" wurde angelegt`);
    }
}
