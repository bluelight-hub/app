import { Configuration } from "@bluelight-hub/shared/client";
import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
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
const customFetch = async (
  url: string,
  init: RequestInit
): Promise<Response> => {
  try {
    if (isTauri()) {
      return await tauriFetch(url, init);
    } else {
      // In browser, use standard fetch
      return await fetch(url, init);
    }
  } catch (error) {
    logger.error("Fetch error", { url, error });
    throw error;
  }
};

export const apiConfiguration = new Configuration({
  basePath: getBaseUrl(),
  fetchApi: customFetch,
});
