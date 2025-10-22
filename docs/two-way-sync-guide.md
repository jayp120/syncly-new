# Implementing Two-Way Sync (From Google Calendar)

This document outlines the architecture and process for implementing a full, robust two-way synchronization feature where changes made in a user's Google Calendar are automatically reflected back in the Syncly application.

### Introduction

While creating events from Syncly to Google Calendar can be managed on the client-side for demonstration, a true two-way sync **requires a backend server**. This is essential for security, reliability, and handling events that occur when the user does not have the Syncly app open.

The core technology that enables this is **Google's Push Notifications API (Webhooks)**.

### Architecture Overview

The system will consist of three main parts:

1.  **Frontend (Syncly App):** The user interface. It is responsible for initiating the original event creation and displaying the synced data. It does not handle incoming sync logic.
2.  **Backend Server (e.g., Node.js, Python, Go):** The heart of the sync logic. This server securely stores user authentication tokens, communicates with the Google Calendar API, and has a publicly accessible endpoint to receive webhooks from Google.
3.  **Google Cloud Platform:** Used to configure the Google Calendar API and manage the credentials.

---

### Step-by-Step Implementation Flow

#### Step 1: Backend Setup - Subscribing to Changes (Webhooks)

When a meeting is first created in Syncly and synced to Google Calendar, the backend server must tell Google to notify it of any future changes to that user's calendar.

1.  **Use `events.watch`:** The backend calls the Google Calendar API's `events.watch` endpoint.
2.  **Provide a Webhook URL:** This call includes a secure, public HTTPS endpoint on your server (e.g., `https://api.yourapp.com/google/calendar-webhook`).
3.  **Set an Expiration:** Subscriptions expire, so the backend needs a mechanism (like a daily job) to renew them.
4.  **Store Channel Information:** Google returns a `channelId` and `resourceId` for the subscription. Your backend should store this information to manage the subscription later.

#### Step 2: Handling the Webhook Notification

When a user modifies a synced event in their Google Calendar (e.g., reschedules, renames, or deletes it), Google does **not** send the full event data. Instead, it sends a small, fast notification to your webhook URL.

1.  **Receive the Notification:** Your server's webhook endpoint receives a `POST` request from Google. The headers of this request contain metadata like `X-Goog-Channel-ID` and `X-Goog-Resource-State` (e.g., `sync`, `exists`, `not_exists`).
2.  **Acknowledge Immediately:** The server must respond with a `200 OK` status code immediately to acknowledge receipt. If it doesn't, Google will retry, which can lead to duplicate processing.

#### Step 3: Fetching and Parsing the Updated Event

The actual data processing should happen *after* the webhook has been acknowledged.

1.  **Queue a Job:** The webhook handler should ideally place a job into a queue (e.g., using Redis, RabbitMQ) to be processed by a separate worker. This makes the system resilient.
2.  **Fetch Full Event List:** The worker uses the user's stored credentials to call the Google Calendar API's `events.list` endpoint with a `syncToken`. This is more efficient than fetching individual events and gets all changes since the last sync.
3.  **Parse the Structured Description:** For each changed event, the server inspects the event's `description` field. It looks for the special markers you implemented:
    *   `---SYNC-NOTES---` and `---END-SYNC-NOTES---`
    *   `---SYNC-TASKS---` and `---END-SYNC-TASKS---`

#### Step 4: Updating the Syncly Database

Based on the parsed information, the backend updates the Syncly database.

1.  **Update Core Details:** It checks if the event's `summary` (title), `start.dateTime` (time), or `attendees` have changed and updates the corresponding fields in the Syncly meeting record.
2.  **Update Notes/Agenda:** It extracts the text *only* from between the `---SYNC-NOTES---` markers and updates the `agenda` field in the Syncly meeting. This prevents any user-added notes outside the structured block in Google Calendar from being overwritten.
3.  **(Future) Update Tasks:** The content between `---SYNC-TASKS---` could be parsed to update task statuses or details.
4.  **Handle Deletion:** If an event is marked as `cancelled` or a `syncToken` reveals it was deleted, the backend can update the meeting's status in Syncly accordingly.

#### Step 5: Conflict Resolution & User Notification

It's possible for a meeting to be edited in both Syncly and Google Calendar at nearly the same time.

*   **Strategy:** A common strategy is "last write wins." The backend compares the `updated` timestamp from the Google Calendar event with the `updatedAt` timestamp in the Syncly database and keeps the newest version.
*   **Notify the User:** Regardless of the strategy, it's crucial to send an in-app notification to the user (e.g., "The 'Weekly Sync' was rescheduled to 11:00 AM from Google Calendar") to avoid confusion.

### Security Considerations

*   **Webhook Validation:** Your webhook endpoint must validate that incoming requests are genuinely from Google using the `X-Goog-Channel-Token` or other verification methods.
*   **Secure Token Storage:** User OAuth 2.0 refresh tokens must be encrypted and stored securely in your backend database. They are highly sensitive credentials.