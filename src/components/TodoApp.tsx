import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, Palette, CheckSquare } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import TaskItem from './TaskItem';
import ColorPicker from './ColorPicker';

const TodoApp: React.FC = () => {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('#3B82F6');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      await addTask({
        text: newTaskText.trim(),
        completed: false,
        color: newTaskColor,
        notes: '',
        isRecurring: false,
      });
      setNewTaskText('');
    }
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
  };

  const handleToggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTask(id, { completed: !task.completed });
    }
  };

  const handleUpdateTask = (id: string, updates: any) => {
    updateTask(id, updates);
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Todo Tasks</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>Total: {totalCount}</span>
            <span>Completed: {completedCount}</span>
            <span>Remaining: {totalCount - completedCount}</span>
            {totalCount > 0 && (
              <div className="ml-0 sm:ml-4 mt-2 sm:mt-0 bg-gray-200 rounded-full h-2 w-32">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            )}
          </div>
          
          {/* Recurring tasks info */}
          {tasks.some(task => task.isRecurring) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center gap-2 text-blue-800">
                <RotateCcw size={16} />
                <span className="font-medium text-sm">
                  Daily recurring tasks reset automatically each day
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Task */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a new task..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              />
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
                  style={{ backgroundColor: newTaskColor + '20', borderColor: newTaskColor }}
                >
                  <Palette size={18} style={{ color: newTaskColor }} />
                </button>
                
                {showColorPicker && (
                  <div className="absolute top-full right-0 mt-2 z-10">
                    <ColorPicker
                      selectedColor={newTaskColor}
                      onColorSelect={(color) => {
                        setNewTaskColor(color);
                        setShowColorPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddTask}
                disabled={!newTaskText.trim()}
                className="px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 font-medium whitespace-nowrap"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Task</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3 px-4 sm:px-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <CheckSquare size={64} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No tasks yet</h3>
              <p className="text-gray-500">Add your first task to get started!</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task.id)}
                onDelete={() => handleDeleteTask(task.id)}
                onUpdate={(updates) => handleUpdateTask(task.id, updates)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoApp;