/*
  # Fix profiles and storage issues

  1. Add missing trigger function for updated_at
  2. Create profiles automatically when users sign up
  3. Fix storage bucket creation
  4. Add proper error handling
*/

-- Create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || substr(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure storage bucket exists with proper permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760,
  ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for authenticated users
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view all files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);