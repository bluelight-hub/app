# Story 1.1: Einsatzvollansicht Basislayout und Routing

## Story Details

- **Story ID**: ETB-1.1
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 5
- **Sprint**: Phase 1

## User Story

**Als** Einsatzkraft  
**möchte ich** von der Einsatzliste zu einer detaillierten Einsatzansicht navigieren  
**damit** ich alle Informationen zentral einsehen kann

## Acceptance Criteria

- [ ] Klick auf Einsatz öffnet `/einsaetze/:id`
- [ ] Basislayout mit Header und Menü-Navigation implementiert
- [ ] Menü enthält Optionen für "Details", "ETB", etc.
- [ ] Responsive Design für Tablet (min-width: 768px)
- [ ] Navigation zwischen Menüpunkten funktioniert
- [ ] Zurück-Navigation zur Einsatzliste vorhanden
- [ ] Loading-State während Datenabruf
- [ ] Error-State bei fehlerhafter ID

## Technical Implementation Guide

### 1. Router Setup (TanStack Router)

```typescript
// packages/frontend/src/routes/einsaetze/$einsatzId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { EinsatzVollansicht } from '@/components/templates/EinsatzVollansicht'

export const Route = createFileRoute('/einsaetze/$einsatzId')({
  component: EinsatzVollansicht,
  loader: async ({ params }) => {
    return await api.einsaetze().getEinsatzById(params.einsatzId)
  },
  errorComponent: EinsatzErrorComponent,
  pendingComponent: EinsatzLoadingComponent,
})
```

### 2. Layout Component Structure

```typescript
// packages/frontend/src/components/templates/EinsatzVollansicht.tsx
export const EinsatzVollansicht: React.FC = () => {
  const { einsatzId } = useParams()
  const { data: einsatz, isLoading } = useQuery({
    queryKey: ['einsatz', einsatzId],
    queryFn: () => api.einsaetze().getEinsatzById(einsatzId),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <EinsatzHeader einsatz={einsatz} />
      <EinsatzNavigation />
      <main className="container mx-auto px-4 py-6">
        <Outlet /> {/* Für Sub-Routes wie ETB */}
      </main>
    </div>
  )
}
```

### 3. Navigation Component

```typescript
// packages/frontend/src/components/molecules/EinsatzNavigation.tsx
import { Tab } from '@headlessui/react'

const navigationItems = [
  { id: 'details', label: 'Details', path: 'details' },
  { id: 'etb', label: 'Einsatztagebuch', path: 'etb' },
  { id: 'ressourcen', label: 'Ressourcen', path: 'ressourcen' },
  { id: 'karte', label: 'Karte', path: 'karte' },
]

export const EinsatzNavigation = () => {
  return (
    <Tab.Group>
      <Tab.List className="flex space-x-1 border-b">
        {navigationItems.map((item) => (
          <Tab key={item.id} className={({ selected }) =>
            clsx(
              'px-4 py-2 text-sm font-medium',
              selected
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            )
          }>
            {item.label}
          </Tab>
        ))}
      </Tab.List>
    </Tab.Group>
  )
}
```

### 4. Responsive Design Tokens

```css
/* Tailwind Breakpoints zu nutzen */
/* sm: 640px, md: 768px (Tablet), lg: 1024px, xl: 1280px */

/* Container für Tablet-Optimierung */
.einsatz-container {
  @apply container mx-auto px-4 md:px-6 lg:px-8;
  @apply max-w-7xl;
}
```

## Technical Requirements

- **Router**: TanStack Router (NICHT React Router!)
- **UI Components**: Tailwind CSS + Headless UI
- **Data Fetching**: TanStack Query mit generierten API Clients
- **State Management**: TanStack Store für lokalen State
- **Mobile-first**: Start bei 375px, optimiert für 768px+

## Definition of Done

- [ ] Code implementiert und getestet
- [ ] Unit Tests geschrieben (min. 80% Coverage)
- [ ] E2E Test für Navigation
- [ ] Code Review durchgeführt
- [ ] Dokumentation aktualisiert
- [ ] Responsive auf Tablet getestet
- [ ] Accessibility geprüft (WCAG 2.1 AA)

## Dependencies

- Keine

## Notes

- Basis für alle weiteren ETB-Features
- Erweiterbar für zukünftige Module
- Konsistenz mit bestehender Navigation wichtig