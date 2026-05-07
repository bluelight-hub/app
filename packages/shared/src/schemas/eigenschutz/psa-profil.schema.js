'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ChangePsaProfilResponseSchemaV1 =
  exports.PsaProfilZuweisungDtoSchemaV1 =
  exports.BulkChangePsaProfilSchemaV1 =
  exports.BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX =
  exports.ChangePsaProfilSchemaV1 =
  exports.PsaProfilToggleSchemaV1 =
  exports.PSA_PROFIL_EXPECTED_VERSION_MAX =
  exports.PSA_PROFIL_TOGGLE_LIMIT =
  exports.PsaProfilSchema =
    void 0;
const zod_1 = require('zod');
const gefaehrdungsbeurteilung_schema_js_1 = require('./gefaehrdungsbeurteilung.schema.js');
exports.PsaProfilSchema = zod_1.z.enum(['BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ']);
exports.PSA_PROFIL_TOGGLE_LIMIT = 5;
exports.PSA_PROFIL_EXPECTED_VERSION_MAX = 2_147_483_647;
exports.PsaProfilToggleSchemaV1 = zod_1.z.object({
  profil: exports.PsaProfilSchema,
  aktivieren: zod_1.z.boolean(),
  expectedVersion: zod_1.z.number().int().positive().max(exports.PSA_PROFIL_EXPECTED_VERSION_MAX).optional(),
});
exports.ChangePsaProfilSchemaV1 = zod_1.z.object({
  profilToggles: zod_1.z.array(exports.PsaProfilToggleSchemaV1).min(1, 'Mindestens ein Profil auswählen').max(exports.PSA_PROFIL_TOGGLE_LIMIT, `Maximal ${exports.PSA_PROFIL_TOGGLE_LIMIT} Profile`),
  begruendung: zod_1.z.string().trim().min(1, 'Begründung ist verpflichtend').max(500, 'Begründung darf maximal 500 Zeichen lang sein'),
});
exports.BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX = 50;
exports.BulkChangePsaProfilSchemaV1 = zod_1.z.object({
  einheitIds: zod_1.z
    .array(gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema)
    .min(1, 'Mindestens eine Einheit erforderlich')
    .max(exports.BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX, `Maximal ${exports.BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX} Einheiten pro Bulk-Operation`),
  profilToggles: zod_1.z.array(exports.PsaProfilToggleSchemaV1).min(1, 'Mindestens ein Profil auswählen').max(exports.PSA_PROFIL_TOGGLE_LIMIT, `Maximal ${exports.PSA_PROFIL_TOGGLE_LIMIT} Profile`),
  begruendung: zod_1.z.string().trim().min(1, 'Begründung ist verpflichtend').max(500, 'Begründung darf maximal 500 Zeichen lang sein'),
});
exports.PsaProfilZuweisungDtoSchemaV1 = zod_1.z.object({
  id: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
  einsatzId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
  einheitId: gefaehrdungsbeurteilung_schema_js_1.cuidIdSchema,
  profil: exports.PsaProfilSchema,
  gueltigVon: zod_1.z.string(),
  gueltigBis: zod_1.z.string().nullable(),
  aktiviertVonUserId: zod_1.z.string(),
  begruendung: zod_1.z.string(),
  propagationGroupId: zod_1.z.string(),
  version: zod_1.z.number().int().positive(),
});
exports.ChangePsaProfilResponseSchemaV1 = zod_1.z.object({
  propagationGroupId: zod_1.z.string(),
  affected: zod_1.z.array(exports.PsaProfilZuweisungDtoSchemaV1),
});
//# sourceMappingURL=psa-profil.schema.js.map
