import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// CORS for unauthenticated endpoints
const corsHandler = require('cors')({ origin: true });

// Firestore collections
const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  ROLES: 'roles',
  BUSINESS_UNITS: 'businessUnits',
  TENANT_OPERATIONS_LOG: 'tenantOperationsLog'
};

// Plan limits
const PLAN_LIMITS = {
  Starter: 10,
  Professional: 50,
  Enterprise: 500
};

// Tenant plans
type TenantPlan = 'Starter' | 'Professional' | 'Enterprise';
type TenantStatus = 'Active' | 'Suspended' | 'Inactive';

// Request interfaces
interface CreateTenantRequest {
  companyName: string;
  plan: TenantPlan;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

interface TenantOperationLog {
  id: string;
  tenantId: string;
  operation: 'create' | 'update' | 'suspend' | 'activate' | 'delete';
  performedBy: string;
  performedByEmail: string;
  timestamp: number;
  details: Record<string, any>;
  ipAddress?: string;
}

// Helper function to generate ID
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to log tenant operations
const logTenantOperation = async (logData: Omit<TenantOperationLog, 'id' | 'timestamp'>) => {
  const logId = generateId('tenantop');
  const log: TenantOperationLog = {
    ...logData,
    id: logId,
    timestamp: Date.now()
  };
  
  await admin.firestore()
    .collection(COLLECTIONS.TENANT_OPERATIONS_LOG)
    .doc(logId)
    .set(log);
  
  console.log(`Tenant operation logged: ${log.operation} for tenant ${log.tenantId}`);
};

// Default roles for new tenant
const getDefaultRoles = (tenantId: string) => {
  const timestamp = Date.now();
  return [
    {
      id: generateId('role'),
      tenantId,
      name: 'Employee',
      description: 'Standard employee with basic access',
      permissions: [
        'CAN_SUBMIT_OWN_EOD',
        'CAN_VIEW_OWN_REPORTS',
        'CAN_CREATE_PERSONAL_TASKS',
        'CAN_VIEW_OWN_MEETINGS',
        'CAN_VIEW_OWN_CALENDAR',
        'CAN_VIEW_LEADERBOARD',
        'CAN_SUBMIT_OWN_LEAVE'
      ],
      createdAt: timestamp,
      isDefault: true
    },
    {
      id: generateId('role'),
      tenantId,
      name: 'Manager',
      description: 'Team manager with team oversight',
      permissions: [
        'CAN_SUBMIT_OWN_EOD',
        'CAN_VIEW_OWN_REPORTS',
        'CAN_MANAGE_TEAM_REPORTS',
        'CAN_ACKNOWLEDGE_REPORTS',
        'CAN_CREATE_PERSONAL_TASKS',
        'CAN_MANAGE_TEAM_TASKS',
        'CAN_MANAGE_TEAM_MEETINGS',
        'CAN_VIEW_OWN_MEETINGS',
        'CAN_VIEW_TEAM_CALENDAR',
        'CAN_VIEW_OWN_CALENDAR',
        'CAN_VIEW_LEADERBOARD',
        'CAN_SUBMIT_OWN_LEAVE',
        'CAN_USE_PERFORMANCE_HUB'
      ],
      createdAt: timestamp,
      isDefault: true
    },
    {
      id: generateId('role'),
      tenantId,
      name: 'Admin',
      description: 'Administrator with full tenant access',
      permissions: [
        'CAN_MANAGE_USERS',
        'CAN_CREATE_USER',
        'CAN_EDIT_USER',
        'CAN_ARCHIVE_USER',
        'CAN_DELETE_ARCHIVED_USER',
        'CAN_MANAGE_ROLES',
        'CAN_VIEW_ALL_REPORTS',
        'CAN_MANAGE_TEAM_REPORTS',
        'CAN_ACKNOWLEDGE_REPORTS',
        'CAN_SUBMIT_OWN_EOD',
        'CAN_VIEW_OWN_REPORTS',
        'CAN_MANAGE_TEAM_TASKS',
        'CAN_CREATE_PERSONAL_TASKS',
        'CAN_EDIT_ANY_TASK_STATUS',
        'CAN_MANAGE_ALL_LEAVES',
        'CAN_SUBMIT_OWN_LEAVE',
        'CAN_MANAGE_TEAM_MEETINGS',
        'CAN_VIEW_OWN_MEETINGS',
        'CAN_VIEW_LEADERBOARD',
        'CAN_VIEW_TEAM_CALENDAR',
        'CAN_VIEW_OWN_CALENDAR',
        'CAN_MANAGE_BUSINESS_UNITS',
        'CAN_VIEW_TRIGGER_LOG',
        'CAN_USE_PERFORMANCE_HUB'
      ],
      createdAt: timestamp,
      isDefault: true
    }
  ];
};

// Default business units for new tenant
const getDefaultBusinessUnits = (tenantId: string) => {
  const timestamp = Date.now();
  return [
    { id: generateId('bu'), tenantId, name: 'Engineering', status: 'active', createdAt: timestamp },
    { id: generateId('bu'), tenantId, name: 'Product', status: 'active', createdAt: timestamp },
    { id: generateId('bu'), tenantId, name: 'Design', status: 'active', createdAt: timestamp },
    { id: generateId('bu'), tenantId, name: 'Marketing', status: 'active', createdAt: timestamp },
    { id: generateId('bu'), tenantId, name: 'Sales', status: 'active', createdAt: timestamp }
  ];
};

/**
 * Cloud Function: Create New Tenant
 * 
 * This function handles server-side tenant provisioning with complete isolation.
 * It creates the tenant, default roles, business units, and admin user.
 * 
 * Security: Only callable by authenticated Super Admin users
 */
export const createTenant = functions.https.onCall(async (data: CreateTenantRequest, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to create tenant'
    );
  }

  // Security: Verify Platform Admin role
  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  if (!callerData || !callerData.isPlatformAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Platform Admins can create tenants'
    );
  }

  // Validate input
  const { companyName, plan, adminEmail, adminPassword, adminName } = data;
  
  if (!companyName || !plan || !adminEmail || !adminPassword || !adminName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields'
    );
  }

  if (!['Starter', 'Professional', 'Enterprise'].includes(plan)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid plan type'
    );
  }

  if (adminPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters'
    );
  }

  const tenantId = generateId('tenant');
  const db = admin.firestore();
  const timestamp = Date.now();
  let createdAuthUserId: string | null = null; // Track for rollback

  try {
    // Step 1: Create Firebase Auth user first (so we have the UID)
    const userRecord = await admin.auth().createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
      emailVerified: true
    });
    createdAuthUserId = userRecord.uid; // Track for rollback
    console.log(`Firebase Auth user created: ${userRecord.uid}`);

    // Set custom claims for tenant isolation (tenant admin gets isTenantAdmin flag)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      tenantId: tenantId,
      isPlatformAdmin: false,
      isTenantAdmin: true,  // Tenant admin can manage users in their tenant
      role: 'Admin'
    });
    console.log(`Custom claims set for admin user: ${userRecord.uid} (isTenantAdmin: true)`);

    // Step 2: Create tenant record with admin details
    const tenant = {
      id: tenantId,
      companyName,
      plan,
      status: 'Active' as TenantStatus,
      createdAt: timestamp,
      userLimit: PLAN_LIMITS[plan],
      currentUsers: 1,
      adminEmail: adminEmail,
      adminUid: userRecord.uid,
      adminName: adminName
    };

    await db.collection(COLLECTIONS.TENANTS).doc(tenantId).set(tenant);
    console.log(`Tenant created: ${tenantId} (${companyName})`);

    // Step 3: Create default roles
    const roles = getDefaultRoles(tenantId);
    const adminRole = roles.find(r => r.name === 'Admin')!;
    
    const rolePromises = roles.map(role =>
      db.collection(COLLECTIONS.ROLES).doc(role.id).set(role)
    );
    await Promise.all(rolePromises);
    console.log(`Default roles created for tenant ${tenantId}`);

    // Step 4: Create default business units
    const businessUnits = getDefaultBusinessUnits(tenantId);
    const defaultBU = businessUnits[0]; // Engineering as default
    
    const buPromises = businessUnits.map(bu =>
      db.collection(COLLECTIONS.BUSINESS_UNITS).doc(bu.id).set(bu)
    );
    await Promise.all(buPromises);
    console.log(`Default business units created for tenant ${tenantId}`);

    // Step 5: Create admin user in Firestore
    // This ensures the Firestore rules can access the user document
    const adminUser = {
      id: userRecord.uid,
      tenantId,
      name: adminName,
      email: adminEmail,
      roleId: adminRole.id,
      roleName: adminRole.name,
      businessUnitId: defaultBU.id,
      businessUnitName: defaultBU.name,
      createdAt: timestamp,
      status: 'active',
      isActive: true,
      isDeleted: false
    };

    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(adminUser);
    console.log(`Admin user created in Firestore: ${userRecord.uid}`);

    // Step 6: Log the operation
    await logTenantOperation({
      tenantId,
      operation: 'create',
      performedBy: context.auth.uid,
      performedByEmail: callerData.email,
      details: {
        companyName,
        plan,
        adminEmail,
        adminName
      }
    });

    // Return success
    return {
      success: true,
      tenantId,
      message: `Tenant "${companyName}" created successfully`,
      data: {
        tenant,
        adminUserId: userRecord.uid,
        rolesCreated: roles.length,
        businessUnitsCreated: businessUnits.length
      }
    };

  } catch (error: any) {
    console.error('Error creating tenant:', error);
    
    // Rollback: Clean up if error occurs
    try {
      // CRITICAL: Delete Firebase Auth user if created
      if (createdAuthUserId) {
        try {
          await admin.auth().deleteUser(createdAuthUserId);
          console.log(`Rollback: Deleted Auth user ${createdAuthUserId}`);
        } catch (authDeleteError) {
          console.error(`Rollback: Failed to delete Auth user ${createdAuthUserId}:`, authDeleteError);
        }
      }

      // Delete created Firestore documents
      const batch = db.batch();
      
      // Delete tenant
      batch.delete(db.collection(COLLECTIONS.TENANTS).doc(tenantId));
      
      // Delete user document if created
      if (createdAuthUserId) {
        batch.delete(db.collection(COLLECTIONS.USERS).doc(createdAuthUserId));
      }
      
      // Delete roles
      const rolesSnapshot = await db.collection(COLLECTIONS.ROLES)
        .where('tenantId', '==', tenantId)
        .get();
      rolesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete business units
      const buSnapshot = await db.collection(COLLECTIONS.BUSINESS_UNITS)
        .where('tenantId', '==', tenantId)
        .get();
      buSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      console.log(`Rollback completed for tenant ${tenantId}`);
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to create tenant: ${error.message}`
    );
  }
});

/**
 * Cloud Function: Update Tenant Status
 * 
 * Updates tenant status (Active, Suspended, Inactive)
 * Security: Only callable by Super Admin
 */
export const updateTenantStatus = functions.https.onCall(async (data: { 
  tenantId: string; 
  status: TenantStatus 
}, context) => {
  // Security checks
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  if (!callerData || !callerData.isPlatformAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only Platform Admins can update tenant status');
  }

  const { tenantId, status } = data;
  
  if (!['Active', 'Suspended', 'Inactive'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
  }

  try {
    await admin.firestore()
      .collection(COLLECTIONS.TENANTS)
      .doc(tenantId)
      .update({ status, updatedAt: Date.now() });

    await logTenantOperation({
      tenantId,
      operation: 'update',
      performedBy: context.auth.uid,
      performedByEmail: callerData.email,
      details: { status }
    });

    return { success: true, message: `Tenant status updated to ${status}` };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function: Update Tenant Plan
 * 
 * Updates tenant plan (Starter, Professional, Enterprise)
 * Security: Only callable by Super Admin
 */
export const updateTenantPlan = functions.https.onCall(async (data: { 
  tenantId: string; 
  plan: TenantPlan 
}, context) => {
  // Security checks
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  if (!callerData || !callerData.isPlatformAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only Platform Admins can update tenant plan');
  }

  const { tenantId, plan } = data;
  
  if (!['Starter', 'Professional', 'Enterprise'].includes(plan)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid plan');
  }

  try {
    await admin.firestore()
      .collection(COLLECTIONS.TENANTS)
      .doc(tenantId)
      .update({ 
        plan, 
        userLimit: PLAN_LIMITS[plan],
        updatedAt: Date.now() 
      });

    await logTenantOperation({
      tenantId,
      operation: 'update',
      performedBy: context.auth.uid,
      performedByEmail: callerData.email,
      details: { plan, userLimit: PLAN_LIMITS[plan] }
    });

    return { success: true, message: `Tenant plan updated to ${plan}` };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function: Get Tenant Operations Log
 * 
 * Retrieves operation logs for a specific tenant
 * Security: Only Super Admin can view logs
 */
export const getTenantOperationsLog = functions.https.onCall(async (data: { 
  tenantId?: string;
  limit?: number 
}, context) => {
  // Security checks
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  if (!callerData || !callerData.isPlatformAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only Platform Admins can view logs');
  }

  try {
    let query = admin.firestore()
      .collection(COLLECTIONS.TENANT_OPERATIONS_LOG)
      .orderBy('timestamp', 'desc');

    if (data.tenantId) {
      query = query.where('tenantId', '==', data.tenantId) as any;
    }

    if (data.limit) {
      query = query.limit(data.limit) as any;
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => doc.data());

    return { success: true, logs };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function: Get Tenant Users
 * 
 * Securely retrieves users for a specific tenant
 * Security: Platform admin can query any tenant, tenant users can only query their own tenant
 * 
 * This function enforces tenant isolation at the server-side,
 * preventing cross-tenant data exposure that client-side filtering cannot guarantee.
 */
export const getTenantUsers = functions.https.onCall(async (data: { 
  tenantId?: string 
}, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Get caller's user document
  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  if (!callerData) {
    throw new functions.https.HttpsError('not-found', 'User profile not found');
  }

  // Determine which tenant to query
  let queryTenantId: string;

  if (callerData.isPlatformAdmin) {
    // Platform admin can query any tenant (or all if no tenantId provided)
    if (!data.tenantId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Platform admin must specify tenantId to query'
      );
    }
    queryTenantId = data.tenantId;
  } else {
    // Tenant users can ONLY query their own tenant
    if (!callerData.tenantId) {
      throw new functions.https.HttpsError('permission-denied', 'User has no tenant access');
    }
    queryTenantId = callerData.tenantId;
  }

  try {
    // Server-side query with enforced tenant isolation
    const usersSnapshot = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('tenantId', '==', queryTenantId)
      .get();

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      users,
      tenantId: queryTenantId
    };
  } catch (error: any) {
    console.error('Error fetching tenant users:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function: Backfill Tenant Admin Info
 * 
 * One-time migration function to populate adminEmail, adminUid, adminName on existing tenants
 * Security: Only platform admin can call this function
 */
export const backfillTenantAdminInfo = functions.https.onCall(async (data, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Get caller's user document to verify platform admin status
  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  const hasFirestoreFlag = callerData?.isPlatformAdmin === true;
  const hasCustomClaim = context.auth.token.isPlatformAdmin === true;

  // Security: Check if caller is platform admin
  if (!hasFirestoreFlag && !hasCustomClaim) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only platform admin can run migrations'
    );
  }

  try {
    const db = admin.firestore();
    const results = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Get all tenants
    const tenantsSnapshot = await db.collection(COLLECTIONS.TENANTS).get();
    results.total = tenantsSnapshot.size;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      // Skip if already has adminEmail
      if (tenantData.adminEmail && tenantData.adminUid) {
        results.skipped++;
        continue;
      }
      
      try {
        // Find the admin user for this tenant (try Admin role first)
        let usersSnapshot = await db.collection(COLLECTIONS.USERS)
          .where('tenantId', '==', tenantId)
          .where('roleName', '==', 'Admin')
          .limit(1)
          .get();
        
        // If no Admin role found, try finding ANY user with admin-like role
        if (usersSnapshot.empty) {
          const allUsersSnapshot = await db.collection(COLLECTIONS.USERS)
            .where('tenantId', '==', tenantId)
            .get();
          
          if (allUsersSnapshot.empty) {
            results.errors.push(`No users found for tenant ${tenantId} (${tenantData.companyName || 'Unknown'})`);
            continue;
          }
          
          // Find user with admin-like role (case insensitive) or first user
          const adminUser = allUsersSnapshot.docs.find(doc => {
            const role = doc.data().roleName?.toLowerCase();
            return role === 'admin' || role === 'administrator' || role === 'owner';
          });
          
          if (adminUser) {
            usersSnapshot = { docs: [adminUser], empty: false } as any;
          } else {
            // Use the first user as fallback
            usersSnapshot = { docs: [allUsersSnapshot.docs[0]], empty: false } as any;
            console.warn(`Using first user for tenant ${tenantId} as admin (role: ${allUsersSnapshot.docs[0].data().roleName})`);
          }
        }
        
        const adminUser = usersSnapshot.docs[0].data();
        
        // Update tenant document with admin info
        await db.collection(COLLECTIONS.TENANTS).doc(tenantId).update({
          adminEmail: adminUser.email,
          adminUid: adminUser.id,
          adminName: adminUser.name
        });
        
        results.updated++;
        
      } catch (error: any) {
        results.errors.push(`Error processing tenant ${tenantId}: ${error.message}`);
      }
    }

    console.log('Backfill complete:', results);

    return {
      success: true,
      results
    };
  } catch (error: any) {
    console.error('Backfill migration error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Migration failed');
  }
});

/**
 * Cloud Function: Fix Role Permissions
 * 
 * Updates all tenant roles to use correct Permission enum strings
 * Fixes the snake_case -> PascalCase mismatch
 */
export const fixRolePermissions = functions.https.onCall(async (data, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Get caller's user document to verify platform admin status
  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  const hasFirestoreFlag = callerData?.isPlatformAdmin === true;
  const hasCustomClaim = context.auth.token.isPlatformAdmin === true;

  if (!hasFirestoreFlag && !hasCustomClaim) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only platform admin can fix role permissions'
    );
  }

  try {
    const db = admin.firestore();
    const rolesSnapshot = await db.collection(COLLECTIONS.ROLES).get();
    
    const permissionMap: Record<string, string> = {
      // Old snake_case -> New PascalCase enum
      'view_own_eod': 'CAN_VIEW_OWN_REPORTS',
      'submit_eod': 'CAN_SUBMIT_OWN_EOD',
      'view_team_eod': 'CAN_MANAGE_TEAM_REPORTS',
      'view_all_eod': 'CAN_VIEW_ALL_REPORTS',
      'acknowledge_eod': 'CAN_ACKNOWLEDGE_REPORTS',
      'view_own_tasks': 'CAN_CREATE_PERSONAL_TASKS',
      'view_team_tasks': 'CAN_MANAGE_TEAM_TASKS',
      'view_all_tasks': 'CAN_MANAGE_TEAM_TASKS',
      'assign_tasks': 'CAN_MANAGE_TEAM_TASKS',
      'manage_users': 'CAN_MANAGE_USERS',
      'manage_roles': 'CAN_MANAGE_ROLES',
      'manage_business_units': 'CAN_MANAGE_BUSINESS_UNITS',
      'mark_leave': 'CAN_SUBMIT_OWN_LEAVE',
      'manage_leave': 'CAN_MANAGE_ALL_LEAVES',
      'view_team_leave': 'CAN_MANAGE_ALL_LEAVES',
      'view_analytics': 'CAN_USE_PERFORMANCE_HUB',
      'manage_settings': 'CAN_MANAGE_BUSINESS_UNITS'
    };

    const batch = db.batch();
    let updateCount = 0;

    for (const doc of rolesSnapshot.docs) {
      const role = doc.data();
      const oldPermissions = role.permissions || [];
      
      // Convert old permissions to new enum format
      const newPermissions = new Set<string>();
      
      for (const perm of oldPermissions) {
        // If it's already in the correct format, keep it
        if (perm.startsWith('CAN_')) {
          newPermissions.add(perm);
        } else {
          // Map old format to new
          const mappedPerm = permissionMap[perm];
          if (mappedPerm) {
            newPermissions.add(mappedPerm);
          }
        }
      }

      // Add standard permissions based on role name
      const roleName = role.name?.toLowerCase();
      if (roleName === 'admin') {
        // Ensure admin has all admin permissions
        newPermissions.add('CAN_MANAGE_USERS');
        newPermissions.add('CAN_CREATE_USER');
        newPermissions.add('CAN_EDIT_USER');
        newPermissions.add('CAN_ARCHIVE_USER');
        newPermissions.add('CAN_MANAGE_ROLES');
        newPermissions.add('CAN_VIEW_ALL_REPORTS');
        newPermissions.add('CAN_MANAGE_BUSINESS_UNITS');
        newPermissions.add('CAN_VIEW_TRIGGER_LOG');
        newPermissions.add('CAN_MANAGE_ALL_LEAVES');
      } else if (roleName === 'manager') {
        newPermissions.add('CAN_MANAGE_TEAM_REPORTS');
        newPermissions.add('CAN_ACKNOWLEDGE_REPORTS');
        newPermissions.add('CAN_MANAGE_TEAM_TASKS');
        newPermissions.add('CAN_MANAGE_TEAM_MEETINGS');
        newPermissions.add('CAN_USE_PERFORMANCE_HUB');
      }

      // Add common permissions for all roles
      newPermissions.add('CAN_SUBMIT_OWN_EOD');
      newPermissions.add('CAN_VIEW_OWN_REPORTS');
      newPermissions.add('CAN_CREATE_PERSONAL_TASKS');
      newPermissions.add('CAN_VIEW_OWN_MEETINGS');
      newPermissions.add('CAN_VIEW_OWN_CALENDAR');
      newPermissions.add('CAN_VIEW_LEADERBOARD');
      newPermissions.add('CAN_SUBMIT_OWN_LEAVE');

      batch.update(doc.ref, {
        permissions: Array.from(newPermissions),
        description: role.description || `${role.name} role`
      });
      updateCount++;
    }

    await batch.commit();

    return {
      success: true,
      message: `Fixed permissions for ${updateCount} roles`,
      rolesUpdated: updateCount
    };
  } catch (error: any) {
    console.error('Error fixing role permissions:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to fix permissions');
  }
});

/**
 * Cloud Function: Delete Orphaned Tenant
 * 
 * Deletes a tenant that has no users (orphaned tenant from failed creation)
 * Security: Only platform admin can call this function
 */
export const deleteOrphanedTenant = functions.https.onCall(async (data: { 
  tenantId: string;
}, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Get caller's user document to verify platform admin status
  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  const hasFirestoreFlag = callerData?.isPlatformAdmin === true;
  const hasCustomClaim = context.auth.token.isPlatformAdmin === true;

  // Security: Check if caller is platform admin
  if (!hasFirestoreFlag && !hasCustomClaim) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only platform admin can delete tenants'
    );
  }

  if (!data.tenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'tenantId is required');
  }

  try {
    const db = admin.firestore();
    
    // Check if tenant has any users
    const usersSnapshot = await db.collection(COLLECTIONS.USERS)
      .where('tenantId', '==', data.tenantId)
      .get();
    
    if (!usersSnapshot.empty) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot delete tenant with existing users. This function is only for orphaned tenants.'
      );
    }

    // Delete tenant and related data
    const batch = db.batch();
    
    // Delete tenant document
    batch.delete(db.collection(COLLECTIONS.TENANTS).doc(data.tenantId));
    
    // Delete roles
    const rolesSnapshot = await db.collection(COLLECTIONS.ROLES)
      .where('tenantId', '==', data.tenantId)
      .get();
    rolesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete business units
    const buSnapshot = await db.collection(COLLECTIONS.BUSINESS_UNITS)
      .where('tenantId', '==', data.tenantId)
      .get();
    buSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();

    // Log the operation
    await logTenantOperation({
      tenantId: data.tenantId,
      operation: 'delete',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email || 'unknown',
      details: {
        reason: 'Orphaned tenant cleanup (no users)',
        message: 'Deleted orphaned tenant with no users'
      }
    });

    console.log(`Orphaned tenant deleted: ${data.tenantId}`);

    return {
      success: true,
      message: 'Orphaned tenant deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting orphaned tenant:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Failed to delete tenant');
  }
});

/**
 * Cloud Function: Create User with Firebase Auth
 * 
 * Creates a new user with Firebase Auth account + Firestore document
 * Security: Only same-tenant admin or platform admin can create users
 */
export const createUser = functions.https.onCall(async (data: {
  email: string;
  password: string;
  name: string;
  roleId: string;
  roleName?: string;
  businessUnitId?: string;
  businessUnitName?: string;
  designation?: string;
  tenantId: string;
}, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email, password, name, roleId, roleName, businessUnitId, businessUnitName, designation, tenantId } = data;

  // Validate required fields
  if (!email || !password || !name || !roleId || !tenantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: email, password, name, roleId, tenantId');
  }

  // Verify caller has permission (must be from same tenant OR platform admin)
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(callerUid).get();
  
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Caller user not found');
  }

  const callerData = callerDoc.data();
  const isPlatformAdmin = callerData?.isPlatformAdmin === true;
  
  if (!isPlatformAdmin && callerData?.tenantId !== tenantId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot create users for other tenants');
  }

  // Track created resources for rollback
  let createdAuthUserId: string | null = null;
  
  try {
    // 1. Validate role and business unit exist (prevent undefined roleName/buName)
    if (roleId) {
      const roleDoc = await admin.firestore().collection(COLLECTIONS.ROLES).doc(roleId).get();
      if (!roleDoc.exists) {
        throw new functions.https.HttpsError('invalid-argument', `Role ${roleId} does not exist`);
      }
    }
    
    if (businessUnitId) {
      const buDoc = await admin.firestore().collection(COLLECTIONS.BUSINESS_UNITS).doc(businessUnitId).get();
      if (!buDoc.exists) {
        throw new functions.https.HttpsError('invalid-argument', `Business Unit ${businessUnitId} does not exist`);
      }
    }
    
    // 2. Create Firebase Auth user
    console.log(`Creating Firebase Auth user: ${email}`);
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: password,
      emailVerified: false,
      disabled: false
    });
    
    createdAuthUserId = userRecord.uid;
    console.log(`Firebase Auth user created: ${createdAuthUserId}`);

    // 3. Set custom claims for tenant isolation (CRITICAL - must succeed)
    try {
      // Set isTenantAdmin flag based on role (Admin role gets tenant admin permissions)
      const isTenantAdmin = roleName === 'Admin';
      
      await admin.auth().setCustomUserClaims(createdAuthUserId, {
        tenantId: tenantId,
        isPlatformAdmin: false,
        isTenantAdmin: isTenantAdmin
      });
      console.log(`Custom claims set for user: ${createdAuthUserId} (isTenantAdmin: ${isTenantAdmin})`);
    } catch (claimError: any) {
      // CRITICAL: Roll back Auth user if claims fail
      console.error('Failed to set custom claims, rolling back Auth user:', claimError);
      await admin.auth().deleteUser(createdAuthUserId);
      throw new functions.https.HttpsError('internal', 'Failed to set user permissions. Please try again.');
    }

    // 4. Create Firestore user document (use Firebase Auth UID as document ID)
    const newUser = {
      id: createdAuthUserId,  // CRITICAL: Same as document ID for login to work
      tenantId: tenantId,
      email: email.toLowerCase(),
      notificationEmail: email.toLowerCase(),
      name: name,
      roleId: roleId,
      roleName: roleName || 'Employee',
      role: roleName || 'Employee', // For security rules fallback
      businessUnitId: businessUnitId || '',
      businessUnitName: businessUnitName || '',
      designation: designation || '',
      status: 'active',
      isSuspended: false,
      isPlatformAdmin: false,
      isActive: true,
      isDeleted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      await admin.firestore()
        .collection(COLLECTIONS.USERS)
        .doc(createdAuthUserId)
        .set(newUser);
      
      console.log(`User document created in Firestore: ${createdAuthUserId}`, newUser);
    } catch (firestoreError: any) {
      // CRITICAL: Roll back Auth user if Firestore write fails
      console.error('Failed to create Firestore document, rolling back:', firestoreError);
      await admin.auth().deleteUser(createdAuthUserId);
      throw new functions.https.HttpsError('internal', 'Failed to create user profile. Please try again.');
    }

    return {
      success: true,
      userId: createdAuthUserId,
      message: `User ${name} created successfully`
    };

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Specific error handling
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
    }
    
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
    }
    
    if (error.code === 'auth/weak-password') {
      throw new functions.https.HttpsError('invalid-argument', 'Password is too weak. Minimum 6 characters required');
    }
    
    // Re-throw if already HttpsError
    if (error.code && error.code.startsWith('functions/')) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to create user: ${error.message}`);
  }
});

/**
 * Cloud Function: Set Custom Claims for Existing Users (Migration)
 * 
 * Migrates existing users to have custom claims for tenant isolation
 * Security: Only platform admin can call this function
 */
export const setUserCustomClaims = functions.https.onCall(async (data: {
  userId: string;
  tenantId: string;
  isPlatformAdmin?: boolean;
  isTenantAdmin?: boolean;
}, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify caller is platform admin
  const callerDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.isPlatformAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only platform admin can set custom claims');
  }

  const { userId, tenantId, isPlatformAdmin, isTenantAdmin } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(userId, {
      tenantId: tenantId || null,
      isPlatformAdmin: isPlatformAdmin || false,
      isTenantAdmin: isTenantAdmin || false
    });

    console.log(`Custom claims set for user ${userId}: tenantId=${tenantId}, isPlatformAdmin=${isPlatformAdmin}, isTenantAdmin=${isTenantAdmin}`);

    // Update Firestore document to reflect claims are set
    await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        updatedAt: Date.now(),
        customClaimsSet: true
      });

    return {
      success: true,
      message: `Custom claims set successfully for user ${userId}`
    };
  } catch (error: any) {
    console.error('Error setting custom claims:', error);
    throw new functions.https.HttpsError('internal', `Failed to set custom claims: ${error.message}`);
  }
});

/**
 * Cloud Function: Reset Tenant Admin Password
 * 
 * Allows platform admin to reset the password for a tenant's admin user
 * Security: Only platform admin can call this function
 */
export const resetTenantAdminPassword = functions.https.onCall(async (data: { 
  tenantId: string;
  newPassword: string;
}, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Get caller's user document to verify platform admin status
  const callerDoc = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .doc(context.auth.uid)
    .get();
  
  const callerData = callerDoc.data();
  const hasFirestoreFlag = callerData?.isPlatformAdmin === true;
  const hasCustomClaim = context.auth.token.isPlatformAdmin === true;

  // Log if only one method is present (flag drift detection)
  if (hasFirestoreFlag !== hasCustomClaim) {
    console.warn(
      `Platform admin flag mismatch for ${context.auth.uid}: ` +
      `Firestore=${hasFirestoreFlag}, CustomClaim=${hasCustomClaim}`
    );
  }

  // Security: Check if caller is platform admin (via Firestore profile OR custom claim)
  if (!hasFirestoreFlag && !hasCustomClaim) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only platform admin can reset tenant passwords'
    );
  }

  // Validate inputs
  if (!data.tenantId || !data.newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'tenantId and newPassword are required');
  }

  if (data.newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }

  try {
    // Get the tenant document
    const tenantDoc = await admin.firestore()
      .collection(COLLECTIONS.TENANTS)
      .doc(data.tenantId)
      .get();

    if (!tenantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Tenant not found');
    }

    const tenantData = tenantDoc.data();
    const adminEmail = tenantData?.adminEmail;

    if (!adminEmail) {
      throw new functions.https.HttpsError(
        'failed-precondition', 
        'Tenant admin email not found. Please run the migration first to populate admin info on existing tenants.'
      );
    }

    // Find the admin user by email
    let adminUser;
    try {
      adminUser = await admin.auth().getUserByEmail(adminEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new functions.https.HttpsError(
          'not-found',
          `Admin user ${adminEmail} not found in Firebase Auth. The tenant may have incomplete setup.`
        );
      }
      throw error;
    }

    // Update the admin user's password
    await admin.auth().updateUser(adminUser.uid, {
      password: data.newPassword
    });

    // Log the operation
    await logTenantOperation({
      tenantId: data.tenantId,
      operation: 'update',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email || 'unknown',
      details: {
        action: 'password_reset',
        adminEmail: adminEmail,
        message: 'Admin password reset by platform admin'
      }
    });

    console.log(`Password reset for tenant admin: ${adminEmail} (tenant: ${data.tenantId})`);

    return {
      success: true,
      message: `Password reset successfully for ${adminEmail}`
    };
  } catch (error: any) {
    console.error('Error resetting tenant admin password:', error);
    
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError('not-found', 'Admin user not found in Firebase Auth');
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'Failed to reset password');
  }
});

/**
 * EMERGENCY: One-time unauthenticated function to fix platform admin custom claims
 * This should be called once and then removed for security
 */
export const emergencyFixPlatformAdmin = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      // Security check: Only allow in development/first-time setup
      const secretCode = request.body.secretCode || request.query.secretCode;
      if (secretCode !== 'SYNCLY_EMERGENCY_FIX_2025') {
        response.status(403).json({ error: 'Invalid secret code' });
        return;
      }

      console.log('🚨 EMERGENCY: Fixing platform admin custom claims...');

      // Find platform admin user by email
      const usersSnapshot = await admin.firestore()
        .collection(COLLECTIONS.USERS)
        .where('email', '==', 'superadmin@syncly.com')
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        response.status(404).json({ 
          error: 'Platform admin not found in Firestore',
          message: 'Please create platform admin first using create-platform-admin.js'
        });
        return;
      }

      const adminDoc = usersSnapshot.docs[0];
      const adminData = adminDoc.data();
      const adminUid = adminDoc.id;

      console.log(`Found platform admin: ${adminData.email}, UID: ${adminUid}`);

      // Set custom claims
      await admin.auth().setCustomUserClaims(adminUid, {
        isPlatformAdmin: true,
        tenantId: null
      });

      // Update Firestore to mark claims as set
      await admin.firestore()
        .collection(COLLECTIONS.USERS)
        .doc(adminUid)
        .update({
          customClaimsSet: true,
          updatedAt: Date.now()
        });

      console.log('✅ Custom claims set successfully!');

      response.json({
        success: true,
        message: 'Platform admin custom claims set successfully',
        userId: adminUid,
        email: adminData.email,
        nextSteps: [
          'Logout from the app completely',
          'Clear browser cache/cookies',
          'Login again as superadmin@syncly.com',
          'Everything should work now!'
        ]
      });

    } catch (error: any) {
      console.error('Error fixing platform admin:', error);
      response.status(500).json({ 
        error: 'Failed to fix platform admin',
        message: error.message 
      });
    }
  });
});

/**
 * Cloud Function: Delete all tenant admin users (for cleanup/reset)
 */
export const deleteTenantAdmins = functions.https.onCall(async (data, context) => {
  // SECURITY: Only platform admin can delete tenant admins
  if (!context.auth || !context.auth.token.isPlatformAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only platform admin can delete tenant admins');
  }

  try {
    console.log('Deleting all tenant admin users...');

    // Get all non-platform admin users
    const usersSnapshot = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('isPlatformAdmin', '!=', true)
      .get();

    const deletedUsers = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      console.log(`Deleting user: ${userData.email} (${userId})`);

      // Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(userId);
        console.log(`  ✅ Deleted from Firebase Auth`);
      } catch (authError: any) {
        if (authError.code !== 'auth/user-not-found') {
          console.error(`  ⚠️  Auth delete error: ${authError.message}`);
        }
      }

      // Delete from Firestore
      await admin.firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .delete();
      console.log(`  ✅ Deleted from Firestore`);

      deletedUsers.push({
        email: userData.email,
        name: userData.name,
        tenantId: userData.tenantId
      });
    }

    console.log(`✅ Deleted ${deletedUsers.length} tenant admin user(s)`);

    return {
      success: true,
      message: `Deleted ${deletedUsers.length} tenant admin user(s)`,
      deletedUsers: deletedUsers
    };

  } catch (error: any) {
    console.error('Error deleting tenant admins:', error);
    throw new functions.https.HttpsError('internal', `Failed to delete tenant admins: ${error.message}`);
  }
});

/**
 * EMERGENCY: Unauthenticated function to delete tenant admins (one-time cleanup)
 */
export const emergencyDeleteTenantAdmins = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      // Security check
      const secretCode = request.body.secretCode || request.query.secretCode;
      if (secretCode !== 'SYNCLY_DELETE_TENANT_2025') {
        response.status(403).json({ error: 'Invalid secret code' });
        return;
      }

      console.log('🚨 EMERGENCY: Deleting all tenant admin users...');

      // Get all non-platform admin users
      const usersSnapshot = await admin.firestore()
        .collection(COLLECTIONS.USERS)
        .where('isPlatformAdmin', '!=', true)
        .get();

      const deletedUsers = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        console.log(`Deleting user: ${userData.email} (${userId})`);

        // Delete from Firebase Auth
        try {
          await admin.auth().deleteUser(userId);
          console.log(`  ✅ Deleted from Firebase Auth`);
        } catch (authError: any) {
          if (authError.code !== 'auth/user-not-found') {
            console.error(`  ⚠️  Auth delete error: ${authError.message}`);
          }
        }

        // Delete from Firestore
        await admin.firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .delete();
        console.log(`  ✅ Deleted from Firestore`);

        deletedUsers.push({
          email: userData.email,
          name: userData.name,
          tenantId: userData.tenantId
        });
      }

      console.log(`✅ Deleted ${deletedUsers.length} tenant admin user(s)`);

      response.json({
        success: true,
        message: `Deleted ${deletedUsers.length} tenant admin user(s)`,
        deletedUsers: deletedUsers
      });

    } catch (error: any) {
      console.error('Error deleting tenant admins:', error);
      response.status(500).json({ 
        error: 'Failed to delete tenant admins',
        message: error.message 
      });
    }
  });
});

/**
 * Cloud Function: Delete a specific tenant admin user
 * SECURITY: Only platform admin can delete tenant admins
 */
export const deleteTenantAdmin = functions.https.onCall(async (data, context) => {
  // SECURITY: Only platform admin can delete tenant admins
  if (!context.auth || !context.auth.token.isPlatformAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only platform admin can delete tenant admins');
  }

  const { tenantId, adminEmail } = data;

  if (!tenantId || !adminEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'tenantId and adminEmail are required');
  }

  try {
    console.log(`Deleting tenant admin: ${adminEmail} from tenant ${tenantId}`);

    // Find the user by email and tenantId
    const usersSnapshot = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('tenantId', '==', tenantId)
      .where('email', '==', adminEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', `User ${adminEmail} not found in tenant ${tenantId}`);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
      console.log(`  ✅ Deleted from Firebase Auth: ${userId}`);
    } catch (authError: any) {
      if (authError.code !== 'auth/user-not-found') {
        console.error(`  ⚠️  Auth delete error: ${authError.message}`);
        throw new functions.https.HttpsError('internal', `Failed to delete from Firebase Auth: ${authError.message}`);
      }
    }

    // Delete from Firestore
    await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .delete();
    console.log(`  ✅ Deleted from Firestore: ${userId}`);

    // Clear admin fields from tenant document
    await admin.firestore()
      .collection(COLLECTIONS.TENANTS)
      .doc(tenantId)
      .update({
        adminEmail: admin.firestore.FieldValue.delete(),
        adminUid: admin.firestore.FieldValue.delete(),
        adminName: admin.firestore.FieldValue.delete()
      });
    console.log(`  ✅ Cleared admin fields from tenant: ${tenantId}`);

    // Log the deletion
    await logTenantOperation({
      tenantId: tenantId,
      operation: 'delete',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email || 'unknown',
      details: {
        deletedUser: {
          id: userId,
          email: adminEmail,
          name: userData.name
        },
        tenantAdminFieldsCleared: true
      }
    });

    return {
      success: true,
      message: `Deleted tenant admin: ${adminEmail}. Tenant now has no admin user.`,
      deletedUser: {
        id: userId,
        email: adminEmail,
        name: userData.name
      }
    };

  } catch (error: any) {
    console.error('Error deleting tenant admin:', error);
    
    // Re-throw HttpsError directly
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to delete tenant admin: ${error.message}`);
  }
});

/**
 * Cloud Function: Fix All User Claims (Migration Utility)
 * 
 * CRITICAL FIX: Sets isTenantAdmin flag for all existing Admin role users
 * This fixes the permission error for users created before isTenantAdmin was added
 * 
 * Security: Only platform admin can call this function
 */
export const fixAllUserClaims = functions.https.onCall(async (data, context) => {
  // Security: Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Verify caller is platform admin (via custom claim)
  if (context.auth.token.isPlatformAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only platform admin can run this migration');
  }

  try {
    console.log('🔧 Starting user claims migration...');
    
    // Get all users from Firestore
    const usersSnapshot = await admin.firestore().collection(COLLECTIONS.USERS).get();
    
    const results = {
      total: usersSnapshot.size,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Process each user
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      
      // Skip platform admin
      if (userData.isPlatformAdmin === true) {
        results.skipped++;
        results.details.push({
          userId,
          email: userData.email,
          action: 'skipped',
          reason: 'platform admin'
        });
        continue;
      }

      try {
        // Determine if user should have isTenantAdmin flag
        const isTenantAdmin = userData.roleName === 'Admin';
        
        // Set custom claims
        await admin.auth().setCustomUserClaims(userId, {
          tenantId: userData.tenantId || null,
          isPlatformAdmin: false,
          isTenantAdmin: isTenantAdmin
        });

        // Update Firestore to mark claims as set
        await admin.firestore()
          .collection(COLLECTIONS.USERS)
          .doc(userId)
          .update({
            customClaimsSet: true,
            updatedAt: Date.now()
          });

        results.updated++;
        results.details.push({
          userId,
          email: userData.email,
          roleName: userData.roleName,
          action: 'updated',
          claims: {
            tenantId: userData.tenantId,
            isTenantAdmin: isTenantAdmin
          }
        });

        console.log(`✅ Updated claims for ${userData.email}: isTenantAdmin=${isTenantAdmin}`);

      } catch (error: any) {
        results.errors++;
        results.details.push({
          userId,
          email: userData.email,
          action: 'error',
          error: error.message
        });
        console.error(`❌ Error updating ${userData.email}:`, error.message);
      }
    }

    console.log(`✅ Migration complete: ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);

    return {
      success: true,
      message: 'User claims migration completed',
      results
    };

  } catch (error: any) {
    console.error('Migration error:', error);
    throw new functions.https.HttpsError('internal', `Migration failed: ${error.message}`);
  }
});

/**
 * ONE-TIME MIGRATION: Fix existing users and business units
 * Adds missing fields: isDeleted for users, status for business units
 */
export const migrateExistingData = functions.https.onCall(async (data, context) => {
  // Security: Only platform admin can run migrations
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const callerDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  
  if (!callerData || !callerData.isPlatformAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only Platform Admins can run migrations');
  }

  const db = admin.firestore();
  const results = {
    usersFixed: 0,
    businessUnitsFixed: 0,
    errors: 0,
    details: [] as any[]
  };

  try {
    console.log('🔧 Starting data migration...');

    // Fix all users - add isDeleted: false if missing
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
    console.log(`Found ${usersSnapshot.docs.length} users to check`);

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const updates: any = {};

        // Add isDeleted if missing
        if (userData.isDeleted === undefined) {
          updates.isDeleted = false;
        }

        // Add status if missing
        if (userData.status === undefined) {
          updates.status = 'active';
        }

        if (Object.keys(updates).length > 0) {
          await userDoc.ref.update(updates);
          results.usersFixed++;
          results.details.push({
            type: 'user',
            id: userDoc.id,
            email: userData.email,
            updates: Object.keys(updates)
          });
          console.log(`✅ Fixed user ${userData.email}:`, updates);
        }
      } catch (error: any) {
        results.errors++;
        console.error(`❌ Error fixing user ${userDoc.id}:`, error.message);
      }
    }

    // Fix all business units - add status: 'active' if missing
    const businessUnitsSnapshot = await db.collection(COLLECTIONS.BUSINESS_UNITS).get();
    console.log(`Found ${businessUnitsSnapshot.docs.length} business units to check`);

    for (const buDoc of businessUnitsSnapshot.docs) {
      try {
        const buData = buDoc.data();
        const updates: any = {};

        // Add status if missing
        if (buData.status === undefined) {
          updates.status = 'active';
        }

        if (Object.keys(updates).length > 0) {
          await buDoc.ref.update(updates);
          results.businessUnitsFixed++;
          results.details.push({
            type: 'businessUnit',
            id: buDoc.id,
            name: buData.name,
            updates: Object.keys(updates)
          });
          console.log(`✅ Fixed business unit ${buData.name}:`, updates);
        }
      } catch (error: any) {
        results.errors++;
        console.error(`❌ Error fixing business unit ${buDoc.id}:`, error.message);
      }
    }

    console.log(`✅ Migration complete: ${results.usersFixed} users fixed, ${results.businessUnitsFixed} business units fixed, ${results.errors} errors`);

    return {
      success: true,
      message: 'Data migration completed successfully',
      results
    };

  } catch (error: any) {
    console.error('Migration error:', error);
    throw new functions.https.HttpsError('internal', `Migration failed: ${error.message}`);
  }
});

/**
 * ============================================
 * TELEGRAM BOT INTEGRATION
 * ============================================
 */

// Telegram bot imports handled dynamically in webhook function
export { syncTelegramToUsers } from './sync-telegram';

/**
 * Cloud Function: Telegram Bot Webhook
 * 
 * Receives updates from Telegram and processes them
 * Webhook URL: https://<region>-<project>.cloudfunctions.net/telegramWebhook
 */
export const telegramWebhook = functions.https.onRequest(async (req, res) => {
  // Handle health checks and non-POST requests
  if (req.method !== 'POST') {
    res.status(200).send('OK');
    return;
  }
  
  // Handle empty or invalid updates (health checks)
  if (!req.body || !req.body.update_id) {
    console.log('[Webhook] Health check or invalid update, responding with OK');
    res.status(200).send('OK');
    return;
  }
  
  try {
    console.log('[Webhook] Received update:', JSON.stringify(req.body));
    
    // Import and use handleWebhook helper (passes response to Telegraf)
    const { handleWebhook } = await import('./telegram/bot');
    
    // Process the webhook update - Telegraf will send response automatically
    await handleWebhook(req.body, res);
    
    console.log('[Webhook] Update processed successfully');
  } catch (error: any) {
    console.error('[Webhook] ERROR processing update:', error);
    console.error('[Webhook] Error stack:', error.stack);
    // Still return 200 to Telegram to avoid retries
    if (!res.headersSent) {
      res.status(200).send('OK');
    }
  }
});

/**
 * Cloud Function: Send Telegram Notification
 * 
 * Callable function to send notifications to users via Telegram
 * Used by the notification scheduler
 */
export const sendTelegramNotification = functions.https.onCall(async (data, context) => {
  // Import here to avoid circular dependency issues
  const { sendNotificationToUser } = await import('./telegram/notifications');
  
  try {
    const success = await sendNotificationToUser(data);
    return { success };
  } catch (error: any) {
    console.error('Error sending Telegram notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cloud Function: Generate Telegram Linking Code
 * 
 * Creates a one-time code for linking Telegram accounts
 */
export const generateTelegramLinkingCode = functions.https.onCall(async (data, context) => {
  // Security: Must be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const { generateLinkingCode, storeLinkingCode } = await import('./telegram/auth');
  
  try {
    // Get user data
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data()!;
    
    // Generate and store code
    const code = generateLinkingCode();
    await storeLinkingCode(context.auth.uid, userData.tenantId, code);
    
    // Return code and bot link
    const botUsername = 'syncly_superbot';
    const deepLink = `https://t.me/${botUsername}?start=${code}`;
    
    return {
      success: true,
      code,
      deepLink,
      expiresIn: 300 // 5 minutes
    };
  } catch (error: any) {
    console.error('Error generating linking code:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
