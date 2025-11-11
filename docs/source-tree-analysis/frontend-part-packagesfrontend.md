# Frontend Part (packages/frontend/)

**Typ:** Desktop Application
**Framework:** React 19 + Vite + Tauri 2
**Entry Point:** `src/main.tsx` (React) + `src-tauri/src/main.rs` (Tauri)
**Port:** 5173 (Vite dev server), Tauri app in production
**UI Framework:** Tailwind CSS + Headless UI (+ TailwindUI Premium Komponenten)

## Frontend-Struktur

```
packages/frontend/
├── src/
│   ├── main.tsx                        # 🚀 React entry point
│   │   # - Root render with StrictMode
│   │   # - ChakraProvider (UI Framework)
│   │   # - TanStack Router integration
│   │   # - TanStack Query setup
│   │
│   ├── App.tsx                         # Root component (deprecated, use router.tsx)
│   │
│   ├── router.tsx                      # 🗺️ React Router configuration
│   │   # - TanStack Router setup
│   │   # - Route guards (auth, admin)
│   │   # - Global layout with providers
│   │
│   ├── components/                     # 🎨 Atomic Design hierarchy
│   │   │
│   │   ├── atoms/                      # 24 Base components
│   │   │   ├── button.atom.tsx         # Primary UI button (variants: primary, secondary, danger)
│   │   │   ├── input.atom.tsx          # Form input with validation states
│   │   │   ├── badge.atom.tsx          # Status badges
│   │   │   ├── card.atom.tsx           # Card container
│   │   │   ├── spinner.atom.tsx        # Loading spinner
│   │   │   ├── alert.atom.tsx          # Alert/notification
│   │   │   ├── heading.atom.tsx        # Typography headings
│   │   │   ├── text.atom.tsx           # Body text
│   │   │   ├── label.atom.tsx          # Form labels
│   │   │   ├── textarea.atom.tsx       # Multi-line text input
│   │   │   ├── select.atom.tsx         # Dropdown select
│   │   │   ├── date-input.atom.tsx     # Date picker
│   │   │   ├── progress-bar.atom.tsx   # Progress bar
│   │   │   ├── icon-button.atom.tsx    # Icon-only button
│   │   │   ├── close-button.atom.tsx   # Modal close button
│   │   │   ├── poi-type-button.atom.tsx # POI type selection button
│   │   │   ├── color-mode-icon.atom.tsx # Dark mode icon
│   │   │   ├── command-trigger.atom.tsx # Command palette trigger
│   │   │   ├── confirmation-prompt.atom.tsx # Confirm dialog
│   │   │   ├── container.atom.tsx      # Layout container
│   │   │   ├── form-field.atom.tsx     # Form field wrapper
│   │   │   ├── image.atom.tsx          # Image component
│   │   │   ├── LoadingState.tsx        # Loading state placeholder
│   │   │   └── ErrorState.tsx          # Error state placeholder
│   │   │
│   │   ├── molecules/                  # 46 Composite components
│   │   │   ├── shared/                 # Reusable molecules (17 components)
│   │   │   │   ├── dialog.molecule.tsx # Modal dialog (Headless UI)
│   │   │   │   ├── table.molecule.tsx  # Data table
│   │   │   │   ├── tabs.molecule.tsx   # Tab navigation
│   │   │   │   ├── timeline.molecule.tsx # Timeline component
│   │   │   │   ├── search-input.molecule.tsx # Search with debounce
│   │   │   │   ├── auth-card.molecule.tsx # Auth form card
│   │   │   │   ├── auth-footer.molecule.tsx # Auth footer
│   │   │   │   ├── color-mode-button.molecule.tsx # Dark mode toggle
│   │   │   │   ├── color-mode-menu.molecule.tsx # Color mode dropdown
│   │   │   │   ├── password-input.molecule.tsx # Password input with toggle
│   │   │   │   ├── password-strength-indicator.molecule.tsx # Password strength
│   │   │   │   ├── poi-type-dropdown.molecule.tsx # POI type selector
│   │   │   │   └── logo-with-indicator.molecule.tsx # Logo with status
│   │   │   │
│   │   │   ├── einsatz/                # Einsatz-specific molecules (13 components)
│   │   │   │   ├── EinsatzHeader.tsx   # Einsatz detail header
│   │   │   │   ├── EinsatzInfoCard.tsx # Info card with stats
│   │   │   │   ├── EinsatzListItem.tsx # List item for table
│   │   │   │   ├── EinsatzStatsCard.tsx # Statistics card
│   │   │   │   ├── EinsatzTimelineWidget.tsx # Timeline widget
│   │   │   │   ├── EinsatzResourceWidget.tsx # Resources overview
│   │   │   │   ├── ModuleButton.tsx    # Module navigation button
│   │   │   │   ├── ModuleOverviewCard.tsx # Module card
│   │   │   │   ├── PlaceholderModule.tsx # Coming soon placeholder
│   │   │   │   ├── ArchivedBanner.tsx  # Archived status banner
│   │   │   │   ├── einsatz-status-badge.molecule.tsx # Status badge
│   │   │   │   ├── einsatz-completeness-bar.molecule.tsx # Completeness %
│   │   │   │   └── einsatz-incomplete-alert.molecule.tsx # Incomplete warning
│   │   │   │
│   │   │   ├── etb/                    # ETB molecules (8 components)
│   │   │   │   ├── EtbSearchBar.tsx    # Search with filters
│   │   │   │   ├── EtbFilterControls.tsx # Filter controls
│   │   │   │   ├── EtbTableHeader.tsx  # Table header
│   │   │   │   ├── EtbTableBody.tsx    # Table body with entries
│   │   │   │   ├── EtbEmptyState.tsx   # Empty state placeholder
│   │   │   │   ├── EtbResultsCount.tsx # Result count badge
│   │   │   │   ├── EtbFormActions.tsx  # Form action buttons
│   │   │   │   └── EtbTextbausteinPreview.tsx # Textbaustein preview
│   │   │   │
│   │   │   ├── lagekarte/              # Lagekarte molecules (4 components)
│   │   │   │   ├── LayerToggle/        # Layer visibility toggle
│   │   │   │   ├── OfflineIndicator/   # Offline status indicator
│   │   │   │   ├── PoiPopup/           # POI detail popup
│   │   │   │   ├── SelectedShapeToolbar.tsx # Shape editing toolbar
│   │   │   │   └── ShapeContextMenu.tsx # Right-click context menu
│   │   │   │
│   │   │   ├── dashboard/              # Dashboard molecules (2 components)
│   │   │   │   ├── StatusCard.tsx      # Status overview card
│   │   │   │   └── MobileStatusBar.tsx # Mobile status bar
│   │   │   │
│   │   │   ├── auth/                   # Auth molecules (1 component)
│   │   │   │   └── AuthLoading.tsx     # Auth loading state
│   │   │   │
│   │   │   ├── admin/                  # Admin molecules (1 component)
│   │   │   │   └── UserFormFields.tsx  # User form fields
│   │   │   │
│   │   │   ├── form/                   # Form molecules (4 components)
│   │   │   │   ├── FormFieldWrapper.tsx # Form field container
│   │   │   │   ├── ColorPicker.molecule.tsx # Color picker
│   │   │   │   └── RangeSlider.molecule.tsx # Range slider
│   │   │   │
│   │   │   └── sidebar/                # Sidebar molecules
│   │   │
│   │   ├── organisms/                  # 73 Complex modules
│   │   │   ├── etb/                    # ETB organisms (17 components) - HIGHEST COMPLEXITY
│   │   │   │   ├── EtbEntryList.tsx    # Entry list with pagination
│   │   │   │   ├── EtbEntryForm.tsx    # Entry creation form
│   │   │   │   ├── EditEtbEntryModal.tsx # Entry editing modal
│   │   │   │   ├── EtbKategorieSelect.tsx # Category selector
│   │   │   │   ├── EtbTextInput.tsx    # Text input with autocomplete
│   │   │   │   ├── EtbTextbausteinSelect.tsx # Template selector
│   │   │   │   ├── EtbFullscreenView/  # Fullscreen ETB view
│   │   │   │   ├── components/         # ETB sub-components
│   │   │   │   ├── constants/          # ETB constants
│   │   │   │   ├── hooks/              # ETB-specific hooks
│   │   │   │   └── types.ts            # ETB TypeScript types
│   │   │   │
│   │   │   ├── lagekarte/              # Lagekarte organisms (16 components)
│   │   │   │   ├── LagekarteView/      # Main map view component
│   │   │   │   ├── PropertyPanel/      # Shape/POI property panel
│   │   │   │   ├── FullscreenCloseButton/ # Fullscreen exit
│   │   │   │   ├── toolbar/            # Map toolbar components
│   │   │   │   │   ├── DrawingToolbar.tsx # Drawing tools
│   │   │   │   │   ├── CoordinateDisplay.tsx # MGRS/LatLng display
│   │   │   │   │   └── ZoomControls.tsx # Zoom buttons
│   │   │   │   ├── layers/             # Map layers
│   │   │   │   │   ├── BaseLayer.tsx   # OSM base layer
│   │   │   │   │   ├── PoiLayer.tsx    # POI markers
│   │   │   │   │   ├── ShapeLayer.tsx  # Drawing shapes
│   │   │   │   │   └── ClusterLayer.tsx # POI clustering
│   │   │   │   ├── modals/             # Map modals
│   │   │   │   │   ├── AddPoiModal.tsx # POI creation
│   │   │   │   │   ├── EditPoiModal.tsx # POI editing
│   │   │   │   │   └── ScreenshotModal.tsx # Screenshot capture
│   │   │   │   └── controls/           # Custom Leaflet controls
│   │   │   │
│   │   │   ├── command-palette/        # Command palette (6 components)
│   │   │   │   ├── CommandPalette.tsx  # Main command palette
│   │   │   │   ├── CommandPaletteErrorBoundary.tsx # Error boundary
│   │   │   │   ├── components/         # Command sub-components
│   │   │   │   ├── hooks/              # Command hooks
│   │   │   │   ├── types.ts            # Command types
│   │   │   │   └── utils.ts            # Command utilities
│   │   │   │
│   │   │   ├── einsatz/                # Einsatz organisms (5 components)
│   │   │   │   ├── EinsatzDashboard.tsx # Einsatz overview
│   │   │   │   ├── EinsatzDetailView.tsx # Einsatz detail
│   │   │   │   ├── EinsatzCreateForm.tsx # Creation form
│   │   │   │   ├── SingleEinsatzDashboard.tsx # Single mission view
│   │   │   │   └── ArchiveConfirmationModal.tsx # Archive confirmation
│   │   │   │
│   │   │   ├── admin/                  # Admin organisms (4 components)
│   │   │   │   ├── UsersTable.tsx      # User management table
│   │   │   │   ├── CreateUserDialog.tsx # User creation
│   │   │   │   ├── EditUserDialog.tsx  # User editing
│   │   │   │   └── ConfirmDeleteDialog.tsx # Delete confirmation
│   │   │   │
│   │   │   ├── auth/                   # Auth organisms (2 components)
│   │   │   │   ├── UnifiedAuthForm.tsx # Login/Register form
│   │   │   │   └── LoginWindow.tsx     # Login window container
│   │   │   │
│   │   │   ├── dashboard/              # Dashboard organisms (2 components)
│   │   │   │   ├── FilterPanel.tsx     # Filter panel
│   │   │   │   └── MobileFilterDialog.tsx # Mobile filter dialog
│   │   │   │
│   │   │   └── einsaetze/              # Einsatz list organisms
│   │   │
│   │   ├── templates/                  # 4 Page layouts
│   │   │   ├── AuthLayout.tsx          # Auth page layout (centered card)
│   │   │   ├── AdminLayout.tsx         # Admin panel layout (sidebar)
│   │   │   ├── AdminDashboardLayout.tsx # Admin dashboard layout
│   │   │   └── SingleEinsatzLayout.tsx # Single mission layout (tabbed)
│   │   │
│   │   ├── pages/                      # 6 Route-bound pages
│   │   │   ├── index.page.tsx          # Landing page
│   │   │   ├── app/                    # App pages
│   │   │   │   └── einsatz/            # Einsatz pages
│   │   │   │       ├── $einsatzId/     # Single mission subpages
│   │   │   │       │   ├── etb.page.tsx # ETB page
│   │   │   │       │   ├── lagekarte.page.tsx # Lagekarte page
│   │   │   │       │   └── overview.page.tsx # Overview page
│   │   │   │       └── index.page.tsx  # Mission list
│   │   │   └── admin/                  # Admin pages
│   │   │       ├── auth/               # Admin auth pages
│   │   │       ├── dashboard/          # Admin dashboard
│   │   │       └── settings/           # Admin settings
│   │   │
│   │   └── ui/                         # Chakra UI customization
│   │       ├── provider.tsx            # ChakraProvider with theme
│   │       ├── color-mode.tsx          # Color mode utilities
│   │       └── combobox.tsx            # Combobox component
│   │
│   ├── hooks/                          # 24+ Custom React hooks
│   │   ├── useAuth.ts                  # 🔐 Authentication hooks
│   │   │   # - useLogin() - User login mutation
│   │   │   # - useLogout() - Logout mutation
│   │   │   # - useCheckAuth() - Auth status query
│   │   │   # - useRegister() - Register mutation (if enabled)
│   │   │
│   │   ├── useAdminAuth.ts             # 🔐 Admin authentication hooks
│   │   │   # - useAdminLogin() - Admin login mutation
│   │   │   # - useAdminSetup() - Initial admin setup mutation
│   │   │   # - useAdminStatus() - Admin initialization status query
│   │   │
│   │   ├── useActiveEinsatz.ts         # 🚨 Active Einsatz context + persistence
│   │   │   # - useActiveEinsatz() - Get/Set active Einsatz ID
│   │   │   # - useActiveEinsatzData() - Get active Einsatz data (React Query)
│   │   │   # - Cross-tab sync via localStorage + StorageEvent
│   │   │   # - Persistence across sessions
│   │   │
│   │   ├── useEinsaetze.ts             # 🚨 Einsatz list hooks
│   │   │   # - useEinsaetze() - Paginated Einsatz list query
│   │   │   # - useInfiniteEinsaetze() - Infinite scroll query
│   │   │   # - useEinsatz() - Single Einsatz query
│   │   │   # - useCreateEinsatz() - Create mutation with optimistic update
│   │   │   # - useUpdateEinsatz() - Update mutation with optimistic update
│   │   │   # - useArchiveEinsatz() - Archive mutation
│   │   │
│   │   ├── useEinsatzStatusCounts.ts   # 🚨 Einsatz status statistics
│   │   │   # - useEinsatzStatusCounts() - Status counts query (ANGELEGT, IN_BEARBEITUNG, etc.)
│   │   │
│   │   ├── useEtb.ts                   # 📝 ETB hooks (7 hooks)
│   │   │   # - useEtb() - Get ETB with entries
│   │   │   # - useCreateEtb() - Create ETB mutation
│   │   │   # - useEtbEntries() - Get entries with filters
│   │   │   # - useCreateEtbEntry() - Create entry mutation with optimistic update
│   │   │   # - useUpdateEtbEntry() - Update entry mutation with optimistic update
│   │   │   # - useDeleteEtbEntry() - Soft-delete mutation with optimistic update
│   │   │   # - useEtbEntryHistory() - Get entry history
│   │   │   # - useEtbTextbausteine() - Get text templates
│   │   │
│   │   ├── useLagekarte.ts             # 🗺️ Lagekarte hooks with offline-first
│   │   │   # - useLagekarte() - Get Lagekarte state (networkMode: 'offlineFirst')
│   │   │   # - useSaveLagekarte() - Save Lagekarte state mutation
│   │   │   # - Offline tile caching support
│   │   │
│   │   ├── usePois.ts                  # 📍 POI hooks with geocoding
│   │   │   # - usePois() - Get POIs for Einsatz
│   │   │   # - useCreatePoi() - Create POI mutation with geocoding
│   │   │   # - useUpdatePoi() - Update POI mutation
│   │   │   # - useDeletePoi() - Delete POI mutation
│   │   │
│   │   ├── usePublicUsers.ts           # 👥 Public user list
│   │   │   # - usePublicUsers() - Get public user list (for user selection)
│   │   │
│   │   ├── useUsers.ts                 # 👥 User profile hooks
│   │   │   # - useUserProfile() - Get current user profile
│   │   │   # - useUpdateUserProfile() - Update profile mutation
│   │   │
│   │   ├── useAdminUserManagement.ts   # 👥 Admin user management hooks
│   │   │   # - useUsers() - Get all users (admin only)
│   │   │   # - useCreateUser() - Create user mutation
│   │   │   # - useUpdateUser() - Update user mutation
│   │   │   # - useLockUser() - Lock user mutation
│   │   │   # - useUnlockUser() - Unlock user mutation
│   │   │   # - useDeleteUser() - Soft-delete user mutation
│   │   │
│   │   ├── einsatz/
│   │   │   └── useEinsatzModules.ts    # Einsatz module metadata
│   │   │
│   │   ├── lagekarte/                  # 🗺️ Lagekarte-specific hooks (10 hooks)
│   │   │   ├── useLeafletPMControls.ts # Leaflet.PM drawing controls
│   │   │   ├── useShapeSelection.ts    # Shape selection state
│   │   │   ├── useShapeEventHandlers.ts # Shape event handlers (created, edited, removed)
│   │   │   ├── useShapeLoading.ts      # Shape loading from state
│   │   │   ├── useShapeHighlighting.ts # Shape highlighting on hover
│   │   │   ├── useShapeStyleUpdates.ts # Shape style updates (color, etc.)
│   │   │   ├── useTextMarkerHandling.ts # Text marker support
│   │   │   ├── useDrawingToolSelection.ts # Drawing tool state
│   │   │   ├── useKeyboardShortcuts.ts # Keyboard shortcuts for map
│   │   │   └── useToolbarPositioning.ts # Toolbar positioning logic
│   │   │
│   │   ├── use-color-mode.ts           # 🎨 Dark mode hook
│   │   ├── useConfirm.tsx              # 🔔 Confirmation dialog hook
│   │   ├── useIsTauri.ts               # 🪟 Tauri detection hook
│   │   └── useWindowOrientation.ts     # 📱 Window orientation hook (mobile)
│   │
│   ├── stores/                         # 🗄️ TanStack Store (global state)
│   │   ├── einsatzStore.ts             # Active Einsatz store
│   │   │   # - activeEinsatzId: string | null
│   │   │   # - setActiveEinsatzId(id: string | null)
│   │   │   # - Cross-tab sync via localStorage
│   │   │   # - Persistence via einsatzPersistence
│   │   │
│   │   └── persistence/
│   │       └── einsatzPersistence.ts   # Einsatz store persistence logic
│   │
│   ├── api/                            # 🔌 API client wrapper
│   │   ├── api.ts                      # BackendApi singleton
│   │   │   # - Wraps generated API client from @bluelight-hub/shared
│   │   │   # - Automatic token refresh on 401
│   │   │   # - Centralized error handling
│   │   │   # - Base URL from VITE_API_URL env
│   │   │
│   │   ├── fetchWithRefresh.ts         # Fetch wrapper with token refresh
│   │   ├── index.ts                    # API exports
│   │   └── hooks/
│   │       └── useLagekarteApi.ts      # Lagekarte API hook (deprecated, use useQuery)
│   │
│   ├── queryKeys.ts                    # 🗝️ Centralized TanStack Query keys
│   │   # Hierarchical structure:
│   │   # - QUERY_KEYS.auth.check
│   │   # - QUERY_KEYS.auth.publicUsers
│   │   # - QUERY_KEYS.einsatz.list(filters)
│   │   # - QUERY_KEYS.einsatz.detail(id)
│   │   # - QUERY_KEYS.etb.detail(einsatzId)
│   │   # - QUERY_KEYS.etb.entries(einsatzId, filters)
│   │   # - QUERY_KEYS.lagekarte.state(einsatzId)
│   │   # - QUERY_KEYS.poi.list(einsatzId)
│   │   # - QUERY_KEYS.users.profile
│   │   # - QUERY_KEYS.admin.users
│   │   # - QUERY_KEYS.admin.status
│   │
│   ├── routes/                         # 🗺️ TanStack Router routes
│   │   ├── __root.tsx                  # Root layout with providers
│   │   ├── index.tsx                   # Landing page route
│   │   ├── auth.tsx                    # Auth page route
│   │   ├── admin-login.tsx             # Admin login route
│   │   ├── app.tsx                     # App layout route (protected)
│   │   ├── app/
│   │   │   ├── einsaetze.tsx           # Einsatz list route
│   │   │   ├── einsaetze/
│   │   │   │   ├── index.tsx           # List view
│   │   │   │   └── $einsatzId.tsx      # Single mission route
│   │   │   └── einsatz/
│   │   │       ├── $einsatzId.tsx      # Single mission layout
│   │   │       └── $einsatzId/
│   │   │           ├── index.tsx       # Overview
│   │   │           ├── etb.tsx         # ETB subpage
│   │   │           └── lagekarte.tsx   # Lagekarte subpage
│   │   └── admin/
│   │       ├── index.tsx               # Admin dashboard route
│   │       ├── setup.tsx               # Admin setup route
│   │       ├── dashboard.tsx           # Admin dashboard
│   │       └── users.tsx               # User management route
│   │
│   ├── contexts/                       # React Context providers
│   │   # (Currently empty, using TanStack Query + Store instead)
│   │
│   ├── guards/
│   │   └── app.guard.tsx               # Route guard for authenticated routes
│   │
│   ├── schemas/                        # Zod validation schemas
│   │   ├── auth.schema.ts              # Auth form schemas
│   │   └── einsatz.schema.ts           # Einsatz form schemas
│   │
│   ├── services/
│   │   └── windowService.ts            # Tauri window service
│   │
│   ├── types/
│   │   ├── auth.ts                     # Auth TypeScript types
│   │   └── tauri.d.ts                  # Tauri type declarations
│   │
│   ├── utils/                          # 🛠️ Utility functions
│   │   ├── cn.ts                       # Tailwind class merging (clsx + twMerge)
│   │   ├── auth.ts                     # Auth utilities
│   │   ├── error-handler.ts            # Error handling utilities
│   │   ├── apiErrorHandler.ts          # API error handler
│   │   ├── dateFormatter.ts            # Date formatting
│   │   ├── logger.ts                   # Console logger
│   │   ├── url.util.ts                 # URL helpers
│   │   ├── timeBasedBackground.ts      # Time-based background gradient
│   │   ├── module-colors.ts            # Module color mapping
│   │   ├── formatPoiTypeLabel.ts       # POI type label formatter
│   │   ├── cluster-icons.ts            # Leaflet cluster icons
│   │   ├── poi-icons.ts                # POI marker icons
│   │   ├── drawing-styles.ts           # Map drawing styles
│   │   ├── offline-tiles.ts            # Offline tile caching
│   │   ├── offline-cleanup.ts          # Offline cache cleanup
│   │   ├── storage-quota.ts            # Storage quota management
│   │   ├── captureMapScreenshot.ts     # Map screenshot capture
│   │   ├── validateScreenshotUrl.ts    # Screenshot URL validator
│   │   └── lagekarte/                  # Lagekarte utilities (5 files)
│   │       ├── layer-utils.ts          # Layer management
│   │       ├── shape-helpers.ts        # Shape utilities
│   │       ├── mgrs.ts                 # MGRS coordinate conversion
│   │       ├── types.ts                # Lagekarte TypeScript types
│   │       └── README.md               # Lagekarte utilities docs
│   │
│   ├── assets/                         # Static assets
│   │   ├── brandbook/                  # Logo assets (5 variants)
│   │   │   ├── horizontal-logo.png
│   │   │   ├── vertical-logo.png
│   │   │   ├── wordmark-logo.png
│   │   │   ├── mobile-logo.png
│   │   │   └── mobile-white.png
│   │   └── images/
│   │       ├── day.png                 # Day gradient background
│   │       ├── evening.png             # Evening gradient background
│   │       └── night.png               # Night gradient background
│   │
│   ├── index.tailwind.css              # Tailwind CSS entry point
│   ├── routeTree.gen.ts                # Generated route tree (TanStack Router)
│   └── vite-env.d.ts                   # Vite type declarations
│
├── src-tauri/                          # 🦀 Tauri backend (Rust)
│   ├── src/
│   │   └── main.rs                     # 🚀 Tauri app entry point
│   │       # - Tauri setup
│   │       # - Window management
│   │       # - System tray integration
│   │       # - IPC handlers
│   │
│   ├── tauri.conf.json                 # Tauri configuration
│   │   # - App identifier: com.bluelight-hub.app
│   │   # - Window settings (size, title, etc.)
│   │   # - Permissions and capabilities
│   │   # - Build settings
│   │
│   ├── capabilities/                   # Tauri capabilities (permissions)
│   ├── icons/                          # App icons (multiple sizes)
│   ├── gen/                            # Generated Tauri files
│   ├── Cargo.toml                      # Rust dependencies
│   ├── Cargo.lock                      # Rust lockfile
│   └── build.rs                        # Rust build script
│
├── cypress/                            # E2E Tests (Cypress, deprecated)
│   └── e2e/
│
├── public/                             # Public static files
│   └── vite.svg                        # Vite logo
│
├── package.json                        # Frontend dependencies
│   # Key dependencies:
│   # - react, react-dom (React 19)
│   # - @tanstack/react-router (routing)
│   # - @tanstack/react-query (server state)
│   # - @tanstack/react-store (global state)
│   # - @tanstack/react-form (forms)
│   # - @chakra-ui/react (UI framework)
│   # - leaflet, react-leaflet (maps)
│   # - @geoman-io/leaflet-geoman-free (map drawing)
│   # - zod (validation)
│   # - @bluelight-hub/shared (generated API client)
│   # - @tauri-apps/api (Tauri API)
│
├── vite.config.ts                      # Vite configuration
├── tsconfig.json                       # TypeScript configuration
├── tsconfig.app.json                   # App-specific TypeScript config
├── tsconfig.node.json                  # Node-specific TypeScript config
├── biome.json                          # Biome linter configuration
├── index.html                          # HTML entry point
└── README.md                           # Frontend documentation
```

## Frontend-Zusammenfassung

**Components:**
- **Atoms:** 24 base components (Button, Input, Badge, Spinner, etc.)
- **Molecules:** 46 composite components (Dialog, Table, Search, ETB controls, Lagekarte controls, etc.)
- **Organisms:** 73 complex modules (ETB views, Lagekarte, Command Palette, Admin panels, etc.)
- **Templates:** 4 page layouts (Auth, Admin, SingleEinsatz, AdminDashboard)
- **Pages:** 6 route-bound pages (Landing, Einsatz List, Einsatz Detail, Admin, etc.)

**Hooks:** 24+ custom TanStack Query hooks (Auth, Einsatz, ETB, Lagekarte, POI, Users, Admin)

**State Management:**
- **Server State:** TanStack Query (React Query)
- **UI State:** TanStack Store + React Context
- **Forms:** TanStack Form + Zod validation
- **Router:** TanStack Router (file-based routing)

**Offline Support:**
- Lagekarte: `networkMode: 'offlineFirst'`
- Offline tile caching via IndexedDB
- Service Worker for offline assets (future)

**Integration Points:**
- Consumes Backend API via `BackendApi` singleton
- API client auto-generated from Backend OpenAPI spec
- Cross-tab state sync via localStorage + StorageEvent
- Tauri IPC for desktop features (file system, system tray, etc.)

---
