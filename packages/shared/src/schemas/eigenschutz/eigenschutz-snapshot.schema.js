'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EigenschutzKontextSnapshotV1 = exports.SicherheitsregelSnapshotV1 = exports.PsaProfilSnapshotV1 = exports.GefaehrdungsbeurteilungSnapshotV1 = void 0;
const zod_1 = require('zod');
const gefaehrdungsbeurteilung_schema_js_1 = require('./gefaehrdungsbeurteilung.schema.js');
const gefaehrdung_item_schema_js_1 = require('./gefaehrdung-item.schema.js');
const psa_profil_schema_js_1 = require('./psa-profil.schema.js');
exports.GefaehrdungsbeurteilungSnapshotV1 = zod_1.z
  .object({
    versionId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
    version: zod_1.z.number().int().positive(),
    gueltigVon: zod_1.z.string().datetime({ offset: true }),
    items: zod_1.z.array(gefaehrdung_item_schema_js_1.gefaehrdungItemSchema),
  })
  .strict();
exports.PsaProfilSnapshotV1 = zod_1.z
  .object({
    id: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
    profil: psa_profil_schema_js_1.PsaProfilSchema,
    gueltigVon: zod_1.z.string().datetime({ offset: true }),
    gueltigBis: zod_1.z.string().datetime({ offset: true }).nullable(),
    begruendung: zod_1.z.string(),
    propagationGroupId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
  })
  .strict();
exports.SicherheitsregelSnapshotV1 = zod_1.z
  .object({
    regelId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
    versionId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
    version: zod_1.z.number().int().positive(),
    titel: zod_1.z.string(),
    inhalt: zod_1.z.string(),
    einsatzweit: zod_1.z.boolean(),
    einheitIds: zod_1.z.array(gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema),
    gueltigVon: zod_1.z.string().datetime({ offset: true }),
  })
  .strict();
exports.EigenschutzKontextSnapshotV1 = zod_1.z
  .object({
    schemaVersion: zod_1.z.literal(1),
    snapshotAt: zod_1.z.string().datetime({ offset: true }),
    einsatzId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
    einheitId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
    gefaehrdungsbeurteilung: exports.GefaehrdungsbeurteilungSnapshotV1.nullable(),
    aktivePsaProfile: zod_1.z.array(exports.PsaProfilSnapshotV1),
    sicherheitsregeln: zod_1.z.array(exports.SicherheitsregelSnapshotV1),
  })
  .strict();
//# sourceMappingURL=eigenschutz-snapshot.schema.js.map
