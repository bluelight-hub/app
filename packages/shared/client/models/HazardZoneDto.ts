/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 *
 * NOTE: This file is generated-client-compatible, manually authored for Issue #627.
 * It follows the same shape OpenAPI Generator would produce; regenerate via
 * `pnpm run generate-api` against a running backend to refresh.
 */

/**
 *
 * @export
 * @interface HazardZoneDto
 */
export interface HazardZoneDto {
    id: string;
    einsatzId: string;
    gefahrentyp: string;
    geometryType: string;
    geometry: { [key: string]: any };
    radiusMeters?: number | null;
    label?: string | null;
    beschreibung?: string | null;
    maxWarnstufe: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}

export function instanceOfHazardZoneDto(value: object): value is HazardZoneDto {
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('einsatzId' in value) || value['einsatzId'] === undefined) return false;
    if (!('gefahrentyp' in value) || value['gefahrentyp'] === undefined) return false;
    if (!('geometryType' in value) || value['geometryType'] === undefined) return false;
    if (!('geometry' in value) || value['geometry'] === undefined) return false;
    if (!('maxWarnstufe' in value) || value['maxWarnstufe'] === undefined) return false;
    if (!('createdAt' in value) || value['createdAt'] === undefined) return false;
    if (!('updatedAt' in value) || value['updatedAt'] === undefined) return false;
    if (!('createdBy' in value) || value['createdBy'] === undefined) return false;
    if (!('updatedBy' in value) || value['updatedBy'] === undefined) return false;
    return true;
}

export function HazardZoneDtoFromJSON(json: any): HazardZoneDto {
    return HazardZoneDtoFromJSONTyped(json, false);
}

export function HazardZoneDtoFromJSONTyped(json: any, _ignoreDiscriminator: boolean): HazardZoneDto {
    if (json == null) {
        return json;
    }
    return {
        'id': json['id'],
        'einsatzId': json['einsatzId'],
        'gefahrentyp': json['gefahrentyp'],
        'geometryType': json['geometryType'],
        'geometry': json['geometry'],
        'radiusMeters': json['radiusMeters'] == null ? undefined : json['radiusMeters'],
        'label': json['label'] == null ? undefined : json['label'],
        'beschreibung': json['beschreibung'] == null ? undefined : json['beschreibung'],
        'maxWarnstufe': json['maxWarnstufe'],
        'createdAt': (new Date(json['createdAt'])),
        'updatedAt': (new Date(json['updatedAt'])),
        'createdBy': json['createdBy'],
        'updatedBy': json['updatedBy'],
    };
}

export function HazardZoneDtoToJSON(value: HazardZoneDto): any {
    return HazardZoneDtoToJSONTyped(value, false);
}

export function HazardZoneDtoToJSONTyped(value?: HazardZoneDto | null, _ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }
    return {
        'id': value['id'],
        'einsatzId': value['einsatzId'],
        'gefahrentyp': value['gefahrentyp'],
        'geometryType': value['geometryType'],
        'geometry': value['geometry'],
        'radiusMeters': value['radiusMeters'],
        'label': value['label'],
        'beschreibung': value['beschreibung'],
        'maxWarnstufe': value['maxWarnstufe'],
        'createdAt': (value['createdAt'] as Date).toISOString(),
        'updatedAt': (value['updatedAt'] as Date).toISOString(),
        'createdBy': value['createdBy'],
        'updatedBy': value['updatedBy'],
    };
}
