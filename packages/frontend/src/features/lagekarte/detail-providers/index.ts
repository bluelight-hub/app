/**
 * Layer-Detail-Provider Initialisierung
 *
 * Registriert alle verfügbaren Provider beim Import.
 * Muss einmal importiert werden bevor die Lagekarte gerendert wird.
 */

import { dwdDetailProvider } from './dwd/dwd-detail-provider';
import { ninaDetailProvider } from './nina/nina-detail-provider';
import { registerDetailProvider } from './registry';

registerDetailProvider(dwdDetailProvider);
registerDetailProvider(ninaDetailProvider);
