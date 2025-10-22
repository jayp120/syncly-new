import React from 'react';
import { User, SubTask } from '../../types';
import Button from '../Common/Button';
import MeetingTaskReviewCard from './MeetingTaskReview';

export interface AiGeneratedTask {
  title: string;
  description: string;
  subTasks: SubTask[];
  assigneeIds: string[];
  dueDate: string;
}

interface GeneratedTaskReviewProps {
  tasks: AiGeneratedTask[];
  attendees: User[];
  onTasksChange: (updatedTasks: AiGeneratedTask[]) => void;
}

const GeneratedTaskReview: React.FC<GeneratedTaskReviewProps> = ({ tasks, attendees, onTasksChange }) => {

  const handleTaskChange = (index: number, updatedTask: AiGeneratedTask) => {
    const newTasks = [...tasks];
    newTasks[index] = updatedTask;
    onTasksChange(newTasks);
  };
  
  const handleTaskDiscard = (index: number) => {
    onTasksChange(tasks.filter((_, i) => i !== index));
  };
  
  const handleAddNewTask = () => {
    const newTask: AiGeneratedTask = {
        title: "New Manual Task",
        description: "",
        subTasks: [],
        assigneeIds: attendees.length > 0 ? [attendees[0].id] : [],
        dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0]
    };
    onTasksChange([...tasks, newTask]);
  };

  return (
    <div className="space-y-4 pt-4 mt-4 border-t dark:border-slate-700/50">
        <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-primary dark:text-sky-400">
                Review Suggested Tasks
            </h3>
            <Button onClick={handleAddNewTask} variant="secondary" size="sm" icon={<i className="fas fa-plus"/>}>
                Add Manual Task
            </Button>
        </div>
        {tasks.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No tasks were suggested by the AI. You can add one manually.</p>
        ) : (
            <div className="space-y-4">
                {tasks.map((task, index) => (
                    <MeetingTaskReviewCard
                        key={index}
                        task={task}
                        attendees={attendees}
                        onTaskChange={(updatedTask) => handleTaskChange(index, updatedTask)}
                        onDiscard={() => handleTaskDiscard(index)}
                    />
                ))}
            </div>
        )}
    </div>
  );
};

export default GeneratedTaskReview;
