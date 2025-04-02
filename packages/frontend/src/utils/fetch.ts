import { Configuration } from "@bluelight-hub/shared/client";
import { logger } from "./logger";

// Determine the base URL based on the environment
export const getBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl && configuredUrl.trim() !== "") {
    logger.debug("Using configured API URL", { configuredUrl });

    if (configuredUrl.endsWith('/')) {
      return configuredUrl.slice(0, -1);
    }

    return configuredUrl;
  }
  // Fallback for development
  const fallbackUrl = "http://localhost:3000";
  logger.debug("Using fallback API URL", { fallbackUrl });
  return fallbackUrl;
};

// Custom fetch implementation that handles Tauri specifics
// const customFetch = async (
//   url: string,
//   init: RequestInit
// ): Promise<Response> => {
//   return await tauriFetch(url, init);
// };

export const apiConfiguration = new Configuration({
  basePath: getBaseUrl(),
  fetchApi: fetch,
});
