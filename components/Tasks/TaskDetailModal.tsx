import React, { useState, useEffect } from 'react';
import { Task, TaskComment, User, ActivityLogItem, TaskType, TaskStatus, TimelineEvent, Meeting, Permission } from '../../types';
import * as DataService from '../../services/dataService';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Textarea from '../Common/Textarea';
import { formatDateDDMonYYYY, formatDateTimeDDMonYYYYHHMM } from '../../utils/dateUtils';
import TimelineDisplay from '../Shared/TimelineDisplay';
import { renderMentions } from '../../utils/mentionUtils';
import TeamProgressDetails from './TeamProgressDetails';
import UserAvatar from '../Common/UserAvatar';
import * as ReactRouterDom from "react-router-dom";
import { useAuth } from '../Auth/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Select from '../Common/Select';
const { Link } = ReactRouterDom;

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
  currentUser: User;
  onEditTask: (task: Task) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, onUpdateTask, currentUser, onEditTask }) => {
  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [taskHistory, setTaskHistory] = useState<TimelineEvent[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sourceMeeting, setSourceMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        if (!task) return;

        // Optimized: Fetch only the specific meeting required.
        if (task.meetingId) {
            const meeting = await DataService.getMeetingById(task.meetingId);
            setSourceMeeting(meeting || null);
        } else {
            setSourceMeeting(null);
        }

        // Fetch other necessary data in parallel.
        const [fetchedComments, fetchedUsers, activityLog] = await Promise.all([
            DataService.getCommentsForTask(task.id),
            DataService.getUsers(), // Needed for displaying names
            DataService.getUserActivityLog(currentUser.id)
        ]);
        
        setComments(fetchedComments);
        setAllUsers(fetchedUsers);
        
        const historyEventPromises = activityLog
          .filter(log => log.targetId === task.id)
          .map(log => DataService.transformActivityToTimelineEvent(log, currentUser));
        const historyEvents = await Promise.all(historyEventPromises);
        setTaskHistory(historyEvents);
    };

    if (isOpen) {
        fetchData();
    }
  }, [task, isOpen, currentUser.id]);

  if (!task) return null;
  
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    // Optimistic UI update
    const tempId = `temp_${Date.now()}`;
    const optimisticComment: TaskComment = {
        id: tempId,
        taskId: task.id,
        text: newComment,
        createdBy: currentUser.id,
        createdOn: Date.now(),
    };
    
    const originalComments = [...comments];
    setComments(prev => [...prev, optimisticComment]);
    setNewComment('');

    try {
        const addedComment = await DataService.addTaskComment(task.id, newComment, currentUser);
        // Replace temporary comment with the real one from the server
        setComments(prev => prev.map(c => c.id === tempId ? addedComment : c));
    } catch (error) {
        console.error("Failed to add comment:", error);
        addToast("Failed to add comment. Please try again.", 'error');
        // Rollback on failure
        setComments(originalComments);
    }
  };

  const handleSubTaskToggle = (subTaskIndex: number) => {
    if (!task || !task.subTasks) return;
    const newSubTasks = task.subTasks.map((st, index) => 
        index === subTaskIndex ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask(task.id, { subTasks: newSubTasks });
  };

  const getUsername = (userId: string) => allUsers.find(u => u.id === userId)?.name || 'Unknown User';

  const modalTitle = task.taskType === TaskType.Team ? task.teamName : renderMentions(task.title, allUsers);

  const isEditable = (
    (currentUser.roleName === 'Manager' && task.createdBy === currentUser.id) || 
    (task.isPersonalTask && task.createdBy === currentUser.id)
  ) && task.status !== TaskStatus.Completed;

  const isReopenable = currentUser.roleName === 'Manager' && task.createdBy === currentUser.id && task.status === TaskStatus.Completed;
  
  const canChangeOverallStatus = (hasPermission(Permission.CAN_EDIT_ANY_TASK_STATUS) || (currentUser.roleName === 'Manager' && task.createdBy === currentUser.id));


  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={task.teamName ? `Team Task: ${task.teamName}` : 'Task Details'}
        size="lg"
        footer={
            <div className="flex items-center justify-between w-full">
                <div>
                    {isEditable && <Button variant="primary" onClick={() => onEditTask(task)}>Edit Task</Button>}
                    {isReopenable && <Button variant="success" onClick={() => { onUpdateTask(task.id, { status: TaskStatus.InProgress }); onClose(); }}>Reopen Task</Button>}
                </div>
                <Button variant="ghost" onClick={onClose}>
                    <i className="fas fa-times mr-2"></i>Close
                </Button>
            </div>
        }
    >
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{renderMentions(task.title, allUsers)}</h3>
          {sourceMeeting && (
            <Link to={`/meetings/${sourceMeeting.id}`} onClick={onClose} className="text-sm text-gray-500 mb-2 inline-block">
                <span className="font-semibold">🔗 From Meeting:</span>
                <span className="ml-2 inline-flex items-center bg-purple-100 text-purple-800 font-medium px-2.5 py-0.5 rounded-full hover:bg-purple-200 hover:text-purple-900 transition-colors">
                    <i className="fas fa-users-crown mr-1.5"></i>
                    {sourceMeeting.title}
                </span>
            </Link>
          )}
          <p className="whitespace-pre-wrap text-gray-700">{renderMentions(task.description, allUsers)}</p>
        </div>

        {task.subTasks && task.subTasks.length > 0 && (
          <div className="pt-2">
            <h4 className="font-semibold text-md mb-2">Sub-tasks</h4>
            <div className="space-y-2">
              {task.subTasks.map((subTask, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={subTask.completed}
                    onChange={() => handleSubTaskToggle(index)}
                    id={`subtask-${index}`}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor={`subtask-${index}`} className={`ml-3 text-sm ${subTask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {subTask.title}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div><span className="font-semibold">Due Date:</span> {formatDateDDMonYYYY(task.dueDate)}</div>
          <div><span className="font-semibold">Priority:</span> {task.priority}</div>
          <div>
            <span className="font-semibold">Overall Status:</span>{' '}
            {canChangeOverallStatus ? (
              <Select
                value={task.status}
                onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                options={Object.values(TaskStatus).map(s => ({ value: s, label: s }))}
                className="!inline-block !w-auto !py-1 !mt-0 !ml-2"
                wrapperClassName="!inline-block !mb-0"
              />
            ) : (
              task.status
            )}
          </div>
          <div><span className="font-semibold">Created By:</span> {getUsername(task.createdBy)}</div>
        </div>
       
        <div>
          <p className="font-semibold">Assigned To:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {task.assignedTo.map(id => (
              <div key={id} className="flex items-center bg-primary-light text-primary-dark font-medium px-2 py-1 rounded-full">
                <UserAvatar name={getUsername(id)} size="sm" className="mr-2" />
                <span>{getUsername(id)}</span>
              </div>
            ))}
          </div>
        </div>

        {task.taskType === TaskType.Team && <TeamProgressDetails task={task} allUsers={allUsers} />}

        {/* Comments Section */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold text-lg mb-2">Comments</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto mb-3 pr-2">
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start space-x-3">
                <UserAvatar name={getUsername(comment.createdBy)} size="md" />
                <div className="flex-grow bg-gray-100 p-2 rounded-md">
                    <p className="text-sm font-semibold">{getUsername(comment.createdBy)}</p>
                    <p className="text-sm">{renderMentions(comment.text, allUsers)}</p>
                    <p className="text-xs text-gray-500 text-right mt-1">
                      {formatDateTimeDDMonYYYYHHMM(comment.createdOn)}
                    </p>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-gray-500 italic">No comments yet.</p>}
          </div>
          <div className="flex space-x-2">
            <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment... (you can @mention people)" wrapperClassName="flex-grow" />
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>Send</Button>
          </div>
        </div>
        
        {/* History Section */}
        <div className="pt-4 border-t">
            <TimelineDisplay title="Task History" events={taskHistory} maxHeight="max-h-48" />
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;