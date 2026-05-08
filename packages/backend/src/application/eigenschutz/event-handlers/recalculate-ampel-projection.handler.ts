import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import { VorfallGemeldetEvent } from '@domain/eigenschutz/events/vorfall-gemeldet.event';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { AMPEL_PROJECTION_REPOSITORY, KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';

type AmpelProjectionEvent =
  | GefaehrdungsbeurteilungErstelltEvent
  | GefaehrdungsbeurteilungAktualisiertEvent
  | PsaProfilGeaendertEvent
  | QuittungAbgegebenEvent
  | LueckeGemeldetEvent
  | SicherheitsregelAusgerufenEvent
  | SicherheitsregelQuittiertEvent
  | QuittungUeberfaelligEvent
  | VorfallGemeldetEvent;

@Injectable()
export class RecalculateAmpelProjectionOnEigenschutzEventHandler {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(AMPEL_PROJECTION_REPOSITORY) private readonly ampelProjection: IAmpelProjectionRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einsatzEinheiten: IEinsatzEinheitRepository,
  ) {}

  @OnEvent(GefaehrdungsbeurteilungErstelltEvent.eventName())
  async onGefaehrdungsbeurteilungErstellt(event: GefaehrdungsbeurteilungErstelltEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(GefaehrdungsbeurteilungAktualisiertEvent.eventName())
  async onGefaehrdungsbeurteilungAktualisiert(event: GefaehrdungsbeurteilungAktualisiertEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(PsaProfilGeaendertEvent.eventName())
  async onPsaProfilGeaendert(event: PsaProfilGeaendertEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(QuittungAbgegebenEvent.eventName())
  async onQuittungAbgegeben(event: QuittungAbgegebenEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(LueckeGemeldetEvent.eventName())
  async onLueckeGemeldet(event: LueckeGemeldetEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(SicherheitsregelAusgerufenEvent.eventName())
  async onSicherheitsregelAusgerufen(event: SicherheitsregelAusgerufenEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(SicherheitsregelQuittiertEvent.eventName())
  async onSicherheitsregelQuittiert(event: SicherheitsregelQuittiertEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(QuittungUeberfaelligEvent.eventName())
  async onQuittungUeberfaellig(event: QuittungUeberfaelligEvent): Promise<void> {
    await this.handle(event);
  }

  @OnEvent(VorfallGemeldetEvent.eventName())
  async onVorfallGemeldet(event: VorfallGemeldetEvent): Promise<void> {
    await this.handle(event);
  }

  async handle(event: AmpelProjectionEvent): Promise<void> {
    if (event instanceof QuittungUeberfaelligEvent) {
      this.logger.debug('QuittungUeberfaelligEvent ändert AmpelProjection nicht', { eventId: event.eventId });
      return;
    }

    if (event instanceof SicherheitsregelAusgerufenEvent && event.einheitId === undefined) {
      await this.recalculateAllEinheiten(event);
      return;
    }

    if (event.einheitId === undefined) {
      this.logger.warn('AmpelProjection-Recompute ohne einheitId übersprungen', { eventId: event.eventId });
      return;
    }

    await this.recalculateOne(event.einsatzId, event.einheitId, event.occurredAt, event.userId, event.eventId);
  }

  private async recalculateAllEinheiten(event: SicherheitsregelAusgerufenEvent): Promise<void> {
    const einheiten = await this.einsatzEinheiten.findByEinsatzId(event.einsatzId);
    if (einheiten.isFailure) {
      this.logger.error('AmpelProjection-Recompute: Einsatz-Einheiten konnten nicht geladen werden', {
        eventId: event.eventId,
        error: einheiten.error,
      });
      throw new Error(einheiten.error ?? 'InfrastructureError:AmpelProjection:Einheiten konnten nicht geladen werden');
    }

    for (const einheit of einheiten.value ?? []) {
      await this.recalculateOne(event.einsatzId, einheit.id.value, event.occurredAt, event.userId, event.eventId);
    }
  }

  private async recalculateOne(einsatzId: string, einheitId: string, letzteAenderungAm: Date, letzteAenderungVonUserId: string, eventId: string): Promise<void> {
    try {
      const result = await this.ampelProjection.recalculateForEinheit({
        einsatzId,
        einheitId,
        letzteAenderungAm,
        letzteAenderungVonUserId: letzteAenderungVonUserId === 'SYSTEM' ? null : letzteAenderungVonUserId,
      });
      if (result.isFailure) {
        this.logger.error('AmpelProjection-Recompute fehlgeschlagen', { eventId, error: result.error });
        throw new Error(result.error ?? 'InfrastructureError:AmpelProjection:Recompute fehlgeschlagen');
      }
    } catch (error) {
      this.logger.error('AmpelProjection-Recompute hat geworfen', {
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
