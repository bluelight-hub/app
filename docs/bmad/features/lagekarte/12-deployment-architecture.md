# 12. Deployment Architecture

## 12.1 Docker Compose Extension

**Existing Services:**
- `postgres` - PostgreSQL 17
- `backend` - NestJS API
- `frontend` - Nginx (Static React Build)

**New/Updated Services:**

```yaml
# docker-compose.yml (📝 Erweiterung)
version: '3.8'

services:
  backend:
    volumes:
      - ./uploads:/app/uploads  # 🆕 File-Upload-Volume für Screenshots
    environment:
      - TILE_SERVER_URL=http://tileserver:80  # 🆕 Optional für Self-Hosted Tiles

  # 🆕 Optional: Self-Hosted Tile-Server (für LAN-Offline-Betrieb)
  tileserver:
    image: maptiler/tileserver-gl:latest
    ports:
      - "8080:80"
    volumes:
      - ./tile-data:/data
    restart: unless-stopped

volumes:
  uploads:  # 🆕 Persistente File-Storage für Lagekarte-Screenshots
```

**Tile-Server Setup (Optional):**
```bash
# Download Germany OSM Tiles (~50GB)
wget https://download.geofabrik.de/europe/germany-latest.mbtiles
mv germany-latest.mbtiles tile-data/

# Start Tile-Server
docker-compose up -d tileserver
```

---

## 12.2 CI/CD Pipeline (GitHub Actions)

**Existing Workflow:** `.github/workflows/ci.yml`

**Lagekarte-Specific Checks:**
```yaml
# .github/workflows/ci.yml (📝 Erweitert)
name: CI

on:
  push:
    branches: [main, alpha]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install Dependencies
        run: pnpm install

      - name: Generate API Client
        run: pnpm run generate-api  # 🆕 Wichtig vor Tests!

      - name: Run Backend Tests (Lagekarte)
        run: pnpm --filter @bluelight-hub/backend test -- lagekarte

      - name: Run Frontend Tests (Lagekarte)
        run: pnpm --filter @bluelight-hub/frontend test -- lagekarte

      - name: Lint
        run: pnpm -r lint

      - name: Build
        run: pnpm -r build
```

---

## 12.3 Deployment Strategy

**Staging Deployment:**
```bash
# 1. Merge PR to alpha branch
git checkout alpha
git merge feature/lagekarte

# 2. GitHub Actions runs CI
# 3. Deploy to Staging (Docker Compose auf Staging-Server)
ssh staging@bluelight-hub.staging
cd /var/www/bluelight-hub
git pull origin alpha
docker-compose down
docker-compose up -d --build
```

**Production Deployment:**
```bash
# 1. Tag Release
git tag v1.5.0-lagekarte
git push origin v1.5.0-lagekarte

# 2. GitHub Actions builds Docker Images
# 3. Deploy to Production
ssh prod@bluelight-hub.local
cd /var/www/bluelight-hub
git pull origin main
pnpm --filter @bluelight-hub/backend prisma migrate deploy  # Run Migrations
docker-compose down
docker-compose up -d --build
```

**Rollback-Plan:**
```bash
# Bei Problemen: Rollback zu vorheriger Version
git checkout v1.4.0
pnpm --filter @bluelight-hub/backend prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_add_lagekarte
docker-compose down
docker-compose up -d --build
```

---
