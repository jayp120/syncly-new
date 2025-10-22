import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as ReactRouterDom from 'react-router-dom';
const { useParams, useNavigate, useSearchParams } = ReactRouterDom;
import { useAuth } from '../Auth/AuthContext';
import { safeText } from '../../utils/safeText';
import {
  Meeting,
  User,
  Task,
  TaskStatus,
  MeetingInstance,
} from '../../types';
import * as DataService from '../../services/dataService';
import PageContainer from '../Layout/PageContainer';
import Spinner from '../Common/Spinner';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { formatDateTimeDDMonYYYYHHMM, getLocalYYYYMMDD, getNextOccurrence, formatDateDDMonYYYY } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import UserAvatar from '../Common/UserAvatar';
import MeetingTaskList from './MeetingTaskList';
import TaskDetailModal from '../Tasks/TaskDetailModal';
import Modal from '../Common/Modal';
import TaskForm from '../Tasks/TaskForm';
import { parseLiveMemoText, PendingTask } from '../../utils/commandParser';
import PendingTaskCard from '../Manager/PendingTaskCard';
import { renderMentions } from '../../utils/mentionUtils';
import eventBus from '../../services/eventBus';
import { MEETINGS_KEY, TASKS_KEY } from '../../constants';
import MeetingRecall from '../Meetings/MeetingRecall';
import Alert from '../Common/Alert';
import FinalizeSessionModal from './FinalizeSessionModal';
import MentionTextarea from '../Common/MentionTextarea';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';

// --- Main Page ---
const MeetingWorkspacePage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [searchParams] = useSearchParams();
  const viewingDateStr = searchParams.get('date');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isSignedIn, signIn } = useGoogleCalendar();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Live session state
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [liveNotes, setLiveNotes] = useState('');
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  
  // Missed meeting / Catch-up state
  const [mostRecentMissedDate, setMostRecentMissedDate] = useState<string | null>(null);
  const [isCatchUpMode, setIsCatchUpMode] = useState(false);
  const [catchUpNotes, setCatchUpNotes] = useState('');

  const [previousSessionData, setPreviousSessionData] = useState<{instance: MeetingInstance, tasks: Task[]} | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'finalize' | 'catch-up', data: any } | null>(null);

  // Modals and selections
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [meetingInstances, setMeetingInstances] = useState<MeetingInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  const selectedInstance = useMemo(() => {
    return meetingInstances.find(inst => inst.id === selectedInstanceId) || null;
  }, [meetingInstances, selectedInstanceId]);

  const markedAsSeen = useRef(false);
  
  const attendees = useMemo(() => {
    if (!meeting) return [];
    return allUsers.filter((u) => (meeting.attendeeIds || []).includes(u.id));
  }, [meeting, allUsers]);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!meetingId || !currentUser) { navigate('/'); return; }
    try {
      const [fetchedMeeting, fetchedUsers, allTasks, fetchedInstances] = await Promise.all([
        DataService.getMeetingById(meetingId), 
        DataService.getUsers(), 
        DataService.getTasks(),
        DataService.getMeetingInstancesForSeries(meetingId)
      ]);
      if (!fetchedMeeting || !Array.isArray(fetchedMeeting.attendeeIds) || (!fetchedMeeting.attendeeIds.includes(currentUser.id) && fetchedMeeting.createdBy !== currentUser.id)) {
        addToast("You don't have access to this meeting.", 'error'); navigate('/dashboard'); return;
      }
      if (!markedAsSeen.current) { await DataService.markMeetingAsSeen(meetingId, currentUser.id); markedAsSeen.current = true; }
      
      setMeeting(fetchedMeeting); 
      setAllUsers(fetchedUsers);
      setMeetingInstances(fetchedInstances);
      
      const instanceToSelect = viewingDateStr 
        ? fetchedInstances.find(inst => inst.occurrenceDate === viewingDateStr)
        : (fetchedInstances.length > 0 ? fetchedInstances[0] : null);

      setSelectedInstanceId(instanceToSelect ? instanceToSelect.id : null);
      setActionItems(allTasks.filter(task => (instanceToSelect?.taskIds || []).includes(task.id)));

    } catch (error) { console.error('Error fetching meeting data:', error); addToast('Failed to load meeting workspace.', 'error'); navigate('/dashboard'); }
  }, [meetingId, currentUser, navigate, addToast, viewingDateStr]);

  // Effect to detect missed meetings
  useEffect(() => {
    if (meeting?.recurrenceRule && meeting.recurrenceRule !== 'none' && !isLiveSession) {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let foundMissedDate: string | null = null;
        let checkDate = new Date(meeting.meetingDateTime);
        
        while (checkDate < today) {
            const dateStr = getLocalYYYYMMDD(checkDate);
            const instanceExists = meetingInstances.some(inst => inst.occurrenceDate === dateStr);
            const isCancelled = meeting.cancelledOccurrences?.includes(dateStr);
            
            if (!instanceExists && !isCancelled) {
                foundMissedDate = dateStr; // Keep updating to find the most recent
            }
            
            switch (meeting.recurrenceRule) {
                case 'daily': checkDate.setDate(checkDate.getDate() + 1); break;
                case 'weekly': checkDate.setDate(checkDate.getDate() + 7); break;
                case 'monthly': checkDate.setMonth(checkDate.getMonth() + 1); break;
            }
        }
        setMostRecentMissedDate(foundMissedDate);
    } else {
        setMostRecentMissedDate(null);
    }
  }, [meeting, meetingInstances, isLiveSession]);

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => { setIsLoading(true); await fetchData(true); if (isMounted) setIsLoading(false); };
    loadInitialData();
    const handleDataChange = (data?: any) => { if (isMounted && data && (data.keyChanged === MEETINGS_KEY || data.keyChanged === TASKS_KEY)) { fetchData(false); } };
    const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
    return () => { isMounted = false; unsubscribe(); };
  }, [fetchData]);

  const parsedLiveTasks = useMemo(() => parseLiveMemoText(liveNotes, attendees, meeting?.attendeeIds), [liveNotes, attendees, meeting]);
  const parsedCatchUpTasks = useMemo(() => parseLiveMemoText(catchUpNotes, attendees, meeting?.attendeeIds), [catchUpNotes, attendees, meeting]);

  const handleStartLiveSession = async () => {
    if (meeting) {
      setLiveNotes(meeting.agenda || `Meeting Notes for ${meeting.title}\n\n`);
      if (meeting.recurrenceRule && meeting.recurrenceRule !== 'none') {
        const recallData = await DataService.getPreviousMeetingInSeries(meeting, new Date());
        setPreviousSessionData(recallData);
      } else { setPreviousSessionData(null); }
    }
    setIsLiveSession(true);
  };
  
  const executeFinalization = useCallback(async (tasks: PendingTask[], notes: string, date: string, isAsync: boolean) => {
    if (!currentUser || !meeting) return;
    setIsLoading(true);
    setIsFinalizeModalOpen(false);
    setIsLiveSession(false);
    setIsCatchUpMode(false);
    try {
        const result = await DataService.finalizeMeetingInstance(meeting.id, date, notes, tasks, currentUser, isAsync);
        if (result.calendarSynced) {
            addToast('Session finalized and synced to your calendar!', 'success');
        } else if (result.error) {
            addToast(`Session finalized, but calendar sync failed: ${result.error}`, 'warning', 6000);
        } else {
            addToast('Session finalized successfully!', 'success');
        }
    } catch (err: any) {
        console.error("Error in finalization:", err);
        addToast(`An error occurred during finalization: ${err.message}`, 'error');
    } finally {
        setIsLoading(false);
        await fetchData(true);
    }
  }, [currentUser, meeting, addToast, fetchData]);

  useEffect(() => {
      // This effect resumes the finalization process after a successful Google Sign-In.
      if (isSignedIn && pendingAction) {
          addToast("Google Sign-In successful. Resuming action...", "success");
          const { type, data } = pendingAction;
          executeFinalization(data.tasks, data.notes, data.date, data.isAsync);
          setPendingAction(null);
      }
  }, [isSignedIn, pendingAction, executeFinalization, addToast]);
  
  const handleFinalize = async (finalTasks: PendingTask[]) => {
    if (!currentUser || !meeting) return;
    
    const finalizationData = {
        tasks: finalTasks,
        notes: liveNotes,
        date: getLocalYYYYMMDD(new Date()),
        isAsync: false,
    };

    // "Just-in-Time" Authentication Check:
    // If calendar sync is enabled for this meeting but the user isn't signed in,
    // we store the intended action and trigger the sign-in flow.
    if (meeting.googleEventId && !isSignedIn) {
        addToast("Please sign in with Google to continue.", "info");
        setPendingAction({ type: 'finalize', data: finalizationData });
        setIsFinalizeModalOpen(false);
        signIn(); // This will trigger a user-initiated popup, which browsers allow.
        return;
    }
    await executeFinalization(finalizationData.tasks, finalizationData.notes, finalizationData.date, finalizationData.isAsync);
  };
  
  const handleStartCatchUp = async () => {
    if (meeting && mostRecentMissedDate) {
      const recallData = await DataService.getPreviousMeetingInSeries(meeting, new Date(mostRecentMissedDate + 'T23:59:59'));
      setPreviousSessionData(recallData);
      setCatchUpNotes('');
      setIsCatchUpMode(true);
    }
  };

  const handlePostCatchUp = async () => {
    if (!currentUser || !meeting || !mostRecentMissedDate || !catchUpNotes.trim()) return;
    
    const catchUpData = {
        tasks: parsedCatchUpTasks,
        notes: catchUpNotes,
        date: mostRecentMissedDate,
        isAsync: true,
    };

    // "Just-in-Time" Authentication Check for asynchronous updates.
    if (meeting.googleEventId && !isSignedIn) {
        addToast("Please sign in with Google to continue.", "info");
        setPendingAction({ type: 'catch-up', data: catchUpData });
        signIn();
        return;
    }
    await executeFinalization(catchUpData.tasks, catchUpData.notes, catchUpData.date, catchUpData.isAsync);
  }

  if (isLoading || !meeting || !currentUser) return <PageContainer><Spinner message="Loading Meeting Workspace..." /></PageContainer>;

  const isManager = currentUser.id === meeting.createdBy;
  const isRecurring = meeting.recurrenceRule && meeting.recurrenceRule !== 'none';
  const nextOccurrenceDate = getNextOccurrence(meeting);

  const renderCatchUpUI = () => {
      if (!mostRecentMissedDate || isLiveSession) return null;
      if (isCatchUpMode) {
          return (
              <Card title={`Post Asynchronous Update for ${formatDateDDMonYYYY(mostRecentMissedDate)}`} className="mb-6 bg-amber-50 dark:bg-amber-900/40">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      <div className="lg:col-span-3 space-y-3">
                          <MentionTextarea
                              placeholder="Enter notes and tasks from your catch-up meeting..."
                              value={catchUpNotes}
                              onChange={setCatchUpNotes}
                              rows={6}
                              availableUsers={attendees}
                          />
                          {parsedCatchUpTasks.length > 0 && (
                              <div className="mt-2">
                                  <h4 className="text-sm font-semibold">Detected Tasks:</h4>
                                  <div className="space-y-1 mt-1 max-h-40 overflow-y-auto">
                                      {parsedCatchUpTasks.map((task, i) => <PendingTaskCard key={i} task={task} attendees={attendees}/>)}
                                  </div>
                              </div>
                          )}
                          <div className="flex justify-end gap-2 mt-3">
                              <Button variant="ghost" size="sm" onClick={() => setIsCatchUpMode(false)}>Cancel</Button>
                              <Button variant="primary" size="sm" onClick={handlePostCatchUp} isLoading={isLoading} disabled={!catchUpNotes.trim()}>Post Catch-up Update</Button>
                          </div>
                      </div>
                      <div className="lg:col-span-2">
                           <MeetingRecall previousSessionData={previousSessionData} onCopyNote={(text) => setCatchUpNotes(prev => `${prev}\n\n${text}`)} onCopyTask={(command) => setCatchUpNotes(prev => `${prev}\n${command}`)} allUsers={allUsers}/>
                      </div>
                  </div>
              </Card>
          )
      }
      return (
          <Alert type="info" className="mb-6">
              <div className="flex justify-between items-center">
                  <div>
                      <p className="font-semibold">Missed a session?</p>
                      <p>It looks like you missed the session for {formatDateDDMonYYYY(mostRecentMissedDate)}.</p>
                  </div>
                  <Button onClick={handleStartCatchUp}>Post Asynchronous Update</Button>
              </div>
          </Alert>
      )
  }

  return (
    <PageContainer>
      {isLiveSession && isManager ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
                <Card title="Live Notes & Task Creation" className="h-full flex flex-col">
                    <MentionTextarea 
                        value={liveNotes}
                        onChange={setLiveNotes}
                        placeholder="Type notes... Use / to create tasks."
                        className="flex-grow !border-0 !p-0 focus:!ring-0"
                        wrapperClassName="flex-grow"
                        availableUsers={attendees}
                    />
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card title="Action Items Preview" className="h-full flex flex-col">
                    <div className="space-y-2 flex-grow overflow-y-auto p-1">
                        {parsedLiveTasks.length > 0 ? parsedLiveTasks.map((task, index) => <PendingTaskCard key={index} task={task} attendees={attendees} />) : <p className="text-sm italic text-slate-500 text-center pt-8">No tasks detected.</p>}
                    </div>
                 </Card>
            </div>
             <div className="lg:col-span-1 space-y-4">
                <MeetingRecall previousSessionData={previousSessionData} onCopyNote={(text) => setLiveNotes(prev => `${prev}\n\n${text}`)} onCopyTask={(command) => setLiveNotes(prev => `${prev}\n${command}`)} allUsers={allUsers}/>
                <div className="flex-shrink-0 flex flex-col gap-2 mt-4">
                    <Button variant="primary" onClick={() => setIsFinalizeModalOpen(true)}>Finalize Session</Button>
                    <Button variant="ghost" onClick={() => setIsLiveSession(false)}>Cancel Session</Button>
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-darktext dark:text-slate-200">{safeText(meeting.title)}</h2>
                <p className="text-slate-500 dark:text-slate-400">Series started: {formatDateTimeDDMonYYYYHHMM(meeting.meetingDateTime)}</p>
                 {isRecurring && nextOccurrenceDate && !meeting.recurrenceEndDate && <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mt-1">Next: {formatDateTimeDDMonYYYYHHMM(nextOccurrenceDate)}</p>}
                 {meeting.recurrenceEndDate && <p className="text-sm text-red-500 font-semibold mt-1">Series Ended on: {formatDateDDMonYYYY(meeting.recurrenceEndDate)}</p>}
              </div>
              {isManager && isRecurring && !meeting.recurrenceEndDate && (<Button onClick={handleStartLiveSession} variant="secondary" icon={<i className="fas fa-bolt" />}>Start Live Session</Button>)}
            </div>
          </Card>
          {renderCatchUpUI()}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card title={`Action Items (${actionItems.length})`} titleIcon={<i className="fas fa-tasks text-teal-500" />}>
                <MeetingTaskList tasks={actionItems} allUsers={allUsers} currentUser={currentUser} onViewTask={setTaskToView} onUpdateMemberStatus={async (taskId, status) => { await DataService.updateTaskMemberStatus(taskId, currentUser.id, status, currentUser); fetchData(); }} onUpdateTask={async (taskId, fields) => { await DataService.updateTask(taskId, fields, currentUser); fetchData(); }} />
              </Card>
              <Card title={selectedInstance ? `Minutes for ${formatDateDDMonYYYY(selectedInstance.occurrenceDate)}` : 'Agenda'}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {selectedInstance ? (renderMentions(safeText(selectedInstance.meetingMinutes), allUsers) || <p className="italic">No minutes.</p>) : (renderMentions(safeText(meeting.agenda || ''), allUsers) || <p className="italic">No agenda.</p>)}
                </div>
              </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
              {isRecurring && (
                <Card title="Session History">
                    {meetingInstances.length === 0 ? (<p className="text-center text-sm text-slate-500 py-4 italic">No sessions finalized.</p>) : (
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {meetingInstances.map(instance => (
                                <li key={instance.id}>
                                    <button onClick={() => setSelectedInstanceId(instance.id)} className={`w-full text-left p-3 rounded-md transition-colors ${selectedInstanceId === instance.id ? 'bg-primary text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary-light dark:hover:bg-slate-700'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{formatDateDDMonYYYY(instance.occurrenceDate)}</span>
                                            {instance.isAsynchronous && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Catch-up</span>}
                                        </div>
                                        <span className="text-xs block opacity-80">{instance.taskIds.length} action items</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
              )}
              <Card title={`Attendees (${attendees.length})`} titleIcon={<i className="fas fa-users text-purple-500" />}>
                <div className="space-y-3">
                  {attendees.map((user) => (
                    <div key={user.id} className="flex items-center">
                      <UserAvatar name={safeText(user.name)} size="md" className="mr-3" />
                      <div>
                        <p className="font-semibold text-sm text-darktext dark:text-slate-200">{safeText(user.name)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{safeText(user.designation)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
      {isFinalizeModalOpen && (<FinalizeSessionModal isOpen={isFinalizeModalOpen} onClose={() => setIsFinalizeModalOpen(false)} onConfirm={handleFinalize} initialTasks={parsedLiveTasks} meetingTitle={meeting.title} attendees={attendees}/>)}
      <TaskDetailModal isOpen={!!taskToView} onClose={() => setTaskToView(null)} task={taskToView} onUpdateTask={async (taskId, fields) => { await DataService.updateTask(taskId, fields, currentUser); fetchData(); }} currentUser={currentUser} onEditTask={(task) => { setTaskToView(null); setTaskToEdit(task); }}/>
      <Modal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} title="Edit Task"><TaskForm taskToEdit={taskToEdit} currentUser={currentUser} onSave={async () => { await fetchData(); setTaskToEdit(null); }} onCancel={() => setTaskToEdit(null)}/></Modal>
    </PageContainer>
  );
};

export default MeetingWorkspacePage;