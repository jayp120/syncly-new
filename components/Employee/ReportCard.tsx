
import React, { useState, useEffect } from 'react';
import { EODReport, ReportStatus } from '../../types';
import Card from '../Common/Card';
import Button from '../Common/Button';
import * as DataService from '../../services/dataService';
import { formatDateDDMonYYYY, formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';

interface ReportCardProps {
  report: EODReport;
  onViewDetails: (report: EODReport) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onViewDetails }) => {
  const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
  const [editableState, setEditableState] = useState({ editable: false, reason: "" });

  useEffect(() => {
    const checkEditable = async () => {
        const state = await DataService.isReportEditable(report);
        setEditableState(state);
    };
    checkEditable();
  }, [report]);

  if (!latestVersion) {
    return (
        <Card className="mb-4 hover:shadow-lg transition-shadow duration-200">
            <p className="text-red-500">Error: Report has no version data.</p>
        </Card>
    );
  }

  const { date, status, managerComments, submittedOnWeekOff, isLate } = report;
  const { tasksCompleted, timestamp: versionTimestamp, action, attachments, versionNumber } = latestVersion;

  return (
    <Card className="mb-4 hover:shadow-lg transition-shadow duration-200 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start">
        <div>
          <h4 className="text-lg font-semibold text-secondary dark:text-slate-200">
            EOD Report - {formatDateDDMonYYYY(date)}
             {report.versions.length > 1 && <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">(V{versionNumber})</span>}
          </h4>
          <div className="flex items-center space-x-2 mt-1 flex-wrap">
            <span className={`px-2 py-0.5 inline-block text-xs font-semibold rounded-full ${status === ReportStatus.ACKNOWLEDGED ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
              <i className={`fas ${status === ReportStatus.ACKNOWLEDGED ? 'fa-check-circle' : 'fa-hourglass-half'} mr-1`}></i>
              {status}
            </span>
            {isLate && (
              <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                <i className="fas fa-clock mr-1"></i>Late Submission
              </span>
            )}
            {submittedOnWeekOff && (
              <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                <i className="fas fa-calendar-check mr-1"></i>On Week Off
              </span>
            )}
            {attachments && attachments.length > 0 && (
              <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300" title={`${attachments.length} attachment(s)`}>
                <i className="fas fa-paperclip mr-1"></i> {attachments.length}
              </span>
            )}
            {report.versions.length > 1 && (
                <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" title="This report has been edited.">
                    <i className="fas fa-history mr-1"></i>Edited
                </span>
            )}
             {managerComments && (
                <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" title="Manager has commented">
                    <i className="fas fa-comment-dots mr-1"></i>Commented
                </span>
            )}
          </div>
           { (report.versions.length > 1) &&
             <span className="ml-0 text-xs text-gray-500 dark:text-slate-400 italic">Last action: {action} at {formatDateTimeDDMonYYYYHHMM(versionTimestamp)}</span>
           }
        </div>
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-stretch sm:items-center w-full sm:w-auto">
            {editableState.editable && (
                 <Button to={`/edit-eod/${report.id}`} variant="warning" size="sm" className="w-full sm:w-auto" icon={<i className="fas fa-edit"></i>}>
                    Edit (V{latestVersion.versionNumber})
                </Button>
            )}
            <Button onClick={() => onViewDetails(report)} variant="ghost" size="sm" className="w-full sm:w-auto">
                View Details
            </Button>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-text-primary dark:text-dark-text-primary mb-1"><strong>Tasks Completed (Latest Version):</strong></p>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap truncate max-h-16">{tasksCompleted}</p>
        {!editableState.editable && editableState.reason && <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">{editableState.reason}</p>}
      </div>
      {status === ReportStatus.ACKNOWLEDGED && (() => {
        const ackStatus = DataService.getReportAcknowledgmentStatus(report);
        const acknowledgingManagers = ackStatus.getAcknowledgingManagers();
        
        return (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
            {acknowledgingManagers.length > 0 && (
              <div>
                <p className="text-sm text-text-primary dark:text-dark-text-primary mb-1">
                  <strong>Acknowledged by:</strong>
                </p>
                <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded space-y-1">
                  {acknowledgingManagers.map((ack, idx) => (
                    <div key={idx} className="text-sm text-green-700 dark:text-green-400 flex items-center">
                      <i className="fas fa-check-circle mr-2"></i>
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
            )}
            {managerComments && (
              <div>
                <p className="text-sm text-text-primary dark:text-dark-text-primary mb-1"><strong>Manager's Feedback (Overall):</strong></p>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary italic bg-gray-50 dark:bg-slate-800/50 p-2 rounded whitespace-pre-wrap truncate max-h-16">"{managerComments}"</p>
              </div>
            )}
          </div>
        );
      })()}
    </Card>
  );
};

export default ReportCard;