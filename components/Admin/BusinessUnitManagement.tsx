import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessUnit, UserStatus } from '../../types';
import * as DataService from '../../services/dataService';
import Card from '../Common/Card';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import ConfirmationModal from '../Common/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../Auth/AuthContext';

const BusinessUnitManagement: React.FC = () => {
  const [allBusinessUnits, setAllBusinessUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [currentBUToEdit, setCurrentBUToEdit] = useState<BusinessUnit | null>(null);
  const [buToPermanentlyDelete, setBUToPermanentlyDelete] = useState<BusinessUnit | null>(null);
  
  const [buName, setBUName] = useState('');
  const [formError, setFormError] = useState('');
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  const fetchBusinessUnits = useCallback(async () => {
    setIsLoading(true);
    const bus = await DataService.getBusinessUnits();
    setAllBusinessUnits(bus);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBusinessUnits();
  }, [fetchBusinessUnits]);

  const activeBUs = useMemo(() => allBusinessUnits.filter(bu => bu.status === 'active').sort((a,b) => a.name.localeCompare(b.name)), [allBusinessUnits]);
  const archivedBUs = useMemo(() => allBusinessUnits.filter(bu => bu.status === 'archived').sort((a,b) => a.name.localeCompare(b.name)), [allBusinessUnits]);

  const handleAddBU = () => {
    setCurrentBUToEdit(null);
    setBUName('');
    setFormError('');
    setShowFormModal(true);
  };

  const handleEditBU = (bu: BusinessUnit) => {
    setCurrentBUToEdit(bu);
    setBUName(bu.name);
    setFormError('');
    setShowFormModal(true);
  };

  const handleArchiveBU = async (bu: BusinessUnit) => {
    if (!currentUser) {
      addToast('You must be logged in to perform this action.', 'error');
      return;
    }
    try {
      await DataService.archiveBusinessUnit(bu.id, currentUser);
      addToast(`Business Unit "${bu.name}" archived successfully.`, 'success');
      fetchBusinessUnits();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  const handleUnarchiveBU = async (bu: BusinessUnit) => {
    if (!currentUser) {
      addToast('You must be logged in to perform this action.', 'error');
      return;
    }
    try {
      await DataService.unarchiveBusinessUnit(bu.id, currentUser);
      addToast(`Business Unit "${bu.name}" has been restored.`, 'success');
      fetchBusinessUnits();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };
  
  const confirmPermanentDelete = async () => {
    if (!buToPermanentlyDelete) return;
    if (!currentUser) {
      addToast('You must be logged in to perform this action.', 'error');
      return;
    }
    try {
      await DataService.permanentlyDeleteBusinessUnit(buToPermanentlyDelete.id, currentUser);
      addToast(`Business Unit "${buToPermanentlyDelete.name}" permanently deleted.`, 'success');
      fetchBusinessUnits();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setBUToPermanentlyDelete(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!buName.trim()) {
      setFormError('Business Unit name cannot be empty.');
      return;
    }

    if (!currentUser) {
      setFormError('You must be logged in to perform this action.');
      return;
    }

    const businessUnits = await DataService.getBusinessUnits();
    const existingBU = businessUnits.find(
        bu => bu.name.toLowerCase() === buName.trim().toLowerCase() && bu.id !== currentBUToEdit?.id
    );
    if (existingBU) {
        setFormError(`Business Unit name "${buName.trim()}" already exists.`);
        return;
    }

    let result: BusinessUnit | null = null;
    if (currentBUToEdit) {
      result = await DataService.updateBusinessUnit({ ...currentBUToEdit, name: buName.trim() }, currentUser);
    } else {
      result = await DataService.addBusinessUnit({ name: buName.trim() }, currentUser);
    }

    if (result) {
      addToast(`Business Unit "${result.name}" ${currentBUToEdit ? 'updated' : 'added'} successfully.`, 'success');
      setShowFormModal(false);
      fetchBusinessUnits();
    } else {
      setFormError('Failed to save Business Unit. Please try again.');
    }
  };

  if (isLoading) return <Spinner message="Loading Business Units..." />;

  return (
    <div className="space-y-6">
      <Card title="Active Business Units" titleIcon={<i className="fas fa-briefcase"></i>} actions={
        <Button onClick={handleAddBU} variant="primary" icon={<i className="fas fa-plus"></i>}>Add Business Unit</Button>
      }>
        {activeBUs.length === 0 ? (
          <p className="text-center text-text-secondary dark:text-dark-text-secondary py-6">No active Business Units found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
              <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
                {activeBUs.map(bu => (
                  <tr key={bu.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text">{bu.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditBU(bu)} icon={<i className="fas fa-edit"></i>}>Edit</Button>
                        <Button variant="warning" size="sm" onClick={() => handleArchiveBU(bu)} icon={<i className="fas fa-archive"></i>}>Archive</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {archivedBUs.length > 0 && (
          <Card title="Archived Business Units" titleIcon={<i className="fas fa-archive text-slate-500"></i>}>
              <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-border-primary dark:divide-dark-border">
                    <thead className="bg-surface-secondary dark:bg-dark-surface-secondary">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface-primary dark:bg-dark-surface-primary divide-y divide-border-primary dark:divide-dark-border">
                        {archivedBUs.map(bu => (
                        <tr key={bu.id} className="hover:bg-surface-hover dark:hover:bg-dark-surface-hover opacity-70">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text">{bu.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                                <Button variant="success" size="sm" onClick={() => handleUnarchiveBU(bu)} icon={<i className="fas fa-box-open"></i>}>Unarchive</Button>
                                <Button variant="danger" size="sm" onClick={() => setBUToPermanentlyDelete(bu)} icon={<i className="fas fa-trash-alt"></i>}>Delete Permanently</Button>
                            </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </Card>
      )}

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={currentBUToEdit ? 'Edit Business Unit' : 'Add New Business Unit'}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} onClose={() => setFormError('')} />}
          <Input 
            label="Business Unit Name" 
            id="buName" 
            value={buName} 
            onChange={(e) => setBUName(e.target.value)} 
            required 
            autoFocus
          />
          <div className="flex justify-end space-x-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setShowFormModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {currentBUToEdit ? 'Update Business Unit' : 'Add Business Unit'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!buToPermanentlyDelete}
        onClose={() => setBUToPermanentlyDelete(null)}
        onConfirm={confirmPermanentDelete}
        title="Confirm Permanent Deletion"
        confirmButtonVariant="danger"
        confirmText="Yes, Permanently Delete"
      >
        <p>Are you sure you want to permanently delete the Business Unit "<strong>{buToPermanentlyDelete?.name}</strong>"?</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          This action is irreversible. It will remove the unit and disassociate it from all historical user and leave records.
        </p>
      </ConfirmationModal>
    </div>
  );
};

export default BusinessUnitManagement;