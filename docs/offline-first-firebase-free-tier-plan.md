# Offline-First Firebase Free-Tier Plan

Goal: keep the existing Firebase architecture, finish the app quickly, and reduce the chance of paid Firebase usage by making local storage the first write target and Firebase the sync/backup layer.

## Deployment Position

- Use Firebase for authentication, cloud sync, rules, and admin visibility.
- Use local storage for operational continuity when internet is unavailable.
- Treat Firebase free tier as a quota budget, not unlimited infrastructure.
- Avoid syncing large binary data by default.
- Keep enough cloud data for recent operations and reporting, then archive or purge old cloud records.

## Phase 1 - Local-First Attendance Writes

- [x] Define local attendance record schema.
- [x] Define local sync queue schema.
- [x] Add a local storage adapter for attendance punches.
- [x] Write Time In, Time Out, Lunch, PM Break, and photo metadata locally before any cloud write.
- [x] Mark local records as `pending`, `syncing`, `synced`, or `failed`.
- [x] Show pending sync status in the Time Clock UI.
- [x] Keep attendance usable when `navigator.onLine === false`.
- [x] Keep attendance usable when Firebase write fails while the browser still reports online.

Acceptance:

- [ ] Employee can punch while offline.
- [ ] Punch is visible immediately after offline save.
- [ ] No punch is lost after page refresh.
- [ ] Failed cloud writes remain retryable.

## Phase 2 - Background Sync Queue

- [x] Add a sync coordinator service.
- [x] Listen for `online` events and app startup to trigger sync.
- [x] Batch pending attendance records.
- [x] Retry failed records with backoff.
- [x] Store `lastSyncAttemptAt`, `syncedAt`, `retryCount`, and `lastError`.
- [x] Prevent duplicate cloud writes using deterministic local IDs.
- [x] Pull recent Firebase changes after upload sync.
- [ ] Add conflict handling rules.

Conflict rules:

- Attendance punches are append-first and should not be overwritten casually.
- Admin edits win only when explicitly reviewed.
- Device-created records must preserve original local timestamp and device ID.

Acceptance:

- [x] Offline punches sync automatically when internet returns.
- [x] Duplicate clicks/retries do not create duplicate attendance rows.
- [x] Failed sync attempts are visible to admin or operator.

## Phase 3 - Firebase Quota Protection

- [x] Replace broad attendance collection listeners with date-scoped queries.
- [x] Avoid loading all attendance history on dashboard startup.
- [ ] Replace remaining broad collection listeners with date/site/employee-scoped queries where possible.
- [ ] Add pagination or date filters for logs/photos/payroll views.
- [ ] Add client-side sync rate limits.
- [ ] Add estimated usage counters for reads, writes, deletes, and storage.
- [ ] Warn admin when estimated usage approaches free-tier budget.
- [x] Disable automatic photo upload unless enabled in settings.

Suggested Firebase budget thresholds:

- [ ] Warn at 70% estimated daily reads.
- [ ] Warn at 70% estimated daily writes.
- [ ] Warn at 70% estimated daily deletes.
- [ ] Warn when estimated cloud storage exceeds 750 MB.

Acceptance:

- [ ] Normal app startup does not read full historical collections.
- [ ] Admin can see sync/quota health.
- [ ] App can be configured to avoid cloud photo uploads.

## Phase 4 - Cloud Retention And Cleanup

- [ ] Add retention settings: `cloudRetentionDays`, `photoUploadEnabled`, `photoRetentionDays`.
- [ ] Add export-before-cleanup workflow.
- [ ] Add manual admin cleanup action for old synced cloud records.
- [ ] Add scheduled cleanup only if it can run under delete quota.
- [ ] Do not use Firestore TTL for free-tier cleanup because TTL deletes require billing.
- [ ] Keep local archive after cloud cleanup.
- [ ] Add cleanup dry-run mode showing records and delete count before deletion.

Recommended default:

- Cloud attendance metadata: 90 days.
- Cloud request/approval records: 180 days.
- Cloud photos: disabled by default, or 30 days if enabled.
- Local records: retained until admin export/manual cleanup.

Acceptance:

- [ ] Admin can export old data before cloud deletion.
- [ ] Cleanup never deletes unsynced local records.
- [ ] Cleanup shows estimated Firestore delete count before running.

## Phase 5 - Attachments And Photos

- [ ] Store photos locally first.
- [ ] Compress photos before any optional upload.
- [ ] Sync only attendance photo metadata by default.
- [ ] Make Firebase Storage uploads opt-in per client.
- [ ] Add max file size and allowed content types in UI before upload.
- [ ] Add retry queue for attachments if upload is enabled.
- [ ] Show missing-local-photo warning if a record references a local-only photo on another device.

Acceptance:

- [ ] App works without Firebase Storage uploads.
- [ ] Photos do not silently consume cloud storage.
- [ ] Operators understand when a photo is local-only.

## Phase 6 - Client Deployment Package

- [ ] Add install/setup checklist per client.
- [ ] Add Firebase project setup checklist.
- [ ] Add admin-claim assignment checklist.
- [ ] Add Firestore/Storage rules deployment checklist.
- [ ] Add offline test checklist.
- [ ] Add sync recovery test checklist.
- [ ] Add monthly export/cleanup checklist.

Client handoff requirements:

- [ ] Firebase project ID configured.
- [ ] Admin account created and assigned `role: admin`.
- [ ] Employee login tested.
- [ ] Offline punch tested.
- [ ] Auto-sync tested after reconnect.
- [ ] Export tested.
- [ ] Cleanup dry-run tested.

## Implementation Order

1. Local attendance/outbox schema.
2. Local attendance adapter.
3. Time Clock local-first write path.
4. Sync coordinator for attendance.
5. Sync status UI.
6. Query/pagination quota reductions.
7. Retention settings and cleanup dry-run.
8. Optional photo upload controls.
9. Client deployment checklist.

## Production Gate

- [x] `npm run lint` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [ ] Offline punch works after refresh.
- [ ] Reconnect sync works without duplicates.
- [ ] Firebase rules deployed and tested.
- [ ] Admin claims verified.
- [ ] Cloud cleanup dry-run reviewed.
- [ ] Client understands Firebase free-tier limits are quotas, not a hard billing guarantee.
