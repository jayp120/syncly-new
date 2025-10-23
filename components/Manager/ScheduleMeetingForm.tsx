import React, { useState, useMemo, useEffect } from 'react';
import { User, Attachment, UserStatus, Meeting } from '../../types';
import * as DataService from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import Button from '../Common/Button';
import Input from '../Common/Input';
import Textarea from '../Common/Textarea';
import Select from '../Common/Select';
import EmployeeMultiSelect from './EmployeeMultiSelect';
import { getLocalYYYYMMDD } from '../../utils/dateUtils';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';
import * as ReactRouterDom from "react-router-dom";
import * as calendarService from '../../services/calendarService';
const { Link } = ReactRouterDom;

interface ScheduleMeetingFormProps {
  manager: User;
  teamMembers: User[];
  onSuccess: (meeting: any) => void;
  onCancel: () => void;
  meetingToEdit?: Meeting | null;
}

const ScheduleMeetingForm: React.FC<ScheduleMeetingFormProps> = ({ manager, teamMembers, onSuccess, onCancel, meetingToEdit }) => {
  const { addToast } = useToast();
  const { isSignedIn: isGoogleSignedIn, createEvent } = useGoogleCalendar();
  
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
  const [title, setTitle] = useState('');
  const [meetingDateTime, setMeetingDateTime] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [externalGuestsText, setExternalGuestsText] = useState('');
  const [agenda, setAgenda] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'on' | 'after'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(1);
  
  const [syncWithCalendar, setSyncWithCalendar] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeError, setTimeError] = useState('');

  const isEditMode = !!meetingToEdit;

  useEffect(() => {
    if (isEditMode && meetingToEdit) {
        setTitle(meetingToEdit.title);
        const d = new Date(meetingToEdit.meetingDateTime);
        const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        setMeetingDateTime(formattedDate);
        setAttendeeIds(meetingToEdit.attendeeIds);
        setExternalGuestsText((meetingToEdit.externalGuests || []).join(', '));
        setActiveTab(meetingToEdit.externalGuests && meetingToEdit.externalGuests.length > 0 ? 'external' : 'internal');
        setAgenda(meetingToEdit.agenda || '');
        setAttachments(meetingToEdit.attachments || []);
        setRecurrenceRule(meetingToEdit.recurrenceRule || 'none');
    }
  }, [meetingToEdit, isEditMode]);


  const activeTeamMembers = useMemo(() => teamMembers.filter(tm => tm.status === UserStatus.ACTIVE), [teamMembers]);
  
  const handleDateTimeChange = (value: string) => {
    setMeetingDateTime(value);
    const selectedTime = new Date(value).getTime();
    const twoMinutesFromNow = new Date().getTime() + (2 * 60 * 1000);
    if (selectedTime < twoMinutesFromNow) {
      setTimeError('Meeting must be scheduled at least 2 minutes in the future.');
    } else {
      setTimeError('');
    }
  };

  const handleSubmit = async () => {
    const externalGuests = externalGuestsText.split(',').map(e => e.trim()).filter(e => e && e.includes('@'));
    const isExternalMeeting = activeTab === 'external';

    if (!title.trim() || !meetingDateTime) {
      addToast('Title and Date/Time are required.', 'error'); return;
    }
    if (isExternalMeeting && externalGuests.length === 0) {
        addToast('Please enter at least one valid external guest email.', 'error'); return;
    }
    if (!isExternalMeeting && attendeeIds.length === 0) {
        addToast('Please select at least one internal attendee.', 'error'); return;
    }
    if (timeError) {
      addToast(timeError, 'error'); return;
    }

    setIsSubmitting(true);
    try {
        let googleEventId: string | undefined = undefined;

        // Step 1: Create Google Calendar event if requested
        if (syncWithCalendar && isGoogleSignedIn && !isEditMode) {
            const allUsers = await DataService.getUsers();
            const finalAttendees = isExternalMeeting 
                ? externalGuests.map(email => ({ email }))
                : allUsers
                    .filter(tm => attendeeIds.includes(tm.id))
                    .map(tm => ({ email: tm.notificationEmail }));
            
            const managerUser = allUsers.find(u => u.id === manager.id);
            if (managerUser && managerUser.notificationEmail) {
                finalAttendees.push({ email: managerUser.notificationEmail });
            }

            const meetingLink = `${window.location.origin}/#/meetings/TEMP_ID`;
            const structuredDescription = `MEETING AGENDA\n-----------------------------------\n${agenda || 'No agenda provided.'}\n\n-----------------------------------\n✅ View this meeting in Syncly: ${meetingLink}`;

            const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const calendarEvent: any = {
                summary: title,
                description: structuredDescription,
                start: { dateTime: new Date(meetingDateTime).toISOString(), timeZone: userTimeZone },
                end: { dateTime: new Date(new Date(meetingDateTime).getTime() + 60 * 60 * 1000).toISOString(), timeZone: userTimeZone },
                attendees: finalAttendees,
            };

            if (recurrenceRule !== 'none') {
                let rruleString = `RRULE:FREQ=${recurrenceRule.toUpperCase()}`;
                if (recurrenceEndType === 'on' && recurrenceEndDate) {
                    const untilDate = new Date(recurrenceEndDate);
                    untilDate.setUTCHours(23, 59, 59, 999);
                    const untilStringForRrule = (untilDate.toISOString().split('.')[0] + 'Z').replace(/[-:]/g, '');
                    rruleString += `;UNTIL=${untilStringForRrule}`;
                } else if (recurrenceEndType === 'after' && recurrenceCount > 0) {
                    rruleString += `;COUNT=${recurrenceCount}`;
                }
                calendarEvent.recurrence = [rruleString];
            }

            try {
                const eventResponse = await createEvent(calendarEvent);
                googleEventId = eventResponse?.result?.id;
                if (googleEventId) {
                    addToast('Event created in Google Calendar!', 'info');
                }
            } catch (e: any) {
                const errorMessage = e?.result?.error?.message || e?.message || 'An unknown error occurred.';
                addToast(`Could not sync to Google Calendar: ${errorMessage}`, 'error');
                // Continue without calendar sync
            }
        }

        // Step 2: Create or update the Syncly meeting with the Google Event ID if available
        if (isEditMode && meetingToEdit) {
            const payload: Partial<Meeting> = {
                title,
                meetingDateTime: new Date(meetingDateTime).getTime(),
                attendeeIds: isExternalMeeting ? [] : attendeeIds,
                externalGuests: isExternalMeeting ? externalGuests : [],
                agenda,
                attachments,
            };
            const result = await DataService.updateMeeting(meetingToEdit.id, payload, manager);
            addToast('Meeting updated successfully!', 'success');
            onSuccess(result);
        } else {
            const payload: any = {
                title,
                meetingDateTime: new Date(meetingDateTime).getTime(),
                attendeeIds: isExternalMeeting ? [] : attendeeIds,
                externalGuests: isExternalMeeting ? externalGuests : [],
                agenda,
                attachments,
                recurrenceRule,
                createdBy: manager.id,
            };
            
            // Only include recurrenceEndDate if it's actually set
            if (recurrenceEndType === 'on' && recurrenceEndDate) {
                payload.recurrenceEndDate = new Date(recurrenceEndDate).getTime();
            }
            
            // Only include recurrenceCount if it's actually set
            if (recurrenceEndType === 'after' && recurrenceCount > 0) {
                payload.recurrenceCount = recurrenceCount;
            }
            
            // Only include googleEventId if it exists
            if (googleEventId) {
                payload.googleEventId = googleEventId;
            }
            
            const newMeeting = await DataService.addMeeting(payload, manager);

            // If a placeholder was used in the calendar link, update it now
            if (googleEventId) {
                const finalMeetingLink = `${window.location.origin}/#/meetings/${newMeeting.id}`;
                const finalDescription = `MEETING AGENDA\n-----------------------------------\n${agenda || 'No agenda provided.'}\n\n-----------------------------------\n✅ View this meeting in Syncly: ${finalMeetingLink}`;
                await calendarService.updateEvent(googleEventId, { description: finalDescription });
            }
            
            addToast('Formal meeting scheduled successfully!', 'success');
            onSuccess(newMeeting);
        }
    } catch (err: any) {
      addToast(`Failed to ${isEditMode ? 'update' : 'schedule'} meeting: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const TabButton: React.FC<{isActive: boolean, onClick: () => void, icon: string, children: React.ReactNode}> = ({isActive, onClick, icon, children}) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-t-lg transition-colors ${
        isActive
          ? 'bg-white dark:bg-slate-800 text-primary dark:text-sky-400 border-b-2 border-primary dark:border-sky-400'
          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
        <i className={`fas ${icon}`}></i> {children}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex">
        <TabButton isActive={activeTab === 'internal'} onClick={() => setActiveTab('internal')} icon="fa-building">Internal Team</TabButton>
        <TabButton isActive={activeTab === 'external'} onClick={() => setActiveTab('external')} icon="fa-globe-americas">External Guests</TabButton>
      </div>

      <div className="p-4 border border-t-0 rounded-b-lg dark:border-slate-700 bg-white dark:bg-slate-800">
        <Input
          label="Meeting Title"
          placeholder="E.g., Weekly Team Sync"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date & Time"
            type="datetime-local"
            value={meetingDateTime}
            onChange={e => handleDateTimeChange(e.target.value)}
            required
            error={timeError}
          />
          <Select
            label="Recurrence"
            options={[
              { value: 'none', label: 'Does not repeat' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={recurrenceRule}
            onChange={e => setRecurrenceRule(e.target.value as any)}
            disabled={isEditMode}
          />
        </div>
        
        {recurrenceRule !== 'none' && !isEditMode && (
          <div className="p-3 my-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-200 dark:border-slate-600">
            <label className="block text-sm font-medium text-darktext dark:text-slate-300 mb-2">End Recurrence</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center"><input type="radio" id="end_never" name="recurEnd" value="never" checked={recurrenceEndType === 'never'} onChange={() => setRecurrenceEndType('never')} className="h-4 w-4" /><label htmlFor="end_never" className="ml-2 text-sm">Never</label></div>
              <div className="flex items-center"><input type="radio" id="end_on" name="recurEnd" value="on" checked={recurrenceEndType === 'on'} onChange={() => setRecurrenceEndType('on')} className="h-4 w-4" /><label htmlFor="end_on" className="ml-2 text-sm">On date</label></div>
              <div className="flex items-center"><input type="radio" id="end_after" name="recurEnd" value="after" checked={recurrenceEndType === 'after'} onChange={() => setRecurrenceEndType('after')} className="h-4 w-4" /><label htmlFor="end_after" className="ml-2 text-sm">After</label></div>
            </div>
            {recurrenceEndType === 'on' && <Input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} wrapperClassName="mt-2" min={getLocalYYYYMMDD(new Date())} />}
            {recurrenceEndType === 'after' && <div className="flex items-center gap-2 mt-2"><Input type="number" value={recurrenceCount} onChange={e => setRecurrenceCount(Number(e.target.value))} min="1" wrapperClassName="w-24 !mb-0" /><span className="text-sm">occurrences</span></div>}
          </div>
        )}
        
        {isEditMode && <p className="text-xs text-slate-500 -mt-2">Recurrence rules cannot be changed after a meeting is created.</p>}
        
        {activeTab === 'internal' ? (
            <EmployeeMultiSelect
                selectedIds={attendeeIds}
                onSelectionChange={setAttendeeIds}
                teamMembers={activeTeamMembers}
            />
        ) : (
            <Textarea
                label="Invite External Guests by Email"
                placeholder="Enter email addresses, separated by commas..."
                value={externalGuestsText}
                onChange={e => setExternalGuestsText(e.target.value)}
                rows={2}
            />
        )}
        
        <Textarea
          label="Agenda (Optional)"
          placeholder="- Opening remarks&#10;- Review of last week's action items&#10;- Project updates..."
          value={agenda}
          onChange={e => setAgenda(e.target.value)}
          rows={6}
        />
        
        <div className="mt-2 p-3 rounded-md bg-slate-100 dark:bg-slate-700/50">
            {isGoogleSignedIn ? (
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="sync-calendar" checked={syncWithCalendar} onChange={(e) => setSyncWithCalendar(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" disabled={isEditMode} />
                    <label htmlFor="sync-calendar" className={`text-sm text-slate-600 dark:text-slate-300 ${isEditMode ? 'opacity-50' : ''}`}>
                        <i className="fas fa-calendar-plus mr-2 text-primary dark:text-sky-400"></i>
                        Sync with Google Calendar {isEditMode && '(only available for new meetings)'}
                    </label>
                </div>
            ) : (
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="sync-calendar-disabled" disabled className="h-4 w-4 rounded border-gray-300"/>
                    <label htmlFor="sync-calendar-disabled" className="text-sm text-slate-500 dark:text-slate-400">
                        <i className="fas fa-calendar-plus mr-2"></i>
                        Connect your account in <Link to="/integrations" className="text-primary hover:underline">Integrations</Link> to sync with Google Calendar.
                    </label>
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} disabled={!!timeError}>{isEditMode ? 'Update Meeting' : 'Schedule Meeting'}</Button>
      </div>
    </div>
  );
};

export default ScheduleMeetingForm;
