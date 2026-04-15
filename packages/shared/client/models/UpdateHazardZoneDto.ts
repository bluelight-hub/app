/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 * NOTE: Manually authored, compatible with OpenAPI Generator output. Issue #627.
 */

export interface UpdateHazardZoneDto {
    gefahrentyp?: string;
    geometryType?: string;
    geometry?: { [key: string]: any };
    radiusMeters?: number | null;
    label?: string;
    beschreibung?: string;
}

export function instanceOfUpdateHazardZoneDto(_value: object): _value is UpdateHazardZoneDto {
    return true;
}

export function UpdateHazardZoneDtoFromJSON(json: any): UpdateHazardZoneDto {
    return UpdateHazardZoneDtoFromJSONTyped(json, false);
}

export function UpdateHazardZoneDtoFromJSONTyped(json: any, _ignoreDiscriminator: boolean): UpdateHazardZoneDto {
    if (json == null) {
        return json;
    }
    return {
        'gefahrentyp': json['gefahrentyp'] == null ? undefined : json['gefahrentyp'],
        'geometryType': json['geometryType'] == null ? undefined : json['geometryType'],
        'geometry': json['geometry'] == null ? undefined : json['geometry'],
        'radiusMeters': json['radiusMeters'] == null ? undefined : json['radiusMeters'],
        'label': json['label'] == null ? undefined : json['label'],
        'beschreibung': json['beschreibung'] == null ? undefined : json['beschreibung'],
    };
}

export function UpdateHazardZoneDtoToJSON(value: UpdateHazardZoneDto): any {
    return UpdateHazardZoneDtoToJSONTyped(value, false);
}

export function UpdateHazardZoneDtoToJSONTyped(value?: UpdateHazardZoneDto | null, _ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }
    return {
        'gefahrentyp': value['gefahrentyp'],
        'geometryType': value['geometryType'],
        'geometry': value['geometry'],
        'radiusMeters': value['radiusMeters'],
        'label': value['label'],
        'beschreibung': value['beschreibung'],
    };
}
