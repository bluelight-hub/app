# Frontend Audit Logging Guide

This guide explains how to integrate audit logging in the Bluelight Hub frontend application.

## Overview

The frontend audit logging system provides comprehensive tracking of user actions, API calls, and system events. All audit logs are automatically enriched with user context and sent to the backend for persistent storage.

## Architecture

### Core Components

1. **AuditLogger** (`/utils/audit.ts`)
   - Singleton service for logging audit events
   - Automatic batching for performance
   - Immediate sending for critical events
   - User context enrichment

2. **Audit Interceptor** (`/utils/auditInterceptor.ts`)
   - Automatic logging of all API calls
   - Request/response tracking
   - Error capture and reporting

3. **Audit Hooks** (`/hooks/useAuditedAction.ts`)
   - React hooks for component-level auditing
   - Form submission tracking
   - Navigation logging
   - Data change tracking

## Usage Examples

### Basic Logging

```typescript
import { useAuditLogger } from '@/hooks';

function UserProfile() {
  const audit = useAuditLogger();

  const handleProfileUpdate = async (data) => {
    try {
      await updateProfile(data);
      
      // Log successful action
      await audit.logSuccess('update-profile', 'users', {
        resourceId: data.userId,
        metadata: { fields: Object.keys(data) }
      });
    } catch (error) {
      // Log error
      await audit.logError('update-profile', 'users', error);
    }
  };
}
```

### Using Audited Actions

```typescript
import { useAuditedAction } from '@/hooks';

function UserList() {
  const deleteUser = useAuditedAction(
    async (userId: string) => {
      return await api.users.delete(userId);
    },
    {
      action: 'delete-user',
      resource: 'users',
      actionType: AuditActionType.DELETE,
      severity: AuditSeverity.HIGH,
    }
  );

  // The action is automatically audited
  const handleDelete = (userId: string) => {
    deleteUser(userId);
  };
}
```

### Form Auditing

```typescript
import { useAuditedForm } from '@/hooks';

function CreateUserForm() {
  const handleSubmit = useAuditedForm(
    'users',
    'create',
    async (data) => {
      return await api.users.create(data);
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Data Change Tracking

```typescript
import { useAuditedDataChange } from '@/hooks';

function SettingsEditor({ settingsId, currentSettings }) {
  const { logDataChange } = useAuditedDataChange('settings', settingsId);

  const updateSettings = async (newSettings) => {
    await logDataChange(
      'update-settings',
      currentSettings,
      newSettings,
      { sensitiveData: true }
    );
    
    // Perform update
  };
}
```

### Navigation Tracking

```typescript
import { useAuditedNavigation } from '@/hooks';
import { useLocation, useNavigate } from 'react-router-dom';

function NavigationWrapper() {
  const { logNavigation } = useAuditedNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (to: string) => {
    logNavigation(to, location.pathname);
    navigate(to);
  };
}
```

## Automatic API Call Auditing

All API calls made through the configured fetch client are automatically audited:

```typescript
// This is automatically audited
const users = await api.users.list();

// Audit log will include:
// - HTTP method and path
// - Response status
// - Duration
// - User context
// - Error details (if failed)
```

## Audit Context

All audit logs are automatically enriched with:

- User ID and email
- User role
- Session ID
- Timestamp
- Client version
- User agent
- Request duration (for API calls)

## Security Considerations

### Sensitive Data

Mark logs containing sensitive data:

```typescript
await audit.log({
  action: 'view-payment-details',
  resource: 'payments',
  sensitiveData: true,
  compliance: ['PCI-DSS'],
});
```

### High-Severity Actions

Critical actions are logged immediately:

```typescript
await audit.logSecurity('unauthorized-access', 'admin-panel', {
  severity: AuditSeverity.CRITICAL,
  metadata: { attemptedResource: '/admin/users' }
});
```

## Performance

### Batching

Non-critical logs are batched for efficiency:
- Batch size: 10 logs
- Batch delay: 5 seconds
- Critical logs sent immediately

### Browser Events

Logs are automatically flushed on:
- Page unload
- Browser close
- Tab close

## Testing

### Mocking Audit Logger

```typescript
import { vi } from 'vitest';

vi.mock('@/utils/audit', () => ({
  auditLogger: {
    log: vi.fn(),
    logSuccess: vi.fn(),
    logError: vi.fn(),
  },
  useAuditLogger: () => ({
    log: vi.fn(),
    logSuccess: vi.fn(),
    logError: vi.fn(),
  }),
}));
```

### Testing Audited Actions

```typescript
import { renderHook } from '@testing-library/react';
import { useAuditedAction } from '@/hooks';

test('should audit successful action', async () => {
  const mockAction = vi.fn().mockResolvedValue('success');
  
  const { result } = renderHook(() =>
    useAuditedAction(mockAction, {
      action: 'test-action',
      resource: 'test',
    })
  );

  await result.current();
  
  expect(mockAction).toHaveBeenCalled();
  // Verify audit was logged
});
```

## Best Practices

1. **Use appropriate severity levels**
   - LOW: Read operations, navigation
   - MEDIUM: Updates, non-critical writes
   - HIGH: Deletes, auth actions, role changes
   - CRITICAL: Security events, system errors

2. **Include relevant metadata**
   ```typescript
   audit.log({
     action: 'export-data',
     resource: 'reports',
     metadata: {
       format: 'csv',
       recordCount: 1000,
       filters: { dateRange: '30d' }
     }
   });
   ```

3. **Use consistent action naming**
   - Format: `verb-resource`
   - Examples: `create-user`, `update-settings`, `delete-document`

4. **Track form fields**
   ```typescript
   const auditedSubmit = useAuditedForm('users', 'update', onSubmit);
   // Automatically logs which fields were submitted
   ```

5. **Handle errors gracefully**
   - Audit logging failures should not break the application
   - Errors are logged to console but don't throw

## Compliance

The audit system supports compliance tracking:

```typescript
await audit.log({
  action: 'access-medical-record',
  resource: 'patient-data',
  compliance: ['HIPAA'],
  sensitiveData: true,
  metadata: {
    patientId: 'encrypted-id',
    accessReason: 'treatment',
  }
});
```

## Future Enhancements

1. **Offline Support**
   - Queue logs in IndexedDB when offline
   - Sync when connection restored

2. **User Activity Analytics**
   - Real-time dashboards
   - Usage patterns
   - Performance metrics

3. **Advanced Filtering**
   - Client-side log viewer
   - Export capabilities
   - Search and filter options