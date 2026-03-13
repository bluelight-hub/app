const THEME_SCOPE_CLASSES = ['auth-theme', 'workspace-start-theme'] as const;
const THEME_SCOPE_SELECTOR = THEME_SCOPE_CLASSES.map((className) => `.${className}`).join(', ');

type ThemeScopeClassName = (typeof THEME_SCOPE_CLASSES)[number];

function resolveThemeScopeClassName(scopeElement: Element | null | undefined): ThemeScopeClassName | undefined {
  if (!(scopeElement instanceof Element)) {
    return undefined;
  }

  return THEME_SCOPE_CLASSES.find((className) => scopeElement.classList.contains(className));
}

export function resolveThemeScope(element: Element | null | undefined): {
  container?: HTMLElement;
  className?: ThemeScopeClassName;
} {
  if (!(element instanceof Element)) {
    return {};
  }

  const scopeElement = element.closest(THEME_SCOPE_SELECTOR);

  if (!(scopeElement instanceof HTMLElement)) {
    return {};
  }

  return {
    container: scopeElement,
    className: resolveThemeScopeClassName(scopeElement),
  };
}

export function resolveActiveThemeScope() {
  if (typeof document === 'undefined') {
    return {};
  }

  return resolveThemeScope(document.activeElement);
}
