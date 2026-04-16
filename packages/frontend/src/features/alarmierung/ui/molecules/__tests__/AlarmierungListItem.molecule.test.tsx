import type { AlarmierungResponseDto } from '@bluelight-hub/shared/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AlarmierungListItem } from '../AlarmierungListItem.molecule';

function buildAlarmierung(overrides: Partial<AlarmierungResponseDto> = {}): AlarmierungResponseDto {
  return {
    id: 'alarm-1',
    bezeichnung: 'BMA Müllerstraße 12',
    status: 'aktiv',
    alarmierungszeit: new Date('2026-04-15T08:00:00.000Z'),
    istNachalarmierung: false,
    empfaenger: [],
    ...overrides,
  } as AlarmierungResponseDto;
}

describe('AlarmierungListItem', () => {
  it('rendert Bezeichnung und aktiven Status', () => {
    render(<AlarmierungListItem alarmierung={buildAlarmierung()} />);
    expect(screen.getByText('BMA Müllerstraße 12')).toBeInTheDocument();
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });

  it('ruft onClick beim Klick auf die Haupt-Schaltfläche auf', () => {
    const onClick = vi.fn();
    render(<AlarmierungListItem alarmierung={buildAlarmierung()} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /BMA Müllerstraße 12/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('zeigt den Nachalarm-Button nur wenn onNachalarmieren gesetzt ist', () => {
    const onNachalarmieren = vi.fn();
    const onClick = vi.fn();
    render(<AlarmierungListItem alarmierung={buildAlarmierung()} onClick={onClick} onNachalarmieren={onNachalarmieren} />);
    const btn = screen.getByRole('button', { name: /Nachalarmierung zu „BMA Müllerstraße 12" anlegen/ });
    fireEvent.click(btn);
    expect(onNachalarmieren).toHaveBeenCalledTimes(1);
    // stopPropagation → onClick darf NICHT ausgelöst werden
    expect(onClick).not.toHaveBeenCalled();
  });

  it('rendert Nachalarmierungs-Badge wenn istNachalarmierung=true', () => {
    render(<AlarmierungListItem alarmierung={buildAlarmierung({ istNachalarmierung: true })} />);
    expect(screen.getByRole('status', { name: /Nachalarmierung/ })).toBeInTheDocument();
  });
});
