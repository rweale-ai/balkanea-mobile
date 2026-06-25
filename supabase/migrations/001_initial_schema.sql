-- Balkanea Mobile App — Initial Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- ── Profiles (extends auth.users) ──────────────────────────────────

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  language text default 'mk',
  currency text default 'EUR',
  country text default 'mk',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Bookings ───────────────────────────────────────────────────────

create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  hotel_id text not null,
  hotel_name text not null,
  hotel_stars int,
  hotel_image text,
  hotel_address text,
  room_name text,
  room_beds text,
  room_meal_plan text,
  checkin date not null,
  checkout date not null,
  adults int default 2,
  children int default 0,
  rooms int default 1,
  total_price numeric(10,2) not null,
  currency text default 'EUR',
  status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'pending')),
  confirmation_code text not null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  salesforce_synced boolean default false,
  created_at timestamptz default now()
);

alter table public.bookings enable row level security;

create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

create policy "Users can insert own bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bookings"
  on public.bookings for update
  using (auth.uid() = user_id);

-- ── Conversations ──────────────────────────────────────────────────

create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text default 'text' check (type in ('text', 'voice')),
  summary text,
  messages jsonb default '[]'::jsonb,
  escalated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

-- ── Escalations ────────────────────────────────────────────────────

create table public.escalations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id),
  reason text not null,
  customer_name text,
  customer_phone text,
  customer_email text,
  status text default 'pending' check (status in ('pending', 'contacted', 'resolved')),
  agent_notes text,
  created_at timestamptz default now()
);

alter table public.escalations enable row level security;

create policy "Users can view own escalations"
  on public.escalations for select
  using (auth.uid() = user_id);

create policy "Users can insert own escalations"
  on public.escalations for insert
  with check (auth.uid() = user_id);
