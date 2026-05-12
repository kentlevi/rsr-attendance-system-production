# RSR Attendance System: Feature Operational Guide (Phase 1)

This guide provides step-by-step operational instructions for each core feature of the RSR Attendance System.

---

## 🕒 1. Attendance & Time-Clock
**Goal**: Ensuring accurate, verified presence on-site.

### 📲 For Employees:
1.  **Open the App**: Launch the RSR Attendance app on your assigned device.
2.  **Select Action**: Choose **"Time In"** or **"Time Out"**.
3.  **Facial Scan**: Position your face within the camera frame. The AI will match your face against your registered profile.
4.  **GPS Check**: The system automatically verifies that you are within the designated work site radius.
5.  **Confirmation**: Once verified, a success message appears, and your attendance is logged instantly.

### 🛠️ For Administrators:
*   **Photo Verification**: Navigate to the **"Photos"** tab to review the live photos captured during each punch.
*   **Manual Adjustment**: If an employee forgets to clock out, use the **"Logs"** tab to manually update their record with a mandatory reason.
*   **Geofencing**: Admins can see "Site Mismatch" alerts if an employee attempts to punch from outside the work area.

---

## 📅 2. Leave Management
**Goal**: Streamlined leave requests with automated balance tracking.

### 📲 For Employees:
1.  **File Leave**: Navigate to the **"File Leave"** section in your portal.
2.  **Select Type**: Choose between **Vacation Leave (VL)** or **Sick Leave (SL)**.
3.  **Choose Dates**: Select the start and end dates. The system will calculate the duration automatically.
4.  **Balance Check**: If the requested days exceed your remaining credits, the system will block the request.

### 🛠️ For Administrators:
*   **Approvals View**: Go to **"Approvals"** to see all pending requests.
*   **Real-Time Alerts**: Check your Telegram group for instant notifications of new leave filings.
*   **6-Month Replenishment**: The system automatically resets/adds credits every 6 months—no manual intervention required.

---

## ⚠️ 3. Incident & AWOL Tracking
**Goal**: Maintaining workplace discipline and safety standards.

### 🛠️ For Administrators:
1.  **Report Incident**: In the **"Incidents"** tab, click "Report Incident".
2.  **Select Employee**: Choose the person involved.
3.  **Severity & Type**: Select Infraction, Accident, or Merit. Categorize as High, Medium, or Low severity.
4.  **Automated AWOL**: 
    *   **1-2 Days Absent**: The system flags the employee.
    *   **3 Consecutive Days**: The employee's status automatically changes to **"Suspended"**, and a high-priority Telegram alert is dispatched.

---

## 📊 4. Workforce Insights (Management Dashboard)
**Goal**: Data-driven decisions based on real-time attendance trends.

*   **7-Day Trend**: Located on the main Dashboard. Monitor the percentage of staff present over the last week to identify staffing gaps.
*   **Distribution View**: A visual breakdown of staff status (Present, Absent, On-Leave, Away-Site).
*   **Undertime Tracker**: Monitor employees who are consistently leaving early or starting late to address productivity issues.

---

## ⚙️ 5. System Configuration
**Goal**: Tuning the system for environmental conditions and security needs.

*   **Facial Threshold**: In **"Settings"**, adjust the Biometric Sensitivity. Use **0.65** for standard lighting; increase to **0.85+** for high-security areas.
*   **Telegram Bot**: Update the Bot Token to change the notification channel.
*   **Site Management**: Add or remove project sites and set their GPS coordinates and allowed radius.

---

**RSR Engineering Operations**  
*Precision in Every Punch.*
