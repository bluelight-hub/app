# Data Flow Diagrams

## Complete Request Flow (Example: Create ETB Entry)

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│ Component│       │TanStack  │       │Generated │       │  Backend │
│  (UI)    │       │  Query   │       │ API Client│       │  (NestJS)│
└────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │                   │
     ├─ onClick() ──────►                   │                   │
     │                  │                   │                   │
     │                  ├─ mutate(data) ────►                   │
     │                  │                   │                   │
     │                  │                   ├─ POST /api/etb/:id/eintraege ─►
     │                  │                   │   Cookie: accessToken
     │                  │                   │   Body: { text, priority }
     │                  │                   │                   │
     │                  │                   │                   ├─ Validate JWT
     │                  │                   │                   ├─ Validate DTO
     │                  │                   │                   ├─ Save to DB
     │                  │                   │                   │
     │                  │                   │◄─ 201 Created ────┤
     │                  │                   │   { id, text, ... }
     │                  │◄──────────────────┤                   │
     │                  │                   │                   │
     │                  ├─ onSuccess() ─────►                   │
     │                  ├─ Invalidate cache │                   │
     │                  ├─ Refetch query ───┼───────────────────►
     │                  │                   │                   │
     │◄─ UI updates ────┤                   │                   │
     │  (new entry)     │                   │                   │
     │                  │                   │                   │
```

## File Upload Flow

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│ Component│       │ File     │       │ Backend  │       │Filesystem│
│  (UI)    │       │ Input    │       │ (Multer) │       │          │
└────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                   │                   │
     ├─ Select file ────►                   │                   │
     │                  │                   │                   │
     ├─ FormData ────────►                   │                   │
     │  .append('file', file)                │                   │
     │                  │                   │                   │
     ├─ POST /api/upload ┼───────────────────►                   │
     │  Content-Type: multipart/form-data    │                   │
     │                  │                   │                   │
     │                  │                   ├─ Parse multipart ─►│
     │                  │                   ├─ Save to disk ─────►
     │                  │                   │◄──────────────────┤
     │                  │                   │                   │
     │◄─────────────────┼───────────────────┤                   │
     │  { url, filename }                   │                   │
     │                  │                   │                   │
```

---
