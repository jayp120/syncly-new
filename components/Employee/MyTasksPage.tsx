
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { Task, TaskStatus, TaskType, Meeting } from '../../types';
import * as DataService from '../../services/dataService';
import { TASKS_KEY, TASK_COMMENTS_KEY, MEETINGS_KEY } from '../../constants';
import PageContainer from '../Layout/PageContainer';
import Button from '../Common/Button';
import TaskList from '../Tasks/TaskList';
import KanbanBoard from '../Tasks/KanbanBoard';
import TaskCalendarView from '../Tasks/TaskCalendarView';
import TaskDetailModal from '../Tasks/TaskDetailModal';
import Card from '../Common/Card';
import ConfirmationModal from '../Common/ConfirmationModal';
import InlineTaskCreator from '../Tasks/InlineTaskCreator';
import TaskForm from '../Tasks/TaskForm';
import Modal from '../Common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import eventBus from '../../services/eventBus';

export const MyTasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetingsMap, setMeetingsMap] = useState<Map<string, Meeting>>(new Map());
  
  const viewMode = searchParams.get('view') || 'list';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const taskIdFromUrl = searchParams.get('taskId');
  
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToView, setTaskToView] = useState<Task | null>(null);

  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (() => Promise<void> | void) | null;
  }>({ isOpen: false, title: '', message: '', onConfirm: null });
  
  const fetchData = useCallback(async () => {
    if (currentUser) {
      const [allTasks, allMeetings] = await Promise.all([
        DataService.getTasks(),
        DataService.getMeetingsForUser(currentUser.id)
      ]);
      const userTasks = allTasks.filter(t => t.assignedTo.includes(currentUser.id) || (t.isPersonalTask && t.createdBy === currentUser.id));
      setTasks(userTasks);
      setMeetingsMap(new Map(allMeetings.map(m => [m.id, m])));
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
    const handleDataChange = (data?: any) => {
        const keyChanged = data?.keyChanged;
        if (keyChanged === TASKS_KEY || keyChanged === TASK_COMMENTS_KEY || keyChanged === MEETINGS_KEY) {
             fetchData();
        }
    };
    const unsubscribe = eventBus.on('appDataChanged', handleDataChange);
    return () => unsubscribe();
  }, [fetchData]);
  
  useEffect(() => {
    if (taskIdFromUrl) {
      if (tasks.length > 0) {
        const task = tasks.find(t => t.id === taskIdFromUrl);
        if (task) {
          setTaskToView(task);
        } else {
          handleCloseModal();
        }
      }
    } else {
      setTaskToView(null);
    }
  }, [taskIdFromUrl, tasks]);

  const handleSetViewMode = (mode: 'list' | 'kanban' | 'calendar') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', mode);
    newParams.delete('page'); // Reset page when view changes
    setSearchParams(newParams);
  };
  
  const handlePageChange = (page: number) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', String(page));
      setSearchParams(newParams);
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
    await DataService.addTask({ ...taskData }, currentUser);
    addToast('✅ Task Created', 'success');
    await fetchData(); // Refetch to show the new task
  }, [currentUser, addToast, fetchData]);

  const handleSaveTask = async (savedTask: Task, isNew: boolean) => {
    await fetchData();
    setTaskToEdit(null); // Close the edit modal
    addToast('✅ Task Updated', 'success');
  };

  const handleUpdateTask = async (taskId: string, updatedFields: Partial<Task>) => {
    if (!currentUser) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (updatedFields.status && task.taskType === TaskType.Team) {
        await DataService.updateTaskMemberStatus(taskId, currentUser.id, updatedFields.status, currentUser);
    } else {
        await DataService.updateTask(taskId, updatedFields, currentUser);
    }
    
    await fetchData();
    if (taskToView && taskToView.id === taskId) {
      const updatedTask = await DataService.getTaskById(taskId);
      if (updatedTask) setTaskToView(updatedTask);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if(currentUser) {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (taskToDelete?.isPersonalTask && taskToDelete?.createdBy === currentUser.id) {
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
        } else {
            addToast("You can only delete your personal tasks.", 'error');
        }
    }
  }

  const handleEditTask = (task: Task) => {
    if (task.isPersonalTask && task.createdBy === currentUser?.id) {
        setTaskToEdit(task);
    } else {
        addToast("You can only edit your personal tasks.", 'error');
    }
  }
  
  const handleCancelConfirmation = () => {
      setConfirmModalState({ isOpen: false, title: '', message: '', onConfirm: null });
  }

  const handleConfirmAction = async () => {
      if(confirmModalState.onConfirm) {
          await confirmModalState.onConfirm();
      }
  }

  const handleEditRequestFromModal = (task: Task) => {
    if (task.isPersonalTask && task.createdBy === currentUser?.id) {
        handleCloseModal();
        setTaskToEdit(task);
    } else {
        addToast("You do not have permission to edit this task.", "error");
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <PageContainer title="My Tasks">
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-primary dark:text-sky-400">Your Tasks</h2>
            <div className="flex space-x-1 border border-gray-300 dark:border-slate-600 rounded-lg p-1 w-full md:w-auto justify-center">
              <Button size="sm" variant={viewMode === 'list' ? 'primary' : 'ghost'} onClick={() => handleSetViewMode('list')} icon={<i className="fas fa-list"></i>}>List</Button>
              <Button size="sm" variant={viewMode === 'kanban' ? 'primary' : 'ghost'} onClick={() => handleSetViewMode('kanban')} icon={<i className="fas fa-columns"></i>}>Board</Button>
              <Button size="sm" variant={viewMode === 'calendar' ? 'primary' : 'ghost'} onClick={() => handleSetViewMode('calendar')} icon={<i className="fas fa-calendar-alt"></i>}>Calendar</Button>
            </div>
          </div>
          
          <InlineTaskCreator 
            currentUser={currentUser}
            onTaskAdd={handleAddTask}
            isManagerView={false}
          />
          
          <div className="mt-6">
            {viewMode === 'list' && <TaskList tasks={tasks} currentUser={currentUser} onViewTask={handleViewTask} onEditTask={handleEditTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} meetingsMap={meetingsMap} currentPage={currentPage} onPageChange={handlePageChange} />}
            {viewMode === 'kanban' && <KanbanBoard tasks={tasks} onUpdateTaskStatus={(taskId, newStatus) => handleUpdateTask(taskId, {status: newStatus})} onViewTask={handleViewTask} onUpdateTask={handleUpdateTask} meetingsMap={meetingsMap} />}
            {viewMode === 'calendar' && <TaskCalendarView tasks={tasks} currentUser={currentUser} onViewTask={handleViewTask} isManagerView={false} />}
          </div>
        </Card>
      </PageContainer>
      
      {/* Modals */}
      {taskToEdit && (
        <Modal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} title="Edit Task">
          <TaskForm onSave={handleSaveTask} onCancel={() => setTaskToEdit(null)} currentUser={currentUser} isPersonalTaskMode={taskToEdit.isPersonalTask} taskToEdit={taskToEdit}/>
        </Modal>
      )}

      <TaskDetailModal isOpen={!!taskToView} onClose={handleCloseModal} task={taskToView} onUpdateTask={handleUpdateTask} currentUser={currentUser} onEditTask={handleEditRequestFromModal} />

      <ConfirmationModal
          isOpen={confirmModalState.isOpen}
          onClose={handleCancelConfirmation}
          onConfirm={handleConfirmAction}
          title={confirmModalState.title}
          confirmButtonVariant="danger"
      >
          <p>{confirmModalState.message}</p>
      </ConfirmationModal>
    </>
  );
};
