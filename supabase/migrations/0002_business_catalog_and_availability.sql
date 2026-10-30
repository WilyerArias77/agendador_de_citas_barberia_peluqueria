create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null unique,
  theme text not null default 'barbershop' check (theme in ('barbershop', 'beauty')),
  timezone text not null default 'America/Bogota',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.account_role not null default 'professional',
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 5 and 1440),
  price_in_cents integer not null check (price_in_cents >= 0),
  currency text not null default 'COP',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  break_starts_at time,
  break_ends_at time,
  check (ends_at > starts_at),
  check ((break_starts_at is null and break_ends_at is null) or (break_ends_at > break_starts_at and break_starts_at >= starts_at and break_ends_at <= ends_at)),
  unique (organization_id, weekday)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  check (ends_at > starts_at)
);

create index services_organization_id_idx on public.services(organization_id);
create index availability_exceptions_range_idx on public.availability_exceptions(organization_id, starts_at, ends_at);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.services enable row level security;
alter table public.weekly_availability enable row level security;
alter table public.availability_exceptions enable row level security;

create or replace function public.is_organization_member(target_organization uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.organization_members where organization_id = target_organization and profile_id = auth.uid());
$$;

create policy "Members can view their organizations" on public.organizations for select using (public.is_organization_member(id));
create policy "Members can view organization members" on public.organization_members for select using (public.is_organization_member(organization_id));
create policy "Members can manage services" on public.services for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "Members can manage weekly availability" on public.weekly_availability for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "Members can manage availability exceptions" on public.availability_exceptions for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
