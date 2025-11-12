
import React, { useState, useEffect } from 'react';
import PageContainer from '../Layout/PageContainer';
import LeaveRecordsTable from './LeaveRecordsTable';

import * as DataService from '../../services/dataService';
import { LeaveRecord, User, BusinessUnit, Permission } from '../../types';
import Spinner from '../Common/Spinner';
import { useAuth } from '../Auth/AuthContext';

const AdminLeaveManagementPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allBusinessUnits, setAllBusinessUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [leaves, users, bus] = await Promise.all([
          DataService.getLeaveRecords(),
          DataService.getUsers(),
          DataService.getBusinessUnits()
      ]);
      setLeaveRecords(leaves);
      setAllUsers(users);
      setAllBusinessUnits(bus);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <PageContainer title="Manage Leave Records">
        <Spinner message="Loading leave records..." />
      </PageContainer>
    );
  }

  const canViewEntireTenant =
    hasPermission(Permission.CAN_VIEW_ALL_REPORTS) ||
    currentUser?.roleName === 'HR' ||
    currentUser?.isPlatformAdmin;

  const scopedBusinessUnitId = currentUser?.businessUnitId;
  const scopedUsers = canViewEntireTenant
    ? allUsers
    : scopedBusinessUnitId
      ? allUsers.filter(user => user.businessUnitId === scopedBusinessUnitId)
      : [];
  const scopedUserIds = new Set(scopedUsers.map(user => user.id));
  const scopedLeaveRecords = canViewEntireTenant
    ? leaveRecords
    : scopedBusinessUnitId
      ? leaveRecords.filter(record => scopedUserIds.has(record.employeeId))
      : [];
  const scopedBusinessUnits = canViewEntireTenant
    ? allBusinessUnits
    : scopedBusinessUnitId
      ? allBusinessUnits.filter(bu => bu.id === scopedBusinessUnitId)
      : [];

  return (
    <PageContainer title="Manage All Employee Leave Records">
      <LeaveRecordsTable
        allLeaveRecords={scopedLeaveRecords}
        allUsers={scopedUsers}
        allBusinessUnits={scopedBusinessUnits}
      />
    </PageContainer>
  );
};

export default AdminLeaveManagementPage;
