import React, { useState } from 'react';
import { Trash2, RotateCcw, Edit3, Save, X, StickyNote, Palette } from 'lucide-react';
import { Task } from '../hooks/useTasks';
import ColorPicker from './ColorPicker';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(task.notes);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = () => {
    onUpdate({ text: editText, notes });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(task.text);
    setNotes(task.notes);
    setIsEditing(false);
  };

  const toggleRecurring = () => {
    onUpdate({ isRecurring: !task.isRecurring });
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md ${
      task.completed ? 'opacity-70' : ''
    }`} style={{ borderLeftColor: task.color }}>
      <div className="p-4">
        <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
              task.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {task.completed && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                autoFocus
              />
            ) : (
              <div
                className={`text-lg font-medium transition-all duration-200 ${
                  task.completed ? 'line-through text-gray-500' : ''
                }`}
                style={{ color: task.completed ? undefined : task.color }}
              >
                {task.text}
              </div>
            )}

            {task.isRecurring && (
              <div className="flex items-center gap-1 mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                <RotateCcw size={14} className="text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">Daily Recurring Task</span>
                <span className="text-xs text-blue-500 ml-1">(Resets daily at midnight)</span>
              </div>
            )}

            {task.notes && !isEditing && (
              <div className="mt-2 p-3 bg-yellow-50 rounded-md border-l-3 border-yellow-400">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}

            {isEditing && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this task..."
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                rows={3}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 w-full sm:w-auto justify-end sm:justify-start mt-2 sm:mt-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                  title="Save"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-500 hover:bg-gray-50 rounded transition-colors duration-200"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="p-2 text-gray-500 hover:bg-gray-50 rounded transition-colors duration-200"
                    title="Change color"
                  >
                    <Palette size={16} />
                  </button>
                  
                  {showColorPicker && (
                    <div className="absolute top-full right-0 mt-1 z-10">
                      <ColorPicker
                        selectedColor={task.color}
                        onColorSelect={(color) => {
                          onUpdate({ color });
                          setShowColorPicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                  title="Edit task"
                >
                  <Edit3 size={16} />
                </button>
                
                <button
                  onClick={toggleRecurring}
                  className={`p-2 rounded transition-colors duration-200 ${
                    task.isRecurring 
                      ? 'text-blue-600 bg-blue-100 ring-2 ring-blue-200' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                  title={task.isRecurring ? "Remove daily recurring" : "Make daily recurring"}
                >
                  <RotateCcw size={16} />
                </button>
                
                <button
                  onClick={onDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;