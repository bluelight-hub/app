#!/bin/bash

# Dieses Skript startet die Backend-Anwendung mit aktiviertem Prisma

echo "Starte Backend mit Prisma..."
USE_PRISMA=true pnpm run start:dev 