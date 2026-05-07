import { z } from 'zod';
export declare const cuidIdSchema: z.ZodString;
export declare const createGefaehrdungsbeurteilungSchema: z.ZodObject<
  {
    einheitId: z.ZodString;
    vorlageId: z.ZodOptional<z.ZodString>;
    gefahrenzoneId: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type CreateGefaehrdungsbeurteilungInput = z.infer<typeof createGefaehrdungsbeurteilungSchema>;
export declare const gefaehrdungsbeurteilungSchema: z.ZodObject<
  {
    id: z.ZodString;
    einsatzId: z.ZodString;
    einheitId: z.ZodString;
    vorlageId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    gefahrenzoneId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          title: z.ZodString;
          description: z.ZodOptional<z.ZodString>;
          eintritt: z.ZodOptional<
            z.ZodEnum<{
              SELTEN: 'SELTEN';
              GELEGENTLICH: 'GELEGENTLICH';
              HAEUFIG: 'HAEUFIG';
              OFT: 'OFT';
              STAENDIG: 'STAENDIG';
            }>
          >;
          schaden: z.ZodOptional<
            z.ZodEnum<{
              MITTEL: 'MITTEL';
              HOCH: 'HOCH';
              VERNACHLAESSIGBAR: 'VERNACHLAESSIGBAR';
              GERING: 'GERING';
              KATASTROPHAL: 'KATASTROPHAL';
            }>
          >;
          risikoklasse: z.ZodOptional<
            z.ZodEnum<{
              GRUEN: 'GRUEN';
              GELB: 'GELB';
              ORANGE: 'ORANGE';
              ROT: 'ROT';
            }>
          >;
          schutzmassnahmen: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    version: z.ZodNumber;
    erstelltAm: z.ZodString;
    erstelltVonUserId: z.ZodString;
    aktualisiertAm: z.ZodString;
    aktualisiertVonUserId: z.ZodString;
  },
  z.core.$strip
>;
export type Gefaehrdungsbeurteilung = z.infer<typeof gefaehrdungsbeurteilungSchema>;
export declare const gefaehrdungsbeurteilungHistorieEintragSchema: z.ZodObject<
  {
    version: z.ZodNumber;
    gueltigVon: z.ZodString;
    gueltigBis: z.ZodNullable<z.ZodString>;
    changedByUserId: z.ZodString;
    changedByUserName: z.ZodNullable<z.ZodString>;
    changedFields: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    items: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          title: z.ZodString;
          description: z.ZodOptional<z.ZodString>;
          eintritt: z.ZodOptional<
            z.ZodEnum<{
              SELTEN: 'SELTEN';
              GELEGENTLICH: 'GELEGENTLICH';
              HAEUFIG: 'HAEUFIG';
              OFT: 'OFT';
              STAENDIG: 'STAENDIG';
            }>
          >;
          schaden: z.ZodOptional<
            z.ZodEnum<{
              MITTEL: 'MITTEL';
              HOCH: 'HOCH';
              VERNACHLAESSIGBAR: 'VERNACHLAESSIGBAR';
              GERING: 'GERING';
              KATASTROPHAL: 'KATASTROPHAL';
            }>
          >;
          risikoklasse: z.ZodOptional<
            z.ZodEnum<{
              GRUEN: 'GRUEN';
              GELB: 'GELB';
              ORANGE: 'ORANGE';
              ROT: 'ROT';
            }>
          >;
          schutzmassnahmen: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const gefaehrdungsbeurteilungHistorieSchema: z.ZodObject<
  {
    aggregateVersion: z.ZodNumber;
    eintraege: z.ZodArray<
      z.ZodObject<
        {
          version: z.ZodNumber;
          gueltigVon: z.ZodString;
          gueltigBis: z.ZodNullable<z.ZodString>;
          changedByUserId: z.ZodString;
          changedByUserName: z.ZodNullable<z.ZodString>;
          changedFields: z.ZodRecord<z.ZodString, z.ZodUnknown>;
          items: z.ZodArray<
            z.ZodObject<
              {
                id: z.ZodOptional<z.ZodString>;
                title: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                eintritt: z.ZodOptional<
                  z.ZodEnum<{
                    SELTEN: 'SELTEN';
                    GELEGENTLICH: 'GELEGENTLICH';
                    HAEUFIG: 'HAEUFIG';
                    OFT: 'OFT';
                    STAENDIG: 'STAENDIG';
                  }>
                >;
                schaden: z.ZodOptional<
                  z.ZodEnum<{
                    MITTEL: 'MITTEL';
                    HOCH: 'HOCH';
                    VERNACHLAESSIGBAR: 'VERNACHLAESSIGBAR';
                    GERING: 'GERING';
                    KATASTROPHAL: 'KATASTROPHAL';
                  }>
                >;
                risikoklasse: z.ZodOptional<
                  z.ZodEnum<{
                    GRUEN: 'GRUEN';
                    GELB: 'GELB';
                    ORANGE: 'ORANGE';
                    ROT: 'ROT';
                  }>
                >;
                schutzmassnahmen: z.ZodOptional<z.ZodString>;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type GefaehrdungsbeurteilungHistorieEintrag = z.infer<typeof gefaehrdungsbeurteilungHistorieEintragSchema>;
export type GefaehrdungsbeurteilungHistorie = z.infer<typeof gefaehrdungsbeurteilungHistorieSchema>;
