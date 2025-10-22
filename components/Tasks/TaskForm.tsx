

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Task, TaskPriority, TaskStatus, TaskType, UserStatus, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import Input from '../Common/Input';
import Textarea from '../Common/Textarea';
import Select from '../Common/Select';
import Button from '../Common/Button';
import Alert from '../Common/Alert';
import { parseMentions } from '../../utils/mentionUtils';
import { getLocalYYYYMMDD } from '../../utils/dateUtils';
import { useAuth } from '../Auth/AuthContext';

interface TaskFormProps {
  taskToEdit?: Task | null;
  currentUser: User;
  onSave: (task: Task, isNew: boolean) => void;
  onCancel: () => void;
  isPersonalTaskMode?: boolean; // For employees creating personal tasks
  prefilledDueDate?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ taskToEdit, currentUser, onSave, onCancel, isPersonalTaskMode = false, prefilledDueDate }) => {
  const { hasPermission } = useAuth();
  const [initialState, setInitialState] = useState<Partial<Task> | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamName, setTeamName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.NotStarted);
  
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<User[]>([]);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const isManagerMode = hasPermission(Permission.CAN_MANAGE_TEAM_TASKS) && !isPersonalTaskMode;
  const [managerTaskType, setManagerTaskType] = useState<'Personal' | 'Direct' | 'Team'>('Direct');

  useEffect(() => {
    if (taskToEdit) {
      const state = {
        title: taskToEdit.title,
        description: taskToEdit.description,
        teamName: taskToEdit.teamName || '',
        dueDate: taskToEdit.dueDate,
        priority: taskToEdit.priority,
        status: taskToEdit.status,
        assignedTo: [...taskToEdit.assignedTo],
        taskType: taskToEdit.taskType,
        isPersonalTask: taskToEdit.isPersonalTask,
      };
      setInitialState(state as Partial<Task>);
      setTitle(state.title);
      setDescription(state.description);
      setTeamName(state.teamName);
      setDueDate(state.dueDate);
      setPriority(state.priority);
      setStatus(state.status);
      setAssignedTo(state.assignedTo);
      if (isManagerMode) {
        setManagerTaskType(state.isPersonalTask ? 'Personal' : state.taskType === TaskType.Team ? 'Team' : 'Direct');
      }
    } else {
      // Reset form
      setInitialState(null);
      setTitle('');
      setDescription('');
      setTeamName('');
      setDueDate(prefilledDueDate || '');
      setPriority(TaskPriority.Medium);
      setStatus(TaskStatus.NotStarted);
      setAssignedTo([]);
      setManagerTaskType(isManagerMode ? 'Direct' : 'Personal');
    }
  }, [taskToEdit, prefilledDueDate, isManagerMode]);

  useEffect(() => {
    const fetchEmployees = async () => {
        if (hasPermission(Permission.CAN_MANAGE_TEAM_TASKS)) {
            const allUsers = await DataService.getUsers();
            const employeesInBU = allUsers.filter(
                u => u.roleName === 'Employee' && u.status === UserStatus.ACTIVE && u.businessUnitId === currentUser.businessUnitId
            );
            setAvailableEmployees(employeesInBU);
        }
    };
    fetchEmployees();
  }, [currentUser.businessUnitId, hasPermission]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !dueDate) {
      setError('Title and Due Date are required.');
      return;
    }

    setIsLoading(true);
    try {
      let finalTask: Task;
      const isNew = !taskToEdit;
      
      if (isNew) {
        const payload: Omit<Task, 'id' | 'createdOn' | 'updatedOn' | 'pinnedBy' | 'overdueReminderSentFor'> = {
          title,
          description,
          teamName: isManagerMode && managerTaskType === 'Team' ? teamName : undefined,
          dueDate,
          priority,
          status,
          assignedTo: isPersonalTaskMode ? [currentUser.id] : assignedTo,
          createdBy: currentUser.id,
          taskType: isPersonalTaskMode ? TaskType.Personal : (managerTaskType === 'Team' ? TaskType.Team : TaskType.Direct),
          isPersonalTask: isPersonalTaskMode,
        };
        finalTask = await DataService.addTask(payload, currentUser);
      } else {
        // For updates, we send a Partial<Task> object with only the fields that can be changed by this form.
        // This correctly matches the type expected by the `updateTask` service function.
        const payload: Partial<Task> = {
            title,
            description,
            teamName: isManagerMode && managerTaskType === 'Team' ? teamName : undefined,
            dueDate,
            priority,
            status,
            assignedTo: isPersonalTaskMode ? [currentUser.id] : assignedTo,
            taskType: isPersonalTaskMode ? TaskType.Personal : (managerTaskType === 'Team' ? TaskType.Team : TaskType.Direct),
            isPersonalTask: isPersonalTaskMode,
        };
        const updatedTask = await DataService.updateTask(taskToEdit.id, payload, currentUser);
        if (!updatedTask) throw new Error("Task update failed.");
        finalTask = updatedTask;
      }
      onSave(finalTask, isNew);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      <Input label="Task Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required min={getLocalYYYYMMDD(new Date())} />
        <Select label="Priority" options={Object.values(TaskPriority).map(p => ({value: p, label: p}))} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} />
      </div>
       {isManagerMode && (
         <Select
            label="Assign To"
            options={availableEmployees.map(e => ({ value: e.id, label: e.name }))}
            value={assignedTo}
            onChange={(e) => setAssignedTo(Array.from(e.target.selectedOptions, option => option.value))}
            multiple
            size={5}
          />
       )}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>{isLoading ? 'Saving...' : 'Save Task'}</Button>
      </div>
    </form>
  );
};

export default TaskForm;