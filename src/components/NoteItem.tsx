import React, { useState } from 'react';
import { Edit3, Trash2, Calendar, Clock, Save, X } from 'lucide-react';
import { Note } from '../hooks/useNotes';

interface NoteItemProps {
  note: Note;
  onUpdate: (updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

export const NoteItem: React.FC<NoteItemProps> = ({ note, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [editReminderDate, setEditReminderDate] = useState(
    note.reminderDate ? new Date(note.reminderDate).toISOString().slice(0, 16) : ''
  );

  const handleSave = () => {
    onUpdate({
      title: editTitle,
      content: editContent,
      reminderDate: editReminderDate ? new Date(editReminderDate).toISOString() : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditReminderDate(
      note.reminderDate ? new Date(note.reminderDate).toISOString().slice(0, 16) : ''
    );
    setIsEditing(false);
  };

  const formatReminderDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isReminderDue = note.reminderDate && new Date(note.reminderDate) <= new Date();

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
        <div className="space-y-4">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-lg font-semibold bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none pb-2 transition-colors"
            placeholder="Note title..."
          />
          
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-32 bg-gray-50 rounded-lg p-3 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
            placeholder="Write your note here..."
          />
          
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              Reminder Date & Time
            </label>
            <input
              type="datetime-local"
              value={editReminderDate}
              onChange={(e) => setEditReminderDate(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200 ${
      isReminderDue ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex-1">{note.title}</h3>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Edit note"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 whitespace-pre-wrap leading-relaxed">{note.content}</p>
      
      {note.reminderDate && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
          isReminderDue
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {isReminderDue ? 'Reminder Due: ' : 'Reminder: '}
          </span>
          <span>{formatReminderDate(note.reminderDate)}</span>
          {isReminderDue && (
            <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-semibold">
              DUE
            </span>
          )}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-400">
        Created: {new Date(note.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};