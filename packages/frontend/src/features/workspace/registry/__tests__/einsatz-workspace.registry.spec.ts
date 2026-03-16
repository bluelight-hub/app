import { EINSATZ_WORKSPACE_MODULES, getWorkspacePrimaryRoute } from '../einsatz-workspace.registry';
import { PiClipboard } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';

describe('einsatz workspace registry', () => {
  it('stellt einen typisierten Workspace-Contract mit Route-, Shortcut- und Badge-Metadaten bereit', () => {
    expect(EINSATZ_WORKSPACE_MODULES.length).toBeGreaterThan(0);

    const fuehrungModule = EINSATZ_WORKSPACE_MODULES.find((module) => module.id === 'führung');

    expect(fuehrungModule).toMatchObject({
      id: 'führung',
      label: 'Führung',
      routeTarget: '/app/einsatz/$einsatzId/führung/etb',
      shortcut: {
        modifiers: ['alt'],
        key: '2',
      },
      visibility: {
        default: 'visible',
      },
      badgeHint: {
        kind: 'status',
        label: 'Unquittierte Befehle',
      },
    });
    expect(getWorkspacePrimaryRoute(fuehrungModule)).toBe('/app/einsatz/$einsatzId/führung/etb');
  });

  it('führt Unterseiten und künftige Priorisierung konsistent über denselben Contract', () => {
    const overviewModule = EINSATZ_WORKSPACE_MODULES.find((module) => module.id === 'übersicht');

    expect(overviewModule?.subPages[0]).toMatchObject({
      label: 'Dashboard',
      href: '/app/einsatz/$einsatzId/übersicht',
    });
    expect(overviewModule?.priority).toBeTypeOf('number');
    expect(overviewModule?.subPages.every((page) => page.visibility.default === 'visible')).toBe(true);
  });

  it('respektiert bewusst modellierte routeTargets statt implizit die erste Unterseite zu verwenden', () => {
    expect(
      getWorkspacePrimaryRoute({
        routeTarget: '/app/einsatz/$einsatzId/führung/berichte',
        subPages: [
          {
            id: 'etb',
            label: 'ETB',
            href: '/app/einsatz/$einsatzId/führung/etb',
            icon: PiClipboard,
            visibility: { default: 'visible' },
          },
          {
            id: 'berichte',
            label: 'Berichte',
            href: '/app/einsatz/$einsatzId/führung/berichte',
            icon: PiClipboard,
            visibility: { default: 'visible' },
          },
        ],
      }),
    ).toBe('/app/einsatz/$einsatzId/führung/berichte');
  });
});
