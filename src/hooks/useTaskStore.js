import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'saydone-tasks';

export function useTaskStore() {
    // State: { past: [], present: [], future: [] } for Undo/Redo
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const initialTasks = saved ? JSON.parse(saved) : [];
        return {
            past: [],
            present: initialTasks,
            future: []
        };
    });

    // Persist current state
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    }, [history.present]);

    const update = useCallback((newPresent, isUndoRedo = false) => {
        setHistory(curr => {
            if (isUndoRedo) return newPresent; // Already shaped
            return {
                past: [...curr.past, curr.present],
                present: newPresent,
                future: []
            };
        });
    }, []);

    const addTask = (taskOrTasks) => {
        const newTasks = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks];
        update([...newTasks, ...history.present]);
    };

    const removeTask = (id) => {
        update(history.present.filter(t => t.id !== id));
    };

    const toggleComplete = (id) => {
        update(
            history.present.map(t =>
                t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
            )
        );
    };

    const editTask = (id, updates) => {
        update(history.present.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const undo = () => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr;
            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, -1);
            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            };
        });
    };

    const redo = () => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr;
            const next = curr.future[0];
            const newFuture = curr.future.slice(1);
            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            };
        });
    };

    return {
        tasks: history.present,
        addTask,
        removeTask,
        toggleComplete,
        editTask,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0
    };
}
