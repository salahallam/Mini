-- Chatter + Supabase
-- Run this entire file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_members_user on public.chat_members(user_id);
create index if not exists idx_messages_chat_created on public.messages(chat_id, created_at);

-- Create a profile automatically when a Supabase Auth user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Chatter User'),
    nullif(new.phone, ''),
    nullif(new.email, '')
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists chats_select_member on public.chats;
create policy chats_select_member on public.chats
for select to authenticated using (
  exists (select 1 from public.chat_members cm where cm.chat_id = chats.id and cm.user_id = auth.uid())
);

drop policy if exists chats_insert_authenticated on public.chats;
create policy chats_insert_authenticated on public.chats
for insert to authenticated with check (true);

drop policy if exists members_select_member on public.chat_members;
create policy members_select_member on public.chat_members
for select to authenticated using (
  exists (select 1 from public.chat_members mine where mine.chat_id = chat_members.chat_id and mine.user_id = auth.uid())
);

drop policy if exists members_insert_self_or_new_chat on public.chat_members;
create policy members_insert_self_or_new_chat on public.chat_members
for insert to authenticated with check (
  user_id = auth.uid()
  or not exists (select 1 from public.chat_members existing where existing.chat_id = chat_members.chat_id)
);

drop policy if exists messages_select_member on public.messages;
create policy messages_select_member on public.messages
for select to authenticated using (
  exists (select 1 from public.chat_members cm where cm.chat_id = messages.chat_id and cm.user_id = auth.uid())
);

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member on public.messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.chat_members cm where cm.chat_id = messages.chat_id and cm.user_id = auth.uid())
);

-- Realtime for live messages.
alter table public.messages replica identity full;
alter publication supabase_realtime add table public.messages;

-- Helpful RPC: atomically find/reuse a 1-to-1 chat or create one.
create or replace function public.get_or_create_chat(other_user uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  existing_chat uuid;
  new_chat uuid;
begin
  if other_user = auth.uid() then raise exception 'CANNOT_CHAT_SELF'; end if;
  select cm1.chat_id into existing_chat
  from public.chat_members cm1
  join public.chat_members cm2 on cm2.chat_id = cm1.chat_id
  where cm1.user_id = auth.uid() and cm2.user_id = other_user
  group by cm1.chat_id
  having count(*) = 2
  limit 1;
  if existing_chat is not null then return existing_chat; end if;
  insert into public.chats default values returning id into new_chat;
  insert into public.chat_members(chat_id,user_id) values (new_chat, auth.uid()), (new_chat, other_user);
  return new_chat;
end;
$$;

grant execute on function public.get_or_create_chat(uuid) to authenticated;
