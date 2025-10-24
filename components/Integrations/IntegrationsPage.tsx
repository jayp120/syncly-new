import React, { useState, useEffect } from 'react';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import UserAvatar from '../Common/UserAvatar';
import Alert from '../Common/Alert';
import { useAuth } from '../Auth/AuthContext';
import { callGenerateTelegramLinkingCode } from '../../services/cloudFunctions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const IntegrationsPage: React.FC = () => {
  const { isSignedIn, isGapiReady, signIn, signOut, googleUser, initializationError } = useGoogleCalendar();
  const { user } = useAuth();
  
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const checkTelegramStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.telegramChatId) {
          setTelegramLinked(true);
          setTelegramUsername(userData.telegramUsername || null);
        }
      } catch (error) {
        console.error('Error checking Telegram status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };
    
    checkTelegramStatus();
  }, [user]);

  const connectTelegram = async () => {
    setIsLinking(true);
    setTelegramError(null);
    
    try {
      const result = await callGenerateTelegramLinkingCode();
      
      window.open(result.deepLink, '_blank');
      
      setTelegramError('Opening Telegram... Follow the instructions in the bot to complete linking.');
    } catch (error: any) {
      console.error('Error generating linking code:', error);
      setTelegramError(error.message || 'Failed to generate linking code. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkTelegram = async () => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to disconnect Telegram? You will no longer receive notifications via Telegram.')) {
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        telegramChatId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramLastName: null
      });
      
      setTelegramLinked(false);
      setTelegramUsername(null);
      setTelegramError('Telegram disconnected successfully. You can reconnect anytime.');
    } catch (error: any) {
      console.error('Error unlinking Telegram:', error);
      setTelegramError('Failed to disconnect Telegram. Please try again.');
    }
  };

  const renderGoogleCalendarCard = () => (
    <Card className="flex flex-col">
      <div className="flex items-center mb-4">
        <img src="https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png" alt="Google Calendar" className="w-12 h-12 mr-4" />
        <div>
          <h3 className="text-xl font-semibold text-darktext dark:text-slate-200">Google Calendar</h3>
          <p className="text-sm text-mediumtext dark:text-slate-400">Sync your formal meetings directly to your calendar.</p>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center py-4 min-h-[100px]">
        {initializationError ? (
            <Alert type="error" message={initializationError} />
        ) : !isGapiReady ? (
          <Spinner message="Initializing..." />
        ) : isSignedIn ? (
          <div className="text-center">
            {googleUser ? (
              <>
                <UserAvatar name={googleUser.name} size="lg" className="mx-auto mb-2" />
                <p className="font-semibold text-darktext dark:text-slate-200">{googleUser.name}</p>
                <p className="text-sm text-mediumtext dark:text-slate-400">{googleUser.email}</p>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <i className="fas fa-check-circle mr-1.5"></i> Connected
                </span>
              </>
            ) : (
              // Fallback in case profile fetch fails but user is signed in
              <>
                <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <i className="fas fa-check-circle mr-1.5"></i> Connected
                </span>
                <p className="text-xs text-mediumtext dark:text-slate-400 mt-2">Syncly has permission to create calendar events.</p>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-mediumtext dark:text-slate-400">Connect your Google account to enable calendar sync for new meetings.</p>
        )}
      </div>
      <div className="mt-auto pt-4 border-t border-border-primary dark:border-dark-border">
        {isGapiReady && !initializationError && (
          isSignedIn ? (
            <Button variant="danger" onClick={signOut} className="w-full">Disconnect Google Calendar</Button>
          ) : (
            <Button variant="primary" onClick={signIn} className="w-full">Connect Google Calendar</Button>
          )
        )}
      </div>
    </Card>
  );

  const renderTelegramCard = () => (
    <Card className="flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 mr-4 flex items-center justify-center bg-blue-500 rounded-lg text-white text-2xl">
          <i className="fab fa-telegram-plane"></i>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-darktext dark:text-slate-200">Telegram</h3>
          <p className="text-sm text-mediumtext dark:text-slate-400">Get notifications and manage tasks via Telegram bot.</p>
        </div>
      </div>
      
      {telegramError && (
        <Alert 
          type={telegramError.includes('success') ? 'success' : 'info'} 
          message={telegramError} 
          className="mb-4"
        />
      )}
      
      <div className="flex-grow flex items-center justify-center py-4 min-h-[100px]">
        {checkingStatus ? (
          <Spinner message="Checking status..." />
        ) : telegramLinked ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 text-3xl">
              <i className="fab fa-telegram-plane"></i>
            </div>
            {telegramUsername && (
              <p className="font-semibold text-darktext dark:text-slate-200">@{telegramUsername}</p>
            )}
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              <i className="fas fa-check-circle mr-1.5"></i> Connected
            </span>
          </div>
        ) : (
          <div className="text-center px-4">
            <p className="text-sm text-mediumtext dark:text-slate-400 mb-3">
              Connect your Telegram account to receive:
            </p>
            <ul className="text-xs text-mediumtext dark:text-slate-400 space-y-1 text-left max-w-xs mx-auto">
              <li>• Real-time task notifications</li>
              <li>• Daily EOD reminders</li>
              <li>• Meeting alerts</li>
              <li>• Streak milestones</li>
            </ul>
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-4 border-t border-border-primary dark:border-dark-border">
        {telegramLinked ? (
          <Button variant="danger" onClick={unlinkTelegram} className="w-full">
            Disconnect Telegram
          </Button>
        ) : (
          <Button 
            variant="primary" 
            onClick={connectTelegram} 
            disabled={isLinking}
            className="w-full"
          >
            {isLinking ? 'Opening...' : 'Connect Telegram'}
          </Button>
        )}
      </div>
    </Card>
  );

  const renderPlaceholderCard = (appName: string, iconUrl: string, description: string) => (
    <Card className="flex flex-col opacity-50">
      <div className="flex items-center mb-4">
        <img src={iconUrl} alt={appName} className="w-12 h-12 mr-4" />
        <div>
          <h3 className="text-xl font-semibold text-darktext dark:text-slate-200">{appName}</h3>
          <p className="text-sm text-mediumtext dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="flex-grow flex items-center justify-center">
        <span className="text-sm font-semibold text-mediumtext dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
          Coming Soon
        </span>
      </div>
      <div className="mt-auto pt-4 border-t border-border-primary dark:border-dark-border">
        <Button variant="ghost" disabled className="w-full">Connect</Button>
      </div>
    </Card>
  );

  return (
    <PageContainer title="Syncly Integrations">
      <p className="mb-6 text-mediumtext dark:text-slate-400">
        Connect your favorite tools to Syncly to streamline your workflow.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderGoogleCalendarCard()}
        {renderTelegramCard()}
        {renderPlaceholderCard('Slack', 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png', 'Get task notifications and reminders in Slack.')}
        {renderPlaceholderCard('Jira', 'https://cdn.worldvectorlogo.com/logos/jira-1.svg', 'Sync tasks and issues between Syncly and Jira.')}
      </div>
    </PageContainer>
  );
};

export default IntegrationsPage;
