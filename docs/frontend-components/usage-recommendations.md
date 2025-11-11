# Usage Recommendations

## Starting Point for New Features
1. **Atoms:** Nutze existierende Atoms (Button, Input, Card)
2. **Shared Molecules:** Dialog, Table, SearchInput für Standard-Patterns
3. **Templates:** AdminLayout oder AuthLayout als Basis
4. **Feature-Specific:** Erstelle neue Molecules/Organisms im Feature-Ordner

## Component Selection Guide

**Need a Button?**
- Simple Action → `Button`
- Icon-Only → `IconButton`
- Close/Cancel → `CloseButton`
- Command Palette → `CommandTrigger`
- POI Selection → `PoiTypeButton`

**Need User Input?**
- Text → `Input`
- Multi-Line → `Textarea`
- Dropdown → `Select`
- Search → `SearchInput`
- Date/Time → `DateInput`
- Password → `PasswordInput`
- Color → `ColorPicker`

**Need Feedback?**
- Success/Error → `Alert` oder `Dialog.Alert`
- Loading → `LoadingState` oder `Spinner`
- Confirmation → `Dialog.Confirm` oder `ConfirmationPrompt`
- Empty Data → Create custom `EmptyState`

**Need Data Display?**
- List → `Table`
- Status → `Badge`
- Progress → `ProgressBar`
- Timeline → `Timeline`

**Need Layout?**
- Page → `AdminLayout` / `AuthLayout` / `SingleEinsatzLayout`
- Container → `Container`
- Card → `Card`

---
