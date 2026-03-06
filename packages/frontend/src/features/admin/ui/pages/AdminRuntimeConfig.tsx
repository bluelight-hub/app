import {
  getRuntimeConfigApiCapabilities,
  type RuntimeConfigEntry,
  useConfigDoctor,
  useDeleteRuntimeConfig,
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
import { PiArrowsClockwise, PiFloppyDisk, PiMagnifyingGlass, PiTrash } from 'react-icons/pi';
import { toast } from 'sonner';

type SourceFilter = 'all' | RuntimeConfigEntry['source'];

const REQUIRED_SECRET_KEYS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ADMIN_JWT_SECRET', 'INTEGRATION_ENCRYPTION_KEY'] as const;

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
    description: 'Der Wert kommt aus der zentralen Secret-Datenbank.',
    variant: 'success',
  },
  env_override: {
    label: 'ENV Override',
    description: 'Der Wert wird aktuell durch einen erlaubten ENV-Override übersteuert.',
    variant: 'warning',
  },
  default: {
    label: 'Legacy/Default',
    description: 'Kein DB-Treffer. Der Wert kommt aktuell aus dem Legacy-Fallback oder einem Code-Default.',
    variant: 'default',
  },
};

const codeClassName = 'rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200';

function SecretCard({
  entry,
  draftValue,
  onChange,
  onSave,
  onDelete,
  saveDisabled,
  deleteDisabled,
  saveLoading,
  deleteLoading,
}: {
  entry: RuntimeConfigEntry;
  draftValue: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  saveDisabled: boolean;
  deleteDisabled: boolean;
  saveLoading: boolean;
  deleteLoading: boolean;
}) {
  const sourceMeta = SOURCE_META[entry.source];

  return (
    <div className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[260px,1fr,220px] md:items-center dark:border-gray-700">
      <div className="space-y-1">
        <Text className="font-medium">{entry.key}</Text>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={entry.category === 'internal_secret' ? 'warning' : 'info'} size="sm">
            {entry.category === 'internal_secret' ? 'Internes Secret' : 'Externes Secret'}
          </Badge>
          <Badge variant={sourceMeta.variant} size="sm">
            {sourceMeta.label}
          </Badge>
        </div>
        <Text size="xs" color="muted">
          {sourceMeta.description}
        </Text>
      </div>

      {entry.editable ? (
        <div className="space-y-2">
          <Input value={draftValue} onChange={(event) => onChange(event.target.value)} placeholder="Neuen Secret-Wert eingeben" type="password" />
          <Text size="xs" color="muted">
            {entry.configured ? 'Aktuell: Secret gesetzt (maskiert)' : 'Aktuell: kein Secret gesetzt'}
          </Text>
        </div>
      ) : (
        <div className="space-y-1 rounded-md bg-gray-50 p-3 dark:bg-gray-900/40">
          <Text size="sm" className="font-medium">
            {entry.configured ? 'Secret konfiguriert' : 'Secret fehlt'}
          </Text>
          <Text size="xs" color="muted">
            Dieses Secret ist intern und in der UI absichtlich nicht bearbeitbar.
          </Text>
        </div>
      )}

      <div className="flex gap-2">
        {entry.editable ? (
          <>
            <Button size="sm" onClick={onSave} loading={saveLoading} disabled={saveDisabled}>
              <PiFloppyDisk className="mr-2" />
              Speichern
            </Button>
            <Button size="sm" appearance="outline" onClick={onDelete} loading={deleteLoading} disabled={deleteDisabled}>
              <PiTrash className="mr-2" />
              Löschen
            </Button>
          </>
        ) : (
          <Badge variant={entry.configured ? 'success' : 'error'}>{entry.configured ? 'Bereit' : 'Fehlt'}</Badge>
        )}
      </div>
    </div>
  );
}

function RuntimeConfigCard({
  entry,
  draftValue,
  onChange,
  onSave,
  onDelete,
  saveDisabled,
  deleteDisabled,
  saveLoading,
  deleteLoading,
}: {
  entry: RuntimeConfigEntry;
  draftValue: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  saveDisabled: boolean;
  deleteDisabled: boolean;
  saveLoading: boolean;
  deleteLoading: boolean;
}) {
  const sourceMeta = SOURCE_META[entry.source];

  return (
    <div className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[260px,1fr,220px] md:items-center dark:border-gray-700">
      <div className="space-y-1">
        <Text className="font-medium">{entry.key}</Text>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" size="sm">
            Runtime-Config
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
        <Input value={draftValue} onChange={(event) => onChange(event.target.value)} placeholder="Wert eingeben" type="text" />
        <Text size="xs" color="muted">
          Aktuell: {entry.value ?? 'nicht gesetzt'}
        </Text>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={saveLoading} disabled={saveDisabled}>
          <PiFloppyDisk className="mr-2" />
          Speichern
        </Button>
        <Button size="sm" appearance="outline" onClick={onDelete} loading={deleteLoading} disabled={deleteDisabled}>
          <PiTrash className="mr-2" />
          Löschen
        </Button>
      </div>
    </div>
  );
}

export function AdminRuntimeConfig() {
  const capabilities = getRuntimeConfigApiCapabilities();
  const runtimeConfigQuery = useRuntimeConfigList();
  const doctorQuery = useConfigDoctor();
  const upsertMutation = useUpsertRuntimeConfig();
  const deleteMutation = useDeleteRuntimeConfig();
  const migrateLegacyMutation = useMigrateLegacyRuntimeConfig();

  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const allEntries = useMemo(() => runtimeConfigQuery.data?.entries ?? [], [runtimeConfigQuery.data?.entries]);
  const allSecretEntries = useMemo(() => allEntries.filter((entry) => entry.sensitive), [allEntries]);
  const allRuntimeEntries = useMemo(() => allEntries.filter((entry) => !entry.sensitive), [allEntries]);
  const entriesByKey = useMemo(() => new Map(allSecretEntries.map((entry) => [entry.key, entry])), [allSecretEntries]);
  const doctorData = doctorQuery.data;
  const missingRequiredKeys = doctorData?.missingRequiredKeys.filter((key) => REQUIRED_SECRET_KEYS.includes(key as (typeof REQUIRED_SECRET_KEYS)[number])) ?? [];
  const activeEnvOverrides = doctorData?.activeEnvOverrides ?? [];
  const legacyEnvFallbackKeys = doctorData?.legacyEnvFallbackKeys.filter((key) => entriesByKey.has(key)) ?? [];
  const legacyEnvCleanupKeys = doctorData?.legacyEnvCleanupKeys.filter((key) => entriesByKey.has(key)) ?? [];
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

    return allSecretEntries.filter((entry) => {
      if (normalizedSearchTerm && !entry.key.toLowerCase().includes(normalizedSearchTerm)) {
        return false;
      }

      if (sourceFilter !== 'all' && entry.source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [allSecretEntries, searchTerm, sourceFilter]);

  const internalSecrets = useMemo(() => filteredEntries.filter((entry) => entry.category === 'internal_secret'), [filteredEntries]);
  const externalSecrets = useMemo(() => filteredEntries.filter((entry) => entry.category === 'external_secret'), [filteredEntries]);
  const filteredRuntimeEntries = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return allRuntimeEntries.filter((entry) => {
      if (normalizedSearchTerm && !entry.key.toLowerCase().includes(normalizedSearchTerm)) {
        return false;
      }

      if (sourceFilter !== 'all' && entry.source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [allRuntimeEntries, searchTerm, sourceFilter]);

  const missingMethods = useMemo(() => {
    const missing: string[] = [];

    if (!capabilities.list) {
      missing.push('adminRuntimeConfigControllerListRuntimeConfigVAlpha');
    }
    if (!capabilities.upsert) {
      missing.push('adminRuntimeConfigControllerUpsertRuntimeConfigVAlpha');
    }
    if (!capabilities.delete) {
      missing.push('adminRuntimeConfigControllerDeleteRuntimeConfigVAlpha');
    }
    if (!capabilities.configDoctor) {
      missing.push('adminSecurityControllerGetConfigDoctorVAlpha');
    }
    if (!capabilities.migrateLegacy) {
      missing.push('adminRuntimeConfigControllerMigrateLegacyRuntimeConfigVAlpha');
    }

    return missing;
  }, [capabilities]);

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
      toast.error('Migration nicht möglich, solange die Secret-DB nicht verfügbar ist.', {
        description: dbAvailabilityReasons.length > 0 ? dbAvailabilityReasons.join(' ') : 'Bitte prüfe die DB-Verfügbarkeit im Config-Doctor.',
      });
      return;
    }

    if (legacyEnvFallbackKeys.length === 0) {
      toast.info('Keine Legacy-ENV-Secrets zum Migrieren vorhanden.');
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

          toast.success(`Migration abgeschlossen: ${result.summary.migrated} Secrets migriert.`);
        },
      },
    );
  };

  const handleMigrateLegacyKey = (key: string) => {
    if (hasDbIssues) {
      toast.error('Migration nicht möglich, solange die Secret-DB nicht verfügbar ist.', {
        description: dbAvailabilityReasons.length > 0 ? dbAvailabilityReasons.join(' ') : 'Bitte prüfe die DB-Verfügbarkeit im Config-Doctor.',
      });
      return;
    }

    migrateLegacyMutation.mutate({ keys: [key] });
  };

  const handleSave = (entry: RuntimeConfigEntry) => {
    const nextValue = (draftValues[entry.key] ?? '').trim();
    if (!nextValue) {
      toast.error(`Bitte einen neuen Wert für ${entry.key} eingeben.`);
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
        onSuccess: () => clearDraftValue(entry.key),
      },
    );
  };

  const handleDelete = (entry: RuntimeConfigEntry) => {
    if (!entry.editable) {
      toast.error(`${entry.key} ist schreibgeschützt.`);
      return;
    }

    deleteMutation.mutate({ key: entry.key });
  };

  const hasPendingValueForEntry = (entry: RuntimeConfigEntry): boolean => {
    return Boolean(draftValues[entry.key]?.trim());
  };

  return (
    <AdminDashboardLayout maxWidth="full">
      <div className="space-y-2">
        <Heading size="xl">Konfiguration & Secrets</Heading>
        <Text color="muted">Normale Runtime-Konfiguration und zentrale App-Secrets gemeinsam verwalten, Status prüfen und Legacy-ENV-Secrets gezielt in die DB überführen.</Text>
      </div>

      {missingMethods.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/20">
          <Heading size="lg">API-Client aktualisieren</Heading>
          <Text size="sm" className="mt-1">
            Dein lokaler API-Client enthält die Secret-Verwaltungs-Endpoints noch nicht. Bitte führe im Projektroot <code>pnpm run generate-api</code> aus und starte danach das Frontend neu.
          </Text>
          <Text size="sm" color="muted" className="mt-2">
            Fehlende Methoden: {missingMethods.join(', ')}
          </Text>
        </section>
      )}

      <Card className="space-y-4" padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <Heading size="lg">Config-Doctor & Secret-Status</Heading>
          <Badge variant={dbStatus.variant}>{dbStatus.label}</Badge>
        </div>

        {doctorQuery.isError && doctorErrorMessage && (
          <Text size="sm" className="text-red-600 dark:text-red-400">
            Config-Doctor konnte nicht geladen werden: {doctorErrorMessage}
          </Text>
        )}

        {hasDbIssues && dbAvailabilityReasons.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <Text size="sm" className="font-medium text-amber-900 dark:text-amber-200">
              Die Secret-DB ist aktuell nicht nutzbar:
            </Text>
            <ul className="mt-1 list-disc pl-4">
              {dbAvailabilityReasons.map((reason) => (
                <li key={reason} className="text-amber-800 dark:text-amber-100">
                  <Text size="xs">{reason}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}

        {doctorData ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Fehlende Pflicht-Secrets</Heading>
                <Badge variant={missingRequiredKeys.length === 0 ? 'success' : 'error'}>{missingRequiredKeys.length}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(missingRequiredKeys.length > 0 ? missingRequiredKeys : REQUIRED_SECRET_KEYS).map((key) => (
                  <code key={key} className={codeClassName}>
                    {key}
                  </code>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Aktive ENV-Overrides</Heading>
                <Badge variant={activeEnvOverrides.length === 0 ? 'success' : 'warning'}>{activeEnvOverrides.length}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(activeEnvOverrides.length > 0 ? activeEnvOverrides : ENV_OVERRIDE_ALLOWLIST).map((key) => (
                  <code key={key} className={codeClassName}>
                    {key}
                  </code>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Legacy-ENV Cleanup</Heading>
                <Badge variant={legacyEnvCleanupKeys.length === 0 ? 'success' : 'warning'}>{legacyEnvCleanupKeys.length}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(legacyEnvCleanupKeys.length > 0 ? legacyEnvCleanupKeys : ['keine']).map((key) => (
                  <code key={key} className={codeClassName}>
                    {key}
                  </code>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Heading size="md">Entschlüsselungsfehler</Heading>
                <Badge variant={decryptionErrors.length === 0 ? 'success' : 'error'}>{decryptionErrors.length}</Badge>
              </div>
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
                  Alle gespeicherten Secrets sind mit dem aktuellen <code>MASTER_SECRET</code> lesbar.
                </Text>
              )}
            </div>
          </div>
        ) : doctorQuery.isLoading ? (
          <Text size="sm" color="muted">
            Config-Doctor lädt...
          </Text>
        ) : (
          <Text size="sm" color="muted">
            Config-Doctor ist aktuell nicht verfügbar.
          </Text>
        )}
      </Card>

      <Card className="space-y-4" padding="md">
        <div className="flex items-center justify-between gap-3">
          <Heading size="lg">Legacy-ENV Migration</Heading>
          <Badge variant={legacyEnvFallbackKeys.length === 0 ? 'success' : 'warning'}>{legacyEnvFallbackKeys.length} offen</Badge>
        </div>
        <Text size="sm" color="muted">
          Migriere verbliebene Legacy-Secrets in die zentrale Secret-Datenbank. Nach erfolgreicher Migration müssen die alten ENV-Variablen aus dem Deployment entfernt werden.
        </Text>

        <div className="flex justify-end">
          <Button
            size="sm"
            appearance="outline"
            onClick={handleMigrateAllLegacyKeys}
            loading={migrateLegacyMutation.isPending}
            disabled={!canMigrateLegacy || migrateLegacyMutation.isPending || legacyEnvFallbackKeys.length === 0}
          >
            <PiArrowsClockwise className="mr-2" />
            Alle Legacy-Secrets migrieren
          </Button>
        </div>

        {legacyEnvFallbackKeys.length === 0 ? (
          <Text size="sm" color="success">
            Keine Legacy-ENV-Secrets mehr vorhanden.
          </Text>
        ) : (
          <div className="space-y-3">
            {legacyEnvFallbackKeys.map((key) => {
              const entry = entriesByKey.get(key);

              return (
                <div key={key} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[220px,1fr,170px] md:items-center dark:border-gray-700">
                  <div className="space-y-1">
                    <Text className="font-medium">{key}</Text>
                    <Badge variant={entry?.category === 'internal_secret' ? 'warning' : 'info'} size="sm">
                      {entry?.category === 'internal_secret' ? 'Internes Secret' : 'Externes Secret'}
                    </Badge>
                  </div>
                  <Text size="xs" color="muted">
                    {entry?.source === 'db' ? 'Wurde bereits aus der Secret-Datenbank geladen.' : 'Wird aktuell noch per Legacy-ENV aufgelöst.'}
                  </Text>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="md" className="space-y-2 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <Heading size="md">Runtime-Konfiguration</Heading>
            <Badge variant="default">{filteredRuntimeEntries.length}</Badge>
          </div>
          <Text size="sm" color="muted">
            Normale Laufzeitwerte wie URLs, Cache- oder Feature-Konfiguration. Diese Werte sind sichtbar und bearbeitbar.
          </Text>
        </Card>

        <Card padding="md" className="space-y-2 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <Heading size="md">Interne Secrets</Heading>
            <Badge variant="warning">{internalSecrets.length}</Badge>
          </div>
          <Text size="sm" color="muted">
            Systeminterne Secrets wie JWT- und Verschlüsselungs-Keys. Sichtbar nur als Status, nicht manuell bearbeitbar.
          </Text>
        </Card>

        <Card padding="md" className="space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <Heading size="md">Externe Secrets</Heading>
            <Badge variant="info">{externalSecrets.length}</Badge>
          </div>
          <Text size="sm" color="muted">
            Integrations-Secrets wie OAuth-Credentials. Maskiert sichtbar und bei Bedarf aktualisierbar oder löschbar.
          </Text>
        </Card>
      </div>

      <Card className="space-y-4" padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading size="lg">Filter & Suche</Heading>
          <Badge variant="info">{filteredRuntimeEntries.length + filteredEntries.length} sichtbar</Badge>
        </div>

        <Text size="sm" color="muted">
          Die Filter gelten gleichzeitig für Runtime-Konfiguration und Secrets. Die Ergebnisse erscheinen darunter in getrennten Bereichen.
        </Text>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr),220px,auto]">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Nach Key suchen (z. B. APP_URL, JWT, HIORG)"
            leftIcon={<PiMagnifyingGlass className="h-4 w-4" />}
          />
          <Select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            options={[
              { value: 'all', label: 'Alle Quellen' },
              { value: 'db', label: 'Nur DB' },
              { value: 'env_override', label: 'Nur ENV Override' },
              { value: 'default', label: 'Nur Legacy/Default' },
            ]}
          />
          <Button appearance="outline" size="sm" onClick={() => void runtimeConfigQuery.refetch()} disabled={!capabilities.list}>
            <PiArrowsClockwise className="mr-2" />
            Aktualisieren
          </Button>
        </div>

        {runtimeConfigQuery.isLoading && (
          <Text size="sm" color="muted">
            Übersicht wird geladen...
          </Text>
        )}
        {runtimeConfigQuery.isError && (
          <Text size="sm" className="text-red-600 dark:text-red-400">
            Fehler beim Laden der Konfigurations-Übersicht.
          </Text>
        )}

        {!runtimeConfigQuery.isLoading && filteredEntries.length === 0 && filteredRuntimeEntries.length === 0 && (
          <Text size="sm" color="muted">
            Keine Einträge für den aktuellen Filter gefunden.
          </Text>
        )}
      </Card>

      <Card className="space-y-4" padding="md">
        <div className="flex items-center justify-between gap-3">
          <Heading size="lg">Runtime-Konfiguration</Heading>
          <Badge variant="default">{filteredRuntimeEntries.length}</Badge>
        </div>
        <Text size="sm" color="muted">
          Hier bearbeitest du nicht-sensitive Laufzeitwerte. Diese Werte sind unabhängig von den zentralen Secrets.
        </Text>

        {filteredRuntimeEntries.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Text size="sm" color="muted">
                {filteredRuntimeEntries.length} Runtime-Configs im aktuellen Filter
              </Text>
            </div>
            {filteredRuntimeEntries.map((entry) => (
              <RuntimeConfigCard
                key={entry.key}
                entry={entry}
                draftValue={draftValues[entry.key] ?? entry.value ?? ''}
                onChange={(value) => handleValueChange(entry.key, value)}
                onSave={() => handleSave(entry)}
                onDelete={() => handleDelete(entry)}
                saveDisabled={!capabilities.upsert || upsertMutation.isPending || deleteMutation.isPending || (draftValues[entry.key] ?? entry.value ?? '').trim().length === 0}
                deleteDisabled={!capabilities.delete || deleteMutation.isPending || upsertMutation.isPending || !entry.configured}
                saveLoading={upsertMutation.isPending}
                deleteLoading={deleteMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <Text size="sm" color="muted">
            Keine Runtime-Konfigurationen für den aktuellen Filter gefunden.
          </Text>
        )}
      </Card>

      <Card className="space-y-4" padding="md">
        <div className="flex items-center justify-between gap-3">
          <Heading size="lg">Secret-Verwaltung</Heading>
          <Badge variant="info">{filteredEntries.length}</Badge>
        </div>
        <Text size="sm" color="muted">
          Interne und externe Secrets sind hier getrennt dargestellt. Interne Secrets liefern nur Statusinformationen, externe Secrets sind maskiert bearbeitbar.
        </Text>

        {internalSecrets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Heading size="md">Interne Secrets</Heading>
              <Badge variant="warning">{internalSecrets.length}</Badge>
            </div>
            {internalSecrets.map((entry) => (
              <SecretCard key={entry.key} entry={entry} draftValue="" onChange={() => {}} onSave={() => {}} onDelete={() => {}} saveDisabled deleteDisabled saveLoading={false} deleteLoading={false} />
            ))}
          </div>
        )}

        {externalSecrets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Heading size="md">Externe Secrets</Heading>
              <Badge variant="info">{externalSecrets.length}</Badge>
            </div>
            {externalSecrets.map((entry) => (
              <SecretCard
                key={entry.key}
                entry={entry}
                draftValue={draftValues[entry.key] ?? ''}
                onChange={(value) => handleValueChange(entry.key, value)}
                onSave={() => handleSave(entry)}
                onDelete={() => handleDelete(entry)}
                saveDisabled={!capabilities.upsert || upsertMutation.isPending || deleteMutation.isPending || !hasPendingValueForEntry(entry)}
                deleteDisabled={!capabilities.delete || deleteMutation.isPending || upsertMutation.isPending || !entry.configured}
                saveLoading={upsertMutation.isPending}
                deleteLoading={deleteMutation.isPending}
              />
            ))}
          </div>
        )}

        {filteredEntries.length === 0 && (
          <Text size="sm" color="muted">
            Keine Secrets für den aktuellen Filter gefunden.
          </Text>
        )}
      </Card>
    </AdminDashboardLayout>
  );
}
