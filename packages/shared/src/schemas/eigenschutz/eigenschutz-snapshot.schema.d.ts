import { z } from 'zod';
export declare const GefaehrdungsbeurteilungSnapshotV1: z.ZodObject<
  {
    versionId: z.ZodString;
    version: z.ZodNumber;
    gueltigVon: z.ZodString;
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
  z.core.$strict
>;
export type GefaehrdungsbeurteilungSnapshotV1Type = z.infer<typeof GefaehrdungsbeurteilungSnapshotV1>;
export declare const PsaProfilSnapshotV1: z.ZodObject<
  {
    id: z.ZodString;
    profil: z.ZodEnum<{
      BASIS: 'BASIS';
      INFEKTION: 'INFEKTION';
      VU: 'VU';
      CBRN_PATIENT: 'CBRN_PATIENT';
      VOLLSCHUTZ: 'VOLLSCHUTZ';
    }>;
    gueltigVon: z.ZodString;
    gueltigBis: z.ZodNullable<z.ZodString>;
    begruendung: z.ZodString;
    propagationGroupId: z.ZodString;
  },
  z.core.$strict
>;
export type PsaProfilSnapshotV1Type = z.infer<typeof PsaProfilSnapshotV1>;
export declare const SicherheitsregelSnapshotV1: z.ZodObject<
  {
    regelId: z.ZodString;
    versionId: z.ZodString;
    version: z.ZodNumber;
    titel: z.ZodString;
    inhalt: z.ZodString;
    einsatzweit: z.ZodBoolean;
    einheitIds: z.ZodArray<z.ZodString>;
    gueltigVon: z.ZodString;
  },
  z.core.$strict
>;
export type SicherheitsregelSnapshotV1Type = z.infer<typeof SicherheitsregelSnapshotV1>;
export declare const EigenschutzKontextSnapshotV1: z.ZodObject<
  {
    schemaVersion: z.ZodLiteral<1>;
    snapshotAt: z.ZodString;
    einsatzId: z.ZodString;
    einheitId: z.ZodString;
    gefaehrdungsbeurteilung: z.ZodNullable<
      z.ZodObject<
        {
          versionId: z.ZodString;
          version: z.ZodNumber;
          gueltigVon: z.ZodString;
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
        z.core.$strict
      >
    >;
    aktivePsaProfile: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          profil: z.ZodEnum<{
            BASIS: 'BASIS';
            INFEKTION: 'INFEKTION';
            VU: 'VU';
            CBRN_PATIENT: 'CBRN_PATIENT';
            VOLLSCHUTZ: 'VOLLSCHUTZ';
          }>;
          gueltigVon: z.ZodString;
          gueltigBis: z.ZodNullable<z.ZodString>;
          begruendung: z.ZodString;
          propagationGroupId: z.ZodString;
        },
        z.core.$strict
      >
    >;
    sicherheitsregeln: z.ZodArray<
      z.ZodObject<
        {
          regelId: z.ZodString;
          versionId: z.ZodString;
          version: z.ZodNumber;
          titel: z.ZodString;
          inhalt: z.ZodString;
          einsatzweit: z.ZodBoolean;
          einheitIds: z.ZodArray<z.ZodString>;
          gueltigVon: z.ZodString;
        },
        z.core.$strict
      >
    >;
  },
  z.core.$strict
>;
export type EigenschutzKontextSnapshotV1Type = z.infer<typeof EigenschutzKontextSnapshotV1>;
