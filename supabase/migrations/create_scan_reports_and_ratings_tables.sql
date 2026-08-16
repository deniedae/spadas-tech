-- Create scan_reports table
CREATE TABLE IF NOT EXISTS scan_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id TEXT,
  item_name TEXT,
  reported_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for scan_reports
ALTER TABLE scan_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own scan reports"
  ON scan_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own scan reports"
  ON scan_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Create scan_ratings table
CREATE TABLE IF NOT EXISTS scan_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id TEXT,
  rating TEXT CHECK (rating IN ('up', 'down')),
  rated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scan_id)
);

-- Enable RLS for scan_ratings
ALTER TABLE scan_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert/update own scan ratings"
  ON scan_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
