import type { BadgeVariant } from '../atoms/badge.atom';
import { Badge } from '../atoms/badge.atom';
import { Text } from '../atoms/text.atom';

interface StatusBadge {
  label: string;
  variant?: BadgeVariant;
  dotColor?: 'green' | 'blue' | 'red' | 'yellow';
}

interface AuthFooterProps {
  badges?: Array<StatusBadge>;
  version?: string;
  copyright?: string;
}

/**
 * Footer-Komponente für Auth-Seiten
 *
 * Zeigt Status-Badges und Versionsinformationen
 * in einem konsistenten Layout.
 */
export function AuthFooter({ badges = [{ label: 'System online', variant: 'default', dotColor: 'green' }], version, copyright }: AuthFooterProps) {
  return (
    <div className="w-full border-slate-200/80 border-t pt-5 dark:border-slate-800/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={`${badge.label}-${badge.variant || 'default'}`} variant={badge.variant || 'default'} dot dotColor={badge.dotColor}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        {(version || copyright) && (
          <Text size="xs" color="muted" className="text-left sm:text-right">
            {version && `Version ${version}`}
            {version && copyright && ' | '}
            {copyright}
          </Text>
        )}
      </div>
    </div>
  );
}
