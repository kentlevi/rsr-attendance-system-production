# RSR Engineering Attendance System — Documentation Master

---

# Project Overview

RSR Engineering Attendance System is a modern workforce attendance and management platform designed for Android tablets.

The platform follows a:

```txt
Web-First, Native-Enhanced, Offline-First Architecture
```

The system combines:

* React 19 + Vite frontend
* Native Android integration
* Firebase cloud services
* SQLite offline persistence
* ML Kit facial liveness verification
* Real-time workforce monitoring
* AI-powered leave parsing

---

# Core Tech Stack

## Frontend

| Area       | Technology                 |
| ---------- | -------------------------- |
| Framework  | React 19                   |
| Build Tool | Vite                       |
| Styling    | Tailwind CSS 4             |
| Animations | Motion / motion-react      |
| Charts     | Recharts                   |
| Icons      | Lucide React               |
| Components | Custom UI component system |

---

## Backend & API

| Area                | Technology         |
| ------------------- | ------------------ |
| Runtime             | Node.js            |
| Framework           | Express.js         |
| Development Runtime | tsx                |
| Production Bundler  | esbuild            |
| Database            | Firebase Firestore |
| Authentication      | Firebase Auth      |
| AI Parsing          | Google Gemini API  |
| SMS                 | Semaphore API      |

---

## Native Android Layer

| Area             | Technology                   |
| ---------------- | ---------------------------- |
| Wrapper          | Kotlin                       |
| Native Bridge    | AndroidWrapper.kt            |
| Offline Database | SQLite via Android Room      |
| Face Detection   | Google ML Kit Face Detection |
| Communication    | JavaScript Bridge            |

---

# System Philosophy

## Hybrid Architecture

```txt
React Web App
→ Native Android Wrapper
→ ML Kit Face Detection
→ SQLite Offline Storage
→ Firebase Cloud Sync
```

---

## Offline-First Kiosk

The attendance kiosk must continue functioning without internet.

Offline behavior:

* Attendance punches saved locally
* Records marked pending sync
* Automatic cloud synchronization
* Duplicate attendance prevention
* Offline photo persistence

---

## Full Facial Recognition Employee Verification

The system uses:

```txt
Google ML Kit Face Detection
+
Face Embedding Recognition
```

Purpose:

* Detect human face
* Validate liveness
* Generate facial embeddings
* Match employee identity
* Prevent spoofing
* Verify attendance punch

The system now supports:

```txt
Full Facial Recognition Employee Verification
```

Attendance punching flow:

```txt
Capture Face
→ Detect Face
→ Validate Liveness
→ Generate Face Embedding
→ Compare Against Employee Profiles
→ Match Employee Identity
→ Verify Confidence Threshold
→ Allow Attendance Punch
```

---

## Facial Enrollment

Employee onboarding requires:

* Multiple face captures
* Face embedding generation
* Embedding storage
* Enrollment verification

Employees are marked:

```txt
Face Enrolled
```

once registration completes.

---

## Recognition Confidence Rules

| Confidence Score | Action             |
| ---------------- | ------------------ |
| 85% and above    | Verified           |
| Below 85%        | Retry Verification |

---

## Offline Facial Recognition

Facial embeddings must support offline matching.

Offline behavior:

* local embedding cache
* offline employee matching
* offline attendance punching
* sync verification logs once internet returns

---

## AI-Powered Leave Parsing

Employees can submit conversational leave requests.

Example:

```txt
I need sick leave tomorrow because I have fever.
```

Gemini converts this into:

```json
{
  "leaveType": "Sick Leave",
  "startDate": "computed",
  "endDate": "computed",
  "reason": "fever"
}
```

---

# Admin Modules

## Dashboard

Simple operational overview.

Features:

* Today summary cards
* Pending approvals
* Recent activity
* Quick navigation

---

## Logs

Attendance logs and attendance history.

Features:

* Daily attendance
* Filters
* Search
* CSV export
* Attendance status tracking

---

## Workforce Insights

Operational workforce monitoring.

Features:

* Present employees
* Absent employees
* Late employees
* Away-site employees
* Undertime monitoring
* Attendance charts
* Workforce activity feed

---

## Photos

Attendance verification photos.

Features:

* Verification snapshots
* Fullscreen preview
* Timestamp metadata
* Attendance action tags

---

## Staff

Employee management module.

Features:

* Add employee
* Edit employee
* Employee details modal
* Facial enrollment data
* Department assignment
* Site assignment
* Employee status

---

## SMS Logs

AWOL and absence notification monitoring.

Features:

* SMS delivery logs
* Failed messages
* AWOL notifications
* SMS cost tracking

---

## Settings

System configuration module.

Features:

* Shift schedules
* Break rules
* Allowance rules
* SMS configuration
* Company profile
* Time settings

---

## Profile

Admin profile management.

Features:

* Profile editing
* Personal information
* Account management

---

# Employee Portal

## Employee Access

Employees authenticate using:

```txt
Full Facial Recognition Verification
```

The kiosk identifies employees by comparing live facial embeddings against enrolled employee profiles.

No PIN login.
No password login.
No employee selection required.

---

## Employee Dashboard

Features:

* Attendance summary
* Weekly rendered hours
* Leave summary
* Notifications
* Quick actions

---

## My Time

Features:

* Attendance history
* Worked hours
* Attendance statuses
* Weekly summary

---

## Apply Leave

Features:

* Conversational leave filing
* Leave form
* AI parsing
* Leave type selection

---

## Leave Status

Features:

* Approved leaves
* Pending leaves
* Declined leaves
* Remaining balances

---

## Submit Undertime

Features:

* Undertime request
* Duration calculation
* Approval workflow

---

# Design System

## Visual Direction

The UI must maintain:

* Emerald / green accents
* Heavy font weights
* Rounded-xl containers
* Soft shadows
* Spacious layouts
* Premium enterprise feel
* Minimal visual clutter

---

## Colors

```css
--primary: #0B7A4B;
--primary-dark: #065F46;
--surface: #FFFFFF;
--background: #F5F7FA;
--text-primary: #0F172A;
--text-secondary: #64748B;
--border: #E2E8F0;
```

---

## Radius

| Token | Value |
| ----- | ----- |
| sm    | 12px  |
| md    | 18px  |
| lg    | 24px  |
| xl    | 32px  |

---

## Typography

| Element       | Size |
| ------------- | ---- |
| Page Title    | 40px |
| Section Title | 28px |
| Card Title    | 22px |
| Body          | 16px |
| Small Text    | 14px |

---

# Component Library

## Core Components

### Button

Variants:

* primary
* secondary
* danger
* ghost

---

### InputField

Reusable input component.

---

### SelectField

Reusable dropdown component.

---

### Card

Reusable container component.

---

### Modal

Reusable modal system.

---

### Badge

Reusable status badge.

---

### DataTable

Reusable table component.

---

### StatCard

Reusable metric display.

---

### PageHeader

Reusable page heading.

---

# Folder Structure

```txt
src/
  components/
    ui/
    layout/
    forms/
    modals/

  pages/
    admin/
    employee/
    kiosk/

  services/

  hooks/

  store/

  lib/

  types/
```

---

# Attendance Rules

## Time In Rules

* Before 8:00 AM → counted from 8:00 AM
* 8:00–8:10 AM → considered on-time
* After 8:10 AM → marked late
* After 5:00 PM → requires admin approval

---

## Lunch Out Rules

* Allowed: 12:00 PM – 12:30 PM
* After 12:30 PM → approval required
* Before 12:00 PM → approval required
* Minimum 2 hours work before lunch
* Clock in after 1:00 PM → lunch auto-deducted

---

## Lunch In Rules

* Earliest: 12:40 PM
* Auto-recorded as 1 hour lunch
* Late return → actual duration deducted

---

## PM Break Out Rules

* Allowed: 5:00 PM – 5:30 PM
* Before 5:00 PM → approval required
* After 5:30 PM → approval required

---

## PM Break In Rules

* Earliest: 5:40 PM
* Recorded as 6:00 PM regardless of return
* Late return → actual duration recorded

---

## Time Out Rules

* Within 1 hour dismissal → auto-snapped
* More than 1 hour late → admin approval required

---

## Incomplete Records

* Missing timeout flagged
* Next attendance requires approval
* CSV marked:

```txt
PAYROLL REVIEW REQUIRED
```

---

# Leave System Rules

| Leave Type        | Days      | Pay        | Filing           |
| ----------------- | --------- | ---------- | ---------------- |
| Sick Leave        | 2         | 8 hrs paid | Same day allowed |
| Vacation Leave    | 2         | 8 hrs paid | 3 days advance   |
| Leave Without Pay | Unlimited | 0 hrs      | Same day allowed |

---

# Leave Replenishment

* Every 6 months:

  * +2 SL
  * +2 VL
* New employee start based on first attendance
* Existing employee start manually configurable
* Runs daily at midnight

---

# AWOL Rules

| Day   | Action                        |
| ----- | ----------------------------- |
| Day 1 | SMS notice                    |
| Day 2 | Urgent SMS                    |
| Day 3 | AWOL SMS + account suspension |

---

## AWOL Exceptions

* Leave Without Pay not counted as absence
* Approved leave not counted as absence
* Admin reinstates suspended employees

---

# OT Allowance Rules

| Employee Type | Minimum Timeout | Amount |
| ------------- | --------------- | ------ |
| On-Time       | 9:00 PM         | ₱50    |
| Late Employee | 10:00 PM        | ₱50    |

---

# Pending Approvals

Triggers:

* Late time in
* Late lunch out
* Late PM break out
* Late timeout
* Early lunch out
* Early PM break out
* Incomplete record
* Straight duty request

Approvals appear in:

* Telegram notifications
* Admin approval panel

---

# SMS System

Purpose:

```txt
AWOL and absence notifications only
```

Features:

* Absence notifications
* Failed delivery tracking
* SMS logs
* Semaphore integration

---

# Facial Recognition System

## Recognition Workflow

```txt
Camera Capture
→ ML Kit Face Detection
→ Liveness Validation
→ Face Embedding Generation
→ Employee Matching
→ Confidence Verification
→ Attendance Punch
```

---

## Enrollment Workflow

```txt
Add Employee
→ Capture Face Samples
→ Generate Embeddings
→ Save Employee Facial Profile
→ Mark Employee as Face Enrolled
```

---

## Recognition Features

* realtime facial matching
* liveness detection
* offline face matching
* anti-spoof validation
* confidence scoring
* verification retry handling

---

## Attendance Verification

Employees are automatically identified during:

* time in
* lunch out
* lunch in
* PM break out
* PM break in
* time out

---

# Photo Verification System

Attendance actions capture:

* time in
* lunch out
* lunch in
* PM break out
* PM break in
* time out

Each photo stores:

* timestamp
* attendance action
* employee metadata

---

# State Management

## Stores

### Auth Store

* admin auth
* employee session

### Attendance Store

* realtime attendance
* attendance filters

### Workforce Store

* workforce summaries
* insights

### Modal Store

* centralized modal control

### Settings Store

* shift rules
* SMS settings
* allowance rules

---

# Performance Guidelines

* Lazy-loaded routes
* Shared reusable components
* Optimized charts
* Lightweight modals
* Cached workforce summaries
* Optimized image handling

---

# Security Rules

## Employee Access

* Facial liveness verification only
* No password login
* No PIN login

---

## Admin Access

* Firebase authentication
* Role-based access

---

# Deployment

## Frontend

* Vite production build
* React 19
* Tailwind CSS 4

---

## Backend

* Express API
* Firebase integration
* Semaphore integration
* Gemini integration

---

# Implementation Progress & Checklist

For per-feature verification after each implementation, use [Feature Implementation Checklist](docs/feature-implementation-checklist.md).

To ensure we stay on track with the Master Plan, here is the current implementation status and the upcoming phases. We will update this checklist as we progress.

## Phase 1: Core Foundation & UI System (✅ Completed)
- [x] Set up React 19 + Vite with Tailwind CSS
- [x] Configure routing and core layout wrapper
- [x] Develop Custom UI Component Library (`Select`, `Modal`, `Button`, `StatCard`, etc.)
- [x] Implement Design System (Emerald/Green accents, Rounded-xl, Typography)

## Phase 2: Admin Dashboard & Modules (✅ Mostly Completed)
- [x] Implement Admin Dashboard (Workforce Insights, Summary Cards)
- [x] Implement Logs Module (Attendance Logs filters, CSV export structure)
- [x] Implement Staff Module (Employee table, details, editing)
- [x] Implement Settings configuration UI
- [x] Implement Photos View and SMS Logs UI

## Phase 3: Backend & AI Integration (⏳ In Progress)
- [x] Setup Firebase Firestore and Rules
- [x] Setup Express Node server with Vite middleware
- [x] Implement Gemini AI backend endpoint for Leave parsing (`/api/extract-leave`)
- [x] Connect Employee Portal UI to the Gemini AI Leave Parsing endpoint (Conversational UI)
- [x] Complete SMS API Integration (Semaphore) for AWOL triggers

## Phase 4: Timeclock & Facial Recognition (✅ Completed)
- [x] Remove mock/webcam constraints and finalize Android ML Kit Kotlin bridge interface
- [x] Implement Facial Enrollment flow in Staff Module (store embeddings)
- [x] Implement Offline Facial Embedding matching in `TimeClock.tsx`
- [x] Implement Face-only login for Employee Portal (No PIN/Password)

## Phase 5: State Management & Business Logic (🔴 Pending)
- [ ] Migrate local states to centralized Stores (Auth, Attendance, Workforce, Settings)
- [x] Implement strict Time In/Out rules, Lunch/Break rules, and Overtime logic
- [ ] Implement Leave Replenishment cron/automation logic

## Phase 6: Offline-First & Android Wrapper (🔴 Pending)
- [ ] Implement SQLite Room database queries in Kotlin layer
- [ ] Build JavaScript-to-Native bridge for syncing (Sync Service)
- [ ] Implement Offline Photo Persistence and queued uploads fallback

