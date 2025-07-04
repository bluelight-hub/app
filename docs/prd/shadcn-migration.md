# Product Requirements Document: Ant Design to shadcn/ui Migration

## Executive Summary

This document outlines the requirements and implementation plan for migrating the Bluelight Hub frontend from Ant Design to shadcn/ui. The migration aims to improve performance, reduce bundle size, and provide better customization capabilities while maintaining all existing functionality.

## 1. Background & Context

### Current State
- **UI Framework**: Ant Design v5.24.7
- **Components Used**: 27 unique components across 46 files
- **Primary Use Cases**: Data tables, forms, status indicators, navigation

### Problems with Current Solution
1. **Bundle Size**: Ant Design adds ~2MB to the bundle
2. **Customization Limitations**: Difficult to override default styles
3. **Performance**: Imports entire component library even for minimal usage
4. **Design Consistency**: Challenging to maintain custom brand identity

### Proposed Solution
Migrate to shadcn/ui, a modern component library that provides:
- Copy-paste components with full customization
- Minimal bundle size (~600KB for equivalent components)
- Built on Radix UI primitives with accessibility built-in
- Tailwind CSS integration for consistent styling

## 2. Goals & Objectives

### Primary Goals
1. **Reduce bundle size by 70%** (from ~2MB to ~600KB)
2. **Improve First Contentful Paint by 30%**
3. **Maintain 100% feature parity** with current implementation
4. **Enable full design customization** for brand consistency

### Secondary Goals
1. Improve developer experience with better TypeScript support
2. Reduce maintenance burden with owned components
3. Align with modern React best practices
4. Prepare for future mobile optimization

## 3. Functional Requirements

### Component Migration Requirements

#### 3.1 Data Display Components
- **Table Component**
  - Must support sorting, filtering, and pagination
  - Maintain current column configurations
  - Support responsive design
  - Integrate with @tanstack/react-table for advanced features

- **List Component**
  - Create custom component matching current functionality
  - Support item actions and loading states
  - Maintain current data structure

- **Card Component**
  - Direct replacement with shadcn/ui Card
  - Preserve current layouts and content structure

#### 3.2 Form Components
- **Form System**
  - Migrate to react-hook-form integration
  - Maintain all validation rules
  - Support current field types
  - Preserve form submission logic

- **Input Components**
  - Support all current input types
  - Maintain validation feedback
  - Preserve accessibility features

#### 3.3 Navigation Components
- **Menu System**
  - Convert to NavigationMenu component
  - Maintain routing integration
  - Support mobile responsive behavior
  - Preserve menu hierarchy

#### 3.4 Feedback Components
- **Notification System**
  - Implement using toast library (sonner)
  - Support all notification types (success, error, warning, info)
  - Maintain positioning and timing

- **Modal/Dialog**
  - Replace with Dialog component
  - Support current modal sizes and behaviors
  - Maintain backdrop and animation settings

### Non-Functional Requirements

#### Performance
- Page load time must not increase
- Component render performance must match or exceed current
- Bundle size reduction of at least 50%

#### Accessibility
- Maintain WCAG 2.1 AA compliance
- Keyboard navigation must work for all components
- Screen reader support required

#### Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## 4. Technical Specifications

### Dependencies
```json
{
  "dependencies": {
    "@radix-ui/react-*": "latest",
    "@tanstack/react-table": "^8.0.0",
    "react-hook-form": "^7.0.0",
    "sonner": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0"
  }
}
```

### Component Structure
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── compatibility/ # Ant Design API wrappers
│   └── custom/       # Custom built components
```

### Migration Approach
1. **Compatibility Layer**: Create wrapper components that maintain Ant Design API
2. **Incremental Migration**: Component-by-component replacement
3. **Parallel Testing**: Run tests for both implementations
4. **Feature Flags**: Toggle between old and new implementations

## 5. Implementation Plan

### Phase 1: Setup & Foundation (Weeks 1-2)
- [ ] Install and configure shadcn/ui
- [ ] Set up component structure
- [ ] Create theme configuration
- [ ] Build compatibility layer framework
- [ ] Migrate first 5 simple components

### Phase 2: Core Components (Weeks 3-4)
- [ ] Migrate all low-complexity components
- [ ] Build custom List component
- [ ] Implement Empty state component
- [ ] Create Statistic component
- [ ] Update component tests

### Phase 3: Complex Components (Weeks 5-7)
- [ ] Migrate Table with full functionality
- [ ] Convert Form system to react-hook-form
- [ ] Update Navigation components
- [ ] Implement notification system
- [ ] Comprehensive testing

### Phase 4: Finalization (Week 8)
- [ ] Remove Ant Design dependency
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Final testing and bug fixes
- [ ] Deployment preparation

## 6. Success Metrics

### Quantitative Metrics
- **Bundle Size**: < 700KB for UI components
- **Load Time**: 30% improvement in FCP
- **Test Coverage**: Maintain 100% for migrated components
- **Performance Score**: Lighthouse score > 90

### Qualitative Metrics
- Developer satisfaction with new component system
- Improved customization capabilities
- Easier maintenance and updates
- Better alignment with design system

## 7. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| Feature parity gaps | Medium | High | Detailed component audit before migration |
| Timeline overrun | Medium | Medium | Compatibility layer allows gradual migration |
| Performance regression | Low | High | Continuous performance monitoring |
| Breaking changes | Medium | High | Comprehensive test suite |
| Design inconsistencies | Medium | Medium | Design system documentation |

## 8. Dependencies & Constraints

### Dependencies
- Design team approval on component appearance
- Backend API compatibility maintained
- Testing framework compatibility

### Constraints
- Must maintain current functionality
- Cannot break existing features during migration
- Must support current browser requirements
- 8-week timeline limitation

## 9. Appendices

### A. Component Usage Analysis
[See detailed analysis in implementation documentation]

### B. Performance Benchmarks
- Current bundle size: 2.1MB (UI components)
- Target bundle size: 600KB
- Current FCP: 2.3s
- Target FCP: 1.6s

### C. Reference Documentation
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://radix-ui.com)
- [React Hook Form](https://react-hook-form.com)
- [TanStack Table](https://tanstack.com/table)

---

**Document Version**: 1.0  
**Date**: 2025-07-03  
**Author**: Claude (AI Assistant)  
**Status**: Draft for Review