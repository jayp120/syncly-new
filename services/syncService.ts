// services/syncService.ts
import { SYNC_QUEUE_KEY } from '../constants';
import eventBus from './eventBus';

// Define a structure for actions in the queue
interface SyncAction {
    type: string;
    payload: any;
    timestamp: number;
}

const getQueue = (): SyncAction[] => {
    try {
        const item = localStorage.getItem(SYNC_QUEUE_KEY);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const saveQueue = (queue: SyncAction[]) => {
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error("Could not write to local storage, might be full.", e);
    }
};

/**
 * Adds an action to the synchronization queue.
 * @param action - The action to be queued for syncing.
 */
export const addToQueue = (action: Omit<SyncAction, 'timestamp'>) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[Sync Service] App is offline. Queuing action:', action.type);
    }
    const queue = getQueue();
    const actionWithTimestamp: SyncAction = { ...action, timestamp: Date.now() };
    queue.push(actionWithTimestamp);
    saveQueue(queue);
};

/**
 * Processes the synchronization queue, simulating sending actions to a server.
 * This should be called when the app comes online.
 */
export const processQueue = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[Sync Service] App is offline. Sync paused.');
        return;
    }

    const queue = getQueue();
    if (queue.length === 0) {
        console.log('[Sync Service] Sync queue is empty.');
        return;
    }

    console.log(`[Sync Service] Syncing ${queue.length} action(s) with the server...`);
    
    // Simulate a network delay for the entire batch
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real app, you would loop through the queue and send each action to your backend API.
    // For this simulation, we'll just log them to the console.
    queue.forEach((action, index) => {
        console.log(`[Sync Service] >> Processing action ${index + 1}:`, action);
        // Example: await api.post('/sync', action);
    });
    
    // Once successfully synced with the server, clear the queue.
    saveQueue([]);
    console.log('[Sync Service] Sync complete.');
    eventBus.emit('sync-complete');
};