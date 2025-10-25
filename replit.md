# Syncly - Team Collaboration & EOD Reporting Application

## Overview
Syncly is a multi-tenant SaaS application designed to enhance team productivity and operational efficiency through collaboration, End-of-Day (EOD) reporting, and intelligent task management. It supports multiple companies with robust data isolation and provides role-based dashboards. The application integrates Firebase for secure authentication and leverages Google Gemini AI for intelligent insights. Its core ambition is to deliver a world-class solution in the team collaboration space.

## User Preferences
I prefer clear, concise explanations and detailed guidance. I want iterative development with regular updates. Ask before making major changes or architectural decisions. Do not make changes to files outside the explicitly requested scope. I prefer to maintain the existing project structure and styling unless a change is explicitly requested or significantly improves performance/maintainability.

## System Architecture
The application is built using **React 19.1** and **TypeScript**, with **Vite 6.2** for tooling, **React Router DOM v6** for navigation, and **Tailwind CSS (CDN)** for styling.

**Key Architectural Decisions:**
-   **Multi-Tenant SaaS:** Designed for multiple organizations with complete data isolation using `tenantId`. A Platform Super Admin role manages tenants.
-   **Platform Admin Architecture:** Special user type with `isPlatformAdmin: true` for god-mode access via Firestore rules and Cloud Functions.
-   **Role-Based Access Control (RBAC):** Tailored dashboards and functionalities for Employees, Managers, Admins, and Directors.
-   **Hybrid Data Persistence:** Repository pattern with tenant-specific in-memory cache and LocalStorage fallback, with **Firestore** as the primary cloud database.
-   **AI Integration:** Leverages **Google Gemini API** for intelligent features.
-   **PWA Ready:** ✅ **PRODUCTION READY** - Complete Progressive Web App implementation with professional icons (192x192, 512x512, maskable variants, 72x72 badge). Icons generated using AI with modern infinity symbol design. Manifest includes all required icons with proper purposes (any, maskable, monochrome).
-   **Firebase Authentication:** Secure email/password authentication using custom claims for role and tenant identification.
-   **Real-time Features:** Implements real-time notifications and activity tracking using Firestore `onSnapshot` listeners.
-   **Server-Side Logic:** Utilizes Firebase Cloud Functions for critical operations like tenant provisioning and status updates.
-   **Comprehensive Security:** Firestore security rules enforce multi-tenant isolation, RBAC, and data immutability.
-   **Firestore Composite Indexes:** 20 composite indexes configured for optimal query performance (see `firestore.indexes.json` and `FIRESTORE_INDEXES_DEPLOYMENT.md`).

**Feature Specifications:**
-   **EOD Reporting System:** Daily report submission and management, including multi-manager acknowledgment.
-   **Task Management:** Personal, direct, and team tasks with Kanban boards. Includes employee mention/tagging system.
-   **Smart Meeting Assistant:** Live memo and meeting scheduling with Google Calendar sync. Google Calendar invitations sent to all attendees via `sendUpdates: 'all'` parameter.
-   **Performance & Gamification:** Badge system and leaderboards.
-   **Notifications:** ✅ **PRODUCTION READY** - Real-time notification system with 23 types (20 crucial). Includes real-time in-app bell icon, desktop/mobile push notifications, and 7 automated scheduled triggers. Firestore composite indexes deployed successfully (October 23, 2025).
-   **Telegram Bot Integration:** ✅ **LIVE IN PRODUCTION** - Complete Telegram bot (@syncly_superbot) with 7 commands (/start, /help, /tasks, /today, /streak, /leaderboard, /unlink) and 5 notification types. Deployed October 24, 2025 with 3 Firebase Cloud Functions (telegramWebhook, sendTelegramNotification, generateTelegramLinkingCode). Webhook active at us-central1. See `TELEGRAM_DEPLOYMENT_SUCCESS.md`.

**UI/UX Decisions:**
-   Component-based architecture.
-   Styling handled by Tailwind CSS for a utility-first approach.
-   **Production-Ready Landing Page:** Clean, minimalistic design highlighting AI features (Consistency Tracker, Performance Hub, AI EOD Reports, AI Task Generation) and Google Calendar integration. Legal documentation (About, Privacy Policy, Terms of Service) are accessible via dedicated route pages, not inline on landing page.
-   **Legal Pages Architecture:** About Us, Privacy Policy, and Terms of Service are standalone pages with dedicated routes (/about, /privacy, /terms) accessible from footer links. Each page features consistent design, navigation header, and embedded contact information.

## Database Configuration
**Firestore Security Rules:** ✅ **DEPLOYED** (October 25, 2025)
- **Status:** Production-ready with multi-tenant isolation and RBAC
- **Key Features:** Login fix, Tenant Admin permissions, immutable audit logs
- **Deployment Guide:** See `FIRESTORE_RULES_DEPLOYMENT.md`
- **Quick Deploy:** `firebase deploy --only firestore:rules`

**Auto-Migration System:** ✅ **ACTIVE** (October 25, 2025)
- **Status:** Production-ready, runs automatically on admin login
- **Purpose:** Automatically updates role permissions without manual intervention
- **Triggers:** Platform Admin and Tenant Admin logins
- **Guide:** See `AUTO_MIGRATION_GUIDE.md`
- **Implementation:** `services/autoMigrationService.ts`

**Tenant Admin Permission Bypass:** ✅ **PRODUCTION READY** (October 25, 2025)
- **Status:** Secure permission bypass using Firebase Auth custom claims - **ARCHITECT APPROVED**
- **Purpose:** Grants Tenant Admins immediate access to ALL admin features (68 comprehensive permissions) without waiting for role document migration
- **Permissions Coverage:** Complete coverage including Role Management (6), User Management (13), Business Units (7), Tasks (10), EOD Reports (10), Leave (7), Meetings/Calendar (7), Settings/Integration (7), Integration Access (3: Google Calendar, Telegram Bot, Gemini AI)
- **Security:** Uses verified `isTenantAdmin` custom claim from Firebase Auth token (cannot be manipulated by users)
- **Implementation:** `components/Auth/AuthContext.tsx` - hasPermission callback checks custom claim first, then falls back to role permissions
- **Session Persistence:** Auth state listener reads custom claims on page refresh to maintain permissions across sessions
- **Auto-Migration:** Still runs in background to fix outdated role documents
- **Zero Manual Intervention:** Works automatically on every login and page refresh - true production SaaS standard

**Firestore Indexes:** ✅ **DEPLOYED** (October 23, 2025)
- **Project:** syncly-473404
- **Indexes:** 20 composite indexes
- **Verification:** All indexes show "ENABLED" in Firebase Console
- **Deployment Guide:** See `FIRESTORE_INDEXES_DEPLOYMENT.md`
- **Quick Deploy:** `./deploy-firestore-indexes.sh`

**Critical Notification Index:**
```json
{
  "collectionGroup": "notifications",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

## Contact Information
-   **Email:** syncly19@gmail.com
-   **Phone:** +91 92702 79703

## External Dependencies
-   **Firebase:** Authentication, Firestore (NoSQL database), Cloud Functions.
-   **Google Gemini API:** AI-powered insights and task generation.
-   **Google Calendar:** Two-way synchronization for meeting and scheduling (scope: `calendar.events` or `calendar` recommended).
-   **Telegram Bot API:** Real-time messaging and notifications via @syncly_superbot (100% FREE, no rate limits).
-   **Vite:** Build tool.
-   **React Router DOM:** Client-side routing.
-   **Tailwind CSS (CDN):** Styling framework.
