import { Configuration, HealthApi } from '@bluelight-hub/shared/client';

export class BackendApi {
  private readonly configuration: Configuration;

  constructor() {
    this.configuration = new Configuration({});
  }

  health() {
    return new HealthApi(this.configuration);
  }
}
