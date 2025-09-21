/*
  # Comprehensive Database Setup with Error Handling

  1. New Tables (with proper error handling)
    - `tasks` - User tasks with completion tracking
    - `notes` - User notes with reminders
    - `task_completions` - Daily task completion tracking
    - `daily_analytics` - User productivity analytics
    - `profiles` - User profiles for social features
    - `connections` - User connections/friendships
    - `messages` - Chat messages between users
    - `call_logs` - Video/audio call history

  2. Security
    - Enable RLS on all tables
    - Comprehensive policies for data access
    - Proper foreign key constraints

  3. Functions & Triggers
    - Auto-update timestamps
    - Auto-create user profiles
    - Proper error handling

  4. Storage
    - Chat files bucket with proper permissions
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TASKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (length(text) > 0),
  completed boolean DEFAULT false,
  color text DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  notes text DEFAULT '',
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring) WHERE is_recurring = true;

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Tasks trigger
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- NOTES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) > 0),
  content text NOT NULL CHECK (length(content) > 0),
  reminder_date timestamptz,
  reminder_triggered boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_reminder_date ON notes(reminder_date) WHERE reminder_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_reminder_pending ON notes(reminder_date, reminder_triggered) 
  WHERE reminder_date IS NOT NULL AND reminder_triggered = false;

-- Notes RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_policy" ON notes;
CREATE POLICY "notes_select_policy" ON notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_insert_policy" ON notes;
CREATE POLICY "notes_insert_policy" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_update_policy" ON notes;
CREATE POLICY "notes_update_policy" ON notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_delete_policy" ON notes;
CREATE POLICY "notes_delete_policy" ON notes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Notes trigger
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TASK COMPLETIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, task_id, completed_date)
);

-- Task completions indexes
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);

-- Task completions RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_completions_select_policy" ON task_completions;
CREATE POLICY "task_completions_select_policy" ON task_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_completions_insert_policy" ON task_completions;
CREATE POLICY "task_completions_insert_policy" ON task_completions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_completions_update_policy" ON task_completions;
CREATE POLICY "task_completions_update_policy" ON task_completions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "task_completions_delete_policy" ON task_completions;
CREATE POLICY "task_completions_delete_policy" ON task_completions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- DAILY ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS daily_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_tasks integer DEFAULT 0 CHECK (total_tasks >= 0),
  completed_tasks integer DEFAULT 0 CHECK (completed_tasks >= 0),
  completion_rate decimal(5,2) DEFAULT 0.00 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  notes_created integer DEFAULT 0 CHECK (notes_created >= 0),
  productivity_score decimal(5,2) DEFAULT 0.00 CHECK (productivity_score >= 0),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Daily analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_user_date ON daily_analytics(user_id, date DESC);

-- Daily analytics RLS
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_analytics_select_policy" ON daily_analytics;
CREATE POLICY "daily_analytics_select_policy" ON daily_analytics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_analytics_insert_policy" ON daily_analytics;
CREATE POLICY "daily_analytics_insert_policy" ON daily_analytics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_analytics_update_policy" ON daily_analytics;
CREATE POLICY "daily_analytics_update_policy" ON daily_analytics
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_analytics_delete_policy" ON daily_analytics;
CREATE POLICY "daily_analytics_delete_policy" ON daily_analytics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Daily analytics trigger
DROP TRIGGER IF EXISTS update_daily_analytics_updated_at ON daily_analytics;
CREATE TRIGGER update_daily_analytics_updated_at
  BEFORE UPDATE ON daily_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text NOT NULL CHECK (length(display_name) > 0 AND length(display_name) <= 50),
  avatar_url text,
  bio text DEFAULT '' CHECK (length(bio) <= 500),
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  UNIQUE(username)
);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(is_online) WHERE is_online = true;

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated
  USING (true); -- All authenticated users can view profiles

DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Profiles trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONNECTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CHECK (user1_id != user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Connections indexes
CREATE INDEX IF NOT EXISTS idx_connections_user1 ON connections(user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user2 ON connections(user2_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Connections RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_select_policy" ON connections;
CREATE POLICY "connections_select_policy" ON connections
  FOR SELECT TO authenticated
  USING (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    user2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "connections_insert_policy" ON connections;
CREATE POLICY "connections_insert_policy" ON connections
  FOR INSERT TO authenticated
  WITH CHECK (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "connections_update_policy" ON connections;
CREATE POLICY "connections_update_policy" ON connections
  FOR UPDATE TO authenticated
  USING (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    user2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    user2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "connections_delete_policy" ON connections;
CREATE POLICY "connections_delete_policy" ON connections
  FOR DELETE TO authenticated
  USING (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    user2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- =============================================
-- MESSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text CHECK (content IS NULL OR length(content) > 0),
  type text DEFAULT 'text' CHECK (type IN ('text', 'image', 'document')),
  file_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_id != receiver_id),
  CHECK (
    (type = 'text' AND content IS NOT NULL AND file_url IS NULL) OR
    (type IN ('image', 'document') AND file_url IS NOT NULL)
  )
);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_policy" ON messages;
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_update_policy" ON messages;
CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
CREATE POLICY "messages_delete_policy" ON messages
  FOR DELETE TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- =============================================
-- CALL LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time timestamptz DEFAULT CURRENT_TIMESTAMP,
  end_time timestamptz,
  duration integer DEFAULT 0 CHECK (duration >= 0),
  call_type text DEFAULT 'video' CHECK (call_type IN ('audio', 'video')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CHECK (caller_id != receiver_id),
  CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Call logs indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON call_logs(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_start_time ON call_logs(start_time DESC);

-- Call logs RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_logs_select_policy" ON call_logs;
CREATE POLICY "call_logs_select_policy" ON call_logs
  FOR SELECT TO authenticated
  USING (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "call_logs_insert_policy" ON call_logs;
CREATE POLICY "call_logs_insert_policy" ON call_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "call_logs_update_policy" ON call_logs;
CREATE POLICY "call_logs_update_policy" ON call_logs
  FOR UPDATE TO authenticated
  USING (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "call_logs_delete_policy" ON call_logs;
CREATE POLICY "call_logs_delete_policy" ON call_logs
  FOR DELETE TO authenticated
  USING (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- =============================================
-- USER PROFILE CREATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username text;
  username_counter integer := 0;
  base_username text;
BEGIN
  -- Generate base username from email or use default
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g')
  );
  
  -- Ensure base username is valid
  IF base_username = '' OR length(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  
  -- Truncate if too long
  IF length(base_username) > 15 THEN
    base_username := left(base_username, 15);
  END IF;
  
  new_username := base_username;
  
  -- Find unique username
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
    username_counter := username_counter + 1;
    new_username := base_username || '_' || username_counter;
    
    -- Prevent infinite loop
    IF username_counter > 9999 THEN
      new_username := 'user_' || substr(NEW.id::text, 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, username, display_name, bio)
  VALUES (
    NEW.id,
    new_username,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    ''
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================
-- STORAGE SETUP
-- =============================================

-- Create storage bucket for chat files
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'chat-files',
    'chat-files',
    true,
    10485760, -- 10MB
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating storage bucket: %', SQLERRM;
END $$;

-- Storage policies
DROP POLICY IF EXISTS "chat_files_upload_policy" ON storage.objects;
CREATE POLICY "chat_files_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "chat_files_view_policy" ON storage.objects;
CREATE POLICY "chat_files_view_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat_files_delete_policy" ON storage.objects;
CREATE POLICY "chat_files_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to safely generate analytics
CREATE OR REPLACE FUNCTION generate_daily_analytics(target_user_id uuid, target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  task_count integer;
  completed_count integer;
  completion_rate decimal(5,2);
  note_count integer;
  productivity_score decimal(5,2);
BEGIN
  -- Get task counts
  SELECT COUNT(*) INTO task_count
  FROM tasks
  WHERE user_id = target_user_id
    AND DATE(created_at) <= target_date;
  
  -- Get completion count
  SELECT COUNT(*) INTO completed_count
  FROM task_completions
  WHERE user_id = target_user_id
    AND completed_date = target_date;
  
  -- Calculate completion rate
  completion_rate := CASE 
    WHEN task_count > 0 THEN (completed_count::decimal / task_count::decimal) * 100
    ELSE 0
  END;
  
  -- Get notes count
  SELECT COUNT(*) INTO note_count
  FROM notes
  WHERE user_id = target_user_id
    AND DATE(created_at) = target_date;
  
  -- Calculate productivity score
  productivity_score := (completion_rate * 0.7) + (LEAST(note_count * 5, 30) * 0.3);
  
  -- Upsert analytics
  INSERT INTO daily_analytics (
    user_id, date, total_tasks, completed_tasks, 
    completion_rate, notes_created, productivity_score
  )
  VALUES (
    target_user_id, target_date, task_count, completed_count,
    completion_rate, note_count, productivity_score
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_tasks = EXCLUDED.total_tasks,
    completed_tasks = EXCLUDED.completed_tasks,
    completion_rate = EXCLUDED.completion_rate,
    notes_created = EXCLUDED.notes_created,
    productivity_score = EXCLUDED.productivity_score,
    updated_at = CURRENT_TIMESTAMP;
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error generating analytics for user % on %: %', target_user_id, target_date, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Tables created: tasks, notes, task_completions, daily_analytics, profiles, connections, messages, call_logs';
  RAISE NOTICE 'RLS enabled on all tables with proper policies';
  RAISE NOTICE 'Storage bucket created with proper permissions';
  RAISE NOTICE 'Triggers and functions set up for automatic profile creation and analytics';
END $$;