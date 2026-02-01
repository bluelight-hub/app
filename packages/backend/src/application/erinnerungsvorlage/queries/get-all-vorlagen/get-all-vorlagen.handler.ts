import { Inject, Injectable } from '@nestjs/common';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import { ERINNERUNGSVORLAGE_REPOSITORY } from '@infrastructure/di-tokens';
import { ErinnerungsvorlageResponseFactory } from '../../dto/erinnerungsvorlage-response.factory';
import type { ErinnerungsvorlageResponseDto } from '../../dto/erinnerungsvorlage-response.dto';

/**
 * Query Handler: Alle nicht-gelöschten Erinnerungsvorlagen laden.
 */
@Injectable()
export class GetAllVorlagenHandler {
  constructor(
    @Inject(ERINNERUNGSVORLAGE_REPOSITORY)
    private readonly vorlageRepository: IErinnerungsvorlageRepository,
    private readonly responseFactory: ErinnerungsvorlageResponseFactory,
  ) {}

  async execute(): Promise<ErinnerungsvorlageResponseDto[]> {
    const vorlagen = await this.vorlageRepository.findAll();
    return vorlagen.map((vorlage) => this.responseFactory.create(vorlage));
  }
}
