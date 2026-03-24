/**
 * Aufbewahrungs-Admin-Seite (DSGVO-Loeschkonzept)
 *
 * Ermoeglicht die Verwaltung der Aufbewahrungsregeln fuer Einsatzdaten:
 * - Konfigurationsformular (Aufbewahrungsfrist, Freigabeperiode, Auto-Loeschung)
 * - Vorschau betroffener Einsaetze
 * - Compliance-Reports (durchgefuehrte Anonymisierungen/Loeschungen)
 */

import { useAufbewahrungsKonfiguration, useAufbewahrungsVorschau, useComplianceReports, useUpdateAufbewahrungsKonfiguration } from '../../api';
import { getApiErrorMessage } from '@/shared/lib/errors/apiErrorHandler';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { Switch } from '@/shared/ui/atoms/switch.atom';
import { Text } from '@/shared/ui/atoms/text.atom';
import { FormFieldWrapper } from '@/shared/ui/molecules/form/FormFieldWrapper';
import type { ComplianceReportDtoTypEnum } from '@/shared';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { PiCheckCircle, PiShieldCheck, PiWarning, PiClockCountdown, PiTrash, PiEye } from 'react-icons/pi';

/**
 * Formatiert ein Datum in deutsches Format
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formatiert ein Datum mit Uhrzeit in deutsches Format
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Gibt die passende Badge-Variante fuer den Report-Typ zurueck
 */
function getReportTypBadgeVariant(typ: ComplianceReportDtoTypEnum): 'warning' | 'error' {
  return typ === 'ANONYMISIERUNG' ? 'warning' : 'error';
}

/**
 * Gibt den deutschen Label fuer den Report-Typ zurueck
 */
function getReportTypLabel(typ: ComplianceReportDtoTypEnum): string {
  return typ === 'ANONYMISIERUNG' ? 'Anonymisierung' : 'Loeschung';
}

// ============================================
// Konfigurationsformular
// ============================================

function KonfigurationsFormular() {
  const { data: config, isLoading, error } = useAufbewahrungsKonfiguration();
  const updateConfig = useUpdateAufbewahrungsKonfiguration();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      aufbewahrungsfristJahre: config?.aufbewahrungsfristJahre ?? 10,
      freigabeperiodeTage: config?.freigabeperiodeTage ?? 30,
      automatischLoeschenAktiv: config?.automatischLoeschenAktiv ?? false,
    },
    onSubmit: async ({ value }) => {
      setApiError(null);
      setSuccessMessage(null);

      return updateConfig.mutateAsync(value, {
        onSuccess: () => {
          setSuccessMessage('Konfiguration erfolgreich gespeichert.');
          // Erfolgs-Nachricht nach 5 Sekunden ausblenden
          setTimeout(() => setSuccessMessage(null), 5_000);
        },
        onError: async (err) => {
          const message = await getApiErrorMessage(err, 'Fehler beim Speichern der Konfiguration.', 'aufbewahrungConfig');
          setApiError(message);
        },
      });
    },
  });

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" label="Konfiguration wird geladen..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <Alert status="error" title="Fehler beim Laden" description="Die Aufbewahrungskonfiguration konnte nicht geladen werden." icon={<PiWarning />} />
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center gap-2">
        <PiShieldCheck className="h-5 w-5 text-action-primary" />
        <Heading size="lg" as="h2">
          Aufbewahrungsregeln
        </Heading>
      </div>

      <Text size="sm" color="muted" className="mb-6">
        Konfigurieren Sie die DSGVO-konformen Aufbewahrungsfristen fuer Einsatzdaten. Nach Ablauf der Frist werden personenbezogene Daten automatisch anonymisiert.
      </Text>

      {successMessage && <Alert status="success" title="Gespeichert" description={successMessage} icon={<PiCheckCircle />} className="mb-4" />}

      {apiError && <Alert status="error" title="Fehler" description={apiError} icon={<PiWarning />} className="mb-4" />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-6">
          <form.Field
            name="aufbewahrungsfristJahre"
            validators={{
              onChange: ({ value }) => {
                const num = Number(value);
                if (!Number.isInteger(num) || num < 1 || num > 30) {
                  return 'Aufbewahrungsfrist muss zwischen 1 und 30 Jahren liegen.';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <FormFieldWrapper field={field} label="Aufbewahrungsfrist (Jahre)" helpText="Zeitraum nach Archivierung, bis personenbezogene Daten anonymisiert werden (1-30 Jahre)." required>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  max={30}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                  disabled={updateConfig.isPending}
                  variant={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  fullWidth
                />
              </FormFieldWrapper>
            )}
          </form.Field>

          <form.Field
            name="freigabeperiodeTage"
            validators={{
              onChange: ({ value }) => {
                const num = Number(value);
                if (!Number.isInteger(num) || num < 1 || num > 365) {
                  return 'Freigabeperiode muss zwischen 1 und 365 Tagen liegen.';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <FormFieldWrapper field={field} label="Freigabeperiode (Tage)" helpText="Wartezeit nach Anonymisierung, bis die endgueltige Loeschung erfolgt (1-365 Tage)." required>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  max={365}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                  disabled={updateConfig.isPending}
                  variant={field.state.meta.isTouched && field.state.meta.errors.length > 0 ? 'error' : 'default'}
                  fullWidth
                />
              </FormFieldWrapper>
            )}
          </form.Field>

          <form.Field name="automatischLoeschenAktiv">
            {(field) => (
              <div className="flex items-center justify-between rounded-panel border border-border-subtle p-4">
                <div className="flex-1">
                  <label htmlFor="auto-loeschen-switch" id="auto-loeschen-label" className="block font-medium text-text-secondary text-sm">
                    Automatische Loeschung
                  </label>
                  <Text size="xs" color="muted" className="mt-0.5">
                    Wenn aktiv, werden fuer Loeschung freigegebene Daten automatisch per Cronjob entfernt.
                  </Text>
                </div>
                <Switch checked={field.state.value} onChange={field.handleChange} labelledBy="auto-loeschen-label" disabled={updateConfig.isPending} />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => (
              <Button type="submit" intent="primary" size="lg" fullWidth disabled={!canSubmit || updateConfig.isPending} loading={updateConfig.isPending}>
                {updateConfig.isPending ? 'Wird gespeichert...' : 'Konfiguration speichern'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </Card>
  );
}

// ============================================
// Vorschau-Tabelle
// ============================================

function VorschauTabelle() {
  const { data: vorschau, isLoading, error } = useAufbewahrungsVorschau();

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center gap-2">
        <PiEye className="h-5 w-5 text-status-warning-text" />
        <Heading size="lg" as="h2">
          Vorschau betroffener Einsaetze
        </Heading>
      </div>

      <Text size="sm" color="muted" className="mb-4">
        Diese Einsaetze waeren bei der aktuellen Konfiguration von einer Anonymisierung betroffen.
      </Text>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" label="Vorschau wird geladen..." />
        </div>
      )}

      {error && <Alert status="error" title="Fehler" description="Die Vorschau konnte nicht geladen werden." icon={<PiWarning />} />}

      {vorschau && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <Badge variant="info" size="md">
              {vorschau.einsaetze.length} Einsaetze
            </Badge>
            <Badge variant="warning" size="md">
              {vorschau.gesamtBefehlCount} Befehle betroffen
            </Badge>
          </div>

          {vorschau.einsaetze.length === 0 ? (
            <div className="py-6 text-center">
              <PiCheckCircle className="mx-auto mb-2 h-8 w-8 text-status-success-text" />
              <Text size="sm" color="muted">
                Keine Einsaetze betroffen. Alle Daten sind innerhalb der Aufbewahrungsfrist.
              </Text>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-border-subtle border-b text-text-muted text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Einsatz-Nr.</th>
                    <th className="px-4 py-3">Archiviert am</th>
                    <th className="px-4 py-3">Anonymisierung faellig am</th>
                    <th className="px-4 py-3 text-right">Befehle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {vorschau.einsaetze.map((einsatz) => (
                    <tr key={einsatz.einsatzId} className="hover:bg-surface-raised">
                      <td className="px-4 py-3 font-medium text-text-primary">{einsatz.einsatzNummer}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(einsatz.archiviertAm)}</td>
                      <td className="px-4 py-3">
                        <span className="text-status-warning-text">{formatDate(einsatz.anonymisierungFaelligAm)}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-secondary">{einsatz.befehlCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ============================================
// Compliance-Reports-Tabelle
// ============================================

function ComplianceReportsTabelle() {
  const { data: reports, isLoading, error } = useComplianceReports();

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center gap-2">
        <PiClockCountdown className="h-5 w-5 text-status-success-text" />
        <Heading size="lg" as="h2">
          Compliance-Reports
        </Heading>
      </div>

      <Text size="sm" color="muted" className="mb-4">
        Protokoll aller durchgefuehrten Anonymisierungen und Loeschungen.
      </Text>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" label="Reports werden geladen..." />
        </div>
      )}

      {error && <Alert status="error" title="Fehler" description="Die Compliance-Reports konnten nicht geladen werden." icon={<PiWarning />} />}

      {reports &&
        (reports.length === 0 ? (
          <div className="py-6 text-center">
            <PiShieldCheck className="mx-auto mb-2 h-8 w-8 text-text-muted" />
            <Text size="sm" color="muted">
              Noch keine Anonymisierungen oder Loeschungen durchgefuehrt.
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-border-subtle border-b text-text-muted text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Durchgefuehrt am</th>
                  <th className="px-4 py-3">Durchgefuehrt von</th>
                  <th className="px-4 py-3 text-right">Befehle</th>
                  <th className="px-4 py-3 text-right">Empfaenger</th>
                  <th className="px-4 py-3 text-right">Kommentare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-surface-raised">
                    <td className="px-4 py-3">
                      <Badge variant={getReportTypBadgeVariant(report.typ)} size="sm">
                        {report.typ === 'LOESCHUNG' && <PiTrash className="mr-1 inline h-3 w-3" />}
                        {getReportTypLabel(report.typ)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDateTime(report.durchgefuehrtAm)}</td>
                    <td className="px-4 py-3 text-text-secondary">{report.durchgefuehrtVon}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{report.befehlCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{report.empfaengerCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{report.kommentarCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </Card>
  );
}

// ============================================
// Hauptseite
// ============================================

/**
 * Aufbewahrungs-Admin-Seite
 *
 * Zentrale Verwaltungsseite fuer DSGVO-konforme Aufbewahrungsregeln.
 * Nur fuer ADMIN/SUPER_ADMIN zugaenglich.
 */
export function AufbewahrungPage() {
  return (
    <div className="flex flex-col gap-6">
      <KonfigurationsFormular />
      <VorschauTabelle />
      <ComplianceReportsTabelle />
    </div>
  );
}
