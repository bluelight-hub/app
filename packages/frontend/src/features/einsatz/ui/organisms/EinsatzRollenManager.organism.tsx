/**
 * EinsatzRollenManager Organism
 *
 * Panel zur Verwaltung von Befehlsrollen pro Einsatz.
 * Zeigt alle zugewiesenen Rollen und ermöglicht Batch-Updates.
 *
 * Story 5.2 AC7
 */

import { useEinsatzRollen, useUpdateEinsatzRollen } from '@/features/einsatz/api';
import { useUsers } from '@/features/auth';
import { cn } from '@/shared/ui';
import { Button } from '@/shared/ui/atoms/button.atom';
import { EinsatzRolleDtoRolleEnum } from '@/shared';
import type { RollenZuweisungDtoRolleEnum } from '@/shared';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useCallback, useMemo, useState } from 'react';
import { PiCaretUpDown, PiCheck, PiFloppyDisk, PiPlus, PiSpinner, PiTrash, PiWarning } from 'react-icons/pi';

/** Rollen-Labels für Anzeige */
const ROLLEN_LABELS: Record<string, string> = {
  BEFEHLSGEBER: 'Befehlsgeber',
  ERSTELLER: 'Ersteller',
  EMPFAENGER: 'Empfänger',
  BEOBACHTER: 'Beobachter',
};

/** Alle verfügbaren Rollen */
const ALLE_ROLLEN = Object.values(EinsatzRolleDtoRolleEnum);

/** Lokaler State für eine Rollenzuweisung */
interface RollenZeile {
  userId: string;
  userName: string;
  rolle: string;
  isNew?: boolean;
}

interface EinsatzRollenManagerProps {
  einsatzId: string;
}

export function EinsatzRollenManager({ einsatzId }: EinsatzRollenManagerProps) {
  const { data: rollen, isLoading, isError, error } = useEinsatzRollen(einsatzId);
  const { data: users = [], isError: isUsersError } = useUsers();
  const updateMutation = useUpdateEinsatzRollen(einsatzId);

  const [localRollen, setLocalRollen] = useState<RollenZeile[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [userSuche, setUserSuche] = useState('');
  const [showUserSuche, setShowUserSuche] = useState(false);

  /** Sync lokale Daten wenn Server-Daten geladen werden */
  const effectiveRollen = useMemo(() => {
    if (hasChanges) return localRollen;
    return (rollen ?? []).map((r) => ({
      userId: r.userId,
      userName: r.userName,
      rolle: r.rolle,
    }));
  }, [rollen, localRollen, hasChanges]);

  /** User die noch keine Rolle haben */
  const verfuegbareUsers = useMemo(() => {
    const zugewieseneIds = new Set(effectiveRollen.map((r) => r.userId));
    return users.filter((u) => !zugewieseneIds.has(u.id));
  }, [users, effectiveRollen]);

  /** Gefilterte User für Combobox */
  const gefilterteUsers = useMemo(() => {
    if (!userSuche.trim()) return verfuegbareUsers;
    const query = userSuche.toLowerCase().trim();
    return verfuegbareUsers.filter((u) => u.username.toLowerCase().includes(query));
  }, [verfuegbareUsers, userSuche]);

  /** Initialisiert lokale Rollen aus Server-Daten falls noch nicht geschehen */
  const getOrInitRollen = useCallback(
    (prev: RollenZeile[]): RollenZeile[] => {
      if (prev.length > 0) return prev;
      return (rollen ?? []).map((r) => ({ userId: r.userId, userName: r.userName, rolle: r.rolle }));
    },
    [rollen],
  );

  const startEditing = useCallback(() => {
    if (!hasChanges && rollen) {
      setLocalRollen(rollen.map((r) => ({ userId: r.userId, userName: r.userName, rolle: r.rolle })));
    }
  }, [hasChanges, rollen]);

  const handleRolleChange = useCallback(
    (userId: string, neueRolle: string) => {
      startEditing();
      setLocalRollen((prev) => {
        const updated = getOrInitRollen(prev);
        return updated.map((r) => (r.userId === userId ? { ...r, rolle: neueRolle } : r));
      });
      setHasChanges(true);
    },
    [startEditing, getOrInitRollen],
  );

  const handleRemoveUser = useCallback(
    (userId: string) => {
      startEditing();
      setLocalRollen((prev) => {
        const current = getOrInitRollen(prev);
        return current.filter((r) => r.userId !== userId);
      });
      setHasChanges(true);
    },
    [startEditing, getOrInitRollen],
  );

  const handleAddUser = useCallback(
    (userId: string, userName: string) => {
      startEditing();
      setLocalRollen((prev) => {
        const current = getOrInitRollen(prev);
        if (current.some((r) => r.userId === userId)) return current;
        return [...current, { userId, userName, rolle: EinsatzRolleDtoRolleEnum.Beobachter, isNew: true }];
      });
      setHasChanges(true);
      setShowUserSuche(false);
      setUserSuche('');
    },
    [startEditing, getOrInitRollen],
  );

  const handleSave = useCallback(() => {
    const zuweisungen = effectiveRollen.map((r) => ({
      userId: r.userId,
      rolle: r.rolle as RollenZuweisungDtoRolleEnum,
    }));
    updateMutation.mutate(
      { zuweisungen },
      {
        onSuccess: () => {
          setHasChanges(false);
          setLocalRollen([]);
        },
      },
    );
  }, [effectiveRollen, updateMutation]);

  const handleReset = useCallback(() => {
    setLocalRollen([]);
    setHasChanges(false);
  }, []);

  if (isLoading) {
    return (
      <output className="flex items-center justify-center py-12" aria-label="Rollen werden geladen">
        <PiSpinner className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500 text-sm">Rollen werden geladen...</span>
      </output>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
        <div className="flex items-center gap-2">
          <PiWarning className="h-5 w-5 text-red-500" />
          <p className="font-medium text-red-800 text-sm dark:text-red-200">Fehler beim Laden der Rollen</p>
        </div>
        <p className="mt-1 text-red-700 text-xs dark:text-red-300">{error?.message ?? 'Unbekannter Fehler'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Rollen verwalten</h2>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button appearance="ghost" size="sm" onClick={handleReset} disabled={updateMutation.isPending}>
              Verwerfen
            </Button>
          )}
          <Button intent="primary" size="sm" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} aria-label="Alle Rollenzuweisungen speichern">
            {updateMutation.isPending ? (
              <>
                <PiSpinner className="mr-1.5 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <PiFloppyDisk className="mr-1.5 h-4 w-4" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rollen-Tabelle */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label="Rollenzuweisungen">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                Benutzer
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                Rolle
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {effectiveRollen.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm dark:text-gray-400">
                  Keine Rollen zugewiesen. Fügen Sie Benutzer hinzu.
                </td>
              </tr>
            ) : (
              effectiveRollen.map((zeile) => (
                <tr key={zeile.userId} className={cn(zeile.isNew && 'bg-green-50 dark:bg-green-900/10')}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 text-sm dark:text-gray-100">{zeile.userName}</td>
                  <td className="px-4 py-3">
                    <RollenDropdown value={zeile.rolle} onChange={(rolle) => handleRolleChange(zeile.userId, rolle)} userName={zeile.userName} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      appearance="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(zeile.userId)}
                      disabled={updateMutation.isPending}
                      aria-label={`${zeile.userName} entfernen`}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <PiTrash className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User hinzufügen */}
      {showUserSuche ? (
        <UserSucheCombobox users={gefilterteUsers} query={userSuche} onQueryChange={setUserSuche} onSelect={handleAddUser} onClose={() => setShowUserSuche(false)} isUsersError={isUsersError} />
      ) : (
        <Button appearance="ghost" size="sm" onClick={() => setShowUserSuche(true)} className="w-full justify-center" aria-label="Benutzer zur Rollenzuweisung hinzufügen">
          <PiPlus className="mr-1.5 h-4 w-4" />
          Benutzer hinzufügen
        </Button>
      )}
    </div>
  );
}

/** Dropdown für Rollenauswahl */
function RollenDropdown({ value, onChange, userName }: { value: string; onChange: (value: string) => void; userName: string }) {
  return (
    <Listbox as="div" value={value} onChange={onChange}>
      <ListboxButton
        className={cn('flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm', 'hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700')}
        aria-label={`Rolle für ${userName} auswählen`}
      >
        <span className="text-gray-900 dark:text-gray-100">{ROLLEN_LABELS[value] ?? value}</span>
        <PiCaretUpDown className="h-3.5 w-3.5 text-gray-400" />
      </ListboxButton>
      <ListboxOptions className="z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700" anchor="bottom start">
        {ALLE_ROLLEN.map((rolle) => (
          <ListboxOption key={rolle} value={rolle} className={cn('flex cursor-pointer items-center gap-2 px-3 py-2 text-sm', 'data-[focus]:bg-blue-50 dark:data-[focus]:bg-blue-900/20')}>
            {({ selected }) => (
              <>
                <PiCheck className={cn('h-4 w-4', selected ? 'text-blue-600' : 'invisible')} />
                <span className={cn(selected && 'font-medium', 'text-gray-900 dark:text-gray-100')}>{ROLLEN_LABELS[rolle]}</span>
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}

/** Combobox für User-Suche */
function UserSucheCombobox({
  users,
  query: _query,
  onQueryChange,
  onSelect,
  onClose,
  isUsersError,
}: {
  users: { id: string; username: string }[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (userId: string, userName: string) => void;
  onClose: () => void;
  isUsersError: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Combobox
          as="div"
          onChange={(user: { id: string; username: string } | null) => {
            if (user) onSelect(user.id, user.username);
          }}
        >
          <div className="relative">
            <ComboboxInput
              className={cn(
                'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
              )}
              placeholder="Benutzer suchen..."
              displayValue={(user: { username: string } | null) => user?.username ?? ''}
              onChange={(e) => onQueryChange(e.target.value)}
              aria-label="Benutzer suchen"
              autoFocus
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
              <PiCaretUpDown className="h-4 w-4 text-gray-400" />
            </ComboboxButton>
          </div>
          <ComboboxOptions className="z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700" anchor="bottom start">
            {isUsersError ? (
              <div className="p-2 text-red-400 text-sm">Fehler beim Laden der Benutzer</div>
            ) : users.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">Keine Benutzer gefunden</div>
            ) : (
              users.map((user) => (
                <ComboboxOption key={user.id} value={user} className={cn('flex cursor-pointer items-center px-3 py-2 text-sm', 'data-[focus]:bg-blue-50 dark:data-[focus]:bg-blue-900/20')}>
                  <span className="text-gray-900 dark:text-gray-100">{user.username}</span>
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </Combobox>
      </div>
      <Button appearance="ghost" size="sm" onClick={onClose}>
        Abbrechen
      </Button>
    </div>
  );
}
