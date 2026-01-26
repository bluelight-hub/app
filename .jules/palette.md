# Palette's Journal

## 2024-05-22 - [Confusing CloseButton usage in Form Footer]
**Learning:** Don't use icon-only CloseButtons (X) as "Cancel" actions in form footers. It creates ambiguity with the header's close button and violates the convention of having clear text actions in footers.
**Action:** Use text buttons (e.g. "Abbrechen") with `appearance="ghost"` for secondary/cancel actions in dialog footers to match the design system.
