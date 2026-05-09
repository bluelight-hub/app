import { describe, expect, it } from 'vitest';

import { buildEigenschutzBrowserUrl, buildEigenschutzDeepLinkPath, buildEigenschutzTauriOpenUrl } from '../build-eigenschutz-deep-link';

describe('buildEigenschutzDeepLinkPath', () => {
  it('baut die kanonische Gefährdungsbeurteilungs-URL mit focusItem', () => {
    expect(
      buildEigenschutzDeepLinkPath({
        type: 'gefaehrdungsbeurteilung',
        einsatzId: 'einsatz-1',
        id: 'gb-1',
        focusItem: 'item-ä',
      }),
    ).toBe('/app/einsatz/einsatz-1/sicherheit/eigenschutz/gefaehrdungen/gb-1?focusItem=item-%C3%A4');
  });

  it('baut die kanonische PSA-Zuweisungs-URL ohne propagationGroup-Fallback', () => {
    expect(
      buildEigenschutzDeepLinkPath({
        type: 'psa-zuweisung',
        einsatzId: 'einsatz-1',
        zuweisungId: 'zuweisung-1',
      }),
    ).toBe('/app/einsatz/einsatz-1/sicherheit/eigenschutz/psa-profile/zuweisung-1');
  });

  it('baut die übrigen Entity-URLs stabil und URL-encodiert', () => {
    expect(buildEigenschutzDeepLinkPath({ type: 'sicherheitsregel', einsatzId: 'einsatz 1', id: 'regel/1' })).toBe('/app/einsatz/einsatz%201/sicherheit/eigenschutz/sicherheitsregeln/regel%2F1');
    expect(buildEigenschutzDeepLinkPath({ type: 'sicherungsposten', einsatzId: 'einsatz-1', id: 'posten-1' })).toBe('/app/einsatz/einsatz-1/sicherheit/eigenschutz/sicherungsposten/posten-1');
    expect(buildEigenschutzDeepLinkPath({ type: 'vorfall', einsatzId: 'einsatz-1', vorfallId: 'vorfall-1' })).toBe('/app/einsatz/einsatz-1/sicherheit/eigenschutz/vorfaelle/vorfall-1');
  });
});

describe('buildEigenschutzBrowserUrl', () => {
  it('kombiniert Origin und kanonischen Pfad zu einer vollständigen Browser-URL', () => {
    expect(
      buildEigenschutzBrowserUrl(
        {
          type: 'vorfall',
          einsatzId: 'einsatz-1',
          vorfallId: 'vorfall-1',
        },
        'https://localhost:3090',
      ),
    ).toBe('https://localhost:3090/app/einsatz/einsatz-1/sicherheit/eigenschutz/vorfaelle/vorfall-1');
  });
});

describe('buildEigenschutzTauriOpenUrl', () => {
  it('encodiert interne App-Pfade für den getrennten Tauri-Open-Link-Contract', () => {
    expect(buildEigenschutzTauriOpenUrl('/app/einsatz/einsatz-1/sicherheit/eigenschutz/gefaehrdungen/gb-1?focusItem=item-1')).toBe(
      'bluelight://open?path=%2Fapp%2Feinsatz%2Feinsatz-1%2Fsicherheit%2Feigenschutz%2Fgefaehrdungen%2Fgb-1%3FfocusItem%3Ditem-1',
    );
  });
});
