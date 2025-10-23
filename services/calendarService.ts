// services/calendarService.ts
// Updated to use the new Google Identity Services (GIS) for OAuth2 flow.
// This replaces the deprecated gapi.auth2 library.

declare const gapi: any;
declare const google: any;

// ========================================================================
// Google Cloud CLIENT_ID loaded from environment variables
// Set VITE_GOOGLE_CLIENT_ID in your .env file or Replit Secrets
// See the guide in /docs/google-calendar-guide.md for instructions.
// ========================================================================
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
// ========================================================================

const SCOPES = "https://www.googleapis.com/auth/calendar.events";

let tokenClient: any = null;

// Callback to update React state for sign-in status
let updateStatusCallback: ((isSignedIn: boolean) => void) | null = null;

/**
 * Sets the callback function that will be invoked when the sign-in status changes.
 */
export const setStatusUpdateCallback = (
  callback: (isSignedIn: boolean) => void,
) => {
  updateStatusCallback = callback;
};

/**
 * Checks if the user is currently signed in and has a valid token.
 */
export const isSignedIn = () => {
  const token = gapi.client.getToken();
  // Check for the token object and the actual access_token property.
  return token !== null && token.access_token;
};

/**
 * Initializes the GAPI client for Google Calendar API calls.
 */
export const initGapiClient = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof gapi === "undefined") {
      return reject(new Error("GAPI script not loaded."));
    }
    gapi.load("client", () => {
      gapi.client
        .init({})
        .then(() => {
          gapi.client.load("calendar", "v3", () => {
            console.log(
              "[CalendarService] GAPI client and Calendar API loaded.",
            );
            resolve();
          });
        })
        .catch((err: any) => {
          console.error("Error initializing GAPI client:", err);
          reject(err);
        });
    });
  });
};

/**
 * Initializes the Google Identity Services (GIS) token client.
 */
export const initGisClient = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof google === "undefined") {
      return reject(new Error("GIS script not loaded."));
    }
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            gapi.client.setToken(tokenResponse);
            console.log("[CalendarService] Access Token received and set.");
            if (updateStatusCallback) updateStatusCallback(true);
          } else {
            console.error("Token response error:", tokenResponse);
            if (updateStatusCallback) updateStatusCallback(false);
          }
        },
        error_callback: (error: any) => {
          // This callback handles the "Failed to open popup window" error during silent sign-in attempts.
          // When it fails, we correctly update the app state to "not signed in".
          console.warn("GIS Auth Error:", error);
          if (updateStatusCallback) updateStatusCallback(false);
        },
      });
      console.log("[CalendarService] GIS Token Client initialized.");
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Prompts the user to sign in and grant access. This is triggered by a user action (e.g., a button click),
 * so browsers will allow the popup to open.
 */
export const signIn = () => {
  if (!tokenClient) {
    console.error("Token Client not initialized.");
    return;
  }
  // Omitting the 'prompt' parameter lets Google handle the UX.
  // Because this function is called from a user click, the popup is allowed.
  tokenClient.requestAccessToken({});
};

/**
 * Signs the user out.
 */
export const signOut = () => {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken(null);
      console.log("[CalendarService] User signed out and token revoked.");
      if (updateStatusCallback) updateStatusCallback(false);
    });
  }
};

/**
 * Creates an event on the user's primary calendar.
 * @param event The event object to create.
 */
export const createEvent = (event: Record<string, any>) => {
  const token = gapi.client.getToken();
  if (token === null) {
    return Promise.reject("User not signed in to Google Calendar.");
  }
  return gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event,
    sendUpdates: 'all',
  });
};

/**
 * Gets the signed-in user's profile information using the userinfo endpoint.
 */
export const getUserProfile = () => {
  if (gapi.client.getToken() === null) {
    return Promise.reject("User not signed in.");
  }
  return gapi.client.request({
    path: "https://www.googleapis.com/oauth2/v3/userinfo",
  });
};

/**
 * Retrieves a single event from the user's primary calendar.
 */
export const getEvent = (eventId: string) => {
  return gapi.client.calendar.events.get({
    calendarId: "primary",
    eventId: eventId,
  });
};

/**
 * Retrieves an instance of a recurring event.
 */
export const getInstance = (eventId: string, occurrenceDate: string) => {
  // Set time to UTC start and end of the day to ensure we catch the instance regardless of timezone.
  const timeMin = new Date(`${occurrenceDate}T00:00:00Z`).toISOString();
  const timeMax = new Date(`${occurrenceDate}T23:59:59Z`).toISOString();

  return gapi.client.calendar.events.instances({
    calendarId: "primary",
    eventId: eventId,
    timeMin: timeMin,
    timeMax: timeMax,
  });
};

/**
 * Updates an event on the user's primary calendar using a patch request.
 * @param eventId The ID of the event to update.
 * @param eventPatch An object containing the fields to update.
 */
export const updateEvent = (
  eventId: string,
  eventPatch: Record<string, any>,
) => {
  return gapi.client.calendar.events.patch({
    calendarId: "primary",
    eventId: eventId,
    resource: eventPatch,
    sendUpdates: 'all',
  });
};
