'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.gefaehrdungsbeurteilungHistorieSchema =
  exports.gefaehrdungsbeurteilungHistorieEintragSchema =
  exports.gefaehrdungsbeurteilungSchema =
  exports.createGefaehrdungsbeurteilungSchema =
  exports.cuidIdSchema =
    void 0;
const zod_1 = require('zod');
const gefaehrdung_item_schema_js_1 = require('./gefaehrdung-item.schema.js');
exports.cuidIdSchema = zod_1.z
  .string()
  .trim()
  .regex(/^[a-z0-9]{20,32}$/, 'Ungültige CUID');
exports.createGefaehrdungsbeurteilungSchema = zod_1.z.object({
  einheitId: exports.cuidIdSchema,
  vorlageId: exports.cuidIdSchema.optional(),
  gefahrenzoneId: exports.cuidIdSchema.optional(),
});
exports.gefaehrdungsbeurteilungSchema = zod_1.z.object({
  id: exports.cuidIdSchema,
  einsatzId: exports.cuidIdSchema,
  einheitId: exports.cuidIdSchema,
  vorlageId: exports.cuidIdSchema.nullable().optional(),
  gefahrenzoneId: exports.cuidIdSchema.nullable().optional(),
  items: zod_1.z.array(gefaehrdung_item_schema_js_1.gefaehrdungItemSchema),
  version: zod_1.z.number().int().positive(),
  erstelltAm: zod_1.z.string(),
  erstelltVonUserId: zod_1.z.string(),
  aktualisiertAm: zod_1.z.string(),
  aktualisiertVonUserId: zod_1.z.string(),
});
exports.gefaehrdungsbeurteilungHistorieEintragSchema = zod_1.z.object({
  version: zod_1.z.number().int().positive(),
  gueltigVon: zod_1.z.string(),
  gueltigBis: zod_1.z.string().nullable(),
  changedByUserId: zod_1.z.string(),
  changedByUserName: zod_1.z.string().nullable(),
  changedFields: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
  items: zod_1.z.array(gefaehrdung_item_schema_js_1.gefaehrdungItemSchema),
});
exports.gefaehrdungsbeurteilungHistorieSchema = zod_1.z.object({
  aggregateVersion: zod_1.z.number().int().positive(),
  eintraege: zod_1.z.array(exports.gefaehrdungsbeurteilungHistorieEintragSchema),
});
//# sourceMappingURL=gefaehrdungsbeurteilung.schema.js.map
