/**
 * Auto-Migration Service
 * 
 * Automatically runs role migrations in the background on app initialization.
 * Ensures all system roles always have the latest permissions without manual intervention.
 */

import { DEFAULT_ROLES, SYSTEM_ROLE_IDS } from '../constants';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getAllRoles } from './firestoreService';

let migrationAttempted = false;

/**
 * Automatically migrates system roles if needed
 * Runs silently in the background on app startup
 */
export async function autoMigrateRoles(tenantId: string): Promise<void> {
  // Only attempt migration once per session
  if (migrationAttempted) {
    return;
  }
  
  migrationAttempted = true;
  
  try {
    console.log('[AutoMigration] Checking if role migration is needed...');
    console.log(`[AutoMigration] Tenant ID: ${tenantId}`);
    
    // Use existing getAllRoles which already handles tenant scoping and security
    const roles = await getAllRoles(tenantId);
    
    if (!roles || roles.length === 0) {
      console.log('[AutoMigration] No roles found, skipping migration');
      return;
    }
    
    console.log(`[AutoMigration] Found ${roles.length} roles to check`)
    
    let needsUpdate = false;
    const rolesToUpdate: { roleData: any; roleId: string; template: any }[] = [];
    
    // Check which roles need updating
    for (const existingRole of roles) {
      const roleId = existingRole.id;
      
      // Only check system roles
      if (!SYSTEM_ROLE_IDS.includes(roleId)) {
        continue;
      }
      
      const template = DEFAULT_ROLES.find(r => r.id === roleId);
      if (!template) {
        continue;
      }
      
      // Check if permissions match
      const currentPermissions = new Set(existingRole.permissions || []);
      const missingPermissions = template.permissions.filter(p => !currentPermissions.has(p));
      
      if (missingPermissions.length > 0) {
        needsUpdate = true;
        rolesToUpdate.push({ 
          roleData: existingRole, 
          roleId, 
          template 
        });
      }
    }
    
    if (!needsUpdate) {
      console.log('[AutoMigration] ✅ All roles up-to-date');
      return;
    }
    
    // Perform updates using Firestore document ID from the role data
    console.log(`[AutoMigration] 🔧 Updating ${rolesToUpdate.length} role(s)...`);
    
    for (const { roleData, roleId, template } of rolesToUpdate) {
      try {
        // Use the Firestore document ID (which should be role.id for roles)
        const firestoreDocId = roleData.id; // This is the Firestore document ID
        const roleDocRef = doc(db, 'roles', firestoreDocId);
        await updateDoc(roleDocRef, {
          permissions: template.permissions,
          description: template.description,
        });
        console.log(`[AutoMigration] ✅ Updated role: ${roleId}`);
      } catch (error) {
        console.error(`[AutoMigration] ❌ Failed to update role ${roleId}:`, error);
      }
    }
    
    console.log('[AutoMigration] ✅ Auto-migration complete!');
    
  } catch (error) {
    // Silently fail - don't block app startup
    console.error('[AutoMigration] Migration error (non-fatal):', error);
  }
}

/**
 * Reset migration flag (useful for testing)
 */
export function resetMigrationFlag(): void {
  migrationAttempted = false;
}
