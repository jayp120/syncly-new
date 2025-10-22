import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EODReport, User, ReportStatus, ReportVersion } from '../../types';
import * as DataService from '../../services/dataService';
import ReportDetailModal from '../Shared/ReportDetailModal';
import Spinner from '../Common/Spinner';
import Card from '../Common/Card';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import ReportCard from './ReportCard';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
// FIX: Corrected react-router-dom import to use a standard named import.
import { useSearchParams, Link } from "react-router-dom";
import EmptyState from '../Common/EmptyState';

interface MyReportsListProps {
  currentUser: User;
}

type SortKey = 'date' | 'status' | 'versions';
interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

const REPORTS_PER_PAGE_EMPLOYEE = 10; 

const MyReportsList: React.FC<MyReportsListProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<EODReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const statusFilter = (searchParams.get('status') as ReportStatus) || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortKey = (searchParams.get('sortKey') as SortKey) || 'date';
  const sortDirection = (searchParams.get('sortDir') as 'ascending' | 'descending') || 'descending';

  const sortConfig: SortConfig = { key: sortKey, direction: sortDirection };

  useEffect(() => {
    const fetchReports = async () => {
        setIsLoading(true);
        const userReports = await DataService.getReportsByEmployee(currentUser.id);
        setReports(userReports);
        setIsLoading(false);
    };
    fetchReports();
  }, [currentUser.id]);

  const handleReportUpdate = async (updatedReport: EODReport) => {
    setReports(prevReports => 
      prevReports.map(r => r.id === updatedReport.id ? updatedReport : r)
    );
    if (selectedReport && selectedReport.id === updatedReport.id) {
        setSelectedReport(updatedReport);
    }
    const userReports = await DataService.getReportsByEmployee(currentUser.id);
    setReports(userReports);
  };
  
  const updateSearchParams = (updates: Record<string, string | null>) => {
    setSearchParams(prev => {
        Object.entries(updates).forEach(([key, value]) => {
            if (value) {
                prev.set(key, value);
            } else {
                prev.delete(key);
            }
        });
        return prev;
    }, { replace: true });
  };
  
  const handleFilterChange = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    handleFilterChange({ sortKey: key, sortDir: direction });
  };
  
  const handlePageChange = (page: number) => {
    updateSearchParams({ page: String(page) });
  };

  const allFilteredAndSortedReports = useMemo(() => {
    let sortableReports = [...reports];
    if (sortConfig !== null) {
      sortableReports.sort((a, b) => {
        let valA: any, valB: any;
        switch(sortConfig.key) {
            case 'date': valA = a.submittedAt; valB = b.submittedAt; break;
            case 'versions': valA = a.versions.length; valB = b.versions.length; break;
            case 'status': valA = a.status; valB = b.status; break;
            default: valA = a[sortConfig.key as keyof EODReport]; valB = b[sortConfig.key as keyof EODReport];
        }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (sortConfig.key !== 'date') return b.submittedAt - a.submittedAt;
        return 0;
      });
    }

    return sortableReports
      .filter(report => {
        const searchTermLower = searchTerm.toLowerCase();
        const latestVersion = report.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
        if (!latestVersion) return false;

        return (
          (latestVersion.tasksCompleted || '').toLowerCase().includes(searchTermLower) ||
          (latestVersion.challengesFaced && latestVersion.challengesFaced.toLowerCase().includes(searchTermLower)) ||
          (latestVersion.planForTomorrow && latestVersion.planForTomorrow.toLowerCase().includes(searchTermLower)) ||
          report.date.includes(searchTermLower) ||
          formatDateDDMonYYYY(report.date).toLowerCase().includes(searchTermLower)
        );
      })
      .filter(report => statusFilter ? report.status === statusFilter : true);
  }, [reports, searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.ceil(allFilteredAndSortedReports.length / REPORTS_PER_PAGE_EMPLOYEE);
  const reportsForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * REPORTS_PER_PAGE_EMPLOYEE;
    return allFilteredAndSortedReports.slice(startIndex, startIndex + REPORTS_PER_PAGE_EMPLOYEE);
  }, [allFilteredAndSortedReports, currentPage]);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 3; 
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
        if (currentPage <= Math.ceil(maxPagesToShow / 2)) endPage = maxPagesToShow - 1;
        else if (currentPage > totalPages - Math.ceil(maxPagesToShow / 2)) startPage = totalPages - (maxPagesToShow - 2);
        if (startPage > 2) pageNumbers.push(<span key="start-ellipsis" className="mx-1 p-2">...</span>);
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(<Button key={i} onClick={() => handlePageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{i}</Button>);
        }
        if (endPage < totalPages - 1) pageNumbers.push(<span key="end-ellipsis" className="mx-1 p-2">...</span>);
        pageNumbers.push(<Button key={totalPages} onClick={() => handlePageChange(totalPages)} variant={totalPages === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">{totalPages}</Button>);
    }
    return pageNumbers;
  };

  if (isLoading) {
    return <Spinner message="Loading your reports..." />;
  }

  return (
    <Card title="My EOD Reports" titleIcon={<i className="fas fa-history"></i>}>
      <div className="mb-4 p-4 rounded-lg bg-surface-secondary dark:bg-dark-surface-secondary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="Search reports (latest tasks, date...)"
            value={searchTerm}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            wrapperClassName="mb-0"
          />
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: ReportStatus.PENDING_ACKNOWLEDGMENT, label: 'Pending Acknowledgment' },
              { value: ReportStatus.ACKNOWLEDGED, label: 'Acknowledged' },
            ]}
            value={statusFilter}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
            wrapperClassName="mb-0"
            placeholder="Filter by Status"
          />
        </div>
      </div>

      {allFilteredAndSortedReports.length === 0 ? (
        <EmptyState
          icon={<i className="fas fa-file-alt"></i>}
          title={searchTerm || statusFilter ? "No Reports Match" : "No Reports Yet"}
          message={
            searchTerm || statusFilter
              ? "No reports matched your search or filter criteria. Try adjusting your filters."
              : "You haven't submitted any EOD reports yet. Let's get started!"
          }
          cta={
            !searchTerm && !statusFilter ? (
              <Button to="/submit-eod/today" variant="primary" icon={<i className="fas fa-plus"></i>}>
                Submit Your First Report
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
            <div className="space-y-4">
                {reportsForCurrentPage.map(report => (
                    <ReportCard 
                        key={report.id}
                        report={report}
                        onViewDetails={setSelectedReport}
                    />
                ))}
            </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Page {currentPage} of {totalPages} (Total reports: {allFilteredAndSortedReports.length})
              </span>
              <div className="flex items-center">
                <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} variant="ghost" size="sm" icon={<i className="fas fa-chevron-left"></i>} className="mr-2">Prev</Button>
                {renderPageNumbers()}
                <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="ghost" size="sm" icon={<i className="fas fa-chevron-right"></i>} className="ml-2">Next</Button>
              </div>
            </div>
          )}
        </>
      )}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          currentUser={currentUser}
          onReportUpdate={handleReportUpdate}
        />
      )}
    </Card>
  );
};

export default MyReportsList;