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
-   **PWA Ready:** Implements Progressive Web App features.
-   **Firebase Authentication:** Secure email/password authentication using custom claims for role and tenant identification.
-   **Real-time Features:** Implements real-time notifications and activity tracking using Firestore `onSnapshot` listeners.
-   **Server-Side Logic:** Utilizes Firebase Cloud Functions for critical operations like tenant provisioning and status updates.
-   **Comprehensive Security:** Firestore security rules enforce multi-tenant isolation, RBAC, and data immutability.

**Feature Specifications:**
-   **EOD Reporting System:** Daily report submission and management, including multi-manager acknowledgment.
-   **Task Management:** Personal, direct, and team tasks with Kanban boards. Includes employee mention/tagging system.
-   **Smart Meeting Assistant:** Live memo and meeting scheduling with Google Calendar sync.
-   **Performance & Gamification:** Badge system and leaderboards.
-   **Notifications:** Real-time activity logs, bell icon updates, and desktop push notifications for crucial events (19 total types, 15 crucial).

**UI/UX Decisions:**
-   Component-based architecture.
-   Styling handled by Tailwind CSS for a utility-first approach.

## External Dependencies
-   **Firebase:** Authentication, Firestore (NoSQL database), Cloud Functions.
-   **Google Gemini API:** AI-powered insights and task generation.
-   **Google Calendar:** Two-way synchronization for meeting and scheduling.
-   **Vite:** Build tool.
-   **React Router DOM:** Client-side routing.
-   **Tailwind CSS (CDN):** Styling framework.