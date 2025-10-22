

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EODReport, ReportStatus, User, DateRange, BusinessUnit, ReportVersion } from '../../types';
import * as DataService from '../../services/dataService';
import ReportDetailModal from '../Shared/ReportDetailModal';
import Spinner from '../Common/Spinner';
import Card from '../Common/Card';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button'; 
import { useAuth } from '../Auth/AuthContext';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';

interface SortConfigAdmin {
  key: 'employeeName' | 'date' | 'status' | 'businessUnitName';
  direction: 'ascending' | 'descending';
}

const REPORTS_PER_PAGE_ADMIN = 10;

const AdminReportView: React.FC = () => {
  const { currentUser } = useAuth(); 
  const [reports, setReports] = useState<EODReport[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [availableBusinessUnits, setAvailableBusinessUnits] = useState<BusinessUnit[]>([]);
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
    businessUnitId: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfigAdmin | null>({ key: 'date', direction: 'descending' });


  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setReports(await DataService.getReports());
    setAllUsers(await DataService.getUsers()); 
    setAvailableBusinessUnits(await DataService.getBusinessUnits());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleReportUpdateFromModal = (updatedReport: EODReport) => {
    setReports(prevReports =>
      prevReports.map(r => (r.id === updatedReport.id ? updatedReport : r))
    );
    if (selectedReport && selectedReport.id === updatedReport.id) {
        setSelectedReport(updatedReport); 
    }
  };

  const employeeOptions = useMemo(() => {
    return allUsers
      .filter(user => user.roleName === 'Employee' || user.roleName === 'Manager') 
      .map(user => ({ value: user.id, label: user.name }));
  }, [allUsers]);

  const businessUnitOptions = useMemo(() => {
      return [{ value: '', label: 'All Business Units' }, ...availableBusinessUnits.map(bu => ({ value: bu.id, label: bu.name }))]
  }, [availableBusinessUnits]);


  const requestSort = (key: SortConfigAdmin['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortConfigAdmin['key']) => {
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
          report.employeeName.toLowerCase().includes(searchTermLower) ||
          latestVersion.tasksCompleted.toLowerCase().includes(searchTermLower) ||
          (latestVersion.challengesFaced && latestVersion.challengesFaced.toLowerCase().includes(searchTermLower)) ||
          (latestVersion.planForTomorrow && latestVersion.planForTomorrow.toLowerCase().includes(searchTermLower)) ||
          (employeeOfReport?.businessUnitName && employeeOfReport.businessUnitName.toLowerCase().includes(searchTermLower));
        
        const matchesEmployee = filters.employeeId ? report.employeeId === filters.employeeId : true;
        const matchesStatus = filters.status ? report.status === filters.status : true;
        
        const reportDate = new Date(report.date + 'T00:00:00Z'); // UTC
        const startDate = filters.dateRange.startDate ? new Date(filters.dateRange.startDate + 'T00:00:00Z') : null; // UTC
        const endDate = filters.dateRange.endDate ? new Date(filters.dateRange.endDate + 'T23:59:59Z') : null; // UTC

        const matchesDateRange = 
          (!startDate || reportDate >= startDate) && 
          (!endDate || reportDate <= endDate);
        
        const matchesBusinessUnit = filters.businessUnitId 
            ? (employeeOfReport && employeeOfReport.businessUnitId === filters.businessUnitId) 
            : true;

        return matchesSearch && matchesEmployee && matchesStatus && matchesDateRange && matchesBusinessUnit;
      });
      
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof EODReport]; // Type assertion
        let valB: any = b[sortConfig.key as keyof EODReport]; // Type assertion

        if (sortConfig.key === 'businessUnitName') {
            valA = allUsers.find(u => u.id === a.employeeId)?.businessUnitName || '';
            valB = allUsers.find(u => u.id === b.employeeId)?.businessUnitName || '';
        } else if (sortConfig.key === 'date') {
            valA = new Date(a.date).getTime();
            valB = new Date(b.date).getTime();
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        if (sortConfig.key !== 'date') {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
    } else {
        // Default sort if no sortConfig
        filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName));
    }
    return filtered;

  }, [reports, filters, allUsers, sortConfig]);
  
  useEffect(() => {
    setCurrentPage(1); 
  }, [filters, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedReports.length / REPORTS_PER_PAGE_ADMIN);
  const reportsForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * REPORTS_PER_PAGE_ADMIN;
    const endIndex = startIndex + REPORTS_PER_PAGE_ADMIN;
    return filteredAndSortedReports.slice(startIndex, endIndex);
  }, [filteredAndSortedReports, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


  const handleFilterChange = <K extends keyof typeof filters,>(key: K, value: (typeof filters)[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
        searchTerm: '',
        employeeId: '',
        status: '',
        dateRange: { startDate: null, endDate: null },
        businessUnitId: '',
    });
  }

  const handleExportData = () => {
    const dataStr = JSON.stringify(filteredAndSortedReports.map(report => { 
        const employee = allUsers.find(u => u.id === report.employeeId);
        const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0] || {} as ReportVersion;
        return {
            reportId: report.id,
            employeeName: report.employeeName,
            employeeEmail: employee?.email || 'N/A',
            employeeBusinessUnit: employee?.businessUnitName || 'N/A',
            reportDate: formatDateDDMonYYYY(report.date),
            status: report.status,
            managerComments: report.managerComments || '',
            submittedOnWeekOff: report.submittedOnWeekOff,
            totalVersions: report.versions.length,
            latestVersionDetails: {
                versionNumber: latestVersion.versionNumber,
                timestamp: latestVersion.timestamp,
                action: latestVersion.action,
                tasksCompleted: latestVersion.tasksCompleted,
                challengesFaced: latestVersion.challengesFaced,
                planForTomorrow: latestVersion.planForTomorrow,
                attachmentsCount: latestVersion.attachments?.length || 0,
                isCopied: latestVersion.isCopied,
            }
        }
    }), null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'eod_reports_export_admin.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    if (totalPages <= maxPagesToShow + 2) { 
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(
                <Button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    variant={i === currentPage ? 'primary' : 'ghost'}
                    size="sm"
                    className="mx-1"
                >
                    {i}
                </Button>
            );
        }
    } else {
        pageNumbers.push(
             <Button key={1} onClick={() => handlePageChange(1)} variant={1 === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">1</Button>
        );

        let startPage = Math.max(2, currentPage - Math.floor((maxPagesToShow -2) / 2));
        let endPage = Math.min(totalPages - 1, currentPage + Math.floor((maxPagesToShow -2) / 2));

        if (currentPage <= Math.ceil(maxPagesToShow/2)) { 
          endPage = maxPagesToShow -1;
        } else if (currentPage > totalPages - Math.ceil(maxPagesToShow/2)) { 
          startPage = totalPages - (maxPagesToShow -2) ;
        }
        
        if (startPage > 2) {
            pageNumbers.push(<span key="start-ellipsis" className="mx-1 p-2">...</span>);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <Button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    variant={i === currentPage ? 'primary' : 'ghost'}
                    size="sm"
                    className="mx-1"
                >
                    {i}
                </Button>
            );
        }

        if (endPage < totalPages - 1) {
            pageNumbers.push(<span key="end-ellipsis" className="mx-1 p-2">...</span>);
        }
        
        pageNumbers.push(
             <Button key={totalPages} onClick={() => handlePageChange(totalPages)} variant={totalPages === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{totalPages}</Button>
        );
    }
    return pageNumbers;
  };


  if (isLoading) return <Spinner message="Loading all reports..." />;
  if (!currentUser) return null; 

  return (
    <Card title="All Submitted EOD Reports" titleIcon={<i className="fas fa-archive"></i>} actions={
      <Button onClick={handleExportData} variant="secondary" icon={<i className="fas fa-file-export"></i>} disabled={filteredAndSortedReports.length === 0}>Export Filtered Data ({filteredAndSortedReports.length})</Button>
    }>
      <div className="mb-4 p-3 border rounded-md bg-surface-secondary dark:bg-dark-surface-secondary dark:border-dark-border">
        <h3 className="text-base font-medium text-primary dark:text-sky-400 mb-1">Filter Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end"> 
          <Input
            type="text"
            placeholder="Search (name, tasks, BU...)"
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            wrapperClassName="mb-0" 
          />
          <Select
            options={[{ value: '', label: 'All Users' }, ...employeeOptions]}
            value={filters.employeeId}
            onChange={(e) => handleFilterChange('employeeId', e.target.value)}
            wrapperClassName="mb-0" 
            placeholder="Filter by User"
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: ReportStatus.PENDING_ACKNOWLEDGMENT, label: 'Pending Acknowledgment' },
              { value: ReportStatus.ACKNOWLEDGED, label: 'Acknowledged' },
            ]}
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value as ReportStatus | '')}
            wrapperClassName="mb-0" 
            placeholder="Filter by Status"
          />
           <Select
            options={businessUnitOptions}
            value={filters.businessUnitId}
            onChange={(e) => handleFilterChange('businessUnitId', e.target.value)}
            wrapperClassName="mb-0" 
            placeholder="Filter by Business Unit"
          />
          <Input
            type="date"
            label="Start Date"
            value={filters.dateRange.startDate || ''}
            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, startDate: e.target.value || null })}
            wrapperClassName="mb-0" 
          />
          <Input
            type="date"
            label="End Date"
            value={filters.dateRange.endDate || ''}
            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, endDate: e.target.value || null })}
            wrapperClassName="mb-0" 
          />
           <div className="lg:col-span-2"> 
             <Button onClick={resetFilters} variant="ghost" className="w-full">Reset Filters</Button>
           </div>
        </div>
      </div>

      {filteredAndSortedReports.length === 0 ? (
        <p className="text-center text-text-secondary dark:text-dark-text-secondary py-8">No reports match your current filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
              <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('employeeName')}>
                    Employee {getSortIcon('employeeName')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('date')}>
                    Report Date {getSortIcon('date')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Tasks (Latest)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('status')}>
                    Status {getSortIcon('status')}
                  </th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider cursor-pointer" onClick={() => requestSort('businessUnitName')}>
                    Business Unit {getSortIcon('businessUnitName')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Info</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
                {reportsForCurrentPage.map(report => {
                    const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
                    if (!latestVersion) return null;
                    const employee = allUsers.find(u => u.id === report.employeeId);
                    return (
                        <tr key={report.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text">{report.employeeName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{formatDateDDMonYYYY(report.date)}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-text-secondary dark:text-dark-text-secondary max-w-sm break-words">
                                {latestVersion.tasksCompleted.substring(0,70)}{latestVersion.tasksCompleted.length > 70 ? '...' : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-0.5 inline-block text-xs font-semibold rounded-full ${report.status === ReportStatus.ACKNOWLEDGED ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                                {report.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{employee?.businessUnitName || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                                {report.submittedOnWeekOff && <span className="block text-xs text-blue-600 dark:text-blue-400 mb-0.5" title="Submitted on Week Off"><i className="fas fa-calendar-check mr-1"></i>On Week Off</span>}
                                {latestVersion.attachments && latestVersion.attachments.length > 0 && <span className="block text-xs text-gray-600 dark:text-slate-400 mb-0.5" title={`${latestVersion.attachments.length} attachment(s)`}><i className="fas fa-paperclip mr-1"></i>{latestVersion.attachments.length} Attach.</span>}
                                {report.versions.length > 1 && <span className="block text-xs text-purple-600 dark:text-purple-400" title={`Edited (V${latestVersion.versionNumber})`}><i className="fas fa-history mr-1"></i>V{latestVersion.versionNumber}</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Button onClick={() => setSelectedReport(report)} variant="ghost" size="sm" icon={<i className="fas fa-eye"></i>}>Details</Button>
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  Page {currentPage} of {totalPages} (Total reports: {filteredAndSortedReports.length})
                </span>
                <div className="flex items-center">
                  <Button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1}
                    variant="ghost"
                    size="sm"
                    icon={<i className="fas fa-chevron-left"></i>}
                    className="mr-2"
                  >
                    Prev
                  </Button>
                  {renderPageNumbers()}
                  <Button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    variant="ghost"
                    size="sm"
                    icon={<i className="fas fa-chevron-right"></i>}
                    className="ml-2"
                  >
                    Next
                  </Button>
                </div>
            </div>
          )}
        </>
      )}

      {selectedReport && currentUser && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          currentUser={currentUser} 
          onReportUpdate={handleReportUpdateFromModal} 
        />
      )}
    </Card>
  );
};

export default AdminReportView;