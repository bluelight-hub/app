import type { UserResponseDto } from '@bluelight-hub/shared/client';

/**
 * Auth-Context State Interface für den React Context
 */
export interface AuthContextState {
  currentUser: UserResponseDto | null;
  isAdminAuthenticated: boolean;
  login: (user: UserResponseDto) => void;
  logout: () => void;
  adminLogin: () => void;
  adminLogout: () => void;
  reset: () => void;
}
