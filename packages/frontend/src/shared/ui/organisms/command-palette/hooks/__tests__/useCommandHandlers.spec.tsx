import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCommandHandlers } from '../useCommandHandlers';

const navigateSpy = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

describe('useCommandHandlers', () => {
  it('erhält beim internen Navigieren den bestehenden Search-Kontext', () => {
    const onOpenChange = vi.fn();
    const selectCommand = vi.fn();

    const { result } = renderHook(() =>
      useCommandHandlers({
        onOpenChange,
        selectCommand,
      }),
    );

    result.current.handleSelect({
      id: 'führung-etb',
      name: 'ETB',
      href: '/app/einsatz/$einsatzId/führung/etb',
      module: 'Führung',
      moduleColor: 'purple',
    });

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/führung/etb',
      search: expect.any(Function),
    });

    const searchHandler = navigateSpy.mock.calls[0]?.[0]?.search as ((prev: Record<string, unknown>) => Record<string, unknown>) | undefined;
    expect(searchHandler?.({ filter: 'offen', befehlId: 'cmd-1' })).toEqual({
      filter: 'offen',
      befehlId: 'cmd-1',
    });
  });
});
