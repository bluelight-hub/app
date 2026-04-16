import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatReaktionszeit, useReaktionszeit } from '../use-reaktionszeit';

describe('formatReaktionszeit', () => {
  it('liefert pending-Stufe für null', () => {
    const result = formatReaktionszeit(null);
    expect(result.isPending).toBe(true);
    expect(result.stufe).toBe('pending');
    expect(result.label).toBe('--:--');
  });

  it('liefert pending-Stufe für undefined', () => {
    const result = formatReaktionszeit(undefined);
    expect(result.isPending).toBe(true);
    expect(result.label).toBe('--:--');
  });

  it('formatiert 0 Sekunden als 00:00', () => {
    const result = formatReaktionszeit(0);
    expect(result.label).toBe('00:00');
    expect(result.stufe).toBe('schnell');
    expect(result.isPending).toBe(false);
  });

  it('formatiert 125 Sekunden als 02:05 mit Stufe „schnell"', () => {
    const result = formatReaktionszeit(125);
    expect(result.label).toBe('02:05');
    expect(result.stufe).toBe('schnell');
    expect(result.ariaLabel).toContain('2 Minuten');
  });

  it('stuft Werte < 5 min als „schnell" ein', () => {
    expect(formatReaktionszeit(4 * 60 + 59).stufe).toBe('schnell');
  });

  it('stuft Werte zwischen 5 und 10 min als „mittel" ein', () => {
    expect(formatReaktionszeit(5 * 60).stufe).toBe('mittel');
    expect(formatReaktionszeit(9 * 60 + 59).stufe).toBe('mittel');
  });

  it('stuft Werte ≥ 10 min als „langsam" ein', () => {
    expect(formatReaktionszeit(10 * 60).stufe).toBe('langsam');
    expect(formatReaktionszeit(30 * 60).stufe).toBe('langsam');
  });

  it('behandelt negative Werte als pending', () => {
    const result = formatReaktionszeit(-1);
    expect(result.isPending).toBe(true);
  });
});

describe('useReaktionszeit', () => {
  it('liefert die gleichen Werte wie formatReaktionszeit', () => {
    const { result } = renderHook(() => useReaktionszeit(300));
    expect(result.current.label).toBe('05:00');
    expect(result.current.stufe).toBe('mittel');
  });

  it('behandelt null-Input als pending', () => {
    const { result } = renderHook(() => useReaktionszeit(null));
    expect(result.current.isPending).toBe(true);
    expect(result.current.label).toBe('--:--');
  });
});
