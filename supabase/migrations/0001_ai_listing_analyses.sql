-- Additive: new table only. The existing listings table is NOT modified.
-- AI analysis results are stored here and linked to a listing once the user
-- saves one, keeping the listings schema untouched.

create table if not exists public.ai_listing_analyses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  image_urls   text[] not null default '{}',
  result       jsonb not null,
  listing_id   uuid references public.listings(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists ai_listing_analyses_user_id_idx
  on public.ai_listing_analyses(user_id, created_at desc);

alter table public.ai_listing_analyses enable row level security;

create policy "Users can read their own AI analyses"
  on public.ai_listing_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI analyses"
  on public.ai_listing_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own AI analyses"
  on public.ai_listing_analyses for update
  using (auth.uid() = user_id);
