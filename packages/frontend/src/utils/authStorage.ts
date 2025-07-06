import { isTauri } from '@tauri-apps/api/core';
import { load, type Store } from '@tauri-apps/plugin-store';

interface AuthTokens {
  authToken: string | null;
  refreshToken: string | null;
}

/**
 * Sichere Auth-Storage Implementierung
 * Verwendet Tauri Store für native Apps, localStorage für Browser
 */
class AuthStorage {
  private store: Store | null = null;
  private initialized = false;
  private isRunningInTauri = false;

  private async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    try {
      this.isRunningInTauri = await isTauri();

      if (this.isRunningInTauri) {
        // Use the load function to create or load the store
        this.store = await load('auth.json', { autoSave: true });
      }
    } catch (error) {
      console.warn('Tauri Store initialization failed, using localStorage:', error);
      this.store = null;
    }

    this.initialized = true;
  }

  async setTokens(authToken: string, refreshToken?: string): Promise<void> {
    await this.ensureInitialized();

    if (this.store && this.isRunningInTauri) {
      // Tauri Store (autoSave is enabled)
      await this.store.set('auth_token', authToken);
      if (refreshToken) {
        await this.store.set('refresh_token', refreshToken);
      }
    } else {
      // Browser localStorage
      localStorage.setItem('auth_token', authToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
  }

  async getTokens(): Promise<AuthTokens> {
    await this.ensureInitialized();

    if (this.store && this.isRunningInTauri) {
      // Tauri Store
      const authToken = await this.store.get<string>('auth_token');
      const refreshToken = await this.store.get<string>('refresh_token');
      return {
        authToken: authToken || null,
        refreshToken: refreshToken || null,
      };
    } else {
      // Browser localStorage
      return {
        authToken: localStorage.getItem('auth_token'),
        refreshToken: localStorage.getItem('refresh_token'),
      };
    }
  }

  async clearTokens(): Promise<void> {
    await this.ensureInitialized();

    if (this.store && this.isRunningInTauri) {
      // Tauri Store (autoSave is enabled)
      await this.store.delete('auth_token');
      await this.store.delete('refresh_token');
      await this.store.delete('user');
    } else {
      // Browser localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  async hasValidTokens(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens.authToken !== null;
  }
}

// Singleton instance
export const authStorage = new AuthStorage();
export default authStorage;
