# Assistant Role Feature Layout

The Assistant Dashboard is a subset replica of the Admin Dashboard. It targets operations coordinators, dispatchers, and shift supervisors who require strict operational execution but are intentionally decoupled from administrative payroll handling and permanent data mutation.

## 1. Top Navigation
- Uses the same structural header with an `Assistant` tag label underneath their profile context. 

## 2. Dashboard View
- Primarily serves to observe `Present Today` metrics and quick oversight widgets. Provides full view of daily staff whereabouts to assist in job dispatching. 

## 3. Leave Tab (Read-Only Context)
*Note: This replaces the standard "Approvals" view present in the Admin module.*
- **Unrestricted Status View**: Assistants can see All leave requests (Approved, Rejected, Pending).
- **No Invocation Rights**: The `Actions` column with "Approve" & "Reject" is hard-coded out of existence. This limits the assistant purely to using the UI as a scheduling baseline. "Who won't be here tomorrow?" is easily answered.

## 4. Today's Logs (Constrained Logs View)
- Allows viewing of physical time-punches. 
- **Time Lock Constraint**: Date filters (From Date and To Date) are strictly disabled and locked permanently to `Today`. 
- Ensures Assistants are only supervising ongoing shift events out in the field instead of randomly searching historical employee movements from six months ago.

## 5. Staff Overview (Read-Only/Limited Support)
- View list of structural employees. 
- Displays context clues such as phone numbers, current shift templates, and job roles to effectively manage people in emergency situations without having the capability to alter base rates or remove core profiles.

## 6. Straight Duty Tab
- Read-only tracking of engineers or personnel explicitly tagged under continuous "Straight Duty" cycles.

## Excluded Capabilities
- Assistants physically **Cannot** see or access: Payroll Engine, Settings/Geofencing configurations, Analytics exports, AI System management, or the Employee Incident Report tools.
