import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Button } from '@/shared/ui/atoms/button.atom';

interface GefahrenmatrixHilfeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const gefahren = [
  {
    name: 'Absturz',
    beschreibung: 'Gefahr durch Höhenunterschiede: Personen oder Gegenstände können in die Tiefe stürzen. Betrifft z.\u00a0B. Dächer, Böschungen, Gruben, Leitern, Brücken.',
  },
  {
    name: 'Angstreaktion',
    beschreibung: 'Unkontrolliertes Verhalten durch Panik: Betroffene oder Schaulustige handeln irrational, flüchten kopflos oder blockieren Rettungswege. Auch Einsatzkräfte können betroffen sein.',
  },
  {
    name: 'Atemgifte',
    beschreibung: 'Giftige, reizende oder erstickende Stoffe in der Atemluft: Rauchgase, CO, CO₂, Dämpfe, Stäube. Schon geringe Konzentrationen können tödlich sein. Oft unsichtbar und geruchlos.',
  },
  {
    name: 'Atomare Strahlung',
    beschreibung: 'Ionisierende Strahlung durch radioaktive Stoffe: Kann aus Industriequellen, Transportgut oder kontaminierten Bereichen stammen. Gefahr durch Bestrahlung und Inkorporation.',
  },
  {
    name: 'Ausbreitung',
    beschreibung:
      'Die Schadenslage weitet sich räumlich oder zeitlich aus: Feuer greift über, Gefahrstoffe verteilen sich, Wasser steigt weiter. Dynamische Lageentwicklung erfordert vorausschauendes Handeln.',
  },
  {
    name: 'Brand',
    beschreibung: 'Offenes Feuer, Glutnester, Schwelbrände: Direkte Gefahr durch Flammen und Wärmestrahlung. Erzeugt zusätzlich Atemgifte und kann Einsturz oder Explosion nach sich ziehen.',
  },
  {
    name: 'Chemische Stoffe',
    beschreibung: 'Gefahr durch Kontakt mit, Einatmen von oder Verschlucken chemischer Substanzen: Säuren, Laugen, Lösungsmittel, Pestizide. Erkennbar z.\u00a0B. an Warntafeln oder Gefahrzetteln.',
  },
  {
    name: 'Durchbruch',
    beschreibung: 'Unerwartetes Versagen tragender Flächen: Böden, Decken, Eis, Kanaldeckel, Dächer geben nach. Besonders tückisch, weil oft nicht sichtbar.',
  },
  {
    name: 'Einsturz',
    beschreibung: 'Bauteile oder ganze Strukturen stürzen zusammen: Wände, Decken, Gerüste, Bäume. Nachbeben, Brandschäden oder Erschütterungen können Einsturz auslösen.',
  },
  {
    name: 'Elektrizität',
    beschreibung: 'Gefahr durch elektrischen Strom: Freileitungen, beschädigte Kabel, unter Spannung stehende Fahrzeugteile (auch E-Autos/PV-Anlagen). Bereits 230\u00a0V können tödlich sein.',
  },
  {
    name: 'Erkrankung/Verletzung',
    beschreibung: 'Akute gesundheitliche Beeinträchtigung von Personen an der Einsatzstelle: Betrifft Betroffene und Einsatzkräfte (Hitze, Erschöpfung, Infektionsgefahr, psychische Belastung).',
  },
  {
    name: 'Ertrinken',
    beschreibung: 'Gefahr des Ertrinkens in Gewässern, Flutbereichen oder vollgelaufenen Räumen: Auch flaches Wasser mit Strömung ist lebensgefährlich. Unterkühlung verschärft die Lage.',
  },
  {
    name: 'Explosion',
    beschreibung: 'Plötzliche Druckwelle durch Gasgemische, Behälter oder Sprengstoff: Trümmerwurf, Druckwelle und Hitze wirken gleichzeitig. Auch Staubexplosionen möglich.',
  },
] as const;

const schutzgruppen = [
  { name: 'Menschen', beschreibung: 'Betroffene Zivilpersonen vor Ort' },
  { name: 'Tiere', beschreibung: 'Haus- und Nutztiere im Gefahrenbereich' },
  { name: 'Umwelt', beschreibung: 'Boden, Gewässer, Luft, Vegetation' },
  { name: 'Sachwerte', beschreibung: 'Gebäude, Fahrzeuge, Infrastruktur, Güter' },
  { name: 'Einsatzkräfte', beschreibung: 'Alle eingesetzten Helfer — Eigenschutz' },
] as const;

/**
 * Hilfe-Dialog für die Gefahrenmatrix
 *
 * Erklärt das 5A-B-C-D-5E-Schema und die Schutzgruppen im Detail.
 * Die Bewertungsstufen-Legende wird inline unter der Matrix angezeigt.
 */
export function GefahrenmatrixHilfeDialog({ isOpen, onClose }: GefahrenmatrixHilfeDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="full">
      <Dialog.Title>Hilfe: Gefahrenmatrix</Dialog.Title>
      <Dialog.Body className="max-h-[70vh] space-y-6 overflow-y-auto">
        {/* Einleitung */}
        <p className="text-sm text-text-muted">
          Die Gefahrenmatrix bewertet systematisch alle Gefahren an einer Einsatzstelle nach dem <strong className="text-text-primary">5A-B-C-D-5E-Schema</strong>. Für jede Gefahr wird eingeschätzt,
          ob und wie stark sie auf fünf Schutzgruppen wirkt.
        </p>

        {/* Gefahren */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Die 13 Gefahren</h3>
          <dl className="grid gap-2">
            {gefahren.map((g) => (
              <div key={g.name} className="border-border-default bg-surface-secondary/50 rounded-lg border px-3 py-2">
                <dt className="text-sm font-medium text-text-primary">{g.name}</dt>
                <dd className="mt-0.5 text-xs text-text-muted">{g.beschreibung}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Schutzgruppen */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Die fünf Schutzgruppen</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {schutzgruppen.map((s) => (
              <div key={s.name} className="border-border-default bg-surface-secondary/50 rounded-lg border px-3 py-2">
                <p className="text-sm font-medium text-text-primary">{s.name}</p>
                <p className="mt-0.5 text-xs text-text-muted">{s.beschreibung}</p>
              </div>
            ))}
          </div>
        </section>
      </Dialog.Body>
      <Dialog.Footer>
        <Button onClick={onClose} appearance="outline">
          Schließen
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
