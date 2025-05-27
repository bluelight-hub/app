---
description: ENFORCE usage of Ant Design and Tailwind for React styling
globs: packages/frontend/src/**/*.ts,packages/frontend/src/**/*.tsx,packages/frontend/src/**/*.css
alwaysApply: false
---

# Frontend Styling Standards

## Context
- Styling mit Ant Design & Tailwind CSS
- Gilt für Frontend-Komponenten (inkl. .css und .tsx)

## Requirements
1. **Priorität**
   - Primär Ant Design
   - Tailwind für Layout & Spacing
   - CSS-Modules für sehr spezielle Fälle
2. **Responsive Design**
   - Tailwind Breakpoints
   - Ant Design responsive Props nutzen
3. **Theme-Konfiguration**
   - `theme.ts` für Ant Design Tokens
   - CSS-Variablen, wo sinnvoll
4. **Custom Styling**
   - Wiederverwendbare Tailwind-Komponenten
   - Minimales eigenes CSS

## Examples

<example>
# Button in Tailwind + AntD
<Button className="w-full md:w-auto" type="primary">
  Submit
</Button>
</example>
