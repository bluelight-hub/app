import type { UserResponseDto } from '@/shared';

/**
 * Auth-Context State Interface für den React Context
 */
export interface AuthContextState {
  currentUser: UserResponseDto | null;
  isAdminAuthenticated: boolean;
  login: (user: UserResponseDto) => Promise<void>;
  logout: () => Promise<void>;
  adminLogin: () => Promise<void>;
  adminLogout: () => Promise<void>;
  reset: () => Promise<void>;
}
