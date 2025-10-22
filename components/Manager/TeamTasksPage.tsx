import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { Task, User, TaskStatus, Meeting, UserStatus } from '../../types';
import * as DataService from '../../services/dataService';
import { TASKS_KEY, TASK_COMMENTS_KEY, USERS_KEY, MEETINGS_KEY } from '../../constants';
import PageContainer from '../Layout/PageContainer';
import Button from '../Common/Button';
import TaskForm from '../Tasks/TaskForm';
import TaskList from '../Tasks/TaskList';
import KanbanBoard from '../Tasks/KanbanBoard';
import TaskCalendarView from '../Tasks/TaskCalendarView';
import TaskDetailModal from '../Tasks/TaskDetailModal';
import Card from '../Common/Card';
import Select from '../Common/Select';
import Input from '../Common/Input';
import ConfirmationModal from '../Common/ConfirmationModal';
import Modal from '../Common/Modal';
import InlineTaskCreator from '../Tasks/InlineTaskCreator';
import { useToast } from '../../contexts/ToastContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import eventBus from '../../services/eventBus';

export const TeamTasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State derived from URL
  const viewMode = searchParams.get('view') || 'list';
  const employeeFilter = searchParams.get('employee') || '';
  const statusFilter = searchParams.get('status') || '';
  const dueDateFilter = searchParams.get('dueDate') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const taskIdFromUrl = searchParams.get('taskId');

  // Local state for data
  const [allTeamTasks, setAllTeamTasks] = useState<Task[]>([]);
  const [meetingsMap, setMeetingsMap] = useState<Map<string, Meeting>>(new Map());
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  
  // Modals state
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: (() => Promise<void> | void) | null; }>({ isOpen: false, title: '', message: '', onConfirm: null });
  const [batchUpdateModal, setBatchUpdateModal] = useState<{type: 'dueDate' | 'reassign' | null, taskIds: string[]}>({type: null, taskIds: []});

  const fetchData = useCallback(async () => {
    if (currentUser && currentUser.roleName === 'Manager') {
      const [users, allTasks, allMeetings] = await Promise.all([
        DataService.getUsers(),
        DataService.getTasks(),
        DataService.getMeetingsForUser(currentUser.id)
      ]);

      const members = users.filter(u => u.roleName === 'Employee' && u.status === UserStatus.ACTIVE && u.businessUnitId === currentUser.businessUnitId);
      setTeamMembers(members);

      const tasksCreatedByManager = allTasks.filter(t => t.createdBy === currentUser.id && !t.isPersonalTask);
      setAllTeamTasks(tasksCreatedByManager);
      setMeetingsMap(new Map(allMeetings.map(m => [m.id, m])));
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
    const handleDataChange = (data?: any) => {
        const keyChanged = data?.keyChanged;
        if(keyChanged === TASKS_KEY || keyChanged === TASK_COMMENTS_KEY || keyChanged === USERS_KEY || keyChanged === MEETINGS_KEY) {
            fetchData();
        }
    };
    const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
    return () => unsubscribe();
  }, [fetchData]);

  const filteredTasks = useMemo(() => {
    let tasksToFilter = [...allTeamTasks];
    if (employeeFilter) {
        tasksToFilter = tasksToFilter.filter(t => t.assignedTo.includes(employeeFilter));
    }
    if (statusFilter) {
        tasksToFilter = tasksToFilter.filter(t => t.status === statusFilter);
    }
    if (dueDateFilter) {
        tasksToFilter = tasksToFilter.filter(t => t.dueDate === dueDateFilter);
    }
    return tasksToFilter;
  }, [employeeFilter, statusFilter, dueDateFilter, allTeamTasks]);


  useEffect(() => {
    if (taskIdFromUrl) {
      if (allTeamTasks.length > 0) {
        const task = allTeamTasks.find(t => t.id === taskIdFromUrl);
        if (task) {
          setTaskToView(task);
        } else {
          handleCloseModal();
        }
      }
    } else {
      setTaskToView(null);
    }
  }, [taskIdFromUrl, allTeamTasks]);

  const updateSearchParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset page when filters change
    if (key !== 'page') newParams.delete('page');
    setSearchParams(newParams);
  };
  
  const handleSetViewMode = (mode: 'list' | 'kanban' | 'calendar') => {
    updateSearchParams('view', mode);
  };

  const handlePageChange = (page: number) => {
    updateSearchParams('page', String(page));
  };
  
  const handleViewTask = (task: Task) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('taskId', task.id);
    setSearchParams(newParams);
  };

  const handleCloseModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('taskId');
    setSearchParams(newParams);
  };

  const handleAddTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdOn' | 'updatedOn' | 'pinnedBy' | 'overdueReminderSentFor'>) => {
    if (!currentUser) return;
    await DataService.addTask({ ...taskData, status: TaskStatus.NotStarted }, currentUser);
    await fetchData();
    addToast('✅ Task Created & Assigned', 'success');
  }, [currentUser, fetchData, addToast]);
  
  const handleSaveTask = async (savedTask: Task, isNew: boolean) => {
    await fetchData();
    setTaskToEdit(null);
    addToast('✅ Task Updated', 'success');
  };

  const handleUpdateTask = async (taskId: string, updatedFields: Partial<Task>) => {
    if (currentUser) {
      await DataService.updateTask(taskId, updatedFields, currentUser);
      await fetchData();
       if(taskToView && taskToView.id === taskId){
          const updatedTask = await DataService.getTaskById(taskId);
          if (updatedTask) setTaskToView(updatedTask);
      }
    }
  };

  const handleDeleteTask = (taskId: string) => {
      if(currentUser) {
          const taskToDelete = allTeamTasks.find(t => t.id === taskId);
          if(!taskToDelete) return;
          setConfirmModalState({
              isOpen: true,
              title: 'Confirm Deletion',
              message: `Are you sure you want to delete the task "${taskToDelete.title}"? This cannot be undone.`,
              onConfirm: async () => {
                  await DataService.deleteTask(taskId, currentUser);
                  await fetchData();
                  setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: null });
                  addToast('🗑️ Task Deleted', 'info');
              }
          })
      }
  };

  const handleBatchAction = async (action: 'delete' | 'complete' | 'reassign' | 'dueDate', taskIds: string[], data?: any) => {
      if (!currentUser) return;
      let successMessage = '';

      if (action === 'delete') {
          setConfirmModalState({
              isOpen: true, title: 'Confirm Batch Delete',
              message: `Are you sure you want to delete ${taskIds.length} tasks? This cannot be undone.`,
              onConfirm: async () => {
                  await Promise.all(taskIds.map(id => DataService.deleteTask(id, currentUser)));
                  await fetchData();
                  setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: null });
                  addToast(`🗑️ ${taskIds.length} tasks deleted.`, 'info');
              }
          });
          return;
      } else if (action === 'complete') {
          await Promise.all(taskIds.map(id => DataService.updateTask(id, { status: TaskStatus.Completed }, currentUser)));
          successMessage = `✅ ${taskIds.length} tasks marked as Complete.`;
      } else if (action === 'reassign') {
          await Promise.all(taskIds.map(id => DataService.updateTask(id, { assignedTo: data.assignees }, currentUser)));
          setBatchUpdateModal({ type: null, taskIds: [] });
          successMessage = `👤 ${taskIds.length} tasks reassigned.`;
      } else if (action === 'dueDate') {
          await Promise.all(taskIds.map(id => DataService.updateTask(id, { dueDate: data.dueDate }, currentUser)));
          setBatchUpdateModal({ type: null, taskIds: [] });
          successMessage = `📅 Due date updated for ${taskIds.length} tasks.`;
      }

      if(successMessage) {
        addToast(successMessage, 'success');
        await fetchData();
      }
  }

  const handleEditTask = (task: Task) => {
    if (task.createdBy === currentUser?.id) {
        setTaskToEdit(task);
    } else {
        addToast("You can only edit tasks you have created.", "error");
    }
  };

  const handleEditRequestFromModal = (task: Task) => {
    if (task.createdBy === currentUser?.id) {
        handleCloseModal();
        setTaskToEdit(task);
    } else {
        addToast("You can only edit tasks you have created.", "error");
    }
  };

  const handleCancelForm = () => { setTaskToEdit(null); };
  const handleCancelConfirmation = () => setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: null });
  const handleConfirmAction = async () => { if(confirmModalState.onConfirm) await confirmModalState.onConfirm(); };

  if (!currentUser) return null;

  const employeeOptions = useMemo(() => [{ value: '', label: 'All Team Members' }, ...teamMembers.map(u => ({ value: u.id, label: u.name }))], [teamMembers]);
  const statusOptions = useMemo(() => [{value: '', label: 'All Statuses'}, ...Object.values(TaskStatus).map(s => ({value: s, label: s}))], []);

  return (
    <>
      <PageContainer title="Team Task Management">
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-primary dark:text-sky-400">Tasks I've Assigned</h2>
            <div className="flex space-x-1 border border-gray-300 dark:border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
              <Button size="sm" variant={viewMode === 'list' ? 'primary' : 'ghost'} onClick={() => handleSetViewMode('list')} icon={<i className="fas fa-list"></i>}>List</Button>
              <Button size="sm" variant={viewMode === 'kanban' ? 'primary' : 'ghost'} onClick={() => handleSetViewMode('kanban')} icon={<i className="fas fa-columns"></i>}>Board</Button>
              <Button size="sm" variant={viewMode === 'calendar' ? 'primary' : 'ghost'} onClick={() => handleSetViewMode('calendar')} icon={<i className="fas fa-calendar-alt"></i>}>Calendar</Button>
            </div>
          </div>
          
          <InlineTaskCreator 
            currentUser={currentUser}
            onTaskAdd={handleAddTask}
            isManagerView={true}
            teamMembers={teamMembers}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 p-3 bg-gray-50 dark:bg-slate-800/50 dark:border dark:border-slate-700/50 rounded-lg">
              <Select options={employeeOptions} value={employeeFilter} onChange={e => updateSearchParams('employee', e.target.value)} label="Filter by Employee"/>
              <Select options={statusOptions} value={statusFilter} onChange={e => updateSearchParams('status', e.target.value)} label="Filter by Status" />
              <Input type="date" value={dueDateFilter} onChange={e => updateSearchParams('dueDate', e.target.value)} label="Filter by Due Date"/>
          </div>

          {viewMode === 'list' && <TaskList tasks={filteredTasks} currentUser={currentUser} onViewTask={handleViewTask} onEditTask={handleEditTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} isManagerView={true} onBatchDelete={(ids) => handleBatchAction('delete', ids)} onBatchChangeStatus={(ids, status) => handleBatchAction('complete', ids, {status})} onBatchChangeDueDate={(ids) => setBatchUpdateModal({type: 'dueDate', taskIds: ids})} onBatchReassign={(ids) => setBatchUpdateModal({type: 'reassign', taskIds: ids})} meetingsMap={meetingsMap} currentPage={currentPage} onPageChange={handlePageChange} />}
          {viewMode === 'kanban' && <KanbanBoard tasks={filteredTasks} onUpdateTaskStatus={(taskId, newStatus) => handleUpdateTask(taskId, {status: newStatus})} onViewTask={handleViewTask} onUpdateTask={handleUpdateTask} meetingsMap={meetingsMap} />}
          {viewMode === 'calendar' && <TaskCalendarView tasks={allTeamTasks} currentUser={currentUser} onViewTask={handleViewTask} isManagerView={true} teamMembers={teamMembers} />}
        </Card>
      </PageContainer>
      
      {/* Modals */}
      {taskToEdit && (
          <Modal isOpen={!!taskToEdit} onClose={handleCancelForm} title={taskToEdit.id ? "Edit Task" : "Create / Assign Task"}>
              <TaskForm onSave={handleSaveTask} onCancel={handleCancelForm} currentUser={currentUser} taskToEdit={taskToEdit}/>
          </Modal>
      )}

      <TaskDetailModal isOpen={!!taskToView} onClose={handleCloseModal} task={taskToView} onUpdateTask={handleUpdateTask} currentUser={currentUser} onEditTask={handleEditRequestFromModal} />
      
      <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={handleCancelConfirmation} onConfirm={handleConfirmAction} title={confirmModalState.title} confirmButtonVariant="danger">
          <p>{confirmModalState.message}</p>
      </ConfirmationModal>

      {batchUpdateModal.type === 'dueDate' && <DueDateBatchModal isOpen={true} onClose={() => setBatchUpdateModal({type: null, taskIds: []})} taskIds={batchUpdateModal.taskIds} onConfirm={(ids, date) => handleBatchAction('dueDate', ids, {dueDate: date})}/>}
      {batchUpdateModal.type === 'reassign' && <ReassignBatchModal isOpen={true} onClose={() => setBatchUpdateModal({type: null, taskIds: []})} taskIds={batchUpdateModal.taskIds} onConfirm={(ids, assignees) => handleBatchAction('reassign', ids, {assignees: assignees})} teamMembers={teamMembers} />}
    </>
  );
};

// Batch Action Modals (helper components)
const DueDateBatchModal: React.FC<{isOpen: boolean, onClose: () => void, taskIds: string[], onConfirm: (ids: string[], date: string) => Promise<void> | void}> = ({isOpen, onClose, taskIds, onConfirm}) => {
    const [dueDate, setDueDate] = useState('');
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Change Due Date for ${taskIds.length} tasks`}>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} label="New Due Date" required min={new Date().toISOString().split('T')[0]}/>
            <div className="flex justify-end space-x-2 mt-4">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={() => onConfirm(taskIds, dueDate)} disabled={!dueDate}>Update Due Date</Button>
            </div>
        </Modal>
    )
}

const ReassignBatchModal: React.FC<{isOpen: boolean, onClose: () => void, taskIds: string[], onConfirm: (ids: string[], assignees: string[]) => Promise<void> | void, teamMembers: User[]}> = ({isOpen, onClose, taskIds, onConfirm, teamMembers}) => {
    const [assignees, setAssignees] = useState<string[]>([]);
    const employeeOptions = useMemo(() => teamMembers.map(u => ({ value: u.id, label: u.name })), [teamMembers]);

    const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = e.target.options;
        const selected: string[] = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selected.push(options[i].value);
            }
        }
        setAssignees(selected);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reassign ${taskIds.length} tasks`}>
            <Select label="Assign to" options={employeeOptions} value={assignees} onChange={handleAssigneeChange} multiple size={6} />
            <div className="flex justify-end space-x-2 mt-4">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={() => onConfirm(taskIds, assignees)} disabled={assignees.length === 0}>Reassign Tasks</Button>
            </div>
        </Modal>
    )
}
