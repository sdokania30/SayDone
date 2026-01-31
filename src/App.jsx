import { useState, useMemo } from 'react'
import parseTasks from './utils/taskParser'
import { useTaskStore } from './hooks/useTaskStore'
import FilterBar from './components/FilterBar'

function App() {
  const { tasks, addTask, removeTask, toggleComplete, editTask, undo, redo, canUndo, canRedo } = useTaskStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

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
  }, [tasks, search, filter]);

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="title" style={{ margin: 0 }}>SayDone 🎙️</h1>
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
      />

      <div className="task-list">
        {filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px', opacity: 0.7 }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🍃</div>
            {tasks.length === 0 ? "No tasks yet. Say something!" : "No matches found."}
          </div>
        )}

        {filteredTasks.map(task => (
          <div key={task.id} className="card animate-enter" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: editingId === task.id ? '16px' : '12px' }}>
            {editingId === task.id ? (
              // EDIT MODE
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <input
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-primary-light)',
                    fontSize: '1rem',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    value={editForm.dueDate}
                    onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                    placeholder="Due Date"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem',
                      flex: 1
                    }}
                  />
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
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
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={saveEdit}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
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
                      fontSize: '0.9rem'
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
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${task.completed ? 'var(--color-primary)' : '#ddd'}`,
                    background: task.completed ? 'var(--color-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginTop: '0px',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  {task.completed && <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>}
                </div>

                <div style={{ flex: 1, opacity: task.completed ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    color: 'var(--color-text-main)'
                  }}>
                    {task.description}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span>📅 {task.dueDate}</span>

                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      backgroundColor: `var(--color-${task.category.toLowerCase()})`,
                      color: `var(--text-${task.category.toLowerCase()})`
                    }}>
                      {task.category}
                    </span>
                    {task.urgency === 'High' && <span title="Urgent">🔥</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => startEditing(task)}
                    style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.5, padding: '4px' }}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => removeTask(task.id)}
                    style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.3, padding: '4px' }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Floating Input Area */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        padding: '16px 20px 30px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
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
                  height: '56px',
                  padding: '0 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '1.1rem',
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
