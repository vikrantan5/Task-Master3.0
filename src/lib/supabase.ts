import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create storage bucket for file uploads
export const createStorageBucket = async () => {
  try {
    // Check if bucket exists first
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'chat-files');
    
    if (!bucketExists) {
      const { data, error } = await supabase.storage.createBucket('chat-files', {
        public: true,
        allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (error) {
        console.warn('Storage bucket creation failed (may already exist):', error.message);
      }
    }
  } catch (error) {
    console.warn('Storage bucket setup failed:', error);
  }
};

// Database types
export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          completed: boolean;
          color: string;
          notes: string;
          is_recurring: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          completed?: boolean;
          color?: string;
          notes?: string;
          is_recurring?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          completed?: boolean;
          color?: string;
          notes?: string;
          is_recurring?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          reminder_date: string | null;
          reminder_triggered: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          reminder_date?: string | null;
          reminder_triggered?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          reminder_date?: string | null;
          reminder_triggered?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          completed_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          completed_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          completed_date?: string;
          created_at?: string;
        };
      };
      daily_analytics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          total_tasks: number;
          completed_tasks: number;
          completion_rate: number;
          notes_created: number;
          productivity_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          total_tasks?: number;
          completed_tasks?: number;
          completion_rate?: number;
          notes_created?: number;
          productivity_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          total_tasks?: number;
          completed_tasks?: number;
          completion_rate?: number;
          notes_created?: number;
          productivity_score?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string;
          is_online: boolean;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string;
          is_online?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string;
          is_online?: boolean;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      connections: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          status?: string;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string | null;
          type: string;
          file_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content?: string | null;
          type?: string;
          file_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string | null;
          type?: string;
          file_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      call_logs: {
        Row: {
          id: string;
          caller_id: string;
          receiver_id: string;
          start_time: string;
          end_time: string | null;
          duration: number;
          call_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          caller_id: string;
          receiver_id: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number;
          call_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          caller_id?: string;
          receiver_id?: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number;
          call_type?: string;
          created_at?: string;
        };
      };
    };
  };
}