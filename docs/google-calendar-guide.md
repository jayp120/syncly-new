# Step-by-Step Guide: Implementing Google Calendar Sync

This guide provides a clear path to integrating Google Calendar into the EOD Manager application. This implementation will use Google's client-side JavaScript library, which is suitable for a proof-of-concept.

**Note for Production:** A real-world, production-ready application should **always** use a backend server to handle authentication tokens securely. Storing user access tokens in the browser's local storage is not secure.

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

Now, let's integrate the Google Calendar functionality into our React application.

#### **Step 1: Load the Google API Client Library**

We need to load Google's special JavaScript library to handle authentication and API calls.

*   **Action:** Modify `index.html` to include the `gapi` script. Add this line in the `<head>` section, preferably before your main app script:
    ```html
    <script src="https://apis.google.com/js/api.js" async defer></script>
    ```

#### **Step 2: Create a Service for Google Calendar Logic**

It's best practice to keep all Google Calendar logic separate.

*   **Action:** Create a new file: `services/calendarService.ts`. This file will contain functions to initialize the client, sign in, sign out, and create events.

    *You will need to paste your **Client ID** from Part 1 into this file.*

#### **Step 3: Manage Authentication State with a React Context**

We need a way to know if the user is signed into Google across our entire app. A React Context is perfect for this.

*   **Action:** Create a new file `contexts/GoogleCalendarContext.tsx`. This will manage the sign-in state and provide the service functions to any component that needs them.

#### **Step 4: Integrate into the `SmartMeetingModal` Component**

This is where the user will interact with the feature.

1.  **Wrap the App in the Provider:** In `App.tsx`, wrap your application's routes with the `GoogleCalendarProvider` you created in the previous step.

2.  **Use the Context in `SmartMeetingModal.tsx`:**
    *   Access the sign-in state and functions from the context: `const { isSignedIn, signIn, createEvent } = useGoogleCalendar();`
    *   **Modify the "Sync with Calendar" checkbox:**
        *   If the user is **not** signed into Google, show a "Sign in with Google to Sync" button instead of the checkbox. Clicking this button will call the `signIn()` function from your context.
        *   If the user **is** signed in, show the "Sync with Calendar" checkbox.

3.  **Trigger Event Creation:**
    *   In the `handleEndMeeting` function within `SmartMeetingModal.tsx`, check if the "Sync with Calendar" checkbox is checked and if the user is signed in.
    *   If both are true, gather all the meeting details (title, description, start/end times, attendee emails).
    *   Format these details into a Google Calendar event object. The start and end times need to be in ISO 8601 format (e.g., `2024-09-21T10:00:00`).
    *   Call your `createCalendarEvent` function from the service with this event object.
    *   Use `try...catch` to handle the API response and show a success or error notification to the user.

By following these steps, you will have a working proof-of-concept for Google Calendar integration in the application.