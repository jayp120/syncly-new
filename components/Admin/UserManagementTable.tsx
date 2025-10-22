import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, BusinessUnit, UserStatus, Permission, Role } from '../../types';
import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import UserForm from './UserForm';
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import Input from '../Common/Input';
import Select from '../Common/Select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import UserAvatar from '../Common/UserAvatar';
import * as ReactRouterDom from "react-router-dom";
const { useSearchParams } = ReactRouterDom;
import ConfirmationModal from '../Common/ConfirmationModal';
import { useAuth } from '../Auth/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const USERS_PER_PAGE = 10;

const UserManagementTable: React.FC = () => {
  const { currentUser: adminUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserFormModal, setShowUserFormModal] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<User | null>(null);
  const [userToUpdateStatus, setUserToUpdateStatus] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: React.ReactNode } | null>(null);
  const { addToast } = useToast();

  const [availableBusinessUnits, setAvailableBusinessUnits] = useState<BusinessUnit[]>([]);
  
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || '';
  const businessUnitFilter = searchParams.get('bu') || '';
  const statusFilter = (searchParams.get('status') as UserStatus | 'all') || UserStatus.ACTIVE;
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


  const fetchUsersAndBUs = useCallback(async () => {
    setIsLoading(true);
    console.log('[UserManagement] Fetching users for tenant admin:', adminUser?.email);
    console.log('[UserManagement] Admin user tenant:', adminUser?.tenantId);
    
    try {
      const [allUsers, allRoles, allBUs] = await Promise.all([
          DataService.getUsers(),
          DataService.getRoles(),
          DataService.getBusinessUnits()
      ]);
      
      console.log('[UserManagement] SUCCESS - Fetched users count:', allUsers.length);
      console.log('[UserManagement] Showing users:', allUsers.map(u => ({ email: u.email, role: u.roleName, tenantId: u.tenantId })));
      
      // Don't filter by roleId - show all tenant users (Admin, Manager, Employee)
      setUsers(allUsers); 
      setRoles(allRoles);
      setAvailableBusinessUnits(allBUs);
    } catch (error: any) {
      console.error('[UserManagement] ERROR fetching users:', error);
      addToast('Error loading users: ' + error.message, 'error');
    }
    
    setIsLoading(false);
  }, [adminUser]);

  useEffect(() => {
    fetchUsersAndBUs();
  }, [fetchUsersAndBUs]);

  const handleAddUser = () => {
    setCurrentUserToEdit(null);
    setShowUserFormModal(true);
  };

  const handleEditUser = (user: User) => {
    setCurrentUserToEdit(user);
    setShowUserFormModal(true);
  };
  
  const handleUpdateUserStatus = (user: User) => {
      setUserToUpdateStatus(user);
  }

  const confirmUpdateUserStatus = async () => {
      if(!userToUpdateStatus || !adminUser) return;
      
      const isArchiving = userToUpdateStatus.status === UserStatus.ACTIVE;
      const newStatus = isArchiving ? UserStatus.ARCHIVED : UserStatus.ACTIVE;
      
      const updatedUser = {...userToUpdateStatus, status: newStatus };
      const result = await DataService.updateUser(updatedUser, adminUser);
      
      if(result){
          addToast(`User ${userToUpdateStatus.name} has been ${isArchiving ? 'archived' : 're-activated'}.`, 'success');
          fetchUsersAndBUs();
      } else {
          addToast('Failed to update user status.', 'error');
      }
      setUserToUpdateStatus(null);
  }

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
  }

  const confirmPermanentDelete = async () => {
    if (!userToDelete || !adminUser) return;
    try {
        await DataService.permanentlyDeleteUser(userToDelete.id, adminUser);
        addToast(`User ${userToDelete.name} permanently deleted.`, 'success');
        fetchUsersAndBUs();
    } catch (error: any) {
        addToast(`Error deleting user: ${error.message}`, 'error');
    } finally {
        setUserToDelete(null);
    }
  };

  const handleFormSubmit = async (user: User, isNew: boolean) => {
    console.log('[UserManagement] User form submitted:', { user, isNew });
    addToast(`User "${user.name}" ${isNew ? 'added' : 'updated'} successfully.`, 'success');
    setShowUserFormModal(false);
    
    console.log('[UserManagement] Refreshing user list after creation...');
    
    // CRITICAL: Force fresh fetch to bypass cache
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for Firestore propagation
    await fetchUsersAndBUs();
    
    console.log('[UserManagement] User list refresh COMPLETE');
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
        if (!updates.hasOwnProperty('page')) {
            prev.delete('page');
        }
        return prev;
    }, { replace: true });
  };

  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter(user => {
        const term = searchTerm.toLowerCase();
        return (
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          (user.designation && user.designation.toLowerCase().includes(term))
        );
      })
      .filter(user => roleFilter ? user.roleId === roleFilter : true)
      .filter(user => businessUnitFilter ? user.businessUnitId === businessUnitFilter : true)
      .filter(user => statusFilter !== 'all' ? user.status === statusFilter : true)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, roleFilter, businessUnitFilter, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / USERS_PER_PAGE);
  const usersForCurrentPage = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    return filteredAndSortedUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredAndSortedUsers, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      updateSearchParams({ page: String(page) });
    }
  };

  const getExportData = () => {
    return filteredAndSortedUsers.map(user => ({
      "User ID": user.id,
      "Name": user.name,
      "Email": user.email,
      "Role": user.roleName || 'N/A',
      "Business Unit": user.businessUnitName || 'N/A',
      "Designation": user.designation || 'N/A',
      "Status": user.status,
      "Weekly Off Day": user.weeklyOffDay || 'N/A',
    }));
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
    link.setAttribute("download", "user_management_export.csv");
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
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 85, 164] },
      margin: { top: 10, right: 5, bottom: 10, left: 5 },
      tableWidth: 'auto',
    });
    doc.save('user_management_export.pdf');
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "user_management_export.xlsx");
    setIsExportDropdownOpen(false);
  };

  const renderPageNumbers = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    // Logic for displaying page numbers (e.g., with ellipsis)
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(
        <Button key={i} onClick={() => handlePageChange(i)} variant={i === currentPage ? 'primary' : 'ghost'} size="sm" className="mx-1">
          {i}
        </Button>
      );
    }
    return pageNumbers;
  };

  if (isLoading) {
    return <Spinner message="Loading user data..." />;
  }

  return (
    <>
      <Card
        title="User Management"
        titleIcon={<i className="fas fa-users-cog"></i>}
        actions={
          <div className="flex items-center space-x-2">
             <div className="relative" ref={exportDropdownRef}>
                <Button variant="secondary" onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} icon={<i className="fas fa-file-export"></i>} disabled={filteredAndSortedUsers.length === 0}>Export ({filteredAndSortedUsers.length})<i className={`fas fa-chevron-down ml-2 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`}></i></Button>
                {isExportDropdownOpen && (<div className="absolute right-0 mt-2 w-48 bg-surface-primary dark:bg-dark-surface-primary rounded-md shadow-lg py-1 z-20 border border-border-primary dark:border-dark-border">
                    <button onClick={handleExportCSV} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-primary-light dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-csv mr-2"></i>Export as CSV</button>
                    <button onClick={handleExportPDF} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-primary-light dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-pdf mr-2"></i>Export as PDF</button>
                    <button onClick={handleExportExcel} className="w-full text-left block px-4 py-2 text-sm text-text-primary dark:text-dark-text hover:bg-primary-light dark:hover:bg-dark-surface-hover hover:text-primary"><i className="fas fa-file-excel mr-2"></i>Export as Excel</button>
                </div>)}
            </div>
            {hasPermission(Permission.CAN_CREATE_USER) && <Button onClick={handleAddUser} variant="primary" icon={<i className="fas fa-user-plus"></i>}>Add User</Button>}
          </div>
        }
      >
        <div className="mb-4 p-3 bg-surface-secondary dark:bg-dark-surface-secondary rounded-lg border dark:border-dark-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input type="text" placeholder="Search by name, email, designation..." value={searchTerm} onChange={(e) => updateSearchParams({ search: e.target.value })} wrapperClassName="mb-0"/>
                <Select options={[{value: '', label: 'All Roles'}, ...roles.map(r => ({value: r.id, label: r.name}))]} value={roleFilter} onChange={(e) => updateSearchParams({ role: e.target.value })} wrapperClassName="mb-0"/>
                <Select options={[{value: '', label: 'All Business Units'}, ...availableBusinessUnits.map(bu => ({value: bu.id, label: bu.name}))]} value={businessUnitFilter} onChange={(e) => updateSearchParams({ bu: e.target.value })} wrapperClassName="mb-0"/>
                <Select options={[{value: 'all', label: 'All Statuses'}, {value: UserStatus.ACTIVE, label: 'Active'}, {value: UserStatus.ARCHIVED, label: 'Archived'}]} value={statusFilter} onChange={(e) => updateSearchParams({ status: e.target.value })} wrapperClassName="mb-0"/>
            </div>
        </div>

        {feedback && <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
            <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Business Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
              {usersForCurrentPage.map(user => (
                <tr key={user.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                       <UserAvatar name={user.name} size="md" className="mr-3"/>
                      <div>
                        <div className="text-sm font-medium text-text-primary dark:text-dark-text">{user.name}</div>
                        <div className="text-xs text-text-secondary dark:text-dark-text-secondary">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{user.roleName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{user.businessUnitName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>{user.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        {hasPermission(Permission.CAN_EDIT_USER) && <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>Edit</Button>}
                        {user.status === UserStatus.ACTIVE && hasPermission(Permission.CAN_ARCHIVE_USER) && <Button variant="warning" size="sm" onClick={() => handleUpdateUserStatus(user)}>Archive</Button>}
                        {user.status === UserStatus.ARCHIVED && hasPermission(Permission.CAN_ARCHIVE_USER) && <Button variant="success" size="sm" onClick={() => handleUpdateUserStatus(user)}>Unarchive</Button>}
                        {user.status === UserStatus.ARCHIVED && hasPermission(Permission.CAN_DELETE_ARCHIVED_USER) && <Button variant="danger" size="sm" onClick={() => handleDeleteUser(user)}>Delete</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">Page {currentPage} of {totalPages}</span>
                <div>
                    <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} variant="ghost" size="sm">Previous</Button>
                    <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="ghost" size="sm" className="ml-2">Next</Button>
                </div>
            </div>
        )}
      </Card>
      
      {/* Modals */}
      <Modal isOpen={showUserFormModal} onClose={() => setShowUserFormModal(false)} title={currentUserToEdit ? 'Edit User' : 'Add New User'}>
        <UserForm currentUserToEdit={currentUserToEdit} onFormSubmit={handleFormSubmit} onCancel={() => setShowUserFormModal(false)} />
      </Modal>

      <ConfirmationModal
        isOpen={!!userToUpdateStatus}
        onClose={() => setUserToUpdateStatus(null)}
        onConfirm={confirmUpdateUserStatus}
        title={`Confirm User Status Change`}
        confirmButtonVariant={userToUpdateStatus?.status === UserStatus.ACTIVE ? 'warning' : 'success'}
        confirmText={userToUpdateStatus?.status === UserStatus.ACTIVE ? 'Yes, Archive' : 'Yes, Unarchive'}
      >
        <p>Are you sure you want to {userToUpdateStatus?.status === UserStatus.ACTIVE ? 'archive' : 'unarchive'} the user <strong>{userToUpdateStatus?.name}</strong>?</p>
        {userToUpdateStatus?.status === UserStatus.ACTIVE && <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Archived users cannot log in.</p>}
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmPermanentDelete}
        title={`Confirm Permanent Deletion`}
        confirmButtonVariant="danger"
        confirmText="Yes, Permanently Delete"
      >
        <p>Are you sure you want to permanently delete the user <strong>{userToDelete?.name}</strong>?</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">This action is irreversible and will delete all their associated data.</p>
      </ConfirmationModal>
    </>
  );
};

export default UserManagementTable;