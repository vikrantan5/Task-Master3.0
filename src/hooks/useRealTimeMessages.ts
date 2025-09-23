import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string | null;
  type: 'text' | 'image' | 'document';
  fileUrl: string | null;
  isRead: boolean;
  createdAt: Date;
  senderProfile?: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export const useRealTimeMessages = (chatUserId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<{ [userId: string]: boolean }>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = async () => {
    if (!user || !chatUserId) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${chatUserId}),and(sender_id.eq.${chatUserId},receiver_id.eq.${currentProfile.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        type: msg.type as 'text' | 'image' | 'document',
        fileUrl: msg.file_url,
        isRead: msg.is_read,
        createdAt: new Date(msg.created_at),
        senderProfile: {
          username: msg.sender.username,
          displayName: msg.sender.display_name,
          avatarUrl: msg.sender.avatar_url,
        }
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, type: 'text' | 'image' | 'document' = 'text', file?: File) => {
    if (!user || !chatUserId) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return;

      let fileUrl = null;

      // Upload file if provided
      if (file && type !== 'text') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Validate file size (10MB limit)
        if (file.size > 10485760) {
          throw new Error('File size must be less than 10MB');
        }

        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);
        fileUrl = publicUrl;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentProfile.id,
          receiver_id: chatUserId,
          content,
          type,
          file_url: fileUrl,
        });

      if (error) throw error;

      // Stop typing indicator
      sendTypingIndicator(false);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        isTyping,
        chatUserId
      }
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 3000);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.warn('Error updating online status:', error);
    }
  };

  useEffect(() => {
    if (user && chatUserId) {
      fetchMessages();
      updateOnlineStatus(true);

      // Create a unique channel for this chat
      const channelName = `chat:${[user.id, chatUserId].sort().join('-')}`;
      
      channelRef.current = supabase
        .channel(channelName, {
          config: {
            presence: {
              key: user.id,
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            // Fetch the complete message with sender profile
            const { data } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const newMessage: Message = {
                id: data.id,
                senderId: data.sender_id,
                receiverId: data.receiver_id,
                content: data.content,
                type: data.type as 'text' | 'image' | 'document',
                fileUrl: data.file_url,
                isRead: data.is_read,
                createdAt: new Date(data.created_at),
                senderProfile: {
                  username: data.sender.username,
                  displayName: data.sender.display_name,
                  avatarUrl: data.sender.avatar_url,
                }
              };

              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });

              // Auto-mark as read if it's for the current user
              if (data.receiver_id === user.id && !data.is_read) {
                markAsRead(data.id);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, isRead: payload.new.is_read }
                : msg
            ));
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          const { userId, isTyping, chatUserId: targetChatUserId } = payload.payload;
          
          // Only handle typing indicators for this chat
          if (targetChatUserId === user.id || targetChatUserId === chatUserId) {
            setTyping(prev => ({
              ...prev,
              [userId]: isTyping
            }));

            // Clear typing indicator after 5 seconds
            if (isTyping) {
              setTimeout(() => {
                setTyping(prev => ({
                  ...prev,
                  [userId]: false
                }));
              }, 5000);
            }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState();
          if (state) {
            const online = new Set(Object.keys(state));
            setOnlineUsers(online);
          }
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          setOnlineUsers(prev => new Set([...prev, key]));
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track presence
            await channelRef.current?.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        });

      // Cleanup function
      return () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        updateOnlineStatus(false);
      };
    }
  }, [user, chatUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (user) {
        updateOnlineStatus(false);
      }
    };
  }, []);

  return {
    messages,
    loading,
    typing,
    onlineUsers,
    sendMessage,
    markAsRead,
    sendTypingIndicator,
    refreshMessages: fetchMessages,
  };
};