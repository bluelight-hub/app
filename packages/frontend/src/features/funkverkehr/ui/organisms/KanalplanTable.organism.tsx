/**
 * KanalplanTable
 *
 * Tabelle der Funkkanäle eines Einsatzes mit Drag-and-Drop-Sortierung
 * (via `@dnd-kit`). Das `useReorderFunkkanaele`-Mutation-Hook macht
 * optimistische Updates — die Tabelle selbst bleibt daher rein darstellend.
 *
 * Bewusst *ohne* `shared/ui/organisms/data-table` gebaut, weil der Drag-Handle
 * pro Zeile + sortierbare Rows dort nicht unterstützt werden.
 */

import { useReorderFunkkanaele } from '@/features/funkverkehr/api';
import { KanalStatusBadge } from '@/features/funkverkehr/ui/atoms/KanalStatusBadge.atom';
import { formatKanalKennung, getKanalTypLabel } from '@/features/funkverkehr/utils/format-kanal-details';
import { cn } from '@/shared/ui/cn';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useCallback, useMemo } from 'react';
import { PiDotsSixVertical, PiDotsThreeVertical } from 'react-icons/pi';

export interface KanalplanTableProps {
  einsatzId: string;
  kanaele: FunkkanalResponseDto[];
  onEdit?: (kanal: FunkkanalResponseDto) => void;
  onArchive?: (kanal: FunkkanalResponseDto) => void;
  onToggleStatus?: (kanal: FunkkanalResponseDto) => void;
}

export function KanalplanTable({ einsatzId, kanaele, onEdit, onArchive, onToggleStatus }: KanalplanTableProps) {
  const reorderMutation = useReorderFunkkanaele(einsatzId);

  const sortedKanaele = useMemo(() => [...kanaele].sort((a, b) => a.sortIndex - b.sortIndex), [kanaele]);
  const ids = useMemo(() => sortedKanaele.map((k) => k.id), [sortedKanaele]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = [...ids];
      reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, active.id as string);
      const ordering = reordered.map((kanalId, index) => ({ kanalId, sortIndex: index }));
      reorderMutation.mutate({ ordering });
    },
    [ids, reorderMutation],
  );

  if (kanaele.length === 0) {
    return <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Noch keine Funkkanäle angelegt.</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-hidden rounded border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-sm" aria-label="Kanalplan">
          <thead className="bg-slate-50 text-left text-xs uppercase dark:bg-slate-900">
            <tr>
              <th scope="col" className="w-8 px-2 py-2" aria-label="Reihenfolge" />
              <th scope="col" className="px-3 py-2">
                Name
              </th>
              <th scope="col" className="px-3 py-2">
                Typ
              </th>
              <th scope="col" className="px-3 py-2">
                Kennung
              </th>
              <th scope="col" className="px-3 py-2">
                Zuordnungen
              </th>
              <th scope="col" className="px-3 py-2">
                Status
              </th>
              <th scope="col" className="w-10 px-2 py-2" aria-label="Aktionen" />
            </tr>
          </thead>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <tbody>
              {sortedKanaele.map((kanal) => (
                <KanalRow key={kanal.id} kanal={kanal} onEdit={onEdit} onArchive={onArchive} onToggleStatus={onToggleStatus} />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>
    </DndContext>
  );
}

interface KanalRowProps {
  kanal: FunkkanalResponseDto;
  onEdit?: (kanal: FunkkanalResponseDto) => void;
  onArchive?: (kanal: FunkkanalResponseDto) => void;
  onToggleStatus?: (kanal: FunkkanalResponseDto) => void;
}

function KanalRow({ kanal, onEdit, onArchive, onToggleStatus }: KanalRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: kanal.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className={cn('border-t border-slate-200 dark:border-slate-800', isDragging && 'bg-blue-50 dark:bg-blue-950')}>
      <td className="w-8 px-2 py-2 text-center align-middle">
        <button
          type="button"
          aria-label={`Reihenfolge für ${kanal.name} ändern`}
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-800"
        >
          <PiDotsSixVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </td>
      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{kanal.name}</td>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">{getKanalTypLabel(kanal.details)}</span>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">{formatKanalKennung(kanal.details)}</td>
      <td className="px-3 py-2">
        <ZuordnungChipList zuordnungen={kanal.zuordnungen} />
      </td>
      <td className="px-3 py-2">
        <KanalStatusBadge status={kanal.status} />
      </td>
      <td className="w-10 px-2 py-2 text-right">
        <Menu>
          <MenuButton aria-label={`Aktionen für ${kanal.name}`} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <PiDotsThreeVertical className="h-4 w-4" aria-hidden="true" />
          </MenuButton>
          <MenuItems anchor="bottom end" className="z-20 mt-1 w-44 rounded border border-slate-200 bg-white py-1 text-sm shadow-lg focus:outline-none dark:border-slate-700 dark:bg-slate-900">
            {onEdit && (
              <MenuItem>
                <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onEdit(kanal)}>
                  Bearbeiten
                </button>
              </MenuItem>
            )}
            {onToggleStatus && kanal.status !== 'archiviert' && (
              <MenuItem>
                <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onToggleStatus(kanal)}>
                  {kanal.status === 'aktiv' ? 'Deaktivieren' : 'Aktivieren'}
                </button>
              </MenuItem>
            )}
            {onArchive && kanal.status !== 'archiviert' && (
              <MenuItem>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => onArchive(kanal)}>
                  Archivieren
                </button>
              </MenuItem>
            )}
          </MenuItems>
        </Menu>
      </td>
    </tr>
  );
}

interface ZuordnungChipListProps {
  zuordnungen: FunkkanalResponseDto['zuordnungen'];
}

function ZuordnungChipList({ zuordnungen }: ZuordnungChipListProps) {
  if (zuordnungen.length === 0) return <span className="text-xs text-slate-400">—</span>;
  const primaer = zuordnungen.filter((z) => z.rolle === 'primaer');
  const rest = zuordnungen.filter((z) => z.rolle !== 'primaer');
  return (
    <ul role="list" className="flex flex-wrap gap-1">
      {primaer.map((z) => (
        <li key={z.id} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {z.rufnameSnapshot}
        </li>
      ))}
      {rest.map((z) => (
        <li key={z.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {z.rufnameSnapshot}
          <span className="text-[10px] uppercase">({z.rolle})</span>
        </li>
      ))}
    </ul>
  );
}
