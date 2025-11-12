import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import RichTextEditor from '../Common/RichTextEditor';
import Button from '../Common/Button';
import Select from '../Common/Select';
import { Announcement, AnnouncementDraft, BusinessUnit, User } from '../../types';
import { sanitizeRichText } from '../../utils/richText';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import { uploadFile } from '../../services/storageService';

interface AnnouncementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: AnnouncementDraft, announcement?: Announcement | null) => Promise<void>;
  businessUnits: BusinessUnit[];
  users: User[];
  announcement?: Announcement | null;
}

const toInputValue = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const AnnouncementFormModal: React.FC<AnnouncementFormModalProps> = ({
  isOpen,
  onClose: requestClose,
  onSubmit,
  businessUnits,
  users,
  announcement,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<Announcement['targetType']>('all');
  const [selectedBusinessUnits, setSelectedBusinessUnits] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState(toInputValue(Date.now()));
  const [endsAt, setEndsAt] = useState(toInputValue(Date.now() + 24 * 60 * 60 * 1000));
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(false);
  const [media, setMedia] = useState<NonNullable<Announcement['media']>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'edit' | 'review'>('edit');
  const [pendingDraft, setPendingDraft] = useState<AnnouncementDraft | null>(null);

  const businessUnitMap = useMemo<Record<string, BusinessUnit>>(
    () => Object.fromEntries(businessUnits.map<[string, BusinessUnit]>((bu) => [bu.id, bu])),
    [businessUnits]
  );
  const userMap = useMemo<Record<string, User>>(
    () => Object.fromEntries(users.map<[string, User]>((user) => [user.id, user])),
    [users]
  );

  const hasMeaningfulText = (html: string) => {
    const textOnly = html
      .replace(/<style[^>]*>.*?<\/style>/gim, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, '')
      .trim();
    return textOnly.length > 0;
  };

  useEffect(() => {
    if (!announcement) {
      setTitle('');
      setContent('');
      setTargetType('all');
      setSelectedBusinessUnits([]);
      setSelectedUsers([]);
      setStartsAt(toInputValue(Date.now()));
      setEndsAt(toInputValue(Date.now() + 24 * 60 * 60 * 1000));
      setRequireAcknowledgement(false);
      setMedia([]);
      setError(null);
      setStage('edit');
      setPendingDraft(null);
      return;
    }

    setTitle(announcement.title);
    setContent(sanitizeRichText(announcement.content));
    setTargetType(announcement.targetType);
    setSelectedBusinessUnits(announcement.targetBusinessUnitIds || []);
    setSelectedUsers(announcement.targetUserIds || []);
    setStartsAt(toInputValue(announcement.startsAt));
    setEndsAt(toInputValue(announcement.endsAt));
    setRequireAcknowledgement(!!announcement.requireAcknowledgement);
    setMedia(announcement.media || []);
    setError(null);
    setStage('edit');
    setPendingDraft(null);
  }, [announcement]);

  useEffect(() => {
    if (isOpen) return;
    setStage('edit');
    setPendingDraft(null);
    setError(null);
  }, [isOpen]);

  const previewHtml = useMemo(() => sanitizeRichText(content || ''), [content]);
  const previewPlaceholder = '<p class="text-slate-400">Start typing to preview.</p>';

  const buildDraft = (): AnnouncementDraft | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return null;
    }

    const sanitizedContent = sanitizeRichText(content || '');
    if (!hasMeaningfulText(sanitizedContent)) {
      setError('Content cannot be empty.');
      return null;
    }

    const startTimestamp = new Date(startsAt).getTime();
    const endTimestamp = new Date(endsAt).getTime();
    if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp) || endTimestamp <= startTimestamp) {
      setError('End time must be after the start time.');
      return null;
    }

    if (targetType === 'businessUnits' && selectedBusinessUnits.length === 0) {
      setError('Select at least one business unit.');
      return null;
    }

    if (targetType === 'users' && selectedUsers.length === 0) {
      setError('Select at least one recipient.');
      return null;
    }

    return {
      title: trimmedTitle,
      content: sanitizedContent,
      targetType,
      targetBusinessUnitIds: selectedBusinessUnits,
      targetUserIds: selectedUsers,
      startsAt: startTimestamp,
      endsAt: endTimestamp,
      requireAcknowledgement,
      media,
    };
  };

  const handleReview = () => {
    const draft = buildDraft();
    if (!draft) return;
    setPendingDraft(draft);
    setStage('review');
    setError(null);
  };

  const handleFinalizePublish = async () => {
    const draft = pendingDraft || buildDraft();
    if (!draft) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft, announcement);
      setPendingDraft(null);
      setStage('edit');
      requestClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to save the announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setPendingDraft(null);
    setStage('edit');
    setError(null);
    requestClose();
  };

  const backToEditor = () => {
    setPendingDraft(null);
    setStage('edit');
    setError(null);
  };

  const describeAudience = (draft: AnnouncementDraft) => {
    if (draft.targetType === 'all') {
      return {
        headline: 'Entire organization',
        detail: 'Every active employee will receive this update.',
      };
    }

    if (draft.targetType === 'businessUnits') {
      const ids = draft.targetBusinessUnitIds || [];
      const names = ids.map((id) => businessUnitMap[id]?.name).filter(Boolean);
      return {
        headline: `${ids.length} business unit${ids.length === 1 ? '' : 's'}`,
        detail: names.length ? names.join(', ') : 'Selected business units',
      };
    }

    const ids = draft.targetUserIds || [];
    const names = ids.map((id) => userMap[id]?.name || userMap[id]?.email || id).filter(Boolean);
    const previewNames = names.slice(0, 3).join(', ');
    return {
      headline: `${ids.length} individual${ids.length === 1 ? '' : 's'}`,
      detail: names.length ? `${previewNames}${names.length > 3 ? '...' : ''}` : 'Selected users',
    };
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files.length) return;
    setIsUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(event.target.files).map(async (file) => {
          const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { downloadUrl, storagePath } = await uploadFile(file, 'announcements', uniqueName);
          return {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            storageUrl: downloadUrl,
            storagePath,
            caption: file.name,
          };
        })
      );
      setMedia((prev) => [...prev, ...uploads]);
    } catch (err) {
      setError('Unable to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const toggleSelection = (value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    setFn((prev) => (prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value]));
  };

  const showBusinessUnitPicker = targetType === 'businessUnits';
  const showUserPicker = targetType === 'users';
  const reviewAudience = pendingDraft ? describeAudience(pendingDraft) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={announcement ? 'Edit Announcement' : 'Create Announcement'}
      size="xl"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          {stage === 'review' ? (
            <>
              <Button variant="secondary" onClick={backToEditor} disabled={isSubmitting}>
                Back to editing
              </Button>
              <Button variant="primary" onClick={handleFinalizePublish} isLoading={isSubmitting}>
                {announcement ? 'Finalize Update' : 'Finalize & Publish'}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleReview}
              isLoading={isSubmitting}
              disabled={isUploading}
            >
              Review Final Preview
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {stage === 'review' && pendingDraft ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-6 shadow-xl">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Final Preview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {pendingDraft.title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Active {formatDateTimeDDMonYYYYHHMM(new Date(pendingDraft.startsAt))} -{' '}
                    {formatDateTimeDDMonYYYYHHMM(new Date(pendingDraft.endsAt))}
                  </p>
                </div>
                {pendingDraft.requireAcknowledgement && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                    <i className="fas fa-shield-check" />
                    Acknowledgement required
                  </span>
                )}
              </div>
              <div
                className="mt-6 prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: pendingDraft.content }}
              />
              {pendingDraft.media && pendingDraft.media.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingDraft.media.map((item) => (
                    <figure
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    >
                      <img src={item.storageUrl} alt={item.caption} className="w-full h-48 object-cover" />
                      {item.caption && (
                        <figcaption className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{item.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Audience</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{reviewAudience?.headline}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{reviewAudience?.detail}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Schedule</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Starts {formatDateTimeDDMonYYYYHHMM(new Date(pendingDraft.startsAt))}
                  <br />
                  Ends {formatDateTimeDDMonYYYYHHMM(new Date(pendingDraft.endsAt))}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Media</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{pendingDraft.media?.length || 0} item(s)</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {pendingDraft.media && pendingDraft.media.length > 0 ? 'Images render below the body.' : 'No media attached.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              This is the exact announcement experience employees will receive once you finalize.
            </p>
          </div>
        ) : (
          <>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., FY26 Leave Policy Updates" />
            <RichTextEditor
              label="Body"
              value={content}
              onChange={setContent}
              placeholder="Write the announcement details..."
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-2">Preview</p>
              <div
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml || previewPlaceholder }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-200">Starts At</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-200">Ends At</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">Audience</p>
              <div className="flex flex-wrap gap-3">
                {(['all', 'businessUnits', 'users'] as Announcement['targetType'][]).map((type) => (
                  <button
                    key={type}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                      targetType === type
                        ? 'bg-primary text-white border-primary'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    onClick={() => setTargetType(type)}
                    type="button"
                  >
                    {type === 'all' && 'Everyone'}
                    {type === 'businessUnits' && 'Business Units'}
                    {type === 'users' && 'Specific Users'}
                  </button>
                ))}
              </div>

              {showBusinessUnitPicker && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {businessUnits.map((bu) => (
                    <button
                      key={bu.id}
                      type="button"
                      className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                        selectedBusinessUnits.includes(bu.id)
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                      onClick={() => toggleSelection(bu.id, setSelectedBusinessUnits)}
                    >
                      {bu.name}
                    </button>
                  ))}
                </div>
              )}

              {showUserPicker && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1 bg-slate-50 dark:bg-slate-900/40">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelection(user.id, setSelectedUsers)}
                      />
                      <span>{user.name}</span>
                      <span className="text-xs text-slate-400">({user.businessUnitName || 'Unassigned'})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={requireAcknowledgement}
                  onChange={(e) => setRequireAcknowledgement(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                Require acknowledgement
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Users must confirm before the banner disappears.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-200">Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={isUploading}
                className="text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary file:px-4 file:py-2 file:text-sm hover:file:bg-primary/20"
              />
              {isUploading && <p className="text-xs text-slate-400">Uploading...</p>}
              {media.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {media.map((item) => (
                    <figure key={item.id} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={item.storageUrl} alt={item.caption} className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/70 text-white text-xs"
                        onClick={() => setMedia((prev) => prev.filter((mediaItem) => mediaItem.id !== item.id))}
                        aria-label="Remove image"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AnnouncementFormModal;
