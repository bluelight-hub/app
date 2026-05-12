import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

const { captured } = vi.hoisted(() => ({
  captured: { route: null as { validateSearch?: (search: Record<string, unknown>) => unknown } | null },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: (_path: string) => (options: { component: () => React.JSX.Element; validateSearch?: (search: Record<string, unknown>) => unknown }) => {
      captured.route = options;
      return {
        useParams: () => ({ einsatzId: 'einsatz-1' }),
        useSearch: () => ({}),
        options,
      };
    },
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/features/eigenschutz/ui/pages/PsaProfilePage', () => ({
  PsaProfilePage: () => null,
}));

// Explizit auf das Index-Modul zeigen: die Sibling-Datei `psa-profile.tsx`
// ist nur noch ein Layout-Wrapper ohne `validateSearch`, die echte Route
// liegt unter `psa-profile/index.tsx`.
import '../eigenschutz/psa-profile/index';

describe('PsaProfile Route', () => {
  it('akzeptiert den PSA-Action-Param nur mit Ziel-Einheit', () => {
    const validate = captured.route?.validateSearch;

    expect(validate?.({ action: 'psa-change', einheitId: 'einheit-1' })).toEqual({
      action: 'psa-change',
      einheitId: 'einheit-1',
      focusGroup: undefined,
    });
    expect(validate?.({ action: 'psa-change' })).toEqual({
      action: undefined,
      einheitId: undefined,
      focusGroup: undefined,
    });
  });
});
