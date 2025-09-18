import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays, eachDayOfInterval } from 'date-fns';

export interface DailyAnalytics {
  id: string;
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  notesCreated: number;
  productivityScore: number;
}

export interface AnalyticsFilters {
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAnalytics = async (filters: AnalyticsFilters) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(filters.startDate, 'yyyy-MM-dd'))
        .lte('date', format(filters.endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedAnalytics: DailyAnalytics[] = data.map(item => ({
        id: item.id,
        date: item.date,
        totalTasks: item.total_tasks,
        completedTasks: item.completed_tasks,
        completionRate: item.completion_rate,
        notesCreated: item.notes_created,
        productivityScore: item.productivity_score,
      }));

      setAnalytics(formattedAnalytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
      console.error('Error generating daily analytics:', error);
    }
  };

  const getDefaultFilters = (period: 'day' | 'week' | 'month'): AnalyticsFilters => {
    const today = new Date();
    
    switch (period) {
      case 'day':
        return {
          period,
          startDate: subDays(today, 6), // Last 7 days
          endDate: today,
        };
      case 'week':
        return {
          period,
          startDate: startOfWeek(subDays(today, 21)), // Last 3 weeks
          endDate: endOfWeek(today),
        };
      case 'month':
        return {
          period,
          startDate: startOfMonth(subDays(today, 90)), // Last 3 months
          endDate: endOfMonth(today),
        };
      default:
        return {
          period: 'day',
          startDate: subDays(today, 6),
          endDate: today,
        };
    }
  };

  return {
    analytics,
    loading,
    fetchAnalytics,
    generateDailyAnalytics,
    getDefaultFilters,
  };
};