import React, { useState, useEffect, useCallback } from 'react';
import { Role, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Spinner from '../Common/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../Auth/AuthContext';
import Input from '../Common/Input';
import Textarea from '../Common/Textarea';
import ConfirmationModal from '../Common/ConfirmationModal';
import { PERMISSION_GROUPS, SYSTEM_ROLE_IDS } from '../../constants';

const RolesPermissionsPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const { addToast } = useToast();
    const { currentUser } = useAuth();

    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        const fetchedRoles = await DataService.getRoles();
        setRoles(fetchedRoles);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleSelectRole = (role: Role) => {
        setSelectedRole(JSON.parse(JSON.stringify(role))); // Deep copy for editing
    };

    const handleAddNewRole = () => {
        setSelectedRole({
            id: '',
            name: '',
            description: '',
            permissions: [],
            tenantId: ''
        });
    };
    
    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        if (!selectedRole) return;
        const currentPermissions = selectedRole.permissions;
        if (checked && !currentPermissions.includes(permission)) {
            setSelectedRole({ ...selectedRole, permissions: [...currentPermissions, permission] });
        } else if (!checked) {
            setSelectedRole({ ...selectedRole, permissions: currentPermissions.filter(p => p !== permission) });
        }
    };
    
    const handleSaveRole = async () => {
        if (!selectedRole || !selectedRole.name.trim()) {
            addToast('Role name is required.', 'error');
            return;
        }

        if (!currentUser) {
            addToast('You must be logged in to perform this action.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            if (selectedRole.id) { // Editing existing role
                await DataService.updateRole(selectedRole, currentUser);
                addToast(`Role "${selectedRole.name}" updated successfully.`, 'success');
            } else { // Adding new role
                const newRole = await DataService.addRole({ name: selectedRole.name, description: selectedRole.description, permissions: selectedRole.permissions }, currentUser);
                setSelectedRole(newRole); // Update state with the newly created role including its ID
                addToast(`Role "${selectedRole.name}" created successfully.`, 'success');
            }
            await fetchRoles(); // Refetch all roles
        } catch (error: any) {
            addToast(`Error saving role: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteRole = async () => {
        if (!roleToDelete) return;
        if (!currentUser) {
            addToast('You must be logged in to perform this action.', 'error');
            return;
        }
        try {
            await DataService.deleteRole(roleToDelete.id, currentUser);
            addToast(`Role "${roleToDelete.name}" deleted successfully.`, 'success');
            setSelectedRole(null);
            await fetchRoles();
        } catch (error: any) {
            addToast(`Error deleting role: ${error.message}`, 'error');
        } finally {
            setRoleToDelete(null);
        }
    };
    
    const isSystemRole = (roleId: string) => SYSTEM_ROLE_IDS.includes(roleId);

    if (isLoading) {
        return <Spinner message="Loading roles and permissions..." />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Roles" titleIcon={<i className="fas fa-user-tag"/>} actions={<Button onClick={handleAddNewRole} icon={<i className="fas fa-plus"/>} size="sm">New Role</Button>}>
                <ul className="space-y-2">
                    {roles.map(role => (
                        <li key={role.id}>
                            <button 
                                onClick={() => handleSelectRole(role)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${selectedRole?.id === role.id ? 'bg-primary text-white' : 'hover:bg-primary-light dark:hover:bg-slate-700'}`}
                            >
                                <div className="font-semibold">{role.name} {isSystemRole(role.id) && <span className="text-xs opacity-70">(System Role)</span>}</div>
                                <div className="text-xs opacity-80">{role.description}</div>
                            </button>
                        </li>
                    ))}
                </ul>
            </Card>

            <div className="lg:col-span-2">
                {selectedRole ? (
                    <Card title={selectedRole.id ? `Editing: ${selectedRole.name}` : 'Create New Role'}>
                        <div className="space-y-4">
                            <Input 
                                label="Role Name"
                                value={selectedRole.name}
                                onChange={e => setSelectedRole({ ...selectedRole, name: e.target.value })}
                                disabled={isSaving || isSystemRole(selectedRole.id)}
                            />
                            {isSystemRole(selectedRole.id) && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                    <i className="fas fa-info-circle mr-1"></i>
                                    System role names cannot be changed. You can modify permissions only.
                                </p>
                            )}
                             <Textarea 
                                label="Description"
                                value={selectedRole.description}
                                onChange={e => setSelectedRole({ ...selectedRole, description: e.target.value })}
                                disabled={isSaving}
                                rows={2}
                            />

                            <h3 className="font-semibold text-lg pt-4 border-t dark:border-slate-700">Permissions</h3>
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                    <div key={groupName}>
                                        <h4 className="font-semibold text-md mb-2 text-secondary dark:text-slate-300">{groupName}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                            {permissions.map(permission => (
                                                <div key={permission} className="flex items-center">
                                                    <input 
                                                        type="checkbox"
                                                        id={permission}
                                                        checked={selectedRole.permissions.includes(permission)}
                                                        onChange={e => handlePermissionChange(permission, e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        disabled={isSaving || (selectedRole.id === 'tenant_admin')}
                                                    />
                                                    <label htmlFor={permission} className="ml-2 text-sm text-gray-700 dark:text-slate-300 capitalize cursor-pointer" style={{textTransform: 'capitalize'}}>
                                                        {permission.replace(/CAN_/g, '').replace(/_/g, ' ').toLowerCase()}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t dark:border-slate-700">
                                <div>
                                    {selectedRole.id && !isSystemRole(selectedRole.id) && (
                                        <Button variant="danger" onClick={() => setRoleToDelete(selectedRole)} disabled={isSaving}>
                                            <i className="fas fa-trash mr-2"></i>Delete Role
                                        </Button>
                                    )}
                                    {selectedRole.id && isSystemRole(selectedRole.id) && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            <i className="fas fa-lock mr-1"></i>
                                            System roles cannot be deleted
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="ghost" onClick={() => setSelectedRole(null)} disabled={isSaving}>
                                        <i className="fas fa-times mr-2"></i>Cancel
                                    </Button>
                                    <Button variant="primary" onClick={handleSaveRole} isLoading={isSaving}>
                                        <i className="fas fa-save mr-2"></i>{isSaving ? 'Saving...' : 'Save Role'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-800/50 rounded-lg p-8 text-center">
                        <div className="text-slate-500 dark:text-slate-400">
                            <i className="fas fa-arrow-left text-3xl mb-4"></i>
                            <p>Select a role from the left to view or edit its permissions, or create a new one.</p>
                        </div>
                    </div>
                )}
            </div>
            
            <ConfirmationModal
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={confirmDeleteRole}
                title={`Confirm Deletion of "${roleToDelete?.name}"`}
                confirmButtonVariant="danger"
                confirmText="Yes, Delete Role"
            >
                <p>Are you sure you want to delete this role? This cannot be undone.</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2">
                    If any users are currently assigned to this role, you will not be able to delete it.
                </p>
            </ConfirmationModal>
        </div>
    );
};

export default RolesPermissionsPage;