export { useAuth } from './useAuth';

// Re-export auth store hooks for direct access
export {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useIsLoading,
  useAuthActions,
} from '../stores/useAuthStore';

// Export audit hooks
export {
  useAuditedAction,
  useAuditedForm,
  useAuditedNavigation,
  useAuditedDataChange,
} from './useAuditedAction';

// Export audit logger hook
export { useAuditLogger } from '../utils/audit';
