import React, { useState } from 'react';
import { User, SubTask } from '../../types';
import Input from '../Common/Input';
import Textarea from '../Common/Textarea';
import Button from '../Common/Button';
import { AiGeneratedTask } from './GeneratedTaskReview';
import EmployeeMultiSelect from './EmployeeMultiSelect';

interface MeetingTaskReviewCardProps {
  task: AiGeneratedTask;
  attendees: User[];
  onTaskChange: (updatedTask: AiGeneratedTask) => void;
  onDiscard: () => void;
}

const MeetingTaskReviewCard: React.FC<MeetingTaskReviewCardProps> = ({ task, attendees, onTaskChange, onDiscard }) => {
  const [newSubtask, setNewSubtask] = useState('');
  
  const handleFieldChange = (field: keyof AiGeneratedTask, value: any) => {
    onTaskChange({ ...task, [field]: value });
  };

  const handleSubtaskChange = (index: number, title: string) => {
    const updatedSubtasks = task.subTasks.map((st, i) => i === index ? { ...st, title } : st);
    onTaskChange({ ...task, subTasks: updatedSubtasks });
  };
  
  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const updatedSubtasks = [...task.subTasks, { title: newSubtask.trim(), completed: false }];
    onTaskChange({ ...task, subTasks: updatedSubtasks });
    setNewSubtask('');
  };
  
  const handleRemoveSubtask = (index: number) => {
    const updatedSubtasks = task.subTasks.filter((_, i) => i !== index);
    onTaskChange({ ...task, subTasks: updatedSubtasks });
  };

  return (
    <div className="p-4 border dark:border-slate-700/80 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-3 relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="danger" size="sm" onClick={onDiscard} icon={<i className="fas fa-trash-alt"/>} />
      </div>

      <Input
        label="Task Title"
        value={task.title}
        onChange={(e) => handleFieldChange('title', e.target.value)}
      />
      <Textarea
        label="Description"
        value={task.description}
        onChange={(e) => handleFieldChange('description', e.target.value)}
        rows={4}
      />
      <div>
        <label className="block text-sm font-medium text-darktext dark:text-slate-300">Sub-tasks</label>
        <div className="space-y-1 mt-1">
          {task.subTasks.map((sub, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={sub.title}
                onChange={(e) => handleSubtaskChange(index, e.target.value)}
                wrapperClassName="flex-grow !mb-0"
              />
              <button type="button" onClick={() => handleRemoveSubtask(index)} className="text-red-500/70 hover:text-red-500 p-1">
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input
            placeholder="Add new sub-task..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); }}}
            wrapperClassName="flex-grow !mb-0"
          />
          <Button type="button" size="sm" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>Add</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="w-full">
            <EmployeeMultiSelect
                selectedIds={task.assigneeIds}
                onSelectionChange={(ids) => handleFieldChange('assigneeIds', ids)}
                teamMembers={attendees}
            />
        </div>
        <Input
          label="Due Date"
          type="date"
          value={task.dueDate}
          onChange={(e) => handleFieldChange('dueDate', e.target.value)}
        />
      </div>
    </div>
  );
};

export default MeetingTaskReviewCard;
