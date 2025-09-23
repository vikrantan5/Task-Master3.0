@@ .. @@
 -- Function to safely generate analytics
-CREATE OR REPLACE FUNCTION generate_daily_analytics(target_user_id uuid, target_date date DEFAULT CURRENT_DATE)
+CREATE OR REPLACE FUNCTION generate_daily_analytics(target_date date, target_user_id uuid)
 RETURNS void AS $$