import { Inject, Injectable } from '@nestjs/common';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY } from '@infrastructure/di-tokens';
import { FuehrungsrhythmusTemplateResponseFactory } from '@application/fuehrungsrhythmus-template/dto';
import type { FuehrungsrhythmusTemplateResponseDto } from '@application/fuehrungsrhythmus-template/dto';

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

  async execute(filter?: { scope?: FuehrungsrhythmusTemplateScope; einsatzId?: string; includeGlobal?: boolean }): Promise<FuehrungsrhythmusTemplateResponseDto[]> {
    // einsatzId String zu Value Object parsen
    let parsedFilter: { scope?: FuehrungsrhythmusTemplateScope; einsatzId?: import('@domain/value-objects/einsatz-id').EinsatzId; includeGlobal?: boolean } | undefined;
    if (filter) {
      let einsatzIdVO: import('@domain/value-objects/einsatz-id').EinsatzId | undefined;
      if (filter.einsatzId) {
        const einsatzIdResult = EinsatzId.create(filter.einsatzId);
        if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
          return [];
        }
        einsatzIdVO = einsatzIdResult.value;
      }
      parsedFilter = { scope: filter.scope, einsatzId: einsatzIdVO, includeGlobal: filter.includeGlobal };
    }

    const templates = await this.templateRepository.findAll(parsedFilter);
    return templates.map((template) => this.responseFactory.create(template));
  }
}
