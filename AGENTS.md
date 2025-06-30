# Agent Guidelines

This repository is governed by the **Cursor rules** located in `.cursor/rules`.
All contributors must read and follow those rules. They define commit message
standards, code structure, testing, and other project conventions.

## Package Manager

Use **pnpm** exclusively for all package management and script execution.
Install dependencies with `pnpm install` and run scripts with `pnpm run <script>`.
Do not use `npm` or `yarn`.

## Commits

Follow the commit message format from `.cursor/rules/030-commit-rules.mdc`.
Use emoji with context and a concise description.

## Tests

When changing code or tests, execute the relevant test commands as described in
`.cursor/rules/900-test-execution.mdc` before committing.
