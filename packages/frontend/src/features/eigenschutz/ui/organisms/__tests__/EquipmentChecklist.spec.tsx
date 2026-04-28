import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EquipmentChecklist, type EquipmentChecklistEinheit } from '../EquipmentChecklist';
import { AUSRUESTUNGS_CHECKLISTEN } from '../../../constants/ausruestungs-checkliste.constants';

const EINHEITEN: EquipmentChecklistEinheit[] = [
  { einheitId: 'cle-a', einheitName: 'Sani-1' },
  { einheitId: 'cle-b', einheitName: 'Sani-2' },
];

function buildChecked(entries: ReadonlyArray<readonly [string, string, boolean]>): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const [einheitId, itemId, value] of entries) map.set(`${einheitId}|${itemId}`, value);
  return map;
}

describe('EquipmentChecklist (Story 3.5 AC5/AC8/AC10/AC12)', () => {
  it('rendert pro Profil eine Sektion und pro Einheit ein <fieldset> mit <legend>', () => {
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={EINHEITEN} checked={new Map()} onToggle={() => undefined} />);

    // Sektion pro Profil
    expect(screen.getByTestId('equipment-checklist-section-BASIS')).toBeInTheDocument();
    // Fieldsets pro Einheit
    const fieldsets = screen.getAllByRole('group');
    expect(fieldsets.length).toBe(2);
    // Legend enthält Einheit + Profil-Kontext (P6).
    expect(within(fieldsets[0]).getByText(/Einheit Sani-1 — Basis/)).toBeInTheDocument();
    expect(within(fieldsets[1]).getByText(/Einheit Sani-2 — Basis/)).toBeInTheDocument();
  });

  it('feuert onToggle mit korrekten Argumenten beim Klick auf Checkbox', () => {
    const onToggle = vi.fn();
    const item = AUSRUESTUNGS_CHECKLISTEN.BASIS.items[0];
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={onToggle} />);

    const checkbox = screen.getByTestId(`equipment-checklist-checkbox-cle-a-${item.id}`);
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('cle-a', item.id, true);
  });

  it('rendert Status-Pill „Noch nicht geprüft" im pristine-Status', () => {
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    const pill = screen.getByTestId('equipment-checklist-status-cle-a');
    expect(pill).toHaveAttribute('data-status', 'pristine');
    expect(pill).toHaveTextContent('Noch nicht geprüft');
  });

  it('Status-Übergang pristine → in-progress → complete via Toggle', () => {
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    const { rerender } = render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    expect(screen.getByTestId('equipment-checklist-status-cle-a')).toHaveAttribute('data-status', 'pristine');

    rerender(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={buildChecked([['cle-a', basisItems[0].id, true]])} onToggle={() => undefined} />);
    expect(screen.getByTestId('equipment-checklist-status-cle-a')).toHaveAttribute('data-status', 'in-progress');

    rerender(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={buildChecked(basisItems.map((i) => ['cle-a', i.id, true] as const))} onToggle={() => undefined} />);
    expect(screen.getByTestId('equipment-checklist-status-cle-a')).toHaveAttribute('data-status', 'complete');
  });

  it('rendert gap-reported-State wenn einheit.luecke gesetzt ist (Forward-Compat AC8)', () => {
    render(
      <EquipmentChecklist
        aktiveProfile={['BASIS']}
        einheiten={[{ ...EINHEITEN[0], luecke: { meldung: 'Helm fehlt', gemeldetAm: '2026-04-24T10:00:00Z' } }]}
        checked={new Map()}
        onToggle={() => undefined}
      />,
    );
    const pill = screen.getByTestId('equipment-checklist-status-cle-a');
    expect(pill).toHaveAttribute('data-status', 'gap-reported');
    expect(pill).toHaveTextContent('Lücke gemeldet');
  });

  it('disabled „Lücke melden"-Button ohne onMeldeLuecke und enabled mit', () => {
    const { rerender } = render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    expect(screen.getByTestId('equipment-checklist-luecke-cle-a')).toBeDisabled();

    rerender(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} onMeldeLuecke={() => undefined} />);
    expect(screen.getByTestId('equipment-checklist-luecke-cle-a')).not.toBeDisabled();
  });

  it('feuert onMeldeLuecke mit Komma-getrennter Notiz aus nicht-gehakten Items (AC10)', () => {
    const onMeldeLuecke = vi.fn();
    const basisItems = AUSRUESTUNGS_CHECKLISTEN.BASIS.items;
    render(
      <EquipmentChecklist
        aktiveProfile={['BASIS']}
        einheiten={[EINHEITEN[0]]}
        // Nur das erste Item gehakt → die anderen beiden werden in der Notiz erwartet.
        checked={buildChecked([['cle-a', basisItems[0].id, true]])}
        onToggle={() => undefined}
        onMeldeLuecke={onMeldeLuecke}
      />,
    );

    fireEvent.click(screen.getByTestId('equipment-checklist-luecke-cle-a'));
    expect(onMeldeLuecke).toHaveBeenCalledWith({
      einheitId: 'cle-a',
      vorbereiteteNotiz: `${basisItems[1].label}, ${basisItems[2].label}`,
    });
  });

  it.each([1, 2, 5])('rendert deterministisch mit %i Einheiten (AC12)', (count) => {
    const einheiten = Array.from({ length: count }, (_, idx) => ({ einheitId: `cle-${idx}`, einheitName: `Einheit-${idx}` }));
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={einheiten} checked={new Map()} onToggle={() => undefined} />);
    expect(screen.getAllByRole('group').length).toBe(count);
    expect(screen.getAllByTestId(/equipment-checklist-status-cle-/)).toHaveLength(count);
  });

  it('aria-label auf Lücke-Button enthält den Einheit-Namen', () => {
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    expect(screen.getByLabelText('Lücke für Einheit Sani-1 melden')).toBeInTheDocument();
  });

  it('readOnly=true disabled alle Checkboxen und unterdrückt den Lücke-Button (P1)', () => {
    const onToggle = vi.fn();
    const item = AUSRUESTUNGS_CHECKLISTEN.BASIS.items[0];
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={onToggle} readOnly />);

    // Alle Checkboxen sind `disabled` — Browser-A11y-Layer verhindert
    // Tab+Space-Manipulation. JSDOM unterscheidet sich vom realen Browser
    // (fireEvent.click würde den onChange dort weiter feuern), aber das
    // `disabled`-Attribut ist die maßgebliche Garantie.
    const checkbox = screen.getByTestId(`equipment-checklist-checkbox-cle-a-${item.id}`);
    expect(checkbox).toBeDisabled();

    // Sender-Read-Only: Lücke-Button ist nicht im DOM.
    expect(screen.queryByTestId('equipment-checklist-luecke-cle-a')).toBeNull();

    // Wrapper trägt data-read-only-Marker für Snapshot-/E2E-Selektoren.
    expect(screen.getByTestId('equipment-checklist')).toHaveAttribute('data-read-only', 'true');
  });

  it('disabled Lücke-Button trägt aria-describedby mit SR-only-Hinweis (P11, AC10)', () => {
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    const button = screen.getByTestId('equipment-checklist-luecke-cle-a');
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const hint = document.getElementById(describedBy!);
    expect(hint).not.toBeNull();
    expect(hint?.textContent ?? '').toMatch(/Story 3\.6/);
  });

  it('Status-Pill trägt aria-live="polite" für Screenreader-Status-Wechsel (P12)', () => {
    render(<EquipmentChecklist aktiveProfile={['BASIS']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    expect(screen.getByTestId('equipment-checklist-status-cle-a')).toHaveAttribute('aria-live', 'polite');
  });

  it('Legend trägt Einheit + Profil-Kontext bei mehreren Profilen (P6)', () => {
    render(<EquipmentChecklist aktiveProfile={['BASIS', 'INFEKTION']} einheiten={[EINHEITEN[0]]} checked={new Map()} onToggle={() => undefined} />);
    // Beide Legends enthalten Profil-Label.
    expect(screen.getByText(/Einheit Sani-1 — Basis/)).toBeInTheDocument();
    expect(screen.getByText(/Einheit Sani-1 — Infektion/)).toBeInTheDocument();
  });
});
