# 1. Introduction

This document outlines the complete fullstack architecture for **Bluelight Hub Lagekarte**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

---

## 1.1 Starter Template or Existing Project

**Status:** ✅ **Brownfield-Projekt** – Erweiterung einer bestehenden Anwendung

**Bestehende Codebasis:**
- **Repository:** github.com/rubenvitt/bluelight-hub
- **Architektur:** Monorepo (pnpm Workspaces)
- **Frontend:** React 18.3 + TypeScript + Vite 6.1 + Tailwind CSS + Headless UI (Atomic Design Pattern)
- **Backend:** NestJS 11 + Prisma 6 + PostgreSQL 17 (Modulare Architektur)
- **Desktop/Mobile:** Tauri v2 (Cross-Platform)

**Architektonische Constraints durch bestehende Basis:**
1. **Keine Breaking Changes** an bestehenden APIs (Einsatz-API, ETB-API)
2. **Prisma-Schema-Erweiterung** erforderlich (neue Entities: `Lagekarte`, `LagekartePoi`, `PoiType` Enum)
3. **Atomic Design Pattern** muss befolgt werden (Frontend-Komponenten-Struktur)
4. **TanStack Query 5.x** für Data Fetching (bestehende Konvention)
5. **API-Client-Generierung** via OpenAPI-Generator (aus NestJS Swagger-Specs)
6. **Docker Compose** für Deployment (bestehende Infrastruktur)

**Neue Module:**
- **Backend:** `lagekarte` Module (Controller, Services, Repositories, DTOs)
- **Frontend:** `organisms/lagekarte` (neue Atomic-Design-Komponenten)
- **Shared:** Generierte API-Clients (`LagekarteApi`, `PoiApi`)

**Dokumentierte Architektur-Referenzen:**
- Tech Stack: `docs/architecture/tech-stack.md`
- Source Tree: `docs/architecture/source-tree.md`
- Coding Standards: `docs/architecture/coding-standards.md`
- arc42 Dokumentation: `docs/architecture/*.adoc`

---

## 1.2 Mapping Library Trade-off Analysis

**Kontext:** Die Wahl der Mapping-Library ist eine kritische architektonische Entscheidung, die Performance, Bundle-Size, Offline-Fähigkeit und Brownfield-Integration beeinflusst.

### Vergleichsmatrix

| **Kriterium** | **Leaflet** | **MapLibre GL JS** | **Google Maps Platform** |
|--------------|-------------|-------------------|-------------------------|
| **Lizenz** | Open Source (BSD-2) | Open Source (BSD-3) | Proprietary (Paid) |
| **Kosten** | €0 | €0 | ~€200/Monat (28k loads) |
| **Bundle Size** | ~145KB (min+gzip) | ~350KB (min+gzip) | ~180KB + External Load |
| **Vector Tiles** | ❌ Nein (Raster only) | ✅ Ja (Native) | ✅ Ja (Native) |
| **Offline-Support** | ✅ Via leaflet.offline | ✅ Native Support | ❌ Sehr limitiert |
| **3D/Terrain** | ❌ Nein | ✅ Ja | ✅ Ja |
| **Performance (>1000 POIs)** | 🟡 Gut mit Clustering | 🟢 Exzellent (WebGL) | 🟢 Exzellent (WebGL) |
| **Marker Clustering** | ✅ leaflet.markercluster | ✅ Native Clustering | ✅ markerClusterer+ |
| **Drawing Tools** | ✅ Leaflet.PM (Geoman) | ✅ mapbox-gl-draw | ✅ Drawing Manager |
| **React Integration** | react-leaflet | react-map-gl | @react-google-maps/api |
| **TypeScript Support** | ✅ @types/leaflet | ✅ Native | ✅ Native |
| **OSM Tile Support** | ✅ Native | ✅ Native | ❌ Nein |
| **DSGVO-Konformität** | ✅ Kein Tracking | ✅ Kein Tracking | ❌ Datenschutz-Bedenken |

### Bewertung nach PRD-Anforderungen

**Gesamtbewertung:**

| **Library** | **Offline** | **Performance** | **Bundle Size** | **Kosten/Lizenz** | **Brownfield** | **Drawing** | **Total** |
|------------|------------|----------------|----------------|------------------|---------------|------------|----------|
| **Leaflet** | 10 | 7 | 9 | 10 | 10 | 10 | **56/60** |
| **MapLibre GL JS** | 9 | 10 | 7 | 10 | 8 | 9 | **53/60** |
| **Google Maps** | 2 | 10 | 8 | 1 | 6 | 8 | **35/60** |

### Entscheidung: Leaflet für MVP (v1)

**🏆 EMPFEHLUNG: Leaflet + leaflet.offline + leaflet.markercluster + Leaflet.PM (Geoman)**

**Warum Leaflet gewinnt:**
1. **Offline-First ist Critical** (FR6) → Leaflet hat die beste Offline-Story
2. **Open-Source & DSGVO** → Keine Kosten, kein Tracking (wichtig für ehrenamtliche Bereitschaften)
3. **Brownfield-Integration** → Minimaler Impact auf bestehende Vite/React-Config
4. **Bewährte Technologie** → 10+ Jahre aktiv, riesige Community
5. **Performance ausreichend** → Mit Clustering <2s Load-Time erreichbar (NFR1)

**Was wir aufgeben:**
- ❌ WebGL-Rendering (MapLibre wäre performanter bei 5000+ POIs)
- ❌ Vector Tiles (kleinere Offline-Downloads)
- ❌ 3D/Terrain (nicht in PRD gefordert)

**Migration-Path für v2:**
- Evaluiere MapLibre GL JS wenn p95(POI-Count) >3000
- Performance-Monitoring implementieren (Tile-Load-Time, Marker-Rendering-Time)
- Feature-Flag-basierter Rollout möglich

---

## 1.3 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-09 | 1.0.0 | Initial Architecture Document for Lagekarte Feature | Architect (Winston) |
| 2025-10-09 | 1.0.1 | Added Mapping Library Trade-off Analysis | Architect (Winston) |
| 2025-10-10 | 1.0.2 | Added Monitoring & Observability Chapter (Prometheus, Grafana, Loki, Custom-Metrics) | Architect (Winston) |

---
