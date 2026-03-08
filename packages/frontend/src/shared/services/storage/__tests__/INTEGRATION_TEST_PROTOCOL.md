# TauriStorageAdapter Integration Test Protocol

**Datum:** 2026-01-08
**Komponente:** TauriStorageAdapter (Story 2.1, Task 2, Subtask 2.3)
**Tester:** Automated via Claude Code

## Test Environment

- **Platform:** Tauri Desktop App (macOS/Windows/Linux)
- **Backend:** Rust Storage Commands (`storage.rs`)
- **Frontend:** TauriStorageAdapter (`tauri-storage-adapter.ts`)
- **Test Type:** Manual Integration Test (E2E)

## Test Cases

### TC1: Set-Get-Remove-Clear Roundtrip

**Ziel:** Vollständiger CRUD-Zyklus über IPC Boundary

**Pre-Conditions:**

- Tauri App gestartet: `pnpm --filter @bluelight-hub/frontend dev`
- Browser DevTools geöffnet (Console)

**Test Steps:**

```typescript
// 1. Create Adapter Instance
const storage = new TauriStorageAdapter();

// 2. SET: Store initial value
await storage.setItem('test-key', 'initial-value');
console.log('✅ SET completed');

// 3. GET: Retrieve stored value
const value1 = await storage.getItem('test-key');
console.assert(value1 === 'initial-value', 'GET failed: Expected "initial-value"');
console.log('✅ GET returned:', value1);

// 4. SET: Update value
await storage.setItem('test-key', 'updated-value');
console.log('✅ UPDATE completed');

// 5. GET: Verify update
const value2 = await storage.getItem('test-key');
console.assert(value2 === 'updated-value', 'UPDATE failed: Expected "updated-value"');
console.log('✅ GET after UPDATE:', value2);

// 6. REMOVE: Delete entry
await storage.removeItem('test-key');
console.log('✅ REMOVE completed');

// 7. GET: Verify deletion
const value3 = await storage.getItem('test-key');
console.assert(value3 === null, 'REMOVE failed: Expected null');
console.log('✅ GET after REMOVE:', value3);

// 8. SET: Create multiple entries
await storage.setItem('key1', 'value1');
await storage.setItem('key2', 'value2');
await storage.setItem('key3', 'value3');
console.log('✅ Multiple SET completed');

// 9. GET: Verify multiple entries
const v1 = await storage.getItem('key1');
const v2 = await storage.getItem('key2');
const v3 = await storage.getItem('key3');
console.assert(v1 === 'value1' && v2 === 'value2' && v3 === 'value3', 'Multiple GET failed');
console.log('✅ Multiple GET:', { v1, v2, v3 });

// 10. CLEAR: Delete all entries
await storage.clear();
console.log('✅ CLEAR completed');

// 11. GET: Verify all deleted
const after1 = await storage.getItem('key1');
const after2 = await storage.getItem('key2');
const after3 = await storage.getItem('key3');
console.assert(after1 === null && after2 === null && after3 === null, 'CLEAR failed');
console.log('✅ GET after CLEAR:', { after1, after2, after3 });
```

**Expected Result:**

- Alle Console Assertions bestehen
- Keine Fehler in Browser Console
- Keine Rust Panics in Tauri Terminal

**Status:** ⏳ PENDING (Requires manual execution)

---

### TC2: App Restart Persistence Test

**Ziel:** Verifizieren dass Storage NICHT persistent ist (In-Memory)

**Pre-Conditions:**

- TC1 erfolgreich durchgeführt
- Tauri App läuft

**Test Steps:**

```typescript
// 1. SET: Store data before restart
const storage = new TauriStorageAdapter();
await storage.setItem('persist-test', 'should-be-lost');
console.log('✅ Data stored before restart');

// 2. GET: Verify data exists
const beforeRestart = await storage.getItem('persist-test');
console.assert(beforeRestart === 'should-be-lost', 'Pre-restart GET failed');
console.log('✅ Data exists before restart:', beforeRestart);

// 3. RESTART: Close and reopen Tauri App
// (User Action: Quit App via Cmd+Q / Alt+F4, then `pnpm dev` again)

// 4. GET: Verify data is lost
const afterRestart = await storage.getItem('persist-test');
console.assert(afterRestart === null, 'Persistence VIOLATION: Data should be lost!');
console.log('✅ Data lost after restart (expected):', afterRestart);
```

**Expected Result:**

- Data nach App-Restart NICHT mehr vorhanden (RAM-only Storage)
- `afterRestart === null`

**Status:** ⏳ PENDING (Requires manual execution)

---

### TC3: Error Handling & Edge Cases

**Ziel:** Boundary Conditions und Error Scenarios

**Test Steps:**

```typescript
const storage = new TauriStorageAdapter();

// 1. GET non-existent key
const notFound = await storage.getItem('does-not-exist');
console.assert(notFound === null, 'Non-existent key should return null');
console.log('✅ Non-existent key:', notFound);

// 2. REMOVE non-existent key (should not throw)
await storage.removeItem('does-not-exist');
console.log('✅ Remove non-existent key succeeded');

// 3. SET empty string
await storage.setItem('empty-key', '');
const empty = await storage.getItem('empty-key');
console.assert(empty === '', 'Empty string should be stored');
console.log('✅ Empty string storage:', empty);

// 4. SET large value (stress test)
const largeValue = 'x'.repeat(10000); // 10KB string
await storage.setItem('large-key', largeValue);
const large = await storage.getItem('large-key');
console.assert(large === largeValue, 'Large value storage failed');
console.log('✅ Large value (10KB):', large?.length);

// 5. CLEAR on empty storage (should not throw)
await storage.clear();
await storage.clear(); // Double clear
console.log('✅ Double clear succeeded');
```

**Expected Result:**

- Keine Exceptions/Panics
- Edge Cases werden korrekt behandelt

**Status:** ⏳ PENDING (Requires manual execution)

---

## Test Execution Instructions

### Setup

1. Build Rust Backend:
   ```bash
   cd packages/frontend
   pnpm build:tauri # Or start dev mode
   ```

2. Start Tauri Dev App:
   ```bash
   pnpm --filter @bluelight-hub/frontend dev
   ```

3. Open Browser DevTools:
    - Right-click → "Inspect Element"
    - Switch to Console tab

### Running Tests

1. Copy Test Code from TC1/TC2/TC3
2. Paste in Browser Console
3. Press Enter
4. Verify Console Output (✅ markers)
5. Check for Errors/Failures

### Troubleshooting

**IPC Errors:**

- Check Rust Commands sind registriert in `lib.rs`
- Verify `StorageState` ist managed: `.manage(storage::StorageState::default())`
- Check Command Names match: `storage_get`, `storage_set`, etc.

**Type Errors:**

- Ensure `@tauri-apps/api` ist installed
- Check `tsconfig.json` includes Tauri types

**Runtime Panics:**

- Check Rust Terminal Output
- Verify Mutex Lock wird korrekt released

---

## Test Results

| Test Case | Status | Date | Notes |
|-----------|--------|------|-------|
| TC1: CRUD Roundtrip | ⏳ PENDING | - | Awaiting manual execution |
| TC2: Persistence Test | ⏳ PENDING | - | Awaiting manual execution |
| TC3: Error Handling | ⏳ PENDING | - | Awaiting manual execution |

---

## Known Limitations

1. **In-Memory Only:** Daten gehen bei App-Restart verloren (by design)
2. **No Transactions:** Keine atomaren Multi-Key Operations
3. **No Expiration:** Kein TTL/Expiry für Keys
4. **No Size Limits:** Keine Memory Limits (kann theoretisch OOM führen)

---

## Future Improvements

1. **Persistent Storage:** Nutze `tauri-plugin-store` für Disk Persistence
2. **Encryption:** Sensitive Daten verschlüsseln (z.B. Tokens)
3. **Compression:** Große Values komprimieren (zlib/brotli)
4. **Metrics:** Storage Size Tracking, Hit/Miss Rates
5. **Auto-Cleanup:** LRU Eviction bei Memory Limits

---

**Sign-Off:**

- Developer: Claude Sonnet 4.5
- Reviewer: (Pending manual execution by human tester)
