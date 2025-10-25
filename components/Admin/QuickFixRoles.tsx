import React, { useState } from 'react';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { DEFAULT_ROLES, SYSTEM_ROLE_IDS } from '../../constants';

const QuickFixRoles: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
    console.log(message);
  };
  
  const runMigration = async () => {
    setIsRunning(true);
    setLog([]);
    
    try {
      addLog('🚀 Starting role migration...');
      
      const rolesRef = collection(db, 'roles');
      const snapshot = await getDocs(rolesRef);
      
      addLog(`📊 Found ${snapshot.size} roles in Firestore`);
      
      let updatedCount = 0;
      
      for (const roleDoc of snapshot.docs) {
        const role = roleDoc.data();
        const roleId = role.id;
        
        // Only update system roles
        if (!SYSTEM_ROLE_IDS.includes(roleId)) {
          addLog(`⏭️  Skipping custom role: ${roleId}`);
          continue;
        }
        
        const template = DEFAULT_ROLES.find(r => r.id === roleId);
        
        if (!template) {
          addLog(`⚠️  No template found for: ${roleId}`);
          continue;
        }
        
        addLog(`🔧 Updating role: ${roleId} (${role.name})`);
        addLog(`   Current: ${role.permissions?.length || 0} permissions`);
        addLog(`   New: ${template.permissions.length} permissions`);
        
        await updateDoc(doc(db, 'roles', roleDoc.id), {
          permissions: template.permissions,
          description: template.description
        });
        
        updatedCount++;
        addLog(`✅ Updated ${roleId}`);
      }
      
      addLog('');
      addLog(`🎉 SUCCESS! Updated ${updatedCount} roles`);
      addLog('👉 Refresh the page to see changes!');
      
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      console.error('Migration error:', error);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card 
        title="🔧 Emergency Role Migration" 
        titleIcon={<i className="fas fa-wrench" />}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">
              ⚠️ This tool will update all system roles to the latest permission set:
            </p>
            <ul className="mt-2 ml-4 text-sm text-yellow-700 list-disc">
              <li>Tenant Admin: 28 → 65 permissions</li>
              <li>Manager: 15 → 30 permissions</li>
              <li>Team Lead: 10 → 20 permissions</li>
              <li>Employee: 8 → 10 permissions</li>
            </ul>
          </div>
          
          <Button 
            onClick={runMigration}
            disabled={isRunning}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {isRunning ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" />
                Running Migration...
              </>
            ) : (
              <>
                <i className="fas fa-rocket mr-2" />
                Run Migration NOW
              </>
            )}
          </Button>
          
          {log.length > 0 && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default QuickFixRoles;
