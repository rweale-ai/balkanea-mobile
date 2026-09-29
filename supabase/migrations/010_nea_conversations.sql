-- NOT RUN YET (2026-09-29). Kept from the superseded feature/nea-backend-chat
-- branch: server-owned Nea conversations (needed for voice). The Chat
-- backend's lib/nea-store.js uses these tables once enabled. Run against the
-- app-data project cwohhfrupyeznbexjyaq only when voice work starts.

-- 010: Server-owned Nea conversations (shared Nea backend, Chat repo
-- api/nea-chat.js + lib/nea-store.js).
--
-- The backend, not the app, owns each conversation's history, so a text
-- turn and a later voice turn can continue the same conversation. Written
-- by the Chat backend with the service-role key only: RLS is enabled with
-- NO policies, so the anon key (which ships in the app) can't read or
-- write these tables at all.
--
-- Additive only -- no existing table is touched.

create table if not exists public.nea_conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- For per-IP rate limiting of new conversations only.
  client_ip   text,
  -- Latest traveler context the app sent (language, profile, bookings,
  -- knowledge, currency) -- reused by channels with no app code in the
  -- loop (voice).
  context     jsonb not null default '{}'::jsonb
);

create index if not exists nea_conversations_ip_created_idx
  on public.nea_conversations (client_ip, created_at);

create table if not exists public.nea_messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.nea_conversations(id) on delete cascade,
  created_at       timestamptz not null default now(),
  role             text not null check (role in ('user', 'assistant')),
  -- Anthropic Messages API content (string or content-block array),
  -- including search_hotels tool_use/tool_result blocks.
  content          jsonb not null,
  channel          text not null default 'text' check (channel in ('text', 'voice', 'seed'))
);

create index if not exists nea_messages_conversation_idx
  on public.nea_messages (conversation_id, id);

alter table public.nea_conversations enable row level security;
alter table public.nea_messages enable row level security;
-- Intentionally no policies: service role only.
