-- Pocket Mini results: an add-only table plus two functions that return totals.
-- Safe to run more than once. Already applied to production by hand on Nov 27, 2026.
--
-- The site can only add rows. Nobody using the public key can read, change or
-- delete them; the two functions at the bottom return totals only.

create table if not exists public.mini_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  issue int not null check (issue between 1 and 100000),     -- the day's number, № 1 on Nov 27, 2026
  puzzle int not null check (puzzle between 1 and 100000),   -- which grid it was, the same as issue until reruns start
  player uuid not null,                                      -- random ID kept in one browser, nothing personal
  event text not null check (event in ('start', 'check', 'solve')),
  ms int check (ms between 0 and 86400000),                  -- time on the clock when the event happened
  checked boolean not null default false,                    -- used "Show mistakes" before solving
  on_day boolean not null default true,                      -- played on the day it came out
  touch boolean not null default false,                      -- phone or tablet
  wrong smallint[] check (cardinality(wrong) <= 25),         -- squares that were wrong at a check
  unique (issue, player, event)
);

alter table public.mini_events enable row level security;

drop policy if exists "The site can add results" on public.mini_events;
create policy "The site can add results" on public.mini_events
  for insert to anon, authenticated with check (true);

-- Shown on the finish screen: how everyone else did on one issue.
create or replace function public.mini_today(p_issue int)
returns table (starts bigint, solves bigint, median_ms int, times int[])
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where event = 'start'),
    count(*) filter (where event = 'solve'),
    (percentile_cont(0.5) within group (order by ms) filter (where event = 'solve'))::int,
    coalesce(array_agg(ms order by ms) filter (where event = 'solve' and not checked), '{}')
  from mini_events
  where issue = p_issue;
$$;

-- Used by scripts/mini-report.mjs: difficulty for every grid.
create or replace function public.mini_report()
returns table (
  puzzle int, starts bigint, solves bigint, checked bigint,
  p25_ms int, median_ms int, p75_ms int, touch_median_ms int, desktop_median_ms int,
  wrong jsonb
)
language sql stable security definer set search_path = public as $$
  with per as (
    select e.puzzle,
      count(*) filter (where event = 'start') as starts,
      count(*) filter (where event = 'solve') as solves,
      count(*) filter (where event = 'solve' and e.checked) as checked,
      (percentile_cont(0.25) within group (order by ms) filter (where event = 'solve'))::int as p25_ms,
      (percentile_cont(0.5) within group (order by ms) filter (where event = 'solve'))::int as median_ms,
      (percentile_cont(0.75) within group (order by ms) filter (where event = 'solve'))::int as p75_ms,
      (percentile_cont(0.5) within group (order by ms) filter (where event = 'solve' and touch))::int as touch_median_ms,
      (percentile_cont(0.5) within group (order by ms) filter (where event = 'solve' and not touch))::int as desktop_median_ms
    from mini_events e
    group by e.puzzle
  ), misses as (
    select e.puzzle, jsonb_object_agg(square, n) as wrong
    from (
      select puzzle, square, count(*) as n
      from mini_events, unnest(wrong) as square
      where event = 'check'
      group by puzzle, square
    ) e
    group by e.puzzle
  )
  select per.*, coalesce(misses.wrong, '{}'::jsonb)
  from per left join misses using (puzzle)
  order by per.puzzle;
$$;

revoke all on function public.mini_today(int) from public;
revoke all on function public.mini_report() from public;
grant execute on function public.mini_today(int) to anon, authenticated;
grant execute on function public.mini_report() to anon, authenticated;
