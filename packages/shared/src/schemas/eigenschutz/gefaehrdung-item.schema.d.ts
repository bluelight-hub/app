import { z } from 'zod';
export declare const EINTRITTSWAHRSCHEINLICHKEIT_WERTE: readonly ['SELTEN', 'GELEGENTLICH', 'HAEUFIG', 'OFT', 'STAENDIG'];
export type Eintrittswahrscheinlichkeit = (typeof EINTRITTSWAHRSCHEINLICHKEIT_WERTE)[number];
export declare const eintrittswahrscheinlichkeitSchema: z.ZodEnum<{
  SELTEN: 'SELTEN';
  GELEGENTLICH: 'GELEGENTLICH';
  HAEUFIG: 'HAEUFIG';
  OFT: 'OFT';
  STAENDIG: 'STAENDIG';
}>;
export declare const SCHADENSAUSMASS_WERTE: readonly ['VERNACHLAESSIGBAR', 'GERING', 'MITTEL', 'HOCH', 'KATASTROPHAL'];
export type Schadensausmass = (typeof SCHADENSAUSMASS_WERTE)[number];
export declare const schadensausmassSchema: z.ZodEnum<{
  MITTEL: 'MITTEL';
  HOCH: 'HOCH';
  VERNACHLAESSIGBAR: 'VERNACHLAESSIGBAR';
  GERING: 'GERING';
  KATASTROPHAL: 'KATASTROPHAL';
}>;
export declare const RISIKOKLASSE_WERTE: readonly ['GRUEN', 'GELB', 'ORANGE', 'ROT'];
export type Risikoklasse = (typeof RISIKOKLASSE_WERTE)[number];
export declare const risikoklasseSchema: z.ZodEnum<{
  GRUEN: 'GRUEN';
  GELB: 'GELB';
  ORANGE: 'ORANGE';
  ROT: 'ROT';
}>;
export declare const GEFAEHRDUNG_ITEM_LIMITS: {
  readonly titleMax: 120;
  readonly descriptionMax: 2000;
  readonly schutzmassnahmenMax: 2000;
};
export declare const gefaehrdungItemSchema: z.ZodObject<
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
>;
export type GefaehrdungItem = z.infer<typeof gefaehrdungItemSchema>;
