-- Create forensic_certificates table for public verification links (spadas.ai/cert/[id])
CREATE TABLE IF NOT EXISTS public.forensic_certificates (
    id TEXT PRIMARY KEY, -- e.g. "cert_k8m2x9"
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    product_name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    authenticity_score INTEGER NOT NULL,
    verdict TEXT NOT NULL,
    confidence TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    forensic_breakdown JSONB NOT NULL,
    positive_indicators JSONB NOT NULL,
    red_flags JSONB DEFAULT '[]'::jsonb,
    inconclusive_areas JSONB DEFAULT '[]'::jsonb,
    forensic_summary TEXT,
    hallmark_analysis TEXT,
    cleanup_advisory TEXT,
    market_spread TEXT,
    wear_and_tear_notes TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb
);

-- Index for lookup by id and creation date
CREATE INDEX IF NOT EXISTS forensic_certificates_created_at_idx ON public.forensic_certificates (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.forensic_certificates ENABLE ROW LEVEL SECURITY;

-- Anyone on the public web (eBay buyers, collectors) can view verified certificates
CREATE POLICY "Public can view forensic certificates"
    ON public.forensic_certificates FOR SELECT
    USING (true);

-- Authenticated users or server functions can insert certificates
CREATE POLICY "Users can insert forensic certificates"
    ON public.forensic_certificates FOR INSERT
    WITH CHECK (true);
