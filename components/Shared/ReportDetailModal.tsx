import React, { useState, useEffect, useMemo } from 'react';
import { EODReport, ReportStatus, User, Permission } from '../../types';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import * as DataService from '../../services/dataService';
import Select from '../Common/Select'; 
import Card from '../Common/Card'; 
import { formatDateDDMonYYYY, formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import { useAuth } from '../Auth/AuthContext';

interface ReportDetailModalProps {
  report: EODReport;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onReportUpdate?: (updatedReport: EODReport) => void; 
}

const EMOJI_OPTIONS = ['👍', '🎉', '👌', '⭐', '😊'];

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, isOpen, onClose, currentUser, onReportUpdate }) => {
  const { hasPermission } = useAuth();
  const [comment, setComment] = useState(report.managerComments || '');
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  
  const sortedVersions = useMemo(() => 
    [...(report.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber), 
  [report.versions]);

  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number>(
    sortedVersions.length > 0 ? sortedVersions[0].versionNumber : 0
  );

  const selectedVersion = useMemo(() => 
    report.versions.find(v => v.versionNumber === selectedVersionNumber),
  [report.versions, selectedVersionNumber]);

  useEffect(() => {
    setComment(report.managerComments || '');
    setIsEditingComment(false);
    setSelectedEmoji(null); 
    const newSortedVersions = [...(report.versions || [])].sort((a, b) => b.versionNumber - a.versionNumber);
    setSelectedVersionNumber(newSortedVersions.length > 0 ? newSortedVersions[0].versionNumber : 0);
  }, [report]);

  const handleAcknowledge = async () => {
    let finalCommentText = comment.trim();
    
    if (selectedEmoji) {
        finalCommentText = selectedEmoji + " " + finalCommentText;
    }
    
    const updatedReportData = { 
        id: report.id, 
        status: ReportStatus.ACKNOWLEDGED, 
        managerComments: finalCommentText.trim() 
    };
    const result = await DataService.updateReportByManager(updatedReportData, currentUser);
    if (result && onReportUpdate) {
      onReportUpdate(result);
    }
    onClose();
  };
  
  const handleSaveComment = async () => {
    const updatedReportData = { id: report.id, managerComments: comment };
    const result = await DataService.updateReportByManager(updatedReportData, currentUser);
     if (result) {
        if (onReportUpdate) {
            onReportUpdate(result);
        }
        setIsEditingComment(false); 
        onClose(); 
    } else {
        console.error("Failed to save comment in ReportDetailModal.");
    }
  };

  const DetailItem: React.FC<{label: string; value?: string | React.ReactNode; defaultText?: string; className?: string}> = ({label, value, defaultText = "N/A", className=""}) => (
    <div className={`mb-3 ${className}`}>
      <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">{label}:</p>
      <div className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{value || defaultText}</div>
    </div>
  );

  const downloadFile = (dataUrl: string, fileName: string, mimeType: string) => {
    try {
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error("Error downloading file:", error);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.click();
    }
  };

  const isManager = hasPermission(Permission.CAN_ACKNOWLEDGE_REPORTS);
  
  // Check if current manager has already acknowledged
  const ackStatus = DataService.getReportAcknowledgmentStatus(report);
  const hasCurrentManagerAcked = currentUser ? ackStatus.hasManagerAcknowledged(currentUser.id) : false;

  const renderFooter = () => {
    const buttons = [];
    if (isManager && !hasCurrentManagerAcked) {
      buttons.push(
        <Button key="acknowledge" onClick={handleAcknowledge} variant="success">
          <i className="fas fa-check-circle mr-2"></i>Acknowledge Report
        </Button>
      );
    }
    if (isManager && hasCurrentManagerAcked) {
      buttons.push(
        <span key="acknowledged-status" className="text-sm text-green-600 dark:text-green-400 font-semibold">
          <i className="fas fa-check-double mr-2"></i>You acknowledged this report
        </span>
      );
    }
    buttons.push(<Button key="close" onClick={onClose} variant="ghost">Close</Button>);
    return <>{buttons}</>;
  };

  const versionOptions = report.versions
    .sort((a,b) => b.versionNumber - a.versionNumber) 
    .map(v => ({
        value: v.versionNumber,
        label: `Version ${v.versionNumber} (${v.action} @ ${formatDateTimeDDMonYYYYHHMM(v.timestamp)}${ v.isCopied ? ' - Copied' : ''})`
    }));

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`EOD Report - ${formatDateDDMonYYYY(report.date)}`} 
        size="lg"
        footer={renderFooter()}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
        {report.isYesterdaySubmission && (
          <div className="p-3 mb-2 bg-cyan-50 dark:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-700 rounded-md text-sm text-cyan-700 dark:text-cyan-300 flex items-center">
              <i className="fas fa-undo-alt mr-2"></i>
              <span>This late report for a previous day was submitted on: {formatDateTimeDDMonYYYYHHMM(report.submittedAt)}</span>
          </div>
        )}
        {report.isLate && !report.isYesterdaySubmission && (
            <div className="p-3 mb-2 bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700 rounded-md text-sm text-orange-700 dark:text-orange-300">
                <i className="fas fa-clock mr-2"></i>This was a late submission.
            </div>
        )}
        {report.submittedOnWeekOff && (
            <div className="p-3 mb-2 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <i className="fas fa-info-circle mr-2"></i>This report was submitted on the employee's designated weekly off day.
            </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <DetailItem label="Employee" value={report.employeeName} />
            <DetailItem label="Report For Date" value={formatDateDDMonYYYY(report.date)} />
            <DetailItem label="Initial Submission Time" value={formatDateTimeDDMonYYYYHHMM(report.submittedAt)} />
            <DetailItem label="Overall Status" value={
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${report.status === ReportStatus.ACKNOWLEDGED ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                  {report.status}
              </span>
            } />
            <DetailItem label="Total Versions" value={String(report.versions.length)} />
        </div>

        {report.status === ReportStatus.ACKNOWLEDGED && (() => {
          const ackStatus = DataService.getReportAcknowledgmentStatus(report);
          const acknowledgingManagers = ackStatus.getAcknowledgingManagers();
          
          if (acknowledgingManagers.length > 0) {
            return (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                  <i className="fas fa-check-circle mr-2"></i>Acknowledged by:
                </p>
                <div className="space-y-1">
                  {acknowledgingManagers.map((ack, idx) => (
                    <div key={idx} className="text-sm text-green-700 dark:text-green-400">
                      <i className="fas fa-user-check mr-2"></i>
                      <span className="font-medium">
                        {ack.name}
                        {ack.designation && ack.designation === 'Director' && <span className="ml-1 text-xs opacity-70">(Director)</span>}
                      </span>
                      <span className="text-xs ml-2 text-green-600 dark:text-green-500">
                        ({formatDateTimeDDMonYYYYHHMM(ack.timestamp)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {report.versions.length > 1 && (
            <div className="my-3">
                <Select
                    label="View Report Version:"
                    options={versionOptions}
                    value={selectedVersionNumber}
                    onChange={(e) => setSelectedVersionNumber(Number(e.target.value))}
                    wrapperClassName="mb-0"
                />
            </div>
        )}
        
        {selectedVersion && (
          <Card title={`Version ${selectedVersion.versionNumber} Details`} className="bg-gray-50 dark:bg-slate-800/50" titleIcon={<i className="fas fa-file-alt"></i>}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 mb-3">
                <DetailItem label="Version Action" value={selectedVersion.action === 'submitted' ? 'Original Submission' : 'Edited Version'} />
                <DetailItem label="Timestamp" value={formatDateTimeDDMonYYYYHHMM(selectedVersion.timestamp)} />
            </div>
            {selectedVersion.isCopied && (
                <div className="p-2 mb-2 bg-teal-50 dark:bg-teal-900/50 border border-teal-200 dark:border-teal-700 rounded-md text-xs text-teal-700 dark:text-teal-300">
                    <i className="fas fa-copy mr-2"></i>This version's content was (re)submitted using copied data.
                </div>
            )}
            <DetailItem label="Tasks Completed" value={selectedVersion.tasksCompleted} />
            <DetailItem label="Challenges Faced" value={selectedVersion.challengesFaced} />
            <DetailItem label="Plan for Tomorrow" value={selectedVersion.planForTomorrow} />

            {selectedVersion.attachments && selectedVersion.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">Attachments for this version ({selectedVersion.attachments.length}):</p>
                <div className="flex flex-wrap gap-3">
                  {selectedVersion.attachments.map((att, index) => (
                    <div key={`${selectedVersionNumber}-${index}`} className="border dark:border-slate-700 rounded-md p-2 hover:shadow-md transition-shadow">
                      {att.type.startsWith('image/') ? (
                        <a href={att.dataUrl} target="_blank" rel="noopener noreferrer" title={`View ${att.name}`}>
                          <img src={att.dataUrl} alt={att.name} className="w-20 h-20 object-cover rounded border" />
                          <p className="text-xs text-center mt-1 truncate max-w-[80px] dark:text-slate-300">{att.name}</p>
                        </a>
                      ) : (
                        <button
                          onClick={() => downloadFile(att.dataUrl, att.name, att.type)}
                          title={`Download ${att.name}`}
                          className="flex flex-col items-center justify-center w-20 h-20 text-center p-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        >
                          <i className={`fas ${att.type === 'application/pdf' ? 'fa-file-pdf' : (att.type.includes('wordprocessingml') ? 'fa-file-word' : 'fa-file-alt')} text-3xl text-primary mb-1`}></i>
                          <p className="text-xs truncate max-w-[80px] dark:text-slate-300">{att.name}</p>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
        {!selectedVersion && report.versions.length > 0 && <p className="text-red-500">Error: Could not load selected version details.</p>}
        {!selectedVersion && report.versions.length === 0 && <p className="text-yellow-500">This report has no versions.</p>}

        {isManager && !hasCurrentManagerAcked && (
            <div className="my-3 p-3 border dark:border-slate-700 rounded-md bg-indigo-50 dark:bg-indigo-900/40">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Add Quick Reaction (Optional):</p>
                <div className="flex space-x-2 flex-wrap">
                    {EMOJI_OPTIONS.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => setSelectedEmoji(prev => prev === emoji ? null : emoji)}
                            className={`p-2 rounded-full text-2xl transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary
                                ${selectedEmoji === emoji ? 'bg-primary-light dark:bg-sky-900/50 ring-2 ring-primary scale-110 shadow-lg' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                            aria-label={`Select ${emoji} reaction`}
                            aria-pressed={selectedEmoji === emoji}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="mt-4 pt-4 border-t dark:border-slate-700">
            <p className="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-1">
                Manager Comments (Overall):
            </p>
            {isManager ? (
                !hasCurrentManagerAcked ? (
                    <>
                        <textarea 
                            value={comment} 
                            onChange={(e) => setComment(e.target.value)} 
                            className="w-full p-2 border dark:border-slate-600 rounded-md min-h-[80px] focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:text-slate-200"
                            placeholder="Add your overall comments for this report (optional)..."
                        />
                    </>
                ) : isEditingComment ? ( 
                    <>
                        <textarea 
                            value={comment} 
                            onChange={(e) => setComment(e.target.value)} 
                            className="w-full p-2 border dark:border-slate-600 rounded-md min-h-[80px] focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 dark:text-slate-200"
                            placeholder="Edit your overall comments for this report..."
                        />
                        <div className="mt-2 flex space-x-2">
                            <Button onClick={handleSaveComment} size="sm" variant="primary">Save &amp; Close Comment</Button>
                            <Button onClick={() => { setIsEditingComment(false); setComment(report.managerComments || ''); setSelectedEmoji(null); }} size="sm" variant="ghost">Cancel</Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap min-h-[40px]">
                            {report.managerComments || "No overall comments yet."}
                        </div>
                        <Button onClick={() => { setIsEditingComment(true); setSelectedEmoji(null); }} size="sm" variant="ghost" className="mt-1 text-xs">
                            <i className="fas fa-edit mr-1"></i> {report.managerComments ? 'Edit Comment' : 'Add Comment'}
                        </Button>
                    </>
                )
            ) : (
                 <div className="text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{report.managerComments || "No overall comments from manager yet."}</div>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default ReportDetailModal;
