import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EODReport, User, Attachment, ReportVersion, Task, TaskStatus } from '../../types';
import * as DataService from '../../services/dataService';
import { uploadReportAttachment } from '../../services/storageService';
import Input from '../Common/Input';
import Textarea from '../Common/Textarea';
import Button from '../Common/Button';
import Card from '../Common/Card';
import Alert from '../Common/Alert';
// FIX: Corrected react-router-dom import to use a standard named import.
import { useNavigate, useParams } from "react-router-dom";
import Spinner from '../Common/Spinner';
import { WEEK_DAYS, MAX_REPORT_VERSIONS } from '../../constants';
import Modal from '../Common/Modal'; 
// FIX: Import isDayWeeklyOff directly from dateUtils.
import { formatDateDDMonYYYY, formatDateTimeDDMonYYYYHHMM, getLocalYYYYMMDD, isDayWeeklyOff } from '../../utils/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import Select from '../Common/Select';


const VOICE_INPUT_TIMEOUT_MS = 10000; // 10 seconds
const MAX_ATTACHMENTS = 3;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
];
const ALLOWED_FILE_EXTENSIONS = '.jpg, .jpeg, .png, .pdf, .docx';

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string; 
  readonly message?: string;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  grammars: any; 
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI?: string;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, videoRef, canvasRef }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        let localStream: MediaStream | null = null;
        if (isOpen) {
            setCameraError(null);
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(mediaStream => {
                    localStream = mediaStream;
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                })
                .catch(err => {
                    console.error("Error accessing camera:", err);
                    setCameraError("Could not access camera. Please check permissions and ensure no other app is using it.");
                });
        } else if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, videoRef]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Take a Photo" size="lg" footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={onCapture} disabled={!!cameraError || !stream}>
                    <i className="fas fa-camera mr-2"></i>Take Picture
                </Button>
            </>
        }>
            {cameraError && <Alert type="error" message={cameraError} />}
            <div className="bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto" muted></video>
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
        </Modal>
    );
};


interface EODReportFormProps {
  currentUser: User;
  reportDate: string; // YYYY-MM-DD string for the report
  onReportSubmitOrUpdate?: (report: EODReport) => void;
}

type SpeechCapableField = 'tasksCompleted' | 'challengesFaced' | 'planForTomorrow';

const EODReportForm: React.FC<EODReportFormProps> = ({ currentUser, reportDate, onReportSubmitOrUpdate }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { reportId: reportIdToEdit } = useParams<{ reportId?: string }>();
  
  const [reportToEdit, setReportToEdit] = useState<EODReport | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [date, setDate] = useState(reportDate); 
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [planForTomorrow, setPlanForTomorrow] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCopiedContent, setIsCopiedContent] = useState(false); 
  
  const [error, setError] = useState(''); 
  const [attachmentError, setAttachmentError] = useState(''); 
  const [editableInfo, setEditableInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);

  const [speechApiSupported, setSpeechApiSupported] = useState(false);
  const [isListeningFor, setIsListeningFor] = useState<SpeechCapableField | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEditLimitModal, setShowEditLimitModal] = useState(false);
  const [editableState, setEditableState] = useState({ editable: true, reason: "" });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // NEW state for task integration
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [newlyCompletedTaskIds, setNewlyCompletedTaskIds] = useState<Set<string>>(new Set());
  
  // Report ID for file uploads (generated upfront)
  const [pendingReportId] = useState(() => {
    // Generate ID once when component mounts
    return `report_${currentUser.id}_${date.replace(/-/g, '')}_${Date.now()}`;
  });

  useEffect(() => {
    // Initialize SpeechRecognition only once on component mount
    const SpeechRecognitionAPIConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPIConstructor) {
      const recognitionInstance = new SpeechRecognitionAPIConstructor();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      recognitionRef.current = recognitionInstance;
      setSpeechApiSupported(true);
    } else {
      setSpeechApiSupported(false);
    }
  }, []);

  useEffect(() => {
    const loadReportForEdit = async () => {
        if (reportIdToEdit) {
            setIsFetchingReport(true);
            const fetchedReport = await DataService.getReportById(reportIdToEdit);

            if (fetchedReport && fetchedReport.employeeId === currentUser.id) {
                setReportToEdit(fetchedReport);
                setDate(fetchedReport.date);
                const editState = await DataService.isReportEditable(fetchedReport);
                setEditableState(editState);
                
                const latestVersion = fetchedReport.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
                if (latestVersion) {
                    setTasksCompleted(latestVersion.tasksCompleted);
                    setChallengesFaced(latestVersion.challengesFaced || '');
                    setPlanForTomorrow(latestVersion.planForTomorrow || '');
                    setAttachments(latestVersion.attachments || []);
                    setIsCopiedContent(latestVersion.isCopied || false);
                }
                setIsEditMode(true);
            } else {
                setError("Report not found or you don't have permission to edit it.");
                navigate('/my-reports', { replace: true });
            }
            setIsFetchingReport(false);
        } else {
            setDate(reportDate);
            setIsEditMode(false);
            setReportToEdit(null);
            // Reset fields for new report
            setTasksCompleted('');
            setChallengesFaced('');
            setPlanForTomorrow('');
            setAttachments([]);
            setIsCopiedContent(false);
        }
        setError('');
        setEditableInfo('');
    };

    loadReportForEdit();
  }, [reportIdToEdit, currentUser.id, navigate, reportDate]);

  // NEW useEffect to fetch pending tasks for the current user
  useEffect(() => {
      if (isEditMode) return; // Only show tasks on a new report form

      const fetchTasks = async () => {
          setIsLoadingTasks(true);
          const allTasks = await DataService.getTasks();
          const userPendingTasks = allTasks.filter(task =>
              (task.assignedTo.includes(currentUser.id) || (task.isPersonalTask && task.createdBy === currentUser.id)) &&
              task.status !== TaskStatus.Completed
          ).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Sort by due date
          setPendingTasks(userPendingTasks);
          setIsLoadingTasks(false);
      };
      fetchTasks();
  }, [currentUser.id, isEditMode]);

  useEffect(() => {
    if (isEditMode && !editableState.editable) {
        setEditableInfo(editableState.reason);
    } else {
        setEditableInfo(''); // Clear info if it becomes editable again or not in edit mode
    }
  }, [isEditMode, editableState]);
  
  const isCurrentReportDateWeeklyOff = useCallback(() => {
    if (!currentUser.weeklyOffDay) return false;
    // Parse date string as local date to avoid timezone shifts
    const selectedDateObj = new Date(date.replace(/-/g, '/'));
    // FIX: Call isDayWeeklyOff from dateUtils directly, not via DataService.
    return isDayWeeklyOff(selectedDateObj, currentUser.weeklyOffDay);
  }, [date, currentUser.weeklyOffDay]);

  useEffect(() => {
    if(isEditMode || error || editableInfo) return; // Don't show weekly off message if other messages are present

    const weeklyOffNewMsg = `Today is your designated weekly off (${currentUser.weeklyOffDay}). Submission is optional if you chose to work.`;

    if (isCurrentReportDateWeeklyOff()) {
        if (!isCopiedContent) { 
            setEditableInfo(weeklyOffNewMsg);
        }
    } else {
        if (!isCopiedContent && (editableInfo === weeklyOffNewMsg)) {
            setEditableInfo('');
        }
    }
  }, [date, currentUser.weeklyOffDay, isEditMode, isCopiedContent, error, editableInfo, setEditableInfo, isCurrentReportDateWeeklyOff]);


  useEffect(() => {
    const recognition = recognitionRef.current;
    return () => {
      if (recognition && isListeningFor) {
        recognition.stop();
      }
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
    };
  }, [isListeningFor]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(''); 
    const files = event.target.files;
    if (!files) return;

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setAttachmentError(`You can upload a maximum of ${MAX_ATTACHMENTS} files.`);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
      return;
    }

    // Show uploading feedback
    setAttachmentError('Uploading files to secure storage...');
    const newAttachmentsPromises: Promise<Attachment>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setAttachmentError(`File type not allowed: ${file.name}. Allowed: JPG, PNG, PDF, DOCX.`);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        return; 
      }
      
      // Upload to Firebase Storage
      const uploadPromise = uploadReportAttachment(file, reportToEdit?.id || pendingReportId)
        .then(uploaded => ({
          name: uploaded.name,
          type: uploaded.type,
          size: uploaded.size,
          storageUrl: uploaded.storageUrl,
          storagePath: uploaded.storagePath,
        }))
        .catch(err => {
          console.error(`Error uploading ${file.name}:`, err);
          throw new Error(`Failed to upload ${file.name}`);
        });
      
      newAttachmentsPromises.push(uploadPromise);
    }

    try {
      const newlyProcessedAttachments = await Promise.all(newAttachmentsPromises);
      setAttachments(prev => [...prev, ...newlyProcessedAttachments]);
      setAttachmentError(''); // Clear uploading message
      addToast(`${newlyProcessedAttachments.length} file(s) uploaded successfully`, 'success');
    } catch (err: any) {
      console.error("Error uploading files:", err);
      setAttachmentError(err.message || "Error uploading one or more files.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const removeAttachment = (fileNameToRemove: string) => {
    setAttachments(prev => prev.filter(att => att.name !== fileNameToRemove));
    setAttachmentError('');
  };

  const handleCopyPreviousReport = async () => {
    setError('');
    setSpeechError(null);
    setAttachmentError('');
    const userReports = await DataService.getReportsByEmployee(currentUser.id);
    if (userReports.length > 0) {
      const mostRecentReport = userReports.sort((a,b) => b.submittedAt - a.submittedAt)[0];
      
      const latestVersionOfMostRecent = mostRecentReport.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];

      if (latestVersionOfMostRecent) {
        setTasksCompleted(latestVersionOfMostRecent.tasksCompleted);
        setChallengesFaced(latestVersionOfMostRecent.challengesFaced || '');
        setPlanForTomorrow(latestVersionOfMostRecent.planForTomorrow || '');
        setAttachments([]); 
        setIsCopiedContent(true);
        addToast("Report content copied. Please update details.", 'info');
      } else {
        setError("Could not find content in the most recent report.");
      }
    } else {
      setError("No previous reports found to copy from.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSpeechError(null);
    setAttachmentError('');
    setEditableInfo(''); 
    setIsLoading(true);

    if (!tasksCompleted.trim() && newlyCompletedTaskIds.size === 0) {
        setError('Please either type your tasks or mark a pending task as "Completed".');
        setIsLoading(false);
        return;
    }
    
    // NEW LOGIC: Prepend newly completed tasks to the report text
    let finalTasksCompletedText = tasksCompleted.trim();
    if (newlyCompletedTaskIds.size > 0) {
        const completedTaskTitles = Array.from(newlyCompletedTaskIds)
            .map(id => {
                const task = pendingTasks.find(t => t.id === id);
                return task ? `- Completed: ${task.title}` : null;
            })
            .filter(Boolean)
            .join('\n');
        
        if (finalTasksCompletedText) {
            finalTasksCompletedText = `${completedTaskTitles}\n\n--- Other Notes ---\n${finalTasksCompletedText}`;
        } else {
            finalTasksCompletedText = completedTaskTitles;
        }
    }

    const versionDataPayload = {
        tasksCompleted: finalTasksCompletedText,
        challengesFaced,
        planForTomorrow,
        attachments,
        isCopied: isCopiedContent, 
    };

    try {
      let finalReport: EODReport | null = null;
      if (isEditMode && reportToEdit) {
        const currentEditableState = await DataService.isReportEditable(reportToEdit);
        if (!currentEditableState.editable) {
            setError(currentEditableState.reason);
            setEditableInfo(currentEditableState.reason); 
            setIsLoading(false);
            return;
        }
        finalReport = await DataService.addReportVersionByEmployee(reportToEdit.id, versionDataPayload, currentUser);
        if (finalReport) {
          if (onReportSubmitOrUpdate) onReportSubmitOrUpdate(finalReport);
          
          if (finalReport.versions.length >= MAX_REPORT_VERSIONS) {
            setShowEditLimitModal(true); 
          } else {
            addToast('EOD report updated successfully!', 'success');
            navigate('/my-reports', { replace: true });
          }
        } else {
          setError('Failed to update report. Ensure you are editing on the same day and within version limits.');
        }

      } else { 
        const existingReports = await DataService.getReportsByEmployee(currentUser.id);
        if (existingReports.some(r => r.date === date)) {
          setError(`You have already submitted a report for ${formatDateDDMonYYYY(date)}. You can view or edit it from "My EOD Reports".`);
          setIsLoading(false);
          return;
        }
        
        const newReportData = { 
          employeeId: currentUser.id,
          employeeName: currentUser.name, 
          date: date, 
          initialTasksCompleted: versionDataPayload.tasksCompleted,
          initialChallengesFaced: versionDataPayload.challengesFaced,
          initialPlanForTomorrow: versionDataPayload.planForTomorrow,
          initialAttachments: versionDataPayload.attachments,
          isCopied: versionDataPayload.isCopied,
        };
        finalReport = await DataService.addReport(newReportData);
        addToast('EOD report submitted successfully!', 'success');
        
        if (finalReport.submittedOnWeekOff) { 
             addToast("Report submitted for your weekly off day. Thank you!", 'info');
        }

        if (onReportSubmitOrUpdate) onReportSubmitOrUpdate(finalReport);
        
        navigate('/my-reports', { replace: true });
      }
      if(finalReport) {
        DataService.checkAndAwardBadges(currentUser.id);
      }

    } catch (err: any) {
      setError(`Failed to ${isEditMode ? 'update' : 'submit'} report: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = (field: SpeechCapableField) => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setSpeechError("Speech recognition is not supported by your browser.");
      setSpeechApiSupported(false);
      return;
    }
    setSpeechError(null);

    if (isListeningFor === field) {
      recognition.stop();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      setIsListeningFor(null);
      return;
    }

    if (isListeningFor && isListeningFor !== field) {
        recognition.stop();
         if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    }
    
    setIsListeningFor(field);
    recognition.onresult = (event: SpeechRecognitionEvent) => { 
      const transcript = event.results[0][0].transcript;
      const currentVal = field === 'tasksCompleted' ? tasksCompleted : field === 'challengesFaced' ? challengesFaced : planForTomorrow;
      const newVal = (currentVal ? currentVal + " " : "") + transcript;
      switch (field) {
        case 'tasksCompleted': setTasksCompleted(newVal); break;
        case 'challengesFaced': setChallengesFaced(newVal); break;
        case 'planForTomorrow': setPlanForTomorrow(newVal); break;
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => { 
      let message = "Speech recognition error: " + event.error;
      if (event.error === 'no-speech') message = "No speech was detected. Please try again.";
      if (event.error === 'audio-capture') message = "Microphone problem. Ensure it's enabled and not in use by another app.";
      if (event.error === 'not-allowed') message = "Microphone permission denied. Please enable it in your browser settings.";
      setSpeechError(message);
      setIsListeningFor(null);
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    };
    recognition.onend = () => {
      setIsListeningFor(null);
      if (voiceTimeoutRef.current) { clearTimeout(voiceTimeoutRef.current); voiceTimeoutRef.current = null; }
    };
    try {
      recognition.start();
      voiceTimeoutRef.current = window.setTimeout(() => {
        if (isListeningFor === field && recognition) { recognition.stop(); }
      }, VOICE_INPUT_TIMEOUT_MS);
    } catch (e: any) {
        setSpeechError("Could not start voice recognition: " + e.message);
        setIsListeningFor(null);
        if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    }
  };
  
  const handleTakePhoto = () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      setAttachmentError(`You can upload a maximum of ${MAX_ATTACHMENTS} files.`);
      return;
    }
    setIsCameraOpen(true);
  };

  const handleCapture = async () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            // Convert canvas to Blob for upload
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setAttachmentError('Failed to capture photo');
                    return;
                }
                
                try {
                    setAttachmentError('Uploading photo to secure storage...');
                    
                    // Create File from Blob
                    const fileName = `photo-${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });
                    
                    // Upload to Firebase Storage
                    const uploaded = await uploadReportAttachment(file, reportToEdit?.id || pendingReportId);
                    
                    const newAttachment: Attachment = {
                        name: uploaded.name,
                        type: uploaded.type,
                        size: uploaded.size,
                        storageUrl: uploaded.storageUrl,
                        storagePath: uploaded.storagePath,
                    };

                    setAttachments(prev => [...prev, newAttachment]);
                    setAttachmentError('');
                    setIsCameraOpen(false);
                    addToast('Photo uploaded successfully', 'success');
                } catch (err: any) {
                    console.error('Error uploading photo:', err);
                    setAttachmentError('Failed to upload photo. Please try again.');
                }
            }, 'image/jpeg', 0.9);
        }
    }
  };

  // NEW handler for changing task status from the form
  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const taskToUpdate = pendingTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;
    
    // Optimistically update UI
    const originalTasks = [...pendingTasks];
    const updatedTasks = pendingTasks.map(t => t.id === taskId ? {...t, status: newStatus} : t);
    setPendingTasks(updatedTasks);

    if (newStatus === TaskStatus.Completed) {
        setNewlyCompletedTaskIds(prev => new Set(prev).add(taskId));
    } else {
        setNewlyCompletedTaskIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
        });
    }
    
    try {
        await DataService.updateTask(taskId, { status: newStatus }, currentUser);
        addToast(`Task status updated to "${newStatus}"`, 'success');
    } catch (error) {
        // Revert UI on error
        setPendingTasks(originalTasks);
        addToast('Failed to update task status.', 'error');
        // Revert newly completed set
         if (newStatus === TaskStatus.Completed) {
            setNewlyCompletedTaskIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    }
  };

  if (isFetchingReport) {
    return <Spinner message="Loading report data..." />;
  }
  
  const renderTextareaWithVoice = (
    field: SpeechCapableField,
    label: string,
    value: string,
    onChangeHandler: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
    placeholder: string,
    required?: boolean
  ) => {
    const isCurrentlyListening = isListeningFor === field;
    const fieldLabel = field === 'tasksCompleted' ? 'Tasks Completed Today' 
                     : field === 'challengesFaced' ? 'Challenges Faced (Optional)'
                     : 'Plan for Tomorrow (Optional)';
    const isDisabled = isEditMode && !editableState.editable;

    return (
      <div className="mb-4">
        <label htmlFor={field} className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">{label}</label>
        <div className="flex items-start space-x-2">
          <Textarea
            id={field}
            fieldIdentifier={field}
            value={value}
            onChange={onChangeHandler}
            placeholder={placeholder}
            required={required}
            wrapperClassName="flex-grow"
            disabled={isDisabled}
          />
          {speechApiSupported && (
            <button
              type="button"
              onClick={() => handleVoiceInput(field)}
              className={`p-3 rounded-full flex-shrink-0 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary self-start ${
                isCurrentlyListening
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                  : 'bg-primary text-white hover:bg-primary-hover'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isCurrentlyListening ? `Stop listening for ${fieldLabel}` : `Start voice input for ${fieldLabel}`}
              aria-label={isCurrentlyListening ? `Stop voice input for ${fieldLabel}` : `Start voice input for ${fieldLabel}`}
              aria-pressed={isCurrentlyListening}
              disabled={isDisabled}
            >
              <i className={`fas fa-microphone w-5 h-5`}></i>
            </button>
          )}
        </div>
        {speechApiSupported && <p className="mt-1 text-xs text-text-secondary dark:text-dark-text-secondary">{isCurrentlyListening ? `Listening for ${fieldLabel}...` : "Tap the mic to speak."}</p>}
        {!speechApiSupported && <p className="mt-1 text-xs text-text-secondary dark:text-dark-text-secondary">Voice input not supported by your browser.</p>}
      </div>
    );
  };
  
  const title = isEditMode ? `Edit EOD Report for ${formatDateDDMonYYYY(date)}` : `Submit EOD Report for ${formatDateDDMonYYYY(date)}`;

  const latestVersionForDisplay = reportToEdit?.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
  const formDisabled = isEditMode && !editableState.editable;

  const renderTaskIntegrationCard = () => (
    !isEditMode && (
        <Card title="Your Pending Tasks" titleIcon={<i className="fas fa-clipboard-list text-indigo-500"></i>} className="mb-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Quickly update your tasks. "Completed" tasks will be added to your report automatically.
            </p>
            {isLoadingTasks ? (
                <Spinner message="Loading tasks..." />
            ) : pendingTasks.length === 0 ? (
                <p className="text-center text-text-secondary dark:text-slate-400 py-4 italic">You have no pending tasks. Great job!</p>
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 -mr-2">
                    {pendingTasks.map(task => (
                        <div key={task.id} className="p-2 border dark:border-slate-700 rounded-lg flex items-center justify-between gap-4 bg-white dark:bg-slate-800/60 shadow-sm">
                            <div className="flex-grow">
                                <p className="font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Due: {formatDateDDMonYYYY(task.dueDate)}</p>
                            </div>
                            <div className="flex-shrink-0">
                                <Select
                                    options={Object.values(TaskStatus).filter(s => s !== TaskStatus.Blocked).map(s => ({ value: s, label: s }))}
                                    value={task.status}
                                    onChange={(e) => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
                                    wrapperClassName="!mb-0"
                                    className="!mt-0 !text-xs !py-1 w-32"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
  );

  return (
    <>
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
        videoRef={videoRef}
        canvasRef={canvasRef}
      />
      <Modal
        isOpen={showEditLimitModal}
        onClose={() => {
          setShowEditLimitModal(false);
          navigate('/my-reports', { replace: true });
        }}
        title="Edit Submitted Successfully"
        footer={
          <Button
            onClick={() => {
              setShowEditLimitModal(false);
              navigate('/my-reports', { replace: true });
            }}
            variant="primary"
          >
            OK
          </Button>
        }
      >
        <p>Your report has been updated successfully. You have now used your one allowed edit for this report.</p>
      </Modal>

      <Card 
          title={title} 
          titleIcon={<i className={`fas ${isEditMode ? 'fa-edit' : 'fa-paper-plane'}`}></i>}
      >
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {editableInfo && !error && <Alert type="info" message={editableInfo} className="mb-4"/>}
        {speechError && <Alert type="error" message={speechError} onClose={() => setSpeechError(null)} />}
        {!speechApiSupported && <Alert type="warning" message="Voice input (Speech Recognition) is not supported by your browser. Please type your report."/>}

        <form onSubmit={handleSubmit} className="space-y-2">
          {!isEditMode && (
            <div className="flex justify-end mb-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleCopyPreviousReport} 
                icon={<i className="fas fa-copy"></i>}
                size="sm"
              >
                Copy Previous Report
              </Button>
            </div>
          )}
          <Input
            label={`Report Date`}
            id="report-date"
            type="text"
            value={formatDateDDMonYYYY(date)} 
            required
            disabled={true} 
            wrapperClassName="mb-4"
          />

          {renderTaskIntegrationCard()}

          {renderTextareaWithVoice(
            'tasksCompleted',
            'Tasks Completed Today (Manual Entry)',
            tasksCompleted,
            (e) => setTasksCompleted(e.target.value),
            'Optionally add any other tasks you completed today that were not in your task list...',
            !isEditMode && newlyCompletedTaskIds.size === 0 // Required if no tasks are checked off
          )}

          {renderTextareaWithVoice(
            'challengesFaced',
            'Challenges Faced (Optional)',
            challengesFaced,
            (e) => setChallengesFaced(e.target.value),
            'Any roadblocks or issues encountered?'
          )}

          {renderTextareaWithVoice(
            'planForTomorrow',
            'Plan for Tomorrow (Optional)',
            planForTomorrow,
            (e) => setPlanForTomorrow(e.target.value),
            'What are your key priorities for the next working day?'
          )}

          <div className="pt-2">
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
              Upload Photos, Screenshots, or Documents (optional)
            </label>
            <div className="flex items-center space-x-2">
              <label
                htmlFor="attachments-input"
                className={`cursor-pointer inline-flex items-center px-4 py-2 border border-border-primary dark:border-dark-border rounded-md shadow-sm text-sm font-medium text-text-primary dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${ formDisabled || attachments.length >= MAX_ATTACHMENTS ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className="fas fa-upload mr-2"></i> Choose Files
              </label>
              <Button
                type="button"
                onClick={handleTakePhoto}
                variant="outline"
                disabled={formDisabled || attachments.length >= MAX_ATTACHMENTS}
                icon={<i className="fas fa-camera"></i>}
              >
                Take Photo
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              id="attachments-input"
              multiple
              accept={ALLOWED_FILE_EXTENSIONS}
              onChange={handleFileChange}
              className="hidden"
              aria-describedby="attachments-help attachments-error"
              disabled={formDisabled || attachments.length >= MAX_ATTACHMENTS}
            />

            <p id="attachments-help" className="mt-1 text-xs text-text-secondary dark:text-dark-text-secondary">
              Attach proof of work, screenshots, or reports if needed. Max {MAX_ATTACHMENTS} files (JPG, PNG, PDF, DOCX).
              <br/>A submitted report can be edited only <strong>once</strong>, within <strong>2 hours</strong> of the initial submission. All edits are logged.
            </p>
            {attachmentError && <p id="attachments-error" className="mt-1 text-xs text-red-600 font-semibold">{attachmentError}</p>}
            
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">Selected files ({attachments.length}/{MAX_ATTACHMENTS}):</p>
                {attachments.map((att, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-gray-50 dark:bg-dark-surface-secondary text-sm">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {att.type.startsWith('image/') ? (
                        <img src={att.dataUrl} alt={att.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                      ) : (
                        <i className={`fas ${att.type === 'application/pdf' ? 'fa-file-pdf text-red-500' : (att.type.includes('wordprocessingml') ? 'fa-file-word text-blue-500' : 'fa-file-alt text-gray-500')} text-lg flex-shrink-0 w-6 text-center`}></i>
                      )}
                      <span className="truncate text-text-primary dark:text-dark-text-primary" title={att.name}>{att.name}</span>
                      <span className="text-xs text-text-secondary dark:text-dark-text-secondary flex-shrink-0">({(att.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.name)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title={`Remove ${att.name}`}
                      aria-label={`Remove ${att.name}`}
                      disabled={formDisabled}
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => navigate('/my-reports', { replace: true })}>
                  Cancel
              </Button>
              <Button 
                  type="submit" 
                  variant="primary" 
                  isLoading={isLoading} 
                  size="lg"
                  disabled={formDisabled}
              >
                  {isLoading ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Report' : 'Submit Report')}
              </Button>
          </div>
        </form>
        {isEditMode && reportToEdit && latestVersionForDisplay && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-surface-secondary rounded text-xs text-gray-600 dark:text-dark-text-secondary">
              <p>Report Date: {formatDateDDMonYYYY(reportToEdit.date)}</p>
              <p>Initial Submission: {formatDateTimeDDMonYYYYHHMM(reportToEdit.submittedAt)}</p>
              <p>Number of Versions: {reportToEdit.versions.length} / {MAX_REPORT_VERSIONS}</p>
              {reportToEdit.isLate && <p className="font-semibold text-orange-600 dark:text-orange-400">This was a late submission.</p>}
              {reportToEdit.submittedOnWeekOff && <p className="font-semibold text-blue-600 dark:text-blue-400">This report was submitted on a weekly off day.</p>}
              {latestVersionForDisplay.isCopied && <p className="font-semibold text-teal-700 dark:text-teal-400">This version's content was based on a copied report.</p>}
              {formDisabled && <p className="font-bold text-red-600 dark:text-red-400">{editableInfo || "Editing is locked for this report."}</p>}
          </div>
        )}
      </Card>
    </>
  );
};

export default EODReportForm;