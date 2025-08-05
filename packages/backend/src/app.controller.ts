import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import * as packageJson from '../package.json';
import { ConfigService } from '@nestjs/config';
import { SkipTransform } from './common/decorators/skip-transform.decorator';

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
