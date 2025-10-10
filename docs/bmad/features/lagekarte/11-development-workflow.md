# 11. Development Workflow

## 11.1 Prerequisites

**Required Software:**
- Node.js 22 LTS
- pnpm 10.x
- Docker Desktop (für PostgreSQL + optional Tile-Server)
- Git

**Optional:**
- VS Code mit Extensions: Prisma, ESLint, Prettier, Tailwind CSS IntelliSense

---

## 11.2 Initial Setup

**1. Clone Repository:**
```bash
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub
```

**2. Install Dependencies:**
```bash
pnpm install
```

**3. Environment Variables:**
```bash
# packages/backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/bluelight_hub"
JWT_SECRET="your-secret-key"
NODE_ENV="development"

# Optional: Für Self-Hosted Tile-Server
TILE_SERVER_URL="http://localhost:8080"
```

**4. Start Database:**
```bash
docker-compose up -d postgres
```

**5. Run Prisma Migrations:**
```bash
pnpm --filter @bluelight-hub/backend prisma migrate dev
```

**6. Generate API-Client:**
```bash
pnpm run generate-api
```

---

## 11.3 Development Commands

**Start All Services:**
```bash
pnpm -r dev
```

**Package-Specific Commands:**
```bash
# Backend only
pnpm --filter @bluelight-hub/backend dev

# Frontend only
pnpm --filter @bluelight-hub/frontend dev

# Shared Library
pnpm --filter @bluelight-hub/shared build
```

**Database Commands:**
```bash
# Create new migration
pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_lagekarte

# Open Prisma Studio
pnpm --filter @bluelight-hub/backend prisma studio

# Reset database (DANGER!)
pnpm --filter @bluelight-hub/backend prisma migrate reset
```

**API-Client Re-Generation (nach Backend-Änderungen):**
```bash
pnpm run generate-api
```

---

## 11.4 Local Development URLs

| **Service** | **URL** | **Purpose** |
|------------|---------|-------------|
| **Frontend** | http://localhost:3001 | React App (Vite Dev Server) |
| **Backend** | http://localhost:3000 | NestJS API |
| **Swagger UI** | http://localhost:3000/api | OpenAPI Documentation |
| **Prisma Studio** | http://localhost:5555 | Database GUI |
| **PostgreSQL** | localhost:5432 | Database (Docker) |

---

## 11.5 Testing Lagekarte Feature Locally

**1. Create Test Einsatz:**
```bash
# Via Prisma Studio oder API-Call
POST http://localhost:3000/api/v1/einsatz
{
  "einsatzort": "Berlin, Alexanderplatz",
  "art": "BRANDEINSATZ"
}
```

**2. Navigate to Lagekarte:**
```
http://localhost:3001/app/einsatz/{einsatzId}/lagekarte
```

**3. Test POI-Creation:**
- Click "Neuer POI"
- Enter: Typ = EINSATZORT, Adresse = "Brandenburger Tor, Berlin"
- Backend auto-geocodes → POI erscheint auf Karte

**4. Test Offline-Download:**
- Click "Offline-Download"
- Markiere Gebiet um Berlin
- Download ~500 Tiles (Dauer: ~4 Minuten bei 2 req/s)
- Disable Network in DevTools → Karte funktioniert offline

**5. Test Screenshot-Export:**
- Click "Screenshot exportieren"
- Screenshot wird zu ETB exportiert
- Check ETB: Neuer Eintrag mit Kategorie "LAGE" + Screenshot-Attachment

---
