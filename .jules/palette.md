# Palette's Journal

## 2024-05-22 - [Confusing CloseButton usage in Form Footer]
**Learning:** Don't use icon-only CloseButtons (X) as "Cancel" actions in form footers. It creates ambiguity with the header's close button and violates the convention of having clear text actions in footers.
**Action:** Use text buttons (e.g. "Abbrechen") with `appearance="ghost"` for secondary/cancel actions in dialog footers to match the design system.

## 2024-05-23 - [Visual-only Spinners Accessibility Gap]
**Learning:** Visual loading indicators (Spinners) were implemented as pure `div`s without semantic roles, making them invisible to screen readers. This is a common pattern in the atom library.
**Action:** Always add `role="status"` and a default `aria-label` (e.g. "Laden...") to visual status indicators.

## 2024-05-25 - [Hidden Text in Responsive Buttons]
**Learning:** Components that toggle text visibility based on screen size (e.g., `hidden sm:inline`) become unlabeled icon-only buttons on small screens if they don't have an explicit `aria-label`. Relying on children for the accessible name is insufficient for responsive designs.
**Action:** Always provide an `aria-label` or `title` for buttons that hide their text content on smaller breakpoints, ensuring screen readers still announce the action.
