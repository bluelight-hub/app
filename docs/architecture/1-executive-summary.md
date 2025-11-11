# 1. Executive Summary

## System Purpose

Bluelight-Hub ist eine **Desktop-basierte Einsatzunterstützungsanwendung** für das Deutsche Rote Kreuz (DRK), die folgende Kernfunktionen bietet:

- **Einsatzmanagement:** Verwaltung von Einsätzen mit flexibler Datenerfassung (minimale Pflichtvorgaben)
- **Einsatztagebuch (ETB):** Versionierte Dokumentation mit 10-Jahre-Archivierung und Compliance
- **Lagekarte:** Geografische Visualisierung mit POI-Management und MGRS-Koordinaten
- **Benutzerverwaltung:** Rollenbasiertes System (User, Admin, Super-Admin) mit Audit-Trail

## System Scope

**Enthalten:**
- ✅ Desktop-App (Tauri) mit Web-Frontend
- ✅ Lokaler/Remote Backend-Server (NestJS)
- ✅ Cookie-basierte JWT-Authentifizierung
- ✅ REST API für alle Operationen
- ✅ PostgreSQL Datenbank mit Prisma ORM
- ✅ Offline-Maps (Leaflet Tiles)
- ✅ Optimistic UI Updates (TanStack Query)

**Nicht enthalten:**
- ❌ Externe Systemintegration (TETRA, Digitalfunk, FMS)
- ❌ Echtzeit-Kommunikation (WebSocket)
- ❌ Offline-Sync / Cloud-Synchronisation
- ❌ Autonomer Modus (vollständig offline)
- ❌ Mobile Apps (iOS/Android)
- ❌ Ressourcen-Management (Personal, Fahrzeuge, Material)

## Key Characteristics

- **Project Type:** Monorepo (Backend + Frontend + Shared)
- **Domain:** Emergency Response Management (DRK)
- **Deployment:** Desktop application (Tauri) with local/remote backend
- **Users:** Admin, Koordinator, Mitglied roles (NOT implemented, only USER/ADMIN/SUPER_ADMIN)
- **Architecture Style:** Standard 3-Layer (Controller → Service → Repository)
- **Data Strategy:** CRUD with Audit Trail, Soft-Delete, No-Delete Policy (Einsätze)

---
