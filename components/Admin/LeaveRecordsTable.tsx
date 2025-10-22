import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LeaveRecord, User, BusinessUnit, DateRange } from '../../types';
import Card from '../Common/Card';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { WEEK_DAYS } from '../../constants'; 
import { formatDateDDMonYYYY, formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import { useSearchParams } from 'react-router-dom';

interface LeaveRecordsTableProps {
  allLeaveRecords: LeaveRecord[];
  allUsers: User[];
  allBusinessUnits: BusinessUnit[];
}

const LEAVE_RECORDS_PER_PAGE = 15;

const LeaveRecordsTable: React.FC<LeaveRecordsTableProps> = ({
  allLeaveRecords,
  allUsers,
  allBusinessUnits,
}) => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(false); 
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const searchTerm = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || null;
  const endDate = searchParams.get('endDate') || null;
  const employeeId = searchParams.get('employee') || '';
  const businessUnitId = searchParams.get('bu') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const employeeOptions = useMemo(() => {
    return allUsers
      .filter(user => user.roleName === 'Employee')
      .map(user => ({ value: user.id, label: user.name }));
  }, [allUsers]);

  const businessUnitOptions = useMemo(() => {
    return allBusinessUnits.map(bu => ({ value: bu.id, label: bu.name }));
  }, [allBusinessUnits]);

  const filteredLeaveRecords = useMemo(() => {
    return allLeaveRecords
      .filter(record => {
        const employee = allUsers.find(u => u.id === record.employeeId);
        if (!employee || employee.roleName !== 'Employee') {
            return false;
        }

        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch =
          record.employeeName.toLowerCase().includes(searchTermLower) ||
          (employee?.email && employee.email.toLowerCase().includes(searchTermLower)) ||
          (employee?.designation && employee.designation.toLowerCase().includes(searchTermLower)) ||
          (record.reason && record.reason.toLowerCase().includes(searchTermLower));

        const matchesEmployee = employeeId ? record.employeeId === employeeId : true;
        
        const recordDate = new Date(record.date + 'T00:00:00Z');
        const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;
        const matchesDateRange = (!start || recordDate >= start) && (!end || recordDate <= end);

        const matchesBusinessUnit = businessUnitId ? (employee && employee.businessUnitId === businessUnitId) : true;

        return matchesSearch && matchesEmployee && matchesDateRange && matchesBusinessUnit;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName));
  }, [allLeaveRecords, searchTerm, startDate, endDate, employeeId, businessUnitId, allUsers]);

  const totalPages = Math.ceil(filteredLeaveRecords.length / LEAVE_RECORDS_PER_PAGE);
  const recordsForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * LEAVE_RECORDS_PER_PAGE;
    return filteredLeaveRecords.slice(startIndex, startIndex + LEAVE_RECORDS_PER_PAGE);
  }, [filteredLeaveRecords, currentPage]);

  const updateSearchParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    if(key !== 'page') newParams.delete('page');
    setSearchParams(newParams);
  };
  
  const handleDateChange = (key: 'startDate' | 'endDate', value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    
    const currentStartDate = newParams.get('startDate');
    const currentEndDate = newParams.get('endDate');

    if (currentStartDate && currentEndDate && currentStartDate > currentEndDate) {
      addToast("Start date cannot be after end date.", 'error');
      return;
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    setSearchParams({});
  };
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      updateSearchParams('page', String(page));
    }
  };


  const getExportData = () => { 
    return filteredLeaveRecords.map(record => {
      const employee = allUsers.find(u => u.id === record.employeeId);
      return {
        "Employee ID": record.employeeId,
        "Employee Name": record.employeeName,
        "Employee Email": employee?.email || 'N/A',
        "Designation": employee?.designation || 'N/A',
        "Business Unit": record.businessUnitName || 'N/A',
        "Leave Date": formatDateDDMonYYYY(record.date),
        "Leave Status": record.status, 
        "Reason": record.reason || 'N/A',
        "Marked At": formatDateTimeDDMonYYYYHHMM(record.createdAt),
      };
    });
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    setIsLoading(true);
    const dataToExport = getExportData();
    if (dataToExport.length === 0) {
      alert("No data to export based on current filters.");
      setIsLoading(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100)); 

    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0]);
      const csvContent = "data:text/csv;charset=utf-8,"
          + headers.join(",") + "\n"
          + dataToExport.map(row => headers.map(header => `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "leave_records.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape' });
      const headers = Object.keys(dataToExport[0]);
      const body = dataToExport.map(row => headers.map(header => String(row[header as keyof typeof row])));
      autoTable(doc, {
        head: [headers],
        body: body,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [0, 85, 164], fontSize: 8 },
        margin: { top: 10, right: 7, bottom: 10, left: 7 },
      });
      doc.save('leave_records.pdf');
    } else if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Records");
      XLSX.writeFile(workbook, "leave_records.xlsx");
    }
    setIsExportDropdownOpen(false);
    setIsLoading(false);
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
        if (currentPage <= Math.ceil(maxPagesToShow/2)) {
            endPage = maxPagesToShow - 1;
        } else if (currentPage > totalPages - Math.ceil(maxPagesToShow / 2)) {
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

  if (isLoading && !recordsForCurrentPage.length && !filteredLeaveRecords.length) {
    return <Spinner message="Loading leave records..." />;
  }

  return (
    <Card 
      title="Employee Leave Records" 
      titleIcon={<i className="fas fa-calendar-times"></i>}
      actions={
        <div className="relative" ref={exportDropdownRef}>
            <Button
                variant="secondary"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                icon={<i className="fas fa-file-export"></i>}
                disabled={filteredLeaveRecords.length === 0 || isLoading}
                isLoading={isLoading}
            >
                Export ({filteredLeaveRecords.length})
                <i className={`fas fa-chevron-down ml-2 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`}></i>
            </Button>
            {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-primary dark:bg-dark-surface-primary rounded-md shadow-lg py-1 z-20 border border-border-primary dark:border-dark-border">
                <button onClick={() => handleExport('csv')} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-csv mr-2"></i>Export as CSV</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-pdf mr-2"></i>Export as PDF</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-excel mr-2"></i>Export as Excel</button>
                </div>
            )}
        </div>
      }
    >
      <div className="mb-4 p-3 border rounded-md bg-surface-secondary dark:bg-dark-surface-secondary dark:border-dark-border">
        <h3 className="text-base font-medium text-primary dark:text-sky-400 mb-1">Filter Leave Records</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Input
            type="text"
            placeholder="Search (name, email, design., reason...)"
            value={searchTerm}
            onChange={(e) => updateSearchParams('search', e.target.value)}
            wrapperClassName="mb-0"
          />
          <Select
            options={[{ value: '', label: 'All Employees' }, ...employeeOptions]}
            value={employeeId}
            onChange={(e) => updateSearchParams('employee', e.target.value)}
            wrapperClassName="mb-0"
            placeholder="Filter by Employee"
          />
          <Select
            options={[{ value: '', label: 'All Business Units' }, ...businessUnitOptions]}
            value={businessUnitId}
            onChange={(e) => updateSearchParams('bu', e.target.value)}
            wrapperClassName="mb-0"
            placeholder="Filter by Business Unit"
          />
           <Input
            type="date"
            label="Leave Start Date"
            value={startDate || ''}
            onChange={(e) => handleDateChange('startDate', e.target.value || null)}
            max={endDate || undefined}
            wrapperClassName="mb-0"
          />
          <Input
            type="date"
            label="Leave End Date"
            value={endDate || ''}
            onChange={(e) => handleDateChange('endDate', e.target.value || null)}
            min={startDate || undefined}
            wrapperClassName="mb-0"
          />
          <div className="lg:col-start-4"> 
            <Button onClick={resetFilters} variant="ghost" className="w-full">Reset Filters</Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
          <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Employee Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Business Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Leave Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Marked At</th>
            </tr>
          </thead>
          <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
            {recordsForCurrentPage.map(record => {
              const employee = allUsers.find(u => u.id === record.employeeId);
              return (
                <tr key={record.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text">{record.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{employee?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{employee?.designation || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{record.businessUnitName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{formatDateDDMonYYYY(record.date)}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-text-secondary dark:text-dark-text-secondary break-words max-w-xs">{record.reason || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{formatDateTimeDDMonYYYYHHMM(record.createdAt)}</td>
                </tr>
              );
            })}
            {filteredLeaveRecords.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">No leave records match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Page {currentPage} of {totalPages} (Total records: {filteredLeaveRecords.length})
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
    </Card>
  );
};

export default LeaveRecordsTable;