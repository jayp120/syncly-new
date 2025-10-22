import React, { useState, useEffect } from 'react';
import { User, BusinessUnit, UserStatus, Role } from '../../types';
import * as DataService from '../../services/dataService';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import { WEEK_DAYS } from '../../constants';
import Alert from '../Common/Alert';
import { useAuth } from '../Auth/AuthContext';

interface UserFormProps {
  currentUserToEdit?: User | null;
  onFormSubmit: (user: User, isNew: boolean) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ currentUserToEdit, onFormSubmit, onCancel }) => {
  const { currentUser: adminUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // NEW: Password for new users
  const [notificationEmail, setNotificationEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [designation, setDesignation] = useState('');
  const [weeklyOffDay, setWeeklyOffDay] = useState<string>('');
  const [businessUnitId, setBusinessUnitId] = useState<string | undefined>(undefined);
  
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableBusinessUnits, setAvailableBusinessUnits] = useState<BusinessUnit[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditMode = !!currentUserToEdit;
  const selectedRole = availableRoles.find(r => r.id === roleId);

  useEffect(() => {
    const fetchData = async () => {
        const [allBUs, allRoles] = await Promise.all([
            DataService.getBusinessUnits(),
            DataService.getRoles()
        ]);
        setAvailableBusinessUnits(allBUs.filter(bu => bu.status === 'active'));
        setAvailableRoles(allRoles.filter(r => r.id !== 'super_admin')); // Prevent assigning new super admins
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUserToEdit) {
      setName(currentUserToEdit.name);
      setEmail(currentUserToEdit.email);
      setNotificationEmail(currentUserToEdit.notificationEmail || '');
      setRoleId(currentUserToEdit.roleId);
      setDesignation(currentUserToEdit.designation || '');
      setWeeklyOffDay(currentUserToEdit.weeklyOffDay || '');
      setBusinessUnitId(currentUserToEdit.businessUnitId || undefined);
    } else {
      // Reset for new user
      setName('');
      setEmail('');
      setPassword(''); // Reset password
      setNotificationEmail('');
      setRoleId('');
      setDesignation('');
      setWeeklyOffDay(WEEK_DAYS[0]);
      setBusinessUnitId(undefined);
    }
  }, [currentUserToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !roleId || !notificationEmail.trim()) {
      setError('Name, Login Email, Notification Email, and Role are required.');
      return;
    }
    // For new users, password is required
    if (!isEditMode && !password.trim()) {
      setError('Password is required for new users.');
      return;
    }
    const isEmployeeOrManager = selectedRole?.name === 'Manager' || selectedRole?.name === 'Employee';
    if (isEmployeeOrManager && !businessUnitId) {
        setError('Business Unit is required for this role.');
        return;
    }
    if (selectedRole?.name === 'Employee' && !weeklyOffDay) {
        setError('Weekly Off Day is required for Employees.');
        return;
    }

    if (!adminUser) {
        setError('Administrator context not found. Please re-login.');
        return;
    }

    setIsLoading(true);
    try {
      let submittedUser: User | null;
      const userDataPayload = {
        name: name.trim(),
        email: email.trim(),
        notificationEmail: notificationEmail.trim(),
        roleId,
        designation: selectedRole?.name === 'Employee' ? designation : undefined,
        weeklyOffDay: selectedRole?.name === 'Employee' ? weeklyOffDay : undefined,
        businessUnitId: isEmployeeOrManager ? businessUnitId : undefined,
        password: !isEditMode ? password.trim() : undefined, // Include password for new users
      };

      if (isEditMode) {
        const updatedUserData: User = { ...currentUserToEdit!, ...userDataPayload };
        submittedUser = await DataService.updateUser(updatedUserData, adminUser);
      } else {
        submittedUser = await DataService.addUser(userDataPayload, adminUser);
      }

      if (submittedUser) {
        onFormSubmit(submittedUser, !isEditMode);
      } else {
        setError('Failed to save user. Please try again.');
      }
    } catch (err: any) {
      setError(`Failed to save user: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const roleOptions = availableRoles.map(r => ({ value: r.id, label: r.name }));
  const weekDayOptions = WEEK_DAYS.map(day => ({ value: day, label: day }));
  const businessUnitOptions = availableBusinessUnits.map(bu => ({ value: bu.id, label: bu.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      <Input label="Full Name" id="userName" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input label="Login Email (Internal ID)" id="userEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isEditMode} placeholder="e.g., firstname.lastname@mittaleod.com" />
      {!isEditMode && (
        <Input 
          label="Password" 
          id="userPassword" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          placeholder="Minimum 6 characters"
          minLength={6}
        />
      )}
      <Input label="Notification Email (Real Email)" id="userNotificationEmail" type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} required placeholder="e.g., real.email@company.com" />
      <Select 
        label="Role" 
        id="userRole" 
        options={roleOptions} 
        value={roleId} 
        onChange={e => setRoleId(e.target.value)}
        required 
        placeholder="Select a role"
      />
      
      {(selectedRole?.name === 'Employee' || selectedRole?.name === 'Manager') && (
        <Select
            label="Business Unit"
            id="userBusinessUnit"
            options={businessUnitOptions}
            value={businessUnitId || ''}
            onChange={(e) => setBusinessUnitId(e.target.value)}
            required
            placeholder="Select Business Unit"
        />
      )}

      {selectedRole?.name === 'Employee' && (
        <>
          <Input label="Designation (Optional for Employee)" id="userDesignation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          <Select
            label="Weekly Off Day"
            id="userWeeklyOff"
            options={weekDayOptions}
            value={weeklyOffDay}
            onChange={(e) => setWeeklyOffDay(e.target.value)}
            required
            placeholder="Select weekly off day"
          />
        </>
      )}
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {isLoading ? 'Saving...' : (isEditMode ? 'Update User' : 'Add User')}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;