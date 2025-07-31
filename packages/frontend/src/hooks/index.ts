export { useAuth } from './useAuth';

// Re-export auth store hooks for direct access
export { useAuthStore } from '../stores/useAuthStore';
export { useUser, useIsAuthenticated, useIsLoading, useAuthActions } from './useAuthSelectors';

// Export audit hooks
export {
  useAuditedAction,
  useAuditedForm,
  useAuditedNavigation,
  useAuditedDataChange,
} from './useAuditedAction';

// Export audit logger hook
export { useAuditLogger } from '../utils/audit';
