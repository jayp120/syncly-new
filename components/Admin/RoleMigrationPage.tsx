import React, { useState, useEffect } from 'react';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Alert from '../Common/Alert';
import Spinner from '../Common/Spinner';
import { useAuth } from '../Auth/AuthContext';
import { migrateAllSystemRoles, checkMigrationStatus } from '../../services/roleMigrationService';
import type { MigrationResult } from '../../services/roleMigrationService';

const RoleMigrationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    needsMigration: boolean;
    outdatedRoles: string[];
    details: string;
  } | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const status = await checkMigrationStatus();
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('This will update all system roles (tenant_admin, manager, team_lead, employee) across all tenants to include the latest permissions. Continue?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrateAllSystemRoles();
      setMigrationResult(result);
      
      // Refresh status after migration
      if (result.success) {
        setTimeout(() => {
          checkStatus();
        }, 1000);
      }
    } catch (error: any) {
      setMigrationResult({
        success: false,
        rolesUpdated: [],
        rolesSkipped: [],
        errors: [{ roleId: 'unknown', error: error.message }],
        totalPermissionsAdded: 0,
        message: `Migration failed: ${error.message}`
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (!currentUser?.isPlatformAdmin && currentUser?.roleName !== 'Tenant Admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card title="Access Denied">
          <div className="text-center py-8">
            <i className="fas fa-lock text-6xl text-gray-400 dark:text-gray-600 mb-4"></i>
            <p className="text-lg font-semibold mb-2">Admin Access Required</p>
            <p className="text-gray-600 dark:text-gray-400">
              Only Platform Admins and Tenant Admins can access the migration utility.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card 
        title="Role Permission Migration" 
        titleIcon={<i className="fas fa-sync-alt"></i>}
      >
        <div className="space-y-6">
          <Alert variant="info">
            <div className="space-y-2">
              <p className="font-semibold">🔧 What does this do?</p>
              <p>
                This utility updates all system roles (Tenant Admin, Manager, Team Lead, Employee) 
                to include the latest 68-permission set. This fixes the "Access Denied" issue when 
                roles are missing new permissions.
              </p>
            </div>
          </Alert>

          {isChecking ? (
            <Spinner message="Checking migration status..." />
          ) : migrationStatus ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                migrationStatus.needsMigration 
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-green-500 bg-green-50 dark:bg-green-900/20'
              }`}>
                <div className="flex items-start space-x-3">
                  <i className={`fas ${
                    migrationStatus.needsMigration ? 'fa-exclamation-triangle text-orange-600' : 'fa-check-circle text-green-600'
                  } text-2xl mt-1`}></i>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      {migrationStatus.needsMigration ? 'Migration Required' : 'All Up-to-Date'}
                    </h3>
                    <p className="text-sm mb-3">{migrationStatus.details}</p>
                    
                    {migrationStatus.outdatedRoles.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm mb-2">Roles that need updating:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {migrationStatus.outdatedRoles.map((role, idx) => (
                            <li key={idx}>{role}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {migrationStatus.needsMigration && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div>
                    <p className="font-semibold mb-1">Ready to migrate?</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This will update all outdated system roles with the latest permissions.
                    </p>
                  </div>
                  <Button 
                    onClick={handleMigrate} 
                    disabled={isMigrating}
                    variant="primary"
                    icon={<i className="fas fa-rocket"></i>}
                  >
                    {isMigrating ? 'Migrating...' : 'Run Migration'}
                  </Button>
                </div>
              )}

              <Button 
                onClick={checkStatus} 
                variant="ghost"
                size="sm"
                icon={<i className="fas fa-refresh"></i>}
              >
                Refresh Status
              </Button>
            </div>
          ) : null}

          {migrationResult && (
            <div className={`p-6 rounded-lg border-2 ${
              migrationResult.success 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'border-red-500 bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-start space-x-3 mb-4">
                <i className={`fas ${
                  migrationResult.success ? 'fa-check-circle text-green-600' : 'fa-exclamation-circle text-red-600'
                } text-3xl`}></i>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">Migration Complete</h3>
                  <p className="text-lg">{migrationResult.message}</p>
                </div>
              </div>

              {migrationResult.rolesUpdated.length > 0 && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border">
                  <p className="font-semibold mb-2">✅ Updated Roles ({migrationResult.rolesUpdated.length}):</p>
                  <ul className="list-disc list-inside space-y-1">
                    {migrationResult.rolesUpdated.map((role, idx) => (
                      <li key={idx} className="text-sm">{role}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-semibold text-green-700 dark:text-green-400">
                    Added {migrationResult.totalPermissionsAdded} total permissions across all roles
                  </p>
                </div>
              )}

              {migrationResult.rolesSkipped.length > 0 && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border">
                  <p className="font-semibold mb-2">⏭️  Skipped ({migrationResult.rolesSkipped.length}):</p>
                  <ul className="list-disc list-inside space-y-1">
                    {migrationResult.rolesSkipped.map((role, idx) => (
                      <li key={idx} className="text-sm">{role}</li>
                    ))}
                  </ul>
                </div>
              )}

              {migrationResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded border border-red-300">
                  <p className="font-semibold mb-2 text-red-700 dark:text-red-400">❌ Errors ({migrationResult.errors.length}):</p>
                  <ul className="space-y-2">
                    {migrationResult.errors.map((err, idx) => (
                      <li key={idx} className="text-sm">
                        <span className="font-semibold">{err.roleId}:</span> {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {migrationResult.success && (
                <Alert variant="success" className="mt-4">
                  <p className="font-semibold mb-2">🎉 Next Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)</li>
                    <li>Try accessing Roles & Permissions again</li>
                    <li>You should now have full access! ✅</li>
                  </ol>
                </Alert>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="Migration Information">
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">📊 Permission System Evolution:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong>Before:</strong> 28 basic permissions</li>
              <li><strong>Now:</strong> 68 granular permissions across 11 domains</li>
              <li><strong>Impact:</strong> Better security, finer access control, comprehensive audit trails</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">🔐 What Gets Updated:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li><strong>Tenant Admin:</strong> 65 permissions (all tenant-level features)</li>
              <li><strong>Manager:</strong> 30 permissions (team oversight & approvals)</li>
              <li><strong>Team Lead:</strong> 20 permissions (team coordination)</li>
              <li><strong>Employee:</strong> 10 permissions (self-service only)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">⚠️ Important Notes:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Only system roles are updated (custom roles are preserved)</li>
              <li>User assignments remain unchanged</li>
              <li>Changes take effect immediately after migration</li>
              <li>Safe to run multiple times (idempotent operation)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RoleMigrationPage;
