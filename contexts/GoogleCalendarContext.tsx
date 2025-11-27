import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import * as calendarService from '../services/calendarService';
import { db } from '../services/firebase';
import { useAuth } from '../components/Auth/AuthContext';
import { useToast } from './ToastContext';

declare const google: any;

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

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export const GoogleCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const codeClientRef = useRef<any>(null);
  const isLinkingRef = useRef(false);

  useEffect(() => {
    if (!currentUser?.id) {
      setIsSignedIn(false);
      setGoogleUser(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'userIntegrations', currentUser.id),
      (snapshot) => {
        const integration = snapshot.data()?.googleCalendar;
        const connected = integration?.status === 'connected';
        setIsSignedIn(connected);
        if (connected) {
          setGoogleUser({
            name: integration?.name || integration?.email || 'Google User',
            email: integration?.email || 'unknown@email.com',
            picture: integration?.picture || undefined
          });
          setInitializationError(null);
        } else {
          setGoogleUser(null);
        }
      },
      (error) => {
        console.error('[GoogleCalendarContext] Failed to read integration status:', error);
        setInitializationError('Unable to check Google Calendar status. Please refresh.');
        setIsSignedIn(false);
        setGoogleUser(null);
      }
    );

    return () => unsub();
  }, [currentUser?.id]);

  const initializeCodeClient = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setInitializationError('Missing Google OAuth Client ID. Set VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;

    const attemptInit = () => {
      if (typeof window === 'undefined') return;
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        codeClientRef.current = google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: SCOPES,
          ux_mode: 'popup',
          redirect_uri: 'postmessage',
          callback: async (response: any) => {
            isLinkingRef.current = false;
            if (response.error) {
              console.warn('[GoogleCalendarContext] OAuth error:', response);
              setInitializationError('Google authorization was cancelled.');
              return;
            }
            if (!response.code) {
              setInitializationError('Google did not return an authorization code.');
              return;
            }
            try {
              const result = await calendarService.exchangeAuthCode(response.code);
              addToast('Google Calendar connected!', 'success');
              setInitializationError(null);
              setIsSignedIn(true);
              if (result?.profile) {
                setGoogleUser({
                  name: result.profile.name || result.profile.email || 'Google User',
                  email: result.profile.email || 'unknown@email.com',
                  picture: result.profile.picture
                });
              }
            } catch (error: any) {
              console.error('[GoogleCalendarContext] Exchange failed:', error);
              const message =
                error?.message ||
                error?.details ||
                'Failed to connect Google Calendar. Please try again.';
              setInitializationError(message);
              addToast(message, 'error');
            }
          }
        });
        setIsGapiReady(true);
        setInitializationError(null);
      } else if (attempts < maxAttempts) {
        attempts += 1;
        setTimeout(attemptInit, 500);
      } else {
        setInitializationError('Google scripts failed to load. Please refresh the page.');
      }
    };

    attemptInit();
  }, [addToast]);

  useEffect(() => {
    initializeCodeClient();
  }, [initializeCodeClient]);

  const signIn = useCallback(() => {
    if (!currentUser?.id) {
      setInitializationError('Please sign in to Syncly before connecting Google Calendar.');
      return;
    }
    if (!codeClientRef.current) {
      setInitializationError('Google authentication is not ready. Please refresh and try again.');
      return;
    }
    if (isLinkingRef.current) {
      return;
    }
    isLinkingRef.current = true;
    try {
      codeClientRef.current.requestCode();
      window.setTimeout(() => {
        isLinkingRef.current = false;
      }, 5000);
    } catch (error) {
      console.error('[GoogleCalendarContext] Failed to open Google auth:', error);
      isLinkingRef.current = false;
      setInitializationError('Browser blocked the Google sign-in popup. Please try again.');
    }
  }, [currentUser?.id]);

  const signOut = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      await calendarService.unlinkGoogleCalendar();
      addToast('Google Calendar disconnected.', 'info');
    } catch (error: any) {
      console.error('[GoogleCalendarContext] Failed to disconnect:', error);
      const message =
        error?.message ||
        error?.details ||
        'Failed to disconnect Google Calendar. Please try again.';
      setInitializationError(message);
      addToast(message, 'error');
    }
  }, [addToast, currentUser?.id]);

  return (
    <GoogleCalendarContext.Provider
      value={{
        isSignedIn,
        isGapiReady,
        googleUser,
        signIn,
        signOut,
        createEvent: calendarService.createEvent,
        initializationError
      }}
    >
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
