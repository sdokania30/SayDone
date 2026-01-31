import { useState, useMemo, useEffect } from 'react'
import parseTasks from './utils/taskParser'
import { useTaskStore } from './hooks/useTaskStore'
import FilterBar from './components/FilterBar'
import CollapsibleSection from './components/CollapsibleSection'

function App() {
  const { tasks, addTask, removeTask, toggleComplete, editTask, undo, redo, canUndo, canRedo } = useTaskStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCompleted, setShowCompleted] = useState(false);

  // Collapsible sections state - persisted in localStorage
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const saved = localStorage.getItem('saydone-collapsed-sections');
    return saved ? JSON.parse(saved) : { Work: false, Home: false };
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('saydone-collapsed-sections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (category) => {
    setCollapsedSections(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Editing State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditForm({
      description: task.description,
      dueDate: task.dueDate,
      category: task.category,
      urgency: task.urgency
    });
  };

  const saveEdit = () => {
    if (editingId && editForm.description.trim()) {
      editTask(editingId, editForm);
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Derived state
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Show/hide completed
      if (!showCompleted && task.completed) return false;

      // Search
      if (search && !task.description.toLowerCase().includes(search.toLowerCase())) return false;

      // Filter
      if (filter === 'All') return true;
      if (filter === 'Urgent') return task.urgency === 'High';
      return task.category === filter;
    }) // Sort by created/urgent? Defaulting to "Newest First" (based on array unshift in store logic)
      .sort((a, b) => {
        // High urgency on top?
        if (a.urgency === 'High' && b.urgency !== 'High') return -1;
        if (a.urgency !== 'High' && b.urgency === 'High') return 1;
        return 0; // Keep order otherwise
      });
  }, [tasks, search, filter, showCompleted]);

  // Group tasks by category
  const tasksByCategory = useMemo(() => {
    const grouped = { Work: [], Home: [] };
    filteredTasks.forEach(task => {
      if (grouped[task.category]) {
        grouped[task.category].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  // Count open (incomplete) tasks
  const openTaskCount = useMemo(() => {
    return tasks.filter(t => !t.completed).length;
  }, [tasks]);

  // Helper to get priority letter
  const getPriorityLetter = (urgency) => {
    if (urgency === 'High') return 'H';
    if (urgency === 'Medium') return 'M';
    return 'L';
  };

  // Helper to get priority class
  const getPriorityClass = (urgency) => {
    if (urgency === 'High') return 'priority-high';
    if (urgency === 'Medium') return 'priority-medium';
    return 'priority-low';
  };

  // Convert Date object to YYYY-MM-DD for date input
  const formatDateForInput = (dateStr) => {
    if (!dateStr || dateStr === 'Not specified') return '';
    // Parse DD-MMM format back to Date
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = dateStr.split('-');
    if (parts.length === 2) {
      const day = parseInt(parts[0]);
      const monthIndex = months.indexOf(parts[1]);
      if (monthIndex !== -1) {
        const year = new Date().getFullYear();
        const date = new Date(year, monthIndex, day);
        return date.toISOString().split('T')[0];
      }
    }
    return '';
  };

  // Convert YYYY-MM-DD from date input to DD-MMM
  const parseDateFromInput = (dateStr) => {
    if (!dateStr) return 'Not specified';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    return `${day}-${month}`;
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser doesn't support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const processTranscript = () => {
    if (!transcript.trim()) return;
    const extracted = parseTasks(transcript);
    addTask(extracted);
    setTranscript('');
    setFilter('All'); // Reset view to see new tasks
  };

  return (
    <div className="container" style={{ paddingBottom: '140px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="title" style={{ margin: 0, fontSize: '1.6rem' }}>
          SayDone 🎙️ <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>({openTaskCount})</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{ opacity: canUndo ? 1 : 0.3, border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
            title="Undo"
          >
            ↩️
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{ opacity: canRedo ? 1 : 0.3, border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
            title="Redo"
          >
            ↪️
          </button>
        </div>
      </header>

      <FilterBar
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        activeFilter={filter}
        showCompleted={showCompleted}
        onToggleCompleted={() => setShowCompleted(!showCompleted)}
      />

      <div className="task-list">
        {filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px', opacity: 0.7 }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🍃</div>
            {tasks.length === 0 ? "No tasks yet. Say something!" : "No matches found."}
          </div>
        )}

        {/* Collapsible Sections: Work & Home */}
        {['Work', 'Home'].map(category => {
          const categoryTasks = tasksByCategory[category] || [];
          if (categoryTasks.length === 0) return null;

          return (
            <CollapsibleSection
              key={category}
              title={category}
              count={categoryTasks.length}
              isCollapsed={collapsedSections[category]}
              onToggle={() => toggleSection(category)}
            >
              {categoryTasks.map(task => (
                <div key={task.id} className="card animate-enter" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: editingId === task.id ? '12px' : '10px' }}>
                  {editingId === task.id ? (
                    // EDIT MODE
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <input
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-primary-light)',
                          fontSize: '0.95rem',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <input
                          type="date"
                          value={formatDateForInput(editForm.dueDate)}
                          onChange={e => setEditForm({ ...editForm, dueDate: parseDateFromInput(e.target.value) })}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '0.85rem',
                            flex: 1,
                            minWidth: '120px'
                          }}
                        />
                        <select
                          value={editForm.category}
                          onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '0.85rem',
                            minWidth: '80px'
                          }}
                        >
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                        </select>
                        <select
                          value={editForm.urgency}
                          onChange={e => setEditForm({ ...editForm, urgency: e.target.value })}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '0.85rem',
                            minWidth: '70px'
                          }}
                        >
                          <option value="Low">L - Low</option>
                          <option value="Medium">M - Med</option>
                          <option value="High">H - High</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={saveEdit}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            minHeight: '36px'
                          }}
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#f3f4f6',
                            color: '#666',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            minHeight: '36px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // READ MODE
                    <>
                      <div
                        onClick={() => toggleComplete(task.id)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: `2px solid ${task.completed ? 'var(--color-primary)' : '#ddd'}`,
                          background: task.completed ? 'var(--color-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          marginTop: '2px',
                          flexShrink: 0,
                          transition: 'all 0.2s'
                        }}
                      >
                        {task.completed && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                      </div>

                      <div style={{ flex: 1, opacity: task.completed ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: 'var(--color-text-main)',
                          lineHeight: '1.3'
                        }}>
                          {task.description}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span>📅 {task.dueDate}</span>

                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            backgroundColor: `var(--color-${task.category.toLowerCase()})`,
                            color: `var(--text-${task.category.toLowerCase()})`
                          }}>
                            {task.category}
                          </span>

                          <span className={`priority-badge ${getPriorityClass(task.urgency)}`}>
                            {getPriorityLetter(task.urgency)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          onClick={() => startEditing(task)}
                          style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', opacity: 0.5, padding: '4px', minWidth: '32px', minHeight: '32px' }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => removeTask(task.id)}
                          style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.3, padding: '4px', minWidth: '32px', minHeight: '32px' }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CollapsibleSection>
          );
        })}
      </div>

      {/* Floating Input Area */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        padding: '12px 16px 24px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.05)'
      }}>
        {transcript && (
          <div className="animate-enter" style={{ display: 'flex', gap: '8px' }}>
            <input
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              autoFocus
              placeholder="Edit your thought..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '16px',
                border: '1px solid var(--color-primary-light)',
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 2px 10px rgba(139, 92, 246, 0.1)'
              }}
              onKeyDown={(e) => e.key === 'Enter' && processTranscript()}
            />
            <button
              className="btn"
              onClick={processTranscript}
              style={{ padding: '0 20px' }}
            >
              Add
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center' }}>
          {!transcript && (
            <>
              <button
                className="btn"
                onClick={handleVoiceInput}
                title="Voice Input"
                style={{
                  borderRadius: '24px',
                  height: '50px',
                  padding: '0 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1rem',
                  boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)'
                }}
              >
                {isListening ? (
                  <span className="animate-pulse">🛑 Listening...</span>
                ) : (
                  <><span>🎙️</span> Speak</>
                )}
              </button>

              <button
                onClick={() => setTranscript(' ')}
                title="Type"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
              >
                ⌨️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
