# Atoms (24 Components)

## Button Components (5)

### Button (`button.atom.tsx`)
**Kernkomponente** für alle Interaktionen mit 30+ Varianten.

**Props:**
- `intent`: `'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info'`
- `appearance`: `'filled' | 'outline' | 'ghost' | 'minimal' | 'heavy'`
- `size`: `'sm' | 'md' | 'lg' | 'icon'`
- `fullWidth`: boolean
- `loading`: boolean (zeigt Spinner)
- `kbd`: string (Keyboard Shortcut Display, z.B. "cmd+K")
- `animate`: boolean (Hover-Animationen)

**Features:** Headless UI Integration, Loading States, Keyboard Shortcuts, Dark Mode, 6 Intent × 5 Appearance = 30 Kombinationen

### IconButton (`icon-button.atom.tsx`)
Button optimiert für Icons, Wrapper um Button mit quadratischem Padding.

### CloseButton (`close-button.atom.tsx`)
Spezialisiert für Close/Cancel-Aktionen, konsistente X-Icon-Darstellung.

### CommandTrigger (`command-trigger.atom.tsx`)
Command Palette Trigger mit Search-Icon und "cmd+K" Shortcut Display.

### ConfirmationPrompt (`confirmation-prompt.atom.tsx`)
Inline Bestätigungs-Prompt mit gelber Warning-Box für destructive Actions.

---

## Form Components (7)

### Input (`input.atom.tsx`)
Text-Eingabe mit Varianten (default/error), Icon-Support (links/rechts), Focus States.

### Select (`select.atom.tsx`)
Dropdown mit Custom Caret-Icon, Options-Array, Placeholder Support.

### Textarea (`textarea.atom.tsx`)
Mehrzeilige Eingabe mit Min-Height pro Size, Resize disabled.

### Label (`label.atom.tsx`)
Form-Label mit Required-Indikator (roter Stern).

### FormField (`form-field.atom.tsx`)
Wrapper für Label + Input + Helper/Error Text, vereinfacht Form-Layouts.

### DateInput (`date-input.atom.tsx`)
**Advanced:** React DatePicker mit NATO DateTime Format, Time Selection, Week Numbers, Locale DE.

### PoiTypeButton (`poi-type-button.atom.tsx`)
**Domain-Specific:** Button für POI-Type-Auswahl mit Icon, Label, Active State (Blue Glow), Compact Mode.

---

## Display Components (9)

### Badge (`badge.atom.tsx`)
Status-Labels mit 5 Varianten (default/success/error/warning/info), Optional animierter Dot (Ping-Effekt).

### Alert (`alert.atom.tsx`)
Benachrichtigungen mit 4 Status-Types, Standard-Icons, Flexibler Content (title/description/children).

### Spinner (`spinner.atom.tsx`)
**4 Animationsstile:** Wave (10 Elemente), Dots (3 pulsierende Punkte), Ring (rotierend), Pulse (pulsierend).
**Sub-Component:** `InlineSpinner` - optimiert für Inline-Verwendung, erbt currentColor.

### LoadingState (`LoadingState.tsx`)
Fullscreen oder Container Loading mit Spinner und Message.

### ErrorState (`ErrorState.tsx`)
Fehleranzeige mit Icon, Title, Description, Back-Link (Router-integriert).

### Heading (`heading.atom.tsx`)
7 Größen (xs-3xl), 6 Semantic HTML Tags (h1-h6), Dark Mode.

### Text (`text.atom.tsx`)
5 Größen × 5 Farben = 25 Kombinationen, Semantic HTML (p/span/div).

### Image (`image.atom.tsx`)
Vordefinierte Größen (xs-xl/auto), Rounded, Shadow, Object-fit contain.

### ProgressBar (`progress-bar.atom.tsx`)
Fortschrittsbalken mit 5 Varianten, Animation (Headless UI Transition), Percentage Display, Label Support.

---

## Layout Components (2)

### Card (`card.atom.tsx`)
Container mit Border, Shadow, 5 Padding-Varianten (none-xl), Responsive.

### Container (`container.atom.tsx`)
Layout-Wrapper mit 11 Max-Width-Optionen (sm-7xl/full), Responsive Padding (px-4, sm:px-6, lg:px-8).

---

## Utility Components (1)

### ColorModeIcon (`color-mode-icon.atom.tsx`)
**2 Varianten:**
- `ColorModeIcon`: Zeigt gewählten Mode (Sun/Moon/Desktop)
- `ResolvedColorModeIcon`: Zeigt tatsächlichen Mode (nur Sun/Moon)

Hook-basiert (`useColorMode`), automatische Icon-Auswahl.

---
