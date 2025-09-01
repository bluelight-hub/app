import { useEinsaetze, useEinsatz } from '@/hooks/useEinsaetze';
import { useEinsatzStore } from '@/stores/einsatzStore';
import { Button } from '@atoms/button.atom';
import { Card } from '@atoms/card.atom';
import { EinsatzCompletenessBar } from '@molecules/einsatz/einsatz-completeness-bar.molecule';
import { EinsatzStatusBadge } from '@molecules/einsatz/einsatz-status-badge.molecule';
import { useCallback } from 'react';

export function EinsatzExample() {
  const { einsaetze, createEinsatz } = useEinsaetze({
    //search: 'wohn',
  });

  const { selectedEinsatzId, setSelectedEinsatzId, clearSelectedEinsatzId } = useEinsatzStore();
  const { einsatz } = useEinsatz(selectedEinsatzId);
  const createNewEinsatz = useCallback(() => {
    createEinsatz.mutateAsync({
      alarmstichwort: 'Test-Einsatz',
    });
  }, [createEinsatz.mutateAsync]);

  if (!einsaetze) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{einsaetze.length} Einsätze verfügbar</h2>
      <div>{einsatz && <Card>Einsatz ausgewählt: {einsatz.name}</Card>}</div>
      {selectedEinsatzId && (
        <Button variant="danger" onClick={clearSelectedEinsatzId}>
          Auswahl leeren
        </Button>
      )}
      <Button variant="primary" onClick={createNewEinsatz}>
        Einsatz erstellen
      </Button>
      <div>
        <ul>
          {einsaetze.map((einsatz) => (
            <li key={einsatz.id}>
              <h3>{einsatz.name}</h3>
              <p>{einsatz.alarmstichwort}</p>
              <EinsatzStatusBadge status={einsatz.status} />
              <EinsatzCompletenessBar einsatz={einsatz} />
              <Button onClick={() => setSelectedEinsatzId(einsatz.id)}>Auswählen</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
