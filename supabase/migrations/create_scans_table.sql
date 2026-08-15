-- Create scans table for Spadas Lens persistent scan history
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    image_url TEXT,
    result_json JSONB,
    token_count INTEGER DEFAULT 2600,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed')) DEFAULT 'completed'
);

-- Index for fast user history queries ordered by date
CREATE INDEX IF NOT EXISTS scans_user_id_created_at_idx ON public.scans (user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scans"
    ON public.scans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans"
    ON public.scans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
    ON public.scans FOR DELETE
    USING (auth.uid() = user_id);
