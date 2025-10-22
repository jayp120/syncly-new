

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EODReport, ReportStatus, User, DateRange, BusinessUnit, ReportVersion, UserStatus } from '../../types';
import * as DataService from '../../services/dataService';
import ReportDetailModal from '../Shared/ReportDetailModal';
import Spinner from '../Common/Spinner';
import Card from '../Common/Card';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import UserAvatar from '../Common/UserAvatar';
import AISummaryModal from './AISummaryModal';

interface ReportListProps {
  currentUser: User; // Manager
  allUsers: User[]; // All users, to filter employees
}

type SortKey = 'employeeName' | 'date' | 'status' | 'businessUnitName';
interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

const REPORTS_PER_PAGE = 10; 

const ReportList: React.FC<ReportListProps> = ({ currentUser, allUsers }) => {
  const [reports, setReports] = useState<EODReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableBusinessUnits, setAvailableBusinessUnits] = useState<BusinessUnit[]>([]);
  
  const [filters, setFilters] = useState<{
    searchTerm: string;
    employeeId: string;
    status: ReportStatus | '';
    dateRange: DateRange;
    businessUnitId: string;
  }>({
    searchTerm: '',
    employeeId: '',
    status: '',
    dateRange: { startDate: null, endDate: null },
    businessUnitId: currentUser.businessUnitId || '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'descending' });
  const { addToast } = useToast();

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [aiSummaryDate, setAiSummaryDate] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReportsAndBUs = useCallback(async () => {
    setIsLoading(true);
    const allReportsData = await DataService.getReports();
    setReports(allReportsData);
    const buData = await DataService.getBusinessUnits();
    setAvailableBusinessUnits(buData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchReportsAndBUs();
  }, [fetchReportsAndBUs]);

  const handleReportUpdate = (updatedReport: EODReport) => {
    setReports(prevReports =>
      prevReports.map(r => (r.id === updatedReport.id ? updatedReport : r))
    );
    if (selectedReport && selectedReport.id === updatedReport.id) {
        setSelectedReport(updatedReport); 
    }
  };
  
  const handleAcknowledgeReport = async (reportId: string) => {
    const reportToUpdate = reports.find(r => r.id === reportId);
    if (reportToUpdate) {
      const updated = await DataService.updateReportByManager({ 
        id: reportToUpdate.id, 
        status: ReportStatus.ACKNOWLEDGED, 
        managerComments: reportToUpdate.managerComments || 'Acknowledged' 
      }, currentUser);
      if (updated) handleReportUpdate(updated);
    }
  };

  const employeeOptions = useMemo(() => {
    return allUsers
      .filter(user => user.roleName === 'Employee' && user.status === UserStatus.ACTIVE && (!filters.businessUnitId || user.businessUnitId === filters.businessUnitId))
      .map(user => ({ value: user.id, label: user.name }));
  }, [allUsers, filters.businessUnitId]);

  const businessUnitOptions = useMemo(() => {
    if (currentUser.businessUnitId) {
        const currentMngBu = availableBusinessUnits.find(bu => bu.id === currentUser.businessUnitId);
        return currentMngBu ? [{ value: currentMngBu.id, label: currentMngBu.name }] : [];
    }
    return [{ value: '', label: 'All Business Units' }, ...availableBusinessUnits.map(bu => ({ value: bu.id, label: bu.name }))]
  }, [availableBusinessUnits, currentUser.businessUnitId]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <i className="fas fa-sort text-gray-400 ml-1"></i>;
    }
    if (sortConfig.direction === 'ascending') {
      return <i className="fas fa-sort-up text-primary ml-1"></i>;
    }
    return <i className="fas fa-sort-down text-primary ml-1"></i>;
  };

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports
      .filter(report => {
        const searchTermLower = filters.searchTerm.toLowerCase();
        const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
        if (!latestVersion) return false;

        const employeeOfReport = allUsers.find(u => u.id === report.employeeId);

        const matchesSearch =
          (report.employeeName || '').toLowerCase().includes(searchTermLower) ||
          (latestVersion.tasksCompleted || '').toLowerCase().includes(searchTermLower) ||
          (latestVersion.challengesFaced || '').toLowerCase().includes(searchTermLower) ||
          (latestVersion.planForTomorrow || '').toLowerCase().includes(searchTermLower) ||
          (employeeOfReport?.businessUnitName || '').toLowerCase().includes(searchTermLower);
        
        const matchesEmployee = filters.employeeId ? report.employeeId === filters.employeeId : true;
        const matchesStatus = filters.status ? report.status === filters.status : true;
        
        const reportDate = new Date(report.date + 'T00:00:00Z');
        const startDate = filters.dateRange.startDate ? new Date(filters.dateRange.startDate + 'T00:00:00Z') : null;
        const endDate = filters.dateRange.endDate ? new Date(filters.dateRange.endDate + 'T23:59:59Z') : null;

        const matchesDateRange = 
          (!startDate || reportDate >= startDate) && 
          (!endDate || reportDate <= endDate);

        const buFilterToUse = currentUser.businessUnitId || filters.businessUnitId;
        const matchesBusinessUnit = buFilterToUse 
            ? (employeeOfReport && employeeOfReport.businessUnitId === buFilterToUse) 
            : true;

        return matchesSearch && matchesEmployee && matchesStatus && matchesDateRange && matchesBusinessUnit;
      });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortConfig.key === 'date') {
            valA = a.date;
            valB = b.date;
        } else if (sortConfig.key === 'businessUnitName') {
            valA = allUsers.find(u => u.id === a.employeeId)?.businessUnitName || '';
            valB = allUsers.find(u => u.id === b.employeeId)?.businessUnitName || '';
        } else {
            valA = a[sortConfig.key as keyof EODReport];
            valB = b[sortConfig.key as keyof EODReport];
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        if (sortConfig.key === 'date') return b.submittedAt - a.submittedAt;
        return b.date.localeCompare(a.date);
      });
    } else {
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName));
    }
    return filtered;
  }, [reports, filters, allUsers, sortConfig, currentUser.businessUnitId]);
  
  useEffect(() => {
    setCurrentPage(1); 
  }, [filters, sortConfig]);


  const totalPendingFilteredReports = useMemo(() => {
    return filteredAndSortedReports.filter(r => r.status === ReportStatus.PENDING_ACKNOWLEDGMENT);
  }, [filteredAndSortedReports]);

  const totalPages = Math.ceil(filteredAndSortedReports.length / REPORTS_PER_PAGE);
  const reportsForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * REPORTS_PER_PAGE;
    const endIndex = startIndex + REPORTS_PER_PAGE;
    return filteredAndSortedReports.slice(startIndex, endIndex);
  }, [filteredAndSortedReports, currentPage]);

  const handleAcknowledgeAllFilteredReports = async () => {
    setIsAcknowledgingAll(true);
    const reportIdsToAcknowledge = totalPendingFilteredReports.map(report => report.id);
    
    try {
        const success = await DataService.acknowledgeMultipleReports(reportIdsToAcknowledge, currentUser);
        if (success) {
            addToast(`${reportIdsToAcknowledge.length} reports acknowledged.`, 'success');
            await fetchReportsAndBUs();
        } else {
            throw new Error("Batch acknowledgement failed in data service.");
        }
    } catch(error) {
        console.error("Failed to acknowledge all reports:", error);
        addToast("An error occurred while acknowledging reports.", 'error');
    } finally {
        setIsAcknowledgingAll(false);
    }
  };

  const handleFilterChange = <K extends keyof typeof filters,>(key: K, value: (typeof filters)[K]) => {
    if (key === 'dateRange') {
        const newRange = value as DateRange;
        if (newRange.startDate && newRange.endDate && newRange.startDate > newRange.endDate) {
            addToast("Start date cannot be after end date.", 'error');
            return;
        }
    }
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
        searchTerm: '',
        employeeId: '',
        status: '',
        dateRange: { startDate: null, endDate: null },
        businessUnitId: currentUser.businessUnitId || '',
    });
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getExportData = () => {
    return filteredAndSortedReports.map(report => {
        const employee = allUsers.find(u => u.id === report.employeeId);
        const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0] || {} as ReportVersion;
        return {
            "Report ID": report.id,
            "Employee Name": report.employeeName,
            "Employee Email": employee?.email || 'N/A',
            "Business Unit": employee?.businessUnitName || 'N/A',
            "Report Date": formatDateDDMonYYYY(report.date),
            "Report Status": report.status,
            "Manager Comments": report.managerComments || '',
            "Submitted on Week Off": report.submittedOnWeekOff ? 'Yes' : 'No',
            "Is Late Submission": report.isLate ? 'Yes' : 'No',
            "Total Versions": report.versions.length,
            "Latest Version Timestamp": latestVersion.timestamp ? new Date(latestVersion.timestamp).toLocaleString() : 'N/A',
            "Latest Version Action": latestVersion.action || 'N/A',
            "Latest Version Tasks Completed": latestVersion.tasksCompleted || '',
            "Latest Version Challenges Faced": latestVersion.challengesFaced || '',
            "Latest Version Plan for Tomorrow": latestVersion.planForTomorrow || '',
            "Latest Version Attachments Count": latestVersion.attachments?.length || 0,
            "Latest Version Content Copied": latestVersion.isCopied ? 'Yes' : 'No',
        };
    });
  };

  const handleExportCSV = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
        alert("No data to export based on current filters.");
        return;
    }
    const headers = Object.keys(dataToExport[0]);
    const csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + dataToExport.map(row => headers.map(header => `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "eod_reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportDropdownOpen(false);
  };

  const handleExportPDF = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
        alert("No data to export based on current filters.");
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = Object.keys(dataToExport[0]);
    const body = dataToExport.map(row => headers.map(header => String(row[header as keyof typeof row])));
    
    autoTable(doc, {
      head: [headers],
      body: body,
      styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 85, 164], fontSize: 7 },
      columnStyles: { 
          0: { cellWidth: 20 }, 
          1: { cellWidth: 25 }, 
          2: { cellWidth: 30 }, 
      },
      margin: { top: 10, right: 5, bottom: 10, left: 5 },
      tableWidth: 'auto',
    });
    doc.save('eod_reports.pdf');
    setIsExportDropdownOpen(false);
  };

  const handleExportExcel = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
        alert("No data to export based on current filters.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EOD Reports");
    XLSX.writeFile(workbook, "eod_reports.xlsx");
    setIsExportDropdownOpen(false);
  };

  const canGenerateSummary = useMemo(() => {
    if (reportsForCurrentPage.length === 0) return false;
    const firstDate = reportsForCurrentPage[0].date;
    return reportsForCurrentPage.every(r => r.date === firstDate);
  }, [reportsForCurrentPage]);

  const handleOpenAiSummaryModal = async () => {
    if (!canGenerateSummary) {
        addToast("AI Summary can only be generated for reports from a single day. Please adjust your filters.", 'info');
        return;
    }

    setIsAiModalOpen(true);
    setIsGeneratingSummary(true);
    setAiError(null);
    setAiSummaryText(null);
    setAiSummaryDate(reportsForCurrentPage.length > 0 ? reportsForCurrentPage[0].date : null);

    try {
        const summary = await DataService.generateReportSummary(reportsForCurrentPage);
        setAiSummaryText(summary);
    } catch (err: any) {
        setAiError(err.message);
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  if (isLoading) return <Spinner message="Loading reports..." />;

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
        let startPage = Math.max(2, currentPage - Math.floor((maxPagesToShow -2) / 2));
        let endPage = Math.min(totalPages - 1, currentPage + Math.floor((maxPagesToShow -2) / 2));

        if (currentPage <= Math.ceil(maxPagesToShow/2)) { 
          endPage = maxPagesToShow - 1;
        } else if (currentPage > totalPages - Math.ceil(maxPagesToShow/2)) { 
          startPage = totalPages - (maxPagesToShow - 2);
        }
        
        if (startPage > 2) pageNumbers.push(<span key="start-ellipsis" className="mx-1 p-2">...</span>);
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(<Button key={i} onClick={() => handlePageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{i}</Button>);
        }

        if (endPage < totalPages - 1) pageNumbers.push(<span key="end-ellipsis" className="mx-1 p-2">...</span>);
        pageNumbers.push(<Button key={totalPages} onClick={() => handlePageChange(totalPages)} variant={totalPages === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{totalPages}</Button>);
    }
    return pageNumbers;
  };

  return (
    <Card title="Employee EOD Reports" titleIcon={<i className="fas fa-folder-open"></i>}>
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 rounded-md text-sm text-amber-800 dark:text-amber-300">
        <span className="font-semibold text-lg">🟡 Pending Acknowledgments: {totalPendingFilteredReports.length}</span>
        <p className="text-xs">This count reflects all pending reports matching your current filters, across all pages.</p>
      </div>

      <div className="mb-3 p-3 border rounded-md bg-surface-secondary dark:bg-dark-surface-secondary dark:border-dark-border">
        <h3 className="text-base font-medium text-primary dark:text-sky-400 mb-1">Filter Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-end">
          <Input type="text" placeholder="Search (name, tasks, BU...)" value={filters.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} wrapperClassName="mb-0"/>
          <Select options={[{ value: '', label: 'All Employees' }, ...employeeOptions]} value={filters.employeeId} onChange={(e) => handleFilterChange('employeeId', e.target.value)} wrapperClassName="mb-0" placeholder="Filter by Employee"/>
          <Select options={[{ value: '', label: 'All Statuses' }, { value: ReportStatus.PENDING_ACKNOWLEDGMENT, label: 'Pending Acknowledgment' }, { value: ReportStatus.ACKNOWLEDGED, label: 'Acknowledged' }]} value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value as ReportStatus | '')} wrapperClassName="mb-0" placeholder="Filter by Status"/>
           {!currentUser.businessUnitId && (<Select options={businessUnitOptions} value={filters.businessUnitId} onChange={(e) => handleFilterChange('businessUnitId', e.target.value)} wrapperClassName="mb-0" placeholder="Filter by Business Unit"/>)}
          <Input type="date" label="Start Date" value={filters.dateRange.startDate || ''} onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, startDate: e.target.value || null })} max={filters.dateRange.endDate || undefined} wrapperClassName="mb-0"/>
          <Input type="date" label="End Date" value={filters.dateRange.endDate || ''} onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, endDate: e.target.value || null })} min={filters.dateRange.startDate || undefined} wrapperClassName="mb-0"/>
          <div className="lg:col-span-1 xl:col-span-1"><Button onClick={resetFilters} variant="ghost" className="w-full">Reset Filters</Button></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row justify-end items-center gap-3">
         <Button variant="secondary" onClick={handleOpenAiSummaryModal} icon={<span className="text-lg">🧠</span>} disabled={!canGenerateSummary} title={!canGenerateSummary ? "Filter reports to a single day to enable AI summary" : `Generate AI Summary for ${formatDateDDMonYYYY(reportsForCurrentPage[0]?.date)}`}>AI Summary</Button>
         <div className="relative" ref={exportDropdownRef}>
            <Button variant="secondary" onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} icon={<i className="fas fa-file-export"></i>} disabled={filteredAndSortedReports.length === 0}>Export Reports ({filteredAndSortedReports.length})<i className={`fas fa-chevron-down ml-2 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`}></i></Button>
            {isExportDropdownOpen && (<div className="absolute right-0 mt-2 w-48 bg-surface-primary dark:bg-dark-surface-primary rounded-md shadow-lg py-1 z-20 border border-border-primary dark:border-dark-border">
                <button onClick={handleExportCSV} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-primary-light dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-csv mr-2"></i>Export as CSV</button>
                <button onClick={handleExportPDF} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-primary-light dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-pdf mr-2"></i>Export as PDF</button>
                <button onClick={handleExportExcel} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-primary-light dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-excel mr-2"></i>Export as Excel</button>
            </div>)}
        </div>
        {totalPendingFilteredReports.length > 0 && (<Button onClick={handleAcknowledgeAllFilteredReports} variant="success" disabled={totalPendingFilteredReports.length === 0 || isAcknowledgingAll} isLoading={isAcknowledgingAll} icon={<i className="fas fa-check-double"></i>}>{isAcknowledgingAll ? 'Acknowledging...' : `Acknowledge All (${totalPendingFilteredReports.length})`}</Button>)}
      </div>

      {filteredAndSortedReports.length === 0 ? (<p className="text-center text-text-secondary dark:text-dark-text-secondary py-8">No reports match your current filters.</p>) : (<>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
              <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('employeeName')}>Employee {getSortIcon('employeeName')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('date')}>Report Date {getSortIcon('date')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Tasks (Latest)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('businessUnitName')}>Business Unit {getSortIcon('businessUnitName')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Acknowledgments</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Info</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-gray-200 dark:divide-dark-border">
                {reportsForCurrentPage.map(report => {
                    const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
                    if (!latestVersion) return null;
                    const employee = allUsers.find(u => u.id === report.employeeId);
                    const ackStatus = DataService.getReportAcknowledgmentStatus(report);
                    const hasCurrentManagerAcked = ackStatus.hasManagerAcknowledged(currentUser.id);
                    const acknowledgingManagers = ackStatus.getAcknowledgingManagers();
                    const ackCount = ackStatus.getAcknowledgmentCount();
                    
                    return (
                        <tr key={report.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover animate-fade-in-up">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text"><div className="flex items-center"><UserAvatar name={report.employeeName} size="md" className="mr-3" />{report.employeeName}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{formatDateDDMonYYYY(report.date)}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-text-secondary dark:text-dark-text-secondary max-w-sm break-words">{latestVersion.tasksCompleted.substring(0,70)}{latestVersion.tasksCompleted.length > 70 ? '...' : ''}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 py-0.5 inline-block text-xs font-semibold rounded-full ${report.status === ReportStatus.ACKNOWLEDGED ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>{report.status}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{employee?.businessUnitName || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                              {ackCount > 0 ? (
                                <div className="space-y-0.5">
                                  {acknowledgingManagers.map((mgr, idx) => {
                                    const isCurrentUser = mgr.id === currentUser.id;
                                    const isDirector = mgr.designation === 'Director';
                                    
                                    return (
                                      <div key={idx} className={`text-xs ${isCurrentUser ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                        <i className={`fas ${isCurrentUser ? 'fa-check-circle' : 'fa-user-check'} mr-1`}></i>
                                        {mgr.name}
                                        {isDirector && <span className="ml-1 text-[10px] opacity-70">(Director)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  <i className="fas fa-hourglass-half mr-1"></i>Not acknowledged
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{report.isLate && <span className="block text-xs text-orange-600 dark:text-orange-400 mb-0.5" title="Late Submission"><i className="fas fa-clock mr-1"></i>Late</span>}{report.managerComments && <span className="block text-xs text-indigo-600 dark:text-indigo-400 mb-0.5" title="Has comment"><i className="fas fa-comment-dots mr-1"></i>Commented</span>}{report.versions.length > 1 && <span className="block text-xs text-purple-600 dark:text-purple-400" title={`Edited (V${latestVersion.versionNumber})`}><i className="fas fa-history mr-1"></i>V{latestVersion.versionNumber}</span>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-1">
                                <Button onClick={() => setSelectedReport(report)} variant="ghost" size="sm" icon={<i className="fas fa-eye"></i>}>Details</Button>
                                {!hasCurrentManagerAcked && (
                                  <Button 
                                    onClick={() => handleAcknowledgeReport(report.id)} 
                                    variant="success" 
                                    size="sm" 
                                    icon={<i className="fas fa-check"></i>}
                                    title="Acknowledge this report"
                                  >
                                    Ack.
                                  </Button>
                                )}
                                {hasCurrentManagerAcked && (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold px-2">
                                    <i className="fas fa-check-double mr-1"></i>You acknowledged
                                  </span>
                                )}
                              </div>
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">Page {currentPage} of {totalPages} (Total reports: {filteredAndSortedReports.length})</span>
              <div className="flex items-center"><Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} variant="ghost" size="sm" icon={<i className="fas fa-chevron-left"></i>} className="mr-2">Prev</Button>{renderPageNumbers()}<Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="ghost" size="sm" icon={<i className="fas fa-chevron-right"></i>} className="ml-2">Next</Button></div>
            </div>
          )}
        </>
      )}

      {selectedReport && (<ReportDetailModal report={selectedReport} isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} currentUser={currentUser} onReportUpdate={handleReportUpdate}/>)}
      <AISummaryModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} summaryDate={aiSummaryDate} summaryText={aiSummaryText} isLoading={isGeneratingSummary} error={aiError}/>
    </Card>
  );
};

export default ReportList;
