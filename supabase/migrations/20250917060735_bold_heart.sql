/*
  # Add Social Features

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `avatar_url` (text)
      - `bio` (text)
      - `is_online` (boolean)
      - `last_seen` (timestamp)
    - `connections`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references profiles)
      - `user2_id` (uuid, references profiles)
      - `status` (text: pending, accepted, blocked)
      - `created_at` (timestamp)
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `content` (text)
      - `type` (text: text, image, document)
      - `file_url` (text)
      - `is_read` (boolean)
      - `created_at` (timestamp)
    - `call_logs`
      - `id` (uuid, primary key)
      - `caller_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `duration` (integer)
      - `call_type` (text: audio, video)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  bio text DEFAULT '',
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text,
  type text DEFAULT 'text' CHECK (type IN ('text', 'image', 'document')),
  file_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration integer DEFAULT 0,
  call_type text DEFAULT 'video' CHECK (call_type IN ('audio', 'video')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);
CREATE INDEX IF NOT EXISTS connections_user1_idx ON connections(user1_id);
CREATE INDEX IF NOT EXISTS connections_user2_idx ON connections(user2_id);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS call_logs_caller_idx ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS call_logs_receiver_idx ON call_logs(receiver_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Connections policies
CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  TO authenticated
  USING (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    user2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their connections"
  ON connections FOR UPDATE
  TO authenticated
  USING (
    user1_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    user2_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Messages policies
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Call logs policies
CREATE POLICY "Users can view their call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create call logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their call logs"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', new.email)
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();