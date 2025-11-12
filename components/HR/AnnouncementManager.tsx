import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { Announcement, BusinessUnit, User } from '../../types';
import * as DataService from '../../services/dataService';
import AnnouncementFormModal from './AnnouncementFormModal';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import { sanitizeRichText } from '../../utils/richText';
import { useAuth } from '../Auth/AuthContext';
import { Trash2, Edit3, Calendar, CheckCircle, Megaphone, Clock } from 'lucide-react';

const AnnouncementManagerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [engagementMap, setEngagementMap] = useState<Record<string, { totalViews: number; acknowledged: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [announcementData, buData, userData] = await Promise.all([
        DataService.getAnnouncements(),
        DataService.getBusinessUnits(),
        DataService.getUsers(),
      ]);
      setAnnouncements(announcementData);
      setBusinessUnits(buData);
      setUsers(userData);

      const engagementEntries = await Promise.all(
        announcementData.map(async (announcement) => {
          const stats = await DataService.getAnnouncementEngagement(announcement.id);
          return [announcement.id, stats] as const;
        })
      );
      setEngagementMap(Object.fromEntries(engagementEntries));
    } catch (error) {
      console.error(error);
      addToast('Unable to load announcements.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const stats = useMemo(() => {
    const active = announcements.filter((a) => a.status === 'active').length;
    const scheduled = announcements.filter((a) => a.status === 'scheduled').length;
    const expired = announcements.filter((a) => a.status === 'expired').length;
    return { active, scheduled, expired };
  }, [announcements]);

  const handleSubmit = async (draft: DataService.AnnouncementDraft, announcement?: Announcement | null) => {
    if (!currentUser) return;
    if (announcement) {
      await DataService.updateAnnouncementRecord(announcement.id, draft, currentUser);
      addToast('Announcement updated successfully.', 'success');
    } else {
      await DataService.createAnnouncementRecord(draft, currentUser);
      addToast('Announcement published successfully.', 'success');
    }
    setEditingAnnouncement(null);
    setIsModalOpen(false);
    await loadAnnouncements();
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!currentUser) return;
    const confirmed = window.confirm(`Delete announcement "${announcement.title}"?`);
    if (!confirmed) return;
    await DataService.deleteAnnouncementRecord(announcement.id, currentUser);
    addToast('Announcement deleted.', 'info');
    await loadAnnouncements();
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <PageContainer title="Announcement Studio">
        <div className="flex justify-center py-20">
          <Spinner message="Loading announcements..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Announcement Studio"
      description="Plan, schedule, and broadcast organization-wide updates with engagement insights."
      action={
        <Button onClick={openCreateModal}>
          <i className="fas fa-plus mr-2" />
          New Announcement
        </Button>
      }
    >
      <Card className="mb-6 bg-gradient-to-r from-primary/90 via-sky-500 to-cyan-500 text-white border-none shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] opacity-80">Broadcast</p>
            <h2 className="text-2xl font-semibold mt-1">Create your next announcement</h2>
            <p className="opacity-80">
              Target specific business units or everyone, add media, and schedule go-live / expiry times.
            </p>
          </div>
          <Button variant="secondary" onClick={openCreateModal} className="bg-white text-primary hover:bg-white/90">
            <i className="fas fa-plus mr-2" />
            Start drafting
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Megaphone size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.active}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Scheduled</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.scheduled}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Expired</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.expired}</p>
          </div>
        </Card>
      </div>

      <Card title="All Announcements">
        {announcements.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-4">
            <p>No announcements yet. Click below to create your first message.</p>
            <Button onClick={openCreateModal}>
              <i className="fas fa-pen mr-2" />
              Create Announcement
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const engagement = engagementMap[announcement.id];
              return (
                <div
                  key={announcement.id}
                  className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            announcement.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : announcement.status === 'scheduled'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                        </span>
                        {announcement.requireAcknowledgement && (
                          <span className="text-xs font-semibold text-primary">Requires acknowledgement</span>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mt-2">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatDateTimeDDMonYYYYHHMM(new Date(announcement.startsAt))} &mdash;{' '}
                        {formatDateTimeDDMonYYYYHHMM(new Date(announcement.endsAt))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => { setEditingAnnouncement(announcement); setIsModalOpen(true); }}
                      >
                        <Edit3 size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" className="text-red-500" onClick={() => handleDelete(announcement)}>
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div
                    className="prose prose-sm prose-slate dark:prose-invert mt-3 max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(announcement.content) }}
                  />
                  {announcement.media && announcement.media.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {announcement.media.slice(0, 2).map((media) => (
                        <figure key={media.id} className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                          <img src={media.storageUrl} alt={media.caption || announcement.title} className="w-full h-32 object-cover" />
                          {media.caption && (
                            <figcaption className="text-xs text-slate-500 dark:text-slate-400 px-3 py-1">
                              {media.caption}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>
                      <CheckCircle className="inline-block mr-1 text-emerald-500" size={16} />
                      Viewed: {engagement?.totalViews ?? 0}
                    </span>
                    <span>
                      <CheckCircle className="inline-block mr-1 text-primary" size={16} />
                      Acknowledged: {engagement?.acknowledged ?? 0}
                    </span>
                    <span>Target: {announcement.targetType === 'all' ? 'Everyone' : announcement.targetType}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AnnouncementFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAnnouncement(null); }}
        onSubmit={handleSubmit}
        businessUnits={businessUnits}
        users={users}
        announcement={editingAnnouncement}
      />
    </PageContainer>
  );
};

export default AnnouncementManagerPage;
