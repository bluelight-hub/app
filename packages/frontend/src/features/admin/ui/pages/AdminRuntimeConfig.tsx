import {
  getRuntimeConfigApiCapabilities,
  type RuntimeConfigEntry,
  useConfigDoctor,
  useMigrateLegacyRuntimeConfig,
  useRuntimeConfigList,
  useUpsertRuntimeConfig,
} from '@/features/admin/api/use-runtime-config-management';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Select } from '@/shared/ui/atoms/select.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { AdminDashboardLayout } from '@/shared/ui/templates/AdminDashboardLayout';
import { useMemo, useState } from 'react';
import { PiArrowsClockwise, PiFloppyDisk, PiMagnifyingGlass } from 'react-icons/pi';
import { toast } from 'sonner';

type SourceFilter = 'all' | RuntimeConfigEntry['source'];
type SensitivityFilter = 'all' | 'sensitive' | 'plain';

const REQUIRED_RUNTIME_KEYS = ['APP_URL', 'FRONTEND_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_JWT_SECRET'] as const;

const ENV_OVERRIDE_ALLOWLIST = [
  'LOG_LEVEL',
  'ERROR_HANDLING_ENABLE_ADVANCED_RETRY',
  'ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION',
  'ERROR_HANDLING_ENABLE_METRICS',
  'ERROR_HANDLING_ENABLE_CIRCUIT_BREAKER',
  'ERROR_HANDLING_ENABLE_RATE_LIMITING',
] as const;

const SOURCE_META: Record<RuntimeConfigEntry['source'], { label: string; description: string; variant: 'default' | 'success' | 'warning' }> = {
  db: {
    label: 'DB',
    description: 'Der Wert kommt aus der Runtime-Konfiguration in der Datenbank (`app_config`/`app_config_secret`).',
    variant: 'success',
  },
  env_override: {
    label: 'ENV Override',
    description: 'Der Wert wird durch eine erlaubte ENV-Override-Key-Variable (Allowlist) aktiv übersteuert.',
    variant: 'warning',
  },
  default: {
    label: 'Default',
    description: 'Kein DB-/Override-Treffer. Der Wert kommt aus dem Code-Default oder dem Legacy-ENV-Fallback.',
    variant: 'default',
  },
};

const codeClassName = 'rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200';

export function AdminRuntimeConfig() {
  const capabilities = getRuntimeConfigApiCapabilities();
  const runtimeConfigQuery = useRuntimeConfigList();
  const doctorQuery = useConfigDoctor();
  const upsertMutation = useUpsertRuntimeConfig();
  const migrateLegacyMutation = useMigrateLegacyRuntimeConfig();

  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sensitivityFilter, setSensitivityFilter] = useState<SensitivityFilter>('all');

  const entries = useMemo(() => runtimeConfigQuery.data?.entries ?? [], [runtimeConfigQuery.data?.entries]);
  const entriesByKey = useMemo(() => new Map(entries.map((entry) => [entry.key, entry])), [entries]);
  const doctorData = doctorQuery.data;
  const missingRequiredKeys = doctorData?.missingRequiredKeys ?? [];
  const activeEnvOverrides = doctorData?.activeEnvOverrides ?? [];
  const legacyEnvFallbackKeys = doctorData?.legacyEnvFallbackKeys ?? [];
  const legacyEnvCleanupKeys = doctorData?.legacyEnvCleanupKeys ?? [];
  const decryptionErrors = doctorData?.decryptionErrors ?? [];
  const dbAvailabilityReasons = doctorData?.dbAvailabilityReasons ?? [];
  const doctorErrorMessage = doctorQuery.error instanceof Error ? doctorQuery.error.message : undefined;
  const hasDbIssues = !doctorQuery.isLoading && !doctorQuery.isError && doctorData ? !doctorData.dbAvailable : false;

  const canMigrateLegacy = capabilities.migrateLegacy && !hasDbIssues;

  const dbStatus = doctorQuery.isLoading
    ? { label: 'Wird geprüft…', variant: 'info' as const }
    : doctorQuery.isError
      ? { label: 'Config-Doctor fehlgeschlagen', variant: 'error' as const }
      : doctorData?.dbAvailable
        ? { label: 'DB verfügbar', variant: 'success' as const }
        : {
            label: dbAvailabilityReasons.length > 0 ? 'DB nicht initialisiert' : 'DB nicht verfügbar',
            variant: 'warning' as const,
          };

  const filteredEntries = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return entries.filter((entry) => {
      if (normalizedSearchTerm && !entry.key.toLowerCase().includes(normalizedSearchTerm)) {
        return false;
      }

      if (sourceFilter !== 'all' && entry.source !== sourceFilter) {
        return false;
      }

      if (sensitivityFilter === 'sensitive' && !entry.sensitive) {
        return false;
      }

      if (sensitivityFilter === 'plain' && entry.sensitive) {
        return false;
      }

      return true;
    });
  }, [entries, searchTerm, sensitivityFilter, sourceFilter]);

  const missingMethods = useMemo(() => {
    const missing: string[] = [];

    if (!capabilities.list) {
      missing.push('adminRuntimeConfigControllerListRuntimeConfigVAlpha');
    }
    if (!capabilities.upsert) {
      missing.push('adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha');
    }
    if (!capabilities.configDoctor) {
      missing.push('adminSecurityControllerGetConfigDoctorVAlpha');
    }
    if (!capabilities.migrateLegacy) {
      missing.push('adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha');
    }

    return missing;
  }, [capabilities.configDoctor, capabilities.list, capabilities.migrateLegacy, capabilities.upsert]);

  const handleValueChange = (key: string, value: string) => {
    setDraftValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const clearDraftValue = (key: string) => {
    setDraftValues((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const handleMigrateAllLegacyKeys = () => {
    if (hasDbIssues) {
      toast.error('Migration nicht möglich, solange die Runtime-DB nicht verfügbar ist.', {
        description: dbAvailabilityReasons.length > 0 ? dbAvailabilityReasons.join(' ') : 'Bitte prüfe die DB-Verfügbarkeit im Config-Doctor.',
      });
      return;
    }

    if (legacyEnvFallbackKeys.length === 0) {
      toast.info('Keine Legacy-ENV-Fallbacks zum Migrieren vorhanden.');
      return;
    }

    if (!capabilities.migrateLegacy) {
      toast.error('Backend-Client unterstützt Migration noch nicht.');
      return;
    }

    migrateLegacyMutation.mutate(
      { keys: legacyEnvFallbackKeys },
      {
        onSuccess: (result) => {
          if (result.failedKeys.length > 0) {
            toast.warning(`Migration abgeschlossen: ${result.summary.migrated} migriert, ${result.summary.failed} fehlgeschlagen.`);
            return;
          }

          toast.success(`Migration abgeschlossen: ${result.summary.migrated} Schlüssel migriert.`);
        },
      },
    );
  };

  const hasPendingValueForEntry = (entry: RuntimeConfigEntry): boolean => {
    if (entry.sensitive) {
      return Boolean(draftValues[entry.key]?.trim());
    }

    if (!(entry.key in draftValues)) {
      return false;
    }

    return (draftValues[entry.key] ?? '') !== (entry.value ?? '');
  };

  const handleSave = (entry: RuntimeConfigEntry) => {
    const nextValue = entry.sensitive ? (draftValues[entry.key] ?? '').trim() : (draftValues[entry.key] ?? entry.value ?? '');

    if (entry.sensitive && nextValue.length === 0) {
      toast.error(`Bitte einen neuen Secret-Wert für ${entry.key} eingeben.`);
      return;
    }

    upsertMutation.mutate(
      {
        key: entry.key,
        value: nextValue,
        sensitive: entry.sensitive,
        sourceHint: 'ui',
      },
      {
        onSuccess: () => {
          clearDraftValue(entry.key);
        },
      },
    );
  };

  const handleMigrateLegacyKey = (key: string) => {
    if (hasDbIssues) {
      toast.error('Migration nicht möglich, solange die Runtime-DB nicht verfügbar ist.', {
        description: dbAvailabilityReasons.length > 0 ? dbAvailabilityReasons.join(' ') : 'Bitte prüfe die DB-Verfügbarkeit im Config-Doctor.',
      });
      return;
    }

    if (!capabilities.migrateLegacy) {
      toast.error('Backend-Client unterstützt Migration noch nicht.');
      return;
    }

    migrateLegacyMutation.mutate(
      { keys: [key] },
      {
        onSuccess: (result) => {
          if (result.failedKeys.length > 0) {
            toast.warning(`Migration abgeschlossen: ${result.summary.migrated} migriert, ${result.summary.failed} fehlgeschlagen.`);
            return;
          }

          toast.success(`Migration abgeschlossen: ${result.summary.migrated} Schlüssel migriert.`);
        },
      },
    );
  };

  return (
    <AdminDashboardLayout maxWidth="full">
      <div className="space-y-2">
        <Heading size="xl">Runtime-Konfiguration</Heading>
        <Text color="muted">Konfigurationen zentral verwalten, Herkunft nachvollziehen und Legacy-ENV-Schlüssel gezielt in die DB überführen.</Text>
      </div>

      {missingMethods.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/20">
          <Heading size="lg">API-Client aktualisieren</Heading>
          <Text size="sm" className="mt-1">
            Dein lokaler API-Client enthält die Runtime-Konfigurations-Endpoints noch nicht. Bitte führe im Projektroot <code>pnpm run generate-api</code> aus und starte danach das Frontend neu.
          </Text>
          <Text size="sm" color="muted" className="mt-2">
            Fehlende Methoden: {missingMethods.join(', ')}
          </Text>
        </section>
      )}

      <Card className="space-y-4" padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <Heading size="lg">Config-Doctor & Quellenmodell</Heading>
          <Badge variant={dbStatus.variant}>{dbStatus.label}</Badge>
        </div>

        <Text size="sm" color="muted">
          Alle Metriken stammen aus <code>GET /admin/security/doctor</code> und werden alle 30 Sekunden aktualisiert. So siehst du sofort, welche Keys noch aus Legacy-ENV kommen und welche bereits aus
          der Runtime-DB gelesen werden.
        </Text>

        {doctorQuery.isError && doctorErrorMessage && (
          <Text size="sm" className="text-red-600 dark:text-red-400">
            Config-Doctor konnte nicht geladen werden: {doctorErrorMessage}
          </Text>
        )}

        {hasDbIssues && dbAvailabilityReasons.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <Text size="sm" className="font-medium text-amber-900 dark:text-amber-200">
              Die Runtime-DB ist aktuell nicht nutzbar:
            </Text>
            <ul className="mt-1 list-disc pl-4">
              {dbAvailabilityReasons.map((reason) => (
                <li key={reason} className="text-amber-800 dark:text-amber-100">
                  <Text size="xs">{reason}</Text>
                </li>
              ))}
            </ul>
            <Text size="xs" className="mt-2 text-amber-900 dark:text-amber-200">
              Bitte zuerst Migrationen auf der Ziel-Datenbank ausführen und anschließend Backend & Frontend neu starten.
            </Text>
          </div>
        )}

        {doctorData ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Fehlende Pflichtkeys</Heading>
                <Badge variant={missingRequiredKeys.length === 0 ? 'success' : 'error'}>{missingRequiredKeys.length}</Badge>
              </div>
              <Text size="sm" color="muted" className="mt-2">
                Diese Keys müssen gesetzt sein, damit Security/Authentifizierung stabil läuft.
              </Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {(missingRequiredKeys.length > 0 ? missingRequiredKeys : REQUIRED_RUNTIME_KEYS).map((key) => (
                  <code key={key} className={codeClassName}>
                    {key}
                  </code>
                ))}
              </div>
              {missingRequiredKeys.length === 0 && (
                <Text size="xs" color="success" className="mt-2">
                  Alle Pflichtkeys sind aktuell vorhanden.
                </Text>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Aktive ENV-Overrides</Heading>
                <Badge variant={activeEnvOverrides.length === 0 ? 'success' : 'warning'}>{activeEnvOverrides.length}</Badge>
              </div>
              <Text size="sm" color="muted" className="mt-2">
                Nur Keys aus der Allowlist können DB-Werte per ENV übersteuern.
              </Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {(activeEnvOverrides.length > 0 ? activeEnvOverrides : ENV_OVERRIDE_ALLOWLIST).map((key) => (
                  <code key={key} className={codeClassName}>
                    {key}
                  </code>
                ))}
              </div>
              {activeEnvOverrides.length === 0 && (
                <Text size="xs" color="success" className="mt-2">
                  Aktuell ist kein Override aktiv.
                </Text>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Legacy-ENV-Klassen</Heading>
                <Badge variant={legacyEnvFallbackKeys.length + legacyEnvCleanupKeys.length === 0 ? 'success' : 'warning'}>
                  {(legacyEnvFallbackKeys.length + legacyEnvCleanupKeys.length).toString()}
                </Badge>
              </div>
              <Text size="sm" color="muted" className="mt-2">
                Aktuelle Einordnung bekannter Runtime-Keys.
              </Text>

              <div className="mt-3 space-y-3">
                <div>
                  <Text size="xs" className="mb-1 font-medium">
                    zu migrierende Alt-ENV-Fallbacks
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {(legacyEnvFallbackKeys.length > 0 ? legacyEnvFallbackKeys : ['keine']).map((key) => (
                      <code key={`fallback-${key}`} className={codeClassName}>
                        {key}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <Text size="xs" className="mb-1 font-medium">
                    ENV noch gesetzt nach Migration
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {(legacyEnvCleanupKeys.length > 0 ? legacyEnvCleanupKeys : ['keine']).map((key) => (
                      <code key={`cleanup-${key}`} className={codeClassName}>
                        {key}
                      </code>
                    ))}
                  </div>
                  {legacyEnvCleanupKeys.length > 0 && (
                    <Text size="xs" color="warning" className="mt-1">
                      Kann aus Deployment entfernt werden.
                    </Text>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Entschlüsselungsfehler</Heading>
                <Badge variant={decryptionErrors.length === 0 ? 'success' : 'error'}>{decryptionErrors.length}</Badge>
              </div>
              <Text size="sm" color="muted" className="mt-2">
                Fehler beim Entschlüsseln gespeicherter Secrets, z. B. bei falschem <code>MASTER_SECRET_KEY</code>.
              </Text>
              {decryptionErrors.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {decryptionErrors.map((error) => (
                    <Text key={error} size="xs" className="rounded bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950/20 dark:text-red-300">
                      {error}
                    </Text>
                  ))}
                </div>
              ) : (
                <Text size="xs" color="success" className="mt-2">
                  Alle gespeicherten Secrets sind entschlüsselbar.
                </Text>
              )}
            </div>
          </div>
        ) : doctorQuery.isLoading ? (
          <Text size="sm" color="muted">
            Config-Doctor lädt...
          </Text>
        ) : doctorQuery.isError ? (
          <Text size="sm" className="text-red-600 dark:text-red-400">
            Config-Doctor konnte nicht geladen werden.
          </Text>
        ) : (
          <Text size="sm" color="muted">
            Config-Doctor ist mit dem aktuellen API-Client nicht verfügbar.
          </Text>
        )}

        <div className="grid gap-3 rounded-lg border border-dashed border-gray-300 p-3 sm:grid-cols-3 dark:border-gray-700">
          {(['db', 'env_override', 'default'] as const).map((source) => (
            <div key={source} className="space-y-1">
              <Badge variant={SOURCE_META[source].variant}>{SOURCE_META[source].label}</Badge>
              <Text size="xs" color="muted">
                {SOURCE_META[source].description}
              </Text>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4" padding="md">
        <div className="flex items-center justify-between gap-3">
          <Heading size="lg">Legacy-ENV Migration</Heading>
          <Badge variant={legacyEnvFallbackKeys.length === 0 ? 'success' : 'warning'}>{legacyEnvFallbackKeys.length} offen</Badge>
        </div>
        <Text size="sm" color="muted">
          Hier übernimmst du Keys aus dem Legacy-ENV-Modell in die Runtime-DB. Das ist der sichere Weg, um ENV-basierte Laufzeitwerte dauerhaft im Backend zu persistieren.
        </Text>
        {legacyEnvCleanupKeys.length > 0 && (
          <Text size="sm" color="warning" className="rounded bg-amber-50 px-2 py-1 dark:bg-amber-950/20">
            Für diese Keys steht die Laufzeit weiterhin aus ENV zur Verfügung. Setze diese Werte nicht mehr im Deployment, sondern nur noch in der Runtime-DB.
          </Text>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            appearance="outline"
            onClick={handleMigrateAllLegacyKeys}
            loading={migrateLegacyMutation.isPending}
            disabled={!canMigrateLegacy || migrateLegacyMutation.isPending || legacyEnvFallbackKeys.length === 0}
          >
            <PiArrowsClockwise className="mr-2" />
            Alle Legacy-ENV-Fallbacks migrieren
          </Button>
        </div>

        {legacyEnvFallbackKeys.length === 0 ? (
          <Text size="sm" color="success">
            Keine Legacy-ENV-Fallbacks mehr vorhanden.
          </Text>
        ) : (
          <div className="space-y-3">
            {legacyEnvFallbackKeys.map((key) => {
              const entry = entriesByKey.get(key);
              const isSensitive = entry?.sensitive ?? false;

              return (
                <div key={key} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[220px,1fr,170px] md:items-center dark:border-gray-700">
                  <div className="space-y-1">
                    <Text className="font-medium">{key}</Text>
                    <Badge variant={isSensitive ? 'warning' : 'info'} size="sm">
                      {isSensitive ? 'Secret' : 'Konfiguration'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Text size="xs" color="muted">
                      {entry?.source === 'db' ? 'Wurde bereits aus der Runtime-DB geladen.' : 'Wird aktuell aus ENV-Fallback aufgelöst.'}
                    </Text>
                  </div>

                  <Button
                    size="sm"
                    appearance={entry?.source === 'db' ? 'outline' : 'warning'}
                    onClick={() => handleMigrateLegacyKey(key)}
                    loading={migrateLegacyMutation.isPending}
                    disabled={!canMigrateLegacy || migrateLegacyMutation.isPending}
                  >
                    <PiFloppyDisk className="mr-2" />
                    Migrieren
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-4" padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading size="lg">Runtime-Keys verwalten</Heading>
          <Badge variant="info">{filteredEntries.length} sichtbar</Badge>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr),220px,220px,auto]">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nach Key suchen (z. B. JWT, URL, CACHE)"
            leftIcon={<PiMagnifyingGlass className="h-4 w-4" />}
          />

          <Select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            options={[
              { value: 'all', label: 'Alle Quellen' },
              { value: 'db', label: 'Nur DB' },
              { value: 'env_override', label: 'Nur ENV Override' },
              { value: 'default', label: 'Nur Default/Legacy' },
            ]}
          />

          <Select
            value={sensitivityFilter}
            onChange={(event) => setSensitivityFilter(event.target.value as SensitivityFilter)}
            options={[
              { value: 'all', label: 'Alle Typen' },
              { value: 'sensitive', label: 'Nur Secrets' },
              { value: 'plain', label: 'Nur Klartext-Config' },
            ]}
          />

          <Button appearance="outline" size="sm" onClick={() => void runtimeConfigQuery.refetch()} disabled={!capabilities.list}>
            <PiArrowsClockwise className="mr-2" />
            Aktualisieren
          </Button>
        </div>

        {!capabilities.list && (
          <Text size="sm" color="muted">
            Runtime-Keys sind mit dem aktuellen API-Client nicht verfügbar.
          </Text>
        )}

        {runtimeConfigQuery.isLoading && (
          <Text size="sm" color="muted">
            Runtime-Konfiguration wird geladen...
          </Text>
        )}

        {runtimeConfigQuery.isError && (
          <Text size="sm" className="text-red-600 dark:text-red-400">
            Fehler beim Laden der Runtime-Konfiguration.
          </Text>
        )}

        {capabilities.list && !runtimeConfigQuery.isLoading && filteredEntries.length === 0 && (
          <Text size="sm" color="muted">
            Keine Keys für den aktuellen Filter gefunden.
          </Text>
        )}

        {filteredEntries.length > 0 && (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const sourceMeta = SOURCE_META[entry.source];
              const inputValue = entry.sensitive ? (draftValues[entry.key] ?? '') : (draftValues[entry.key] ?? entry.value ?? '');
              const hasPendingValue = hasPendingValueForEntry(entry);

              return (
                <div key={entry.key} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[260px,1fr,180px] md:items-center dark:border-gray-700">
                  <div className="space-y-1">
                    <Text className="font-medium">{entry.key}</Text>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={entry.sensitive ? 'warning' : 'info'} size="sm">
                        {entry.sensitive ? 'Secret' : 'Config'}
                      </Badge>
                      <Badge variant={sourceMeta.variant} size="sm">
                        {sourceMeta.label}
                      </Badge>
                    </div>
                    <Text size="xs" color="muted">
                      {sourceMeta.description}
                    </Text>
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={inputValue}
                      onChange={(event) => handleValueChange(entry.key, event.target.value)}
                      placeholder={entry.sensitive ? 'Neuen Secret-Wert eingeben' : 'Wert eingeben'}
                      type={entry.sensitive ? 'password' : 'text'}
                    />
                    <Text size="xs" color="muted">
                      {entry.sensitive ? (entry.value ? 'Aktuell: Secret gesetzt (maskiert)' : 'Aktuell: kein Secret gesetzt') : `Aktuell: ${entry.value ?? 'nicht gesetzt'}`}
                    </Text>
                  </div>

                  <Button size="sm" onClick={() => handleSave(entry)} loading={upsertMutation.isPending} disabled={!capabilities.upsert || upsertMutation.isPending || !hasPendingValue}>
                    <PiFloppyDisk className="mr-2" />
                    Speichern
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AdminDashboardLayout>
  );
}
