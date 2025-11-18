# Step-by-Step Guide: Implementing Google Calendar Sync

This guide explains how Syncly integrates with Google Calendar using a **production-safe architecture**. Instead of storing OAuth tokens in the browser, we now rely on Firebase Cloud Functions to exchange authorization codes, persist refresh tokens inside `userIntegrations/{userId}`, and proxy every Calendar API call from the backend.

---

### **Part 1: Prerequisites - Setting Up Your Google Project**

Before writing any code, you need to configure a project in the Google Cloud Platform to get the necessary credentials for your application.

1.  **Create a Google Cloud Project:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Click the project dropdown in the top bar and select "New Project".
    *   Give it a descriptive name like "Syncly" and create it.

2.  **Enable the Google Calendar API:**
    *   In your new project's dashboard, navigate to "APIs & Services" > "Library".
    *   Search for "Google Calendar API" and click "Enable". This makes the API available to your project.

3.  **Configure the OAuth Consent Screen:**
    *   This is what users will see when they grant your app permission.
    *   Go to "APIs & Services" > "OAuth consent screen".
    *   Choose **"External"** for the User Type and click "Create".
    *   Fill out the required information:
        *   **App name:** Syncly
        *   **User support email:** Your email address.
        *   **Developer contact information:** Your email address.
    *   Click "Save and Continue".
    *   On the "Scopes" page, click "Add or Remove Scopes". Find the scope for `.../auth/calendar.events` (it allows creating/editing events) and add it.
    *   On the "Test users" page, add the Google accounts you'll be using for testing (e.g., your own Gmail account).

4.  **Create OAuth 2.0 Credentials:**
    *   This is the key that identifies your application to Google.
    *   Go to "APIs & Services" > "Credentials".
    *   Click "+ Create Credentials" and select **"OAuth client ID"**.
    *   For "Application type", choose **"Web application"**.
    *   Give it a name, like "Syncly Web Client".
    *   Under **"Authorized JavaScript origins"**, add the URL where your app is running. For local development, this is `http://localhost:8000`. If you have deployed it, add that URL too (e.g., `https://your-project.web.app`).
    *   Under **"Authorized redirect URIs"**, add the same URL(s). This is where Google will send the user back after they log in.
    *   Click "Create". You will be given a **Client ID**. Copy this value; you'll need it in the code.

---

### **Part 2: Step-by-Step Code Implementation**

Now, let's walk through the updated implementation.

#### **Step 1: Load Google Identity Services (GIS)**

The browser only needs the lightweight GIS script to request an OAuth authorization code. Add this once in `index.html`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

We no longer embed the deprecated `gapi` client—every Calendar API call flows through the backend.

#### **Step 2: Configure the Secure Backend Exchange**

1. **Provide the OAuth secrets via `.env` files:**

   ```
   cd functions
   cp .env.example .env.<your-project-id>
   # Example for production:
   #   cp .env.example .env.syncly-473404
   # Then edit the file:
   GOOGLE_CALENDAR_CLIENT_ID="YOUR_WEB_CLIENT_ID"
   GOOGLE_CALENDAR_CLIENT_SECRET="YOUR_WEB_CLIENT_SECRET"
   GOOGLE_CALENDAR_REDIRECT_URI="postmessage"
   ```

   The Firebase CLI automatically uploads project-scoped `.env.*` files during `firebase deploy`, so no secrets live in source control and we avoid the deprecated `functions.config()` API.

2. **Deploy the Cloud Functions** shipped in `functions/src/index.ts`:
   * `exchangeGoogleCalendarCode` – exchanges the OAuth code for tokens and writes them to `userIntegrations/{uid}.googleCalendar`.
   * `unlinkGoogleCalendar` – revokes tokens and clears saved credentials.
   * `createGoogleCalendarEvent`, `updateGoogleCalendarEvent`, `getGoogleCalendarInstance` – proxy Calendar REST calls on behalf of the authenticated user after refreshing tokens when needed.

All tokens remain server-side; Firestore only exposes metadata (status, display name, avatar) to the client.

#### **Step 3: Manage Authentication State with `GoogleCalendarContext`**

`contexts/GoogleCalendarContext.tsx` now:

* Listens to `userIntegrations/{currentUser.id}` via Firestore to keep every tab in sync.
* Boots a GIS `codeClient` with `VITE_GOOGLE_CLIENT_ID` and requests an OAuth **code** (not an access token).
* Calls `calendarService.exchangeAuthCode(code)` to trigger the backend exchange.
* Offers `signIn`, `signOut`, `createEvent`, and reactive status (`isSignedIn`, `googleUser`) to consumers.

Because Firestore broadcasts updates, connecting Google Calendar in one tab instantly updates every other tab (and even other devices signed into the same account).

#### **Step 4: Use the Context & Service in UI flows**

1. **Wrap the App:** In `App.tsx`, ensure `<GoogleCalendarProvider>` already wraps the authenticated portion of the UI (it sits under `<AuthProvider>` so it can read the current user).

2. **Integrations Screen:** `components/Integrations/IntegrationsPage.tsx` surfaces the new status. When users click “Connect Google Calendar,” we call `signIn()` which launches the GIS popup. Disconnect uses `signOut()` which maps to `unlinkGoogleCalendar`.

3. **Meeting & Task Flows:** Components such as `ScheduleMeetingForm` and `MeetingWorkspacePage` call:

   ```ts
   const { isSignedIn, createEvent, signIn } = useGoogleCalendar();
   ```

   * When scheduling a meeting with sync enabled, we first ensure the integration is connected, then call `calendarService.createEvent(...)`. The result includes the Google event ID so Syncly can store it.
   * During live meeting finalization or catch-up posts, Syncly calls `calendarService.getInstance` and `calendarService.updateEvent` (both hit the backend) to keep Google Calendar descriptions aligned with the latest notes/tasks.

With this pattern we have:

* Zero long-lived tokens in the browser.
* Automatic cross-tab updates (thanks to Firestore listeners and the existing `storage` sync).
* Server-controlled refresh tokens so reconnecting after a page reload “just works.”

You now have a full production-ready Google Calendar integration that satisfies security, reliability, and multi-tab consistency requirements.
