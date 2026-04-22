import { EigenschutzEntryPage, useEigenschutzHealth } from '@/features/eigenschutz';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PiShieldWarning } from 'react-icons/pi';

export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz')(() => {
  return {
    component: EigenschutzRouteComponent,
  };
});

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

function EigenschutzRouteComponent() {
  const { einsatzId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending, error, refetch } = useEigenschutzHealth(einsatzId);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-text-muted">
        <Spinner size="sm" type="ring" label="Eigenschutz wird geladen" />
        <span>Eigenschutz wird geladen…</span>
      </div>
    );
  }

  if (error) {
    if (statusOf(error) === 403) {
      return (
        <EmptyState
          icon={PiShieldWarning}
          title="Keine Berechtigung für Eigenschutz"
          description="Für diesen Bereich benötigen Sie eine Eigenschutz-Rolle (Sicherheitsbeauftragter, Abschnittsleiter, Einheitsführer oder Nachbereitung)."
          secondaryAction={{
            label: 'Zurück zur Einsatz-Übersicht',
            onClick: () => {
              void navigate({ to: '/app/einsatz/$einsatzId/übersicht', params: { einsatzId } });
            },
          }}
        />
      );
    }

    // Non-403-Fehler (5xx, Network, Timeout): meta.silentError unterdrückt den
    // globalen Toast; hier liefert die Route das explizite Erreichbarkeits-
    // Feedback inklusive Retry, damit der Nutzer ein transientes Problem von
    // einem noch-nicht-verdrahteten Modul unterscheiden kann.
    return (
      <EmptyState
        icon={PiShieldWarning}
        title="Eigenschutz aktuell nicht erreichbar"
        description="Die Anfrage an das Eigenschutz-Modul ist fehlgeschlagen. Bitte erneut versuchen — falls das Problem bleibt, die Serveranbindung prüfen."
        secondaryAction={{
          label: 'Erneut versuchen',
          onClick: () => {
            void refetch();
          },
        }}
      />
    );
  }

  if (!data || data.status !== 'ready') {
    return <EmptyState icon={PiShieldWarning} title="Eigenschutz nicht verfügbar" description="Das Modul ist für diesen Einsatz noch nicht verdrahtet." />;
  }

  return <EigenschutzEntryPage />;
}
