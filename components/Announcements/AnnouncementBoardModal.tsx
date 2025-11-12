import React, { useEffect, useMemo, useState } from 'react';
import { Announcement } from '../../types';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import { sanitizeRichText } from '../../utils/richText';

interface AnnouncementBoardModalProps {
  announcements: Announcement[];
  isOpen: boolean;
  onDismiss: (announcement: Announcement, acknowledge?: boolean) => Promise<void> | void;
}

const AnnouncementBoardModal: React.FC<AnnouncementBoardModalProps> = ({
  announcements,
  isOpen,
  onDismiss,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [announcements.length]);

  const currentAnnouncement = announcements[activeIndex];

  const formattedContent = useMemo(() => {
    if (!currentAnnouncement) return '';
    return sanitizeRichText(currentAnnouncement.content || '');
  }, [currentAnnouncement]);

  if (!isOpen || !currentAnnouncement) {
    return null;
  }

  const handleClose = async (acknowledge = false) => {
    await onDismiss(currentAnnouncement, acknowledge);
  };

  const hasMedia = currentAnnouncement.media && currentAnnouncement.media.length > 0;
  const remaining = announcements.length - (activeIndex + 1);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="absolute top-4 right-4 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {remaining > 0 && (
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              {remaining + 1} announcements
            </span>
          )}
          <button
            onClick={() => handleClose(false)}
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow"
            aria-label="Dismiss announcement"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {hasMedia && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 dark:from-slate-800 dark:via-slate-800/70 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
            {currentAnnouncement.media!.map((media, index) => (
              <figure key={media.id} className="h-56 rounded-2xl overflow-hidden relative">
                <img
                  src={media.storageUrl}
                  alt={media.caption || `Announcement media ${index + 1}`}
                  className="object-cover w-full h-full"
                />
                {media.caption && (
                  <figcaption className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-xs px-3 py-1.5">
                    {media.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Announcement
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
                {currentAnnouncement.title}
              </h2>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>
                Active from{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatDateTimeDDMonYYYYHHMM(new Date(currentAnnouncement.startsAt))}
                </span>
              </p>
              <p>
                until{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatDateTimeDDMonYYYYHHMM(new Date(currentAnnouncement.endsAt))}
                </span>
              </p>
            </div>
          </div>

          <article
            className="prose prose-slate dark:prose-invert max-w-none leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
              Posted by {currentAnnouncement.createdByName}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
              {currentAnnouncement.requireAcknowledgement && (
                <button
                  onClick={() => handleClose(true)}
                  className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold shadow hover:bg-primary/90 transition"
                >
                  I Acknowledge
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBoardModal;
