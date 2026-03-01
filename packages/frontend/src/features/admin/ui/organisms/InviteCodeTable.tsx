import { Button } from '@/shared/ui/atoms/button.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
import type { InviteCodeListItemDto } from '@/shared';
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi';
import { InviteCodeTableRow } from '../molecules/InviteCodeTableRow';

interface InviteCodeTableProps {
  invites: InviteCodeListItemDto[] | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}

/**
 * InviteCodeTable Organism
 *
 * Zeigt eine vollständige Tabelle aller Invite-Codes mit:
 * - Spalten: Code, Status, Label, Ablaufdatum, Nutzung, Ersteller, Aktionen
 * - Pagination Controls (Previous/Next, Seitenanzeige)
 * - Loading State (Skeleton)
 * - Empty State
 *
 * Pattern konsistent mit UsersTable und anderen Admin-Tabellen.
 *
 * @example
 * ```tsx
 * <InviteCodeTable
 *   invites={data}
 *   isLoading={isLoading}
 *   onPageChange={setPage}
 *   currentPage={1}
 *   totalPages={5}
 * />
 * ```
 */
export function InviteCodeTable({ invites, isLoading, onPageChange, currentPage, totalPages }: InviteCodeTableProps) {
  // Loading State: Skeleton mit 5 Zeilen und 7 Spalten (inline tbody für gültiges HTML)
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Code</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Label</Table.Head>
                <Table.Head>Ablaufdatum</Table.Head>
                <Table.Head>Nutzung</Table.Head>
                <Table.Head>Ersteller</Table.Head>
                <Table.Head>Aktionen</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <Table.Row key={`skeleton-row-${rowIndex}`}>
                  {Array.from({ length: 7 }).map((__, colIndex) => (
                    <Table.Cell key={`skeleton-cell-${rowIndex}-${colIndex}`}>
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    );
  }

  // Empty State: Keine Invite-Codes vorhanden
  if (!invites || invites.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-gray-300 border-dashed p-8 dark:border-gray-700">
        <svg className="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mb-1 font-medium text-gray-900 text-lg dark:text-gray-100">Keine Invite-Codes vorhanden</p>
        <p className="text-gray-500 text-sm dark:text-gray-400">Es wurden noch keine Invite-Codes erstellt.</p>
      </div>
    );
  }

  // Main Table with Data
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Code</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Label</Table.Head>
              <Table.Head>Ablaufdatum</Table.Head>
              <Table.Head>Nutzung</Table.Head>
              <Table.Head>Ersteller</Table.Head>
              <Table.Head>Aktionen</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invites.map((invite) => (
              <Table.Row key={invite.id}>
                <InviteCodeTableRow invite={invite} />
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-gray-200 border-t px-4 py-3 sm:px-6 dark:border-gray-800">
          <div className="flex flex-1 justify-between sm:hidden">
            {/* Mobile Pagination */}
            <Button appearance="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Vorherige Seite">
              Zurück
            </Button>
            <Button appearance="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Nächste Seite">
              Weiter
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            {/* Desktop Pagination */}
            <div>
              <p className="text-gray-700 text-sm dark:text-gray-300">
                Seite <span className="font-medium">{currentPage}</span> von <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button appearance="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Vorherige Seite">
                <PiCaretLeft className="h-4 w-4" aria-hidden="true" />
                <span className="ml-1">Zurück</span>
              </Button>
              <Button appearance="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Nächste Seite">
                <span className="mr-1">Weiter</span>
                <PiCaretRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
