import { SDLCProject, HistoryItem } from '../types';

export const storage = {
    history: {
        get: (): HistoryItem[] => {
            try {
                if (typeof window === 'undefined') return [];
                const item = window.localStorage.getItem('project_history');
                if (!item) return [];

                const parsed = JSON.parse(item);
                // Rehydrate Dates
                return parsed.map((p: any) => ({
                    ...p,
                    timestamp: new Date(p.timestamp),
                    project: {
                        ...p.project,
                        // Deep rehydrate if needed
                    }
                })).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
            } catch (e) {
                console.error('Error reading history', e);
                return [];
            }
        },
        save: (project: SDLCProject) => {
            try {
                if (typeof window === 'undefined') return;

                // Helper to get current history
                const getHistory = (): HistoryItem[] => {
                    const item = window.localStorage.getItem('project_history');
                    return item ? JSON.parse(item) : [];
                };

                const history = getHistory();
                const existingIndex = history.findIndex((h: any) => h.id === project.id);

                const historyItem: HistoryItem = {
                    id: project.id,
                    name: project.name,
                    prompt: project.prompt,
                    timestamp: new Date(),
                    project: project
                };

                let newHistory;
                if (existingIndex >= 0) {
                    newHistory = [...history];
                    newHistory[existingIndex] = historyItem;
                } else {
                    newHistory = [historyItem, ...history];
                }

                window.localStorage.setItem('project_history', JSON.stringify(newHistory));
            } catch (e) {
                console.error('Error saving to history', e);
            }
        },
        delete: (id: string) => {
            try {
                if (typeof window === 'undefined') return;
                const item = window.localStorage.getItem('project_history');
                if (!item) return;

                const history = JSON.parse(item);
                const newHistory = history.filter((h: any) => h.id !== id);
                window.localStorage.setItem('project_history', JSON.stringify(newHistory));
            } catch (e) {
                console.error('Error deleting from history', e);
            }
        },
        clear: () => {
            try {
                if (typeof window === 'undefined') return;
                window.localStorage.removeItem('project_history');
            } catch (e) {
                console.error('Error clearing history', e);
            }
        },
        search: (query: string): HistoryItem[] => {
            try {
                if (typeof window === 'undefined') return [];
                const item = window.localStorage.getItem('project_history');
                if (!item) return [];

                const history = JSON.parse(item);
                const lowerQuery = query.toLowerCase();

                const results = history.filter((h: any) =>
                    h.name.toLowerCase().includes(lowerQuery) ||
                    h.prompt.toLowerCase().includes(lowerQuery)
                );

                return results.map((p: any) => ({
                    ...p,
                    timestamp: new Date(p.timestamp)
                }));
            } catch (e) {
                console.error('Error searching history', e);
                return [];
            }
        }
    },
    get: (key: string) => {
        try {
            if (typeof window === 'undefined') return null;
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from storage', e);
            return null;
        }
    },
    set: (key: string, value: any) => {
        try {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing to storage', e);
        }
    },
    remove: (key: string) => {
        try {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removing from storage', e);
        }
    }
};
