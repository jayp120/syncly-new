

import React from 'react';
import { EODReport, ReportStatus, User, ReportVersion } from '../../types';
import Card from '../Common/Card';
import Button from '../Common/Button';
import * as DataService from '../../services/dataService';
import { formatDateTimeDDMonYYYYHHMM, formatDateDDMonYYYY } from '../../utils/dateUtils';

interface EmployeeReportCardProps {
  report: EODReport;
  onViewDetails: (report: EODReport) => void;
  onAcknowledge?: (reportId: string) => void; 
  // onComment is handled via onViewDetails and then commenting in the modal
}

const EmployeeReportCard: React.FC<EmployeeReportCardProps> = ({ report, onViewDetails, onAcknowledge }) => {
  const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];

  if (!latestVersion) {
    return (
        <Card className="mb-4">
            <p className="text-red-500">Error: Report {report.id} by {report.employeeName} has no version data.</p>
        </Card>
    );
  }
  
  const { date, status, employeeName, managerComments, submittedOnWeekOff, isLate, isYesterdaySubmission } = report;
  const { tasksCompleted, attachments, isCopied: latestVersionIsCopied } = latestVersion;
  const hasBeenEdited = report.versions.length > 1;

  const handleAcknowledgeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (onAcknowledge) onAcknowledge(report.id);
  };
  
  return (
    <Card className="mb-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={() => onViewDetails(report)}>
      <div className="flex flex-col sm:flex-row justify-between items-start">
        <div>
          <h4 className="text-md font-semibold text-secondary dark:text-dark-text-primary">
            {employeeName} - {formatDateDDMonYYYY(date)}
            {hasBeenEdited && <span className="text-sm text-purple-600 dark:text-purple-400 ml-2">(V{latestVersion.versionNumber})</span>}
          </h4>
          <div className="flex items-center space-x-2 mt-1 flex-wrap">
            <span className={`px-2 py-0.5 inline-block text-xs font-semibold rounded-full ${status === ReportStatus.ACKNOWLEDGED ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
              <i className={`fas ${status === ReportStatus.ACKNOWLEDGED ? 'fa-check-circle' : 'fa-hourglass-half'} mr-1`}></i>
              {status}
            </span>
            {isYesterdaySubmission && (
              <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300" title={`Submitted on ${formatDateTimeDDMonYYYYHHMM(report.submittedAt)}`}>
                <i className="fas fa-undo-alt mr-1"></i>Yesterday's Report
              </span>
            )}
            {isLate && !isYesterdaySubmission && (
               <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" title="Late Submission">
                <i className="fas fa-clock mr-1"></i>Late
              </span>
            )}
            {submittedOnWeekOff && (
              <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" title="This report was submitted on the employee's designated weekly off day.">
                <i className="fas fa-calendar-check mr-1"></i>On Week Off
              </span>
            )}
            {latestVersionIsCopied && ( // Show if the latest version's content was copied
              <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300" title="Content copied from a previous report.">
                <i className="fas fa-copy mr-1"></i>Copied Content
              </span>
            )}
            {attachments && attachments.length > 0 && (
                <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300" title={`${attachments.length} attachment(s) in latest version`}>
                    <i className="fas fa-paperclip mr-1"></i> {attachments.length}
                </span>
            )}
            {hasBeenEdited && (
                 <span className="px-2 py-0.5 inline-block text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" title="This report has been edited after initial submission.">
                    <i className="fas fa-history mr-1"></i>Edited After Submission
                </span>
            )}
          </div>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 items-stretch sm:items-center w-full sm:w-auto">
           <Button onClick={(e) => { e.stopPropagation(); onViewDetails(report); }} variant="ghost" size="sm" className="w-full sm:w-auto">
             <i className="fas fa-eye mr-1"></i> View Details
           </Button>
          {status === ReportStatus.PENDING_ACKNOWLEDGMENT && onAcknowledge && (
            <Button onClick={handleAcknowledgeClick} variant="success" size="sm" className="w-full sm:w-auto">
              <i className="fas fa-check mr-1"></i> Ack.
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-text-primary dark:text-dark-text-primary mb-1"><strong>Tasks (Latest Version):</strong></p>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap truncate max-h-12">{tasksCompleted}</p>
      </div>
      {managerComments && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-border/50">
          <p className="text-xs text-text-primary dark:text-dark-text-primary mb-0.5"><strong>My Overall Comment:</strong></p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary italic bg-gray-50 dark:bg-dark-surface-secondary/50 p-1 rounded whitespace-pre-wrap truncate max-h-10">"{managerComments}"</p>
        </div>
      )}
    </Card>
  );
};

export default EmployeeReportCard;