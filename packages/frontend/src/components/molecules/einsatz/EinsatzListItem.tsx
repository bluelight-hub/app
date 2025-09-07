import { EinsatzCompletenessBar } from '@/components/molecules/einsatz/einsatz-completeness-bar.molecule';
import { EinsatzStatus, EinsatzStatusBadge } from '@/components/molecules/einsatz/einsatz-status-badge.molecule';
import { formatNatoDateTime } from '@/utils/dateFormatter';
import type { EinsatzResponseDto } from '@bluelight-hub/shared/client';

interface EinsatzListItemProps {
  einsatz: EinsatzResponseDto;
}

export const EinsatzListItem = ({ einsatz }: EinsatzListItemProps) => {
  return (
    <div className="cursor-pointer px-3 py-3 transition-all hover:bg-gray-50 sm:px-4 sm:py-4 dark:hover:bg-gray-700/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2 sm:mb-2 sm:items-center">
            <h3 className="line-clamp-2 font-medium text-base text-gray-900 sm:line-clamp-1 sm:text-lg dark:text-white">{einsatz.alarmstichwort || 'Kein Alarmstichwort'}</h3>
            <EinsatzStatusBadge status={einsatz.status || EinsatzStatus.ANGELEGT} size="sm" className="flex-shrink-0" />
          </div>
          <div className="flex flex-col gap-1 text-gray-500 text-xs sm:flex-row sm:items-center sm:gap-2 sm:space-x-2 sm:text-sm dark:text-gray-400">
            <span className="font-mono">{formatNatoDateTime(einsatz.createdAt)}</span>
          </div>
          <div className="mt-2">
            <EinsatzCompletenessBar einsatz={einsatz} showTooltip={false} showPercentage={true} size="sm" className="max-w-full sm:max-w-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
