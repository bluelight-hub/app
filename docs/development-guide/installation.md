# Installation

## 1. Clone Repository

```bash
git clone https://github.com/rubenvitt/bluelight-hub.git
cd bluelight-hub
```

## 2. Install Dependencies

**Monorepo-wide installation:**
```bash
pnpm install --frozen-lockfile
```

This installs dependencies for all packages (backend, frontend, shared) using workspace configuration.

**Note:** The following packages require native builds and may take longer:
- `@prisma/client`, `prisma`
- `@tauri-apps/cli`
- `bcrypt`
- `@swc/core`, `esbuild`

## 3. Verify Installation

```bash
# Check Node version
node --version  # Should be ≥ 24.0.0

# Check pnpm version
pnpm --version  # Should be 10.20.0+

# Check Rust (for Tauri)
rustc --version

# Verify workspace structure
pnpm list --depth 0
```

---
