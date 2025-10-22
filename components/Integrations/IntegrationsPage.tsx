import React from 'react';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import UserAvatar from '../Common/UserAvatar';
import Alert from '../Common/Alert';

const IntegrationsPage: React.FC = () => {
  const { isSignedIn, isGapiReady, signIn, signOut, googleUser, initializationError } = useGoogleCalendar();

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
        {renderPlaceholderCard('Slack', 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png', 'Get task notifications and reminders in Slack.')}
        {renderPlaceholderCard('Jira', 'https://cdn.worldvectorlogo.com/logos/jira-1.svg', 'Sync tasks and issues between Syncly and Jira.')}
      </div>
    </PageContainer>
  );
};

export default IntegrationsPage;
