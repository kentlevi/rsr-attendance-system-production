# Time Clock Verification Feature Layout

The Time Clock is a kiosk-style interface intended for common structural hardware (Tablets mounted at the engineer depot or specific remote check-in links). It enforces security, limits human-error discrepancies, and provides mathematical integrity to the payroll system.

## 1. Global Geofence Verification
- On boot, the terminal executes a `navigator.geolocation` web check.
- Extracts current device Position (Latitude/Longitude).
- Computes Haversine distance against physical Site Coordinates listed in the Admin `Settings`. 
- **Hard Block Constraint**: If distance exceeds the designated Admin `radius` limit, the entire Time Clock physically locks, preventing any PIN or Face ID queries with a "Too Far from Site" alert.

## 2. Authentication Logic
- **Primary: Face ID Biometrics**:
  - Leverages Facial Recognition mapping (if embedded in the employee's profile).
  - Prompts camera interaction. Fast, contactless verification to prevent "buddy-punching."
- **Secondary: Secure PIN**:
  - Employee inputs strict 4-to-6 digit private pin setup by Admin onboarding in case facial models fail or struggle in low light.

## 3. The Action Registry
Following correct verification, the Employee is presented a contextual list of buttons based purely on their current shift sequence state.
- **Clock In**: Physical tracking trigger.
- **Lunch Out** / **Lunch In**: Isolating break allocations from billable hours.
- **PM Break Out** / **PM Break In**: Secondary required break.
- **Clock Out**: Terminal physical timestamp closing the operational shift block for the database.

## 4. Background Sync & Mathematical Propagation
- Punch times are stamped using true network timestamps, negating any local-device clock spoofing.
- Instantly propagates to Firebase `attendanceLogs` bypassing local state buffers.
- Night rules, grace-period lateness, and explicit geofence tracking tags are stamped deeply into the payload.
