# Implementation Plan: Real-time Database Table Synchronization

This plan outlines the steps to implement real-time database table synchronization between the web dashboard's Data Input page and Supabase database tables, based on the provided `design.md` and `requirements.md`.

## Phase 1: Core Synchronization

### Task 1.1: Backend API for Basic CRUD Operations
- [ ] Implement new API endpoints in `services/supabase-backend` for:
    - `POST /api/datasets/:id/rows`: Add a single row to a dataset.
    - `PUT /api/datasets/:id/rows/:rowId`: Update a single row in a dataset.
    - `DELETE /api/datasets/:id/rows/:rowId`: Delete a single row from a dataset.
    - `PUT /api/datasets/:id/rows/:rowId/cells/:columnId`: Update a single cell value.
    - `POST /api/datasets/:id/columns`: Add a new column to a dataset.
    - `PUT /api/datasets/:id/columns/:columnId`: Update an existing column.
    - `DELETE /api/datasets/:id/columns/:columnId`: Delete a column.
- [ ] Ensure these endpoints interact with the Supabase database to perform the respective CRUD operations on `datasets`, `dataset_columns`, and `dataset_rows` tables.
- [ ] Implement basic validation for incoming data.

### Task 1.2: Frontend `TableSyncService` Implementation
- [ ] Create a new service `TableSyncService` in `services/web-dashboard/src/services` (or an appropriate `api` directory) that encapsulates API calls to the backend.
- [ ] Implement methods for `addRow`, `updateCell`, `deleteRows`, `addColumn`, `updateColumn`, `deleteColumn`, and `loadTableData`.
- [ ] Integrate `TableSyncService` with the existing Supabase client for authentication and API requests.

### Task 1.3: Optimistic UI Updates in Frontend
- [ ] Create an `OptimisticUpdateManager` in `services/web-dashboard/src/utils` (or `store`) to manage pending operations.
- [ ] Implement `queueOperation`, `confirmOperation`, `rollbackOperation`, and `getPendingOperations` methods.
- [ ] Modify the `DataInputPage` (or relevant table editing component) to use `OptimisticUpdateManager` for immediate UI feedback.
- [ ] Display visual indicators for pending operations.

### Task 1.4: Initial Data Loading and Display
- [ ] Enhance the `DataInputPage` to fetch all existing tables and their data from the backend upon page load/refresh using `TableSyncService.loadTableData()`.
- [ ] Ensure table names in the UI exactly match the database table names.
- [ ] Handle cases where a database table is empty, displaying an empty table with correct headers.

### Task 1.5: Basic Error Handling and Rollback
- [ ] Implement basic error handling in `TableSyncService` to catch API errors.
- [ ] Integrate error handling with `OptimisticUpdateManager` to trigger rollbacks on failed operations.
- [ ] Display clear error messages to the user.

## Phase 2: Real-time Features

### Task 2.1: Supabase Real-time Subscriptions
- [ ] Implement `subscribeToTable` method in `TableSyncService` to listen for Supabase real-time changes.
- [ ] Configure Supabase to broadcast changes on `datasets`, `dataset_columns`, and `dataset_rows` tables.
- [ ] Update the `DataInputPage` to react to real-time changes and update the UI accordingly.

### Task 2.2: Conflict Detection and Resolution
- [ ] Implement logic to detect concurrent edit conflicts (e.g., using timestamps or versioning).
- [ ] Develop a conflict resolution mechanism (e.g., "keep local," "keep remote," "merge").
- [ ] Design and implement a UI component for conflict resolution dialogs.

### Task 2.3: Multi-user Editing Indicators
- [ ] Implement a mechanism to show which users are currently editing specific cells or rows.
- [ ] Display real-time presence indicators in the UI.

## Phase 3: Advanced Features

### Task 3.1: Offline Support with Operation Queuing
- [ ] Implement local storage for queuing operations when offline.
- [ ] Develop a retry mechanism with exponential backoff for queued operations.
- [ ] Display an offline indicator in the UI.

### Task 3.2: Advanced Validation and Constraints
- [ ] Enhance backend validation to support complex rules (e.g., regex, range checks).
- [ ] Integrate frontend validation with immediate UI feedback and error highlighting.
- [ ] Implement database-level constraint checks for data integrity.

### Task 3.3: Performance Optimizations
- [ ] Optimize data fetching and rendering for large datasets.
- [ ] Implement pagination or virtualized scrolling for tables.
- [ ] Analyze and improve real-time update latency.

## Phase 4: Polish and Testing

### Task 4.1: Comprehensive Error Handling
- [ ] Refine all error handling scenarios, including network, validation, conflict, and constraint errors.
- [ ] Ensure user-friendly error messages and recovery strategies.

### Task 4.2: User Experience Improvements
- [ ] Enhance UI/UX for table editing, including keyboard navigation, copy-paste, etc.
- [ ] Improve visual feedback for all operations.

### Task 4.3: Performance Testing and Optimization
- [ ] Conduct thorough performance tests for all features.
- [ ] Identify and address any performance bottlenecks.

### Task 4.4: Documentation
- [ ] Update relevant documentation (e.g., API docs, frontend component usage).

## Next Steps

Once this plan is reviewed and approved, we can begin with Phase 1, starting with the backend API enhancements.