# Schema Evolution & Migration Strategy

## Migration-Prinzipien

1. **Backward Compatibility**: Neue Felder sind nullable oder haben Defaults
2. **Additive Changes**: Bevorzugung von ADD COLUMN statt ALTER COLUMN
3. **Data Integrity**: Checksums und Versioning für kritische Daten
4. **No-Delete Policy**: Soft-Delete und Archivierung statt physischer Löschung

## Wichtige Migrations-Meilensteine

- **20250801181334_init**: Initiales Schema mit User, Einsatz, ETB, Lagekarte
- **20250827155124_add_einsatz_module**: Einsatz-Modul mit Status-Tracking
- **20250831182400_add_archive_fields_to_einsatz**: Archivierungs-Features
- **20250914140149_add_etb_schema**: Vollständiges ETB-System mit Versionierung
- **20251004134351_add_user_soft_delete**: Soft-Delete für User
- **20251004191935_add_user_manual_lock**: Manual-Lock Mechanismus
- **20251015152448_add_lagekarte_pois**: POI-System für Lagekarte
- **20251107205829_add_mgrs_to_poi**: MGRS-Koordinatenunterstützung

---
