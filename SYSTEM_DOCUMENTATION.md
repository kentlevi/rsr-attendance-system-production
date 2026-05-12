# RSR Attendance System: Technical System Documentation

## 1. Executive Summary
The **RSR Attendance System** is a high-fidelity, biometric-driven workforce management solution designed for RSR Engineering. It integrates facial recognition, GPS geofencing, and automated payroll logic into a cross-platform application (Web & Android).

---

## 2. Technology Stack
*   **Frontend**: React 19, TypeScript, TailwindCSS (for styling), Framer Motion (animations).
*   **State Management**: Zustand (lightweight, reactive state).
*   **Backend & Persistence**: Firebase Firestore (NoSQL), Firebase Storage (Photo attachments).
*   **Biometrics**: `@vladmandic/human` (AI-driven facial recognition and embedding extraction).
*   **Analytics**: Recharts (Data visualization).
*   **Mobile Bridge**: Capacitor (Enabling Android native features like Camera and GPS).
*   **Reporting**: `jsPDF` & `jspdf-autotable` (Professional PDF generation).
*   **Messaging**: Telegram Bot API & SMS Gateway.

---

## 3. Core Architecture & Modules

### A. Biometric & Security Pipeline
*   **Facial Recognition**: Uses the **Human.js** library to extract 1024-dimensional embeddings from live camera feeds.
*   **Matching Logic**: Implements **Cosine Similarity** to compare live embeddings against stored master profiles.
*   **GPS Validation**: Leverages `navigator.geolocation` and Capacitor Geolocation to ensure punches occur within a configurable meter radius of the project site.
*   **Photo Audit**: Every clock-in event captures a base64 image, uploaded to Firebase Storage and linked to the attendance log.

### B. Business Logic Services
*   **AttendanceService**: Manages the lifecycle of a "Punch". Handles clock-in/out, straight duty detection, and automatic time-outs.
*   **LeaveService**: Manages credit-based leave requests. Implements automated 6-month replenishment cycles and real-time balance validation.
*   **AwolService**: A background monitoring service that detects 3-day absence streaks and triggers **Automatic Preventative Suspensions**.
*   **PayrollCalculator**: (Phase 2) Aggregates attendance data, night differentials (10%), and disciplinary fines (₱500/₱200) into a final net pay summary.

### C. Notification Gateway
*   **Telegram Service**: Dispatches HTML-formatted alerts to administrative chat groups for critical events (Approvals, Incidents, AWOL).
*   **SMS Service**: Sends automated text reminders to employees for attendance and status changes.

---

## 4. Data Models (Schema)

### `Employee`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique Employee ID (e.g., EMP-001) |
| `status` | `enum` | Active, Suspended, On Leave, Resigned |
| `vlBalance` | `number` | Remaining Vacation Leave credits |
| `slBalance` | `number` | Remaining Sick Leave credits |

### `AttendanceLog`
| Field | Type | Description |
| :--- | :--- | :--- |
| `employeeId` | `string` | Reference to Employee |
| `status` | `enum` | Present, Late, Undertime, Absent |
| `photoUrl` | `string` | Reference to Firebase Storage image |
| `coordinates` | `object` | Latitude and Longitude of the punch |

---

## 5. Security & Access Control
*   **Role-Based Access (RBAC)**: Distinct permissions for `Administrator`, `Assistant`, and `Employee`.
*   **Authentication**: Firebase Authentication (Email/Password) with custom session persistence.
*   **Admin Shield**: Critical settings (API Tokens, Thresholds) are stored in an encrypted-at-rest `settings` collection.

---

## 6. Directory Structure
```text
src/
├── components/          # UI Components
│   ├── common/          # Reusable UI (Buttons, Modals, Cards)
│   ├── dashboard/       # Specialized dashboard widgets
│   └── views/           # Full-page application views
├── lib/                 # Core Business Rules & Utilities
│   ├── PayrollCalculator.ts
│   ├── LeaveRules.ts
│   └── firebase.ts      # Database configuration
├── services/            # Infrastructure & API layers
│   ├── AttendanceService.ts
│   ├── FacialRecognitionService.ts
│   └── NotificationService.ts
├── store/               # Global state (Zustand)
└── models/              # TypeScript Interfaces & Classes
```

---

## 7. Environment & Deployment
*   **Environment Variables**: Requires `VITE_FIREBASE_API_KEY`, `VITE_TELEGRAM_BOT_TOKEN`, and `VITE_SMS_API_KEY`.
*   **Deployment**: 
    *   **Frontend**: Hosted on Render.com or Firebase Hosting.
    *   **Mobile**: Compiled via Android Studio and Capacitor.

---

**Document Version**: 1.2.0 (Phase 1 Ready)  
**Last Updated**: May 12, 2024  
**Author**: RSR Engineering Systems Team
