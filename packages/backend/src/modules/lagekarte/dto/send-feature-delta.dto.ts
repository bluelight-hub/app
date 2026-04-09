import { IsString, IsObject, IsISO8601, IsArray, ValidateNested } from 'class-validator';
import { IsCuid } from '@/modules/common/decorators/is-cuid.decorator';

/**
 * DTO für eingehende WebSocket-Message: Feature erstellt.
 *
 * Wird von Clients gesendet, wenn ein neues Zeichnungs-Feature
 * auf der Lagekarte erstellt wurde (Issue #638).
 */
export class SendFeatureCreatedDto {
  @IsCuid({ message: 'einsatzId muss eine gültige CUID2 sein' })
  einsatzId!: string;

  /** GeoJSON Feature Objekt */
  @IsObject()
  feature!: object;

  /** Zeitstempel der Erstellung (ISO 8601) */
  @IsISO8601()
  timestamp!: string;
}

/**
 * DTO für eingehende WebSocket-Message: Feature aktualisiert.
 *
 * Wird von Clients gesendet, wenn bestehende Zeichnungs-Features
 * auf der Lagekarte aktualisiert wurden (Issue #638).
 */
export class SendFeatureUpdatedDto {
  @IsCuid({ message: 'einsatzId muss eine gültige CUID2 sein' })
  einsatzId!: string;

  /** Aktualisierte GeoJSON Feature Objekte */
  @IsArray()
  @IsObject({ each: true })
  features!: object[];

  /** Zeitstempel der Aktualisierung (ISO 8601) */
  @IsISO8601()
  timestamp!: string;
}

/**
 * DTO für eingehende WebSocket-Message: Feature gelöscht.
 *
 * Wird von Clients gesendet, wenn Zeichnungs-Features
 * von der Lagekarte gelöscht wurden (Issue #638).
 */
export class SendFeatureDeletedDto {
  @IsCuid({ message: 'einsatzId muss eine gültige CUID2 sein' })
  einsatzId!: string;

  /** IDs der gelöschten Features */
  @IsArray()
  @IsString({ each: true })
  featureIds!: string[];

  /** Zeitstempel der Löschung (ISO 8601) */
  @IsISO8601()
  timestamp!: string;
}
