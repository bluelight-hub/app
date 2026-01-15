/**
 * Tauri Store Integration Examples
 *
 * Diese Datei zeigt praktische Verwendungsbeispiele des Store Services.
 * Nicht als Unit-Test, sondern als Dokumentation/Referenz.
 */

// Example 1: Basic Key-Value Storage
async function exampleBasicStorage() {
  const { storeService } = await import('../store.service');

  // Initialize
  await storeService.initialize();

  // Set values
  await storeService.set('userTheme', 'dark');
  await storeService.set('sidebarWidth', 250);
  await storeService.set('lastSync', new Date().toISOString());

  // Retrieve values
  const theme = await storeService.get('userTheme', 'light');
  console.log('Theme:', theme); // dark

  const width = await storeService.get('sidebarWidth', 300);
  console.log('Sidebar width:', width); // 250

  // Check key existence
  const hasTheme = await storeService.has('userTheme');
  console.log('Has theme setting:', hasTheme); // true

  // Delete specific key
  await storeService.delete('lastSync');

  // List all keys
  const allKeys = await storeService.keys();
  console.log('Stored keys:', allKeys); // ['userTheme', 'sidebarWidth']

  // Clear all
  // await storeService.clear(); // Use with caution!
}

// Example 2: Using with React Hooks
function exampleReactHook() {
  // In a React Component
  // const [theme, setTheme] = useStore('userTheme', 'light');
  //
  // useEffect(() => {
  //   if (theme === 'dark') {
  //     document.documentElement.classList.add('dark');
  //   }
  // }, [theme]);
  //
  // return (
  //   <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  //     Toggle Theme
  //   </button>
  // );
}

// Example 3: Complex Object Storage
interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: {
    notifications: boolean;
    language: string;
    timezone: string;
  };
}

async function exampleComplexObject() {
  const { storeService } = await import('../store.service');

  const profile: UserProfile = {
    id: 'user-123',
    name: 'Max Mustermann',
    email: 'max@example.de',
    preferences: {
      notifications: true,
      language: 'de',
      timezone: 'Europe/Berlin',
    },
  };

  // Save complex object
  await storeService.set('userProfile', profile);

  // Retrieve and use
  const savedProfile = await storeService.get<UserProfile>('userProfile');
  console.log('Stored profile:', savedProfile);
}

// Example 4: Settings Management with useStoreObject
// Note: AppSettings interface shown in comments below for documentation
function exampleSettingsComponent() {
  // const { values, set, setAll, isLoading } = useStoreObject<AppSettings>(
  //   'appSettings',
  //   {
  //     theme: 'light',
  //     language: 'de',
  //     autoSave: true,
  //     enableNotifications: true,
  //   }
  // );
  //
  // if (isLoading) return <div>Loading settings...</div>;
  //
  // return (
  //   <div className="settings-panel">
  //     <select
  //       value={values.theme}
  //       onChange={(e) => set('theme', e.target.value as any)}
  //     >
  //       <option value="light">Light</option>
  //       <option value="dark">Dark</option>
  //     </select>
  //
  //     <button
  //       onClick={() =>
  //         setAll({
  //           theme: 'dark',
  //           language: 'en',
  //           autoSave: false,
  //         })
  //       }
  //     >
  //       Apply Dark Mode Settings
  //     </button>
  //   </div>
  // );
}

// Example 5: Error Handling
async function exampleErrorHandling() {
  const { storeService } = await import('../store.service');

  try {
    await storeService.set('testKey', { data: 'test' });
  } catch (error) {
    console.error('Failed to save to store:', error);
    // Graceful fallback or UI error notification
  }

  try {
    const value = await storeService.get('testKey');
    if (!value) {
      console.warn('Key not found in store, using default');
    }
  } catch (error) {
    console.error('Failed to read from store:', error);
  }
}

// Example 6: Authentication Token Management
async function exampleAuthTokens() {
  const { storeService } = await import('../store.service');

  // Store tokens securely
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  const refreshToken = 'refresh-token-abc123...';

  await storeService.set('authToken', authToken);
  await storeService.set('refreshToken', refreshToken);

  // Check authentication on app startup
  const token = await storeService.get<string>('authToken');
  const isAuthenticated = !!token;

  // Logout - clear tokens
  if (isAuthenticated === false) {
    await storeService.delete('authToken');
    await storeService.delete('refreshToken');
  }
}

// Example 7: Cache Management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

async function exampleCacheWithTTL<T>(key: string, getter: () => Promise<T>, ttl = 3600000) {
  const { storeService } = await import('../store.service');

  // Check if cached and still valid
  const cached = await storeService.get<CacheEntry<T>>(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }

  // Fetch fresh data
  const data = await getter();

  // Cache it
  await storeService.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  return data;
}

// Example 8: Multi-part Form State Persistence
interface MultipartFormData {
  step1: { name: string; email: string };
  step2: { phone: string; address: string };
  step3: { confirmations: { terms: boolean; privacy: boolean } };
}

async function exampleMultipartForm() {
  const { storeService } = await import('../store.service');

  const formKey = 'multipartForm';

  // Auto-save form progress
  const saveFormStep = async (stepName: keyof MultipartFormData, data: MultipartFormData[typeof stepName]) => {
    const existing = await storeService.get<Partial<MultipartFormData>>(formKey, {});
    const updated = { ...existing, [stepName]: data };
    await storeService.set(formKey, updated);
  };

  // Retrieve form data
  const loadFormData = async () => {
    return await storeService.get<Partial<MultipartFormData>>(formKey, {});
  };

  // Clear form after submission
  const clearForm = async () => {
    await storeService.delete(formKey);
  };

  return { saveFormStep, loadFormData, clearForm };
}

export { exampleBasicStorage, exampleReactHook, exampleComplexObject, exampleSettingsComponent, exampleErrorHandling, exampleAuthTokens, exampleCacheWithTTL, exampleMultipartForm };
