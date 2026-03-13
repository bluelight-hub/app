import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EinsatzSelectionStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EinsatzSelectionState({ eyebrow, title, description, icon, actions, className }: EinsatzSelectionStateProps) {
  return (
    <Card className={cn('rounded-[24px] border-slate-200/80 bg-white/92 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.28)] dark:border-slate-800/80 dark:bg-slate-950/60', className)}>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{icon}</div>
        <div className="space-y-2">
          {eyebrow ? <p className="font-semibold text-[11px] text-slate-500 uppercase tracking-[0.18em] dark:text-slate-400">{eyebrow}</p> : null}
          <h3 className="font-semibold text-lg text-slate-950 dark:text-slate-50">{title}</h3>
          <p className="max-w-xl text-slate-600 text-sm leading-6 dark:text-slate-300">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}
