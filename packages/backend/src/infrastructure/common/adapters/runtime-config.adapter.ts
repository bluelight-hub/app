import { Injectable } from '@nestjs/common';
import type { IRuntimeConfigPort } from '@domain/ports/i-runtime-config.port';
import { AppConfigService } from '@/infrastructure/services/app-config.service';

@Injectable()
export class RuntimeConfigAdapter implements IRuntimeConfigPort {
  constructor(private readonly appConfig: AppConfigService) {}

  getString(key: string, fallback = ''): string {
    return this.appConfig.get<string>(key, fallback);
  }
}
