import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Profile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const formattedProfile: Profile = {
          id: data.id,
          userId: data.user_id,
          username: data.username,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          bio: data.bio,
          isOnline: data.is_online,
          lastSeen: new Date(data.last_seen),
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
        setProfile(formattedProfile);
      } else {
        // Profile doesn't exist, create one
        await createProfile();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    try {
      const username = user.user_metadata?.username || 'user_' + Math.random().toString(36).substr(2, 8);
      const displayName = user.email?.split('@')[0] || 'User';

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username,
          display_name: displayName,
          bio: '',
        })
        .select()
        .single();

      if (error) throw error;

      const newProfile: Profile = {
        id: data.id,
        userId: data.user_id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        isOnline: data.is_online,
        lastSeen: new Date(data.last_seen),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setProfile(newProfile);
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: updates.username,
          display_name: updates.displayName,
          avatar_url: updates.avatarUrl,
          bio: updates.bio,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const searchUsers = async (query: string, searchType: 'username' | 'display_name' = 'username'): Promise<Profile[]> => {
    if (!query.trim()) return [];

    try {
      const searchColumn = searchType === 'username' ? 'username' : 'display_name';
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike(searchColumn, `%${query}%`)
        .neq('user_id', user?.id)
        .limit(10);

      if (error) throw error;

      return data.map(profile => ({
        id: profile.id,
        userId: profile.user_id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        isOnline: profile.is_online,
        lastSeen: new Date(profile.last_seen),
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  return {
    profile,
    loading,
    updateProfile,
    updateOnlineStatus,
    searchUsers,
    refreshProfile: fetchProfile,
  };
};