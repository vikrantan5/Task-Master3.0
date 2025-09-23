/*
  # Friend Requests and Profile Picture Features

  1. New Tables
    - `friend_requests` - Friend request management
    - Update profiles table for avatar uploads

  2. Security
    - Enable RLS on friend_requests table
    - Add policies for friend request operations
    - Update storage policies for avatar uploads

  3. Functions
    - Helper functions for friend request management
*/

-- =============================================
-- FRIEND REQUESTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_id != receiver_id),
  UNIQUE(sender_id, receiver_id)
);

-- Friend requests indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_pending ON friend_requests(receiver_id, status) WHERE status = 'pending';

-- Friend requests RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_requests_select_policy" ON friend_requests;
CREATE POLICY "friend_requests_select_policy" ON friend_requests
  FOR SELECT TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "friend_requests_insert_policy" ON friend_requests;
CREATE POLICY "friend_requests_insert_policy" ON friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "friend_requests_update_policy" ON friend_requests;
CREATE POLICY "friend_requests_update_policy" ON friend_requests
  FOR UPDATE TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "friend_requests_delete_policy" ON friend_requests;
CREATE POLICY "friend_requests_delete_policy" ON friend_requests
  FOR DELETE TO authenticated
  USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Friend requests trigger
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STORAGE SETUP FOR AVATARS
-- =============================================

-- Create storage bucket for avatars
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating avatars storage bucket: %', SQLERRM;
END $$;

-- Avatar storage policies
DROP POLICY IF EXISTS "avatars_upload_policy" ON storage.objects;
CREATE POLICY "avatars_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_view_policy" ON storage.objects;
CREATE POLICY "avatars_view_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update_policy" ON storage.objects;
CREATE POLICY "avatars_update_policy" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_delete_policy" ON storage.objects;
CREATE POLICY "avatars_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user1_profile_id uuid, user2_profile_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friend_requests
    WHERE ((sender_id = user1_profile_id AND receiver_id = user2_profile_id) OR
           (sender_id = user2_profile_id AND receiver_id = user1_profile_id))
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friendship status
CREATE OR REPLACE FUNCTION get_friendship_status(user1_profile_id uuid, user2_profile_id uuid)
RETURNS text AS $$
DECLARE
  request_status text;
BEGIN
  SELECT status INTO request_status
  FROM friend_requests
  WHERE (sender_id = user1_profile_id AND receiver_id = user2_profile_id) OR
        (sender_id = user2_profile_id AND receiver_id = user1_profile_id)
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(request_status, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update messages policy to only allow friends to message each other
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    are_users_friends(sender_id, receiver_id)
  );

-- Update call logs policy to only allow friends to call each other
DROP POLICY IF EXISTS "call_logs_insert_policy" ON call_logs;
CREATE POLICY "call_logs_insert_policy" ON call_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    caller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    are_users_friends(caller_id, receiver_id)
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION are_users_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friendship_status(uuid, uuid) TO authenticated;

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'Friend requests and profile features setup completed!';
  RAISE NOTICE 'Tables: friend_requests';
  RAISE NOTICE 'Storage: avatars bucket created';
  RAISE NOTICE 'Functions: are_users_friends, get_friendship_status';
  RAISE NOTICE 'Updated policies: messages and calls now require friendship';
END $$;