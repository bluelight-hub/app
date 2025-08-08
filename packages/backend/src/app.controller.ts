import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { SkipTransform } from './common/decorators/skip-transform.decorator';

const packageJson = (() => {
  try {
    const file = readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8');
    return JSON.parse(file) as { version?: string };
  } catch {
    return {} as { version?: string };
  }
})();

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  private readonly url: string;

  constructor(configService: ConfigService) {
    this.url = configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  @Get()
  @SkipTransform()
  getRoot() {
    return {
      message: 'Bluelight Hub API',
      version: packageJson.version,
      endpoints: {
        api: this.url + '/api',
      },
    };
  }
}
