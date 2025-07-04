/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API
 * BlueLight Hub API for the BlueLight Hub application
 *
 * The version of the OpenAPI document: 1.0.0-alpha.18
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
import type { PaginationMeta } from "./PaginationMeta";
import {
  PaginationMetaFromJSON,
  PaginationMetaFromJSONTyped,
  PaginationMetaToJSON,
  PaginationMetaToJSONTyped,
} from "./PaginationMeta";
import type { EtbEntryDto } from "./EtbEntryDto";
import {
  EtbEntryDtoFromJSON,
  EtbEntryDtoFromJSONTyped,
  EtbEntryDtoToJSON,
  EtbEntryDtoToJSONTyped,
} from "./EtbEntryDto";

/**
 *
 * @export
 * @interface EtbEntriesResponse
 */
export interface EtbEntriesResponse {
  /**
   * Liste von ETB-Einträgen
   * @type {Array<EtbEntryDto>}
   * @memberof EtbEntriesResponse
   */
  items: Array<EtbEntryDto>;
  /**
   * Metainformationen zur Paginierung
   * @type {PaginationMeta}
   * @memberof EtbEntriesResponse
   */
  pagination: PaginationMeta;
}

/**
 * Check if a given object implements the EtbEntriesResponse interface.
 */
export function instanceOfEtbEntriesResponse(
  value: object,
): value is EtbEntriesResponse {
  if (!("items" in value) || value["items"] === undefined) return false;
  if (!("pagination" in value) || value["pagination"] === undefined)
    return false;
  return true;
}

export function EtbEntriesResponseFromJSON(json: any): EtbEntriesResponse {
  return EtbEntriesResponseFromJSONTyped(json, false);
}

export function EtbEntriesResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): EtbEntriesResponse {
  if (json == null) {
    return json;
  }
  return {
    items: (json["items"] as Array<any>).map(EtbEntryDtoFromJSON),
    pagination: PaginationMetaFromJSON(json["pagination"]),
  };
}

export function EtbEntriesResponseToJSON(json: any): EtbEntriesResponse {
  return EtbEntriesResponseToJSONTyped(json, false);
}

export function EtbEntriesResponseToJSONTyped(
  value?: EtbEntriesResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    items: (value["items"] as Array<any>).map(EtbEntryDtoToJSON),
    pagination: PaginationMetaToJSON(value["pagination"]),
  };
}
