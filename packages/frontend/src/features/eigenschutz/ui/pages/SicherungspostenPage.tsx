import { useEffect, useState } from 'react';
import type { SicherungspostenDto } from '@bluelight-hub/shared/client';
import { EigenschutzPageHeader } from '../molecules/EigenschutzPageHeader';
import { AufloeseSicherungspostenDialog } from '../organisms/AufloeseSicherungspostenDialog';
import { SicherungspostenDrawer } from '../organisms/SicherungspostenDrawer';
import { SicherungspostenList } from '../organisms/SicherungspostenList';

export interface SicherungspostenPageProps {
  /**
   * Aktive Einsatz-ID — wird an Liste, Drawer und Auflöse-Dialog
   * weitergereicht.
   */
  readonly einsatzId: string;
  readonly initialAction?: 'new-sicherungsposten';
  readonly onActionConsumed?: () => void;
}

type DrawerMode = 'closed' | 'create' | 'edit';

/**
 * Sicherungsposten-Page (Story 4.1, T6).
 *
 * Komponiert Liste, Drawer und Auflöse-Dialog. Lokaler State steuert die
 * Modus-Transitionen — die Page selbst hat keinen API-Aufruf, alle Daten
 * laden die Organisms eigenständig.
 */
export function SicherungspostenPage({ einsatzId, initialAction, onActionConsumed }: SicherungspostenPageProps) {
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(initialAction === 'new-sicherungsposten' ? 'create' : 'closed');
  const [selectedPosten, setSelectedPosten] = useState<SicherungspostenDto | undefined>(undefined);
  const [aufloesenPosten, setAufloesenPosten] = useState<SicherungspostenDto | null>(null);

  useEffect(() => {
    if (initialAction === 'new-sicherungsposten') {
      setSelectedPosten(undefined);
      setDrawerMode('create');
    }
  }, [initialAction]);

  return (
    <div className="flex flex-col gap-4">
      <EigenschutzPageHeader title="Sicherungsposten" description="Sicherungsposten anlegen, bearbeiten und auflösen — Versionierung und Auflöse-Begründung sind Pflicht." />

      <SicherungspostenList
        einsatzId={einsatzId}
        onCreate={() => {
          setSelectedPosten(undefined);
          setDrawerMode('create');
        }}
        onEdit={(posten) => {
          setSelectedPosten(posten);
          setDrawerMode('edit');
        }}
        onAufloesen={(posten) => setAufloesenPosten(posten)}
      />

      <SicherungspostenDrawer
        einsatzId={einsatzId}
        mode={drawerMode === 'edit' ? 'edit' : 'create'}
        open={drawerMode !== 'closed'}
        onClose={() => {
          setDrawerMode('closed');
          setSelectedPosten(undefined);
          if (initialAction === 'new-sicherungsposten') {
            onActionConsumed?.();
          }
        }}
        posten={drawerMode === 'edit' ? selectedPosten : undefined}
      />

      <AufloeseSicherungspostenDialog einsatzId={einsatzId} posten={aufloesenPosten} onClose={() => setAufloesenPosten(null)} />
    </div>
  );
}
