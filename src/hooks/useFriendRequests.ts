import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from './useProfile';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  senderProfile?: Profile;
  receiverProfile?: Profile;
}

export const useFriendRequests = () => {
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFriendRequests = async () => {
    if (!user) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      // Fetch sent requests
      const { data: sentData, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .eq('sender_id', currentProfile.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Fetch received requests
      const { data: receivedData, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*)
        `)
        .eq('receiver_id', currentProfile.id)
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Format sent requests
      const formattedSent: FriendRequest[] = sentData.map(req => ({
        id: req.id,
        senderId: req.sender_id,
        receiverId: req.receiver_id,
        status: req.status as 'pending' | 'accepted' | 'rejected',
        createdAt: new Date(req.created_at),
        updatedAt: new Date(req.updated_at),
        receiverProfile: {
          id: req.receiver.id,
          userId: req.receiver.user_id,
          username: req.receiver.username,
          displayName: req.receiver.display_name,
          avatarUrl: req.receiver.avatar_url,
          bio: req.receiver.bio,
          isOnline: req.receiver.is_online,
          lastSeen: new Date(req.receiver.last_seen),
          createdAt: new Date(req.receiver.created_at),
          updatedAt: new Date(req.receiver.updated_at),
        }
      }));

      // Format received requests
      const formattedReceived: FriendRequest[] = receivedData.map(req => ({
        id: req.id,
        senderId: req.sender_id,
        receiverId: req.receiver_id,
        status: req.status as 'pending' | 'accepted' | 'rejected',
        createdAt: new Date(req.created_at),
        updatedAt: new Date(req.updated_at),
        senderProfile: {
          id: req.sender.id,
          userId: req.sender.user_id,
          username: req.sender.username,
          displayName: req.sender.display_name,
          avatarUrl: req.sender.avatar_url,
          bio: req.sender.bio,
          isOnline: req.sender.is_online,
          lastSeen: new Date(req.sender.last_seen),
          createdAt: new Date(req.sender.created_at),
          updatedAt: new Date(req.sender.updated_at),
        }
      }));

      setSentRequests(formattedSent);
      setReceivedRequests(formattedReceived);

      // Get accepted friends from both sent and received requests
      const acceptedFriends: Profile[] = [];
      
      formattedSent
        .filter(req => req.status === 'accepted' && req.receiverProfile)
        .forEach(req => acceptedFriends.push(req.receiverProfile!));
      
      formattedReceived
        .filter(req => req.status === 'accepted' && req.senderProfile)
        .forEach(req => acceptedFriends.push(req.senderProfile!));

      setFriends(acceptedFriends);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverProfileId: string) => {
    if (!user) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${receiverProfileId}),and(sender_id.eq.${receiverProfileId},receiver_id.eq.${currentProfile.id})`)
        .maybeSingle();

      if (existingRequest) {
        throw new Error('Friend request already exists');
      }

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentProfile.id,
          receiver_id: receiverProfileId,
          status: 'pending'
        });

      if (error) throw error;

      await fetchFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  };

  const removeFriend = async (friendProfileId: string) => {
    if (!user) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${friendProfileId}),and(sender_id.eq.${friendProfileId},receiver_id.eq.${currentProfile.id})`)
        .eq('status', 'accepted');

      if (error) throw error;

      await fetchFriendRequests();
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  };

  const getFriendshipStatus = async (profileId: string): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected'> => {
    if (!user) return 'none';

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return 'none';

      const { data, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${currentProfile.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return 'none';

      if (data.status === 'accepted') return 'accepted';
      if (data.status === 'rejected') return 'rejected';
      
      // For pending requests, determine if sent or received
      if (data.sender_id === currentProfile.id) {
        return 'pending_sent';
      } else {
        return 'pending_received';
      }
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return 'none';
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendRequests();

      // Set up real-time subscription for friend requests
      const channel = supabase
        .channel('friend-requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friend_requests'
          },
          () => {
            fetchFriendRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    sentRequests,
    receivedRequests,
    friends,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendshipStatus,
    refreshFriendRequests: fetchFriendRequests,
  };
};