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

## 🚀 Getting Started: Running Locally in VS Code

This project is designed to be run easily without a complex build setup, using modern browser features like import maps. The recommended way to run it locally is with the **Live Server** extension in Visual Studio Code.

### Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/)
- A modern web browser (Chrome, Firefox, Edge)

### Step-by-Step Instructions

1.  **Install Live Server Extension:**
    -   Open VS Code.
    -   Go to the Extensions view (click the icon in the sidebar or press `Ctrl+Shift+X`).
    -   Search for `Live Server` by Ritwick Dey.
    -   Click **Install**.

2.  **Open the Project:**
    -   Open the root folder of the Syncly application in VS Code.

3.  **Launch the Application:**
    -   In the VS Code Explorer, find the `index.html` file.
    -   **Right-click** on `index.html`.
    -   Select **"Open with Live Server"** from the context menu.

    

    -   Your default web browser will automatically open a new tab with the application running (e.g., at `http://127.0.0.1:5500`).

### 4. Configure Your Gemini API Key

The first time you run the app, you will be prompted to enter your Google Gemini API key. This is required for all AI-powered features.

-   **Get your key:** If you don't have one, you can get it from [Google AI Studio](https://aistudio.google.com/app/apikey).
-   **Enter the key:** Paste your API key into the input field in the modal that appears and click "Save Key".

The key will be stored securely in your browser's **session storage** and will be remembered as long as you keep the browser tab open. You will need to re-enter it if you close the tab and open a new one. **Your key is not stored anywhere else and is not sent to any server other than Google's API.**

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
