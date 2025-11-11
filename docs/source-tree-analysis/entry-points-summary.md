# Entry Points Summary

| Part     | Entry Point                  | Purpose                                | Port        |
|----------|------------------------------|----------------------------------------|-------------|
| Backend  | src/main.ts                  | NestJS bootstrap (REST API)            | 3000        |
| Backend  | src/main-cli.ts              | NestJS Commander CLI                   | N/A (CLI)   |
| Frontend | src/main.tsx                 | React root render (Vite dev)           | 5173        |
| Frontend | src-tauri/src/main.rs        | Tauri app initialization (Desktop)     | N/A (Tauri) |
| Shared   | client/apis/index.ts         | API client barrel exports              | N/A (Lib)   |
| Shared   | src/index.ts                 | Manual shared code exports             | N/A (Lib)   |

---
