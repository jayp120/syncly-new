import { 
  Tenant, 
  TenantPlan, 
  TenantStatus, 
  Role, 
  BusinessUnit, 
  User, 
  UserStatus, 
  Permission 
} from '../types';
import { tenantRepository } from './repositories';
import { roleRepository } from './repositories';
import { businessUnitRepository } from './repositories';
import { userRepository } from './repositories';
import { generateFirestoreId } from './firestoreService';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export interface TenantProvisioningData {
  companyName: string;
  domain?: string;
  plan: TenantPlan;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export interface ProvisioningResult {
  success: boolean;
  tenant?: Tenant;
  adminUser?: User;
  error?: string;
}

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
      name: 'Manager',
      description: 'Team management and oversight',
      permissions: [
        Permission.CAN_VIEW_ALL_REPORTS,
        Permission.CAN_MANAGE_TEAM_REPORTS,
        Permission.CAN_ACKNOWLEDGE_REPORTS,
        Permission.CAN_SUBMIT_OWN_EOD,
        Permission.CAN_VIEW_OWN_REPORTS,
        Permission.CAN_MANAGE_TEAM_TASKS,
        Permission.CAN_CREATE_PERSONAL_TASKS,
        Permission.CAN_MANAGE_ALL_LEAVES,
        Permission.CAN_SUBMIT_OWN_LEAVE,
        Permission.CAN_MANAGE_TEAM_MEETINGS,
        Permission.CAN_VIEW_OWN_MEETINGS,
        Permission.CAN_VIEW_LEADERBOARD,
        Permission.CAN_VIEW_TEAM_CALENDAR,
        Permission.CAN_VIEW_OWN_CALENDAR,
        Permission.CAN_USE_PERFORMANCE_HUB
      ]
    },
    {
      id: generateFirestoreId('role'),
      tenantId,
      name: 'Employee',
      description: 'Standard employee access',
      permissions: [
        Permission.CAN_SUBMIT_OWN_EOD,
        Permission.CAN_VIEW_OWN_REPORTS,
        Permission.CAN_CREATE_PERSONAL_TASKS,
        Permission.CAN_SUBMIT_OWN_LEAVE,
        Permission.CAN_VIEW_OWN_MEETINGS,
        Permission.CAN_VIEW_LEADERBOARD,
        Permission.CAN_VIEW_OWN_CALENDAR
      ]
    }
  ];

  for (const role of roles) {
    await roleRepository.create(role.id, role);
  }

  return roles;
};

const createDefaultBusinessUnits = async (tenantId: string): Promise<BusinessUnit[]> => {
  const businessUnits: BusinessUnit[] = [
    {
      id: generateFirestoreId('bu'),
      tenantId,
      name: 'Executive',
      status: 'active'
    },
    {
      id: generateFirestoreId('bu'),
      tenantId,
      name: 'Sales',
      status: 'active'
    },
    {
      id: generateFirestoreId('bu'),
      tenantId,
      name: 'Technology',
      status: 'active'
    },
    {
      id: generateFirestoreId('bu'),
      tenantId,
      name: 'Operations',
      status: 'active'
    },
    {
      id: generateFirestoreId('bu'),
      tenantId,
      name: 'HR',
      status: 'active'
    }
  ];

  for (const bu of businessUnits) {
    await businessUnitRepository.create(bu.id, bu);
  }

  return businessUnits;
};

const createAdminUser = async (
  tenantId: string, 
  email: string, 
  password: string, 
  name: string, 
  adminRoleId: string,
  executiveBuId: string
): Promise<User> => {
  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUid = userCredential.user.uid;

  // Create user profile in Firestore
  const userId = generateFirestoreId('user');
  const newUser: User = {
    id: userId,
    tenantId,
    email: email.toLowerCase(),
    notificationEmail: email.toLowerCase(),
    name,
    roleId: adminRoleId,
    roleName: 'Super Admin',
    status: UserStatus.ACTIVE,
    designation: 'Administrator',
    businessUnitId: executiveBuId,
    businessUnitName: 'Executive',
    isSuspended: false
  };

  await userRepository.create(firebaseUid, newUser);

  return newUser;
};

export const provisionNewTenant = async (
  data: TenantProvisioningData
): Promise<ProvisioningResult> => {
  try {
    // 1. Generate tenant ID from company name
    const tenantId = `tenant_${data.companyName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    // 2. Create tenant record
    const tenant: Tenant = {
      id: tenantId,
      name: data.companyName,
      domain: data.domain,
      plan: data.plan,
      status: TenantStatus.ACTIVE,
      createdAt: Date.now(),
      adminEmail: data.adminEmail,
      settings: {
        maxUsers: data.plan === TenantPlan.STARTER ? 10 : data.plan === TenantPlan.PROFESSIONAL ? 50 : 500,
        features: ['eod', 'tasks', 'meetings', 'leaderboard', 'performance-hub']
      }
    };

    await tenantRepository.create(tenant.id, tenant);

    // 3. Create default roles for this tenant
    const roles = await createDefaultRoles(tenantId);
    const adminRole = roles.find(r => r.name === 'Super Admin')!;

    // 4. Create default business units for this tenant
    const businessUnits = await createDefaultBusinessUnits(tenantId);
    const executiveBu = businessUnits.find(bu => bu.name === 'Executive')!;

    // 5. Create admin user
    const adminUser = await createAdminUser(
      tenantId,
      data.adminEmail,
      data.adminPassword,
      data.adminName,
      adminRole.id,
      executiveBu.id
    );

    return {
      success: true,
      tenant,
      adminUser
    };
  } catch (error: any) {
    console.error('Tenant provisioning error:', error);
    return {
      success: false,
      error: error.message || 'Failed to provision tenant'
    };
  }
};

export const updateTenantStatus = async (
  tenantId: string, 
  status: TenantStatus
): Promise<void> => {
  await tenantRepository.update(tenantId, { status });
};

export const updateTenantPlan = async (
  tenantId: string, 
  plan: TenantPlan
): Promise<void> => {
  const maxUsers = 
    plan === TenantPlan.STARTER ? 10 : 
    plan === TenantPlan.PROFESSIONAL ? 50 : 
    500;

  await tenantRepository.update(tenantId, { 
    plan,
    settings: { maxUsers, features: ['eod', 'tasks', 'meetings', 'leaderboard', 'performance-hub'] }
  });
};

export const getTenantStats = async (tenantId: string) => {
  // Platform admin can query users for specific tenant
  const users = await userRepository.getAll(tenantId);
  
  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === UserStatus.ACTIVE).length,
    archivedUsers: users.filter(u => u.status === UserStatus.ARCHIVED).length
  };
};
