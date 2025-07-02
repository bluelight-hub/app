# Storybook für BlueLight Hub Frontend

Storybook ist als zentrale Dokumentations- und Entwicklungsumgebung für alle Frontend-Komponenten implementiert.

## 🚀 Quick Start

```bash
# Storybook starten (Port 6006)
pnpm storybook

# Storybook bauen
pnpm build-storybook

# Storybook Tests ausführen
pnpm test-storybook
```

## 📁 Struktur

Stories befinden sich neben den jeweiligen Komponenten:

```
src/components/
├── atoms/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.stories.tsx      # Story-Datei
├── molecules/
│   └── ...
└── organisms/
    └── ...
```

## 📝 Story schreiben

### Basis-Story (CSF 3.0):

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Category/ComponentName',
  component: MyComponent,
  parameters: {
    layout: 'centered', // oder 'fullscreen', 'padded'
  },
  tags: ['autodocs'], // Automatische Dokumentation
  argTypes: {
    // Prop-Controls definieren
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Standard-Props
    children: 'Button Text',
  },
};
```

### Story mit MSW (API Mocking):

```typescript
import { http, HttpResponse } from 'msw';

export const WithAPIData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/data', () => {
          return HttpResponse.json({ 
            data: 'mocked data' 
          });
        }),
      ],
    },
  },
};
```

## 🎨 Theme Integration

Theme-Switching ist global in der Toolbar verfügbar. Komponenten passen sich automatisch an:

- Light Mode: Standard-Theme
- Dark Mode: Dunkles Theme mit Tailwind `dark:` Klassen

## 🧪 Testing

### Accessibility Tests:
Alle Stories werden automatisch auf Barrierefreiheit getestet (a11y addon).

### Interaction Tests:
```typescript
import { within, userEvent } from '@storybook/test';

export const ClickExample: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
  },
};
```

## 🔧 Addons

- **Controls**: Interaktive Prop-Anpassung
- **Actions**: Event-Handler Logging
- **Viewport**: Responsive Testing
- **A11y**: Accessibility Checks
- **MSW**: API Mocking für realistische Daten

## 📚 Best Practices

1. **Atomic Design**: Stories nach Atomic Design Struktur organisieren
2. **Realistische Daten**: Mock-Daten sollten realistisch sein
3. **Edge Cases**: Stories für Fehler- und Ladezustände erstellen
4. **Dokumentation**: JSDoc-Kommentare für automatische Dokumentation
5. **Status Badges**: Komponenten-Status mit Tags kennzeichnen

## 🚀 Deployment

Storybook wird automatisch bei jedem Push auf `main` gebaut und deployed.

## 🔗 Nützliche Links

- [Storybook Dokumentation](https://storybook.js.org/docs)
- [CSF 3.0 Format](https://storybook.js.org/docs/api/csf)
- [MSW Integration](https://github.com/mswjs/msw-storybook-addon)