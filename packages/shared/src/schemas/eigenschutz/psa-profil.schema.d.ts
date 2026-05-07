import { z } from 'zod';
export declare const PsaProfilSchema: z.ZodEnum<{
  BASIS: 'BASIS';
  INFEKTION: 'INFEKTION';
  VU: 'VU';
  CBRN_PATIENT: 'CBRN_PATIENT';
  VOLLSCHUTZ: 'VOLLSCHUTZ';
}>;
export type PsaProfilValue = z.infer<typeof PsaProfilSchema>;
export declare const PSA_PROFIL_TOGGLE_LIMIT = 5;
export declare const PSA_PROFIL_EXPECTED_VERSION_MAX = 2147483647;
export declare const PsaProfilToggleSchemaV1: z.ZodObject<
  {
    profil: z.ZodEnum<{
      BASIS: 'BASIS';
      INFEKTION: 'INFEKTION';
      VU: 'VU';
      CBRN_PATIENT: 'CBRN_PATIENT';
      VOLLSCHUTZ: 'VOLLSCHUTZ';
    }>;
    aktivieren: z.ZodBoolean;
    expectedVersion: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$strip
>;
export type PsaProfilToggleInput = z.infer<typeof PsaProfilToggleSchemaV1>;
export declare const ChangePsaProfilSchemaV1: z.ZodObject<
  {
    profilToggles: z.ZodArray<
      z.ZodObject<
        {
          profil: z.ZodEnum<{
            BASIS: 'BASIS';
            INFEKTION: 'INFEKTION';
            VU: 'VU';
            CBRN_PATIENT: 'CBRN_PATIENT';
            VOLLSCHUTZ: 'VOLLSCHUTZ';
          }>;
          aktivieren: z.ZodBoolean;
          expectedVersion: z.ZodOptional<z.ZodNumber>;
        },
        z.core.$strip
      >
    >;
    begruendung: z.ZodString;
  },
  z.core.$strip
>;
export type ChangePsaProfilInput = z.infer<typeof ChangePsaProfilSchemaV1>;
export declare const BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX = 50;
export declare const BulkChangePsaProfilSchemaV1: z.ZodObject<
  {
    einheitIds: z.ZodArray<z.ZodString>;
    profilToggles: z.ZodArray<
      z.ZodObject<
        {
          profil: z.ZodEnum<{
            BASIS: 'BASIS';
            INFEKTION: 'INFEKTION';
            VU: 'VU';
            CBRN_PATIENT: 'CBRN_PATIENT';
            VOLLSCHUTZ: 'VOLLSCHUTZ';
          }>;
          aktivieren: z.ZodBoolean;
          expectedVersion: z.ZodOptional<z.ZodNumber>;
        },
        z.core.$strip
      >
    >;
    begruendung: z.ZodString;
  },
  z.core.$strip
>;
export type BulkChangePsaProfilInput = z.infer<typeof BulkChangePsaProfilSchemaV1>;
export declare const PsaProfilZuweisungDtoSchemaV1: z.ZodObject<
  {
    id: z.ZodString;
    einsatzId: z.ZodString;
    einheitId: z.ZodString;
    profil: z.ZodEnum<{
      BASIS: 'BASIS';
      INFEKTION: 'INFEKTION';
      VU: 'VU';
      CBRN_PATIENT: 'CBRN_PATIENT';
      VOLLSCHUTZ: 'VOLLSCHUTZ';
    }>;
    gueltigVon: z.ZodString;
    gueltigBis: z.ZodNullable<z.ZodString>;
    aktiviertVonUserId: z.ZodString;
    begruendung: z.ZodString;
    propagationGroupId: z.ZodString;
    version: z.ZodNumber;
  },
  z.core.$strip
>;
export type PsaProfilZuweisungDto = z.infer<typeof PsaProfilZuweisungDtoSchemaV1>;
export declare const ChangePsaProfilResponseSchemaV1: z.ZodObject<
  {
    propagationGroupId: z.ZodString;
    affected: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          einsatzId: z.ZodString;
          einheitId: z.ZodString;
          profil: z.ZodEnum<{
            BASIS: 'BASIS';
            INFEKTION: 'INFEKTION';
            VU: 'VU';
            CBRN_PATIENT: 'CBRN_PATIENT';
            VOLLSCHUTZ: 'VOLLSCHUTZ';
          }>;
          gueltigVon: z.ZodString;
          gueltigBis: z.ZodNullable<z.ZodString>;
          aktiviertVonUserId: z.ZodString;
          begruendung: z.ZodString;
          propagationGroupId: z.ZodString;
          version: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type ChangePsaProfilResponse = z.infer<typeof ChangePsaProfilResponseSchemaV1>;
