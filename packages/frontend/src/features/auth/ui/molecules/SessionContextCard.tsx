import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminSessionStatus } from '@/features/auth/api/use-current-user';
import { isAdmin } from '@/features/auth/utils/auth';
import { ServerNameBadge } from '@/features/server/ui/atoms';
import { cn } from '@/shared/ui/cn';
import { PiShieldCheck, PiShieldWarning, PiSignIn, PiUserCircle } from 'react-icons/pi';

const DETAIL_SURFACE_CLASSNAME = 'rounded-xl border border-slate-200/80 bg-slate-50/75 px-3.5 py-3 shadow-none dark:border-slate-800/80 dark:bg-slate-900/40';
const ACTION_BUTTON_CLASSNAME =
  'rounded-md border-slate-200/80 bg-white/90 text-slate-700 shadow-none hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-900/80';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrationszugang',
  SUPER_ADMIN: 'Super-Admin-Zugang',
  USER: 'Standardzugang',
};

interface AdminContextPresentation {
  title: string;
  description: string;
  badgeLabel: string;
  actionLabel?: string;
  surfaceClassName: string;
  badgeClassName: string;
  icon: typeof PiShieldCheck;
}

export interface SessionContextCardProps {
  username: string;
  role?: string;
  activeServerName?: string | null;
  adminSessionStatus?: AdminSessionStatus;
  adminSetupAvailable?: boolean;
  onAdminAction?: () => void | Promise<void>;
  className?: string;
}

function formatRoleLabel(role?: string): string {
  if (!role) {
    return 'Standardzugang';
  }

  const mappedLabel = ROLE_LABELS[role];
  if (mappedLabel) {
    return mappedLabel;
  }

  return role
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

function getAdminContextPresentation(role: string | undefined, adminSessionStatus: AdminSessionStatus | undefined, adminSetupAvailable: boolean | undefined): AdminContextPresentation | null {
  if (!isAdmin(role)) {
    return null;
  }

  if (adminSessionStatus === 'authenticated') {
    return {
      title: 'Admin-Sitzung aktiv',
      description: 'Verwaltungsfunktionen stehen in dieser Sitzung erweitert zur Verfügung.',
      badgeLabel: 'Admin aktiv',
      actionLabel: 'Admin-Bereich anzeigen',
      surfaceClassName: 'border-emerald-200/80 bg-emerald-50/85 text-emerald-950 dark:border-emerald-950/60 dark:bg-emerald-950/25 dark:text-emerald-100',
      badgeClassName: 'rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200',
      icon: PiShieldCheck,
    };
  }

  if (adminSetupAvailable) {
    return {
      title: 'Admin-Setup verfügbar',
      description: 'Dein Konto kann bei Bedarf eine separate Admin-Sitzung öffnen.',
      badgeLabel: 'Admin vorbereitbar',
      actionLabel: 'Admin-Setup öffnen',
      surfaceClassName: 'border-indigo-200/80 bg-indigo-50/85 text-indigo-950 dark:border-indigo-950/60 dark:bg-indigo-950/25 dark:text-indigo-100',
      badgeClassName: 'rounded-md border-indigo-200 bg-indigo-50 text-indigo-700 shadow-none dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-200',
      icon: PiShieldWarning,
    };
  }

  return {
    title: 'Admin-Rolle vorhanden',
    description: 'Die separate Admin-Sitzung ist aktuell nicht aktiv.',
    badgeLabel: 'Admin inaktiv',
    actionLabel: 'Admin-Bereich anzeigen',
    surfaceClassName: 'border-amber-200/80 bg-amber-50/85 text-amber-950 dark:border-amber-950/60 dark:bg-amber-950/25 dark:text-amber-100',
    badgeClassName: 'rounded-md border-amber-200 bg-amber-50 text-amber-800 shadow-none dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200',
    icon: PiShieldWarning,
  };
}

export function SessionContextCard({ username, role, activeServerName, adminSessionStatus, adminSetupAvailable, onAdminAction, className }: SessionContextCardProps) {
  const roleLabel = formatRoleLabel(role);
  const adminContext = getAdminContextPresentation(role, adminSessionStatus, adminSetupAvailable);
  const AdminIcon = adminContext?.icon ?? PiShieldCheck;

  return (
    <Card
      className={cn(
        'rounded-[24px] border-slate-200/80 bg-white/88 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.36)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/55 dark:shadow-none',
        className,
      )}
    >
      <CardContent className="flex flex-col gap-3.5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-[11px] text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">Sitzung</p>
            <Badge variant="outline" className="rounded-md border-sky-200 bg-sky-50 text-sky-700 shadow-none dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200">
              <PiUserCircle className="size-3.5" aria-hidden="true" />
              Authentifiziert
            </Badge>
            {adminContext && (
              <Badge variant="outline" className={cn('gap-1.5', adminContext.badgeClassName)}>
                <AdminIcon className="size-3.5" aria-hidden="true" />
                {adminContext.badgeLabel}
              </Badge>
            )}
          </div>
        </div>

        <dl className="grid gap-2 md:grid-cols-3">
          <div className={DETAIL_SURFACE_CLASSNAME}>
            <dt className="font-medium text-[11px] text-slate-500 uppercase tracking-[0.16em] dark:text-slate-400">Benutzer</dt>
            <dd className="mt-1.5 font-semibold text-slate-950 text-sm dark:text-slate-50">{username}</dd>
          </div>

          <div className={DETAIL_SURFACE_CLASSNAME}>
            <dt className="font-medium text-[11px] text-slate-500 uppercase tracking-[0.16em] dark:text-slate-400">Rolle</dt>
            <dd className="mt-1.5 font-semibold text-slate-950 text-sm dark:text-slate-50">{roleLabel}</dd>
          </div>

          <div className={DETAIL_SURFACE_CLASSNAME}>
            <dt className="font-medium text-[11px] text-slate-500 uppercase tracking-[0.16em] dark:text-slate-400">Server</dt>
            <dd className="mt-1.5">
              {activeServerName ? (
                <ServerNameBadge name={activeServerName} size="lg" className="font-semibold text-slate-900 dark:text-slate-100" />
              ) : (
                <span className="font-semibold text-slate-950 text-sm dark:text-slate-50">Kein Server aktiv</span>
              )}
            </dd>
          </div>
        </dl>

        {adminContext && (
          <div className={cn('rounded-xl border px-3.5 py-3 shadow-none', adminContext.surfaceClassName)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <AdminIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-6">
                  <span className="font-semibold">{adminContext.title}:</span> {adminContext.description}
                </p>
              </div>

              {adminContext.actionLabel && onAdminAction ? (
                <Button type="button" variant="outline" size="sm" onClick={onAdminAction} className={cn(ACTION_BUTTON_CLASSNAME, 'sm:shrink-0')}>
                  <PiSignIn aria-hidden="true" />
                  {adminContext.actionLabel}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
