'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.gefaehrdungItemSchema =
  exports.GEFAEHRDUNG_ITEM_LIMITS =
  exports.risikoklasseSchema =
  exports.RISIKOKLASSE_WERTE =
  exports.schadensausmassSchema =
  exports.SCHADENSAUSMASS_WERTE =
  exports.eintrittswahrscheinlichkeitSchema =
  exports.EINTRITTSWAHRSCHEINLICHKEIT_WERTE =
    void 0;
const zod_1 = require('zod');
exports.EINTRITTSWAHRSCHEINLICHKEIT_WERTE = ['SELTEN', 'GELEGENTLICH', 'HAEUFIG', 'OFT', 'STAENDIG'];
exports.eintrittswahrscheinlichkeitSchema = zod_1.z.enum(exports.EINTRITTSWAHRSCHEINLICHKEIT_WERTE);
exports.SCHADENSAUSMASS_WERTE = ['VERNACHLAESSIGBAR', 'GERING', 'MITTEL', 'HOCH', 'KATASTROPHAL'];
exports.schadensausmassSchema = zod_1.z.enum(exports.SCHADENSAUSMASS_WERTE);
exports.RISIKOKLASSE_WERTE = ['GRUEN', 'GELB', 'ORANGE', 'ROT'];
exports.risikoklasseSchema = zod_1.z.enum(exports.RISIKOKLASSE_WERTE);
exports.GEFAEHRDUNG_ITEM_LIMITS = {
  titleMax: 120,
  descriptionMax: 2000,
  schutzmassnahmenMax: 2000,
};
exports.gefaehrdungItemSchema = zod_1.z.object({
  id: zod_1.z
    .string()
    .regex(/^[a-z0-9]{20,32}$/, 'Ungültige Item-ID')
    .optional(),
  title: zod_1.z.string().trim().min(1, 'Titel ist erforderlich').max(exports.GEFAEHRDUNG_ITEM_LIMITS.titleMax, `Titel darf maximal ${exports.GEFAEHRDUNG_ITEM_LIMITS.titleMax} Zeichen haben`),
  description: zod_1.z.string().trim().max(exports.GEFAEHRDUNG_ITEM_LIMITS.descriptionMax, `Beschreibung darf maximal ${exports.GEFAEHRDUNG_ITEM_LIMITS.descriptionMax} Zeichen haben`).optional(),
  eintritt: exports.eintrittswahrscheinlichkeitSchema.optional(),
  schaden: exports.schadensausmassSchema.optional(),
  risikoklasse: exports.risikoklasseSchema.optional(),
  schutzmassnahmen: zod_1.z
    .string()
    .trim()
    .max(exports.GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax, `Schutzmaßnahmen dürfen maximal ${exports.GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax} Zeichen haben`)
    .optional(),
});
//# sourceMappingURL=gefaehrdung-item.schema.js.map
