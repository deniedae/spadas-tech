-- Create user_marketplace_tokens table.
-- Stores per-user OAuth tokens for connected marketplaces (eBay, etc.)
-- The eBay OAuth callback upserts into this table after a successful auth flow.

CREATE TABLE IF NOT EXISTS public.user_marketplace_tokens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL,
  access_token          TEXT NOT NULL,
  refresh_token         TEXT,
  expires_at            TIMESTAMPTZ,
  refresh_expires_at    TIMESTAMPTZ,
  is_connected          BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Row Level Security: users can only access their own tokens
ALTER TABLE public.user_marketplace_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own marketplace tokens"
  ON public.user_marketplace_tokens
  FOR ALL
  USING (auth.uid() = user_id);
