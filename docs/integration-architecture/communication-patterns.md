# Communication Patterns

## 1. Request-Response (REST)

**Pattern:** Synchronous HTTP requests for CRUD operations

**Example Flow:**
```
Frontend                  Backend                   Database
   │                         │                          │
   ├─── GET /api/einsaetze ─►│                          │
   │                         ├─── SELECT * FROM Einsatz ►│
   │                         │◄────────────────────────┤
   │◄─── 200 OK + JSON ──────┤                          │
   │                         │                          │
```

**Usage:**
- User management (GET /api/users, POST /api/users)
- Einsatz CRUD (GET /api/einsaetze/:id, PATCH /api/einsaetze/:id)
- ETB operations (POST /api/etb/:id/eintraege)
- Lagekarte POI management (POST /api/lagekarten/:id/pois)

## 2. Optimistic Updates

**Pattern:** Update UI immediately, sync with backend asynchronously

**Example Flow:**
```
Frontend (TanStack Query)           Backend
   │                                   │
   ├─ User clicks "Archive"            │
   ├─ UI updates instantly (optimistic)│
   ├─ POST /api/einsaetze/:id/archive ►│
   │                                   ├─ Validate + Update DB
   │◄─ 200 OK ─────────────────────────┤
   ├─ Confirm optimistic update        │
   │   OR revert on error              │
```

**Usage:**
- ETB entry creation (instant feedback)
- POI position updates on map
- Einsatz status changes
- User activation/deactivation

## 3. Cookie-Based Authentication

**Pattern:** JWT tokens stored in httpOnly cookies (no localStorage)

**Advantages:**
- XSS protection (tokens not accessible via JavaScript)
- CSRF protection (sameSite: strict)
- Automatic token refresh
- Secure transmission (HTTPS in production)

---
