import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import { useActiveNavigation } from '@/hooks/useActiveNavigation';
import { useAuthorization } from '@/hooks/useAuthorization';

export interface NavigationLinkProps extends Omit<LinkProps, 'to'> {
  /** Ziel-URL */
  to: string;
  /** Anzuzeigender Text */
  children: React.ReactNode;
  /** Icon für den Link */
  icon?: React.ReactNode;
  /** Zusätzliche CSS-Klassen für aktive Links */
  activeClassName?: string;
  /** Soll exakte Übereinstimmung geprüft werden? */
  exact?: boolean;
  /** Ist der Link deaktiviert? */
  disabled?: boolean;
  /** Tooltip-Text */
  tooltip?: string;
  /** Button-Stil verwenden */
  asButton?: boolean;
  /** Button-Typ (falls asButton = true) */
  buttonType?: 'default' | 'primary' | 'ghost' | 'dashed' | 'link' | 'text';
  /** Button-Größe (falls asButton = true) */
  buttonSize?: 'small' | 'middle' | 'large';
  /** Callback für Klick-Events */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Prüfe Zugriffsberechtigung automatisch */
  checkAccess?: boolean;
  /** Fallback-Komponente bei fehlender Berechtigung */
  unauthorizedFallback?: React.ReactNode;
}

/**
 * Erweiterte NavigationLink-Komponente mit automatischer Active-State-Erkennung
 * und Zugriffsberechtigungsprüfung
 */
const NavigationLink: React.FC<NavigationLinkProps> = ({
  to,
  children,
  icon,
  className = '',
  activeClassName = 'active',
  exact = false,
  disabled = false,
  tooltip,
  asButton = false,
  buttonType = 'default',
  buttonSize = 'middle',
  onClick,
  checkAccess = true,
  unauthorizedFallback = null,
  ...linkProps
}) => {
  const { isExactActive, isActiveOrChild, getLinkClasses } = useActiveNavigation();
  const { canAccessPath } = useAuthorization();

  // Prüfe Aktivitätsstatus
  const isActive = exact ? isExactActive(to) : isActiveOrChild(to);

  // Prüfe Zugriffsberechtigung
  const hasAccess = !checkAccess || canAccessPath(to);

  // Handle Click
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (disabled || !hasAccess) {
      event.preventDefault();
      return;
    }

    if (onClick) {
      onClick(event);
    }
  };

  // Zeige Fallback bei fehlender Berechtigung
  if (!hasAccess && unauthorizedFallback) {
    return <>{unauthorizedFallback}</>;
  }

  // Generiere CSS-Klassen
  const linkClasses = getLinkClasses(to, `navigation-link ${className}`, `navigation-link--active ${activeClassName}`);

  // Zusätzliche Klassen für disabled/unauthorized
  const finalClasses = `
    ${linkClasses}
    ${disabled ? 'navigation-link--disabled' : ''}
    ${!hasAccess ? 'navigation-link--unauthorized' : ''}
    ${isActive ? 'navigation-link--current' : ''}
  `.trim();

  // Button-Stil
  if (asButton) {
    const buttonElement = (
      <Button
        type={isActive ? 'primary' : buttonType}
        size={buttonSize}
        icon={icon}
        disabled={disabled || !hasAccess}
        className={finalClasses}
        onClick={handleClick}
      >
        {children}
      </Button>
    );

    // Wrapper um Button für Navigation
    const buttonWithNavigation = (
      <Link
        to={to}
        {...linkProps}
        className="navigation-link-wrapper"
        onClick={handleClick}
        style={{ textDecoration: 'none' }}
      >
        {buttonElement}
      </Link>
    );

    return tooltip ? (
      <Tooltip title={tooltip} placement="top">
        {buttonWithNavigation}
      </Tooltip>
    ) : (
      buttonWithNavigation
    );
  }

  // Standard Link-Stil
  const linkElement = (
    <Link
      to={to}
      {...linkProps}
      className={finalClasses}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={disabled || !hasAccess}
    >
      {icon && <span className="navigation-link__icon">{icon}</span>}
      <span className="navigation-link__text">{children}</span>
    </Link>
  );

  return tooltip ? (
    <Tooltip title={tooltip} placement="right">
      {linkElement}
    </Tooltip>
  ) : (
    linkElement
  );
};

export default NavigationLink;
