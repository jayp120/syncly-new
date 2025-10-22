import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TriggerLogEntry } from '../../types';
import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Spinner from '../Common/Spinner';
import Input from '../Common/Input';
import Button from '../Common/Button'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import UserAvatar from '../Common/UserAvatar';
import eventBus from '../../services/eventBus';
import { TRIGGER_LOG_KEY } from '../../constants';
import * as ReactRouterDom from "react-router-dom";
const { useSearchParams } = ReactRouterDom;

interface TriggerLogViewProps {}

const LOG_ENTRIES_PER_PAGE = 15;

const TriggerLogView: React.FC<TriggerLogViewProps> = () => {
  const [logEntries, setLogEntries] = useState<TriggerLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const fetchLogs = useCallback(async () => {
    const entries = await DataService.getTriggerLogEntries();
    setLogEntries(entries);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchLogs().finally(() => setIsLoading(false));
    
    const handleDataChange = (data?: any) => {
        if (data && data.keyChanged === TRIGGER_LOG_KEY) {
            fetchLogs();
        }
    };
    const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
    return () => unsubscribe();
  }, [fetchLogs]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setIsDownloadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSearchChange = (term: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (term) {
          newParams.set('search', term);
      } else {
          newParams.delete('search');
      }
      newParams.delete('page');
      setSearchParams(newParams);
  };

  const filteredLogEntries = useMemo(() => {
    return logEntries.filter(entry => {
      const term = searchTerm.toLowerCase();
      return (
        entry.employeeName.toLowerCase().includes(term) ||
        entry.managerName.toLowerCase().includes(term) ||
        entry.reason.toLowerCase().includes(term) ||
        formatDateTimeDDMonYYYYHHMM(entry.timestamp).toLowerCase().includes(term)
      );
    });
  }, [logEntries, searchTerm]);

  const totalPages = Math.ceil(filteredLogEntries.length / LOG_ENTRIES_PER_PAGE);
  const entriesForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * LOG_ENTRIES_PER_PAGE;
    const endIndex = startIndex + LOG_ENTRIES_PER_PAGE;
    return filteredLogEntries.slice(startIndex, endIndex);
  }, [filteredLogEntries, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', String(page));
      setSearchParams(newParams);
    }
  };

  const handleDownloadCSV = () => {
    const headers = ["Employee Name", "Trigger Sent By", "Date & Time", "Reason"];
    const rows = filteredLogEntries.map(entry => [ 
      entry.employeeName,
      entry.managerName,
      formatDateTimeDDMonYYYYHHMM(entry.timestamp),
      entry.reason
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n"
      + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trigger_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloadDropdownOpen(false);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Employee Name', 'Trigger Sent By', 'Date & Time', 'Reason']],
      body: filteredLogEntries.map(entry => [ 
        entry.employeeName,
        entry.managerName,
        formatDateTimeDDMonYYYYHHMM(entry.timestamp),
        entry.reason
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 85, 164] }, 
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      tableWidth: 'auto',
    });
    doc.save('trigger_log.pdf');
    setIsDownloadDropdownOpen(false);
  };

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredLogEntries.map(entry => ({ 
        "Employee Name": entry.employeeName,
        "Trigger Sent By": entry.managerName,
        "Date & Time": formatDateTimeDDMonYYYYHHMM(entry.timestamp),
        "Reason": entry.reason
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TriggerLog");
    XLSX.writeFile(workbook, "trigger_log.xlsx");
    setIsDownloadDropdownOpen(false);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    if (totalPages <= maxPagesToShow + 2) { 
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(
                <Button key={i} onClick={() => handlePageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{i}</Button>
            );
        }
    } else {
        pageNumbers.push(<Button key={1} onClick={() => handlePageChange(1)} variant={1 === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">1</Button>);
        let startPage = Math.max(2, currentPage - Math.floor((maxPagesToShow - 2) / 2));
        let endPage = Math.min(totalPages - 1, currentPage + Math.floor((maxPagesToShow - 2) / 2));

        if (currentPage <= Math.ceil(maxPagesToShow / 2)) { 
          endPage = maxPagesToShow - 1;
        } else if (currentPage > totalPages - Math.ceil(maxPagesToShow / 2)) { 
          startPage = totalPages - (maxPagesToShow - 2);
        }
        
        if (startPage > 2) pageNumbers.push(<span key="start-ellipsis" className="mx-1 p-2">...</span>);
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <Button key={i} onClick={() => handlePageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{i}</Button>
            );
        }

        if (endPage < totalPages - 1) pageNumbers.push(<span key="end-ellipsis" className="mx-1 p-2">...</span>);
        pageNumbers.push(<Button key={totalPages} onClick={() => handlePageChange(totalPages)} variant={totalPages === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{totalPages}</Button>);
    }
    return pageNumbers;
  };

  if (isLoading) {
    return <Spinner message="Loading trigger log..." />;
  }

  return (
    <Card title="Trigger Log History" titleIcon={<i className="fas fa-history"></i>}>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Input
          type="text"
          placeholder="Search log (employee, manager, reason, date...)"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          wrapperClassName="mb-0 flex-grow"
          className="w-full"
        />
        <div className="relative" ref={downloadDropdownRef}>
          <Button
            variant="secondary"
            onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
            icon={<i className="fas fa-download"></i>}
            disabled={filteredLogEntries.length === 0}
          >
            Download Log ({filteredLogEntries.length})
            <i className={`fas fa-chevron-down ml-2 transition-transform ${isDownloadDropdownOpen ? 'rotate-180' : ''}`}></i>
          </Button>
          {isDownloadDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-primary dark:bg-dark-surface-primary rounded-md shadow-lg py-1 z-20 border border-border-primary dark:border-dark-border">
              <button onClick={handleDownloadCSV} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-csv mr-2"></i>Download as CSV</button>
              <button onClick={handleDownloadPDF} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-pdf mr-2"></i>Download as PDF</button>
              <button onClick={handleDownloadExcel} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-excel mr-2"></i>Download as Excel</button>
            </div>
          )}
        </div>
      </div>
      {filteredLogEntries.length === 0 ? (
        <p className="text-center text-text-secondary dark:text-dark-text-secondary py-6">
          {searchTerm ? 'No log entries match your search.' : 'No trigger events have been logged yet.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
              <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
                {entriesForCurrentPage.map(entry => (
                  <tr key={entry.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-dark-text"><div className="flex items-center"><UserAvatar name={entry.employeeName} size="md" className="mr-3" />{entry.employeeName}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary"><div className="flex items-center"><UserAvatar name={entry.managerName} size="md" className="mr-3" />{entry.managerName}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{formatDateTimeDDMonYYYYHHMM(entry.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-text-secondary dark:text-dark-text-secondary max-w-xs break-words">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">Page {currentPage} of {totalPages} (Total entries: {filteredLogEntries.length})</span>
                <div className="flex items-center">
                  <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} variant="ghost" size="sm" icon={<i className="fas fa-chevron-left"></i>} className="mr-2">Prev</Button>
                  {renderPageNumbers()}
                  <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="ghost" size="sm" icon={<i className="fas fa-chevron-right"></i>} className="ml-2">Next</Button>
                </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default TriggerLogView;