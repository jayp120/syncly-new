
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType, User } from '../../types';
import Button from '../Common/Button';
import Select from '../Common/Select';
import { formatDateDDMonYYYY, getLocalYYYYMMDD } from '../../utils/dateUtils';
import TeamTaskProgress from './TeamTaskProgress';
import Modal from '../Common/Modal';
import TaskForm from './TaskForm';
import { useToast } from '../../contexts/ToastContext';

interface TaskCalendarViewProps {
  tasks: Task[];
  currentUser: User;
  onViewTask: (task: Task) => void;
  isManagerView?: boolean;
  teamMembers?: User[];
}

const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({ tasks, currentUser, onViewTask, isManagerView = false, teamMembers = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { addToast } = useToast();
  const [dateForNewTask, setDateForNewTask] = useState<Date | null>(null);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayOfMonth = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (typeFilter && task.taskType !== typeFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (isManagerView && employeeFilter && !task.assignedTo.includes(employeeFilter)) return false;
      return true;
    });
  }, [tasks, typeFilter, statusFilter, priorityFilter, employeeFilter, isManagerView]);
  
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      const dateKey = task.dueDate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(task);
    });
    return map;
  }, [filteredTasks]);

  const handleDateClick = (date: Date) => {
    if (isManagerView) {
        setDateForNewTask(date);
    }
  };

  const handleTaskSaved = () => {
    setDateForNewTask(null);
    addToast('Task created successfully!', 'success');
    // Parent will refetch via event bus, no need to do anything else.
  };
  
  const getStatusColor = (status: TaskStatus, isOverdue: boolean) => {
      if (isOverdue) return 'bg-red-100 hover:bg-red-200 text-red-800 border-l-4 border-red-500';
      return {
        [TaskStatus.NotStarted]: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
        [TaskStatus.InProgress]: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
        [TaskStatus.Completed]: 'bg-green-100 hover:bg-green-200 text-green-800',
        [TaskStatus.Blocked]: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800', // Changed Blocked to yellow for less visual noise than red
      }[status];
  }

  const getTaskTypeBadge = (taskType: TaskType) => {
    const styles = {
      [TaskType.Direct]: "bg-blue-100 text-blue-800",
      [TaskType.Team]: "bg-purple-100 text-purple-800",
      [TaskType.Personal]: "bg-green-100 text-green-800"
    };
    return <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${styles[taskType]}`}>{taskType.replace(' Task','')}</span>
  }

  const renderCells = () => {
    const cells = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="border p-2 min-h-[10rem] bg-gray-50"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      cellDate.setHours(0,0,0,0);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasksByDate.get(dateKey) || [];

      cells.push(
        <div 
            key={day} 
            className={`border p-1 min-h-[10rem] flex flex-col ${cellDate.getTime() === today.getTime() ? 'bg-blue-50' : ''} ${isManagerView ? 'cursor-pointer hover:bg-blue-100' : ''}`}
            onClick={() => handleDateClick(cellDate)}
        >
          <span className={`font-semibold text-sm text-right pr-1 ${cellDate.getTime() === today.getTime() ? 'text-primary' : 'text-gray-700'}`}>{day}</span>
          <div className="mt-1 space-y-1 overflow-y-auto flex-grow">
            {dayTasks.map(task => {
                const isOverdue = cellDate < today && task.status !== TaskStatus.Completed;
                return (
                    <div
                        key={task.id}
                        onClick={(e) => { e.stopPropagation(); onViewTask(task); }}
                        className={`p-2 rounded-md cursor-pointer text-xs group ${getStatusColor(task.status, isOverdue)}`}
                        title={task.title}
                    >
                        <div className="flex justify-between items-center mb-1">
                            {getTaskTypeBadge(task.taskType)}
                            {isOverdue && <i className="fas fa-exclamation-triangle text-red-600" title="Overdue"></i>}
                        </div>
                        <p className="font-semibold text-gray-800 group-hover:text-black truncate">{task.title}</p>
                        {task.taskType === TaskType.Team && (
                            <div className="mt-1">
                                <TeamTaskProgress task={task} size="compact" />
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>
      );
    }
    return cells;
  };
  
  const employeeOptions = useMemo(() => [{ value: '', label: 'All Employees' }, ...teamMembers.map(u => ({ value: u.id, label: u.name }))], [teamMembers]);
  const taskTypeOptions = useMemo(() => [{ value: '', label: 'All Types' }, ...Object.values(TaskType).map(t => ({ value: t, label: t }))], []);
  const statusOptions = useMemo(() => [{ value: '', label: 'All Statuses' }, ...Object.values(TaskStatus).map(s => ({ value: s, label: s }))], []);
  const priorityOptions = useMemo(() => [{ value: '', label: 'All Priorities' }, ...Object.values(TaskPriority).map(p => ({ value: p, label: p }))], []);

  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center space-x-2">
            <Button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} icon={<i className="fas fa-chevron-left"></i>} />
            <h2 className="text-lg font-semibold w-40 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <Button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} icon={<i className="fas fa-chevron-right"></i>} />
        </div>
        <Button onClick={() => setCurrentDate(new Date())} variant="secondary" size="sm">Today</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 mb-4 border rounded-md bg-gray-50">
          <Select label="Task Type" options={taskTypeOptions} value={typeFilter} onChange={e => setTypeFilter(e.target.value as TaskType | '')} wrapperClassName="!mb-0" />
          <Select label="Status" options={statusOptions} value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | '')} wrapperClassName="!mb-0" />
          <Select label="Priority" options={priorityOptions} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TaskPriority | '')} wrapperClassName="!mb-0" />
          {isManagerView && (
              <Select label="Employee" options={employeeOptions} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} wrapperClassName="!mb-0" />
          )}
      </div>

      <div className="grid grid-cols-7 gap-px border bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} className="text-center font-medium p-2 bg-gray-100 text-sm">{dayName}</div>
        ))}
        {renderCells()}
      </div>

      {dateForNewTask && isManagerView && (
        <Modal isOpen={!!dateForNewTask} onClose={() => setDateForNewTask(null)} title={`Create New Task for ${formatDateDDMonYYYY(dateForNewTask)}`} size="lg">
            <TaskForm
                currentUser={currentUser}
                onSave={handleTaskSaved}
                onCancel={() => setDateForNewTask(null)}
                prefilledDueDate={getLocalYYYYMMDD(dateForNewTask)}
            />
        </Modal>
      )}
    </div>
  );
};

export default TaskCalendarView;