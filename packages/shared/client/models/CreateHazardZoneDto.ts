/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 * NOTE: Manually authored, compatible with OpenAPI Generator output. Issue #627.
 */

export interface CreateHazardZoneDto {
    gefahrentyp: string;
    geometryType: string;
    geometry: { [key: string]: any };
    radiusMeters?: number | null;
    label?: string;
    beschreibung?: string;
}

export function instanceOfCreateHazardZoneDto(value: object): value is CreateHazardZoneDto {
    if (!('gefahrentyp' in value) || value['gefahrentyp'] === undefined) return false;
    if (!('geometryType' in value) || value['geometryType'] === undefined) return false;
    if (!('geometry' in value) || value['geometry'] === undefined) return false;
    return true;
}

export function CreateHazardZoneDtoFromJSON(json: any): CreateHazardZoneDto {
    return CreateHazardZoneDtoFromJSONTyped(json, false);
}

export function CreateHazardZoneDtoFromJSONTyped(json: any, _ignoreDiscriminator: boolean): CreateHazardZoneDto {
    if (json == null) {
        return json;
    }
    return {
        'gefahrentyp': json['gefahrentyp'],
        'geometryType': json['geometryType'],
        'geometry': json['geometry'],
        'radiusMeters': json['radiusMeters'] == null ? undefined : json['radiusMeters'],
        'label': json['label'] == null ? undefined : json['label'],
        'beschreibung': json['beschreibung'] == null ? undefined : json['beschreibung'],
    };
}

export function CreateHazardZoneDtoToJSON(value: CreateHazardZoneDto): any {
    return CreateHazardZoneDtoToJSONTyped(value, false);
}

export function CreateHazardZoneDtoToJSONTyped(value?: CreateHazardZoneDto | null, _ignoreDiscriminator: boolean = false): any {
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
