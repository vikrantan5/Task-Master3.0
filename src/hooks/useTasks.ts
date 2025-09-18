import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  color: string;
  notes: string;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get today's task completions
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('completed_date', today);

      if (completionsError) throw completionsError;

      const completedTaskIds = new Set(completions?.map(c => c.task_id) || []);

      const formattedTasks: Task[] = data.map(task => ({
        id: task.id,
        text: task.text,
        completed: completedTaskIds.has(task.id),
        color: task.color,
        notes: task.notes,
        isRecurring: task.is_recurring,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at),
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          text: taskData.text,
          completed: taskData.completed,
          color: taskData.color,
          notes: taskData.notes,
          is_recurring: taskData.isRecurring,
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        id: data.id,
        text: data.text,
        completed: data.completed,
        color: data.color,
        notes: data.notes,
        isRecurring: data.is_recurring,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setTasks(prev => [newTask, ...prev]);
      
      // Generate analytics for today
      await generateDailyAnalytics();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;

    try {
      // Handle completion state changes
      if (updates.completed !== undefined) {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        if (updates.completed) {
          // Add completion record
          await supabase
            .from('task_completions')
            .upsert({
              user_id: user.id,
              task_id: id,
              completed_date: today,
            });
        } else {
          // Remove completion record
          await supabase
            .from('task_completions')
            .delete()
            .eq('user_id', user.id)
            .eq('task_id', id)
            .eq('completed_date', today);
        }
      }

      // Update the task itself (but not the completed field for persistence)
      const taskUpdates = { ...updates };
      delete taskUpdates.completed; // Don't update completed in tasks table
      
      if (Object.keys(taskUpdates).length > 0) {
        const { error } = await supabase
          .from('tasks')
          .update({
            text: taskUpdates.text,
            color: taskUpdates.color,
            notes: taskUpdates.notes,
            is_recurring: taskUpdates.isRecurring,
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      setTasks(prev => prev.map(task => 
        task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
      ));
      
      // Generate analytics for today
      await generateDailyAnalytics();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    try {
      // Delete associated completions first
      await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', id);

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== id));
      
      // Generate analytics for today
      await generateDailyAnalytics();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const generateDailyAnalytics = async (date: Date = new Date()) => {
    if (!user) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      // Get tasks for the day
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, completed, created_at')
        .eq('user_id', user.id)
        .lte('created_at', `${dateStr}T23:59:59.999Z`);

      if (tasksError) throw tasksError;

      // Get task completions for the day
      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('completed_date', dateStr);

      if (completionsError) throw completionsError;

      // Get notes created on this day
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', `${dateStr}T00:00:00.000Z`)
        .lte('created_at', `${dateStr}T23:59:59.999Z`);

      if (notesError) throw notesError;

      const totalTasks = tasks?.length || 0;
      const completedTasks = completions?.length || 0;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const notesCreated = notes?.length || 0;
      
      // Calculate productivity score (weighted average)
      const productivityScore = (completionRate * 0.7) + (notesCreated * 5 * 0.3);

      // Use upsert to handle duplicate key constraint
      const { error: upsertError } = await supabase
        .from('daily_analytics')
        .upsert({
          user_id: user.id,
          date: dateStr,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: Math.round(completionRate * 100) / 100,
          notes_created: notesCreated,
          productivity_score: Math.round(productivityScore * 100) / 100,
        }, {
          onConflict: 'user_id,date'
        });

      if (upsertError) throw upsertError;
    } catch (error) {
      console.error('Error generating daily analytics:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
      generateDailyAnalytics();
    }
  }, [user]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks: fetchTasks,
    generateDailyAnalytics,
  };
};