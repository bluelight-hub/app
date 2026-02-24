import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { BEFEHL_CSV_SERVICE, BEFEHL_REPOSITORY } from '@/infrastructure/di-tokens';
import type { IBefehlCsvService } from '@/application/befehl/ports/i-befehl-csv.service';
import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { ExportBefehleQuery } from './export-befehle.query';

/**
 * Ergebnis des Befehl-Exports.
 */
export interface ExportBefehleResult {
  content: string;
  filename: string;
  contentType: string;
}

/**
 * Handler fuer ExportBefehleQuery.
 *
 * Exportiert alle Befehle eines Einsatzes als CSV oder JSON.
 * Leerzustand: Leere CSV (nur Header) bzw. leeres JSON-Array.
 *
 * **Story 4.4: Befehlsdaten-Export fuer Nachbereitung**
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Repository: Nutzt findByEinsatzId() fuer Datenabruf
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
@Injectable()
export class ExportBefehleQueryHandler {
  constructor(
    @Inject(BEFEHL_REPOSITORY) private readonly befehlRepository: IBefehlRepository,
    @Inject(BEFEHL_CSV_SERVICE) private readonly csvService: IBefehlCsvService,
  ) {}

  /**
   * Fuehrt die Export-Query aus.
   *
   * @param query - Die Query mit einsatzId und format
   * @returns Result.ok(ExportBefehleResult) bei Erfolg, Result.fail() bei Fehler
   */
  async execute(query: ExportBefehleQuery): Promise<Result<ExportBefehleResult>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure) {
      return Result.fail<ExportBefehleResult>(einsatzIdResult.error ?? 'Ungueltige EinsatzId');
    }

    const einsatzIdVo = einsatzIdResult.value as EinsatzId;
    const befehleResult = await this.befehlRepository.findByEinsatzId(einsatzIdVo);

    if (befehleResult.isFailure) {
      return Result.fail<ExportBefehleResult>(befehleResult.error ?? 'Fehler beim Laden der Befehle');
    }

    const befehle = befehleResult.value ?? [];
    const einsatzIdShort = query.einsatzId.slice(-8);
    const dateStr = this.formatDateForFilename(new Date());

    if (query.format === 'csv') {
      const content = this.csvService.generateCsv(befehle);
      return Result.ok<ExportBefehleResult>({
        content,
        filename: `befehle_${einsatzIdShort}_${dateStr}.csv`,
        contentType: 'text/csv; charset=utf-8',
      });
    }

    const content = JSON.stringify(this.mapBefehleToExportJson(befehle), null, 2);
    return Result.ok<ExportBefehleResult>({
      content,
      filename: `befehle_${einsatzIdShort}_${dateStr}.json`,
      contentType: 'application/json; charset=utf-8',
    });
  }

  /**
   * Formatiert ein Datum fuer den Dateinamen im Format YYYY-MM-DD in Europe/Berlin Timezone.
   */
  private formatDateForFilename(date: Date): string {
    const formatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  /**
   * Mappt Befehl-Aggregate auf ein serialisierbares JSON-Format.
   */
  private mapBefehleToExportJson(befehle: Befehl[]) {
    return befehle.map((b) => ({
      id: b.id.value,
      nummer: b.nummer,
      einsatzId: b.einsatzId.value,
      auftrag: b.auftrag,
      befehlsgeberName: b.befehlsgeberName,
      befehlsgeberId: b.befehlsgeberId?.value ?? null,
      erstellerId: b.erstellerId?.value ?? null,
      status: b.status.value,
      befehlstyp: b.befehlstyp,
      erteiltAm: b.erteiltAm.toISOString(),
      zeitvorgabe: b.zeitvorgabe ?? null,
      ereignis: b.ereignis ?? null,
      mittel: b.mittel ?? null,
      ziel: b.ziel ?? null,
      weg: b.weg ?? null,
      originalBefehlId: b.originalBefehlId?.value ?? null,
      empfaenger: b.empfaenger.map((e) => ({
        id: e.id,
        name: e.name,
        empfaengerId: e.empfaengerId?.value ?? null,
        zugestelltAm: e.zugestelltAm?.toISOString() ?? null,
        quittiertAm: e.quittiertAm?.toISOString() ?? null,
        quittierungArt: e.quittierungArt ?? null,
        istQuittierbar: e.istQuittierbar,
      })),
      kommentare: b.kommentare.map((k) => ({
        id: k.id,
        authorId: k.authorId?.value ?? null,
        text: k.text,
        isRueckfrage: k.isRueckfrage,
        parentId: k.parentId ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }
}
