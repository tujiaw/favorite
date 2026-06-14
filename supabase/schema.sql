create table if not exists public.favorites (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('link', 'text', 'image', 'code', 'json', 'account')),
  title text not null,
  content text not null default '',
  source_url text,
  domain text,
  preview text not null default '',
  tags text[] not null default '{}',
  note text not null default '',
  favorite boolean not null default false,
  storage_path text,
  encrypted_secret jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  use_count integer not null default 0
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites for select
using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites for insert
with check (auth.uid() = user_id);

drop policy if exists "favorites_update_own" on public.favorites;
create policy "favorites_update_own"
on public.favorites for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites for delete
using (auth.uid() = user_id);

create index if not exists favorites_user_updated_idx on public.favorites (user_id, updated_at desc);
create index if not exists favorites_user_type_idx on public.favorites (user_id, type);
create index if not exists favorites_tags_idx on public.favorites using gin (tags);

insert into storage.buckets (id, name, public)
values ('favorite-images', 'favorite-images', true)
on conflict (id) do nothing;

drop policy if exists "favorite_images_read_own" on storage.objects;
create policy "favorite_images_read_own"
on storage.objects for select
using (bucket_id = 'favorite-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "favorite_images_insert_own" on storage.objects;
create policy "favorite_images_insert_own"
on storage.objects for insert
with check (bucket_id = 'favorite-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "favorite_images_update_own" on storage.objects;
create policy "favorite_images_update_own"
on storage.objects for update
using (bucket_id = 'favorite-images' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'favorite-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "favorite_images_delete_own" on storage.objects;
create policy "favorite_images_delete_own"
on storage.objects for delete
using (bucket_id = 'favorite-images' and auth.uid()::text = (storage.foldername(name))[1]);
