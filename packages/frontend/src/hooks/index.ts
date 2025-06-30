export { useAuth } from './useAuth';

// Re-export auth store hooks for direct access
export {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useIsLoading,
  useAuthActions,
} from '../stores/useAuthStore';
