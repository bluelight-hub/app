# Entity Relationship Overview

Das System besteht aus vier Hauptdomänen:

1. **User Management:** Zentrale Benutzerverwaltung mit Rollen, Soft-Delete und Manual-Lock
2. **Einsatz Management:** Einsätze mit Status-Tracking und No-Delete-Policy (nur Archivierung)
3. **ETB (Einsatztagebuch):** Vollständige Dokumentation mit Versionierung und 10-Jahre-Archivierung
4. **Lagekarte:** Geografische Visualisierung mit POI-Management und MGRS-Koordinaten

**Zentrale Beziehungen:**
- `User` 1:N `Einsatz` (als Creator/Updater/Archiver)
- `Einsatz` 1:1 `Einsatztagebuch`
- `Einsatz` 1:1 `Lagekarte`
- `Einsatztagebuch` 1:N `EtbEintrag`
- `EtbEintrag` 1:N `EtbEintragHistorie` (Versionierung)
- `Lagekarte` 1:N `LagekartePoi`

---
