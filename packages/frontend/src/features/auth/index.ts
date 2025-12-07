/**
 * Auth Feature Module
 *
 * TanStack-Native Feature Architecture für Authentication & User Management.
 *
 * @module features/auth
 */

// API Hooks
export * from './api';

// Guards
export { AuthGuard, AdminGuard } from './guards/auth-guard';
export { AppGuard } from './guards/app-guard';

// Stores
export { authStore, setAuthStatus, setShowReauthModal, setRedirectAfterLogin, resetAuthStore } from './stores/auth.store';

// Schemas
export * from './schemas/auth.schema';

// Utils
export * from './utils/auth';

// UI Components
export * from './ui';
