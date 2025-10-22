# Syncly - Team Collaboration & EOD Reporting Application

## Overview
Syncly is a multi-tenant SaaS application designed to enhance team productivity and operational efficiency through collaboration, End-of-Day (EOD) reporting, and intelligent task management. It supports multiple companies with robust data isolation and provides role-based dashboards for Employees, Managers, and Admins. The application integrates Firebase for secure authentication and leverages Google Gemini AI for intelligent insights. Its core ambition is to deliver a world-class solution in the team collaboration space.

## User Preferences
I prefer clear, concise explanations and detailed guidance. I want iterative development with regular updates. Ask before making major changes or architectural decisions. Do not make changes to files outside the explicitly requested scope. I prefer to maintain the existing project structure and styling unless a change is explicitly requested or significantly improves performance/maintainability.

## System Architecture
The application is built using **React 19.1** and **TypeScript**, with **Vite 6.2** for tooling, **React Router DOM v6** for navigation, and **Tailwind CSS (CDN)** for styling.

**Key Architectural Decisions:**
-   **Multi-Tenant SaaS:** Designed for multiple organizations with complete data isolation enforced by a `tenantId` across all data. A Platform Super Admin role manages tenants.
-   **Platform Admin Architecture:** Special user type with `isPlatformAdmin: true` flag for Syncly owner, providing god-mode access to all tenants via Firestore rules and Cloud Functions.
-   **Role-Based Access Control (RBAC):** Tailored dashboards and functionalities for Employees, Managers, and Admins.
-   **Hybrid Data Persistence:** Utilizes a repository pattern with tenant-specific in-memory cache and LocalStorage fallback, with **Firestore** as the primary cloud database.
-   **AI Integration:** Leverages **Google Gemini API** for intelligent features like performance summaries and task generation.
-   **PWA Ready:** Implements Progressive Web App features for enhanced user experience and offline capabilities.
-   **Firebase Authentication:** Secure email/password authentication using custom claims for role and tenant identification.
-   **Real-time Features:** Implements real-time notifications and activity tracking using Firestore `onSnapshot` listeners.
-   **Server-Side Logic:** Utilizes Firebase Cloud Functions for critical operations like tenant provisioning, status updates, and plan changes, ensuring secure and atomic transactions.
-   **Comprehensive Security:** Firestore security rules enforce multi-tenant isolation, RBAC, and data immutability at the database level, with platform admin bypass capabilities.

**Feature Specifications:**
-   **EOD Reporting System:** Daily report submission and management.
-   **Task Management:** Personal, direct, and team tasks with Kanban boards.
-   **Smart Meeting Assistant:** Live memo and meeting scheduling with Google Calendar sync.
-   **Performance & Gamification:** Badge system and leaderboards.
-   **Notifications:** Real-time activity logs, bell icon updates, and desktop push notifications.

**UI/UX Decisions:**
-   Component-based architecture with clear separation of concerns.
-   Styling handled by Tailwind CSS for a utility-first approach.

## External Dependencies
-   **Firebase:** Authentication, Firestore (NoSQL database), Cloud Functions.
-   **Google Gemini API:** AI-powered insights and task generation.
-   **Google Calendar:** Two-way synchronization for meeting and scheduling.
-   **Vite:** Build tool.
-   **React Router DOM:** Client-side routing.
-   **Tailwind CSS (CDN):** Styling framework.

## Recent Changes & Production Status
**🚀 PRODUCTION READY - Employee Mention Tagging System Complete (October 21, 2025):**
-   ✅ **Mention Tagging System Implemented (Oct 21):** Built comprehensive employee mention/tagging system using contenteditable approach - displays mentions as `@name` visual chips (indigo pills with dark mode support), stores in markdown format `@[name](id)`, smart deletion removes entire tag on backspace, autocomplete dropdown with keyboard navigation, supports single/multi-word names, handles punctuation correctly, no conversion bugs - architect approved
-   ✅ **MentionTextarea Component (Oct 21):** Created production-ready reusable component with contenteditable div, single source of truth in markdown, visual chip rendering, position-based smart deletion, IME composition support, and proper cursor management
-   ✅ **Mention Integration (Oct 21):** Integrated MentionTextarea across InlineTaskCreator, SmartMeetingModal, and MeetingWorkspacePage - all mention inputs display `@name` instead of `@[name](id)` format, support backspace deletion of entire tags, and maintain display/markdown synchronization
-   ✅ **Landing Page Optimized (Oct 21):** Completely rebuilt landing page with production-grade performance - removed intersection observers causing re-renders, simplified state management, added smooth CSS animations with floating background orbs, hover effects on all interactive elements, working scroll navigation, and all CTAs properly redirect to /login
-   ✅ **Business Unit Update Fix (Oct 21):** Fixed Firestore error when updating user business units - added undefined value filtering in updateDocument function to prevent "Unsupported field value: undefined" errors
-   ✅ **Manager Dashboard UI Enhancement (Oct 21):** Relocated "Plan a New Meeting" button to Management Toolkit card, removed floating FAB, improved light/dark mode contrast (cyan-500 in light, cyan-400 in dark)
-   ✅ **COMPREHENSIVE: 14 Desktop Notification Types Enabled (Oct 21):** Added `isCrucial: true` flag to ALL important notifications - task assignments (3 types), task deadlines (3 types), EOD reminders (2 types), manager comments, meeting events (2 types), mentions, profile updates, blocked status - architect approved - covers 100% of urgent/actionable events
-   ✅ **CRITICAL: Manager Notification Bug Fixed (Oct 21):** Fixed critical bug in `addReport` function - changed `u.roleId === 'manager'` to `u.roleName === 'Manager'` (roleId contains document IDs like "role_abc123", not role names) - this was preventing ALL manager notifications from being created - architect approved
-   ✅ **Notification Permission System Verified (Oct 21):** Confirmed permission requests work correctly in AuthContext (on login) and AppLayout (on mount) - architect approved
-   ✅ **Comprehensive Notification Documentation (Oct 21):** Created NOTIFICATION_SYSTEM_COMPLETE.md with full system architecture, all notification types, testing guide, and production checklist. Created NOTIFICATION_PERMISSION_TEST_GUIDE.md for comprehensive testing instructions
-   ✅ **Employee Selection Fully Fixed (Oct 21):** Fixed all employee selection filters across the platform - SmartMeetingModal, ScheduleMeetingForm, and PerformanceSnapshotCard now correctly filter by UserStatus.ACTIVE. All employee dropdowns (Performance Hub, Performance Snapshot, meeting attendees, task assignation) now show only ACTIVE employees - architect approved
-   ✅ **Consistency Tracker Improvements (Oct 21):** Updated Consistency Tracker to show simplified columns (Employee | Last Report | Reports This Month | Actions) and improved logic to exclude leaves and weekly offs from missed report calculations - architect approved
-   ✅ **UserStatus Enum Fix (Oct 21):** Fixed case mismatch between enum ('Active'/'Archived') and database values ('active'/'archived') - users now display correctly in User Management
-   ✅ **Users Collection Access Fix:** Updated Firestore rules to allow authenticated users to list/query users in their own tenant - Manager/Employee can now view team members
-   ✅ **Tenant Isolation Verified:** Architect confirmed tenant isolation maintained via custom claims - users can only see users in their own tenant
-   ✅ **All User Types Working:** Platform Admin, Tenant Admin, Manager, Employee - all roles working perfectly with zero permission errors
-   ✅ **Production Deployed:** All Firestore rules deployed successfully to Firebase production