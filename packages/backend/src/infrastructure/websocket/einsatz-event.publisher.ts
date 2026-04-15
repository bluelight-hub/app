import { Inject, Injectable } from '@nestjs/common';

import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEtbRepository } from '@domain/repositories/i-etb.repository';
import { EtbId } from '@domain/value-objects/etb-id';
import { ETB_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { EinsatzEventsGateway } from './einsatz-events.gateway';
import type { EinsatzEventName, IEinsatzEventPublisher } from './events/einsatz-event.types';

/**
 * Konkrete Implementation des `IEinsatzEventPublisher` (Issue #407, Task 18).
 *
 * Wird im DI-Container unter dem Token `EINSATZ_EVENT_PUBLISHER` registriert
 * und u.a. vom `FunkkanalEventAdapter`, `EtbFunkspruchBroadcastAdapter` sowie
 * indirekt vom `NotfallFunkspruchAlertEventAdapter` konsumiert.
 *
 * **broadcast:** delegiert direkt an das Gateway.
 * **broadcastByEtb:** resolved zuerst etbId → einsatzId via `IEtbRepository`
 * (1:1-Beziehung Einsatz ↔ ETB) und broadcastet anschließend in den passenden
 * Einsatz-Room. Schlägt die Resolution fehl, wird das Event verworfen und
 * geloggt — Funkverkehr-Events ohne Einsatz-Kontext sind nicht broadcastbar.
 */
@Injectable()
export class EinsatzEventPublisher implements IEinsatzEventPublisher {
  constructor(
    private readonly gateway: EinsatzEventsGateway,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(ETB_REPOSITORY) private readonly etbRepository: IEtbRepository,
  ) {}

  async broadcast(einsatzId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void> {
    this.gateway.broadcastToEinsatz(einsatzId, channel, payload);
  }

  async broadcastByEtb(etbId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void> {
    const idResult = EtbId.create(etbId);
    if (!idResult.isSuccess || !idResult.value) {
      this.logger.warn(`broadcastByEtb: ungültige EtbId "${etbId}" — Event "${channel}" wird verworfen`, 'EinsatzEventPublisher');
      return;
    }
    const etb = await this.etbRepository.findById(idResult.value as EtbId);
    if (!etb) {
      this.logger.warn(`broadcastByEtb: kein ETB für etbId "${etbId}" gefunden — Event "${channel}" wird verworfen`, 'EinsatzEventPublisher');
      return;
    }
    this.gateway.broadcastToEinsatz(etb.einsatzId.value, channel, payload);
  }
}
