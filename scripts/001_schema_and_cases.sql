-- Mi Campo: schema + demo cases. Idempotent; safe to re-run.
-- NDVI, hectares, contracts and aliases are illustrative (see AGENTS.md §5).

create table if not exists public.cases (
  id text primary key,
  name text not null,
  description text not null default '',
  profile jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.cases enable row level security;
drop policy if exists "cases_public_read" on public.cases;
create policy "cases_public_read" on public.cases for select using (true);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  kind text not null check (kind in ('financing', 'insurance')),
  destination text not null,
  consent boolean not null check (consent = true),
  summary jsonb not null,
  created_at timestamptz not null default now()
);

-- No public policies: only the server (service role) reads and writes referrals.
alter table public.referrals enable row level security;

insert into public.cases (id, name, description, profile) values
(
  'scratch',
  'Desde cero',
  'Legajo vacío para cargar un campo conversando.',
  '{"alias":"Productor nuevo","location":"","lat":null,"lon":null,"crop":"","hectares":0,"stage":"","referenceYieldTHa":0,"recentHail":false,"eventNote":null,"zones":[],"contracts":[]}'
),
(
  'green',
  'Pergamino',
  'Productor A: 120 ha de trigo sano, 200 t vendidas.',
  '{"alias":"Productor A","location":"Pergamino, Buenos Aires","lat":-33.889,"lon":-60.573,"crop":"trigo","hectares":120,"stage":"espigazón","referenceYieldTHa":3.2,"recentHail":false,"eventNote":null,
    "zones":[
      {"id":"loma","name":"Loma","hectares":70,"ndviCurrent":0.76,"ndviBaseline":0.74},
      {"id":"media","name":"Media loma","hectares":50,"ndviCurrent":0.71,"ndviBaseline":0.72}
    ],
    "contracts":[{"tons":200,"priceUsdT":205,"delivery":"2026-12"}]}'
),
(
  'yellow',
  'Marcos Juárez',
  'Productor B: bajo anegado, cobertura cercana al 73%.',
  '{"alias":"Productor B","location":"Marcos Juárez, Córdoba","lat":-32.697,"lon":-62.105,"crop":"trigo","hectares":180,"stage":"espigazón","referenceYieldTHa":3.2,"recentHail":false,"eventNote":"Bajo anegado tras las lluvias de octubre",
    "zones":[
      {"id":"loma","name":"Loma","hectares":120,"ndviCurrent":0.72,"ndviBaseline":0.74},
      {"id":"bajo","name":"Bajo anegado","hectares":60,"ndviCurrent":0.48,"ndviBaseline":0.70}
    ],
    "contracts":[{"tons":370,"priceUsdT":200,"delivery":"2026-12"}]}'
),
(
  'red',
  'Ataliva',
  'Productor C: granizo del 22/10, cobertura del 88%, contratos 13% abajo del mercado.',
  '{"alias":"Productor C","location":"Ataliva, Santa Fe","lat":-30.998,"lon":-61.432,"crop":"trigo","hectares":150,"stage":"llenado de grano","referenceYieldTHa":3.2,"recentHail":true,"eventNote":"Granizo el 22/10/2026",
    "zones":[
      {"id":"norte","name":"Norte","hectares":60,"ndviCurrent":0.70,"ndviBaseline":0.74},
      {"id":"centro","name":"Centro (granizo)","hectares":50,"ndviCurrent":0.50,"ndviBaseline":0.72},
      {"id":"sur","name":"Sur","hectares":40,"ndviCurrent":0.62,"ndviBaseline":0.72}
    ],
    "contracts":[{"tons":360,"priceUsdT":190,"delivery":"2026-12"}]}'
)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, profile = excluded.profile;
