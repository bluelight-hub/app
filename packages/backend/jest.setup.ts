/**
 * Jest Setup File - Lädt .env für Integration Tests.
 *
 * Diese Datei wird vor allen Tests ausgeführt (siehe jest.config.js).
 * Sie lädt die .env Datei, damit DATABASE_URL verfügbar ist.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from backend root
config({ path: resolve(__dirname, '.env') });
