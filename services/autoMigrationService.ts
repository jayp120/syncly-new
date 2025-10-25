/**
 * Auto-Migration Service
 * 
 * Automatically runs role migrations in the background on app initialization.
 * Ensures all system roles always have the latest permissions without manual intervention.
 */

import { DEFAULT_ROLES, SYSTEM_ROLE_IDS } from '../constants';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

let migrationAttempted = false;

/**
 * Automatically migrates system roles if needed
 * Runs silently in the background on app startup
 */
export async function autoMigrateRoles(): Promise<void> {
  // Only attempt migration once per session
  if (migrationAttempted) {
    return;
  }
  
  migrationAttempted = true;
  
  try {
    console.log('[AutoMigration] Checking if role migration is needed...');
    
    const rolesRef = collection(db, 'roles');
    const snapshot = await getDocs(rolesRef);
    
    if (snapshot.empty) {
      console.log('[AutoMigration] No roles found, skipping migration');
      return;
    }
    
    let needsUpdate = false;
    const rolesToUpdate: { docId: string; roleId: string; template: any }[] = [];
    
    // Check which roles need updating
    for (const roleDoc of snapshot.docs) {
      const existingRole = roleDoc.data();
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
          docId: roleDoc.id, 
          roleId, 
          template 
        });
      }
    }
    
    if (!needsUpdate) {
      console.log('[AutoMigration] ✅ All roles up-to-date');
      return;
    }
    
    // Perform updates
    console.log(`[AutoMigration] 🔧 Updating ${rolesToUpdate.length} role(s)...`);
    
    for (const { docId, roleId, template } of rolesToUpdate) {
      try {
        const roleDocRef = doc(db, 'roles', docId);
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
