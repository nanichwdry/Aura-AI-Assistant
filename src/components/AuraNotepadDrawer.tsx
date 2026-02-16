import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileText, Wand2, CheckCircle, RotateCcw, Plus, Trash2, Edit3 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created: string;
  updated: string;
}

export function AuraNotepadDrawer({ onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { action: 'list' }
        })
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setNotes(data.data);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const saveNote = async () => {
    if (!content.trim()) return;
    
    const noteData = {
      id: currentNote?.id || Date.now().toString(),
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      created: currentNote?.created || new Date().toISOString(),
      updated: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { action: 'save', note: noteData }
        })
      });
      
      if (response.ok) {
        setCurrentNote(noteData);
        loadNotes();
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const expandText = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { 
            action: 'expand',
            text: content
          }
        })
      });
      
      const data = await response.json();
      console.log('Expand response:', data);
      if (data.success) {
        setAiSuggestion(data.data);
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('Expand failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { action: 'test_ai' }
        })
      });
      
      const data = await response.json();
      console.log('AI test response:', data);
      if (data.success) {
        setAiSuggestion(data.data);
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('AI test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const correctGrammar = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      console.log('Sending grammar check request...');
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { 
            action: 'grammar_check',
            text: content
          }
        })
      });
      
      const data = await response.json();
      console.log('Grammar check response:', data);
      if (data.success && data.data && data.data.trim()) {
        setAiSuggestion(data.data);
        setShowSuggestion(true);
      } else {
        console.error('Grammar check failed or empty response:', data);
        setAiSuggestion('No grammar corrections needed or service unavailable.');
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('Grammar check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const rewriteText = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      console.log('Sending rewrite request...');
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { 
            action: 'rewrite',
            text: content
          }
        })
      });
      
      const data = await response.json();
      console.log('Rewrite response:', data);
      if (data.success && data.data && data.data.trim()) {
        setAiSuggestion(data.data);
        setShowSuggestion(true);
      } else {
        console.error('Rewrite failed or empty response:', data);
        setAiSuggestion('Rewrite service unavailable or no changes needed.');
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('Rewrite failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { action: 'delete', id: noteId }
        })
      });
      
      if (currentNote?.id === noteId) {
        setCurrentNote(null);
        setContent('');
        setTitle('');
      }
      loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const summarizeText = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: 'notepad',
          input: { 
            action: 'summarize',
            text: content
          }
        })
      });
      
      const data = await response.json();
      console.log('Summarize response:', data);
      if (data.success && data.data && data.data.trim()) {
        setAiSuggestion(data.data);
        setShowSuggestion(true);
      } else {
        console.error('Summarize failed or empty response:', data);
        setAiSuggestion('Summarize service unavailable.');
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('Summarize failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = () => {
    setContent(aiSuggestion);
    setShowSuggestion(false);
    setAiSuggestion('');
  };

  const newNote = () => {
    setCurrentNote(null);
    setContent('');
    setTitle('');
    setShowSuggestion(false);
  };

  const openNote = (note: Note) => {
    setCurrentNote(note);
    setTitle(note.title);
    setContent(note.content);
    setShowSuggestion(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">AI Notepad</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newNote}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              title="New Note"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={saveNote}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-200"
              title="Save Note"
            >
              <Save className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Notes Sidebar */}
          <div className="w-80 border-r border-slate-800/50 bg-slate-800/20 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Your Notes</h4>
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => openNote(note)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                      currentNote?.id === note.id 
                        ? 'bg-amber-500/20 border border-amber-500/30' 
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-100 text-sm truncate">{note.title}</h5>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(note.updated).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {notes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col">
            {/* Title Input */}
            <div className="p-4 border-b border-slate-800/50">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent text-xl font-semibold text-gray-100 placeholder-gray-500 outline-none"
              />
            </div>

            {/* AI Tools */}
            <div className="flex items-center gap-2 p-4 border-b border-slate-800/50 bg-slate-800/10 flex-wrap">
              <button
                onClick={correctGrammar}
                disabled={isLoading || !content.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Fix Grammar
              </button>
              <button
                onClick={rewriteText}
                disabled={isLoading || !content.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-sm"
              >
                <Wand2 className="w-4 h-4" />
                Rewrite
              </button>
              <button
                onClick={expandText}
                disabled={isLoading || !content.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors disabled:opacity-50 text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Expand Ideas
              </button>
              <button
                onClick={summarizeText}
                disabled={isLoading || !content.trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors disabled:opacity-50 text-sm"
              >
                <FileText className="w-4 h-4" />
                Summarize
              </button>
              <button
                onClick={() => testAI()}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/20 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Test AI
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex">
              {/* Text Editor */}
              <div className="flex-1 p-4">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your note..."
                  className="w-full h-full bg-transparent text-gray-100 placeholder-gray-500 outline-none resize-none font-mono text-sm leading-relaxed"
                />
              </div>

              {/* AI Suggestion Panel */}
              {showSuggestion && (
                <div className="w-96 border-l border-slate-800/50 bg-slate-800/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-100 text-sm">AI Suggestion</h5>
                    <button
                      onClick={() => setShowSuggestion(false)}
                      className="p-1 hover:bg-slate-700/50 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-3 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {aiSuggestion}
                    </pre>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={applySuggestion}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Apply
                    </button>
                    <button
                      onClick={() => setShowSuggestion(false)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}