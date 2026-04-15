/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 * NOTE: Manually authored, compatible with OpenAPI Generator output. Issue #627.
 */

import type { HazardZoneListResponseDto } from './HazardZoneListResponseDto';
import {
    HazardZoneListResponseDtoFromJSON,
    HazardZoneListResponseDtoToJSON,
} from './HazardZoneListResponseDto';
import type { HealthControllerGetIntegrationHealth200ResponseMeta } from './HealthControllerGetIntegrationHealth200ResponseMeta';
import {
    HealthControllerGetIntegrationHealth200ResponseMetaFromJSON,
    HealthControllerGetIntegrationHealth200ResponseMetaToJSON,
} from './HealthControllerGetIntegrationHealth200ResponseMeta';

export interface HazardZoneControllerListVAlpha200Response {
    data: HazardZoneListResponseDto;
    meta: HealthControllerGetIntegrationHealth200ResponseMeta;
}

export function HazardZoneControllerListVAlpha200ResponseFromJSON(json: any): HazardZoneControllerListVAlpha200Response {
    return HazardZoneControllerListVAlpha200ResponseFromJSONTyped(json, false);
}

export function HazardZoneControllerListVAlpha200ResponseFromJSONTyped(json: any, _ignoreDiscriminator: boolean): HazardZoneControllerListVAlpha200Response {
    if (json == null) {
        return json;
    }
    return {
        'data': HazardZoneListResponseDtoFromJSON(json['data']),
        'meta': HealthControllerGetIntegrationHealth200ResponseMetaFromJSON(json['meta']),
    };
}

export function HazardZoneControllerListVAlpha200ResponseToJSON(value: HazardZoneControllerListVAlpha200Response): any {
    return HazardZoneControllerListVAlpha200ResponseToJSONTyped(value, false);
}

export function HazardZoneControllerListVAlpha200ResponseToJSONTyped(value?: HazardZoneControllerListVAlpha200Response | null, _ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }
    return {
        'data': HazardZoneListResponseDtoToJSON(value['data']),
        'meta': HealthControllerGetIntegrationHealth200ResponseMetaToJSON(value['meta']),
    };
}
