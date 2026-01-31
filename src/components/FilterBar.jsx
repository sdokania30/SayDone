import { useState } from 'react';

export default function FilterBar({ onSearchChange, sortBy, onSortChange, showCompleted, onToggleCompleted }) {
    const sortOptions = [
        { value: 'priority', label: '🎯 Priority' },
        { value: 'date', label: '📅 Date' }
    ];

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

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sort:</span>
                {sortOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => onSortChange(option.value)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: sortBy === option.value ? 'var(--color-primary)' : 'var(--color-bg-soft)',
                            color: sortBy === option.value ? 'white' : 'var(--color-text-muted)',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            minHeight: '32px',
                            minWidth: 'auto'
                        }}
                    >
                        {option.label}
                    </button>
                ))}

                <button
                    onClick={onToggleCompleted}
                    className={`toggle-btn ${showCompleted ? 'active' : ''}`}
                    style={{
                        marginLeft: 'auto',
                        minWidth: 'auto'
                    }}
                >
                    {showCompleted ? '✓ Done' : 'Show Done'}
                </button>
            </div>
        </div>
    );
}
