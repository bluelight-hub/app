## Version [v1.0.0-alpha.19](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) – Veröffentlicht am 2025-05-30

## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
- [`1edb687`](https://github.com/bluelight-hub/app/commit/1edb687) (rules): Migrate rules from .roo to .cursor 

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`eb0036d`](https://github.com/bluelight-hub/app/commit/eb0036d) (build): try to fix ci 

- [`fc53fbf`](https://github.com/bluelight-hub/app/commit/fc53fbf) (build): try to fix ci 

- [`67fdad5`](https://github.com/bluelight-hub/app/commit/67fdad5) (build): try to fix ci 



# [1.0.0-alpha.19](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) (2025-05-30)

## Version [v1.0.0-alpha.18](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) – Veröffentlicht am 2025-05-29

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`c9713f2`](https://github.com/bluelight-hub/app/commit/c9713f2) (etb): Überarbeite ETB-Logik, Tests und Snapshots für neues AntD+Tailwind-Layout 

- [`39e6c37`](https://github.com/bluelight-hub/app/commit/39e6c37) (scripts): PRD templates und Anleitung für Taskmaster 

- [`cb676fd`](https://github.com/bluelight-hub/app/commit/cb676fd) (etb): Update ETB DTOs, migrations und Doku - Aktualisiere create-etb.dto.ts und EtbEntryDto.ts für neue Felder - Passe package.json und pnpm-lock.yaml an - Füge neue Migrationen und Decorators hinzu - Überarbeite docs/architecture/08-concepts.adoc entsprechend - Stellt Konsistenz zwischen Backend, Shared Models und Dokumentation sicher 

- [`9048232`](https://github.com/bluelight-hub/app/commit/9048232) (cursor): Add environment configuration file for terminal snapshots 

- [`7f54337`](https://github.com/bluelight-hub/app/commit/7f54337) (backend): Implement CLI seed command and OpenAPI client generation 

- [`84e395b`](https://github.com/bluelight-hub/app/commit/84e395b) (backend): Add error handling infrastructure and fix test failures 

- [`41e5a4c`](https://github.com/bluelight-hub/app/commit/41e5a4c) (backend): Add concurrent operations test suite 

- [`a06a853`](https://github.com/bluelight-hub/app/commit/a06a853) (backend): JSON-basierte Seed-Daten-Import-Funktionalität 

## 🐛 Fehlerbehebungen
Diese Probleme wurden behoben:
- [`1c58829`](https://github.com/bluelight-hub/app/commit/1c58829) (backend): remove invalid uuid pipe 

- [`379ef77`](https://github.com/bluelight-hub/app/commit/379ef77) (tests): Testfehler behoben 

- [`c1e53ec`](https://github.com/bluelight-hub/app/commit/c1e53ec) (backend): resolve test compilation issues 

- [`cd2de7a`](https://github.com/bluelight-hub/app/commit/cd2de7a) (sql): reinit migration 

- [`67db2d5`](https://github.com/bluelight-hub/app/commit/67db2d5) (backend): behebe fehlgeschlagene Tests 

- [`f06df0a`](https://github.com/bluelight-hub/app/commit/f06df0a) (frontend): Fix useThemeStore robustness and failing tests - Add type checking for store parameters, protect against undefined values, fix test reliability - All 269 frontend tests now pass 

- [`1a36f7d`](https://github.com/bluelight-hub/app/commit/1a36f7d) (backend): Behebe Worker-Prozess Timer-Leaks in Jest Tests 

## 🔒 Sicherheitsverbesserungen
Sicherheitsrelevante Änderungen:
- [`43f0790`](https://github.com/bluelight-hub/app/commit/43f0790) (security): Exclude API keys from tracking and update .gitignore 

## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
- [`ef2f086`](https://github.com/bluelight-hub/app/commit/ef2f086) (backend): Unify ETB filter logic to single QueryBuilder with dynamic conditions and fulltext search support 

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`f722c27`](https://github.com/bluelight-hub/app/commit/f722c27) (scripts): Add commit enforcement tools 

- [`fb0a463`](https://github.com/bluelight-hub/app/commit/fb0a463) (scripts): Enforce structured commit messages with validation tools 

- [`b5a07d8`](https://github.com/bluelight-hub/app/commit/b5a07d8) (scripts): Integrate Husky for automatic Git hook management 

- [`d54025b`](https://github.com/bluelight-hub/app/commit/d54025b) (scripts): Update documentation build commands for Asciidoctor 

- [`8b3b052`](https://github.com/bluelight-hub/app/commit/8b3b052) (config): Aktualisiere Cursor Environment-Konfiguration 

- [`e08814c`](https://github.com/bluelight-hub/app/commit/e08814c) (formatting): Improve formatting 

- [`268f34e`](https://github.com/bluelight-hub/app/commit/268f34e) (pnpm): aktualisiere pnpm prod install 

- [`be07719`](https://github.com/bluelight-hub/app/commit/be07719) (git): Implementiere Husky Git-Hooks für Qualitätssicherung 

- [`2ebd15b`](https://github.com/bluelight-hub/app/commit/2ebd15b) (git): Implementiere Husky Git-Hooks für Qualitätssicherung 

- [`724ae7b`](https://github.com/bluelight-hub/app/commit/724ae7b) (build): try to fix ci 

- [`9b2d6a4`](https://github.com/bluelight-hub/app/commit/9b2d6a4) (build): try to fix ci 



# [1.0.0-alpha.18](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) (2025-05-29)

## Version [v1.0.0-alpha.17](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) – Veröffentlicht am 2025-04-05

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`3438ebf`](https://github.com/bluelight-hub/app/commit/3438ebf) (backend): Add database migration support - Add migration configuration, script and directory structure 

- [`4e0dc51`](https://github.com/bluelight-hub/app/commit/4e0dc51) (backend): Add ETB module implementation 

- [`0c8ad69`](https://github.com/bluelight-hub/app/commit/0c8ad69) (frontend): Add ETB component structure and hooks 

- [`6565065`](https://github.com/bluelight-hub/app/commit/6565065) (frontend): Update ETB page with new components 

- [`c7e3b92`](https://github.com/bluelight-hub/app/commit/c7e3b92) (api): Standardized API response format and added ETB entry number 

- [`d8daff2`](https://github.com/bluelight-hub/app/commit/d8daff2) (etb): Implement status filter functionality for ETB entries 

- [`5d69248`](https://github.com/bluelight-hub/app/commit/5d69248) (etb): Update ETB module with entry status and response DTO 

## 🐛 Fehlerbehebungen
Diese Probleme wurden behoben:
- [`be87fa6`](https://github.com/bluelight-hub/app/commit/be87fa6)  fix(mobile): Schließe mobile Sidebar automatisch bei Viewport-Änderung 

## 🔒 Sicherheitsverbesserungen
Sicherheitsrelevante Änderungen:
- [`0c2e975`](https://github.com/bluelight-hub/app/commit/0c2e975) (etb): Implement filename sanitization to prevent path traversal attacks 

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`ddf2abc`](https://github.com/bluelight-hub/app/commit/ddf2abc) (backend): Add Jest setup file for testing 

- [`f95cf27`](https://github.com/bluelight-hub/app/commit/f95cf27) (backend): Update configurations for database and ETB module 



# [1.0.0-alpha.17](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) (2025-04-05)

## Version [v1.0.0-alpha.16](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.15...v1.0.0-alpha.16) – Veröffentlicht am 2025-03-30

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`c777202`](https://github.com/bluelight-hub/app/commit/c777202) (frontend): Add additional dashboard cards for ETB, weather, notes and more 



# [1.0.0-alpha.16](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.15...v1.0.0-alpha.16) (2025-03-30)

## Version [v1.0.0-alpha.15](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.14...v1.0.0-alpha.15) – Veröffentlicht am 2025-03-30

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`25a7161`](https://github.com/bluelight-hub/app/commit/25a7161) (backend/frontend): Implementiere Health-Checks und StatusIndicator 

## 🧹 Codebereinigungen
Aufräumarbeiten und kleinere Verbesserungen:
- [`ae69440`](https://github.com/bluelight-hub/app/commit/ae69440) (cleanup): remove old sequential-thinking file and update package.json 



# [1.0.0-alpha.15](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.14...v1.0.0-alpha.15) (2025-03-30)

## Version [v1.0.0-alpha.14](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.13...v1.0.0-alpha.14) – Veröffentlicht am 2025-03-12

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`bd5f226`](https://github.com/bluelight-hub/app/commit/bd5f226) (api/health): Implementiere API-Client-Generierung und Health-Monitoring-System 



# [1.0.0-alpha.14](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.13...v1.0.0-alpha.14) (2025-03-12)

## Version [v1.0.0-alpha.13](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.12...v1.0.0-alpha.13) – Veröffentlicht am 2025-03-12

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`81ea2f5`](https://github.com/bluelight-hub/app/commit/81ea2f5) (backend): enhance health checks and fix TypeORM connection status 

- [`ba7c481`](https://github.com/bluelight-hub/app/commit/ba7c481) (rules): improve glob patterns and descriptions format - Remove quotes from glob patterns - Convert inline globs to proper YAML array format - Enhance description format documentation in 000-rule - Add detailed examples for proper formatting 



# [1.0.0-alpha.13](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.12...v1.0.0-alpha.13) (2025-03-12)

## Version [v1.0.0-alpha.12](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) – Veröffentlicht am 2025-03-03

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`b792b8d`](https://github.com/bluelight-hub/app/commit/b792b8d) (frontend): wip 

- [`1f2660f`](https://github.com/bluelight-hub/app/commit/1f2660f) (frontend): Reorganize component structure and implement tests 

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`a52d1d7`](https://github.com/bluelight-hub/app/commit/a52d1d7) (ci): Release-Workflow von Tests abhängig machen 

- [`cbf1cfc`](https://github.com/bluelight-hub/app/commit/cbf1cfc) (ci): Coverage-Reports als GitHub Pages veröffentlichen 

- [`9b16037`](https://github.com/bluelight-hub/app/commit/9b16037) (ci): experiment getting the pipeline green 

- [`caf28ed`](https://github.com/bluelight-hub/app/commit/caf28ed) (ci): GitHub Pages Deployment auf v3 aktualisieren 

- [`ac2cd50`](https://github.com/bluelight-hub/app/commit/ac2cd50) (ci): GitHub Pages Deployment auf v3 aktualisieren 

- [`96d9cab`](https://github.com/bluelight-hub/app/commit/96d9cab) (ci): Try to fix ci build 

- [`b2eb23f`](https://github.com/bluelight-hub/app/commit/b2eb23f) (build): Verbessere Test-Setup und Docker-Konfiguration 

- [`cd038bd`](https://github.com/bluelight-hub/app/commit/cd038bd) (ci): Revert coverage reports back to Codecov 

- [`f206f9d`](https://github.com/bluelight-hub/app/commit/f206f9d) (ci): Revert coverage reports back to Codecov 

- [`e59da98`](https://github.com/bluelight-hub/app/commit/e59da98) (frontend): Rename test:coverage script to test:cov for consistency 



# [1.0.0-alpha.12](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2025-03-03)

## Version [v1.0.0-alpha.11](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) – Veröffentlicht am 2025-02-25

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`6cc4d10`](https://github.com/bluelight-hub/app/commit/6cc4d10) (frontend): Verbessere Einsatztagebuch und Datums-Funktionen 



# [1.0.0-alpha.11](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2025-02-25)

## Version [v1.0.0-alpha.10](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) – Veröffentlicht am 2025-02-24

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`1e8fbee`](https://github.com/bluelight-hub/app/commit/1e8fbee) (rules): Reorganize cursor rules and add backend architecture docs 

- [`b17aedc`](https://github.com/bluelight-hub/app/commit/b17aedc) (cleanup): Update MockChecklisten and remove unused tools, add new cursor rules 



# [1.0.0-alpha.10](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2025-02-24)

## Version [v1.0.0-alpha.9](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) – Veröffentlicht am 2025-02-23

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`3ce93f6`](https://github.com/bluelight-hub/app/commit/3ce93f6) (frontend): Implementiere Mock-Komponenten und vereinfache Routing 



# [1.0.0-alpha.9](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2025-02-23)

## Version [v1.0.0-alpha.8](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) – Veröffentlicht am 2025-02-22

## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
- [`c49a080`](https://github.com/bluelight-hub/app/commit/c49a080) (frontend): Restrukturierung der Dashboard-Komponenten und Commit-Rules 

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`eeffd4e`](https://github.com/bluelight-hub/app/commit/eeffd4e) (config): Verbessere Commit-Message Handling 



# [1.0.0-alpha.8](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2025-02-22)

## Version [v1.0.0-alpha.7](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) – Veröffentlicht am 2025-02-22

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`a44a8f8`](https://github.com/bluelight-hub/app/commit/a44a8f8) (test): Implementiere Vitest Setup mit Testing Library 



# [1.0.0-alpha.7](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2025-02-22)

## Version [v1.0.0-alpha.6](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) – Veröffentlicht am 2025-02-21

## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
- [`85371dd`](https://github.com/bluelight-hub/app/commit/85371dd) (frontend): Refactor sidebar and einsatztagebuch components 



# [1.0.0-alpha.6](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2025-02-21)

## Version [v1.0.0-alpha.5](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) – Veröffentlicht am 2025-02-21

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`e2052a6`](https://github.com/bluelight-hub/app/commit/e2052a6) (frontend): Implementiere neues Dashboard mit Mock-Daten 



# [1.0.0-alpha.5](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2025-02-21)

## Version [v1.0.0-alpha.4](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) – Veröffentlicht am 2025-02-21

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`a12efe2`](https://github.com/bluelight-hub/app/commit/a12efe2) (frontend): Implementiere Routing und Pages 



# [1.0.0-alpha.4](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2025-02-21)

## Version [v1.0.0-alpha.3](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) – Veröffentlicht am 2025-02-21

## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
- [`d59bfc8`](https://github.com/bluelight-hub/app/commit/d59bfc8) (frontend): Vereinfache Theme-Handling und erweitere Navigation\n\n- Vereinfache Theme-Handling in der Sidebar durch direkte Nutzung des theme-Props\n- Füge neue Navigationspunkte hinzu (Checklisten, Wecker, MANV, Kommunikation)\n- Verbessere Bezeichnungen in der Navigation für bessere Konsistenz 



# [1.0.0-alpha.3](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2025-02-21)

## Version [v1.0.0-alpha.2](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) – Veröffentlicht am 2025-02-20

## ♻ Refactoring
Struktur- oder Code-Verbesserungen:
- [`3156258`](https://github.com/bluelight-hub/app/commit/3156258) (frontend): Überarbeitung des App Layouts und Navigation 



# [1.0.0-alpha.2](https://github.com/bluelight-hub/app/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2025-02-20)


### Features

* implement logger and update cursor rules ([9f1d576](https://github.com/bluelight-hub/app/commit/9f1d5763c450a24e742a9c24fd73dae94a0b453b))

## Version v1.0.0-alpha.1 – Veröffentlicht am 2025-02-17

## ✨ Neue Funktionen
Die folgenden neuen Features wurden hinzugefügt:
- [`c17667b`](https://github.com/bluelight-hub/app/commit/c17667b) (frontend): Router-Integration für SPA-Navigation 

- [`e379e78`](https://github.com/bluelight-hub/app/commit/e379e78) (frontend): Implementiere grundlegende Frontend-Struktur 

- [`ef116ad`](https://github.com/bluelight-hub/app/commit/ef116ad) (ci): Integriere Tauri-Build in Release-Workflow 

## 🔧 Tool Verbesserungen
Verbesserungen an den Werkzeugen:
- [`4b767fb`](https://github.com/bluelight-hub/app/commit/4b767fb) (config): Docker-Konfiguration für Monorepo mit SQLite 

- [`32c6d55`](https://github.com/bluelight-hub/app/commit/32c6d55) (config): Docker-Konfiguration für Monorepo mit SQLite 🔧(config): Docker Compose Konfiguration hinzugefügt 🔧(ci): Implementiere Semantic Release Workflow 

- [`b4a8caa`](https://github.com/bluelight-hub/app/commit/b4a8caa) (config): Docker-Konfiguration für Monorepo mit SQLite 🔧(config): Docker Compose Konfiguration hinzugefügt 🔧(ci): Implementiere Semantic Release Workflow 📦(deps): Generiere pnpm-lock.yaml 🔧(config): Aktiviere Versionierung von pnpm-lock.yaml 

- [`da51d75`](https://github.com/bluelight-hub/app/commit/da51d75) (config): Update repository URL in release configuration 



# 1.0.0-alpha.1 (2025-02-17)


### Features

* update cursor rules and tauri config\n\n- Update all cursor rules with German descriptions\n- Add health-checks rule for application monitoring\n- Update tauri configuration\n- Remove temporary commit message file ([a857f0b](https://github.com/bluelight-hub/app/commit/a857f0b1a89d91dc427a70b4838635c5ea5fa443))
