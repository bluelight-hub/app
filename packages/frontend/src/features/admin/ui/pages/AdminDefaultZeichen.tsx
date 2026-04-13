/**
 * Admin Default-Zeichen Page.
 *
 * Zeigt Fahrzeugtypen und Einheitentypen mit ihren zugewiesenen Standard-Zeichen.
 * Ermöglicht das Zuweisen und Ändern von Default-Zeichen über einen Seitenpanel-Editor.
 */

import { useState } from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAdminAuth } from '@/features/auth/api';
import { useAdminDefaultZeichenManagement, useAdminFahrzeugtypenManagement } from '@/features/admin/api';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import { Card } from '@/shared/ui/atoms/card.atom';
import { Container } from '@/shared/ui/atoms/container.atom';
import { Heading } from '@/shared/ui/atoms/heading.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Tabs } from '@/shared/ui/molecules/tabs.molecule';
import { ErrorBoundary } from '@/shared/ui/organisms/ErrorBoundary';
import { DefaultZeichenTypTable, type DefaultZeichenTableEntry } from '../organisms/DefaultZeichenTypTable';
import { ZeichenEditPanel } from '../organisms/ZeichenEditPanel';

/** Einheitentyp-Labels für die Tabelle */
const EINHEITENTYP_LABELS: Record<string, string> = {
  TRUPP: 'Trupp',
  STAFFEL: 'Staffel',
  GRUPPE: 'Gruppe',
  ZUG: 'Zug',
  ABSCHNITT: 'Abschnitt',
};

/**
 * Admin Default-Zeichen Page.
 */
export function AdminDefaultZeichen() {
  const { isAdmin, isLoading: isAuthLoading } = useAdminAuth();
  const { fahrzeugtypen, isLoading: isFahrzeugtypenLoading } = useAdminFahrzeugtypenManagement();
  const {
    fahrzeugtypenDefaults,
    einheitentypenDefaults,
    isLoadingFahrzeugtypen: isLoadingFzDefaults,
    isLoadingEinheitentypen: isLoadingEtDefaults,
    errorFahrzeugtypen: errorFzDefaults,
    errorEinheitentypen: errorEtDefaults,
    setFahrzeugtypDefault,
    setEinheitentypDefault,
    isSettingFahrzeugtyp,
    isSettingEinheitentyp,
    settingFahrzeugtypId,
    settingEinheitentyp,
  } = useAdminDefaultZeichenManagement();

  const [editTarget, setEditTarget] = useState<{ typ: 'fahrzeugtyp' | 'einheitentyp'; eintrag: DefaultZeichenTableEntry } | null>(null);

  if (!isAuthLoading && !isAdmin) {
    return <Navigate to="/admin-login" />;
  }

  if (isAuthLoading) {
    return (
      <Container maxWidth="6xl" className="py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </Container>
    );
  }

  // Fahrzeugtypen-Einträge: Alle Fahrzeugtypen + zugehöriges Default-Zeichen
  const fahrzeugtypenEntries: DefaultZeichenTableEntry[] = (fahrzeugtypen || []).map((ft) => {
    const defaultEntry = fahrzeugtypenDefaults?.find((d) => d.referenzId === ft.id);
    return {
      id: ft.id,
      bezeichnung: `${ft.code} — ${ft.bezeichnung}`,
      zeichenDefinition: defaultEntry?.zeichenDefinition as unknown as ZeichenDefinition | undefined,
    };
  });

  // Einheitentypen-Einträge: Feste 5 Enum-Werte + zugehöriges Default-Zeichen
  const einheitentypenEntries: DefaultZeichenTableEntry[] = Object.entries(EINHEITENTYP_LABELS).map(([enumValue, label]) => {
    const defaultEntry = einheitentypenDefaults?.find((d) => d.typBezeichnung === enumValue);
    return {
      id: enumValue,
      bezeichnung: label,
      zeichenDefinition: defaultEntry?.zeichenDefinition as unknown as ZeichenDefinition | undefined,
    };
  });

  const handleEditFahrzeugtyp = (eintrag: DefaultZeichenTableEntry) => {
    setEditTarget({ typ: 'fahrzeugtyp', eintrag });
  };

  const handleEditEinheitentyp = (eintrag: DefaultZeichenTableEntry) => {
    setEditTarget({ typ: 'einheitentyp', eintrag });
  };

  const handleSave = (definition: ZeichenDefinition) => {
    if (!editTarget) return;

    if (editTarget.typ === 'fahrzeugtyp') {
      setFahrzeugtypDefault({ fahrzeugtypId: editTarget.eintrag.id, zeichenDefinition: definition as any }, { onSuccess: () => setEditTarget(null) });
    } else {
      setEinheitentypDefault({ einheitentyp: editTarget.eintrag.id, zeichenDefinition: definition as any }, { onSuccess: () => setEditTarget(null) });
    }
  };

  const isSaving = editTarget?.typ === 'fahrzeugtyp' ? isSettingFahrzeugtyp : isSettingEinheitentyp;

  return (
    <ErrorBoundary>
      <Container maxWidth="6xl" className="py-8">
        <div className="flex flex-col gap-6">
          <div>
            <Heading size="lg" as="h1">
              Default-Zeichen
            </Heading>
            <Text className="text-text-secondary">Konfigurieren Sie die Standard-Zeichen für Fahrzeugtypen und Einheitentypen. Diese werden als Vorschlag bei der Einsatz-Zuordnung verwendet.</Text>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Tabellen-Bereich */}
            <div className={editTarget ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <Tabs
                items={[
                  {
                    label: 'Fahrzeugtypen',
                    content: (
                      <Card padding="none">
                        <DefaultZeichenTypTable
                          eintraege={fahrzeugtypenEntries}
                          isLoading={isFahrzeugtypenLoading || isLoadingFzDefaults}
                          error={errorFzDefaults}
                          onEdit={handleEditFahrzeugtyp}
                          editingId={settingFahrzeugtypId}
                          emptyTitle="Keine Fahrzeugtypen"
                          emptyDescription="Erstellen Sie zuerst Fahrzeugtypen unter Kräfte → Fahrzeugtypen."
                        />
                      </Card>
                    ),
                  },
                  {
                    label: 'Einheitentypen',
                    content: (
                      <Card padding="none">
                        <DefaultZeichenTypTable
                          eintraege={einheitentypenEntries}
                          isLoading={isLoadingEtDefaults}
                          error={errorEtDefaults}
                          onEdit={handleEditEinheitentyp}
                          editingId={settingEinheitentyp}
                          emptyTitle="Keine Einheitentypen"
                          emptyDescription="Einheitentypen werden systemseitig bereitgestellt."
                        />
                      </Card>
                    ),
                  },
                ]}
              />
            </div>

            {/* Seitenpanel für Bearbeitung */}
            {editTarget && (
              <div className="lg:col-span-1">
                <Card>
                  <ZeichenEditPanel
                    key={editTarget.eintrag.id}
                    typBezeichnung={editTarget.eintrag.bezeichnung}
                    initialDefinition={editTarget.eintrag.zeichenDefinition}
                    onSave={handleSave}
                    isSaving={isSaving}
                    onClose={() => setEditTarget(null)}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      </Container>
    </ErrorBoundary>
  );
}
