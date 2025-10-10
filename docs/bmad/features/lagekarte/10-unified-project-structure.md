# 10. Unified Project Structure

## 10.1 Complete Monorepo File Tree

**Legende:**
- 🆕 = Neue Datei/Ordner für Lagekarte-Feature
- 📝 = Bestehende Datei, wird erweitert
- ⚙️ = Config-Datei

```
bluelight-hub/
├── packages/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── atoms/
│   │   │   │   │   └── map/                        🆕
│   │   │   │   │       ├── MapTile.tsx             🆕
│   │   │   │   │       ├── MapMarker.tsx           🆕
│   │   │   │   │       ├── MapTooltip.tsx          🆕
│   │   │   │   │       └── MapControlButton.tsx    🆕
│   │   │   │   ├── molecules/
│   │   │   │   │   └── lagekarte/                  🆕
│   │   │   │   │       ├── PoiMarker.tsx           🆕
│   │   │   │   │       ├── PoiCluster.tsx          🆕
│   │   │   │   │       ├── PoiForm.tsx             🆕
│   │   │   │   │       ├── PoiCard.tsx             🆕
│   │   │   │   │       ├── LayerControl.tsx        🆕
│   │   │   │   │       ├── DrawingToolbar.tsx      🆕
│   │   │   │   │       ├── OfflineDownloadDialog.tsx 🆕
│   │   │   │   │       └── GeocodingSearch.tsx     🆕
│   │   │   │   └── organisms/
│   │   │   │       └── lagekarte/                  🆕
│   │   │   │           ├── LagekarteMap.tsx        🆕
│   │   │   │           ├── LagekarteToolbar.tsx    🆕
│   │   │   │           ├── LagekarteSidebar.tsx    🆕
│   │   │   │           ├── PoiManagementPanel.tsx  🆕
│   │   │   │           └── ScreenshotExportModal.tsx 🆕
│   │   │   ├── hooks/
│   │   │   │   └── lagekarte/                      🆕
│   │   │   │       ├── useLagekarteData.ts         🆕
│   │   │   │       ├── usePois.ts                  🆕
│   │   │   │       ├── useCreatePoi.ts             🆕
│   │   │   │       ├── useUpdatePoi.ts             🆕
│   │   │   │       ├── useDeletePoi.ts             🆕
│   │   │   │       ├── useSaveLagekarteState.ts    🆕
│   │   │   │       ├── useGeocodeAddress.ts        🆕
│   │   │   │       ├── useOfflineStatus.ts         🆕
│   │   │   │       └── useOfflineTileDownload.ts   🆕
│   │   │   ├── stores/
│   │   │   │   ├── einsatzStore.ts
│   │   │   │   └── lagekarteStore.ts               🆕
│   │   │   ├── routes/
│   │   │   │   └── app/
│   │   │   │       └── einsatz/
│   │   │   │           └── $einsatzId/
│   │   │   │               └── lagekarte.tsx       🆕
│   │   │   ├── utils/
│   │   │   │   ├── offlineTileCache.ts             🆕
│   │   │   │   └── leafletIconFix.ts               🆕
│   │   │   ├── queryKeys.ts                        📝 (extend with LAGEKARTE_QUERY_KEYS)
│   │   │   └── main.tsx                            📝 (import Leaflet CSS)
│   │   └── package.json                            📝 (add leaflet dependencies)
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── lagekarte/                          🆕
│   │   │   │   ├── dto/                            🆕
│   │   │   │   │   ├── create-poi.dto.ts           🆕
│   │   │   │   │   ├── update-poi.dto.ts           🆕
│   │   │   │   │   ├── save-lagekarte-state.dto.ts 🆕
│   │   │   │   │   ├── geocode.dto.ts              🆕
│   │   │   │   │   └── lagekarte-response.dto.ts   🆕
│   │   │   │   ├── exceptions/                     🆕
│   │   │   │   │   ├── poi-not-found.exception.ts  🆕
│   │   │   │   │   └── geocoding-rate-limit.exception.ts 🆕
│   │   │   │   ├── lagekarte.controller.ts         🆕
│   │   │   │   ├── lagekarte.service.ts            🆕
│   │   │   │   ├── lagekarte.repository.ts         🆕
│   │   │   │   ├── poi.controller.ts               🆕
│   │   │   │   ├── poi.service.ts                  🆕
│   │   │   │   ├── poi.repository.ts               🆕
│   │   │   │   ├── geocoding.service.ts            🆕
│   │   │   │   ├── file-upload.service.ts          🆕
│   │   │   │   └── lagekarte.module.ts             🆕
│   │   │   ├── app.module.ts                       📝 (import LagekarteModule)
│   │   │   └── prisma/
│   │   │       └── schema.prisma                   📝 (add Lagekarte, LagekartePoi, PoiType)
│   │   └── package.json                            📝 (add lru-cache, multer)
│   │
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   └── lagekarte.types.ts              🆕
│       │   └── constants/
│       │       └── poi-types.ts                    🆕
│       └── client/
│           └── apis/
│               ├── LagekarteApi.ts                 🆕 (generated via pnpm generate-api)
│               └── PoiApi.ts                       🆕 (generated via pnpm generate-api)
│
├── prisma/
│   └── migrations/
│       └── YYYYMMDDHHMMSS_add_lagekarte/           🆕
│           └── migration.sql                       🆕
│
├── uploads/                                        🆕
│   └── lagekarte/                                  🆕 (Docker Volume Mount)
│
├── docs/
│   └── architecture/
│       └── lagekarte-architecture.md               🆕 (this file)
│
├── docker-compose.yml                              📝 (add lagekarte volume mount)
├── package.json
└── pnpm-workspace.yaml
```

---

## 10.2 New Files Summary

**Frontend (18 neue Komponenten):**
- **Atoms (4):** MapTile, MapMarker, MapTooltip, MapControlButton
- **Molecules (8):** PoiMarker, PoiCluster, PoiForm, PoiCard, LayerControl, DrawingToolbar, OfflineDownloadDialog, GeocodingSearch
- **Organisms (5):** LagekarteMap, LagekarteToolbar, LagekarteSidebar, PoiManagementPanel, ScreenshotExportModal
- **Route (1):** lagekarte.tsx

**Frontend (9 neue Hooks):**
- useLagekarteData, usePois, useCreatePoi, useUpdatePoi, useDeletePoi, useSaveLagekarteState, useGeocodeAddress, useOfflineStatus, useOfflineTileDownload

**Frontend (1 neuer Store):**
- lagekarteStore.ts

**Backend (13 neue Dateien):**
- **DTOs (5):** create-poi.dto, update-poi.dto, save-lagekarte-state.dto, geocode.dto, lagekarte-response.dto
- **Exceptions (2):** poi-not-found.exception, geocoding-rate-limit.exception
- **Services (4):** lagekarte.service, poi.service, geocoding.service, file-upload.service
- **Repositories (2):** lagekarte.repository, poi.repository
- **Controllers (2):** lagekarte.controller, poi.controller
- **Module (1):** lagekarte.module

**Shared (2 neue Dateien):**
- lagekarte.types.ts, poi-types.ts

**Database:**
- Prisma Migration (lagekarte, lagekarte_poi Tables + PoiType Enum)

**Gesamt:** ~45 neue Dateien/Ordner

---
