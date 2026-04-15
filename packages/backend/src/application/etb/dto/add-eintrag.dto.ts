import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ETB_KATEGORIE_VALUES, type EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { type EintragKontextUnionDto } from './eintrag-kontext.dto';

/**
 * DTO für AddEintrag-Request.
 *
 * Wird vom Controller verwendet um eingehende API-Requests zu validieren.
 * Die ETB-ID und User-ID werden aus Route-Parametern bzw. Auth-Context extrahiert.
 *
 * @example
 * ```json
 * {
 *   "text": "Fahrzeug W1 am Einsatzort eingetroffen"
 * }
 * ```
 */
export class AddEintragDto {
  /**
   * Textinhalt des neuen Eintrags.
   *
   * Darf nicht leer sein. Beschreibt eine Aktion, ein Ereignis oder
   * eine Beobachtung im Einsatzverlauf.
   */
  @ApiProperty({
    description: 'Textinhalt des Eintrags',
    example: 'Fahrzeug W1 am Einsatzort eingetroffen',
    minLength: 1,
    maxLength: 65535,
  })
  @IsString({ message: 'text muss ein String sein' })
  @MinLength(1, { message: 'text darf nicht leer sein' })
  @MaxLength(65535, { message: 'Text darf maximal 65535 Zeichen lang sein' })
  text!: string;

  /**
   * Kategorie des ETB-Eintrags.
   *
   * Optional mit Default LAGE. Ermöglicht Kategorisierung von Einträgen
   * für bessere Filterung und Übersichtlichkeit im Einsatztagebuch.
   */
  @ApiPropertyOptional({
    description: 'Kategorie des ETB-Eintrags',
    enum: ETB_KATEGORIE_VALUES,
    default: 'LAGE',
    example: 'LAGE',
  })
  @IsOptional()
  @IsEnum(ETB_KATEGORIE_VALUES, { message: 'kategorie muss ein gültiger EtbKategorie-Wert sein' })
  kategorie?: EtbKategorieValue;

  /**
   * Einsatz-ID fuer automatische ETB-Erstellung, falls noch kein ETB existiert.
   * Optional, weil bestehende ETBs weiterhin nur die etbId benötigen.
   */
  @ApiPropertyOptional({
    description: 'Aktive Einsatz-ID (wird genutzt um bei Bedarf ein ETB zu erstellen)',
    example: 'clx1234567890abcdefghijk',
  })
  @IsOptional()
  @IsString({ message: 'einsatzId muss ein String sein' })
  einsatzId?: string;

  /**
   * Absender des Eintrags (z.B. Funkrufname).
   *
   * Wird automatisch mit dem User-Funkrufname vorausgefüllt im Frontend,
   * kann aber überschrieben werden für Einträge im Namen anderer Parteien.
   */
  @ApiPropertyOptional({
    description: 'Absender des Eintrags (z.B. Funkrufname)',
    example: 'Rotkreuz 83/1',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'absender muss ein String sein' })
  @MaxLength(100, { message: 'Absender darf maximal 100 Zeichen lang sein' })
  absender?: string;

  /**
   * Empfänger des Eintrags (z.B. LST, Polizei).
   *
   * Optional - wird verwendet um Kommunikationspartner zu dokumentieren.
   */
  @ApiPropertyOptional({
    description: 'Empfänger des Eintrags (z.B. LST, Polizei)',
    example: 'LST Darmstadt',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'empfaenger muss ein String sein' })
  @MaxLength(100, { message: 'Empfänger darf maximal 100 Zeichen lang sein' })
  empfaenger?: string;

  /**
   * Optionale Metadaten für den Eintrag (z.B. Lagekarten-Screenshots).
   *
   * Wird verwendet um strukturierte Zusatzinformationen wie Screenshot-URLs
   * zu speichern, die im Frontend speziell dargestellt werden.
   *
   * @example
   * ```json
   * {
   *   "screenshot": {
   *     "url": "/uploads/lagekarte/einsatz_123.png",
   *     "width": 1024,
   *     "height": 768
   *   }
   * }
   * ```
   */
  @ApiPropertyOptional({
    description: 'Optionale Metadaten (z.B. Screenshots, Anhänge)',
    example: {
      screenshot: {
        url: '/uploads/lagekarte/einsatz_123.png',
        width: 1024,
        height: 768,
      },
    },
    nullable: true,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  /**
   * Zeitpunkt wann der Eintrag ursprünglich aufgetreten ist.
   *
   * Optional - wenn nicht gesetzt, wird die aktuelle Server-Zeit verwendet.
   * Ermöglicht nachträgliches Hinzufügen von Einträgen mit korrektem Zeitstempel
   * (z.B. bei Import von alten Einträgen oder manueller Erfassung).
   *
   * @example "2025-01-15T14:30:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Zeitpunkt des Auftretens (ISO 8601 DateTime String)',
    example: '2025-01-15T14:30:00.000Z',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'occurredAt muss ein gültiger ISO 8601 DateTime String sein' })
  occurredAt?: string;

  /**
   * Issue #407 (Funkverkehr Wave 2): Optionaler fachlicher Ereignis-Zeitstempel.
   * Wird im Aggregat als `ereignisZeitpunkt` gespeichert; Default = `createdAt`.
   */
  @ApiPropertyOptional({
    description: 'Fachlicher Ereignis-Zeitstempel (Default: Erstellungszeitpunkt)',
    example: '2025-01-15T14:25:00.000Z',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'ereignisZeitpunkt muss ein gültiger ISO 8601 DateTime String sein' })
  ereignisZeitpunkt?: string;

  /**
   * Issue #407 (Funkverkehr Wave 2): Optionaler Eintrag-Kontext (standard / funkspruch).
   * Bei `funkspruch` werden `kanalId` + `funkPrioritaet` zusätzlich validiert.
   */
  @ApiPropertyOptional({
    description: 'Eintrag-Kontext (default: { type: "standard" })',
    example: { type: 'funkspruch', kanalId: 'clkanal...', funkPrioritaet: 'routine' },
  })
  @IsOptional()
  @IsObject({ message: 'kontext muss ein Objekt sein' })
  kontext?: EintragKontextUnionDto;
}
