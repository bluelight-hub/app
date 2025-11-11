# Datenintegrität & Compliance

## Audit Trail

Alle Models mit `createdBy`, `updatedBy`, `createdAt`, `updatedAt` für vollständiges Audit-Logging.

## 10-Jahre-Archivierung (ETB)

- **EtbArchiv** sichert vollständige Snapshots als JSON
- SHA-256 Checksums für Datenintegrität
- Flexible Speicherorte (Database/Filesystem/S3)

## DSGVO-Compliance

- Soft-Delete für User mit `isDeleted`, `deletedAt`, `deletedBy`
- Manual-Lock Mechanismus für Account-Sperrungen
- Audit-Trail für alle Änderungen

## Cascade-Regeln

- **Restrict**: Creator/Modifier dürfen nicht gelöscht werden
- **SetNull**: Updater/Archiver werden auf NULL gesetzt
- **Cascade**: ETB-Einträge und Historie werden mit ETB gelöscht

---
