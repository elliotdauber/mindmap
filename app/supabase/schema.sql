-- Mind Map schema
-- Run this in the Supabase SQL editor for your project.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('content', 'concept')),
  title text not null default 'Untitled',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  from_node_id uuid not null references public.nodes (id) on delete cascade,
  to_node_id uuid not null references public.nodes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint edges_different_nodes check (from_node_id <> to_node_id),
  constraint edges_unique_pair unique (from_node_id, to_node_id)
);

create index nodes_user_id_idx on public.nodes (user_id);
create index edges_user_id_idx on public.edges (user_id);
create index edges_from_node_id_idx on public.edges (from_node_id);
create index edges_to_node_id_idx on public.edges (to_node_id);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger nodes_set_updated_at
  before update on public.nodes
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.nodes enable row level security;
alter table public.edges enable row level security;

-- Nodes: users can only access their own rows
create policy "nodes_select_own"
  on public.nodes
  for select
  using (auth.uid() = user_id);

create policy "nodes_insert_own"
  on public.nodes
  for insert
  with check (auth.uid() = user_id);

create policy "nodes_update_own"
  on public.nodes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "nodes_delete_own"
  on public.nodes
  for delete
  using (auth.uid() = user_id);

-- Edges: users can only access their own rows,
-- and both endpoints must belong to them
create policy "edges_select_own"
  on public.edges
  for select
  using (auth.uid() = user_id);

create policy "edges_insert_own"
  on public.edges
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.nodes
      where id = from_node_id and user_id = auth.uid()
    )
    and exists (
      select 1
      from public.nodes
      where id = to_node_id and user_id = auth.uid()
    )
  );

create policy "edges_delete_own"
  on public.edges
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Optional: migrate from an existing `content` table
-- ---------------------------------------------------------------------------
-- insert into public.nodes (id, user_id, type, title, body, created_at)
-- select id, user_id, 'content', title, coalesce(body, ''), created_at
-- from public.content;
-- drop table public.content;
