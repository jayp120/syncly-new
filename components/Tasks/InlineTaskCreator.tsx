

import React, { useState, useRef, useMemo, useCallback, useLayoutEffect, useEffect } from 'react';
import { User, Task, TaskPriority, TaskType, TaskStatus } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { parseMentions } from '../../utils/mentionUtils';
import Input from '../Common/Input';
import Select from '../Common/Select';
import Button from '../Common/Button';
import MentionTextarea from '../Common/MentionTextarea';
// FIX: Corrected import of `GoogleGenAI` and `Type` from `@google/genai`.
import { GoogleGenAI, Type } from "@google/genai";
import Spinner from '../Common/Spinner';
import Alert from '../Common/Alert';
import { formatDateDDMonYYYY } from '../../utils/dateUtils';
import * as DataService from '../../services/dataService';

interface InlineTaskCreatorProps {
  currentUser: User;
  teamMembers?: User[];
  onTaskAdd: (taskData: Omit<Task, 'id' | 'createdOn' | 'updatedOn' | 'pinnedBy' | 'overdueReminderSentFor'>) => Promise<void> | void;
  isManagerView?: boolean;
}

const InlineTaskCreator: React.FC<InlineTaskCreatorProps> = ({ currentUser, teamMembers = [], onTaskAdd, isManagerView = false }) => {
  const { addToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamName, setTeamName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Medium);
  
  const [isAiMode, setIsAiMode] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(DataService.isAiConfigured());
  const [aiState, setAiState] = useState<{
    prompt: string;
    isGenerating: boolean;
    generatedTask: { title: string; description: string; suggestedDueDate: string; suggestedPriority: TaskPriority; } | null;
    error: string | null;
  }>({ prompt: '', isGenerating: false, generatedTask: null, error: null });

  // Refs for inputs and layout
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);



  useLayoutEffect(() => {
    const textarea = aiPromptRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [aiState.prompt, isExpanded, isAiMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        if (!title.trim() && !description.trim() && !aiState.prompt.trim()) {
            setIsExpanded(false);
            setIsAiMode(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [title, description, aiState.prompt]);

  const mentionedUserIds = useMemo(() => parseMentions(description), [description]);
  const isTeamTaskAttempt = isManagerView && mentionedUserIds.length > 1;

  useEffect(() => {
    const unsubscribe = DataService.onGeminiKeyChange(() => {
      const configured = DataService.isAiConfigured();
      setHasGeminiKey(configured);
      setAiState(prev => ({ ...prev, error: null }));
      if (!configured) {
        setIsAiMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAiMode && !hasGeminiKey) {
      setIsAiMode(false);
    }
  }, [isAiMode, hasGeminiKey]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setTeamName('');
    setDueDate('');
    setPriority(TaskPriority.Medium);
    setIsExpanded(false);
    setIsAiMode(false);
    setAiState({ prompt: '', isGenerating: false, generatedTask: null, error: null });
  }, []);

  const handleAddTask = useCallback(() => {
    if (!title.trim()) { addToast("Task title cannot be empty.", 'error'); return; }
    if (!dueDate) { addToast("Due Date is required.", 'error'); return; }
    
    let finalAssignedTo = mentionedUserIds;
    let finalTaskType: TaskType;

    if (!isManagerView) {
        finalTaskType = TaskType.Personal;
        finalAssignedTo = [currentUser.id];
    } else {
        if (finalAssignedTo.length === 0) {
            addToast("Please mention at least one team member using '@' to assign the task.", "error");
            return;
        }
        finalTaskType = isTeamTaskAttempt ? TaskType.Team : TaskType.Direct;
    }

    onTaskAdd({
      title, description,
      teamName: finalTaskType === TaskType.Team ? teamName.trim() : '',
      dueDate, priority, assignedTo: finalAssignedTo,
      createdBy: currentUser.id, taskType: finalTaskType,
      isPersonalTask: !isManagerView, status: TaskStatus.NotStarted,
    });
    resetForm();
  }, [title, description, dueDate, priority, mentionedUserIds, isManagerView, isTeamTaskAttempt, teamName, currentUser.id, onTaskAdd, resetForm, addToast]);

  const handleGenerateTask = useCallback(async () => {
    if (!aiState.prompt.trim()) { addToast("Please describe the task for the AI.", 'error'); return; }
    const apiKey = await DataService.getGeminiApiKeyAsync();
    if (!apiKey) {
      setAiState(prev => ({
        ...prev,
        error: "AI features are not configured for this tenant yet. Please ask an admin to enable the Gemini key.",
      }));
      return;
    }
    
    setAiState(prev => ({ ...prev, isGenerating: true, error: null, generatedTask: null }));
  
    try {
      const ai = new GoogleGenAI({ apiKey });
      const today = new Date();
  
      const systemInstruction = `You are a task management assistant. Analyze the user's request and create a structured JSON task object. The output must be valid JSON.
      - 'title': A concise, action-oriented title.
      - 'description': Clear, actionable steps using markdown bullet points ("- Step 1").
      - 'suggestedDueDate': A date in YYYY-MM-DD format. Default to 3 days from today (${today.toISOString().split('T')[0]}) if no timeframe is given.
      - 'suggestedPriority': "High", "Medium", or "Low". Default to "Medium".`;
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', contents: aiState.prompt,
        config: {
          systemInstruction, responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT, properties: {
              title: { type: Type.STRING }, description: { type: Type.STRING },
              suggestedDueDate: { type: Type.STRING },
              suggestedPriority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            }, required: ["title", "description", "suggestedDueDate", "suggestedPriority"]
          },
        }
      });
  
      const parsedTask = JSON.parse(response.text);
      setAiState(prev => ({ ...prev, isGenerating: false, generatedTask: parsedTask as any }));
    } catch (err: any) {
      console.error("AI task generation failed:", err);
      const message = typeof err?.message === 'string' ? err.message : 'Unknown error';
      const friendlyMessage = /429|RESOURCE_EXHAUSTED/i.test(message)
        ? "Google Gemini is rate-limiting this key right now. Try again shortly or ask an admin to rotate the tenant key."
        : `AI task generation failed: ${message}`;
      setAiState(prev => ({ ...prev, isGenerating: false, error: friendlyMessage }));
    }
  }, [aiState.prompt, addToast]);
  
  const handleAiInsert = () => {
    if (!aiState.generatedTask) return;
    setTitle(aiState.generatedTask.title);
    setDescription(aiState.generatedTask.description);
    setDueDate(aiState.generatedTask.suggestedDueDate);
    setPriority(aiState.generatedTask.suggestedPriority);
    
    setAiState({ prompt: aiState.prompt, isGenerating: false, generatedTask: null, error: null });
    setIsAiMode(false);
  };
  
  const handleAiEdit = () => { setAiState(prev => ({ ...prev, generatedTask: null, error: null })); };


  if (!isExpanded) {
    return (
      isManagerView ? (
        <div className="p-3 mb-4 flex items-center justify-center space-x-4">
          <button onClick={() => { setIsExpanded(true); setIsAiMode(false); }} className="flex-1 p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed hover:border-primary text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center">
            <i className="fas fa-plus mr-2"></i> Assign a Task Manually
          </button>
          <button
            onClick={() => {
              if (!hasGeminiKey) {
                addToast("AI features are disabled until your admin configures the tenant Gemini key.", "warning");
                return;
              }
              setIsExpanded(true);
              setIsAiMode(true);
            }}
            className={`flex-1 p-3 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center ${
              hasGeminiKey
                ? 'bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
            disabled={!hasGeminiKey}
          >
            <i className="fas fa-robot mr-2" aria-hidden="true"></i> Create Task with AI
          </button>
        </div>
      ) : (
        <button onClick={() => setIsExpanded(true)} className="w-full text-left p-3 mb-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed hover:border-primary dark:hover:border-primary text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors flex items-center">
          <i className="fas fa-plus mr-2"></i> Add a new personal task...
        </button>
      )
    );
  }

  const commonTextareaStyles = "flex-grow w-full px-3 py-2 bg-white text-gray-800 border-0 shadow-none focus:outline-none focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm transition resize-none overflow-hidden dark:bg-transparent dark:text-slate-200";

  return (
    <div ref={wrapperRef} className="p-4 mb-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-primary shadow-lg relative">
      {isAiMode && isManagerView ? (
        <div>
          <div className="absolute top-2 right-3 z-10">
            <button onClick={() => setIsAiMode(false)} className="text-sm text-primary hover:underline" aria-label="Switch to manual task entry">
              📝 Manual Entry
            </button>
          </div>
          <h3 className="font-semibold text-primary mb-2">AI Task Assistant</h3>
          {aiState.error && <Alert type="error" message={aiState.error} onClose={() => setAiState(prev=>({...prev, error: null}))} />}
          {!hasGeminiKey && (
            <Alert
              type="info"
              message="Ask your admin to configure the tenant Gemini key to enable the AI assistant."
            />
          )}
          {!aiState.generatedTask && (
            <div className="flex items-start space-x-2">
              <textarea
                ref={aiPromptRef}
                placeholder="Describe your task..."
                value={aiState.prompt}
                onChange={e => setAiState(prev => ({ ...prev, prompt: e.target.value, error: null }))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerateTask(); } }}
                disabled={aiState.isGenerating || !hasGeminiKey}
                className="flex-grow w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/50 text-gray-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-400 text-sm transition resize-none overflow-hidden"
                rows={1}
                style={{ minHeight: '44px', padding: '10px' }}
                autoFocus
              />
              <Button
                onClick={handleGenerateTask}
                isLoading={aiState.isGenerating}
                disabled={!aiState.prompt.trim() || aiState.isGenerating || !hasGeminiKey}
              >
                Generate
              </Button>
            </div>
          )}
          {aiState.isGenerating && <Spinner message="AI is processing your task..." />}
          {aiState.generatedTask && !aiState.isGenerating && (
            <div className="p-3 my-2 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-2">
              <h4 className="font-semibold text-sm text-primary dark:text-sky-400 flex items-center"><i className="fas fa-lightbulb mr-2"></i> AI Suggestion</h4>
              <div><strong>Title:</strong> {aiState.generatedTask.title}</div>
              <div><strong>Description:</strong><div className="whitespace-pre-wrap pl-2 border-l-2 ml-2 bg-white dark:bg-slate-800 p-2 rounded max-h-40 overflow-y-auto">{aiState.generatedTask.description}</div></div>
              <div className="flex items-center gap-x-4 pt-2">
                <span><strong>📅 Due:</strong> {formatDateDDMonYYYY(aiState.generatedTask.suggestedDueDate)}</span>
                <span><strong>⚙️ Priority:</strong> {aiState.generatedTask.suggestedPriority}</span>
              </div>
              <div className="flex justify-end space-x-2 mt-2">
                <Button variant="ghost" size="sm" onClick={handleAiEdit} icon={<i className="fas fa-pencil-alt"></i>}>Edit Prompt</Button>
                <Button variant="primary" size="sm" onClick={handleAiInsert} icon={<i className="fas fa-check"></i>}>Insert into Form</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          {isManagerView && (
            <button
              type="button"
              onClick={() => {
                if (!hasGeminiKey) {
                  addToast("AI features are disabled until your admin configures the tenant Gemini key.", "warning");
                  return;
                }
                setIsAiMode(true);
              }}
              className={`absolute top-1 right-2 z-10 flex items-center text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                hasGeminiKey
                  ? 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/50 hover:bg-pink-200 dark:hover:bg-pink-900/80'
                  : 'text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/40 cursor-not-allowed'
              }`}
              aria-label="Switch to AI task assistant"
              disabled={!hasGeminiKey}
            >
              <i className="fas fa-brain mr-1.5 text-pink-500"></i>
              AI Assistant
            </button>
          )}

          <Input id="inline-title" placeholder={isManagerView ? "What needs to be done?" : "New personal task title"} value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-lg font-semibold !border-0 !shadow-none !ring-0 !p-1 focus:!ring-0"
            wrapperClassName="!mb-0" autoFocus
          />
          <MentionTextarea
            value={description}
            onChange={setDescription}
            placeholder={isManagerView ? "Add details... type @ to mention and assign" : "Add more details..."}
            rows={1}
            className="!border-0 !shadow-none !ring-0 !p-1 mt-1 bg-transparent"
            availableUsers={isManagerView ? teamMembers : []}
          />
          {isTeamTaskAttempt && <Input label="Team Name (Optional)" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g., Q4 Launch Team" wrapperClassName="mt-2" />}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} label="Due Date" min={new Date().toISOString().split('T')[0]} wrapperClassName="!mb-0" />
            <Select label="Priority" options={Object.values(TaskPriority).map(p => ({value: p, label: p}))} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} wrapperClassName="!mb-0" />
          </div>
          <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t dark:border-slate-700">
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddTask} disabled={!title.trim() || !dueDate}>Add Task</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineTaskCreator;


