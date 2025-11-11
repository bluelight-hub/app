# Prerequisites

## Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 24.0.0 | JavaScript runtime |
| **pnpm** | 10.20.0+ | Package manager (workspace support) |
| **PostgreSQL** | 17.x | Database (recommended, or use Docker) |
| **Rust** | stable | Required for Tauri (Frontend) |
| **Git** | Latest | Version control |

## Platform-Specific Dependencies

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**macOS:**
- Install Xcode Command Line Tools: `xcode-select --install`
- Rust targets for cross-compilation (optional):
  ```bash
  rustup target add aarch64-apple-darwin x86_64-apple-darwin
  ```

**Windows:**
- Visual Studio Build Tools 2022 (C++ workload)
- WebView2 Runtime (usually pre-installed on Windows 11)

## Optional Tools

- **Docker & Docker Compose:** For containerized PostgreSQL
- **Prisma Studio:** GUI for database management (included)
- **Compodoc:** Backend documentation generator (included)

---
