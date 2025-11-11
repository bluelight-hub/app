# Executive Summary

Die Bluelight-Hub Frontend-Architektur folgt strikt der **Atomic Design Methodik** mit 5 hierarchischen Ebenen. Die Komponenten sind feature-basiert organisiert, nutzen konsequent Tailwind CSS für Styling und Headless UI für accessible Primitives.

## Component Distribution

| Level | Count | Purpose | Reusability |
|-------|-------|---------|-------------|
| **Atoms** | 24 | Basis UI-Elemente (Button, Input, Badge, etc.) | ★★★★★ High |
| **Molecules** | 46 | Komponierte Elemente (Feature-spezifisch & Shared) | ★★★★☆ Medium-High |
| **Organisms** | 52 | Komplexe Module (Feature-complete sections) | ★★☆☆☆ Low-Medium |
| **Templates** | 4 | Page Layouts (Admin, Auth, Einsatz) | ★★★☆☆ Medium |
| **Pages** | 6 | Full Page Components (Route-gebunden) | ★☆☆☆☆ Very Low |
| **UI Layer** | 3 | Framework Wrappers (Headless UI) | ★★★★☆ Medium-High |

## Feature Breakdown (Molecules + Organisms)

| Feature | Molecules | Organisms | Total | Complexity |
|---------|-----------|-----------|-------|-----------|
| **ETB** (Einsatztagebuch) | 8 | 17 | **25** | ★★★★★ |
| **Lagekarte** (Map) | 4 | 16 | **20** | ★★★★★ |
| **Einsatz** (Mission) | 13 | 5 | **18** | ★★★★☆ |
| **Shared** (Reusable) | 14 | 0 | **14** | ★★★☆☆ |
| **Admin** | 1 | 4 | **5** | ★★★☆☆ |
| **Command Palette** | 0 | 6 | **6** | ★★★☆☆ |
| **Dashboard** | 2 | 2 | **4** | ★★☆☆☆ |
| **Auth** | 1 | 2 | **3** | ★★☆☆☆ |
| **Form** (Generic) | 3 | 0 | **3** | ★★★☆☆ |

---
