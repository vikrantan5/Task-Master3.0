/*
  # Analytics and Task History Tables

  1. New Tables
    - `task_completions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `task_id` (uuid, foreign key to tasks)
      - `completed_date` (date)
      - `created_at` (timestamp)
    - `daily_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date, unique per user)
      - `total_tasks` (integer)
      - `completed_tasks` (integer)
      - `completion_rate` (decimal)
      - `notes_created` (integer)
      - `productivity_score` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data

  3. Indexes
    - Add indexes for efficient querying by date and user
*/

-- Task completions tracking table
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_id, completed_date)
);

-- Daily analytics summary table
CREATE TABLE IF NOT EXISTS daily_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  completion_rate decimal(5,2) DEFAULT 0.00,
  notes_created integer DEFAULT 0,
  productivity_score decimal(5,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_completions
CREATE POLICY "Users can view their own task completions"
  ON task_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task completions"
  ON task_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task completions"
  ON task_completions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task completions"
  ON task_completions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for daily_analytics
CREATE POLICY "Users can view their own analytics"
  ON daily_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics"
  ON daily_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON daily_analytics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics"
  ON daily_analytics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS task_completions_user_date_idx ON task_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS task_completions_task_id_idx ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS daily_analytics_user_date_idx ON daily_analytics(user_id, date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_daily_analytics_updated_at'
  ) THEN
    CREATE TRIGGER update_daily_analytics_updated_at
      BEFORE UPDATE ON daily_analytics
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;