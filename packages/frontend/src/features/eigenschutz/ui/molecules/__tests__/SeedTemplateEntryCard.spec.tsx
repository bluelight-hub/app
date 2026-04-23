import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PiAmbulance } from 'react-icons/pi';
import { SeedTemplateEntryCard } from '../SeedTemplateEntryCard';

describe('SeedTemplateEntryCard', () => {
  it('rendert seed-Variante mit Titel, Beschreibung, Icon und Gefährdungen-Zähler', () => {
    render(<SeedTemplateEntryCard variant="seed" title="MANV" description="Massenanfall von Verletzten" icon={PiAmbulance} itemCount={12} selected={false} onSelect={() => {}} />);

    expect(screen.getByRole('radio', { name: /./ })).toBeInTheDocument();
    expect(screen.getByText('MANV')).toBeInTheDocument();
    expect(screen.getByText('Massenanfall von Verletzten')).toBeInTheDocument();
    expect(screen.getByText('12 Gefährdungen')).toBeInTheDocument();
  });

  it('zeigt Singular „1 Gefährdung" bei itemCount === 1', () => {
    render(<SeedTemplateEntryCard variant="seed" title="Minimal" description="…" itemCount={1} selected={false} onSelect={() => {}} />);

    expect(screen.getByText('1 Gefährdung')).toBeInTheDocument();
  });

  it('rendert leer-Variante ohne Gefährdungen-Zähler', () => {
    render(<SeedTemplateEntryCard variant="leer" title="Leeres Formular" description="Ohne Vorlage starten" selected={false} onSelect={() => {}} />);

    expect(screen.getByText('Leeres Formular')).toBeInTheDocument();
    expect(screen.queryByText(/Gefährdung/)).not.toBeInTheDocument();
  });

  it('ruft onSelect bei Klick auf', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SeedTemplateEntryCard variant="seed" title="MANV" description="…" itemCount={12} selected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('setzt aria-checked=true, wenn selected', () => {
    render(<SeedTemplateEntryCard variant="seed" title="MANV" description="…" itemCount={12} selected={true} onSelect={() => {}} />);

    expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'true');
  });

  it('disabled=true blockiert Klick und signalisiert aria-disabled', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SeedTemplateEntryCard variant="seed" title="MANV" description="…" itemCount={12} selected={false} onSelect={onSelect} disabled={true} />);

    const radio = screen.getByRole('radio');
    expect(radio).toBeDisabled();
    expect(radio).toHaveAttribute('aria-disabled', 'true');
    await user.click(radio);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
