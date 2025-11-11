# Authentication Flow

## JWT Cookie-Based Authentication

**Security Features:**
- httpOnly cookies (not accessible via JavaScript)
- sameSite: strict (CSRF protection)
- secure: true (HTTPS only in production)
- Automatic token refresh

## 1. Unified Auth Flow (Login/Auto-Registration)

```
┌────────────┐                 ┌────────────┐                 ┌────────────┐
│  Frontend  │                 │  Backend   │                 │ PostgreSQL │
└─────┬──────┘                 └─────┬──────┘                 └─────┬──────┘
      │                              │                              │
      ├─── POST /api/auth/unified ──►│                              │
      │    { username: "user123" }   │                              │
      │                              ├─── SELECT FROM User ────────►│
      │                              │    WHERE username=?           │
      │                              │◄─────────────────────────────┤
      │                              │                              │
      │                              ├─ User exists?                │
      │                              │  YES: Generate JWT           │
      │                              │  NO:  Create user + JWT      │
      │                              │                              │
      │                              ├─ Set cookies:                │
      │                              │  - accessToken (15min)       │
      │                              │  - refreshToken (7 days)     │
      │                              │                              │
      │◄─── 200 OK ──────────────────┤                              │
      │    Set-Cookie: accessToken   │                              │
      │    Set-Cookie: refreshToken  │                              │
      │    { user: {...}, isNewUser }│                              │
      │                              │                              │
      ├─ Store user in TanStack ─────┤                              │
      │  Store (local state)         │                              │
      │                              │                              │
```

**Frontend Code:**
```typescript
// packages/frontend/src/hooks/useAuth.ts
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const useUnifiedAuth = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (username: string) => {
      const response = await api.auth().authControllerUnifiedAuth({ username });
      return response.data;
    },
    onSuccess: (data) => {
      // Cookies are automatically set by backend
      setUser(data.user);
      if (data.isNewUser) {
        toast.success('Willkommen! Ihr Account wurde erstellt.');
      } else {
        toast.success('Willkommen zurück!');
      }
    },
  });
};
```

## 2. Admin Login Flow (Password-Based)

```
Frontend                  Backend                   Database
   │                         │                          │
   ├─ POST /api/auth/admin ─►│                          │
   │  { password: "..." }    │                          │
   │                         ├─ Verify admin password   │
   │                         ├─ Generate JWT            │
   │                         ├─ Set cookies             │
   │◄─ 200 OK + cookies ────┤                          │
   │                         │                          │
```

## 3. Authenticated Request Flow

```
Frontend                  Backend                   Database
   │                         │                          │
   ├─ GET /api/einsaetze ───►│                          │
   │  Cookie: accessToken    │                          │
   │                         ├─ Verify JWT signature    │
   │                         ├─ Check token expiration  │
   │                         ├─ Extract user from token │
   │                         ├─ Query Einsaetze ───────►│
   │                         │◄─────────────────────────┤
   │◄─ 200 OK + data ────────┤                          │
   │                         │                          │
```

## 4. Token Refresh Flow

```
Frontend                  Backend
   │                         │
   ├─ GET /api/einsaetze ───►│
   │  Cookie: accessToken    │
   │  (expired)              ├─ 401 Unauthorized
   │◄────────────────────────┤
   │                         │
   ├─ POST /api/auth/refresh ►│
   │  Cookie: refreshToken   │
   │                         ├─ Verify refresh token
   │                         ├─ Generate new accessToken
   │                         ├─ Set new cookie
   │◄─ 200 OK ───────────────┤
   │  Set-Cookie: accessToken│
   │                         │
   ├─ Retry GET /api/einsaetze ►│
   │  Cookie: new accessToken│
   │◄─ 200 OK + data ────────┤
   │                         │
```

**Frontend Auto-Refresh:**
```typescript
// packages/frontend/src/lib/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Send cookies
});

// Interceptor for automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt token refresh
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---
