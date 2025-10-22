import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { COLLECTIONS, batchWrite, generateFirestoreId } from './firestoreService';
import {
  DEFAULT_ROLES,
  DEFAULT_BUSINESS_UNITS,
  DEFAULT_USERS,
  USERS_KEY,
  REPORTS_KEY,
  TASKS_KEY,
  LEAVE_RECORDS_KEY,
  MEETINGS_KEY,
  ROLES_KEY,
  BUSINESS_UNITS_KEY
} from '../constants';

// Check if Firestore has been initialized
export async function isFirestoreInitialized(): Promise<boolean> {
  try {
    const rolesSnapshot = await getDocs(collection(db, COLLECTIONS.ROLES));
    return !rolesSnapshot.empty;
  } catch (error: any) {
    // If permission denied, Firestore is not accessible yet (user needs to login)
    if (error?.code === 'permission-denied') {
      return false; // Treat as not initialized, will retry after login
    }
    console.error('Error checking Firestore initialization:', error);
    return false;
  }
}

// Initialize Firestore with default data
export async function initializeFirestore(): Promise<void> {
  try {
    console.log('Initializing Firestore with default data...');
    
    const operations = [];

    // Add default roles
    for (const role of DEFAULT_ROLES) {
      operations.push({
        type: 'set' as const,
        collectionName: COLLECTIONS.ROLES,
        docId: role.id,
        data: role
      });
    }

    // Add default business units
    for (const bu of DEFAULT_BUSINESS_UNITS) {
      operations.push({
        type: 'set' as const,
        collectionName: COLLECTIONS.BUSINESS_UNITS,
        docId: bu.id,
        data: bu
      });
    }

    // Add default users with generated IDs and enriched data
    for (const user of DEFAULT_USERS) {
      const userId = generateFirestoreId('user');
      const role = DEFAULT_ROLES.find(r => r.id === user.roleId);
      const bu = DEFAULT_BUSINESS_UNITS.find(b => b.id === user.businessUnitId);
      
      // Build user data, only including defined values
      const userData: any = {
        ...user,
        id: userId
      };
      
      if (role?.name) {
        userData.roleName = role.name;
      }
      if (bu?.name) {
        userData.businessUnitName = bu.name;
      }
      
      operations.push({
        type: 'set' as const,
        collectionName: COLLECTIONS.USERS,
        docId: userId,
        data: userData
      });
    }

    await batchWrite(operations);
    console.log('Firestore initialized successfully with default data');
    
    // Mark in localStorage that Firestore has been initialized
    localStorage.setItem('firestore_initialized', 'true');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
  }
}

// Migrate data from LocalStorage to Firestore
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    console.log('Starting migration from LocalStorage to Firestore...');
    
    const operations = [];

    // Migrate Roles
    const rolesData = localStorage.getItem(ROLES_KEY);
    if (rolesData) {
      const roles = JSON.parse(rolesData);
      for (const role of roles) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.ROLES,
          docId: role.id,
          data: role
        });
      }
    }

    // Migrate Business Units
    const buData = localStorage.getItem(BUSINESS_UNITS_KEY);
    if (buData) {
      const businessUnits = JSON.parse(buData);
      for (const bu of businessUnits) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.BUSINESS_UNITS,
          docId: bu.id,
          data: bu
        });
      }
    }

    // Migrate Users
    const usersData = localStorage.getItem(USERS_KEY);
    if (usersData) {
      const users = JSON.parse(usersData);
      for (const user of users) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.USERS,
          docId: user.id,
          data: user
        });
      }
    }

    // Migrate Reports
    const reportsData = localStorage.getItem(REPORTS_KEY);
    if (reportsData) {
      const reports = JSON.parse(reportsData);
      for (const report of reports) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.REPORTS,
          docId: report.id,
          data: report
        });
      }
    }

    // Migrate Tasks
    const tasksData = localStorage.getItem(TASKS_KEY);
    if (tasksData) {
      const tasks = JSON.parse(tasksData);
      for (const task of tasks) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.TASKS,
          docId: task.id,
          data: task
        });
      }
    }

    // Migrate Leave Records
    const leaveData = localStorage.getItem(LEAVE_RECORDS_KEY);
    if (leaveData) {
      const leaveRecords = JSON.parse(leaveData);
      for (const leave of leaveRecords) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.LEAVE_RECORDS,
          docId: leave.id,
          data: leave
        });
      }
    }

    // Migrate Meetings
    const meetingsData = localStorage.getItem(MEETINGS_KEY);
    if (meetingsData) {
      const meetings = JSON.parse(meetingsData);
      for (const meeting of meetings) {
        operations.push({
          type: 'set' as const,
          collectionName: COLLECTIONS.MEETINGS,
          docId: meeting.id,
          data: meeting
        });
      }
    }

    if (operations.length > 0) {
      // Firestore batch writes have a limit of 500 operations
      const batchSize = 500;
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        await batchWrite(batch);
      }
    }

    console.log('Migration completed successfully');
    localStorage.setItem('migrated_to_firestore', 'true');
  } catch (error: any) {
    // If permission denied, user needs to be authenticated first
    if (error?.code === 'permission-denied') {
      console.log('Migration requires authentication - will retry after login');
      return; // Silently return, will retry after user logs in
    }
    console.error('Error migrating data to Firestore:', error);
    throw error;
  }
}

// Main initialization function - PRODUCTION MODE: No localStorage
export async function ensureFirestoreReady(): Promise<void> {
  // PRODUCTION: All data is in Firestore - no localStorage needed
  console.log('[Firestore] Production mode - using Firestore directly.');
}

// Post-login initialization - called from AuthContext after successful login
export async function initializeFirestoreAfterLogin(): Promise<void> {
  try {
    // Verify user is authenticated
    if (!auth.currentUser) {
      console.log('[Firestore] No authenticated user - skipping Firestore initialization');
      return;
    }

    console.log('[Firestore] User authenticated, initializing Firestore...');
    
    const isInitialized = await isFirestoreInitialized();
    
    if (!isInitialized) {
      // Check if we have data in localStorage to migrate
      const hasLocalData = localStorage.getItem(USERS_KEY) !== null;
      
      if (hasLocalData) {
        console.log('[Firestore] Found LocalStorage data, migrating to Firestore...');
        await migrateFromLocalStorage();
      } else {
        console.log('[Firestore] No existing data found, initializing with defaults...');
        await initializeFirestore();
      }
    } else {
      console.log('[Firestore] Already initialized');
    }
  } catch (error: any) {
    console.error('[Firestore] Error during post-login initialization:', error);
    // Don't throw - app should work with LocalStorage if Firestore fails
  }
}

// Ensure default users are in LocalStorage for initial login
function ensureDefaultUsersInLocalStorage(): void {
  const existingUsers = localStorage.getItem(USERS_KEY);
  if (!existingUsers) {
    // Add default users to LocalStorage so login can work before Firestore access
    const defaultUsersWithIds = DEFAULT_USERS.map(user => ({
      ...user,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'active' as const
    }));
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsersWithIds));
    localStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLES));
    localStorage.setItem(BUSINESS_UNITS_KEY, JSON.stringify(DEFAULT_BUSINESS_UNITS));
    console.log('Initialized LocalStorage with default users for login');
  }
}
