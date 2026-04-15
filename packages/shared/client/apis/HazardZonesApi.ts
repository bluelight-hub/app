/* tslint:disable */
/* eslint-disable */
/**
 * BlueLight Hub API (Alpha)
 * NOTE: Manually authored, compatible with OpenAPI Generator output. Issue #627.
 */

import * as runtime from '../runtime';
import type {
    CreateHazardZoneDto,
    HazardZoneControllerCreateVAlpha201Response,
    HazardZoneControllerListVAlpha200Response,
    UpdateHazardZoneDto,
} from '../models/index';
import {
    CreateHazardZoneDtoToJSON,
    HazardZoneControllerCreateVAlpha201ResponseFromJSON,
    HazardZoneControllerListVAlpha200ResponseFromJSON,
    UpdateHazardZoneDtoToJSON,
} from '../models/index';

export interface HazardZoneControllerListVAlphaRequest {
    einsatzId: string;
}

export interface HazardZoneControllerCreateVAlphaRequest {
    einsatzId: string;
    createHazardZoneDto: CreateHazardZoneDto;
}

export interface HazardZoneControllerUpdateVAlphaRequest {
    einsatzId: string;
    zoneId: string;
    updateHazardZoneDto: UpdateHazardZoneDto;
}

export interface HazardZoneControllerDeleteVAlphaRequest {
    einsatzId: string;
    zoneId: string;
}

/**
 * HazardZones API (Issue #627).
 */
export class HazardZonesApi extends runtime.BaseAPI {
    /**
     * Alle Gefahrenzonen eines Einsatzes auflisten
     */
    async hazardZoneControllerListVAlphaRaw(
        requestParameters: HazardZoneControllerListVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<HazardZoneControllerListVAlpha200Response>> {
        if (requestParameters['einsatzId'] == null) {
            throw new runtime.RequiredError(
                'einsatzId',
                'Required parameter "einsatzId" was null or undefined when calling hazardZoneControllerListVAlpha().',
            );
        }

        const queryParameters: any = {};
        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request(
            {
                path: `/api/v-alpha/einsatz/{einsatzId}/hazard-zones`.replace(
                    `{${'einsatzId'}}`,
                    encodeURIComponent(String(requestParameters['einsatzId'])),
                ),
                method: 'GET',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) => HazardZoneControllerListVAlpha200ResponseFromJSON(jsonValue));
    }

    async hazardZoneControllerListVAlpha(
        requestParameters: HazardZoneControllerListVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<HazardZoneControllerListVAlpha200Response> {
        const response = await this.hazardZoneControllerListVAlphaRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Neue Gefahrenzone anlegen
     */
    async hazardZoneControllerCreateVAlphaRaw(
        requestParameters: HazardZoneControllerCreateVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<HazardZoneControllerCreateVAlpha201Response>> {
        if (requestParameters['einsatzId'] == null) {
            throw new runtime.RequiredError(
                'einsatzId',
                'Required parameter "einsatzId" was null or undefined when calling hazardZoneControllerCreateVAlpha().',
            );
        }
        if (requestParameters['createHazardZoneDto'] == null) {
            throw new runtime.RequiredError(
                'createHazardZoneDto',
                'Required parameter "createHazardZoneDto" was null or undefined when calling hazardZoneControllerCreateVAlpha().',
            );
        }

        const queryParameters: any = {};
        const headerParameters: runtime.HTTPHeaders = {};
        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request(
            {
                path: `/api/v-alpha/einsatz/{einsatzId}/hazard-zones`.replace(
                    `{${'einsatzId'}}`,
                    encodeURIComponent(String(requestParameters['einsatzId'])),
                ),
                method: 'POST',
                headers: headerParameters,
                query: queryParameters,
                body: CreateHazardZoneDtoToJSON(requestParameters['createHazardZoneDto']),
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) => HazardZoneControllerCreateVAlpha201ResponseFromJSON(jsonValue));
    }

    async hazardZoneControllerCreateVAlpha(
        requestParameters: HazardZoneControllerCreateVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<HazardZoneControllerCreateVAlpha201Response> {
        const response = await this.hazardZoneControllerCreateVAlphaRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Gefahrenzone aktualisieren
     */
    async hazardZoneControllerUpdateVAlphaRaw(
        requestParameters: HazardZoneControllerUpdateVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<HazardZoneControllerCreateVAlpha201Response>> {
        if (requestParameters['einsatzId'] == null) {
            throw new runtime.RequiredError(
                'einsatzId',
                'Required parameter "einsatzId" was null or undefined when calling hazardZoneControllerUpdateVAlpha().',
            );
        }
        if (requestParameters['zoneId'] == null) {
            throw new runtime.RequiredError(
                'zoneId',
                'Required parameter "zoneId" was null or undefined when calling hazardZoneControllerUpdateVAlpha().',
            );
        }
        if (requestParameters['updateHazardZoneDto'] == null) {
            throw new runtime.RequiredError(
                'updateHazardZoneDto',
                'Required parameter "updateHazardZoneDto" was null or undefined when calling hazardZoneControllerUpdateVAlpha().',
            );
        }

        const queryParameters: any = {};
        const headerParameters: runtime.HTTPHeaders = {};
        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request(
            {
                path: `/api/v-alpha/einsatz/{einsatzId}/hazard-zones/{zoneId}`
                    .replace(`{${'einsatzId'}}`, encodeURIComponent(String(requestParameters['einsatzId'])))
                    .replace(`{${'zoneId'}}`, encodeURIComponent(String(requestParameters['zoneId']))),
                method: 'PATCH',
                headers: headerParameters,
                query: queryParameters,
                body: UpdateHazardZoneDtoToJSON(requestParameters['updateHazardZoneDto']),
            },
            initOverrides,
        );

        return new runtime.JSONApiResponse(response, (jsonValue) => HazardZoneControllerCreateVAlpha201ResponseFromJSON(jsonValue));
    }

    async hazardZoneControllerUpdateVAlpha(
        requestParameters: HazardZoneControllerUpdateVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<HazardZoneControllerCreateVAlpha201Response> {
        const response = await this.hazardZoneControllerUpdateVAlphaRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Gefahrenzone löschen
     */
    async hazardZoneControllerDeleteVAlphaRaw(
        requestParameters: HazardZoneControllerDeleteVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['einsatzId'] == null) {
            throw new runtime.RequiredError(
                'einsatzId',
                'Required parameter "einsatzId" was null or undefined when calling hazardZoneControllerDeleteVAlpha().',
            );
        }
        if (requestParameters['zoneId'] == null) {
            throw new runtime.RequiredError(
                'zoneId',
                'Required parameter "zoneId" was null or undefined when calling hazardZoneControllerDeleteVAlpha().',
            );
        }

        const queryParameters: any = {};
        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request(
            {
                path: `/api/v-alpha/einsatz/{einsatzId}/hazard-zones/{zoneId}`
                    .replace(`{${'einsatzId'}}`, encodeURIComponent(String(requestParameters['einsatzId'])))
                    .replace(`{${'zoneId'}}`, encodeURIComponent(String(requestParameters['zoneId']))),
                method: 'DELETE',
                headers: headerParameters,
                query: queryParameters,
            },
            initOverrides,
        );

        return new runtime.VoidApiResponse(response);
    }

    async hazardZoneControllerDeleteVAlpha(
        requestParameters: HazardZoneControllerDeleteVAlphaRequest,
        initOverrides?: RequestInit | runtime.InitOverrideFunction,
    ): Promise<void> {
        await this.hazardZoneControllerDeleteVAlphaRaw(requestParameters, initOverrides);
    }
}
