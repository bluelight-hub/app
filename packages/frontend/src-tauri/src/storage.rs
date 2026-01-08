use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

/// In-Memory Storage State für Tauri Commands
///
/// Nutzt Mutex für Thread-Safe Access zu HashMap.
/// Daten werden im Arbeitsspeicher gehalten und sind NICHT persistent über App-Restarts.
#[derive(Default)]
pub struct StorageState(Mutex<HashMap<String, String>>);

/// Liest einen Wert aus dem Storage
///
/// # Arguments
/// * `key` - Storage Key
/// * `state` - Tauri Managed State
///
/// # Returns
/// Option<String> - Wert wenn vorhanden, None wenn nicht gefunden
#[tauri::command]
pub fn storage_get(key: String, state: State<StorageState>) -> Option<String> {
    state.0.lock().unwrap().get(&key).cloned()
}

/// Speichert einen Wert im Storage
///
/// # Arguments
/// * `key` - Storage Key
/// * `value` - Wert als String
/// * `state` - Tauri Managed State
#[tauri::command]
pub fn storage_set(key: String, value: String, state: State<StorageState>) {
    state.0.lock().unwrap().insert(key, value);
}

/// Entfernt einen Wert aus dem Storage
///
/// # Arguments
/// * `key` - Storage Key
/// * `state` - Tauri Managed State
///
/// # Returns
/// bool - true wenn Wert entfernt wurde, false wenn Key nicht existierte
#[tauri::command]
pub fn storage_remove(key: String, state: State<StorageState>) -> bool {
    state.0.lock().unwrap().remove(&key).is_some()
}

/// Löscht alle Einträge aus dem Storage
///
/// # Arguments
/// * `state` - Tauri Managed State
#[tauri::command]
pub fn storage_clear(state: State<StorageState>) {
    state.0.lock().unwrap().clear();
}
