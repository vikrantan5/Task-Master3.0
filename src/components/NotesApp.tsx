import React, { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, Clock } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { NoteItem } from './NoteItem';

const NotesApp: React.FC = () => {
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes();
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    reminderDate: '',
    reminderTime: ''
  });

  const handleCreateNote = async () => {
    if (newNote.title.trim() && newNote.content.trim()) {
      let reminderDate = undefined;
      if (newNote.reminderDate && newNote.reminderTime) {
        reminderDate = new Date(`${newNote.reminderDate}T${newNote.reminderTime}`).toISOString();
      }

      await addNote({
        title: newNote.title.trim(),
        content: newNote.content.trim(),
        reminderDate,
        reminderTriggered: false,
      });

      setNewNote({ title: '', content: '', reminderDate: '', reminderTime: '' });
      setIsCreating(false);
    }
  };

  const handleUpdateNote = (id: string, updates: any) => {
    updateNote(id, updates);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
  };

  const upcomingReminders = notes
    .filter(note => note.reminderDate && !note.reminderTriggered && new Date(note.reminderDate) > new Date())
    .sort((a, b) => new Date(a.reminderDate!).getTime() - new Date(b.reminderDate!).getTime())
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Notes & Reminders</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>Total Notes: {notes.length}</span>
            <span>Active Reminders: {upcomingReminders.length}</span>
          </div>
          
          {upcomingReminders.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h4 className="font-medium text-blue-800 mb-2">Upcoming Reminders:</h4>
              <div className="space-y-1">
                {upcomingReminders.map(note => (
                  <div key={note.id} className="flex flex-wrap items-center gap-2 text-sm text-blue-700">
                    <Calendar size={14} />
                    <span className="font-medium">{note.title}</span>
                    <span>-</span>
                    <span className="text-xs sm:text-sm">{note.reminderDate && new Date(note.reminderDate).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Note Button */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create New Note</span>
              <span className="sm:hidden">New Note</span>
            </button>
          ) : (
            <div className="space-y-4 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Note title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
              
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Write your note here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                rows={4}
              />
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Set Reminder (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={newNote.reminderDate}
                      onChange={(e) => setNewNote({ ...newNote, reminderDate: e.target.value })}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <input
                      type="time"
                      value={newNote.reminderTime}
                      onChange={(e) => setNewNote({ ...newNote, reminderTime: e.target.value })}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCreateNote}
                    disabled={!newNote.title.trim() || !newNote.content.trim()}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewNote({ title: '', content: '', reminderDate: '', reminderTime: '' });
                    }}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4 px-4 sm:px-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FileText size={64} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No notes yet</h3>
              <p className="text-gray-500">Create your first note to get started!</p>
            </div>
          ) : (
            notes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                onUpdate={(updates) => handleUpdateNote(note.id, updates)}
                onDelete={() => handleDeleteNote(note.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesApp;