-- =============================================================================
-- Karnataka RTO Agent & Multi-Showroom Document Management System
-- Supabase PostgreSQL Schema, Row-Level Security (RLS), Realtime & Storage
-- =============================================================================
-- Run this script once in your Supabase Project -> SQL Editor.

-- 1. Showrooms (2-3+ Partner Showrooms per Workspace)
create table if not exists public.rto_showrooms (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  code text not null,
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  manager_name text not null default '',
  rto_jurisdiction text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_uid, id)
);

-- 2. Centralized Common Clients (Shared across ALL Showrooms)
create table if not exists public.rto_clients (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  id text not null,
  created_showroom_id text,
  name text not null,
  mobile text not null,
  alternate_mobile text not null default '',
  address text not null default '',
  aadhaar text,
  pan_number text,
  registration_date text not null,
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_uid, id)
);

-- 3. Centralized Vehicles (Multiple Vehicles per Client, Shared across Showrooms)
create table if not exists public.rto_vehicles (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  id text not null,
  client_id text not null,
  vehicle_number text not null default '',
  chassis_number text not null default '',
  engine_number text not null default '',
  vehicle_class text not null default '',
  model text not null default '',
  manufacturer text not null default '',
  manufacturing_year integer not null default 2026,
  fuel_type text not null default 'Diesel',
  owner_name text not null default '',
  registration_date text not null default '',
  rc_validity text not null default '',
  insurance_expiry text not null default '',
  hypothecation_status text not null default 'None',
  hypothecation_financer text,
  rto_office text not null default '',
  document_status text not null default 'Pending Verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_uid, id),
  constraint fk_vehicle_client
    foreign key (owner_uid, client_id)
    references public.rto_clients (owner_uid, id)
    on delete cascade
);

-- 4. Showroom-Wise RTO Applications (Linked to Client + Vehicle + Showroom)
create table if not exists public.rto_applications (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  id text not null,
  showroom_id text not null,
  client_id text not null,
  vehicle_id text not null,
  client_name text not null,
  vehicle_number text not null default '',
  work_type text not null,
  application_number text not null default '',
  rto_office text not null default '',
  application_date text not null,
  submission_date text not null default '',
  expected_completion_date text not null default '',
  completion_date text,
  required_documents jsonb not null default '[]'::jsonb,
  work_status text not null default 'New',
  work_description text,
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_uid, id),
  constraint fk_app_showroom
    foreign key (owner_uid, showroom_id)
    references public.rto_showrooms (owner_uid, id)
    on delete restrict,
  constraint fk_app_client
    foreign key (owner_uid, client_id)
    references public.rto_clients (owner_uid, id)
    on delete cascade,
  constraint fk_app_vehicle
    foreign key (owner_uid, vehicle_id)
    references public.rto_vehicles (owner_uid, id)
    on delete cascade
);

-- 5. RTO Document Records (Linked to Application/Vehicle/Client/Showroom + Storage)
create table if not exists public.rto_documents (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  id text not null,
  showroom_id text not null,
  application_id text,
  client_id text not null,
  vehicle_id text not null,
  vehicle_number text not null default '',
  client_name text not null default '',
  document_type text not null,
  document_number text not null default '',
  issue_date text not null default '',
  expiry_date text not null default '',
  received_status text not null default 'Received',
  verification_status text not null default 'Pending',
  file_path_or_reference text not null default '',
  file_name text,
  file_size bigint,
  mime_type text,
  storage_path text,
  download_url text,
  uploaded_at text,
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_uid, id)
);

-- 6. Application Status Audit History
create table if not exists public.rto_application_history (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  id text not null,
  application_id text not null,
  showroom_id text not null,
  client_id text not null,
  vehicle_id text not null,
  previous_status text not null default '',
  new_status text not null,
  action_summary text not null default '',
  note text not null default '',
  actor_email text not null default '',
  changed_at text not null,
  primary key (owner_uid, id)
);

-- 7. Soft Archive / Recycle Bin
create table if not exists public.rto_archive (
  owner_uid uuid not null references auth.users(id) on delete cascade,
  archive_id text not null,
  showroom_id text not null default 'COMMON',
  entity_type text not null,
  entity_id text not null,
  summary text not null default '',
  deleted_at text not null,
  deleted_by text not null default '',
  data jsonb not null default '{}'::jsonb,
  primary key (owner_uid, archive_id)
);

-- 8. Agency Settings & Document Checklist Rules
create table if not exists public.rto_settings (
  owner_uid uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  tagline text not null default '',
  address text not null default '',
  mobile text not null default '',
  email text not null default '',
  rto_license_number text,
  rto_offices jsonb not null default '[]'::jsonb,
  vehicle_classes jsonb not null default '[]'::jsonb,
  work_types jsonb not null default '[]'::jsonb,
  application_statuses jsonb not null default '[]'::jsonb,
  document_checklist_map jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Helpful Indexes
create index if not exists idx_rto_vehicles_client on public.rto_vehicles (owner_uid, client_id);
create index if not exists idx_rto_apps_showroom on public.rto_applications (owner_uid, showroom_id);
create index if not exists idx_rto_apps_client on public.rto_applications (owner_uid, client_id);
create index if not exists idx_rto_docs_app on public.rto_documents (owner_uid, application_id);
create index if not exists idx_rto_history_app on public.rto_application_history (owner_uid, application_id);

-- =============================================================================
-- Row-Level Security (Strict Owner Isolation)
-- =============================================================================
alter table public.rto_showrooms enable row level security;
alter table public.rto_clients enable row level security;
alter table public.rto_vehicles enable row level security;
alter table public.rto_applications enable row level security;
alter table public.rto_documents enable row level security;
alter table public.rto_application_history enable row level security;
alter table public.rto_archive enable row level security;
alter table public.rto_settings enable row level security;

drop policy if exists "rto_showrooms_owner_all" on public.rto_showrooms;
create policy "rto_showrooms_owner_all" on public.rto_showrooms
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_clients_owner_all" on public.rto_clients;
create policy "rto_clients_owner_all" on public.rto_clients
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_vehicles_owner_all" on public.rto_vehicles;
create policy "rto_vehicles_owner_all" on public.rto_vehicles
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_applications_owner_all" on public.rto_applications;
create policy "rto_applications_owner_all" on public.rto_applications
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_documents_owner_all" on public.rto_documents;
create policy "rto_documents_owner_all" on public.rto_documents
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_history_owner_all" on public.rto_application_history;
create policy "rto_history_owner_all" on public.rto_application_history
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_archive_owner_all" on public.rto_archive;
create policy "rto_archive_owner_all" on public.rto_archive
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

drop policy if exists "rto_settings_owner_all" on public.rto_settings;
create policy "rto_settings_owner_all" on public.rto_settings
  for all using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);

-- =============================================================================
-- Supabase Storage Bucket & Policies (rto-documents, max 10 MB, PDF/JPG/PNG)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rto-documents',
  'rto-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rto_docs_storage_select" on storage.objects;
create policy "rto_docs_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'rto-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "rto_docs_storage_insert" on storage.objects;
create policy "rto_docs_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rto-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "rto_docs_storage_update" on storage.objects;
create policy "rto_docs_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'rto-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'rto-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "rto_docs_storage_delete" on storage.objects;
create policy "rto_docs_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rto-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- =============================================================================
-- Realtime Publication
-- =============================================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'rto_showrooms',
    'rto_clients',
    'rto_vehicles',
    'rto_applications',
    'rto_documents',
    'rto_application_history',
    'rto_archive',
    'rto_settings'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
