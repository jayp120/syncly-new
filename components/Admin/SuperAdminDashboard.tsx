import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { Tenant, TenantPlan, TenantStatus } from '../../types';
import { tenantRepository } from '../../services/repositories';
import { 
  updateTenantStatus, 
  updateTenantPlan, 
  getTenantStats
} from '../../services/tenantProvisioning';
import { 
  callCreateTenant, 
  CreateTenantRequest,
  callFixAllUserClaims,
  callMigrateExistingData
} from '../../services/cloudFunctions';
import { useToast } from '../../contexts/ToastContext';
import Button from '../Common/Button';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Modal from '../Common/Modal';

const SuperAdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [tenantStats, setTenantStats] = useState<Record<string, any>>({});
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isFixingClaims, setIsFixingClaims] = useState(false);
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<Record<string, boolean>>({});

  // New tenant form state
  const [newTenant, setNewTenant] = useState<CreateTenantRequest>({
    companyName: '',
    plan: 'Professional',
    adminEmail: '',
    adminPassword: '',
    adminName: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const allTenants = await tenantRepository.getAll();
      setTenants(allTenants);

      // Load stats for each tenant
      const stats: Record<string, any> = {};
      for (const tenant of allTenants) {
        stats[tenant.id] = await getTenantStats(tenant.id);
      }
      setTenantStats(stats);
    } catch (error) {
      console.error('Error loading tenants:', error);
      addToast('Failed to load tenants', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenant.companyName || !newTenant.adminEmail || !newTenant.adminPassword || !newTenant.adminName) {
      addToast('Please fill all required fields', 'error');
      return;
    }

    setIsProvisioning(true);
    try {
      // ⭐ Use Cloud Function - does NOT sign out the platform admin!
      const result = await callCreateTenant(newTenant);
      
      if (result.success) {
        addToast(`✅ Tenant "${newTenant.companyName}" created successfully!`, 'success');
        setShowCreateModal(false);
        setNewTenant({
          companyName: '',
          plan: 'Professional',
          adminEmail: '',
          adminPassword: '',
          adminName: ''
        });
        await loadTenants();
      } else {
        addToast(`Failed: ${result.message}`, 'error');
      }
    } catch (error: any) {
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleUpdateStatus = async (tenantId: string, newStatus: TenantStatus) => {
    try {
      await updateTenantStatus(tenantId, newStatus);
      addToast('Tenant status updated', 'success');
      await loadTenants();
    } catch (error) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleUpdatePlan = async (tenantId: string, newPlan: TenantPlan) => {
    try {
      await updateTenantPlan(tenantId, newPlan);
      addToast('Tenant plan updated', 'success');
      await loadTenants();
    } catch (error) {
      addToast('Failed to update plan', 'error');
    }
  };

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case TenantStatus.ACTIVE: return 'bg-green-100 text-green-800';
      case TenantStatus.SUSPENDED: return 'bg-yellow-100 text-yellow-800';
      case TenantStatus.INACTIVE: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: TenantPlan) => {
    switch (plan) {
      case TenantPlan.STARTER: return 'bg-blue-100 text-blue-800';
      case TenantPlan.PROFESSIONAL: return 'bg-purple-100 text-purple-800';
      case TenantPlan.ENTERPRISE: return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowViewModal(true);
  };

  const handleOpenSettings = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setNewPassword('');
    setShowSettingsModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedTenant || !newPassword || newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      // Call Cloud Function to reset admin password
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../services/firebase');
      const resetTenantPassword = httpsCallable(functions, 'resetTenantAdminPassword');
      
      const result = await resetTenantPassword({
        tenantId: selectedTenant.id,
        newPassword: newPassword
      });

      const data = result.data as any;
      if (data.success) {
        addToast('✅ Password reset successfully!', 'success');
        setShowSettingsModal(false);
        setNewPassword('');
      } else {
        addToast(`Failed: ${data.message}`, 'error');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleFixPermissions = async () => {
    if (!confirm('This will update all tenant roles to use correct permission format. Continue?')) {
      return;
    }

    setIsLoading(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../services/firebase');
      const fixRolePermissions = httpsCallable(functions, 'fixRolePermissions');
      
      const result = await fixRolePermissions();
      const data = result.data as any;
      
      if (data.success) {
        addToast(`✅ ${data.message}`, 'success');
        alert(`Permission Fix Complete!\n\nRoles Updated: ${data.rolesUpdated}\n\nPlease logout and login again to see changes.`);
      } else {
        addToast('Permission fix failed', 'error');
      }
    } catch (error: any) {
      console.error('Permission fix error:', error);
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTenantAdmin = async (tenant: Tenant) => {
    if (!tenant.adminEmail) {
      addToast('No admin email found for this tenant', 'error');
      return;
    }

    const confirmMsg = `⚠️ DELETE TENANT ADMIN\n\nThis will permanently delete:\n• Email: ${tenant.adminEmail}\n• From: ${tenant.name}\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm.`;
    
    const userInput = prompt(confirmMsg);
    if (userInput !== 'DELETE') {
      addToast('Delete cancelled', 'info');
      return;
    }

    setIsDeletingUser(prev => ({ ...prev, [tenant.id]: true }));
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../services/firebase');
      const deleteTenantAdmin = httpsCallable(functions, 'deleteTenantAdmin');
      
      const result = await deleteTenantAdmin({
        tenantId: tenant.id,
        adminEmail: tenant.adminEmail
      });

      const data = result.data as any;
      if (data.success) {
        addToast(`✅ ${data.message}`, 'success');
        await loadTenants();
      } else {
        addToast(`Failed: ${data.message}`, 'error');
      }
    } catch (error: any) {
      console.error('Delete tenant admin error:', error);
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsDeletingUser(prev => ({ ...prev, [tenant.id]: false }));
    }
  };

  const handleMigrateData = async () => {
    if (!confirm('🔧 FIX MISSING FIELDS\n\nThis migration will:\n✅ Add isDeleted=false to all users\n✅ Add status=\'active\' to all business units\n\nThis fixes the User Management and Business Units display issues.\n\nSafe to run multiple times. Continue?')) {
      return;
    }

    setIsMigratingData(true);
    try {
      const result = await callMigrateExistingData();
      
      if (result.success) {
        const { results } = result;
        addToast(`✅ Migration complete! Fixed ${results.usersFixed} users, ${results.businessUnitsFixed} business units`, 'success');
        
        alert(`✅ DATA MIGRATION SUCCESSFUL!\n\n` +
              `Users Fixed: ${results.usersFixed}\n` +
              `Business Units Fixed: ${results.businessUnitsFixed}\n` +
              `Errors: ${results.errors}\n\n` +
              `Please logout and login again to see all users and business units!`);
      } else {
        addToast('Migration failed', 'error');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsMigratingData(false);
    }
  };

  const handleFixUserClaims = async () => {
    if (!confirm('Fix custom claims for all existing users?\n\nThis sets the isTenantAdmin flag for Admin role users.\n\nUsers will need to LOGOUT and LOGIN again to get fresh tokens.\n\nContinue?')) {
      return;
    }

    setIsFixingClaims(true);
    try {
      const result = await callFixAllUserClaims();
      
      if (result.success) {
        const { results } = result;
        
        // Show detailed results
        const details = results.details.map((d: any) => 
          `${d.email}: ${d.action} ${d.roleName ? `(${d.roleName})` : ''}`
        ).join('\n');
        
        alert(
          `✅ User Claims Migration Complete!\n\n` +
          `Total Users: ${results.total}\n` +
          `Updated: ${results.updated}\n` +
          `Skipped: ${results.skipped}\n` +
          `Errors: ${results.errors}\n\n` +
          `Details:\n${details}\n\n` +
          `⚠️ IMPORTANT: All users must LOGOUT and LOGIN again to get new permissions!`
        );
        
        addToast(`✅ Fixed ${results.updated} users. Users must logout/login again!`, 'success');
      } else {
        addToast('Failed to fix user claims', 'error');
      }
    } catch (error: any) {
      console.error('Fix claims error:', error);
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsFixingClaims(false);
    }
  };

  const handleRunMigration = async () => {
    if (!confirm('Run migration to backfill admin info on all existing tenants?\n\nThis is safe to run multiple times.')) {
      return;
    }

    setIsMigrating(true);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../services/firebase');
      const backfillTenantAdminInfo = httpsCallable(functions, 'backfillTenantAdminInfo');
      
      const result = await backfillTenantAdminInfo({});
      const data = result.data as any;
      
      if (data.success) {
        const { results } = data;
        
        // Show detailed results
        if (results.errors.length > 0) {
          console.error('Migration errors:', results.errors);
          const errorDetails = results.errors.join('\n');
          
          // Check if errors are about missing users (orphaned tenants)
          const hasOrphanedTenants = results.errors.some((err: string) => err.includes('No users found'));
          
          if (hasOrphanedTenants && confirm(
            `Migration Complete!\n\n` +
            `✅ Updated: ${results.updated}\n` +
            `⏭️ Skipped: ${results.skipped}\n` +
            `❌ Errors: ${results.errors.length}\n\n` +
            `Error Details:\n${errorDetails}\n\n` +
            `Some tenants have no users (orphaned). Would you like to clean them up?`
          )) {
            // Extract tenant IDs from error messages and delete them
            for (const error of results.errors) {
              const match = error.match(/tenant (tenant_[^\s]+)/);
              if (match) {
                const tenantId = match[1];
                try {
                  const { httpsCallable } = await import('firebase/functions');
                  const { functions } = await import('../../services/firebase');
                  const deleteOrphanedTenant = httpsCallable(functions, 'deleteOrphanedTenant');
                  await deleteOrphanedTenant({ tenantId });
                  console.log(`Deleted orphaned tenant: ${tenantId}`);
                } catch (err) {
                  console.error(`Failed to delete ${tenantId}:`, err);
                }
              }
            }
            addToast('✅ Orphaned tenants cleaned up!', 'success');
            loadTenants();
          } else if (!hasOrphanedTenants) {
            alert(
              `Migration Complete!\n\n` +
              `✅ Updated: ${results.updated}\n` +
              `⏭️ Skipped: ${results.skipped}\n` +
              `❌ Errors: ${results.errors.length}\n\n` +
              `Error Details:\n${errorDetails}`
            );
          }
        } else {
          addToast(
            `✅ Migration complete! Updated: ${results.updated}, Skipped: ${results.skipped}`,
            'success'
          );
        }
        
        // Reload tenants to see updated data
        loadTenants();
      } else {
        addToast('Migration failed', 'error');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      addToast(`Error: ${error.message}`, 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!currentUser?.isPlatformAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">You do not have permission to access the Platform Admin panel.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            <i className="fas fa-building mr-2"></i>
            Super Admin Panel
          </h1>
          <p className="text-gray-600 mt-1">Manage multi-tenant organizations</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="danger" 
            onClick={handleMigrateData}
            disabled={isMigratingData}
            title="🔧 FIX: Add missing isDeleted and status fields to existing data"
          >
            {isMigratingData ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Migrating...
              </>
            ) : (
              <>
                <i className="fas fa-database mr-2"></i>
                Fix Missing Fields
              </>
            )}
          </Button>
          <Button 
            variant="warning" 
            onClick={handleFixUserClaims}
            disabled={isFixingClaims}
            title="🔧 CRITICAL FIX: Set isTenantAdmin flag for Admin role users"
          >
            {isFixingClaims ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Fixing...
              </>
            ) : (
              <>
                <i className="fas fa-user-shield mr-2"></i>
                Fix User Claims
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleFixPermissions}
            disabled={isLoading}
            title="Fix role permissions to use correct enum format"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Fixing...
              </>
            ) : (
              <>
                <i className="fas fa-shield-alt mr-2"></i>
                Fix Permissions
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleRunMigration}
            disabled={isMigrating}
            title="One-time migration to backfill admin info on existing tenants"
          >
            {isMigrating ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Migrating...
              </>
            ) : (
              <>
                <i className="fas fa-database mr-2"></i>
                Run Migration
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus mr-2"></i>
            Create New Tenant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Tenants</div>
          <div className="text-2xl font-bold text-gray-800">{tenants.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active Tenants</div>
          <div className="text-2xl font-bold text-green-600">
            {tenants.filter(t => t.status === TenantStatus.ACTIVE).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Suspended</div>
          <div className="text-2xl font-bold text-yellow-600">
            {tenants.filter(t => t.status === TenantStatus.SUSPENDED).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-2xl font-bold text-blue-600">
            {Object.values(tenantStats).reduce((sum, stat) => sum + (stat?.totalUsers || 0), 0)}
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    <div className="text-sm text-gray-500">{tenant.domain || 'No domain'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={tenant.plan}
                    onChange={(e) => handleUpdatePlan(tenant.id, e.target.value as TenantPlan)}
                    className={`text-xs px-2 py-1 rounded-full ${getPlanColor(tenant.plan)}`}
                  >
                    <option value={TenantPlan.STARTER}>Starter</option>
                    <option value={TenantPlan.PROFESSIONAL}>Professional</option>
                    <option value={TenantPlan.ENTERPRISE}>Enterprise</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={tenant.status}
                    onChange={(e) => handleUpdateStatus(tenant.id, e.target.value as TenantStatus)}
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tenant.status)}`}
                  >
                    <option value={TenantStatus.ACTIVE}>Active</option>
                    <option value={TenantStatus.SUSPENDED}>Suspended</option>
                    <option value={TenantStatus.INACTIVE}>Inactive</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tenantStats[tenant.id]?.activeUsers || 0} / {tenant.settings?.maxUsers || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tenant.adminEmail || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => handleViewTenant(tenant)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                    title="View Details"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button 
                    onClick={() => handleOpenSettings(tenant)}
                    className="text-green-600 hover:text-green-800 mr-3"
                    title="Settings"
                  >
                    <i className="fas fa-cog"></i>
                  </button>
                  {tenant.adminEmail && (
                    <button 
                      onClick={() => handleDeleteTenantAdmin(tenant)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Tenant Admin"
                      disabled={isDeletingUser[tenant.id]}
                    >
                      <i className={`fas ${isDeletingUser[tenant.id] ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Tenant Modal */}
      <Modal 
        isOpen={showViewModal} 
        onClose={() => {
          setShowViewModal(false);
          setSelectedTenant(null);
        }} 
        title="Tenant Details"
      >
        {selectedTenant && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Domain</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.domain || 'No domain'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Email</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.adminEmail}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.plan}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1 text-sm text-gray-900">{selectedTenant.status}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Users</label>
              <p className="mt-1 text-sm text-gray-900">
                {tenantStats[selectedTenant.id]?.activeUsers || 0} / {selectedTenant.settings?.maxUsers || 0}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedTenant.createdAt ? new Date(selectedTenant.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Tenant Settings Modal */}
      <Modal 
        isOpen={showSettingsModal} 
        onClose={() => {
          setShowSettingsModal(false);
          setSelectedTenant(null);
          setNewPassword('');
        }} 
        title={`Settings - ${selectedTenant?.name || ''}`}
      >
        {selectedTenant && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <i className="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-3"></i>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Reset Admin Password</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Use this to reset the password for tenant admin: <strong>{selectedTenant.adminEmail}</strong>
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="New Password *"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              disabled={isResettingPassword}
            />

            <div className="flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowSettingsModal(false);
                  setSelectedTenant(null);
                  setNewPassword('');
                }}
                disabled={isResettingPassword}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetPassword}
                disabled={isResettingPassword || !newPassword}
              >
                {isResettingPassword ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Resetting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-key mr-2"></i>
                    Reset Password
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Tenant Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Tenant">
        <div className="space-y-4">
          <Input
            label="Company Name *"
            value={newTenant.companyName}
            onChange={(e) => setNewTenant({ ...newTenant, companyName: e.target.value })}
            placeholder="Acme Corporation"
          />
          <Select
            label="Plan"
            value={newTenant.plan}
            onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value as any })}
            options={[
              { value: 'Starter', label: 'Starter (10 users)' },
              { value: 'Professional', label: 'Professional (50 users)' },
              { value: 'Enterprise', label: 'Enterprise (500 users)' }
            ]}
          />
          <hr className="my-4" />
          <h3 className="text-lg font-semibold">Admin User</h3>
          <Input
            label="Admin Name *"
            value={newTenant.adminName}
            onChange={(e) => setNewTenant({ ...newTenant, adminName: e.target.value })}
            placeholder="John Doe"
          />
          <Input
            label="Admin Email *"
            type="email"
            value={newTenant.adminEmail}
            onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
            placeholder="admin@acme.com"
          />
          <Input
            label="Admin Password *"
            type="password"
            value={newTenant.adminPassword}
            onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
            placeholder="Secure password"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTenant} disabled={isProvisioning}>
              {isProvisioning ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Create Tenant
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
