import { gefaehrdungItemSchema } from '@bluelight-hub/shared/schemas';
import { z } from 'zod';
import { logger } from '@/shared/lib/logger';
import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';

export const EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY = 'bluelight:eigenschutz:pending-commands:v1';

export const eigenschutzPendingCommandV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  entityType: z.literal('gefaehrdungsbeurteilung'),
  einsatzId: z.string().min(1),
  entityId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  payload: z.object({
    items: z.array(gefaehrdungItemSchema),
  }),
  queuedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  source: z.enum(['auto-save', 'manual-finalize']),
  status: z.enum(['pending', 'conflict']).default('pending'),
  conflictReason: z.string().optional(),
});

export type EigenschutzPendingCommandV1 = z.infer<typeof eigenschutzPendingCommandV1Schema>;

const eigenschutzPendingCommandListSchema = z.array(eigenschutzPendingCommandV1Schema);
const pendingCommandListeners = new Set<() => void>();

export interface LoadPendingCommandsMetaResult {
  readonly commands: EigenschutzPendingCommandV1[];
  readonly readError: boolean;
}

export interface ReplayPendingCommandsOptions {
  readonly shouldReplay?: (command: EigenschutzPendingCommandV1) => boolean;
  readonly saveCommand: (command: EigenschutzPendingCommandV1) => Promise<void>;
  readonly isAlreadyApplied?: (command: EigenschutzPendingCommandV1, error: unknown) => Promise<boolean>;
}

function getHttpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

async function savePendingCommands(commands: EigenschutzPendingCommandV1[]): Promise<void> {
  await getStorageAdapter().setItem(EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY, JSON.stringify(commands));
  notifyPendingCommandChange();
}

export function subscribeToPendingCommandChanges(listener: () => void): () => void {
  pendingCommandListeners.add(listener);
  return () => pendingCommandListeners.delete(listener);
}

export function notifyPendingCommandChange(): void {
  for (const listener of pendingCommandListeners) {
    listener();
  }
}

export async function loadPendingCommandsWithMeta(): Promise<LoadPendingCommandsMetaResult> {
  try {
    const raw = await getStorageAdapter().getItem(EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY);
    if (!raw) return { commands: [], readError: false };

    const parsedJson = JSON.parse(raw) as unknown;
    const parsed = eigenschutzPendingCommandListSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.warn('Eigenschutz Pending Commands verworfen: Storage-Payload ist ungültig', { error: parsed.error });
      return { commands: [], readError: true };
    }
    return { commands: parsed.data, readError: false };
  } catch (error) {
    logger.warn('Eigenschutz Pending Commands verworfen: Storage-Payload konnte nicht gelesen werden', { error });
    return { commands: [], readError: true };
  }
}

export async function loadPendingCommands(): Promise<EigenschutzPendingCommandV1[]> {
  const result = await loadPendingCommandsWithMeta();
  return result.commands;
}

export async function upsertPendingCommand(command: EigenschutzPendingCommandV1): Promise<void> {
  const commands = await loadPendingCommands();
  const existingIndex = commands.findIndex(
    (candidate) =>
      candidate.source === 'auto-save' &&
      command.source === 'auto-save' &&
      candidate.entityType === command.entityType &&
      candidate.entityId === command.entityId &&
      candidate.expectedVersion === command.expectedVersion,
  );

  if (existingIndex >= 0) {
    const existing = commands.at(existingIndex);
    if (!existing) return;
    commands[existingIndex] = {
      ...existing,
      payload: command.payload,
      updatedAt: command.updatedAt,
      status: 'pending',
      conflictReason: undefined,
    };
  } else {
    commands.push(command);
  }

  await savePendingCommands(commands);
}

export async function removePendingCommand(commandId: string): Promise<void> {
  const commands = await loadPendingCommands();
  await savePendingCommands(commands.filter((command) => command.id !== commandId));
}

export async function removePendingCommandsForEntity(entityType: EigenschutzPendingCommandV1['entityType'], entityId: string): Promise<void> {
  const commands = await loadPendingCommands();
  await savePendingCommands(commands.filter((command) => command.entityType !== entityType || command.entityId !== entityId));
}

export async function markPendingCommandConflict(commandId: string, reason: string): Promise<void> {
  const commands = await loadPendingCommands();
  await savePendingCommands(
    commands.map((command) =>
      command.id === commandId
        ? {
            ...command,
            status: 'conflict',
            conflictReason: reason,
            updatedAt: new Date().toISOString(),
          }
        : command,
    ),
  );
}

function isSameEntity(a: EigenschutzPendingCommandV1, b: EigenschutzPendingCommandV1): boolean {
  return a.entityType === b.entityType && a.entityId === b.entityId;
}

function getEntityKey(command: EigenschutzPendingCommandV1): string {
  return `${command.entityType}:${command.entityId}`;
}

export async function replayPendingCommands({ shouldReplay, saveCommand, isAlreadyApplied }: ReplayPendingCommandsOptions): Promise<void> {
  let commands = (await loadPendingCommands()).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  const blockedEntityKeys = new Set(commands.filter((command) => command.status === 'conflict').map(getEntityKey));

  for (const command of commands) {
    const currentCommand = commands.find((entry) => entry.id === command.id);
    if (!currentCommand || currentCommand.status === 'conflict') continue;
    if (blockedEntityKeys.has(getEntityKey(currentCommand))) continue;
    if (shouldReplay && !shouldReplay(currentCommand)) continue;

    try {
      await saveCommand(currentCommand);
      commands = commands.filter((entry) => entry.id !== currentCommand.id);
      await savePendingCommands(commands);
    } catch (error) {
      if (getHttpStatus(error) === 409) {
        const alreadyApplied = (await isAlreadyApplied?.(currentCommand, error)) ?? false;
        if (alreadyApplied) {
          commands = commands.filter((entry) => entry.id !== currentCommand.id);
        } else {
          blockedEntityKeys.add(getEntityKey(currentCommand));
          commands = commands.map((entry) =>
            isSameEntity(entry, currentCommand)
              ? {
                  ...entry,
                  status: 'conflict',
                  conflictReason: entry.id === currentCommand.id ? 'Server-Version weicht vom lokalen Pending Command ab.' : 'Replay pausiert bis zur Konfliktlösung dieser Beurteilung.',
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          );
        }
        await savePendingCommands(commands);
        continue;
      }

      logger.warn('Eigenschutz Pending Command Replay fehlgeschlagen', {
        commandId: currentCommand.id,
        error,
      });
      break;
    }
  }
}
