# Component Patterns & Best Practices

## TypeScript Interfaces
Alle Komponenten haben explizite Props-Interfaces mit JSDoc-Dokumentation.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info';
  appearance?: 'filled' | 'outline' | 'ghost' | 'minimal' | 'heavy';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  kbd?: string;
  animate?: boolean;
  children: React.ReactNode;
}
```

## Tailwind CSS Patterns
- **cn() Utility:** Alle Komponenten nutzen `cn()` für Class Merging (clsx + tailwind-merge)
- **Dark Mode:** `dark:` Prefix für alle Dark Mode Styles
- **Responsive:** Mobile-First mit Breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- **Intent-Based:** Semantic Colors statt hardcoded Colors

## Component Composition
- **Compound Components:** Dialog, Table nutzen Compound Component Pattern
- **Render Props:** Headless UI Components (Tab, Menu, etc.)
- **Slots:** Templates definieren Slots für Content-Injection

## State Management
- **Local State:** useState/useReducer für Component-Internal State
- **Global State:** @tanstack/react-store für übergreifenden State
- **Server State:** @tanstack/react-query für API-Daten

## Forms
- **TanStack Form:** Alle Forms nutzen @tanstack/react-form
- **Validation:** Zod Schemas für Type-Safe Validation
- **Error Handling:** Einheitliche Error-Anzeige mit FormField-Komponente

---
