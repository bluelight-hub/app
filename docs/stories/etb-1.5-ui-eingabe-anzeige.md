# Story 1.5: ETB-UI mit Eingabe und Anzeige

## Story Details
- **Story ID**: ETB-1.5
- **Epic**: Digitales Einsatztagebuch mit Einsatzvollansicht
- **Priority**: HIGH
- **Story Points**: 8
- **Sprint**: Phase 1

## User Story
**Als** Einsatzleiter  
**möchte ich** ETB-Einträge erstellen und einsehen  
**damit** ich den Einsatzverlauf dokumentiere

## Acceptance Criteria
- [ ] Chronologische Eintragsliste (neueste oben)
- [ ] Eingabeformular funktionsfähig
  - [ ] Textfeld für Eintrag
  - [ ] Kategorie-Dropdown
  - [ ] Automatischer Zeitstempel
  - [ ] Submit-Button
- [ ] Kategorie-Auswahl mit Icons
- [ ] Automatische Zeitstempel (sekundengenau)
- [ ] Eintrag-Cards mit:
  - [ ] Zeitstempel
  - [ ] Kategorie-Badge
  - [ ] Text
  - [ ] Ersteller-Info
  - [ ] Edit/Delete Buttons (wenn berechtigt)
- [ ] Empty State wenn keine Einträge
- [ ] Virtual Scrolling bei > 50 Einträgen

## Technical Requirements

### 1. Container Component (Organism)
```typescript
// packages/frontend/src/components/organisms/etb/EtbContainer.tsx
import { useEtb, useEtbRealtime } from '@/hooks/etb'
import { EtbEntryList } from './EtbEntryList'
import { EtbEntryForm } from './EtbEntryForm'

export const EtbContainer: React.FC<{ einsatzId: string }> = ({ einsatzId }) => {
  const { data: etb, isLoading } = useEtb(einsatzId)
  useEtbRealtime(etb?.id) // Real-time updates
  
  if (isLoading) return <EtbSkeleton />
  if (!etb) return <EtbEmptyState />
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Einsatztagebuch
        </h2>
        <EtbStatusBadge status={etb.status} />
      </div>
      
      {/* Entry Form - nur wenn ETB nicht LOCKED */}
      {etb.status !== 'LOCKED' && (
        <div className="px-6 py-4 border-b border-gray-200">
          <EtbEntryForm etbId={etb.id} />
        </div>
      )}
      
      {/* Entry List with Virtual Scrolling */}
      <div className="flex-1 overflow-y-auto">
        <EtbEntryList etbId={etb.id} />
      </div>
    </div>
  )
}
```

### 2. Entry Form Component (Molecule)
```typescript
// packages/frontend/src/components/molecules/etb/EtbEntryForm.tsx
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'
import { useCreateEtbEintrag } from '@/hooks/etb'
import { EtbCategorySelect } from './EtbCategorySelect'

const etbEntrySchema = z.object({
  text: z.string().min(1, 'Eintrag darf nicht leer sein').max(1000),
  kategorie: z.enum(['ALARMIERUNG', 'ANKUNFT', 'LAGEMELDUNG', ...]),
})

export const EtbEntryForm: React.FC<{ etbId: string }> = ({ etbId }) => {
  const createMutation = useCreateEtbEintrag()
  
  const form = useForm({
    defaultValues: { text: '', kategorie: 'SONSTIGES' },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({ ...value, etbId })
      form.reset()
    },
    validatorAdapter: zodValidator,
    validators: {
      onChange: etbEntrySchema,
    },
  })
  
  return (
    <form.Provider>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        <div className="space-y-4">
          {/* Category Select */}
          <form.Field name="kategorie">
            {(field) => (
              <EtbCategorySelect 
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          
          {/* Text Input */}
          <form.Field name="text">
            {(field) => (
              <div>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md 
                           focus:ring-blue-500 focus:border-blue-500
                           min-h-[80px] resize-none"
                  placeholder="Neuer Eintrag..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      form.handleSubmit()
                    }
                  }}
                />
                {field.state.meta.errors && (
                  <p className="mt-1 text-sm text-red-600">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={form.state.isSubmitting}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white 
                     rounded-md hover:bg-blue-700 disabled:opacity-50
                     min-h-[44px] min-w-[44px]" // Touch-friendly
          >
            {form.state.isSubmitting ? 'Speichern...' : 'Eintrag hinzufügen'}
          </button>
        </div>
      </form>
    </form.Provider>
  )
}
```

### 3. Entry Card Component (Molecule)
```typescript
// packages/frontend/src/components/molecules/etb/EtbEntryCard.tsx
import { Menu } from '@headlessui/react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

export const EtbEntryCard: React.FC<{ entry: EtbEintrag }> = ({ entry }) => {
  const canEdit = useCanEditEntry(entry)
  
  return (
    <div className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50">
      <div className="flex items-start space-x-3">
        {/* Timestamp */}
        <div className="flex-shrink-0 text-xs text-gray-500 w-16">
          {format(entry.timestamp, 'HH:mm:ss')}
        </div>
        
        {/* Category Badge */}
        <CategoryBadge category={entry.kategorie} />
        
        {/* Content */}
        <div className="flex-1">
          <p className="text-gray-900">{entry.text}</p>
          <div className="mt-1 text-xs text-gray-500">
            {entry.erstelltVonUser.name} • 
            {formatDistanceToNow(entry.erstelltAm, { 
              addSuffix: true, 
              locale: de 
            })}
          </div>
        </div>
        
        {/* Actions Menu */}
        {canEdit && (
          <Menu as="div" className="relative">
            <Menu.Button className="p-1 rounded hover:bg-gray-200">
              <MoreVerticalIcon className="w-4 h-4" />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-1 w-48 bg-white 
                                 rounded-md shadow-lg ring-1 ring-black/5">
              <Menu.Item>
                {({ active }) => (
                  <button className={`${active ? 'bg-gray-100' : ''} 
                                    block px-4 py-2 text-sm`}>
                    Bearbeiten
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        )}
      </div>
    </div>
  )
}
```

### 4. Virtual Scrolling for Performance
```typescript
// packages/frontend/src/components/organisms/etb/EtbEntryList.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEtbEintraege } from '@/hooks/etb'

export const EtbEntryList: React.FC<{ etbId: string }> = ({ etbId }) => {
  const { data: eintraege = [] } = useEtbEintraege(etbId)
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: eintraege.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height of each entry
    overscan: 20,
  })
  
  if (eintraege.length === 0) {
    return <EtbEmptyState />
  }
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <EtbEntryCard entry={eintraege[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Component-Struktur:
```
packages/frontend/src/components/
├── organisms/etb/
│   ├── EtbContainer.tsx
│   └── EtbEntryList.tsx
├── molecules/etb/
│   ├── EtbEntryCard.tsx
│   ├── EtbEntryForm.tsx
│   ├── EtbCategorySelect.tsx
│   └── EtbStatusBadge.tsx
└── atoms/etb/
    ├── CategoryBadge.tsx
    └── EtbEmptyState.tsx

// NUR Tailwind CSS + Headless UI
// Keine anderen UI-Frameworks!
```

## Definition of Done
- [ ] Responsive Design (Mobile-first)
- [ ] Loading Skeletons implementiert
- [ ] Keyboard-Navigation möglich
- [ ] Form-Validierung mit Zod
- [ ] @tanstack/react-form verwendet
- [ ] Accessibility getestet

## Dependencies
- Story 1.4 (API Hooks)
- Story 1.1 (Basislayout)

## Notes
- Mobile-optimiert für Tablet im Einsatzfahrzeug
- Große Touch-Targets (min. 44x44px)
- Kontrast für Außeneinsätze optimiert