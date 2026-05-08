# Feature Implementation Checklist

Use this checklist after implementing any feature, fix, or UI flow.

Reference the application function map before changing behavior: [Application Functions](./application-functions.md).

## Scope

- [ ] Confirm the requested behavior and expected user flow.
- [ ] Identify the affected components, services, stores, and data models.
- [ ] Check whether the feature needs Firebase read/write support.
- [ ] Check whether the feature needs session, local fallback, or offline support.

## Implementation

- [ ] Add or update the service/API function before wiring the UI.
- [ ] Connect the UI to the service/API function.
- [ ] Add loading, success, empty, and error states.
- [ ] Persist changed app data in Firebase.
- [ ] Keep session or local fallback only when needed for immediate UI state.
- [ ] Confirm related pages subscribed to the same data update correctly.

## UI Consistency

- [ ] Match existing button height, font size, font weight, hover, and focus styles.
- [ ] Match existing input, date, time, and dropdown styles.
- [ ] Use `gap` for spacing between cards/content instead of one-off margins where possible.
- [ ] Verify modals, overlays, dropdowns, and table headers are not clipped.
- [ ] Check empty states for cards/tables with no data.
- [ ] Check mobile and desktop layout if the UI changed.

## Firebase

- [ ] Confirm create/update/delete writes go to the intended collection/document.
- [ ] Confirm data remains after refresh.
- [ ] Confirm data updates across subscribed pages.
- [ ] Confirm Firestore errors are handled and surfaced to the user.
- [ ] Avoid storing passwords or secrets in plain text for production use.

## Verification

- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Test the feature manually on localhost.
- [ ] Check browser console for errors.
- [ ] Check Firebase data after using the feature.
- [ ] Document what changed and any remaining limitations.
