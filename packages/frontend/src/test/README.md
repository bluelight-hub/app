# Frontend Test Infrastructure

## Setup

Dieses Projekt nutzt **Vitest** als Test-Runner mit **React Testing Library** für Component-Tests.

### Installierte Dependencies

```json
{
  "devDependencies": {
    "vitest": "latest",
    "@vitest/ui": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@testing-library/jest-dom": "latest",
    "jsdom": "latest"
  }
}
```

## Commands

```bash
# Tests ausführen (Watch-Mode)
pnpm test

# Tests einmalig ausführen (CI)
pnpm test --run

# Test UI öffnen (interaktive Ansicht)
pnpm test:ui

# Coverage Report generieren
pnpm test:coverage
```

## Test-Struktur

```
src/
├── features/
│   ├── auth/
│   │   ├── api/
│   │   │   └── queries.test.ts     # TanStack Query Hook Tests
│   │   └── ui/
│   │       └── LoginForm.test.tsx  # Component Tests
│   └── einsatz/
│       └── ...
└── test/
    ├── setup.ts                # Test Setup (globals, mocks)
    ├── utils.tsx               # Test Utilities
    ├── setup.test.ts           # Setup Verification Tests
    └── utils.test.tsx          # Utils Verification Tests
```

## Test Utilities

### renderWithProviders

Custom render Funktion die automatisch alle notwendigen Provider wrapped (QueryClient, etc.).

```typescript
import { renderWithProviders } from '@/test/utils';

it('should render component', () => {
  const { getByText } = renderWithProviders(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});
```

### createTestQueryClient

Factory für isolierte QueryClient-Instanzen in Tests.

```typescript
import { createTestQueryClient } from '@/test/utils';

it('should handle query', async () => {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['user'], { id: '1', name: 'Test' });

  const { getByText } = renderWithProviders(<UserProfile />, { queryClient });
  expect(getByText('Test')).toBeInTheDocument();
});
```

## Best Practices

### Component Tests

```typescript
import { renderWithProviders, userEvent } from '@/test/utils';
import { describe, expect, it, vi } from 'vitest';

describe('MyButton', () => {
  it('should call onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    const { getByRole } = renderWithProviders(
      <MyButton onClick={handleClick}>Click Me</MyButton>
    );

    await user.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Query Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, TestProviders } from '@/test/utils';
import { useEinsaetze } from './queries';

it('should fetch einsaetze', async () => {
  const queryClient = createTestQueryClient();

  const { result } = renderHook(() => useEinsaetze(), {
    wrapper: ({ children }) => (
      <TestProviders queryClient={queryClient}>{children}</TestProviders>
    ),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeDefined();
});
```

### Mutation Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, TestProviders } from '@/test/utils';
import { useCreateEinsatz } from './mutations';

it('should create einsatz', async () => {
  const queryClient = createTestQueryClient();

  const { result } = renderHook(() => useCreateEinsatz(), {
    wrapper: ({ children }) => (
      <TestProviders queryClient={queryClient}>{children}</TestProviders>
    ),
  });

  result.current.mutate({ nummer: 'E-2025-001', stichwort: 'Brand' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toMatchObject({ nummer: 'E-2025-001' });
});
```

## Setup Mocks

Die folgenden Browser APIs sind global gemockt (siehe `setup.ts`):

- **window.matchMedia**: Media Query Support
- **IntersectionObserver**: Viewport Intersection Detection
- **ResizeObserver**: Element Resize Detection

Falls weitere Mocks benötigt werden, füge sie in `setup.ts` hinzu.

## Coverage

Coverage Reports werden nach `coverage/` geschrieben und umfassen:

- **Text**: Console Output
- **JSON**: Maschinen-lesbar
- **HTML**: Interaktive Ansicht (öffne `coverage/index.html`)

Ausgeschlossene Dateien:

- `**/*.config.*` (Config Files)
- `**/node_modules/**`
- `**/dist/**`
- `**/src-tauri/**` (Tauri Backend)
- `**/.tauri/**`
- `**/routeTree.gen.ts` (Generated Routes)

## CI Integration

Für CI/CD Pipelines:

```bash
# Run tests with coverage in CI mode
pnpm test --run --coverage

# Fail on low coverage (add to vitest.config.ts)
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80
  }
}
```
