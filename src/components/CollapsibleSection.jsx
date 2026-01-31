import { useState } from 'react';

export default function CollapsibleSection({ title, count, isCollapsed, onToggle, children }) {
    return (
        <div style={{ marginBottom: '16px' }}>
            {/* Section Header */}
            <div
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--color-bg-soft)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: isCollapsed ? '0' : '8px',
                    userSelect: 'none',
                    transition: 'all 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: 'var(--color-text-main)'
                    }}>
                        {title}
                    </span>
                    <span style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)',
                        fontWeight: '600'
                    }}>
                        ({count})
                    </span>
                </div>
                <span style={{
                    fontSize: '1.2rem',
                    transition: 'transform 0.2s ease',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                }}>
                    ▼
                </span>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="animate-enter">
                    {children}
                </div>
            )}
        </div>
    );
}
