import { InviteStatusBadge } from '@/features/admin/ui/atoms/InviteStatusBadge';
import { Table } from '@/shared/ui/molecules/table.molecule';
import type { InviteCodeListItemDto } from '@/shared';
import { RevokeInviteButton } from '@/features/admin';
interface InviteCodeTableRowProps {
  invite: InviteCodeListItemDto;
} /** * Table Row für einen einzelnen Invite-Code. * * Zeigt alle relevanten Informationen eines Invite-Codes in einer Tabellenzeile: * - Code (maskiert) * - Status Badge * - Label * - Ablaufdatum * - Nutzungsstatistik (useCount/maxUses) * - Ersteller * - Aktionen (Revoke Button) * * @example * ```tsx * <InviteCodeTableRow invite={inviteCodeData} /> * ``` */
export function InviteCodeTableRow({ invite }: InviteCodeTableRowProps) {
  const formatDate = (isoDate: string) => {
    return new Intl.DateTimeFormat('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(isoDate));
  };
  const isExpired = new Date(invite.expiresAt) < new Date();
  return (
    <>
      {' '}
      {/* Code (masked) */}{' '}
      <Table.Cell>
        {' '}
        <span className="font-mono text-sm">{invite.code}</span>{' '}
      </Table.Cell>{' '}
      {/* Status Badge */}{' '}
      <Table.Cell>
        {' '}
        <InviteStatusBadge status={invite.status as 'active' | 'used' | 'expired' | 'revoked'} />{' '}
      </Table.Cell>{' '}
      {/* Label */} <Table.Cell> {invite.label ? <span className="text-sm text-text-primary">{String(invite.label)}</span> : <span className="text-sm text-text-muted">-</span>} </Table.Cell>{' '}
      {/* Ablaufdatum */}{' '}
      <Table.Cell>
        {' '}
        <div className="flex flex-col">
          {' '}
          <span className={`text-sm ${isExpired ? 'text-status-danger-text' : 'text-text-primary'}`}>{formatDate(invite.expiresAt)}</span>{' '}
          {isExpired && <span className="text-xs text-status-danger-text">Abgelaufen</span>}{' '}
        </div>{' '}
      </Table.Cell>{' '}
      {/* Nutzung */}{' '}
      <Table.Cell>
        {' '}
        <span className="text-sm">
          {' '}
          {invite.useCount} / {invite.maxUses}{' '}
        </span>{' '}
      </Table.Cell>{' '}
      {/* Ersteller */}{' '}
      <Table.Cell>
        {' '}
        <span className="text-sm text-text-primary">{invite.createdBy.username}</span>{' '}
      </Table.Cell>{' '}
      {/* Aktionen */}{' '}
      <Table.Cell>
        {' '}
        <div className="flex items-center gap-2">
          {' '}
          <RevokeInviteButton inviteId={invite.id} status={invite.status as 'active' | 'used' | 'expired' | 'revoked'} />{' '}
        </div>{' '}
      </Table.Cell>{' '}
    </>
  );
}
