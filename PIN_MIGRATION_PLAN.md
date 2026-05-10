# PIN Migration Plan

## Objective
Migrate all plaintext and legacy SHA-256 PINs to bcrypt without disrupting employee login capabilities.

## Phases

### Phase 1: Monitoring & Auditing (Current)
- The login endpoint currently accepts bcrypt, SHA-256, and plaintext PINs.
- **Action**: Add logging to identify how many users are still authenticating with plaintext or SHA-256 PINs.

### Phase 2: On-the-Fly Hashing
- When a user logs in using a plaintext or SHA-256 PIN, the server will immediately hash their PIN using bcrypt.
- The server will update the employee's document in Firestore with the new bcrypt hash.
- **Timeline**: 30 days.

### Phase 3: Forced Password Reset (Time-boxed: 30 days after Phase 2)
- Any user who has not logged in during Phase 2 will still have a legacy PIN.
- Upon their next login attempt, they will be required to reset their PIN or register their Face ID. 
- The system will no longer accept fallback matches.

### Phase 4: Deprecation (COMPLETED)
- [x] Remove the plaintext and SHA-256 fallback logic from `server.ts`.
- [x] All `pin` fields in Firestore must be either a bcrypt string or empty (if relying purely on biometric/SSO).
- **Status:** Done. `server.ts` now only processes bcrypt PINs. Plaintext and SHA-256 fallbacks have been removed completely.

## Audit Strategy
A weekly script will run to query Firestore for any employee doc where the `pin` field doesn't start with `$2b$` or `$2a$`, creating an audit log of remaining unmigrated accounts.
