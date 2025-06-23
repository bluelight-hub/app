import { logger } from './logger';
import { useAuthStore } from '../stores/useAuthStore';

interface RequestContext {
  url: string;
  init: RequestInit;
  retryCount?: number;
}

const MAX_RETRY_COUNT = 1;
const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/**
 * Middleware to handle authentication and automatic token refresh
 */
export const authInterceptorMiddleware = {
  pre: async (context: RequestContext) => {
    const authStore = useAuthStore.getState();
    const { accessToken } = authStore;

    // Add auth token to requests if available
    if (accessToken) {
      context.init.headers = {
        ...context.init.headers,
        Authorization: `Bearer ${accessToken}`,
      };
    }

    return context;
  },

  post: async (context: { url: string; init: RequestInit; response: Response }) => {
    const { response } = context;

    // Skip auth endpoints to prevent infinite loops
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) => context.url.includes(endpoint));

    if (isAuthEndpoint) {
      return context;
    }

    // Handle 401 Unauthorized responses
    if (response.status === 401) {
      const authStore = useAuthStore.getState();
      const retryCount = (context as RequestContext & { retryCount?: number }).retryCount || 0;

      // Only retry once
      if (retryCount >= MAX_RETRY_COUNT) {
        logger.warn('Max retry count reached, logging out');
        await authStore.logout();
        return context;
      }

      logger.info('Received 401, attempting token refresh');

      // Attempt to refresh the token
      const refreshSuccess = await authStore.refreshAccessToken();

      if (refreshSuccess) {
        logger.info('Token refresh successful, retrying request');

        // Get the updated access token
        const { accessToken } = useAuthStore.getState();

        // Clone the request with new auth header
        const newInit = {
          ...context.init,
          headers: {
            ...context.init.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        };

        // Retry the request
        try {
          const retryResponse = await fetch(context.url, newInit);

          // Return the new response
          return {
            ...context,
            response: retryResponse,
            retryCount: retryCount + 1,
          };
        } catch (error) {
          logger.error('Retry request failed', { error });
        }
      } else {
        logger.warn('Token refresh failed, logging out');
        await authStore.logout();
      }
    }

    return context;
  },
};

/**
 * Custom fetch with automatic token refresh on 401
 */
export const fetchWithAuth = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  const context = { url, init: init || {} };

  // Apply pre-request middleware
  const preContext = await authInterceptorMiddleware.pre(context);

  // Make the request with credentials
  const response = await fetch(preContext.url, {
    ...preContext.init,
    credentials: 'include',
  });

  // Apply post-request middleware
  const postContext = await authInterceptorMiddleware.post({
    ...preContext,
    response,
  });

  return postContext.response;
};
