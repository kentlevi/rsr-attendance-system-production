# PIN Migration Plan

## Objective
Migrate all plaintext and legacy SHA-256 PINs to bcrypt without disrupting employee login capabilities.

## Status: COMPLETED
All legacy PINs have been successfully migrated or deprecated. The system now strictly enforces bcrypt hashing.

## Historical Phases (For Reference)

### Phase 1: Monitoring & Auditing (Completed)
- The login endpoint temporarily accepted bcrypt, SHA-256, and plaintext PINs.
- Logging was added to identify users authenticating with legacy formats.

### Phase 2: On-the-Fly Hashing (Completed)
- When a user logged in using a legacy PIN, the server immediately hashed it using bcrypt.
- The server updated the employee's document in Firestore.

### Phase 3: Forced Password Reset (Completed)
- Any user who did not log in during Phase 2 was forced to reset their PIN or register their Face ID on next login.
- System stopped accepting plaintext/SHA-256 fallbacks.

### Phase 4: Deprecation (COMPLETED)
- [x] Remove the plaintext and SHA-256 fallback logic from `server.ts`.
- [x] All `pin` fields in Firestore must be either a bcrypt string or empty (if relying purely on biometric/SSO).
- **Status:** Done. `server.ts` now only processes bcrypt PINs. Plaintext and SHA-256 fallbacks have been removed completely.

## Audit Strategy
A weekly script queries Firestore for any employee doc where the `pin` field doesn't start with `$2b$` or `$2a$`, creating an audit log of remaining unmigrated accounts (which should be zero).
