import { useState } from 'react';

export default function FilterBar({ onFilterChange, onSearchChange, activeFilter, sortOrder, onSortChange }) {
    // Filters: All, Work, Home, High Priority
    const filters = ['All', 'Work', 'Home', 'Urgent'];

    return (
        <div style={{ marginBottom: '20px' }}>
            <input
                type="text"
                placeholder="Search tasks..."
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    background: 'var(--color-bg-soft)',
                    fontSize: '1rem',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                    outline: 'none'
                }}
            />

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {filters.map(filter => (
                    <button
                        key={filter}
                        onClick={() => onFilterChange(filter)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: activeFilter === filter ? 'var(--color-primary)' : 'var(--color-bg-soft)',
                            color: activeFilter === filter ? 'white' : 'var(--color-text-muted)',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {filter}
                    </button>
                ))}
            </div>
        </div>
    );
}
