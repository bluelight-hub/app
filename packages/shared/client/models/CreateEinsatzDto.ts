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
/**
 *
 * @export
 * @interface CreateEinsatzDto
 */
export interface CreateEinsatzDto {
  /**
   * Name des Einsatzes
   * @type {string}
   * @memberof CreateEinsatzDto
   */
  name: string;
  /**
   * Beschreibung des Einsatzes
   * @type {string}
   * @memberof CreateEinsatzDto
   */
  beschreibung?: string;
}

/**
 * Check if a given object implements the CreateEinsatzDto interface.
 */
export function instanceOfCreateEinsatzDto(
  value: object,
): value is CreateEinsatzDto {
  if (!("name" in value) || value["name"] === undefined) return false;
  return true;
}

export function CreateEinsatzDtoFromJSON(json: any): CreateEinsatzDto {
  return CreateEinsatzDtoFromJSONTyped(json, false);
}

export function CreateEinsatzDtoFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateEinsatzDto {
  if (json == null) {
    return json;
  }
  return {
    name: json["name"],
    beschreibung:
      json["beschreibung"] == null ? undefined : json["beschreibung"],
  };
}

export function CreateEinsatzDtoToJSON(json: any): CreateEinsatzDto {
  return CreateEinsatzDtoToJSONTyped(json, false);
}

export function CreateEinsatzDtoToJSONTyped(
  value?: CreateEinsatzDto | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    name: value["name"],
    beschreibung: value["beschreibung"],
  };
}
