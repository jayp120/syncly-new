import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as calendarService from '../services/calendarService';

// Declare global variables for Google API scripts to fix TypeScript errors.
declare const gapi: any;
declare const google: any;

// Define a type for the Google user profile to be stored
interface GoogleUserProfile {
  name: string;
  email: string;
  picture?: string;
}

interface GoogleCalendarContextType {
  isSignedIn: boolean;
  isGapiReady: boolean;
  googleUser: GoogleUserProfile | null;
  signIn: () => void;
  signOut: () => void;
  createEvent: (event: Record<string, any>) => Promise<any>;
  initializationError: string | null;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export const GoogleCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds

    const initializeClients = async () => {
      if (!isMounted) return;
      try {
        await calendarService.initGapiClient();
        await calendarService.initGisClient();
        if (isMounted) {
          setIsGapiReady(true);
          console.log('[GoogleCalendarContext] Initialization complete.');
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('[GoogleCalendarContext] Initialization failed:', error);
          setInitializationError(
            'Could not connect to Google services. Please check your internet connection and disable any ad-blockers or browser extensions that might interfere with scripts from google.com. Refresh the page to try again.'
          );
        }
      }
    };

    const checkScriptsAndInit = () => {
      if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
        initializeClients();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkScriptsAndInit, 500);
      } else if (isMounted) {
        setInitializationError('Google scripts failed to load. Please check your network connection.');
      }
    };
    
    checkScriptsAndInit();

    calendarService.setStatusUpdateCallback(async (signedIn) => {
      if (!isMounted) return;
      setIsSignedIn(signedIn);
      if (signedIn) {
        try {
          const profile = await calendarService.getUserProfile();
          if (profile && profile.result) {
            setGoogleUser({
              name: profile.result.name,
              email: profile.result.email,
              picture: profile.result.picture,
            });
          }
        } catch (error) {
          console.error("[GoogleCalendarContext] Failed to fetch Google user profile:", error);
          setGoogleUser(null);
        }
      } else {
        setGoogleUser(null);
      }
    });

    return () => { isMounted = false; };
  }, []);

  return (
    <GoogleCalendarContext.Provider value={{
      isSignedIn,
      isGapiReady,
      googleUser,
      signIn: calendarService.signIn,
      signOut: calendarService.signOut,
      createEvent: calendarService.createEvent,
      initializationError
    }}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};

export const useGoogleCalendar = (): GoogleCalendarContextType => {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};