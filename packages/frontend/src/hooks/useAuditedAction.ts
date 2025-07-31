import { useCallback } from 'react';
import { useAuditLogger, AuditContext } from '../utils/audit';
import { logger } from '../utils/logger';

/**
 * Hook für auditierte Aktionen
 * Umschließt eine Aktion mit Audit-Logging
 */
export function useAuditedAction<T extends (...args: any[]) => any>(
  action: T,
  auditContext: Partial<AuditContext> | ((args: Parameters<T>) => Partial<AuditContext>),
): T {
  const audit = useAuditLogger();

  return useCallback(
    async (...args: Parameters<T>) => {
      const context = typeof auditContext === 'function' ? auditContext(args) : auditContext;
      
      try {
        logger.debug('Executing audited action', {
          action: context.action,
          resource: context.resource,
        });

        const result = await action(...args);

        // Log success
        await audit.logSuccess(
          context.action || 'unknown-action',
          context.resource || 'unknown-resource',
          {
            ...context,
            metadata: {
              ...context.metadata,
              result: typeof result === 'object' ? { id: result?.id } : undefined,
            },
          }
        );

        return result;
      } catch (error) {
        // Log error
        await audit.logError(
          context.action || 'unknown-action',
          context.resource || 'unknown-resource',
          error as Error,
          context
        );

        throw error;
      }
    },
    [action, audit]
  ) as T;
}

/**
 * Hook für auditierte Form-Übermittlungen
 */
export function useAuditedForm<T extends Record<string, any>>(
  resource: string,
  action: string,
  onSubmit: (data: T) => Promise<void>,
) {
  const audit = useAuditLogger();

  const handleSubmit = useCallback(
    async (data: T) => {
      const startTime = Date.now();

      try {
        logger.debug('Form submission started', { resource, action });

        await onSubmit(data);

        await audit.logSuccess(`form-submit-${action}`, resource, {
          metadata: {
            duration: Date.now() - startTime,
            formFields: Object.keys(data),
          },
        });
      } catch (error) {
        await audit.logError(
          `form-submit-${action}`,
          resource,
          error as Error,
          {
            metadata: {
              duration: Date.now() - startTime,
              formFields: Object.keys(data),
            },
          }
        );

        throw error;
      }
    },
    [audit, resource, action, onSubmit]
  );

  return handleSubmit;
}

/**
 * Hook für auditierte Navigation
 */
export function useAuditedNavigation() {
  const audit = useAuditLogger();

  const logNavigation = useCallback(
    async (to: string, from?: string) => {
      await audit.log({
        action: 'navigate',
        resource: 'navigation',
        actionType: audit.logSuccess as any, // This will be AuditActionType.READ
        metadata: {
          to,
          from,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [audit]
  );

  return { logNavigation };
}

/**
 * Hook für auditierte Datenänderungen
 */
export function useAuditedDataChange<T extends Record<string, any>>(
  resource: string,
  resourceId: string,
) {
  const audit = useAuditLogger();

  const logDataChange = useCallback(
    async (
      action: string,
      oldData: T,
      newData: T,
      additionalContext?: Partial<AuditContext>
    ) => {
      await audit.logDataChange(
        action,
        resource,
        resourceId,
        oldData,
        newData,
        additionalContext
      );
    },
    [audit, resource, resourceId]
  );

  return { logDataChange };
}