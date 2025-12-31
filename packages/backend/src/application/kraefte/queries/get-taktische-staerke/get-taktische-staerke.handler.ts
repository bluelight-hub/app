import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import type { GetTaktischeStaerkeQuery } from './get-taktische-staerke.query';
import type { TaktischeStaerkeDto } from '../../dto/taktische-staerke.dto';

/**
 * Interne Struktur für Kategorisierung einer Person.
 * Enthält nur die für Stärke-Berechnung relevanten Felder.
 */
interface PersonForKategorisierung {
  funktion: string;
  qualifikationNamen: string[];
}

/**
 * Query Handler für die Berechnung der taktischen Stärke.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Berechnet Führung/Unterführung/Mannschaft/Gesamt basierend auf
 * Funktion und Qualifikation der eingesetzten Personen.
 *
 * **Kategorisierungs-Logik (Priorität: Funktion > Qualifikation):**
 * 1. Führung: Funktion enthält "Leiter", "LNA", "OrgL", "Zugführer"
 * 2. Unterführung: Funktion enthält "Gruppenführer", "GF", "Truppführer"
 * 3. Führung (Override): Qualifikation "Arzt" oder "Notarzt"
 * 4. Mannschaft: Default für alle anderen
 *
 * **Performance (NFR5):**
 * - 2 Queries: Personen + Qualifikationen (kein N+1)
 * - Ziel: <500ms Response Time
 */
@Injectable()
export class GetTaktischeStaerkeHandler {
  /** Regex für Führungs-Funktionen */
  private static readonly FUEHRUNG_FUNKTION_REGEX = /Leiter|LNA|OrgL|Zugführer/i;

  /** Regex für Unterführungs-Funktionen */
  private static readonly UNTERFUEHRUNG_FUNKTION_REGEX = /Gruppenführer|GF|Truppführer/i;

  /** Regex für Arzt-Qualifikationen (Führungs-Override) */
  private static readonly ARZT_QUALIFIKATION_REGEX = /Arzt|Notarzt/;

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly personRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Stärke-Berechnung aus.
   *
   * @param query - Query mit validierter einsatzId
   * @returns Result<TaktischeStaerkeDto> - Stärke-Zahlen oder Fehler
   */
  async execute(query: GetTaktischeStaerkeQuery): Promise<Result<TaktischeStaerkeDto>> {
    this.logger.log(`Berechne taktische Stärke für Einsatz ${query.einsatzId}`, 'GetTaktischeStaerkeHandler');

    // 1. Lade alle Personen des Einsatzes
    const personsResult = await this.personRepository.findByEinsatzId(query.einsatzId);
    if (personsResult.isFailure) {
      this.logger.error(`Fehler beim Laden der Personen: ${personsResult.error}`, 'GetTaktischeStaerkeHandler');
      return Result.fail(personsResult.error ?? 'Fehler beim Laden der Personen');
    }

    const persons = personsResult.value ?? [];

    // AC1b: Empty State - keine Personen
    if (persons.length === 0) {
      return Result.ok<TaktischeStaerkeDto>({
        fuehrung: 0,
        unterfuehrung: 0,
        mannschaft: 0,
        gesamt: 0,
      });
    }

    // 2. Sammle alle eindeutigen Qualifikation-IDs
    const allQualifikationIds = new Set<string>();
    for (const person of persons) {
      for (const qId of person.qualifikationIds) {
        allQualifikationIds.add(qId);
      }
    }

    // 3. Lade Qualifikationen einmal (2. Query - kein N+1)
    const qualifikationIdVOs: QualifikationId[] = [];
    for (const qIdStr of allQualifikationIds) {
      const qIdResult = QualifikationId.create(qIdStr);
      if (qIdResult.isSuccess && qIdResult.value) {
        qualifikationIdVOs.push(qIdResult.value);
      }
    }

    // Map: qualifikationId → name
    const qualNameMap = new Map<string, string>();
    if (qualifikationIdVOs.length > 0) {
      const qualsResult = await this.qualifikationRepository.findByIds(qualifikationIdVOs);
      if (qualsResult.isSuccess && qualsResult.value) {
        for (const qual of qualsResult.value) {
          qualNameMap.set(qual.id.value, qual.name);
        }
      }
    }

    // 4. Erstelle PersonForKategorisierung Liste
    const personsForKategorisierung: PersonForKategorisierung[] = persons.map((p) => ({
      funktion: p.funktion,
      qualifikationNamen: p.qualifikationIds.map((qId) => qualNameMap.get(qId) ?? '').filter((name) => name.length > 0),
    }));

    // 5. Kategorisiere und zähle
    const counts = this.kategorisiere(personsForKategorisierung);

    this.logger.log(`Stärke berechnet: ${counts.fuehrung}/${counts.unterfuehrung}/${counts.mannschaft}/${counts.gesamt}`, 'GetTaktischeStaerkeHandler');

    return Result.ok<TaktischeStaerkeDto>(counts);
  }

  /**
   * Kategorisiert Personen nach Führung/Unterführung/Mannschaft.
   *
   * **Priorität:** Funktion > Qualifikation
   *
   * @param persons - Personen mit Funktion und Qualifikation-Namen
   * @returns TaktischeStaerkeDto mit Zählungen
   */
  private kategorisiere(persons: PersonForKategorisierung[]): TaktischeStaerkeDto {
    let fuehrung = 0;
    let unterfuehrung = 0;
    let mannschaft = 0;

    for (const person of persons) {
      // 1. Funktion-basiert: Führung
      if (GetTaktischeStaerkeHandler.FUEHRUNG_FUNKTION_REGEX.test(person.funktion)) {
        fuehrung++;
        continue;
      }

      // 2. Funktion-basiert: Unterführung
      if (GetTaktischeStaerkeHandler.UNTERFUEHRUNG_FUNKTION_REGEX.test(person.funktion)) {
        unterfuehrung++;
        continue;
      }

      // 3. Qualifikation-basiert: Arzt → Führung (AC5)
      const hasArztQualifikation = person.qualifikationNamen.some((name) => GetTaktischeStaerkeHandler.ARZT_QUALIFIKATION_REGEX.test(name));
      if (hasArztQualifikation) {
        fuehrung++;
        continue;
      }

      // 4. Default: Mannschaft
      mannschaft++;
    }

    return {
      fuehrung,
      unterfuehrung,
      mannschaft,
      gesamt: fuehrung + unterfuehrung + mannschaft,
    };
  }
}
