import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from './useTasks';

export interface Note {
  id: string;
  title: string;
  content: string;
  reminderDate?: string;
  reminderTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedNotes: Note[] = data.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        reminderDate: note.reminder_date,
        reminderTriggered: note.reminder_triggered,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      setNotes(formattedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyAnalytics = async () => {
    if (!user) return;

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    
    try {
      // Get tasks for today
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, completed, created_at')
        .eq('user_id', user.id)
        .lte('created_at', `${dateStr}T23:59:59.999Z`);

      if (tasksError) throw tasksError;

      // Get task completions for today
      const { data: completions, error: completionsError } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', user.id)
        .eq('completed_date', dateStr);

      if (completionsError) throw completionsError;

      // Get notes created today
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

      // Use upsert with proper conflict resolution
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
      console.error('Error in analytics generation:', error);
    }
  };
  const addNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: noteData.title,
          content: noteData.content,
          reminder_date: noteData.reminderDate,
          reminder_triggered: noteData.reminderTriggered,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content,
        reminderDate: data.reminder_date,
        reminderTriggered: data.reminder_triggered,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setNotes(prev => [newNote, ...prev]);
      
      // Trigger analytics update
      await generateDailyAnalytics();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: updates.title,
          content: updates.content,
          reminder_date: updates.reminderDate,
          reminder_triggered: updates.reminderTriggered,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotes(prev => prev.map(note => 
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
      ));
      
      // Trigger analytics update
      await generateDailyAnalytics();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
      
      // Trigger analytics update
      await generateDailyAnalytics();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const checkReminders = async () => {
    if (!user) return;

    const now = new Date();
    const dueNotes = notes.filter(note => 
      note.reminderDate && 
      !note.reminderTriggered && 
      new Date(note.reminderDate) <= now
    );

    for (const note of dueNotes) {
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('TaskMaster Reminder', {
          body: `${note.title}: ${note.content.substring(0, 100)}...`,
          icon: '/vite.svg'
        });
      }

      // Mark as triggered
      await updateNote(note.id, { reminderTriggered: true });
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotes();

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Check reminders every 30 seconds
      const interval = setInterval(checkReminders, 30000);
      checkReminders(); // Check immediately

      return () => clearInterval(interval);
    }
  }, [user, notes]);

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes: fetchNotes,
  };
};