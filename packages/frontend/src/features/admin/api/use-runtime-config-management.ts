import { api } from '@/shared';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { logger } from '@/shared/lib/logger';
import { ResponseError } from '@/shared';
import { getBaseUrl } from '@/shared/api/api';
import { fetchWithRefresh } from '@/shared/api/fetchWithRefresh';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_QUERY_KEYS } from './queries';

export interface RuntimeConfigEntry {
  key: string;
  value: string | null;
  source: 'default' | 'db' | 'env_override';
  sensitive: boolean;
}

export interface RuntimeConfigListResponse {
  entries: RuntimeConfigEntry[];
}

export interface ConfigDoctorResponse {
  dbAvailable: boolean;
  dbAvailabilityReasons: string[];
  missingRequiredKeys: string[];
  activeEnvOverrides: string[];
  legacyEnvFallbackKeys: string[];
  legacyEnvCleanupKeys: string[];
  decryptionErrors: string[];
  runtimeConfigCount: number;
  runtimeSecretCount: number;
}

export interface UpsertRuntimeConfigRequest {
  key: string;
  value: string;
  sensitive?: boolean;
  sourceHint?: string;
}

export interface MigrateLegacyRuntimeConfigRequest {
  keys?: string[];
  dryRun?: boolean;
}

export interface MigrateLegacyRuntimeConfigFailure {
  key: string;
  reason: string;
}

export interface MigrateLegacyRuntimeConfigSummary {
  requested: number;
  migrated: number;
  skipped: number;
  failed: number;
}

export interface MigrateLegacyRuntimeConfigResult {
  migratedKeys: string[];
  skippedKeys: string[];
  failedKeys: MigrateLegacyRuntimeConfigFailure[];
  summary: MigrateLegacyRuntimeConfigSummary;
}

type RawApiResponse = {
  raw: Response;
};

type ApiResponseWithValue = {
  value: () => Promise<unknown>;
};

type ApiMethod = (...args: unknown[]) => Promise<unknown>;

const isRuntimeApiMethodError = (error: unknown): boolean => {
  if (!(error instanceof TypeError)) {
    return false;
  }

  const message = `${error.message}`;
  return (
    message.includes('Cannot read properties of undefined') ||
    message.includes('Cannot read properties of null') ||
    message.includes('Cannot read property') ||
    message.includes('is not a function') ||
    message.includes('is not defined')
  );
};

const isGeneratedClientBindingError = (error: unknown, methodName: string): boolean => {
  if (isRuntimeApiMethodError(error)) {
    return true;
  }

  const candidates = new Set([methodName, `${methodName}Raw`]);
  const isType = error instanceof TypeError;
  const message = `${isType ? error.message : ((error as Error)?.message ?? '')}`;

  if (error instanceof TypeError) {
    return [...candidates].some((candidate) => message.includes(candidate));
  }

  return error instanceof Error && [...candidates].some((candidate) => message.includes(candidate));
};

const buildRuntimeConfigRequestUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const invokeRuntimeConfigEndpoint = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetchWithRefresh(buildRuntimeConfigRequestUrl(path), {
    ...init,
    headers: {
      ...((init?.headers as Record<string, string>) || {}),
      ...(init?.headers ? {} : {}),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ResponseError(response);
  }

  return (await response.json()) as T;
};

const invokeAdminApiMethod = async (method: ApiMethod | undefined, context: RuntimeConfigAdminApi, args: unknown[]): Promise<unknown> => {
  if (typeof method !== 'function') {
    return Promise.reject(new Error('API-Methode ist nicht verfügbar.'));
  }

  const boundMethod = method.bind(context);
  return boundMethod(...args);
};

const isObjectLike = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

const unwrapApiData = <T extends Record<string, unknown>>(payload: unknown): T | null => {
  if (!isObjectLike(payload)) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if ('data' in candidate && candidate.data && typeof candidate.data === 'object') {
    return candidate.data as T;
  }

  return candidate as T;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

const readApiResponsePayload = async (response: unknown): Promise<unknown> => {
  if (!isObjectLike(response)) {
    return response;
  }

  const responseWithRaw = response as RawApiResponse;
  if (responseWithRaw.raw instanceof Response) {
    return responseWithRaw.raw.json();
  }

  const responseWithValue = response as ApiResponseWithValue;
  if (typeof responseWithValue.value === 'function') {
    return responseWithValue.value();
  }

  return response;
};

const normalizeApiResponse = async <T>(response: unknown, parser: (payload: unknown) => T): Promise<T> => {
  const payload = await readApiResponsePayload(response);
  return parser(payload);
};

const normalizeRuntimeConfigEntry = (entry: unknown): RuntimeConfigEntry | null => {
  const data = unwrapApiData<Record<string, unknown>>(entry);
  if (!data) {
    return null;
  }

  const raw = data;
  const key = typeof raw.key === 'string' ? raw.key : '';

  if (!key) {
    return null;
  }

  const source = raw.source === 'db' || raw.source === 'env_override' ? raw.source : 'default';

  return {
    key,
    value: typeof raw.value === 'string' ? raw.value : raw.value === null ? null : null,
    source,
    sensitive: raw.sensitive === true,
  };
};

const normalizeRuntimeConfigListResponse = (payload: unknown): RuntimeConfigListResponse => {
  const data = unwrapApiData<Record<string, unknown>>(payload);
  const rawEntries = Array.isArray(data?.entries) ? data.entries : [];
  const entries = rawEntries.map((entry) => normalizeRuntimeConfigEntry(entry)).filter((entry): entry is RuntimeConfigEntry => entry !== null);

  return { entries };
};

const normalizeConfigDoctorResponse = (payload: unknown): ConfigDoctorResponse => {
  const data = unwrapApiData<Record<string, unknown>>(payload);

  return {
    dbAvailable: data?.dbAvailable === true,
    dbAvailabilityReasons: toStringArray(data?.dbAvailabilityReasons),
    missingRequiredKeys: toStringArray(data?.missingRequiredKeys),
    activeEnvOverrides: toStringArray(data?.activeEnvOverrides),
    legacyEnvFallbackKeys: toStringArray(data?.legacyEnvFallbackKeys),
    legacyEnvCleanupKeys: toStringArray(data?.legacyEnvCleanupKeys),
    decryptionErrors: toStringArray(data?.decryptionErrors),
    runtimeConfigCount: typeof data?.runtimeConfigCount === 'number' ? data.runtimeConfigCount : 0,
    runtimeSecretCount: typeof data?.runtimeSecretCount === 'number' ? data.runtimeSecretCount : 0,
  };
};

const normalizeMigrationResult = (payload: unknown): MigrateLegacyRuntimeConfigResult => {
  const data = unwrapApiData<Record<string, unknown>>(payload);

  return {
    migratedKeys: toStringArray(data?.migratedKeys),
    skippedKeys: toStringArray(data?.skippedKeys),
    failedKeys: Array.isArray(data?.failedKeys)
      ? data.failedKeys
          .map((entry) => {
            if (!entry || typeof entry !== 'object') {
              return null;
            }

            const raw = entry as Record<string, unknown>;
            const key = typeof raw.key === 'string' ? raw.key : '';
            const reason = typeof raw.reason === 'string' ? raw.reason : 'Unbekannter Fehler';

            if (!key) {
              return null;
            }

            return { key, reason };
          })
          .filter((entry): entry is MigrateLegacyRuntimeConfigFailure => entry !== null)
      : [],
    summary: {
      requested:
        typeof data?.summary === 'object' && data.summary !== null && typeof (data.summary as Record<string, unknown>).requested === 'number' ? (data.summary as Record<string, unknown>).requested : 0,
      migrated:
        typeof data?.summary === 'object' && data.summary !== null && typeof (data.summary as Record<string, unknown>).migrated === 'number' ? (data.summary as Record<string, unknown>).migrated : 0,
      skipped:
        typeof data?.summary === 'object' && data.summary !== null && typeof (data.summary as Record<string, unknown>).skipped === 'number' ? (data.summary as Record<string, unknown>).skipped : 0,
      failed: typeof data?.summary === 'object' && data.summary !== null && typeof (data.summary as Record<string, unknown>).failed === 'number' ? (data.summary as Record<string, unknown>).failed : 0,
    },
  };
};

type RuntimeConfigAdminApi = {
  adminRuntimeConfigControllerListRuntimeConfigVAlpha?: () => Promise<unknown>;
  adminRuntimeConfigControllerListRuntimeConfigVAlphaRaw?: () => Promise<unknown>;
  adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha?: (params: {
    key: string;
    upsertRuntimeConfigRequestDto: {
      value: string;
      sensitive?: boolean;
      sourceHint?: string;
    };
  }) => Promise<unknown>;
  adminRuntimeConfigControllerUpsertRuntimeConfigVAlphaRaw?: (params: {
    key: string;
    upsertRuntimeConfigRequestDto: {
      value: string;
      sensitive?: boolean;
      sourceHint?: string;
    };
  }) => Promise<unknown>;
  adminSecurityControllerGetConfigDoctorVAlpha?: () => Promise<unknown>;
  adminSecurityControllerGetConfigDoctorVAlphaRaw?: () => Promise<unknown>;
  adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha?: (params: {
    migrateLegacyRuntimeConfigRequestDto: {
      keys?: string[];
      dryRun?: boolean;
    };
  }) => Promise<unknown>;
  adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw?: (params: {
    migrateLegacyRuntimeConfigRequestDto: {
      keys?: string[];
      dryRun?: boolean;
    };
  }) => Promise<unknown>;
};

const getAdminRuntimeApi = (): RuntimeConfigAdminApi => {
  return api.admin() as RuntimeConfigAdminApi;
};

export interface RuntimeConfigApiCapabilities {
  list: boolean;
  upsert: boolean;
  configDoctor: boolean;
  migrateLegacy: boolean;
}

export const getRuntimeConfigApiCapabilities = (): RuntimeConfigApiCapabilities => {
  const runtimeApi = getAdminRuntimeApi();
  const hasRuntimeFallback = Boolean(getBaseUrl());

  return {
    list:
      typeof runtimeApi.adminRuntimeConfigControllerListRuntimeConfigVAlphaRaw === 'function' ||
      typeof runtimeApi.adminRuntimeConfigControllerListRuntimeConfigVAlpha === 'function' ||
      hasRuntimeFallback,
    upsert:
      typeof runtimeApi.adminRuntimeConfigControllerUpsertRuntimeConfigVAlphaRaw === 'function' ||
      typeof runtimeApi.adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha === 'function' ||
      hasRuntimeFallback,
    configDoctor:
      typeof runtimeApi.adminSecurityControllerGetConfigDoctorVAlphaRaw === 'function' || typeof runtimeApi.adminSecurityControllerGetConfigDoctorVAlpha === 'function' || hasRuntimeFallback,
    migrateLegacy:
      typeof runtimeApi.adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw === 'function' ||
      typeof runtimeApi.adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha === 'function' ||
      hasRuntimeFallback,
  };
};

const invokeRuntimeConfigList = async (): Promise<RuntimeConfigListResponse> => {
  const runtimeApi = getAdminRuntimeApi();
  let response: unknown;

  if (typeof runtimeApi.adminRuntimeConfigControllerListRuntimeConfigVAlphaRaw === 'function') {
    try {
      response = await invokeAdminApiMethod(runtimeApi.adminRuntimeConfigControllerListRuntimeConfigVAlphaRaw, runtimeApi, []);
      if (response !== undefined && response !== null) {
        return normalizeApiResponse(response, normalizeRuntimeConfigListResponse);
      }
    } catch (error) {
      if (!isGeneratedClientBindingError(error, 'adminRuntimeConfigControllerListRuntimeConfigVAlpha')) {
        throw error;
      }
      // fallback zum direkten fetch
    }
  }

  if (typeof runtimeApi.adminRuntimeConfigControllerListRuntimeConfigVAlpha === 'function') {
    try {
      response = await invokeAdminApiMethod(runtimeApi.adminRuntimeConfigControllerListRuntimeConfigVAlpha, runtimeApi, []);
      if (response !== undefined && response !== null) {
        return normalizeApiResponse(response, normalizeRuntimeConfigListResponse);
      }
    } catch (error) {
      if (!isGeneratedClientBindingError(error, 'adminRuntimeConfigControllerListRuntimeConfigVAlpha')) {
        throw error;
      }
      // fallback zum direkten fetch
    }
  }

  const fallbackResponse = await invokeRuntimeConfigEndpoint<{
    data: {
      entries: Array<{
        key: string;
        value: string | null;
        source: 'default' | 'db' | 'env_override';
        sensitive: boolean;
      }>;
    };
  }>('/api/v-alpha/admin/runtime-config', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  return normalizeRuntimeConfigListResponse(fallbackResponse);
};

const invokeConfigDoctor = async (): Promise<ConfigDoctorResponse> => {
  const runtimeApi = getAdminRuntimeApi();
  let response: unknown;

  if (typeof runtimeApi.adminSecurityControllerGetConfigDoctorVAlphaRaw === 'function') {
    try {
      response = await invokeAdminApiMethod(runtimeApi.adminSecurityControllerGetConfigDoctorVAlphaRaw, runtimeApi, []);
      if (response !== undefined && response !== null) {
        return normalizeApiResponse(response, normalizeConfigDoctorResponse);
      }
    } catch (error) {
      if (!isGeneratedClientBindingError(error, 'adminSecurityControllerGetConfigDoctorVAlpha')) {
        throw error;
      }
      // fallback zum direkten fetch
    }
  }

  if (typeof runtimeApi.adminSecurityControllerGetConfigDoctorVAlpha === 'function') {
    try {
      response = await invokeAdminApiMethod(runtimeApi.adminSecurityControllerGetConfigDoctorVAlpha, runtimeApi, []);
      if (response !== undefined && response !== null) {
        return normalizeApiResponse(response, normalizeConfigDoctorResponse);
      }
    } catch (error) {
      if (!isGeneratedClientBindingError(error, 'adminSecurityControllerGetConfigDoctorVAlpha')) {
        throw error;
      }
      // fallback zum direkten fetch
    }
  }

  const fallbackResponse = await invokeRuntimeConfigEndpoint<{
    data: {
      dbAvailable: boolean;
      dbAvailabilityReasons: string[];
      missingRequiredKeys: string[];
      activeEnvOverrides: string[];
      legacyEnvFallbackKeys: string[];
      legacyEnvCleanupKeys: string[];
      decryptionErrors: string[];
      runtimeConfigCount: number;
      runtimeSecretCount: number;
    };
  }>('/api/v-alpha/admin/security/doctor', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  return normalizeConfigDoctorResponse(fallbackResponse);
};

const invokeUpsertRuntimeConfig = async (input: UpsertRuntimeConfigRequest): Promise<RuntimeConfigEntry> => {
  const runtimeApi = getAdminRuntimeApi();

  let response: unknown;

  if (typeof runtimeApi.adminRuntimeConfigControllerUpsertRuntimeConfigVAlphaRaw === 'function') {
    response = await invokeAdminApiMethod(runtimeApi.adminRuntimeConfigControllerUpsertRuntimeConfigVAlphaRaw, runtimeApi, [
      {
        key: input.key,
        upsertRuntimeConfigRequestDto: {
          value: input.value,
          sensitive: input.sensitive,
          sourceHint: input.sourceHint,
        },
      },
    ]).catch((error) => {
      if (isGeneratedClientBindingError(error, 'adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha')) {
        response = null;
        return;
      }
      throw error;
    });
    if (response === undefined) {
      response = null;
    }
    if (response === null) {
      // Fallback to fetch path below
    }
  } else if (typeof runtimeApi.adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha === 'function') {
    response = await invokeAdminApiMethod(runtimeApi.adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha, runtimeApi, [
      {
        key: input.key,
        upsertRuntimeConfigRequestDto: {
          value: input.value,
          sensitive: input.sensitive,
          sourceHint: input.sourceHint,
        },
      },
    ]).catch((error) => {
      if (isGeneratedClientBindingError(error, 'adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha')) {
        response = null;
        return;
      }
      throw error;
    });
    if (response === undefined) {
      response = null;
    }
    if (response === null) {
      // Fallback to fetch path below
    }
  } else {
    response = null;
  }

  if (response === null) {
    const requestPayload = {
      value: input.value,
      sensitive: input.sensitive,
      sourceHint: input.sourceHint,
    };

    const endpointResponse = await invokeRuntimeConfigEndpoint<{
      data: {
        key: string;
        value: string | null;
        source: 'default' | 'db' | 'env_override';
        sensitive: boolean;
      };
    }>(`/api/v-alpha/admin/runtime-config/${encodeURIComponent(input.key)}`, {
      method: 'PUT',
      body: JSON.stringify(requestPayload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    response = endpointResponse;
  }

  const normalized = await normalizeApiResponse(response, normalizeRuntimeConfigEntry);

  if (!normalized) {
    throw new Error('Ungültige API-Antwort beim Speichern der Runtime-Konfiguration.');
  }

  return normalized;
};

const invokeMigrateLegacyRuntimeConfig = async (input: MigrateLegacyRuntimeConfigRequest): Promise<MigrateLegacyRuntimeConfigResult> => {
  const runtimeApi = getAdminRuntimeApi();
  let response: unknown = null;

  if (typeof runtimeApi.adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw === 'function') {
    try {
      response = await invokeAdminApiMethod(runtimeApi.adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw, runtimeApi, [
        {
          migrateLegacyRuntimeConfigRequestDto: {
            keys: input.keys,
            dryRun: input.dryRun,
          },
        },
      ]);
      if (response !== undefined && response !== null) {
        return normalizeApiResponse(response, normalizeMigrationResult);
      }
    } catch (error) {
      if (!isGeneratedClientBindingError(error, 'adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlphaRaw')) {
        throw error;
      }
      response = null;
    }
  }

  if (typeof runtimeApi.adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha === 'function') {
    try {
      response = await invokeAdminApiMethod(runtimeApi.adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha, runtimeApi, [
        {
          migrateLegacyRuntimeConfigRequestDto: {
            keys: input.keys,
            dryRun: input.dryRun,
          },
        },
      ]);
      if (response === undefined) {
        response = null;
      }
    } catch (error) {
      if (!isGeneratedClientBindingError(error, 'adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha')) {
        throw error;
      }

      response = null;
    }
  }

  if (response === null) {
    const responsePayload = await invokeRuntimeConfigEndpoint<{
      data: MigrateLegacyRuntimeConfigResult;
    }>('/api/v-alpha/admin/runtime-config/migrate-legacy', {
      method: 'POST',
      body: JSON.stringify({
        keys: input.keys,
        dryRun: input.dryRun,
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    return normalizeMigrationResult(responsePayload);
  }

  return normalizeApiResponse(response, normalizeMigrationResult);
};

export const useRuntimeConfigList = () => {
  const capabilities = getRuntimeConfigApiCapabilities();

  return useQuery<RuntimeConfigListResponse, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.runtimeConfig.list(),
    enabled: capabilities.list,
    queryFn: () => invokeRuntimeConfigList(),
    refetchInterval: 30000,
  });
};

export const useConfigDoctor = () => {
  const capabilities = getRuntimeConfigApiCapabilities();

  return useQuery<ConfigDoctorResponse, ResponseError>({
    queryKey: ADMIN_QUERY_KEYS.security.doctor(),
    enabled: capabilities.configDoctor,
    queryFn: () => invokeConfigDoctor(),
    refetchInterval: 30000,
  });
};

export const useUpsertRuntimeConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<RuntimeConfigEntry, ResponseError, UpsertRuntimeConfigRequest>({
    mutationFn: async (input) => invokeUpsertRuntimeConfig(input),
    onSuccess: async () => {
      toast.success('Runtime-Konfiguration gespeichert');

      await Promise.all([queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.runtimeConfig.all() }), queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.security.all() })]);
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Runtime-Konfiguration konnte nicht gespeichert werden.', 'upsertRuntimeConfig');
      logger.error('Failed to upsert runtime config', error);
      toast.error('Speichern fehlgeschlagen', { description: message });
    },
  });
};

export const useMigrateLegacyRuntimeConfig = () => {
  const queryClient = useQueryClient();

  return useMutation<MigrateLegacyRuntimeConfigResult, ResponseError, MigrateLegacyRuntimeConfigRequest>({
    mutationFn: async (input) => invokeMigrateLegacyRuntimeConfig(input),
    onSuccess: async (_data, variables) => {
      if (variables.dryRun) {
        toast.success('Migrationstest erfolgreich abgeschlossen');
      } else {
        toast.success('Legacy-ENV-Migration gestartet');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.runtimeConfig.all() }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.runtimeConfig.migration.all() }),
        queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.security.all() }),
      ]);
    },
    onError: async (error) => {
      const message = await getApiErrorMessage(error, 'Legacy-ENV-Migration konnte nicht ausgeführt werden.', 'migrateLegacyRuntimeConfig');
      logger.error('Failed to migrate legacy runtime config', error);
      toast.error('Migration fehlgeschlagen', { description: message });
    },
  });
};

export const useRuntimeConfigManagement = () => {
  return {
    useList: useRuntimeConfigList,
    useDoctor: useConfigDoctor,
    useUpsert: useUpsertRuntimeConfig,
    useMigrateLegacy: useMigrateLegacyRuntimeConfig,
  };
};
