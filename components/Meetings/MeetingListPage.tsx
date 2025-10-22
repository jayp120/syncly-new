import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { Meeting, User } from '../../types';
import * as DataService from '../../services/dataService';
import PageContainer from '../Layout/PageContainer';
import Spinner from '../Common/Spinner';
import Card from '../Common/Card';
import * as ReactRouterDom from 'react-router-dom';
const { Link } = ReactRouterDom;
import { getLocalYYYYMMDD } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';
import Input from '../Common/Input';
import Button from '../Common/Button';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../Common/EmptyState';

// --- Date Helper Functions ---
const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
};

const formatDateHeader = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    return date.toLocaleDateString(undefined, options);
};
// --- End Date Helper Functions ---

const MeetingListPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<{ startDate: string | null, endDate: string | null }>({ startDate: null, endDate: null });
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            if (currentUser) {
                setIsLoading(true);
                const [userMeetings, users] = await Promise.all([
                    DataService.getMeetingsForUser(currentUser.id),
                    DataService.getUsers()
                ]);
                setMeetings(userMeetings);
                setAllUsers(users);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentUser]);

    const filteredMeetings = useMemo(() => {
        return meetings.filter(meeting => {
            if (!dateFilter.startDate && !dateFilter.endDate) {
                return true;
            }
            const meetingDate = getLocalYYYYMMDD(new Date(meeting.meetingDateTime));
            const matchesStart = !dateFilter.startDate || meetingDate >= dateFilter.startDate;
            const matchesEnd = !dateFilter.endDate || meetingDate <= dateFilter.endDate;
            return matchesStart && matchesEnd;
        });
    }, [meetings, dateFilter]);

    const groupedMeetings = useMemo(() => {
        const groups = new Map<string, Meeting[]>();
        filteredMeetings.forEach(meeting => {
            const dateKey = getLocalYYYYMMDD(new Date(meeting.meetingDateTime));
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(meeting);
        });
        return Array.from(groups.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, meetingsOnDay]) => ({
                date,
                meetings: meetingsOnDay.sort((a, b) => a.meetingDateTime - b.meetingDateTime)
            }));
    }, [filteredMeetings]);

    const title = currentUser?.roleName === 'Manager' ? "Meeting Workspaces" : "My Meetings";

    if (isLoading) {
        return <PageContainer title={title}><Spinner message="Loading meetings..." /></PageContainer>;
    }

    return (
        <PageContainer title={title}>
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input
                        label="Filter From Date"
                        type="date"
                        value={dateFilter.startDate || ''}
                        onChange={(e) => {
                            const newStartDate = e.target.value || null;
                            if (dateFilter.endDate && newStartDate && newStartDate > dateFilter.endDate) {
                                addToast('Start date cannot be after end date.', 'error');
                            } else {
                                setDateFilter(prev => ({ ...prev, startDate: newStartDate }));
                            }
                        }}
                    />
                    <Input
                        label="Filter To Date"
                        type="date"
                        value={dateFilter.endDate || ''}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value || null }))}
                        min={dateFilter.startDate || undefined}
                    />
                    <Button onClick={() => setDateFilter({ startDate: null, endDate: null })} variant="ghost">Reset Date Filter</Button>
                </div>
            </Card>

            {meetings.length === 0 ? (
                <EmptyState
                    icon={<i className="fas fa-folder-open"></i>}
                    title="No Meetings Found"
                    message={
                        currentUser?.roleName === 'Manager'
                            ? "You haven't created any meetings yet. Use the 'New Meeting' button to get started."
                            : "You haven't been invited to any meetings yet."
                    }
                />
            ) : groupedMeetings.length === 0 ? (
                 <EmptyState
                    icon={<i className="fas fa-calendar-times"></i>}
                    title="No Meetings in Range"
                    message="No meetings match the selected date range. Try adjusting or resetting the date filter."
                />
            ) : (
                <div className="space-y-6">
                    {groupedMeetings.map(({ date, meetings }) => (
                        <div key={date}>
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3 ml-2">{formatDateHeader(date)}</h2>
                            <div className="space-y-3">
                                {meetings.map(meeting => {
                                    if (meeting.meetingType === 'live_memo') {
                                        return (
                                            <Link to={`/meetings/${meeting.id}`} className="block group animate-fade-in-up" key={meeting.id}>
                                                <div className="flex items-stretch">
                                                    <div className="w-2 bg-amber-500 rounded-l-xl"></div>
                                                    <Card className="flex-grow !rounded-l-none group-hover:border-amber-500/50 dark:group-hover:border-amber-500/50">
                                                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                                            <div>
                                                                <p className="font-semibold text-lg text-amber-700 dark:text-amber-400 group-hover:underline">{meeting.title}</p>
                                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                                    <i className="fas fa-bolt mr-2"></i>
                                                                    Live Memo captured at {new Date(meeting.meetingDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center -space-x-2" title={`${meeting.attendeeIds.length} attendee(s)`}>
                                                                {meeting.attendeeIds.slice(0, 4).map(id => {
                                                                    const user = allUsers.find(u => u.id === id);
                                                                    return user ? <UserAvatar key={id} name={user.name} size="md" className="border-2 border-white dark:border-slate-900" /> : null;
                                                                })}
                                                                {meeting.attendeeIds.length > 4 &&
                                                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 dark:bg-slate-700 dark:text-slate-200">
                                                                        +{meeting.attendeeIds.length - 4}
                                                                    </div>
                                                                }
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                            </Link>
                                        );
                                    }
                                    // Formal Meeting Card
                                    return (
                                        <Link to={`/meetings/${meeting.id}`} className="block group animate-fade-in-up" key={meeting.id}>
                                            <div className="flex items-stretch">
                                                <div className="w-2 bg-blue-500 dark:bg-sky-500 rounded-l-xl"></div>
                                                <Card className="flex-grow !rounded-l-none group-hover:border-primary/50 dark:group-hover:border-sky-500/50">
                                                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                                        <div>
                                                            <p className="font-semibold text-lg text-primary dark:text-sky-400 group-hover:underline">{meeting.title}</p>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                                <i className="far fa-clock mr-2"></i>
                                                                {new Date(meeting.meetingDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center -space-x-2">
                                                            {meeting.attendeeIds.slice(0, 4).map(id => {
                                                                const user = allUsers.find(u => u.id === id);
                                                                return user ? <UserAvatar key={id} name={user.name} size="md" className="border-2 border-white dark:border-slate-900" /> : null;
                                                            })}
                                                            {meeting.attendeeIds.length > 4 &&
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 dark:bg-slate-700 dark:text-slate-200">
                                                                    +{meeting.attendeeIds.length - 4}
                                                                </div>
                                                            }
                                                        </div>
                                                    </div>
                                                </Card>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageContainer>
    );
};

export default MeetingListPage;