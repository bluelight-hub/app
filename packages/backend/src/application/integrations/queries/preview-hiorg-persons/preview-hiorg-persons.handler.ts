/**
 * PreviewHiOrgPersonsHandler - Handler für PreviewHiOrgPersonsQuery.
 *
 * Lädt Personen aus HiOrg-Server für die Import-Vorschau.
 * Nutzt HiOrgTokenRefreshService für automatisches Token-Refresh bei Ablauf.
 * Inkludiert Qualifikations-Mapping-Status für Inline-Mapping beim Import.
 *
 * @module application/integrations/queries/preview-hiorg-persons
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IHiOrgServerPort, HiOrgPersonDto, HiOrgQualifikation } from '@domain/ports/i-hiorg-server.port';
import type { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import { INTEGRATION_TYPES } from '@domain/integrations';
import { INTEGRATIONS, KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { HiOrgTokenRefreshService } from '@application/integrations';
import type { PreviewHiOrgPersonsQuery } from '@application/integrations';

/**
 * Qualifikation mit Mapping-Status für Vorschau.
 */
export interface HiOrgQualifikationPreviewItem {
  /** Name der Qualifikation in HiOrg */
  name: string;
  /** Kurzname der Qualifikation in HiOrg */
  nameKurz?: string;
  /** Bereits auf lokale Qualifikation gemappt? */
  isMapped: boolean;
  /** ID der gemappten lokalen Qualifikation (nur bei isMapped=true) */
  mappedQualifikationId?: string;
  /** Name der gemappten lokalen Qualifikation (nur bei isMapped=true) */
  mappedQualifikationName?: string;
  /** Auto-Match Confidence Score (0-100, nur bei Auto-Match Vorschlag) */
  autoMatchConfidence?: number;
  /** Auto-Match Vorschlag für Qualifikation-ID (falls vorhanden) */
  autoMatchSuggestionId?: string;
  /** Auto-Match Vorschlag für Qualifikation-Name (falls vorhanden) */
  autoMatchSuggestionName?: string;
}

/**
 * DTO für Personen-Vorschau.
 */
export interface HiOrgPersonsPreviewDto {
  /** Gesamtzahl gefundener Personen */
  totalCount: number;
  /** Personen-Liste (vereinfacht für Vorschau) */
  persons: HiOrgPersonPreviewItem[];
}

/**
 * Vereinfachtes Personen-DTO für Vorschau.
 */
export interface HiOrgPersonPreviewItem {
  username: string;
  mitgliednr?: string;
  vorname: string;
  nachname: string;
  qualifikationenCount: number;
  /** Qualifikationen mit Mapping-Status */
  qualifikationen: HiOrgQualifikationPreviewItem[];
  ausbildungenCount: number;
  /** Bereits als StammPerson importiert? */
  isDuplicate: boolean;
  /** ID der existierenden StammPerson (nur bei isDuplicate=true) */
  existingStammPersonId?: string;
}

/**
 * Handler für PreviewHiOrgPersonsQuery.
 *
 * Verwendet OAuth2 Access Token für HiOrg-Server API-Zugriff.
 * Token wird bei Ablauf automatisch refreshed.
 */
@Injectable()
export class PreviewHiOrgPersonsHandler {
  /** Schwellenwert für Auto-Match Vorschläge (0-100) */
  private static readonly MIN_AUTO_MATCH_CONFIDENCE = 70;

  constructor(
    @Inject(INTEGRATIONS.HIORG_SERVER_PORT)
    private readonly hiorg: IHiOrgServerPort,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepo: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepo: IQualifikationRepository,
    @Inject(INTEGRATIONS.QUALIFIKATION_MAPPING_REPOSITORY)
    private readonly mappingRepo: IQualifikationMappingRepository,
    private readonly tokenRefresh: HiOrgTokenRefreshService,
  ) {}

  /**
   * Führt die Query aus.
   */
  async execute(query: PreviewHiOrgPersonsQuery): Promise<Result<HiOrgPersonsPreviewDto>> {
    // 1. Gültiges Access Token holen (ggf. automatisch refreshen)
    const tokenResult = await this.tokenRefresh.getValidAccessToken();
    if (tokenResult.isFailure) {
      return Result.fail(tokenResult.error ?? 'Fehler beim Abrufen des Access Tokens');
    }

    const tokenData = tokenResult.value;
    if (!tokenData) {
      return Result.fail('Kein Access Token verfügbar');
    }
    const { accessToken } = tokenData;

    // 2. Personen laden
    const personsResult = await this.hiorg.fetchPersons(accessToken, {
      status: query.activeOnly ? ['aktiv'] : undefined,
    });

    if (personsResult.isFailure) {
      return Result.fail(personsResult.error ?? 'Fehler beim Laden der Personen');
    }

    const persons = personsResult.value ?? [];

    // 3. Mappings und lokale Qualifikationen laden (für Inline-Mapping)
    const [mappingsResult, qualifikationenResult] = await Promise.all([this.mappingRepo.findByExternalSource(INTEGRATION_TYPES.HIORG_SERVER), this.qualifikationRepo.findAll({ istAktiv: true })]);

    // Map für schnellen Lookup: externalName (lowercase) → Mapping
    const mappingLookup = new Map<string, { qualifikationId: string | null; qualifikationName?: string }>();
    if (mappingsResult.isSuccess && mappingsResult.value) {
      for (const mapping of mappingsResult.value) {
        mappingLookup.set(mapping.externalName.toLowerCase(), {
          qualifikationId: mapping.qualifikationId,
          qualifikationName: undefined, // Wird später aufgelöst
        });
      }
    }

    // Map für schnellen Lookup: qualifikationId → Qualifikation (Name)
    const qualifikationLookup = new Map<string, { name: string; abkuerzung?: string }>();
    if (qualifikationenResult.isSuccess && qualifikationenResult.value) {
      for (const qual of qualifikationenResult.value) {
        qualifikationLookup.set(qual.id.value, {
          name: qual.name,
          abkuerzung: qual.abkuerzung,
        });
      }
    }

    // Qualifikation-Namen in Mapping-Lookup eintragen
    for (const [key, value] of mappingLookup.entries()) {
      if (value.qualifikationId) {
        const qual = qualifikationLookup.get(value.qualifikationId);
        if (qual) {
          mappingLookup.set(key, { ...value, qualifikationName: qual.name });
        }
      }
    }

    // 4. Duplikat-Prüfung und Qualifikationen-Mapping für alle Personen (parallel)
    const previewItems = await Promise.all(persons.map((p) => this.toPreviewItemWithDuplicateCheck(p, mappingLookup, qualifikationLookup)));

    // 5. Auf Vorschau-Format mappen
    return Result.ok({
      totalCount: persons.length,
      persons: previewItems,
    });
  }

  /**
   * Mappt HiOrgPersonDto auf Vorschau-DTO mit Duplikat-Prüfung und Qualifikations-Mapping.
   *
   * Prüft ob bereits eine StammPerson mit derselben externalId existiert.
   * Mappt Qualifikationen mit Mapping-Status und Auto-Match-Vorschlägen.
   */
  private async toPreviewItemWithDuplicateCheck(
    person: HiOrgPersonDto,
    mappingLookup: Map<string, { qualifikationId: string | null; qualifikationName?: string }>,
    qualifikationLookup: Map<string, { name: string; abkuerzung?: string }>,
  ): Promise<HiOrgPersonPreviewItem> {
    // Duplikat-Check via externalId (HiOrg username)
    const existingResult = await this.stammPersonRepo.findByExternalId(INTEGRATION_TYPES.HIORG_SERVER, person.username);

    const existingPerson = existingResult.isSuccess ? existingResult.value : null;

    // Qualifikationen mit Mapping-Status mappen
    const qualifikationen = person.qualifikationen.map((qual) => this.mapQualifikationWithMappingStatus(qual, mappingLookup, qualifikationLookup));

    return {
      username: person.username,
      mitgliednr: person.mitgliednr,
      vorname: person.vorname,
      nachname: person.nachname,
      qualifikationenCount: person.qualifikationen.length,
      qualifikationen,
      ausbildungenCount: person.ausbildungen.length,
      isDuplicate: !!existingPerson,
      existingStammPersonId: existingPerson?.id.value,
    };
  }

  /**
   * Mappt eine einzelne HiOrg-Qualifikation auf das Preview-Format.
   *
   * Prüft:
   * 1. Ob ein manuelles Mapping existiert
   * 2. Falls nicht: Führt Auto-Match durch (Levenshtein)
   */
  private mapQualifikationWithMappingStatus(
    qual: HiOrgQualifikation,
    mappingLookup: Map<string, { qualifikationId: string | null; qualifikationName?: string }>,
    qualifikationLookup: Map<string, { name: string; abkuerzung?: string }>,
  ): HiOrgQualifikationPreviewItem {
    const normalizedName = qual.name.toLowerCase();
    const normalizedKurz = qual.name_kurz?.toLowerCase();

    // 1. Prüfe ob manuelles Mapping existiert
    const mapping = mappingLookup.get(normalizedName) ?? (normalizedKurz ? mappingLookup.get(normalizedKurz) : undefined);

    if (mapping) {
      // Mapping existiert (kann auch null sein = bewusst ignoriert)
      if (mapping.qualifikationId === null) {
        // Bewusst ignoriert
        return {
          name: qual.name,
          nameKurz: qual.name_kurz,
          isMapped: false, // null bedeutet "ignoriert", nicht "gemappt"
        };
      }

      return {
        name: qual.name,
        nameKurz: qual.name_kurz,
        isMapped: true,
        mappedQualifikationId: mapping.qualifikationId,
        mappedQualifikationName: mapping.qualifikationName,
      };
    }

    // 2. Kein Mapping → Auto-Match versuchen
    const autoMatch = this.findBestAutoMatch(qual, qualifikationLookup);

    return {
      name: qual.name,
      nameKurz: qual.name_kurz,
      isMapped: false,
      autoMatchConfidence: autoMatch?.confidence,
      autoMatchSuggestionId: autoMatch?.id,
      autoMatchSuggestionName: autoMatch?.name,
    };
  }

  /**
   * Findet den besten Auto-Match für eine HiOrg-Qualifikation.
   *
   * Verwendet Levenshtein-Distanz für Ähnlichkeitsberechnung.
   */
  private findBestAutoMatch(qual: HiOrgQualifikation, qualifikationLookup: Map<string, { name: string; abkuerzung?: string }>): { id: string; name: string; confidence: number } | undefined {
    const normalizedHiOrgName = this.normalizeForMatching(qual.name);
    const normalizedHiOrgKurz = qual.name_kurz ? this.normalizeForMatching(qual.name_kurz) : undefined;

    let bestMatch: { id: string; name: string; confidence: number } | undefined;

    for (const [id, local] of qualifikationLookup.entries()) {
      const normalizedLocalName = this.normalizeForMatching(local.name);
      const normalizedLocalKurz = local.abkuerzung ? this.normalizeForMatching(local.abkuerzung) : undefined;

      // Exakter Match auf Name → 100%
      if (normalizedHiOrgName === normalizedLocalName) {
        return { id, name: local.name, confidence: 100 };
      }

      // Exakter Match auf Kurzname → 100%
      if (normalizedHiOrgKurz && normalizedLocalKurz && normalizedHiOrgKurz === normalizedLocalKurz) {
        return { id, name: local.name, confidence: 100 };
      }

      // Levenshtein auf Namen
      const nameSimilarity = this.calculateSimilarity(normalizedHiOrgName, normalizedLocalName);
      if (nameSimilarity >= 0.85) {
        const confidence = Math.round(nameSimilarity * 100);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { id, name: local.name, confidence };
        }
      }

      // Levenshtein auf Kurznamen
      if (normalizedHiOrgKurz && normalizedLocalKurz) {
        const kurzSimilarity = this.calculateSimilarity(normalizedHiOrgKurz, normalizedLocalKurz);
        if (kurzSimilarity >= 0.85) {
          const confidence = Math.round(kurzSimilarity * 100) + 10; // Bonus für Kurzname
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { id, name: local.name, confidence: Math.min(confidence, 100) };
          }
        }
      }
    }

    // Nur zurückgeben wenn Confidence über Schwellenwert
    if (bestMatch && bestMatch.confidence >= PreviewHiOrgPersonsHandler.MIN_AUTO_MATCH_CONFIDENCE) {
      return bestMatch;
    }

    return undefined;
  }

  /**
   * Normalisiert einen String für Matching.
   * Lowercase, Umlaute ersetzen, Sonderzeichen entfernen.
   */
  private normalizeForMatching(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Berechnet Ähnlichkeit zwischen zwei Strings (0-1).
   * Basiert auf Levenshtein-Distanz.
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Initialisiere Matrix mit expliziten Werten
    const matrix: number[][] = Array.from({ length: a.length + 1 }, (_outer, r) => Array.from({ length: b.length + 1 }, (_inner, c) => (r === 0 ? c : c === 0 ? r : 0)));

    for (let i = 1; i <= a.length; i++) {
      const row = matrix[i];
      if (!row) continue;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const prev1 = matrix[i - 1]?.[j] ?? 0;
        const prev2 = row[j - 1] ?? 0;
        const prev3 = matrix[i - 1]?.[j - 1] ?? 0;
        row[j] = Math.min(prev1 + 1, prev2 + 1, prev3 + cost);
      }
    }

    const distance = matrix[a.length]?.[b.length] ?? 0;
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }
}
