import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from './useProfile';

export interface Connection {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  profile?: Profile;
}

export const useConnections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchConnections = async () => {
    if (!user) return;

    try {
      // Get current user's profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!currentProfile) return;

      // Fetch accepted connections with profile data
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          user1:profiles!connections_user1_id_fkey(*),
          user2:profiles!connections_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${currentProfile.id},user2_id.eq.${currentProfile.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const formattedConnections: Connection[] = data.map(conn => {
        const otherProfile = conn.user1_id === currentProfile.id ? conn.user2 : conn.user1;
        return {
          id: conn.id,
          user1Id: conn.user1_id,
          user2Id: conn.user2_id,
          status: conn.status as 'pending' | 'accepted' | 'blocked',
          createdAt: new Date(conn.created_at),
          profile: {
            id: otherProfile.id,
            userId: otherProfile.user_id,
            username: otherProfile.username,
            displayName: otherProfile.display_name,
            avatarUrl: otherProfile.avatar_url,
            bio: otherProfile.bio,
            isOnline: otherProfile.is_online,
            lastSeen: new Date(otherProfile.last_seen),
            createdAt: new Date(otherProfile.created_at),
            updatedAt: new Date(otherProfile.updated_at),
          }
        };
      });

      setConnections(formattedConnections);

      // Fetch pending requests (where current user is the receiver)
      const { data: pendingData, error: pendingError } = await supabase
        .from('connections')
        .select(`
          *,
          user1:profiles!connections_user1_id_fkey(*)
        `)
        .eq('user2_id', currentProfile.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const formattedPending: Connection[] = pendingData.map(conn => ({
        id: conn.id,
        user1Id: conn.user1_id,
        user2Id: conn.user2_id,
        status: conn.status as 'pending' | 'accepted' | 'blocked',
        createdAt: new Date(conn.created_at),
        profile: {
          id: conn.user1.id,
          userId: conn.user1.user_id,
          username: conn.user1.username,
          displayName: conn.user1.display_name,
          avatarUrl: conn.user1.avatar_url,
          bio: conn.user1.bio,
          isOnline: conn.user1.is_online,
          lastSeen: new Date(conn.user1.last_seen),
          createdAt: new Date(conn.user1.created_at),
          updatedAt: new Date(conn.user1.updated_at),
        }
      }));

      setPendingRequests(formattedPending);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendConnectionRequest = async (targetProfileId: string) => {
    if (!user) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(user1_id.eq.${currentProfile.id},user2_id.eq.${targetProfileId}),and(user1_id.eq.${targetProfileId},user2_id.eq.${currentProfile.id})`)
        .maybeSingle();

      if (existingConnection) {
        throw new Error('Connection already exists');
      }

      const { error } = await supabase
        .from('connections')
        .insert({
          user1_id: currentProfile.id,
          user2_id: targetProfileId,
          status: 'pending'
        });

      if (error) throw error;
      
      // Refresh connections after sending request
      await fetchConnections();
    } catch (error) {
      console.error('Error sending connection request:', error);
      throw error;
    }
  };

  const acceptConnectionRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
    } catch (error) {
      console.error('Error accepting connection request:', error);
      throw error;
    }
  };

  const rejectConnectionRequest = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      throw error;
    }
  };

  const checkConnectionStatus = async (targetProfileId: string): Promise<'none' | 'pending' | 'accepted' | 'blocked'> => {
    if (!user) return 'none';

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return 'none';

      const { data, error } = await supabase
        .from('connections')
        .select('status')
        .or(`and(user1_id.eq.${currentProfile.id},user2_id.eq.${targetProfileId}),and(user1_id.eq.${targetProfileId},user2_id.eq.${currentProfile.id})`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      return data?.status as 'pending' | 'accepted' | 'blocked' || 'none';
    } catch (error) {
      console.error('Error checking connection status:', error);
      return 'none';
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();

      // Set up real-time subscription for connection updates
      const channel = supabase
        .channel('connections')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections'
          },
          () => {
            fetchConnections();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    connections,
    pendingRequests,
    loading,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    checkConnectionStatus,
    refreshConnections: fetchConnections,
  };
};