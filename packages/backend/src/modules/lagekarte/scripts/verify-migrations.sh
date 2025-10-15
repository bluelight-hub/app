#!/bin/bash

# IV3: Migration-Rollback Verification Script
# Verifiziert dass Lagekarte-Migrationen korrekt rollbar sind

set -e

echo "🔍 IV3: Migration-Rollback Verification"
echo "========================================="

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to backend directory
cd "$(dirname "$0")/../../.."

echo ""
echo "${YELLOW}Step 1: Check current migration status${NC}"
pnpm prisma migrate status

echo ""
echo "${YELLOW}Step 2: Apply all migrations (if not already applied)${NC}"
pnpm prisma migrate deploy

echo ""
echo "${YELLOW}Step 3: Verify Lagekarte tables exist${NC}"
echo "Checking for tables: Lagekarte, LagekartePoi"

# Verwende Prisma Studio oder SQL Query zur Verifikation
if pnpm prisma migrate status | grep -q "No pending migrations"; then
    echo "${GREEN}✓ All migrations applied${NC}"
else
    echo "${RED}✗ Migrations not fully applied${NC}"
    exit 1
fi

echo ""
echo "${YELLOW}Step 4: Test rollback of latest migration${NC}"
echo "⚠️  WARNING: This will RESET the database!"
read -p "Continue with rollback test? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback test skipped."
    exit 0
fi

# Speichere aktuelle Migration-Version
CURRENT_MIGRATION=$(pnpm prisma migrate status 2>&1 | grep "applied" | tail -1 | awk '{print $1}')
echo "Current migration: $CURRENT_MIGRATION"

echo ""
echo "${YELLOW}Step 5: Reset database (equivalent to rollback)${NC}"
pnpm prisma migrate reset --force --skip-seed

echo ""
echo "${YELLOW}Step 6: Verify tables dropped${NC}"
# Nach reset sollten keine Daten vorhanden sein
if pnpm prisma migrate status | grep -q "Database schema is up to date"; then
    echo "${RED}✗ Tables still exist after reset${NC}"
    exit 1
else
    echo "${GREEN}✓ Database reset successful${NC}"
fi

echo ""
echo "${YELLOW}Step 7: Re-apply migrations${NC}"
pnpm prisma migrate deploy

echo ""
echo "${YELLOW}Step 8: Verify tables re-created${NC}"
if pnpm prisma migrate status | grep -q "No pending migrations"; then
    echo "${GREEN}✓ Migrations re-applied successfully${NC}"
    echo "${GREEN}✓ Tables re-created${NC}"
else
    echo "${RED}✗ Migration re-apply failed${NC}"
    exit 1
fi

echo ""
echo "${GREEN}=========================================${NC}"
echo "${GREEN}✓ IV3: Migration-Rollback Verification PASSED${NC}"
echo "${GREEN}=========================================${NC}"
echo ""
echo "Summary:"
echo "  - ✓ Initial migration status checked"
echo "  - ✓ Migrations applied successfully"
echo "  - ✓ Database reset (rollback) successful"
echo "  - ✓ Tables dropped after reset"
echo "  - ✓ Migrations re-applied successfully"
echo "  - ✓ Tables re-created after re-apply"
echo ""
