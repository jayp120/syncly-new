/**
 * Role Migration Service
 * 
 * Production-ready service to update existing role documents in Firestore
 * to match the latest DEFAULT_ROLES templates with expanded permissions.
 * 
 * This handles the migration from 28 to 68 permissions system-wide.
 */

import { DEFAULT_ROLES, SYSTEM_ROLE_IDS } from '../constants';
import { Role, Permission } from '../types';
import * as DataService from './dataService';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

export interface MigrationResult {
  success: boolean;
  rolesUpdated: string[];
  rolesSkipped: string[];
  errors: { roleId: string; error: string }[];
  totalPermissionsAdded: number;
  message: string;
}

/**
 * Migrates all system roles across all tenants to match DEFAULT_ROLES templates
 */
export async function migrateAllSystemRoles(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    rolesUpdated: [],
    rolesSkipped: [],
    errors: [],
    totalPermissionsAdded: 0,
    message: ''
  };

  try {
    console.log('🔄 Starting role migration...');
    
    // Get all role documents from Firestore
    const rolesRef = collection(db, 'roles');
    const snapshot = await getDocs(rolesRef);
    
    console.log(`📊 Found ${snapshot.size} role documents in Firestore`);
    
    for (const roleDoc of snapshot.docs) {
      const existingRole = roleDoc.data() as Role;
      const roleId = existingRole.id;
      
      // Only migrate system roles
      if (!SYSTEM_ROLE_IDS.includes(roleId)) {
        console.log(`⏭️  Skipping custom role: ${roleId}`);
        result.rolesSkipped.push(roleId);
        continue;
      }
      
      // Find the template for this role
      const template = DEFAULT_ROLES.find(r => r.id === roleId);
      
      if (!template) {
        console.warn(`⚠️  No template found for system role: ${roleId}`);
        result.rolesSkipped.push(roleId);
        continue;
      }
      
      // Check if role needs updating
      const currentPermissions = new Set(existingRole.permissions || []);
      const templatePermissions = new Set(template.permissions);
      
      const missingPermissions = template.permissions.filter(p => !currentPermissions.has(p));
      
      if (missingPermissions.length === 0) {
        console.log(`✅ Role "${existingRole.name}" (${roleId}) is already up-to-date`);
        result.rolesSkipped.push(roleId);
        continue;
      }
      
      console.log(`🔧 Updating role "${existingRole.name}" (${roleId})`);
      console.log(`   Adding ${missingPermissions.length} missing permissions`);
      
      try {
        // Update the role document in Firestore
        const roleDocRef = doc(db, 'roles', roleDoc.id);
        await updateDoc(roleDocRef, {
          permissions: template.permissions,
          description: template.description, // Also update description
          // Keep existing tenantId and name
        });
        
        result.rolesUpdated.push(`${existingRole.name} (${roleId})`);
        result.totalPermissionsAdded += missingPermissions.length;
        
        console.log(`✅ Successfully updated role: ${existingRole.name}`);
      } catch (error: any) {
        console.error(`❌ Error updating role ${roleId}:`, error);
        result.errors.push({
          roleId,
          error: error.message
        });
        result.success = false;
      }
    }
    
    // Generate summary message
    if (result.rolesUpdated.length === 0 && result.errors.length === 0) {
      result.message = '✅ All system roles are already up-to-date! No migration needed.';
    } else if (result.errors.length === 0) {
      result.message = `✅ Successfully migrated ${result.rolesUpdated.length} role(s). Added ${result.totalPermissionsAdded} total permissions.`;
    } else {
      result.message = `⚠️ Migration completed with errors. ${result.rolesUpdated.length} updated, ${result.errors.length} failed.`;
      result.success = false;
    }
    
    console.log('\n' + result.message);
    console.log('Updated roles:', result.rolesUpdated);
    console.log('Skipped roles:', result.rolesSkipped);
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Fatal error during migration:', error);
    result.success = false;
    result.message = `❌ Migration failed: ${error.message}`;
    return result;
  }
}

/**
 * Checks if any system roles need migration
 */
export async function checkMigrationStatus(): Promise<{
  needsMigration: boolean;
  outdatedRoles: string[];
  details: string;
}> {
  try {
    const rolesRef = collection(db, 'roles');
    const snapshot = await getDocs(rolesRef);
    
    const outdatedRoles: string[] = [];
    
    for (const roleDoc of snapshot.docs) {
      const existingRole = roleDoc.data() as Role;
      const roleId = existingRole.id;
      
      if (!SYSTEM_ROLE_IDS.includes(roleId)) continue;
      
      const template = DEFAULT_ROLES.find(r => r.id === roleId);
      if (!template) continue;
      
      const currentPermissions = new Set(existingRole.permissions || []);
      const missingPermissions = template.permissions.filter(p => !currentPermissions.has(p));
      
      if (missingPermissions.length > 0) {
        outdatedRoles.push(`${existingRole.name} (missing ${missingPermissions.length} permissions)`);
      }
    }
    
    return {
      needsMigration: outdatedRoles.length > 0,
      outdatedRoles,
      details: outdatedRoles.length > 0 
        ? `${outdatedRoles.length} system role(s) need updating`
        : 'All system roles are up-to-date'
    };
  } catch (error: any) {
    return {
      needsMigration: false,
      outdatedRoles: [],
      details: `Error checking status: ${error.message}`
    };
  }
}
