# Fixed Unused Variables

## Summary

Fixed all unused variables in the frontend by prefixing them with underscore (\_).

## Files Fixed:

1. **src/components/atoms/UserProfile.tsx**

   - `href` → `_href`
   - `error` → `_error`

2. **src/components/organisms/einsaetze/NewEinsatzModal.test.tsx**

   - `onCancel` → `_onCancel`

3. **src/components/pages/app/einsaetze/page.test.tsx**

   - Removed unused import `within`

4. **src/components/pages/app/einsaetze/page.tsx**

   - `error` → `_error`

5. **src/components/templates/AppLayout.integration.test.tsx**

   - `path` → `_path`

6. **src/components/templates/AppLayout.tsx**

   - `navigate` → `_navigate`

7. **src/contexts/EinsatzContext.test.tsx**

   - `originalSetItem` → `_originalSetItem` (multiple occurrences)

8. **src/hooks/einsatz/useEinsaetzeUebersicht.test.tsx**

   - Removed unused import `waitFor`

9. **src/utils/pagination.test.ts**
   - `state` → `_state` (multiple occurrences in createPaginationState tests)

## Total Fixes: 15 unused variable warnings resolved

All unused variable errors have been fixed. The remaining linting issues are unrelated to unused variables.
