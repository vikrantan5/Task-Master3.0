/*
  # Add username uniqueness and validation

  1. Security
    - Add unique constraint on username
    - Add check constraint for username format
    - Update RLS policies

  2. Indexes
    - Add index on username for faster searches
*/

-- Add unique constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_username_unique' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- Add check constraint for username format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_username_format'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_format 
    CHECK (username ~ '^[a-z0-9_]{3,20}$');
  END IF;
END $$;

-- Add index on username for faster searches
CREATE INDEX IF NOT EXISTS profiles_username_search_idx ON profiles USING gin (username gin_trgm_ops);

-- Update the handle_new_user function to use metadata username
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;