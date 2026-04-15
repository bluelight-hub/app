/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 * NOTE: Manually authored, compatible with OpenAPI Generator output. Issue #627.
 */

import type { HazardZoneDto } from './HazardZoneDto';
import { HazardZoneDtoFromJSON, HazardZoneDtoToJSON } from './HazardZoneDto';
import type { HealthControllerGetIntegrationHealth200ResponseMeta } from './HealthControllerGetIntegrationHealth200ResponseMeta';
import {
    HealthControllerGetIntegrationHealth200ResponseMetaFromJSON,
    HealthControllerGetIntegrationHealth200ResponseMetaToJSON,
} from './HealthControllerGetIntegrationHealth200ResponseMeta';

export interface HazardZoneControllerCreateVAlpha201Response {
    data: HazardZoneDto;
    meta: HealthControllerGetIntegrationHealth200ResponseMeta;
}

export function HazardZoneControllerCreateVAlpha201ResponseFromJSON(json: any): HazardZoneControllerCreateVAlpha201Response {
    return HazardZoneControllerCreateVAlpha201ResponseFromJSONTyped(json, false);
}

export function HazardZoneControllerCreateVAlpha201ResponseFromJSONTyped(json: any, _ignoreDiscriminator: boolean): HazardZoneControllerCreateVAlpha201Response {
    if (json == null) {
        return json;
    }
    return {
        'data': HazardZoneDtoFromJSON(json['data']),
        'meta': HealthControllerGetIntegrationHealth200ResponseMetaFromJSON(json['meta']),
    };
}

export function HazardZoneControllerCreateVAlpha201ResponseToJSON(value: HazardZoneControllerCreateVAlpha201Response): any {
    return HazardZoneControllerCreateVAlpha201ResponseToJSONTyped(value, false);
}

export function HazardZoneControllerCreateVAlpha201ResponseToJSONTyped(value?: HazardZoneControllerCreateVAlpha201Response | null, _ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }
    return {
        'data': HazardZoneDtoToJSON(value['data']),
        'meta': HealthControllerGetIntegrationHealth200ResponseMetaToJSON(value['meta']),
    };
}
