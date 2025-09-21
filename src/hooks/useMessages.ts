import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

export const useMessages = (chatUserId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<{ [userId: string]: boolean }>({});
  const { user } = useAuth();

  const fetchMessages = async () => {
    if (!user || !chatUserId) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: chatProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', chatUserId)
        .maybeSingle();

      if (!currentProfile || !chatProfile) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${chatProfile.id}),and(sender_id.eq.${chatProfile.id},receiver_id.eq.${currentProfile.id})`)
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
        
        // Validate file type
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          throw new Error('File type not supported');
        }

        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentProfile.id,
          receiver_id: chatUserId,
          content,
          type,
          file_url: fileUrl,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

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

      setMessages(prev => [...prev, newMessage]);
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

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    // Mock typing indicator for now
    console.log('Typing indicator:', isTyping);
  };

  useEffect(() => {
    if (user && chatUserId) {
      fetchMessages();

      // Set up real-time subscription for new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${chatUserId}`
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
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, chatUserId]);

  return {
    messages,
    loading,
    typing,
    sendMessage,
    markAsRead,
    sendTypingIndicator,
    refreshMessages: fetchMessages,
  };
};