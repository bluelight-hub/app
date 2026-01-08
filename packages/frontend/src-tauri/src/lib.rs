mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .manage(storage::StorageState::default())
    .invoke_handler(tauri::generate_handler![
      storage::storage_get,
      storage::storage_set,
      storage::storage_remove,
      storage::storage_clear,
    ])
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_store::Builder::default().build());

  // Barcode scanner is only available on mobile (iOS/Android)
  #[cfg(mobile)]
  let builder = builder.plugin(tauri_plugin_barcode_scanner::init());

  builder
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
