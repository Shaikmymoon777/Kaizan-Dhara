// API Storage Utilities for User History and Preferences

import { HistoryItem, UserPreferences, SDLCProject } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const LOCAL_STORAGE_KEY = 'kaizen_dhara_history';

// History Management
export const saveToHistory = async (project: SDLCProject): Promise<void> => {
    const historyItem: HistoryItem = {
        id: project.id,
        prompt: project.prompt,
        name: project.name,
        timestamp: new Date(),
        project: project,
        preview: project.requirements?.scope?.substring(0, 150) || 'No preview available',
    };

    // 1. Always save to LocalStorage first (Vercel Persistence Fallback)
    try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        const localHistory: HistoryItem[] = localData ? JSON.parse(localData) : [];

        // Remove existing if any (update)
        const updatedHistory = [historyItem, ...localHistory.filter(item => item.id !== project.id)];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory.slice(0, 100))); // Limit to 100 items
    } catch (e) {
        console.error('LocalStorage save failed:', e);
    }

    // 2. Try to save to Backend DB
    try {
        await fetch(`${API_BASE}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historyItem),
        });
    } catch (error) {
        console.warn('Backend save failed (offline or serverless reset). Data remains in LocalStorage.');
    }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
    // 1. Try Backend first
    try {
        const res = await fetch(`${API_BASE}/history`);
        if (res.ok) {
            const history = await res.json();
            return history.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp),
                project: {
                    ...item.project,
                    createdAt: item.project.createdAt ? new Date(item.project.createdAt) : undefined,
                    completedAt: item.project.completedAt ? new Date(item.project.completedAt) : undefined,
                },
            }));
        }
    } catch (error) {
        console.warn('Backend fetch failed, falling back to LocalStorage.');
    }

    // 2. Fallback to LocalStorage
    try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
            const history = JSON.parse(localData);
            return history.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp),
            }));
        }
    } catch (e) {
        console.error('LocalStorage fetch failed:', e);
    }

    return [];
};

export const deleteHistoryItem = async (id: string): Promise<void> => {
    try {
        await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Failed to delete history item:', error);
    }
};

export const clearHistory = async (): Promise<void> => {
    try {
        await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    } catch (error) {
        console.error('Failed to clear history:', error);
    }
};

export const searchHistory = async (query: string): Promise<HistoryItem[]> => {
    // Ideally, search should be backend-side, but client-side filter is fine for small lists
    const history = await getHistory();
    const lowerQuery = query.toLowerCase();

    return history.filter(item =>
        item.prompt.toLowerCase().includes(lowerQuery) ||
        item.name.toLowerCase().includes(lowerQuery) ||
        item.preview?.toLowerCase().includes(lowerQuery)
    );
};

// Preferences Management
export const savePreferences = async (preferences: UserPreferences): Promise<void> => {
    try {
        await fetch(`${API_BASE}/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences),
        });
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
};

export const getPreferences = async (): Promise<UserPreferences> => {
    try {
        const res = await fetch(`${API_BASE}/preferences`);
        if (res.ok) {
            return await res.json();
        }
    } catch (error) {
        console.error('Failed to get preferences:', error);
    }
    // Default fallback
    return {
        theme: 'ocean',
        historyLimit: 50,
        autoSave: true,
    };
};

// Current Project Management
export const saveCurrentProject = async (project: SDLCProject | null): Promise<void> => {
    // For now, we only save if project is not null (upsert)
    if (!project) return;
    try {
        // We use a specific endpoint or just ignore specific "current project" API if not strictly needed
        // but let's implement the generic project save
        await fetch(`${API_BASE}/project/current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
        });
    } catch (error) {
        console.error('Failed to save current project:', error);
    }
};

export const getCurrentProject = async (): Promise<SDLCProject | null> => {
    // Current Project concept works differently with a real backend.
    // Usually we load a specific project by ID.
    // Use localStorage for just the ID of the last active project?
    // Or just return null and let user select from history.
    return null;
};

// Export all storage utilities
export const storage = {
    history: {
        save: saveToHistory,
        get: getHistory,
        delete: deleteHistoryItem,
        clear: clearHistory,
        search: searchHistory,
    },
    preferences: {
        save: savePreferences,
        get: getPreferences,
    },
    currentProject: {
        save: saveCurrentProject,
        get: getCurrentProject,
    },
};

