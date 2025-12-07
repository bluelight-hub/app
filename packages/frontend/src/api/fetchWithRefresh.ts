import { logger } from '@/shared/utils/logger';
import { AuthApi, Configuration } from '@bluelight-hub/shared/client';
import { getBaseUrl } from './api';

/**
 * Custom fetch wrapper that handles automatic token refresh on 401 errors
 *
 * This wrapper intercepts 401 responses and attempts to refresh the access token
 * using the refresh token. If successful, it retries the original request.
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the access token using the refresh token
 * Uses the generated API client instead of manual fetch
 * @returns Promise<boolean> - true if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    // Use the generated API client for refresh
    const authApi = new AuthApi(
      new Configuration({
        basePath: getBaseUrl(),
        fetchApi: fetch, // Use standard fetch for refresh to avoid recursion
        credentials: 'include',
      }),
    );

    await authApi.authControllerRefresh();
    logger.debug('Token refresh successful');
    return true;
  } catch (error) {
    logger.warn('Token refresh failed', { error });
    return false;
  }
}

/**
 * Enhanced fetch function with automatic token refresh on 401
 *
 * @param input - The resource URL or Request object
 * @param init - Optional request initialization options
 * @returns Promise<Response> - The fetch response
 */
export async function fetchWithRefresh(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Always include credentials for cookie-based auth
  const enhancedInit: RequestInit = {
    ...init,
    credentials: 'include',
  };

  // Make the initial request
  let response = await fetch(input, enhancedInit);

  // If we get a 401, try to refresh the token
  if (response.status === 401) {
    logger.debug('Received 401, attempting token refresh');

    // Prevent multiple simultaneous refresh attempts
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    // Wait for the refresh to complete with robust state reset
    let refreshSuccess = false;
    try {
      if (refreshPromise) {
        refreshSuccess = await refreshPromise;
      } else {
        refreshSuccess = false;
      }
    } catch (error) {
      // Guard against unexpected throws from refreshAccessToken
      logger.warn('Token refresh threw an error', { error });
      refreshSuccess = false;
    } finally {
      // Always clear refresh state
      isRefreshing = false;
      refreshPromise = null;
    }

    if (refreshSuccess) {
      // Retry the original request with the new token
      logger.debug('Retrying original request after token refresh');
      response = await fetch(input, enhancedInit);
    } else {
      // Refresh failed, redirect to login
      logger.warn('Token refresh failed, redirecting to login');
      // The 401 will be handled by the error boundary/auth context
    }
  }

  return response;
}
