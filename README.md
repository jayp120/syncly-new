# Syncly - Team Collaboration & EOD Reporting App

Syncly is a modern, comprehensive web application designed for team collaboration, End-of-Day (EOD) reporting, and intelligent task management. It features distinct dashboards and functionalities for Employees, Managers, and Admins, all powered by a robust client-side architecture and enhanced with Google Gemini for AI-driven insights.

## Key Features

- **Role-Based Dashboards:** Tailored interfaces for Employees, Managers, and Super Admins.
- **EOD Reporting System:** Submit, edit, review, and acknowledge daily reports with version history and attachments.
- **Intelligent Task Management:** Personal, direct, and team tasks with status tracking, Kanban boards, and calendar views.
- **Smart Meeting Assistant:** "Live Memo" for instant note-taking and task delegation, plus scheduling for formal, recurring meetings.
- **AI-Powered Insights (Gemini):**
  - Generate performance review summaries for employees.
  - Create daily EOD summary snapshots for managers.
  - Draft tasks from natural language descriptions.
- **Real-Time Notifications:** A "smart" notification system with grouping, interactive buttons, and @mentions.
- **Performance & Gamification:** Earn badges for consistency streaks and view a monthly leadership board.
- **PWA Ready:** The application is a Progressive Web App, ready for installation on desktop and mobile devices.

---

## Getting Started (Vite Dev Server)

Syncly now runs via the standard Vite toolchain so local development mirrors production and secrets remain in env files rather than static bundles.

### Prerequisites

- [Node.js 18+](https://nodejs.org/) (npm ships with Node)
- Modern browser (Chrome, Firefox, Edge)

### 1. Configure Environment Variables

1. Copy the template file and populate it with your real credentials:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the Firebase, Google OAuth, Gemini, and Jay proxy settings. `.env*` files are git-ignored—do **not** commit your secrets.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Dev Server

```bash
npm run dev
```

Vite prints both the local and LAN URLs (defaults to `http://localhost:5173`). Hot Module Reloading (HMR) and env variable injection work automatically.

### 4. Gemini / Jay Assistant Keys

Gemini credentials are resolved in this order:

1. Environment variables (`VITE_GEMINI_API_KEY` / `GEMINI_API_KEY`)
2. Keys entered in the in-app modal (stored in local/session storage)

If you front Gemini with a Jay proxy service, set `VITE_JAY_PROXY_URL` (or `JAY_PROXY_URL` in server contexts). Otherwise provide the direct Gemini key.

---

## Project Structure

-   `/index.html`: The main entry point. It includes the import map for loading libraries from a CDN.
-   `/index.tsx`: The root of the React application.
-   `/components/`: Contains all React components, organized by role (Admin, Manager, Employee) or shared functionality (Common, Layout, Tasks).
-   `/services/`: Houses the core application logic, including `dataService.ts` (data persistence), `notificationScheduler.ts` (timed alerts), and more.
-   `/hooks/`: Custom React hooks, like `useLocalStorage`.
-   `/contexts/`: React Context providers for managing global state (Authentication, Toasts).
-   `/types.ts`: Centralized TypeScript definitions for all data structures.
-   `/constants.ts`: Default data, keys, and other application-wide constants.
-   `/sw.js`: The service worker file for PWA functionality.
-   `/manifest.json`: The PWA manifest file.
