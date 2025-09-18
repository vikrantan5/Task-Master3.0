import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from './useConnections';
import { format } from 'date-fns';

export interface FriendAnalytics {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen: Date;
  todayTasks: number;
  todayCompletedTasks: number;
  weekTasks: number;
  weekCompletedTasks: number;
  todayNotes: number;
  weekNotes: number;
  completionRate: number;
  productivityScore: number;
}

export const useFriendAnalytics = () => {
  const [friendAnalytics, setFriendAnalytics] = useState<FriendAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { connections } = useConnections();

  const fetchFriendAnalytics = async () => {
    if (!user || connections.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const friendIds = connections.map(conn => conn.profile?.id).filter(Boolean);

      // Get friend profiles with online status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // Get today's analytics for friends
      const { data: todayAnalytics, error: todayError } = await supabase
        .from('daily_analytics')
        .select('*')
        .in('user_id', profiles?.map(p => p.user_id) || [])
        .eq('date', today);

      if (todayError) throw todayError;

      // Get week's analytics for friends
      const { data: weekAnalytics, error: weekError } = await supabase
        .from('daily_analytics')
        .select('*')
        .in('user_id', profiles?.map(p => p.user_id) || [])
        .gte('date', weekStart);

      if (weekError) throw weekError;

      const analytics: FriendAnalytics[] = profiles?.map(profile => {
        const todayData = todayAnalytics?.find(a => a.user_id === profile.user_id);
        const weekData = weekAnalytics?.filter(a => a.user_id === profile.user_id) || [];

        const weekTasks = weekData.reduce((sum, day) => sum + day.total_tasks, 0);
        const weekCompletedTasks = weekData.reduce((sum, day) => sum + day.completed_tasks, 0);
        const weekNotes = weekData.reduce((sum, day) => sum + day.notes_created, 0);

        return {
          profileId: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          isOnline: profile.is_online,
          lastSeen: new Date(profile.last_seen),
          todayTasks: todayData?.total_tasks || 0,
          todayCompletedTasks: todayData?.completed_tasks || 0,
          weekTasks,
          weekCompletedTasks,
          todayNotes: todayData?.notes_created || 0,
          weekNotes,
          completionRate: todayData?.completion_rate || 0,
          productivityScore: todayData?.productivity_score || 0,
        };
      }) || [];

      setFriendAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching friend analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connections.length > 0) {
      fetchFriendAnalytics();

      // Set up real-time subscription for analytics updates
      const subscription = supabase
        .channel('friend-analytics')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'daily_analytics' 
          }, 
          () => {
            fetchFriendAnalytics();
          }
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          () => {
            fetchFriendAnalytics();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [connections, user]);

  return {
    friendAnalytics,
    loading,
    refreshFriendAnalytics: fetchFriendAnalytics,
  };
};