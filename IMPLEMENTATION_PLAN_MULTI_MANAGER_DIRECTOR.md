# Implementation Plan: Multi-Manager Acknowledgment & Director Role

**Date:** October 22, 2025  
**Project:** Syncly Multi-Tenant SaaS  
**Status:** 📋 PLANNING PHASE

---

## 🎯 Overview

This document outlines the implementation plan for two major features:
1. **Multi-Manager Acknowledgment System** - Allow multiple managers to independently acknowledge the same EOD report
2. **Director Role** - Add a company-owner role with full visibility and manager permissions (except report submission)

---

## 📊 Feature 1: Multi-Manager Acknowledgment System

### Current System Analysis

**How it works now:**
- Each EOD report has **single acknowledgment** fields:
  - `acknowledgedByManagerId: string`
  - `acknowledgedAt: number`
- Once ANY manager acknowledges, status changes to `ACKNOWLEDGED`
- Other managers can't see the report needs acknowledgment anymore
- Employee sees only ONE manager acknowledged their report

**The Problem:**
- If Manager A acknowledges a report, Manager B (from same business unit) cannot acknowledge it
- Employee doesn't know which manager(s) reviewed their report
- No visibility into multi-manager review process

### Proposed Solution: Multiple Acknowledgments Array

#### 1. Database Schema Changes

**Update EODReport type in `types.ts`:**

```typescript
export interface EODReport {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  versions: ReportVersion[];
  status: ReportStatus;
  isLate: boolean;
  submittedAt: number;
  submittedOnWeekOff?: boolean;
  businessUnitId?: string;
  businessUnitName?: string;
  
  // OLD FIELDS - Keep for backward compatibility or remove after migration
  acknowledgedByManagerId?: string; 
  acknowledgedAt?: number;
  
  // NEW FIELD - Array of acknowledgments
  acknowledgments?: {
    managerId: string;
    managerName: string;
    acknowledgedAt: number;
    comment?: string; // Optional: Manager can add comment when acknowledging
  }[];
}
```

**Migration Strategy:**
- Keep old fields initially for backward compatibility
- Migrate existing acknowledgments to new array format
- After migration complete, remove old fields

#### 2. Business Logic Changes

**File: `services/dataService.ts`**

**Update `updateReportByManager` function:**

```typescript
export const acknowledgeReport = async (
  reportId: string, 
  manager: User,
  comment?: string
): Promise<EODReport> => {
  const report = await getReportById(reportId);
  if (!report) throw new Error('Report not found');
  
  // Initialize acknowledgments array if it doesn't exist
  if (!report.acknowledgments) {
    report.acknowledgments = [];
  }
  
  // Check if this manager already acknowledged
  const alreadyAcknowledged = report.acknowledgments.some(
    ack => ack.managerId === manager.id
  );
  
  if (alreadyAcknowledged) {
    throw new Error('You have already acknowledged this report');
  }
  
  // Add new acknowledgment
  report.acknowledgments.push({
    managerId: manager.id,
    managerName: manager.name,
    acknowledgedAt: Date.now(),
    comment: comment
  });
  
  // Change status to ACKNOWLEDGED only if this is the FIRST acknowledgment
  if (report.acknowledgments.length === 1) {
    report.status = ReportStatus.ACKNOWLEDGED;
  }
  
  // Update report
  await reportRepository.update(reportId, report);
  
  // Log activity for EACH acknowledgment
  await addActivityLog({
    timestamp: Date.now(),
    actorId: manager.id,
    actorName: manager.name,
    type: ActivityLogActionType.EOD_ACKNOWLEDGED,
    description: `acknowledged EOD report for`,
    targetId: report.id,
    targetName: formatDateDDMonYYYY(report.date),
    targetUserId: report.employeeId,
    targetUserName: report.employeeName
  });
  
  // Notify employee about EACH acknowledgment
  await addNotification({
    userId: report.employeeId,
    message: `${manager.name} acknowledged your EOD report for ${formatDateDDMonYYYY(report.date)}.`,
    type: 'info',
    link: `/my-reports`,
    actionType: 'EOD_ACKNOWLEDGED',
    targetId: report.id,
    actors: [{ id: manager.id, name: manager.name }],
    isCrucial: true
  });
  
  return report;
};
```

**Update batch acknowledgment function:**

```typescript
export const batchAcknowledgeReports = async (
  reportIds: string[], 
  manager: User
): Promise<void> => {
  // Acknowledge each report individually
  const acknowledgedReports: EODReport[] = [];
  
  for (const reportId of reportIds) {
    try {
      const report = await acknowledgeReport(reportId, manager);
      acknowledgedReports.push(report);
    } catch (error) {
      console.error(`Failed to acknowledge report ${reportId}:`, error);
      // Continue with other reports
    }
  }
  
  // Group notifications by employee
  const employeeNotifications: Record<string, EODReport[]> = {};
  for (const report of acknowledgedReports) {
    if (!employeeNotifications[report.employeeId]) {
      employeeNotifications[report.employeeId] = [];
    }
    employeeNotifications[report.employeeId].push(report);
  }
  
  // Send grouped notification to each employee
  for (const [employeeId, reports] of Object.entries(employeeNotifications)) {
    await addNotification({
      userId: employeeId,
      message: `${manager.name} acknowledged ${reports.length} of your EOD reports.`,
      type: 'info',
      link: '/my-reports',
      actionType: 'EOD_ACKNOWLEDGED',
      targetId: `batch-ack-${Date.now()}`,
      actors: reports.map(r => ({ id: r.id, name: formatDateDDMonYYYY(r.date) })),
      isCrucial: true
    });
  }
};
```

#### 3. Manager Dashboard Changes

**File: `components/Manager/ManageReportsPage.tsx`**

**Filter Logic Update:**
- Show reports that are **NOT yet acknowledged by THIS manager**
- Even if other managers have acknowledged, show it

```typescript
// BEFORE (current logic)
const pendingReports = reports.filter(r => r.status === ReportStatus.PENDING_ACKNOWLEDGMENT);

// AFTER (new logic)
const pendingReports = reports.filter(r => {
  // If no acknowledgments array, use old logic
  if (!r.acknowledgments || r.acknowledgments.length === 0) {
    return r.status === ReportStatus.PENDING_ACKNOWLEDGMENT;
  }
  
  // Check if THIS manager has NOT acknowledged yet
  const thisManagerAcknowledged = r.acknowledgments.some(
    ack => ack.managerId === currentUser.id
  );
  
  return !thisManagerAcknowledged;
});
```

**UI Updates:**
- Add column showing "Acknowledged By" with list of managers
- Add visual indicator if report has multiple acknowledgments
- Show manager's own acknowledgment status clearly

```typescript
// Example UI component
<div className="acknowledgments">
  {report.acknowledgments?.map(ack => (
    <div key={ack.managerId} className="acknowledgment-badge">
      <UserAvatar userId={ack.managerId} name={ack.managerName} size="sm" />
      <span>{ack.managerName}</span>
      <span className="text-xs text-gray-500">
        {formatDateTimeDDMonYYYYHHMM(ack.acknowledgedAt)}
      </span>
      {ack.comment && <p className="comment">{ack.comment}</p>}
    </div>
  ))}
</div>
```

#### 4. Employee Report View Changes

**File: `components/Employee/MyReportsPage.tsx`**

**Display All Acknowledgments:**
- Show ALL managers who acknowledged the report
- Display acknowledgment timestamps
- Show manager comments if any

```typescript
// Report detail view
{report.acknowledgments && report.acknowledgments.length > 0 && (
  <div className="acknowledgments-section">
    <h4>Acknowledged By:</h4>
    {report.acknowledgments.map(ack => (
      <div key={ack.managerId} className="ack-item">
        <UserAvatar userId={ack.managerId} name={ack.managerName} />
        <div>
          <p><strong>{ack.managerName}</strong></p>
          <p className="text-sm text-gray-500">
            {formatDateTimeDDMonYYYYHHMM(ack.acknowledgedAt)}
          </p>
          {ack.comment && (
            <p className="italic text-gray-600 mt-1">"{ack.comment}"</p>
          )}
        </div>
      </div>
    ))}
  </div>
)}
```

#### 5. Consistency Tracker Update

**File: `components/Manager/ConsistencyTracker.tsx`**

**Update Logic:**
- Count report as acknowledged if at least ONE manager acknowledged
- Show which managers acknowledged (optional detail view)

#### 6. Notification Updates

**Current notifications work correctly** - each manager gets notified separately when employee submits report, so no changes needed there.

#### 7. Testing Checklist

- [ ] Single manager can acknowledge report
- [ ] Multiple managers from same BU can acknowledge same report independently
- [ ] Manager cannot acknowledge same report twice
- [ ] Employee sees all acknowledgments
- [ ] Batch acknowledgment works for multiple reports
- [ ] Consistency Tracker shows correct counts
- [ ] Notifications sent to employee for each acknowledgment
- [ ] Activity log shows all acknowledgments
- [ ] Backward compatibility with old single-acknowledgment reports
- [ ] Multi-tenant isolation preserved

---

## 👔 Feature 2: Director Role Implementation

### Role Definition

**Director Role:**
- **Position:** Company Owner / Director
- **Scope:** Full tenant visibility across ALL business units
- **Permissions:** All manager permissions EXCEPT EOD report submission
- **Key Capabilities:**
  - View all reports from all business units
  - Acknowledge any report
  - Comment on any report
  - View all users, managers, tasks, meetings
  - Access Performance Hub for all business units
  - View Consistency Tracker for entire company
  - Cannot submit their own EOD reports

### Implementation Steps

#### 1. Add Director to Type System

**File: `types.ts`**

Add Director-specific permission:
```typescript
export enum Permission {
  // ... existing permissions ...
  
  // Director-specific (optional - or reuse existing permissions)
  CAN_VIEW_ALL_BUSINESS_UNITS = 'CAN_VIEW_ALL_BUSINESS_UNITS', // Cross-BU access
}
```

**No need to add new enum** - Director is just a role name like "Manager" or "Employee"

#### 2. Create Director Role in Default Roles

**File: `services/tenantProvisioning.ts`**

Add Director to default roles:
```typescript
const createDefaultRoles = async (tenantId: string): Promise<Role[]> => {
  const roles: Role[] = [
    {
      id: generateFirestoreId('role'),
      tenantId,
      name: 'Super Admin',
      description: 'Full system access with all permissions',
      permissions: Object.values(Permission) as Permission[]
    },
    {
      id: generateFirestoreId('role'),
      tenantId,
      name: 'Director',
      description: 'Company owner with full visibility (cannot submit reports)',
      permissions: [
        // All report viewing/management permissions
        Permission.CAN_VIEW_ALL_REPORTS,
        Permission.CAN_MANAGE_TEAM_REPORTS,
        Permission.CAN_ACKNOWLEDGE_REPORTS,
        Permission.CAN_VIEW_OWN_REPORTS,
        // Note: NO CAN_SUBMIT_OWN_EOD permission
        
        // All task management permissions
        Permission.CAN_MANAGE_TEAM_TASKS,
        Permission.CAN_CREATE_PERSONAL_TASKS,
        Permission.CAN_EDIT_ANY_TASK_STATUS,
        
        // All meeting permissions
        Permission.CAN_MANAGE_TEAM_MEETINGS,
        Permission.CAN_VIEW_OWN_MEETINGS,
        
        // All leave management
        Permission.CAN_MANAGE_ALL_LEAVES,
        Permission.CAN_SUBMIT_OWN_LEAVE,
        
        // Analytics and reporting
        Permission.CAN_USE_PERFORMANCE_HUB,
        Permission.CAN_VIEW_LEADERBOARD,
        Permission.CAN_VIEW_TRIGGER_LOG,
        
        // Calendar permissions
        Permission.CAN_VIEW_TEAM_CALENDAR,
        Permission.CAN_VIEW_OWN_CALENDAR,
        
        // Optional: Business unit management
        Permission.CAN_VIEW_ALL_BUSINESS_UNITS, // If you add this new permission
      ]
    },
    {
      id: generateFirestoreId('role'),
      tenantId,
      name: 'Manager',
      description: 'Team management and oversight',
      permissions: [
        // ... existing manager permissions ...
      ]
    },
    {
      id: generateFirestoreId('role'),
      tenantId,
      name: 'Employee',
      description: 'Standard employee access',
      permissions: [
        // ... existing employee permissions ...
      ]
    }
  ];

  for (const role of roles) {
    await roleRepository.create(role.id, role);
  }

  return roles;
};
```

#### 3. Update Helper Functions

**File: `services/dataService.ts`**

Add helper to check if user is Director:
```typescript
export const isDirector = (roleName?: string): boolean => {
  return roleName === 'Director';
};

// Update existing helper
export const isManagerOrAdmin = (roleName?: string): boolean => {
  return roleName === 'Manager' || 
         roleName === 'Super Admin' || 
         roleName === 'Admin' ||
         roleName === 'Director'; // Add Director
};
```

#### 4. Update Report Fetching Logic

**File: `services/dataService.ts`**

Update `getReports` to handle Director cross-BU access:
```typescript
export const getReports = async (): Promise<EODReport[]> => {
  const currentUser = getAuthUser();
  const allReports = await reportRepository.getAll();
  
  // Platform Admin sees all reports across all tenants
  if (currentUser.isPlatformAdmin) {
    return allReports;
  }
  
  // Director sees all reports in their tenant (all business units)
  if (isDirector(currentUser.roleName)) {
    return allReports; // Already filtered by tenantId in repository
  }
  
  // Manager sees reports from their business unit
  if (isManagerOrAdmin(currentUser.roleName) && currentUser.businessUnitId) {
    return allReports.filter(r => 
      r.businessUnitId === currentUser.businessUnitId
    );
  }
  
  // Employee sees only their own reports
  return allReports.filter(r => r.employeeId === currentUser.id);
};
```

#### 5. Create Director Dashboard

**File: `components/Director/DirectorDashboard.tsx` (NEW)**

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import * as DataService from '../../services/dataService';
import { EODReport, BusinessUnit, User } from '../../types';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';

const DirectorDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<EODReport[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [selectedBU, setSelectedBU] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allReports, allBUs, allUsers] = await Promise.all([
      DataService.getReports(), // Gets all reports (Director has access)
      DataService.getBusinessUnits(),
      DataService.getUsers()
    ]);
    
    setReports(allReports);
    setBusinessUnits(allBUs);
    setManagers(allUsers.filter(u => u.roleName === 'Manager'));
  };

  const filteredReports = selectedBU === 'all' 
    ? reports 
    : reports.filter(r => r.businessUnitId === selectedBU);

  return (
    <PageContainer title="Director Dashboard">
      {/* Business Unit Filter */}
      <Card>
        <div className="flex items-center gap-4">
          <label>Business Unit:</label>
          <select 
            value={selectedBU}
            onChange={(e) => setSelectedBU(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Business Units</option>
            {businessUnits.map(bu => (
              <option key={bu.id} value={bu.id}>{bu.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card title="Total Reports">
          <p className="text-3xl font-bold">{filteredReports.length}</p>
        </Card>
        <Card title="Pending Acknowledgment">
          <p className="text-3xl font-bold text-yellow-600">
            {filteredReports.filter(r => r.status === 'Pending Acknowledgment').length}
          </p>
        </Card>
        <Card title="Acknowledged">
          <p className="text-3xl font-bold text-green-600">
            {filteredReports.filter(r => r.status === 'Acknowledged').length}
          </p>
        </Card>
        <Card title="Total Managers">
          <p className="text-3xl font-bold">{managers.length}</p>
        </Card>
      </div>

      {/* Reports Table - Similar to Manager view */}
      <Card title="All Reports" className="mt-6">
        {/* Use ManageReportsTable component but with all BUs */}
      </Card>
    </PageContainer>
  );
};

export default DirectorDashboard;
```

#### 6. Update Navigation & Routing

**File: `App.tsx` or routing file**

Add Director dashboard route:
```typescript
{currentUser.roleName === 'Director' && (
  <Route path="/director-dashboard" element={<DirectorDashboard />} />
)}
```

**File: `components/Layout/Sidebar.tsx`**

Add Director navigation items:
```typescript
const directorNavItems = [
  { name: 'Director Dashboard', path: '/director-dashboard', icon: LayoutDashboard },
  { name: 'All Reports', path: '/manage-reports', icon: FileText },
  { name: 'Consistency Tracker', path: '/consistency-tracker', icon: TrendingUp },
  { name: 'Performance Hub', path: '/performance-hub', icon: BarChart },
  { name: 'Team Tasks', path: '/team-tasks', icon: CheckSquare },
  { name: 'Meetings', path: '/meetings', icon: Calendar },
  { name: 'Team Calendar', path: '/team-calendar', icon: Calendar },
  { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  // NO "My Reports" or "Submit Report" options
];
```

#### 7. Hide Report Submission for Director

**File: `components/Dashboard/Dashboard.tsx` or navigation**

```typescript
// Don't show "Submit EOD Report" button for Directors
{currentUser.roleName !== 'Director' && hasPermission(Permission.CAN_SUBMIT_OWN_EOD) && (
  <Button onClick={() => navigate('/submit-report')}>
    Submit EOD Report
  </Button>
)}
```

**File: `App.tsx`**

```typescript
// Don't allow Directors to access submit report route
{hasPermission(Permission.CAN_SUBMIT_OWN_EOD) && currentUser.roleName !== 'Director' && (
  <Route path="/submit-report" element={<SubmitReportPage />} />
)}
```

#### 8. Update Firestore Security Rules

**File: `firestore.rules`**

Add Director rules:
```javascript
function isDirector() {
  return request.auth.token.roleName == 'Director';
}

// Reports collection
match /eod_reports/{reportId} {
  allow read: if isAuthenticated() && (
    isOwner(resource.data.employeeId) ||
    isManagerOfBU(resource.data.businessUnitId) ||
    isAdmin() ||
    isDirector() || // Director can read all reports in tenant
    isPlatformAdmin()
  );
  
  allow create: if isAuthenticated() && (
    isOwner(request.resource.data.employeeId) &&
    request.auth.token.roleName != 'Director' // Director cannot create reports
  );
  
  allow update: if isAuthenticated() && (
    (isOwner(resource.data.employeeId) && request.auth.token.roleName != 'Director') ||
    isManagerOfBU(resource.data.businessUnitId) ||
    isDirector() || // Director can update (acknowledge) reports
    isAdmin()
  );
}

// Business Units collection
match /business_units/{buId} {
  allow read: if isAuthenticated() && (
    sameTenant() ||
    isDirector() || // Director can read all BUs
    isPlatformAdmin()
  );
}
```

#### 9. Testing Checklist

- [ ] Director can view all reports from all business units
- [ ] Director can acknowledge any report
- [ ] Director CANNOT submit EOD reports (no access to submit page)
- [ ] Director can view all managers and employees
- [ ] Director can comment on reports
- [ ] Director can access Performance Hub for all BUs
- [ ] Director can view Consistency Tracker for entire company
- [ ] Director can view and manage tasks/meetings
- [ ] Director dashboard shows correct aggregated data
- [ ] Firestore rules prevent Director from creating reports
- [ ] Navigation doesn't show "Submit Report" for Directors
- [ ] Multi-tenant isolation preserved (Director only sees their tenant)
- [ ] Platform Admin still has full access across all tenants

---

## 📅 Implementation Timeline

### Phase 1: Multi-Manager Acknowledgments (2-3 days)
1. **Day 1: Database & Backend**
   - Update EODReport type schema
   - Update acknowledgment functions
   - Add migration logic for existing data
   - Update unit tests

2. **Day 2: Manager UI**
   - Update Manage Reports page filtering
   - Add multi-acknowledgment display
   - Update batch acknowledgment UI
   - Update Consistency Tracker

3. **Day 3: Employee UI & Testing**
   - Update My Reports page to show all acknowledgments
   - End-to-end testing
   - Bug fixes

### Phase 2: Director Role (2-3 days)
1. **Day 1: Role Setup**
   - Add Director role to tenant provisioning
   - Update helper functions
   - Update Firestore rules
   - Test basic permissions

2. **Day 2: Director Dashboard**
   - Create Director dashboard component
   - Update routing and navigation
   - Add cross-BU report viewing
   - Hide report submission features

3. **Day 3: Integration & Testing**
   - Update all relevant components
   - Test Director permissions thoroughly
   - Test multi-tenant isolation
   - Bug fixes and refinements

### Total Estimated Time: 4-6 days

---

## 🔒 Security Considerations

### Multi-Manager Acknowledgments
- ✅ Each acknowledgment logged separately in activity log
- ✅ Manager cannot acknowledge same report twice
- ✅ Tenant isolation maintained (managers only see their tenant's reports)
- ✅ Business unit isolation maintained (unless Director)

### Director Role
- ✅ Director has NO permission to create EOD reports
- ✅ Director scoped to single tenant (cannot see other tenants)
- ✅ Platform Admin still has superior permissions
- ✅ Firestore rules enforce permission checks
- ✅ Frontend hides features Director shouldn't access

---

## 📝 Migration Strategy

### For Multi-Manager Acknowledgments

**Step 1: Add new field** (backward compatible)
- Add `acknowledgments` array to EODReport type
- Keep old `acknowledgedByManagerId` and `acknowledgedAt` fields

**Step 2: Migrate existing data**
```typescript
export const migrateAcknowledgments = async () => {
  const allReports = await reportRepository.getAllIncludingOld();
  
  for (const report of allReports) {
    if (report.acknowledgedByManagerId && !report.acknowledgments) {
      const manager = await getUserById(report.acknowledgedByManagerId);
      report.acknowledgments = [{
        managerId: report.acknowledgedByManagerId,
        managerName: manager?.name || 'Unknown Manager',
        acknowledgedAt: report.acknowledgedAt || Date.now(),
      }];
      
      await reportRepository.update(report.id, report);
    }
  }
  
  console.log('Migration complete!');
};
```

**Step 3: Remove old fields** (after migration verified)
- Remove `acknowledgedByManagerId` and `acknowledgedAt` from type
- Clean up any references in code

### For Director Role

**No migration needed** - Director is just a new role added to the system

---

## ✅ Definition of Done

### Multi-Manager Acknowledgments
- [ ] Multiple managers can acknowledge same report independently
- [ ] Employee sees all managers who acknowledged
- [ ] Manager dashboard shows only reports they haven't acknowledged
- [ ] Batch acknowledgment works correctly
- [ ] All existing reports migrated to new format
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Documentation updated

### Director Role
- [ ] Director role created in all tenants (new and existing)
- [ ] Director can view all reports across all BUs
- [ ] Director can acknowledge any report
- [ ] Director CANNOT submit reports
- [ ] Director dashboard shows aggregated data
- [ ] Navigation appropriate for Director
- [ ] Firestore rules enforce permissions
- [ ] Multi-tenant isolation preserved
- [ ] All tests pass
- [ ] Documentation updated

---

## 📚 Documentation Updates Needed

1. **User Guide**
   - How multi-manager acknowledgment works
   - Director role capabilities and limitations
   - How to create Director users

2. **Admin Guide**
   - How to assign Director role
   - How to migrate existing acknowledgments
   - Permission matrix update

3. **Developer Guide**
   - New API endpoints/functions
   - Database schema changes
   - Firestore rules updates

---

**End of Implementation Plan**

This plan provides a clear roadmap for implementing both features with minimal risk and maximum code quality. Each phase can be implemented, tested, and deployed independently.
