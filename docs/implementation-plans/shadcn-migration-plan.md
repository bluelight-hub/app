# Detailed Implementation Plan: Ant Design to shadcn/ui Migration

## Overview

This document provides a step-by-step implementation guide for migrating from Ant Design to shadcn/ui in the Bluelight Hub frontend application.

## Pre-Migration Checklist

- [ ] Backup current codebase
- [ ] Document all Ant Design customizations
- [ ] Review all component prop usage
- [ ] Set up feature flags for gradual rollout
- [ ] Prepare rollback strategy

## Week 1-2: Foundation Setup

### Day 1-2: Environment Setup

```bash
# Install shadcn/ui CLI
pnpm --filter @bluelight-hub/frontend add -D @shadcn/ui

# Initialize shadcn/ui
pnpm --filter @bluelight-hub/frontend exec shadcn-ui init

# Install required dependencies
pnpm --filter @bluelight-hub/frontend add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-select
pnpm --filter @bluelight-hub/frontend add react-hook-form @hookform/resolvers zod
pnpm --filter @bluelight-hub/frontend add @tanstack/react-table sonner
pnpm --filter @bluelight-hub/frontend add class-variance-authority clsx tailwind-merge
```

### Day 3-4: Component Structure Setup

```typescript
// src/components/compatibility/index.ts
// Compatibility layer for gradual migration

export { Button as AntButton } from 'antd';
export { Button as ShadcnButton } from '@/components/ui/button';

// Feature flag based export
export const Button = process.env.USE_SHADCN ? ShadcnButton : AntButton;
```

### Day 5-7: Theme Migration

```typescript
// src/styles/theme-tokens.css
:root {
  /* Convert Ant Design tokens to CSS variables */
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  /* ... more tokens */
}
```

### Day 8-10: Simple Components Migration

#### Button Component
```typescript
// Before (Ant Design)
import { Button } from 'antd';
<Button type="primary" size="large" onClick={handleClick}>
  Click me
</Button>

// After (shadcn/ui)
import { Button } from '@/components/ui/button';
<Button variant="default" size="lg" onClick={handleClick}>
  Click me
</Button>
```

#### Input Component
```typescript
// Before (Ant Design)
import { Input } from 'antd';
<Input placeholder="Enter text" onChange={handleChange} />

// After (shadcn/ui)
import { Input } from '@/components/ui/input';
<Input placeholder="Enter text" onChange={handleChange} />
```

## Week 3-4: Core Components

### Table Migration Strategy

```typescript
// src/components/ui/data-table.tsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

export function DataTable({ columns, data, ...antdTableProps }) {
  // Map Ant Design props to TanStack Table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Add sorting, filtering, pagination
  });
  
  // Render with shadcn/ui Table components
}
```

### Form System Migration

```typescript
// Before (Ant Design)
import { Form, Input } from 'antd';

<Form onFinish={handleSubmit}>
  <Form.Item name="username" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
</Form>

// After (shadcn/ui + react-hook-form)
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormControl } from '@/components/ui/form';

const form = useForm();

<Form {...form}>
  <form onSubmit={form.handleSubmit(handleSubmit)}>
    <FormField
      control={form.control}
      name="username"
      rules={{ required: true }}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  </form>
</Form>
```

## Week 5-7: Complex Components & Integration

### Navigation Menu Migration

```typescript
// Create wrapper to maintain API compatibility
export function NavigationMenuCompat({ items, ...props }) {
  // Convert Ant Design menu items to shadcn/ui structure
  const convertedItems = convertMenuItems(items);
  
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {convertedItems.map(item => (
          <NavigationMenuItem key={item.key}>
            {/* Render menu items */}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
```

### Notification System

```typescript
// src/utils/notification.ts
import { toast } from 'sonner';

// Compatibility wrapper
export const notification = {
  success: (config) => toast.success(config.message, {
    description: config.description,
    duration: config.duration
  }),
  error: (config) => toast.error(config.message),
  // ... other methods
};
```

## Week 8: Finalization

### Testing Strategy

```typescript
// Run parallel tests
describe('Button Component Migration', () => {
  it('should maintain same behavior as Ant Design', () => {
    // Test both implementations
    const antdButton = render(<AntButton />);
    const shadcnButton = render(<ShadcnButton />);
    
    // Compare behaviors
  });
});
```

### Performance Monitoring

```javascript
// webpack-bundle-analyzer setup
// Before migration: Record bundle size
// After each component: Measure impact
// Target: < 700KB for all UI components
```

### Rollback Strategy

```typescript
// Feature flag based rollback
if (process.env.REACT_APP_USE_ANTD) {
  // Use Ant Design components
} else {
  // Use shadcn/ui components
}
```

## Component-by-Component Migration Guide

### Priority 1 (Week 1-2)
- [x] Button
- [x] Input
- [x] Card
- [x] Badge
- [x] Separator (Divider)

### Priority 2 (Week 3-4)
- [ ] Form + FormItem
- [ ] Select
- [ ] Tooltip
- [ ] Progress
- [ ] Textarea

### Priority 3 (Week 5-6)
- [ ] Table (most complex)
- [ ] Modal → Dialog
- [ ] Menu → NavigationMenu
- [ ] Drawer → Sheet

### Priority 4 (Week 7)
- [ ] notification → toast
- [ ] Popover
- [ ] List (custom)
- [ ] Empty (custom)
- [ ] Statistic (custom)

### Priority 5 (Week 8)
- [ ] Breadcrumb
- [ ] Tag → Badge variant
- [ ] Descriptions (custom)
- [ ] ConfigProvider cleanup
- [ ] Typography components

## File-by-File Migration Checklist

### High-Impact Files (Update First)
1. `src/components/organisms/etb/ETBTable.tsx` - Table heavy
2. `src/components/organisms/einsaetze/EinsaetzeTable.tsx` - Table heavy
3. `src/components/organisms/einsaetze/NewEinsatzModal.tsx` - Form heavy
4. `src/components/organisms/etb/ETBEntryForm.tsx` - Form heavy
5. `src/providers/ThemeProvider.tsx` - ConfigProvider

### Mock Components (Update for Consistency)
- All files in `src/components/organisms/mocks/`
- Can be batch updated with similar patterns

### Page Components
- Update after organism components are migrated
- Ensure consistent imports

## Post-Migration Tasks

1. **Remove Ant Design**
   ```bash
   pnpm --filter @bluelight-hub/frontend remove antd
   ```

2. **Update Documentation**
   - Component usage guide
   - Styling guidelines
   - Migration notes

3. **Performance Audit**
   - Run Lighthouse tests
   - Compare bundle sizes
   - Measure runtime performance

4. **Team Training**
   - shadcn/ui patterns
   - Tailwind CSS best practices
   - New form handling

## Success Criteria

- [ ] All components migrated
- [ ] Tests passing (100% coverage maintained)
- [ ] Bundle size < 700KB
- [ ] No visual regressions
- [ ] Performance metrics improved
- [ ] Documentation complete
- [ ] Team trained

## Troubleshooting Guide

### Common Issues

1. **Style Conflicts**
   - Check Tailwind configuration
   - Ensure CSS variable definitions
   - Review component class names

2. **Form Validation**
   - Map Ant Design rules to react-hook-form
   - Update error message handling

3. **Table Features**
   - Implement custom sorting/filtering
   - Add pagination manually

4. **Theme Colors**
   - Convert color tokens properly
   - Test in light/dark modes

## Resources

- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)
- [TanStack Table](https://tanstack.com/table)
- [Radix UI](https://radix-ui.com)

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-03  
**Status**: Ready for Implementation