import { logger } from '@/shared/lib/logger';
import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';
import { gefaehrdungItemSchema } from '@bluelight-hub/shared/schemas';
import { z } from 'zod';

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

export interface ReplayPendingCommandsOptions {
  readonly saveCommand: (command: EigenschutzPendingCommandV1) => Promise<void>;
  readonly isAlreadyApplied?: (command: EigenschutzPendingCommandV1, error: unknown) => Promise<boolean>;
}

function getHttpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

async function savePendingCommands(commands: EigenschutzPendingCommandV1[]): Promise<void> {
  await getStorageAdapter().setItem(EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY, JSON.stringify(commands));
}

export async function loadPendingCommands(): Promise<EigenschutzPendingCommandV1[]> {
  const raw = await getStorageAdapter().getItem(EIGENSCHUTZ_PENDING_COMMANDS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsedJson = JSON.parse(raw) as unknown;
    const parsed = eigenschutzPendingCommandListSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.warn('Eigenschutz Pending Commands verworfen: Storage-Payload ist ungültig', { error: parsed.error });
      return [];
    }
    return parsed.data;
  } catch (error) {
    logger.warn('Eigenschutz Pending Commands verworfen: Storage-Payload konnte nicht gelesen werden', { error });
    return [];
  }
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
    const existing = commands[existingIndex]!;
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

export async function replayPendingCommands({ saveCommand, isAlreadyApplied }: ReplayPendingCommandsOptions): Promise<void> {
  let commands = (await loadPendingCommands()).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

  for (const command of commands) {
    if (command.status === 'conflict') continue;

    try {
      await saveCommand(command);
      commands = commands.filter((entry) => entry.id !== command.id);
      await savePendingCommands(commands);
    } catch (error) {
      if (getHttpStatus(error) === 409) {
        const alreadyApplied = (await isAlreadyApplied?.(command, error)) ?? false;
        if (alreadyApplied) {
          commands = commands.filter((entry) => entry.id !== command.id);
        } else {
          commands = commands.map((entry) =>
            entry.id === command.id
              ? {
                  ...entry,
                  status: 'conflict',
                  conflictReason: 'Server-Version weicht vom lokalen Pending Command ab.',
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          );
        }
        await savePendingCommands(commands);
        continue;
      }

      logger.warn('Eigenschutz Pending Command Replay fehlgeschlagen', { commandId: command.id, error });
      break;
    }
  }
}
