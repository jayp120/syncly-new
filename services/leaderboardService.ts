// services/leaderboardService.ts

import { User, EODReport, LeaveRecord, LeaderboardEntry, UserStatus } from '../types';
import { getLocalYYYYMMDD, isDayWeeklyOff } from '../utils/dateUtils';

// Helper function to check if a given date is a working day for an employee
const isWorkingDayForEmployee = (date: Date, user: User, leaveRecords: LeaveRecord[]): boolean => {
    // 1. Check for weekly off day
    if (isDayWeeklyOff(date, user.weeklyOffDay)) {
        return false;
    }

    // 2. Check for leave record
    const dateStr = getLocalYYYYMMDD(date);
    if (leaveRecords.some(record => record.employeeId === user.id && record.date === dateStr)) {
        return false;
    }

    return true;
};

export const calculateLeaderboardData = (
    users: User[],
    reports: EODReport[],
    leaveRecords: LeaveRecord[]
): LeaderboardEntry[] => {
    const activeEmployees = users.filter(u => u.status === UserStatus.ACTIVE && u.roleName === 'Employee');
    const leaderboardEntries: LeaderboardEntry[] = [];

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    for (const employee of activeEmployees) {
        const employeeReports = reports.filter(r => r.employeeId === employee.id);
        const employeeLeaves = leaveRecords.filter(l => l.employeeId === employee.id);
        
        // 1. Calculate reports submitted this month
        const reportsSubmittedThisMonth = employeeReports.filter(r => r.date.startsWith(currentMonthStr)).length;

        // 2. Calculate current reporting streak by iterating backwards from today
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(12, 0, 0, 0); // Normalize time to avoid timezone issues with date changes

        for(let i = 0; i < 90; i++) { // Check up to 90 days back
            const currentCheckDate = new Date(checkDate);
            currentCheckDate.setDate(checkDate.getDate() - i);
            
            if (isWorkingDayForEmployee(currentCheckDate, employee, employeeLeaves)) {
                const dateStr = getLocalYYYYMMDD(currentCheckDate);
                const hasReport = employeeReports.some(r => r.date === dateStr);
                if (hasReport) {
                    streak++;
                } else {
                    // Missed a working day, streak is broken
                    break;
                }
            }
            // Non-working days are skipped and do not break the streak.
        }

        leaderboardEntries.push({
            userId: employee.id,
            employeeName: employee.name,
            designation: employee.designation,
            businessUnitName: employee.businessUnitName,
            reportsSubmittedThisMonth,
            currentReportingStreak: streak,
        });
    }

    // 3. Sort and Rank
    const sortedEntries = leaderboardEntries.sort((a, b) => {
        // Primary sort: by streak, descending
        if (b.currentReportingStreak !== a.currentReportingStreak) {
            return b.currentReportingStreak - a.currentReportingStreak;
        }
        // Secondary sort (tie-breaker): by reports this month, descending
        if (b.reportsSubmittedThisMonth !== a.reportsSubmittedThisMonth) {
            return b.reportsSubmittedThisMonth - a.reportsSubmittedThisMonth;
        }
        // Tertiary sort (another tie-breaker): alphabetically by name
        return a.employeeName.localeCompare(b.employeeName);
    });

    // 4. Assign ranks
    return sortedEntries.map((entry, index) => ({
        ...entry,
        rank: index + 1,
    }));
};
