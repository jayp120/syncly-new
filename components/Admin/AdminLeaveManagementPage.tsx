
import React, { useState, useEffect } from 'react';
import PageContainer from '../Layout/PageContainer';
import LeaveRecordsTable from './LeaveRecordsTable';

import * as DataService from '../../services/dataService';
import { LeaveRecord, User, BusinessUnit } from '../../types';
import Spinner from '../Common/Spinner';

const AdminLeaveManagementPage: React.FC = () => {
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

  return (
    <PageContainer title="Manage All Employee Leave Records">
      <LeaveRecordsTable
        allLeaveRecords={leaveRecords}
        allUsers={allUsers}
        allBusinessUnits={allBusinessUnits}
      />
    </PageContainer>
  );
};

export default AdminLeaveManagementPage;
