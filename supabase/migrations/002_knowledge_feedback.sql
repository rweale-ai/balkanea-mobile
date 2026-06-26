-- Balkanea Knowledge Base & Feedback System
-- Run in Supabase SQL Editor after 001_initial_schema.sql

-- ── Knowledge entries (team-curated + approved feedback) ───────────

create table public.knowledge_entries (
  id uuid default gen_random_uuid() primary key,
  category text not null default 'general',
  -- 'destination' | 'hotel' | 'tip' | 'seasonal' | 'practical' | 'general'
  destination text,                    -- lowercase, e.g. 'ohrid', 'santorini', null = applies everywhere
  title text not null,                 -- short label for admin UI
  content text not null,               -- the actual knowledge text Nea reads
  source text not null default 'team', -- 'team' | 'feedback'
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Publicly readable so Nea can fetch knowledge without auth
alter table public.knowledge_entries enable row level security;

create policy "Knowledge entries are publicly readable"
  on public.knowledge_entries for select
  using (true);

create policy "Only admins can insert knowledge"
  on public.knowledge_entries for insert
  with check (auth.jwt() ->> 'email' like '%@marraglobal.com' or auth.jwt() ->> 'email' like '%@balkanea.mk');

create policy "Only admins can update knowledge"
  on public.knowledge_entries for update
  using (auth.jwt() ->> 'email' like '%@marraglobal.com' or auth.jwt() ->> 'email' like '%@balkanea.mk');

create policy "Only admins can delete knowledge"
  on public.knowledge_entries for delete
  using (auth.jwt() ->> 'email' like '%@marraglobal.com' or auth.jwt() ->> 'email' like '%@balkanea.mk');

-- ── Feedback queue (raw user feedback pending review) ──────────────

create table public.feedback_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  hotel_name text not null,
  destination text not null,
  positives text,
  negatives text,
  highlights text,
  recommended_for text,
  rating integer check (rating between 1 and 5),
  raw_conversation text,               -- full conversation for context
  promoted boolean not null default false,
  promoted_at timestamptz,
  knowledge_entry_id uuid references public.knowledge_entries(id),
  created_at timestamptz default now()
);

alter table public.feedback_queue enable row level security;

create policy "Users can insert feedback"
  on public.feedback_queue for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can view own feedback"
  on public.feedback_queue for select
  using (auth.uid() = user_id
    or auth.jwt() ->> 'email' like '%@marraglobal.com'
    or auth.jwt() ->> 'email' like '%@balkanea.mk');

create policy "Only admins can update feedback"
  on public.feedback_queue for update
  using (auth.jwt() ->> 'email' like '%@marraglobal.com' or auth.jwt() ->> 'email' like '%@balkanea.mk');

-- ── Seed: initial Balkanea knowledge ──────────────────────────────

insert into public.knowledge_entries (category, destination, title, content) values

('general', null, 'Balkanea promise',
'Balkanea always recommends breakfast-included stays unless the customer explicitly prefers room-only. We stand behind every hotel we recommend — if a customer is unhappy, we help them resolve it personally.'),

('practical', null, 'How Macedonian travellers pay',
'Most Macedonian customers prefer to pay by card (Visa/Mastercard). Some older customers prefer bank transfer. Avoid assuming — ask if unsure. MKD is the local currency but EUR is widely accepted for international bookings.'),

('destination', 'ohrid', 'Ohrid insider knowledge',
'Ohrid is Balkanea''s most-booked domestic destination. Lake-facing rooms are worth the premium — always ask for them. The best period is late May–June and September (avoid August crowds). Boat hire from the old port (€20/hour) to reach St Naum monastery by water is far better than the bus — recommend it. The old town bazaar area has the best restaurants; Letna Bavcha Kaneo is the top pick for sunset dinners, arrive before 7pm.'),

('destination', 'santorini', 'Santorini for Macedonian travellers',
'Santorini is our most-requested Greek island. Oia has the famous sunset views — book sunset-facing rooms there, not Fira. July–August is very crowded and expensive; May, June, and September are the sweet spot. Families with young children find Kamari or Perissa beaches easier than Oia''s steps. First-timers should stay in Oia; returnees can explore Pyrgos or Akrotiri.'),

('destination', 'istanbul', 'Istanbul tips',
'Istanbul is a top choice for Macedonian travellers — direct flights from Skopje make it easy. Sultanahmet (Old City) for first-timers; Beyoğlu/Galata for returnees who want a hipper neighbourhood. The Grand Bazaar area hotels tend to be overpriced for what you get — we recommend staying closer to Taksim. Budget tip: the tram system connects everything; taxis will overcharge tourists.'),

('seasonal', null, 'When to book each destination',
'Greece (Santorini, Mykonos): book 4-6 months ahead for July/August. Prefer May, June, September for value. Turkey (Istanbul year-round, Antalya April–October). Croatia (Dubrovnik, Split): June and September ideal — July/August is peak crowds. Montenegro (Kotor, Budva): June–September. Egypt (Hurghada): October–April ideal, avoid summer heat.');
