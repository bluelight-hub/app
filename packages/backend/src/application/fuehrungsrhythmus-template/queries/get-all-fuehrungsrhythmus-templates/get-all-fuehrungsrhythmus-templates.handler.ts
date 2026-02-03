import { Inject, Injectable } from '@nestjs/common';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Injectable class - NestJS DI erfordert Value Import
import { FuehrungsrhythmusTemplateResponseFactory } from '../../dto/fuehrungsrhythmus-template-response.factory';
import type { FuehrungsrhythmusTemplateResponseDto } from '../../dto/fuehrungsrhythmus-template-response.dto';

/**
 * Query Handler: Alle nicht-geloeschten Fuehrungsrhythmus-Templates laden.
 */
@Injectable()
export class GetAllFuehrungsrhythmusTemplatesHandler {
  constructor(
    @Inject(FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY)
    private readonly templateRepository: IFuehrungsrhythmusTemplateRepository,
    private readonly responseFactory: FuehrungsrhythmusTemplateResponseFactory,
  ) {}

  async execute(): Promise<FuehrungsrhythmusTemplateResponseDto[]> {
    const templates = await this.templateRepository.findAll();
    return templates.map((template) => this.responseFactory.create(template));
  }
}
