export type EigenschutzDeepLinkTarget =
  | {
      readonly type: 'gefaehrdungsbeurteilung';
      readonly einsatzId: string;
      readonly id: string;
      readonly focusItem?: string;
    }
  | {
      readonly type: 'psa-zuweisung';
      readonly einsatzId: string;
      readonly zuweisungId: string;
    }
  | {
      readonly type: 'sicherheitsregel';
      readonly einsatzId: string;
      readonly id: string;
    }
  | {
      readonly type: 'sicherungsposten';
      readonly einsatzId: string;
      readonly id: string;
    }
  | {
      readonly type: 'vorfall';
      readonly einsatzId: string;
      readonly vorfallId: string;
    };

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function buildEigenschutzDeepLinkPath(target: EigenschutzDeepLinkTarget): string {
  const base = `/app/einsatz/${pathSegment(target.einsatzId)}/sicherheit/eigenschutz`;
  switch (target.type) {
    case 'gefaehrdungsbeurteilung': {
      const path = `${base}/gefaehrdungen/${pathSegment(target.id)}`;
      if (!target.focusItem) return path;
      const search = new URLSearchParams({ focusItem: target.focusItem });
      return `${path}?${search.toString()}`;
    }
    case 'psa-zuweisung':
      return `${base}/psa-profile/${pathSegment(target.zuweisungId)}`;
    case 'sicherheitsregel':
      return `${base}/sicherheitsregeln/${pathSegment(target.id)}`;
    case 'sicherungsposten':
      return `${base}/sicherungsposten/${pathSegment(target.id)}`;
    case 'vorfall':
      return `${base}/vorfaelle/${pathSegment(target.vorfallId)}`;
  }
}

export function buildEigenschutzBrowserUrl(target: EigenschutzDeepLinkTarget, origin = globalThis.location?.origin ?? ''): string {
  const path = buildEigenschutzDeepLinkPath(target);
  return new URL(path, origin).toString();
}

export function buildEigenschutzTauriOpenUrl(path: string): string {
  return `bluelight://open?path=${encodeURIComponent(path)}`;
}
