# Pre-release smoke test

Walk this entire checklist on a fresh deploy before declaring a release production-ready. Should take ~45 minutes. Tick boxes (`[x]`) and note any failures inline — those become the next sprint's bug list.

> **Recommended setup**: two devices (a desktop browser + the APK on a phone), two browser profiles for the multi-admin scenarios, and a stopwatch for the offline-sync timing test.

## A. Bootstrap — fresh device, no prior state

- [ ] **A1.** Open `https://rsr-attendance-system-production.onrender.com` in a private/incognito window.
  - Expected: Welcome screen loads in under 5s on a 4G connection.
  - Expected: DevTools Console shows `[errorMonitoring] Sentry initialised. DSN host: o4511391308906496.ingest.de.sentry.io`. *If missing*, the Render env var wasn't set — fix before continuing.
- [ ] **A2.** Refresh once. Network tab → confirm `vendor-human-*.js` is **NOT** in the initial requests (only loaded when a face screen mounts).
- [ ] **A3.** Open the APK from your phone home screen. Confirm the launcher icon shows the green RSR monogram (not the default Android robot).

## B. Kiosk TimeClock — online

- [ ] **B1.** Go to TimeClock from the welcome screen. Select a site from the dropdown.
- [ ] **B2.** Stand in front of the camera. Within ~5 seconds, the face should be recognised and the toast shows `Welcome <Your Name>! Time In recorded at HH:MM AM/PM`.
- [ ] **B3.** Confirm the recognised name matches the **canonical** employee record (Kent Levi, not "trainee92" or any duplicate).
- [ ] **B4.** Punch out: tap Time Out. Same recognition flow, separate toast.
- [ ] **B5.** Open Admin → Attendance Logs. The two punches should appear within ~30 seconds (Firestore propagation).

## C. Kiosk TimeClock — offline-first

- [ ] **C1.** Turn airplane mode on (or DevTools → Network → Offline).
- [ ] **C2.** Refresh the kiosk page. The app shell should still load (service-worker served).
- [ ] **C3.** Try a face-match Time In.
  - Expected: face is recognised offline (cached profiles), toast says `... saved locally and will sync when internet returns.`
  - Header should show the amber **Offline** pill + a blue **N pending** counter.
- [ ] **C4.** Punch 2–3 more times (different actions: Lunch Out, Lunch In, Time Out). All should land locally.
- [ ] **C5.** Turn airplane mode OFF. Within 60 seconds, the pending counter should drop to 0.
- [ ] **C6.** Open Admin → Attendance Logs. Confirm all offline punches now appear with correct timestamps.

## D. PIN override fallback

- [ ] **D1.** With network off, stand outside camera view so face match times out (~8 seconds offline).
- [ ] **D2.** The PIN modal should auto-open.
- [ ] **D3.** Enter a known employee ID + PIN. Punch should record locally and sync when online.

## E. Geofence (if enabled in Settings)

- [ ] **E1.** From a location **inside** the configured radius, punch — should succeed.
- [ ] **E2.** From a location **outside** the radius (or with a fake GPS app), punch — should be blocked with a clear toast.

## F. Employee portal — login

- [ ] **F1.** Log out of everything. Open the Welcome screen → Employee Portal.
- [ ] **F2.** Sign in with a registered employee's email + PIN (e.g. `kentlevicadungog@gmail.com`). Dashboard should show that employee's name + employee ID + today's schedule.
- [ ] **F3.** Confirm the page header shows the title only ONCE (no duplicate inline header on mobile).
- [ ] **F4.** Try Face Login from a fresh tab. Should succeed and route to the same dashboard.

## G. Employee portal — request flows

- [ ] **G1.** **File Leave**: pick Vacation, Start + End dates spanning 2 days, fill Reason. Submit. Toast confirms; appears in Leave Status.
- [ ] **G2.** Re-open Leave Status. The new request shows as **Pending**.
- [ ] **G3.** **Submit Undertime**: pick today's date, planned time out, reason. Submit. Toast confirms.
- [ ] **G4.** **My Time** tab: weekly view goes Sun→Sat with future days blank. Dropdown lets you pick prior weeks.
- [ ] **G5.** **Notifications**: any admin actions you triggered earlier should appear here (with bell badge in header).

## H. Admin — staff CRUD

- [ ] **H1.** Log in as admin (`admin@rsr.com`). Dashboard loads with stats cards.
- [ ] **H2.** **Add employee**: try a new entry with a duplicate Employee ID — should be blocked with the uniqueness warning toast.
- [ ] **H3.** Try again with a unique ID + email. Without ticking the face-consent box, capture 5 face frames and save — should refuse to save and toast about consent.
- [ ] **H4.** Tick the consent box, save. Employee appears in the Staff list, face profile is enrolled.
- [ ] **H5.** Edit that employee from another admin browser profile **at the same time** as a second admin opens the same record. The second saver should see the *"Record was just modified by … — reload"* warning.
- [ ] **H6.** Delete the test employee. Confirmation modal appears, deletion succeeds.
- [ ] **H7.** Verify the **Duplicate Employee IDs** banner appears at the top of the Staff page if any duplicate emails/IDs exist. Resolve any flagged ones.

## I. Admin — approvals & violations

- [ ] **I1.** Open Approvals view. The leave + undertime requests from G1/G3 should appear.
- [ ] **I2.** Approve the leave request. Toast confirms; the employee's Notifications tab gets a new entry.
- [ ] **I3.** Reject the undertime request with a reason. Same flow.
- [ ] **I4.** Open Workforce Insights → check the cards match the standard rounded-2xl chrome (no `rounded-[24px]` outlier).
- [ ] **I5.** Open Incidents view. Create a new infraction for an employee. Filter by Severity = High.

## J. Admin offline — read-only mode

- [ ] **J1.** Log in as admin **once online** so credentials cache.
- [ ] **J2.** Log out. Turn network off.
- [ ] **J3.** Log in again offline with the same credentials. Should succeed and route to dashboard.
- [ ] **J4.** **Amber banner** appears at top: `Offline admin — read-only mode. Changes can't be saved until you reconnect.`
- [ ] **J5.** Try to delete an employee. Toast warns: `Offline admin mode is read-only — deleting an employee cannot be saved until you're back online.`
- [ ] **J6.** Console: confirm **no** Firestore retry-storm errors (the read-only guard short-circuits before the network call).

## K. Reports / payroll

- [ ] **K1.** Open Payroll view. Pick a pay period spanning the offline punches you made earlier. Generate report.
- [ ] **K2.** Manually spot-check 2 employees: do `workHours`, `OT`, `undertime`, `lateDeduction` match what a hand calculation says?
- [ ] **K3.** Export CSV. Open in Excel. Columns line up, no garbled UTF-8.

## L. Notifications channel (Telegram)

- [ ] **L1.** With Telegram enabled in Settings, trigger a leave request as an employee. Telegram bot posts a message to the configured chat.
- [ ] **L2.** Fire 5 leave requests in rapid succession from a script or button-mash. Telegram should receive **at most ~5 messages spaced ~1s apart** (rate limiter active). No `429 Too Many Requests` in console.
- [ ] **L3.** Submit the **same** incident report twice within 60 seconds. Only one Telegram message arrives (dedup).

## M. APK update banner

- [ ] **M1.** Bump `package.json` version to `1.0.1`. Build a new APK. Don't install it yet.
- [ ] **M2.** In Firestore, set `appVersions/latest`:
  ```json
  {
    "version": "1.0.1",
    "apkUrl": "https://link-to-your-new-apk",
    "minSupportedVersion": "1.0.0",
    "releaseNotes": "Test update"
  }
  ```
- [ ] **M3.** Open the still-installed 1.0.0 APK. **Amber banner** appears under the header: `Update available: v1.0.1`. Dismissing it persists until next launch.
- [ ] **M4.** Bump `minSupportedVersion` to `1.0.1` in Firestore. Refresh the 1.0.0 app. **Red blocking overlay** appears — no way to use the app until update.

## N. Sentry error monitoring

- [ ] **N1.** From DevTools console, run: `throw new Error('smoke-test error N1')` inside a React event-handler context (use a button onClick if needed). Check Sentry → Issues. Event appears within ~10 seconds.
- [ ] **N2.** From a session containing a face descriptor in memory, deliberately trigger an error. Check the Sentry event details — `faceDataEncodings` / `photoDataUrl` should appear as `[redacted]`, not raw data.

## O. Cross-device sanity

- [ ] **O1.** Log in as admin on a laptop and as employee on a phone. Same Firestore data; updates from one device appear on the other within ~10s.
- [ ] **O2.** Lock the phone, leave it for 5 minutes, unlock. The employee dashboard should still be alive (no auth-state crash).

## P. Recovery from edge states

- [ ] **P1.** Kill the dev server / disconnect mid-punch. Reopen — the local IndexedDB queue persists, syncs when online.
- [ ] **P2.** From the admin staff page, perform an action that throws (e.g. delete an employee, then unplug WiFi mid-request). The UI should surface a warning toast, not freeze. Reload → record state is consistent.
- [ ] **P3.** Clear the browser's IndexedDB for the site, refresh. Online behaviour unchanged. Going offline now shows the "no cached profiles" warning, not a crash.

---

## Sign-off

When all boxes above are ticked, record the deploy commit + date here so future regressions can be diffed against it:

- Last clean smoke test: _____________ (commit `_______`) — tested by _______
