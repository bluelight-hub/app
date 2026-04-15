/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 * NOTE: Manually authored, compatible with OpenAPI Generator output. Issue #627.
 */

import type { HazardZoneDto } from './HazardZoneDto';
import { HazardZoneDtoFromJSON, HazardZoneDtoToJSON } from './HazardZoneDto';

export interface HazardZoneListResponseDto {
    einsatzId: string;
    zones: HazardZoneDto[];
}

export function instanceOfHazardZoneListResponseDto(value: object): value is HazardZoneListResponseDto {
    if (!('einsatzId' in value) || value['einsatzId'] === undefined) return false;
    if (!('zones' in value) || value['zones'] === undefined) return false;
    return true;
}

export function HazardZoneListResponseDtoFromJSON(json: any): HazardZoneListResponseDto {
    return HazardZoneListResponseDtoFromJSONTyped(json, false);
}

export function HazardZoneListResponseDtoFromJSONTyped(json: any, _ignoreDiscriminator: boolean): HazardZoneListResponseDto {
    if (json == null) {
        return json;
    }
    return {
        'einsatzId': json['einsatzId'],
        'zones': (json['zones'] as Array<any>).map(HazardZoneDtoFromJSON),
    };
}

export function HazardZoneListResponseDtoToJSON(value: HazardZoneListResponseDto): any {
    return HazardZoneListResponseDtoToJSONTyped(value, false);
}

export function HazardZoneListResponseDtoToJSONTyped(value?: HazardZoneListResponseDto | null, _ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }
    return {
        'einsatzId': value['einsatzId'],
        'zones': (value['zones'] as Array<HazardZoneDto>).map(HazardZoneDtoToJSON),
    };
}
