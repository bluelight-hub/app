import { QuittierenBefehlDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';
import { z } from 'zod';

/**
 * Zod Schema für die Quittierung eines Befehls
 *
 * Validiert die Formular-Eingaben bevor sie an das Backend gesendet werden.
 */
export const quittierenBefehlSchema = z.object({
  befehlId: z.string().min(1, 'Befehl-ID ist erforderlich'),
  empfaengerId: z.string().min(1, 'Empfänger-ID ist erforderlich'),
  quittierungArt: z.nativeEnum(QuittierenBefehlDtoQuittierungArtEnum, {
    required_error: 'Quittierungsart ist erforderlich',
  }),
  kommentar: z.string().max(2000).optional(),
});

export type QuittierenBefehlFormData = z.infer<typeof quittierenBefehlSchema>;
