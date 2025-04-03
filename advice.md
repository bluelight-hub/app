# Cursor Development Rules & AI Collaboration Guide for Bluelight-Hub

## 📜 Core Philosophy

1. **Simplicity:** Prioritize simple, clear, and maintainable solutions. Avoid unnecessary complexity or over-engineering.
2. **Iterate:** Prefer iterating on existing, working code rather than building entirely new solutions from scratch, unless fundamentally necessary or explicitly requested.
3. **Focus:** Concentrate efforts on the specific task assigned. Avoid unrelated changes or scope creep.
4. **Quality:** Strive for a clean, organized, well-tested, and secure codebase.
5. **Collaboration:** This document guides both human developers and the AI assistant for effective teamwork.

## 📚 Project Context & Understanding

1. **Documentation First:**
   * **Always** check for and thoroughly review relevant project documentation *before* starting any task. This includes:
     * `CLAUDE.md` (Repository guide, build commands, code style guidelines)
     * `README.md` (Project overview, setup, patterns, technology stack)
     * Any relevant documentation in `/docs` directory
   * If documentation is missing, unclear, or conflicts with the request, **ask for clarification**.
2. **Architecture Adherence:**
   * Understand and respect the monorepo architecture with packages for frontend, backend, and shared code.
   * Follow the Atomic Design pattern for frontend (atoms, molecules, organisms, templates, pages).
   * Adhere to NestJS modular architecture for backend (controller, service, repository).
   * Validate that changes comply with the established architecture. Warn and propose compliant solutions if a violation is detected.
3. **Pattern & Tech Stack Awareness:**
   * Frontend: React with Atomic Design and Vite/Vitest for testing
   * Backend: NestJS with TypeORM (SQLite)
   * Packages structure: frontend, backend, shared (monorepo with pnpm workspaces)
   * Use existing implementations before proposing new patterns or libraries.

## ⚙️ Task Execution & Workflow

1. **Task Definition:**
   * Clearly understand the task requirements, acceptance criteria, and any dependencies.
2. **Systematic Change Protocol:** Before making significant changes:
   * **Identify Impact:** Determine affected components, dependencies, and potential side effects.
   * **Plan:** Outline the steps. Tackle one logical change or file at a time.
   * **Verify Testing:** Confirm how the change will be tested. Add tests if necessary *before* implementing (see TDD).
3. **Progress Tracking:**
   * Follow the commit message format: `<emoji>(<context>): <description>` (e.g., `✨(frontend): Add user dashboard`)
   * Keep track of task status (in-progress, completed, blocked), issues encountered, and completed items.

## 🤖 AI Collaboration & Prompting

1. **Clarity is Key:** Provide clear, specific, and unambiguous instructions to the AI. Define the desired outcome, constraints, and context.
2. **Context Referencing:** If a task spans multiple interactions, explicitly remind the AI of relevant previous context, decisions, or code snippets.
3. **Suggest vs. Apply:** Clearly state whether the AI should *suggest* a change for human review or *apply* a change directly (use only when high confidence and task is well-defined). Use prefixes like "Suggestion:" or "Applying fix:".
4. **Question AI Output:** Human developers should critically review AI-generated code. Question assumptions, verify logic, and don't blindly trust confident-sounding but potentially incorrect suggestions (hallucinations).
5. **Focus the AI:** Guide the AI to work on specific, focused parts of the task. Avoid overly broad requests that might lead to architectural or logical errors.
6. **Leverage Strengths:** Use the AI for tasks it excels at (boilerplate generation, refactoring specific patterns, finding syntax errors, generating test cases) but maintain human oversight for complex logic, architecture, and security.
7. **Incremental Interaction:** Break down complex tasks into smaller steps for the AI. Review and confirm each step before proceeding.
8. **Standard Check-in (for AI on large tasks):** Before providing significant code suggestions:
   * "Confirming understanding: I've reviewed [specific document/previous context]. The goal is [task goal], adhering to [key pattern/constraint]. Proceeding with [planned step]."

## ✨ Code Quality & Style

1. **TypeScript Guidelines:**
   * Use strict typing (TypeScript strict mode required throughout codebase)
   * Avoid `any` type
   * Document complex logic or public APIs with JSDoc
2. **Readability & Maintainability:** Write clean, well-organized code.
3. **Small Files & Components:**
   * Keep files under **150 lines** (Single Responsibility Principle)
   * Break down large React components into smaller, single-responsibility components.
4. **Avoid Duplication (DRY):** Actively look for and reuse existing functionality. Refactor to eliminate duplication.
5. **File Naming:**
   * PascalCase for components
   * camelCase for other files
   * Use clear, descriptive names. Avoid "temp", "refactored", "improved", etc., in permanent file names.
6. **Linting/Formatting:** Ensure all code conforms to project's ESLint rules.
7. **Pattern Consistency:** Adhere to established project patterns. Don't introduce new ones without discussion/explicit instruction.
8. **Comments:** Explain "why" not "what", JSDoc for public APIs only.

## ♻️ Refactoring

1. **Purposeful Refactoring:** Refactor to improve clarity, reduce duplication, simplify complexity, or adhere to architectural goals.
2. **Holistic Check:** When refactoring, look for duplicate code, similar components/files, and opportunities for consolidation across the affected area.
3. **Edit, Don't Copy:** Modify existing files directly. Do not duplicate files and rename them (e.g., `component-v2.tsx`).
4. **Verify Integrations:** After refactoring, ensure all callers, dependencies, and integration points function correctly. Run relevant tests.

## ✅ Testing & Validation

1. **Test-Driven Development (TDD):**
   * **New Features:** Outline tests, write failing tests, implement code, refactor.
   * **Bug Fixes:** Write a test reproducing the bug *before* fixing it.
2. **Comprehensive Tests:** Write thorough unit, integration, and/or end-to-end tests covering critical paths, edge cases, and major functionality.
3. **Tests Must Pass:** All tests **must** pass before committing or considering a task complete. Run appropriate test commands:
   * Project-wide: `pnpm -r test`, `pnpm -r test:cov`
   * Backend: `pnpm --filter @bluelight-hub/backend test`
   * Frontend: `pnpm --filter @bluelight-hub/frontend test`
   * Single test (backend): `pnpm --filter @bluelight-hub/backend test -- -t "test name"`
   * Single test (frontend): `pnpm --filter @bluelight-hub/frontend test -- -t "test name"`
4. **Full test coverage** for new features is required.
5. **Manual Verification:** Supplement automated tests with manual checks where appropriate, especially for UI changes.

## 🐛 Debugging & Troubleshooting

1. **Fix the Root Cause:** Prioritize fixing the underlying issue causing an error, rather than just masking or handling it, unless a temporary workaround is explicitly agreed upon.
2. **Console/Log Analysis:** Always check browser and server console output for errors, warnings, or relevant logs after making changes or when debugging. Report findings.
3. **Targeted Logging:** For persistent or complex issues, add specific `console.log` statements (or use a project logger) to trace execution and variable states. *Remember to check the output.*
4. **Document Complex Fixes:** If a bug requires significant effort (multiple iterations, complex logic) to fix, create a concise documentation file detailing the problem, investigation steps, and the solution.

## 🔒 Security

1. **Server-Side Authority:** Keep sensitive logic, validation, and data manipulation strictly on the server-side. Use secure API endpoints.
2. **Input Sanitization/Validation:** Always sanitize and validate user input on the server-side.
3. **Dependency Awareness:** Be mindful of the security implications of adding or updating dependencies.
4. **Credentials:** Never hardcode secrets or credentials in the codebase. Use environment variables or a secure secrets management solution.
5. **Prevent path traversal attacks:** Implement proper filename sanitization.

## 🌳 Version Control & Environment

1. **Git Hygiene:**
   * Commit frequently with clear messages following the format: `<emoji>(<context>): <description>`
   * Keep the working directory clean; ensure no unrelated or temporary files are staged or committed.
   * Use `.gitignore` effectively.
2. **Branching Strategy:** Follow the project's established branching strategy. Create feature branches with appropriate naming (e.g., BLH-19).
3. **.env Files:** **Never** commit `.env` files. Use `.env.example` for templates. Do not overwrite local `.env` files without confirmation.
4. **Environment Awareness:** Code should function correctly across different environments (dev, test, prod). Use environment variables for configuration.
5. **Project Management:**
   * Building project: `pnpm -r build`
   * Starting development server: `pnpm -r dev`
   * Run specific package: `pnpm --filter @bluelight-hub/[package] [command]`

## 📄 Documentation Maintenance

1. **Update Docs:** If code changes impact architecture, technical decisions, or established patterns, update the relevant documentation.
2. **Keep Rules Updated:** This `advice.md` file should be reviewed and updated periodically to reflect learned best practices and project evolution.