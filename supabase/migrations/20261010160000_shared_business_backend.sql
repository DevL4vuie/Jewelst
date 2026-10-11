drop function if exists public.apply_jewelst_changes(jsonb, jsonb);
drop table if exists public.business_state cascade;

create table if not exists public.categories (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.customers (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.sponsors (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.designs (
  id text primary key,
  category_id text references public.categories(id) on delete restrict,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.variants (
  id text primary key,
  design_id text references public.designs(id) on delete restrict,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.purchases (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.purchase_items (
  id text primary key,
  purchase_id text not null references public.purchases(id) on delete cascade,
  variant_id text not null references public.variants(id) on delete restrict,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.purchase_expenses (
  id text primary key,
  purchase_id text not null references public.purchases(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.sales (
  id text primary key,
  variant_id text not null references public.variants(id) on delete restrict,
  customer_id text references public.customers(id) on delete set null,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.orders (
  id text primary key,
  customer_id text references public.customers(id) on delete set null,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  variant_id text not null references public.variants(id) on delete restrict,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.sponsored_items (
  id text primary key,
  sponsor_id text references public.sponsors(id) on delete set null,
  variant_id text not null references public.variants(id) on delete restrict,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.expenses (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.capital_entries (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.stock_adjustments (
  id text primary key,
  variant_id text not null references public.variants(id) on delete restrict,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.activity_log (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.business_settings (
  setting_key text primary key,
  setting_value jsonb not null
);

insert into public.business_settings (setting_key, setting_value)
values
  ('business_name', to_jsonb('Jewel''s Sandals'::text)),
  ('currency', to_jsonb('PHP'::text)),
  ('currency_symbol', to_jsonb('₱'::text)),
  ('slow_mover_days', '30'::jsonb),
  ('default_reorder_level', '5'::jsonb),
  ('timezone', to_jsonb('Asia/Manila'::text))
on conflict (setting_key) do nothing;

create index if not exists designs_category_id_idx on public.designs(category_id);
create index if not exists variants_design_id_idx on public.variants(design_id);
create index if not exists purchase_items_purchase_id_idx on public.purchase_items(purchase_id);
create index if not exists purchase_items_variant_id_idx on public.purchase_items(variant_id);
create index if not exists purchase_expenses_purchase_id_idx on public.purchase_expenses(purchase_id);
create index if not exists sales_variant_id_idx on public.sales(variant_id);
create index if not exists sales_customer_id_idx on public.sales(customer_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_variant_id_idx on public.order_items(variant_id);
create index if not exists sponsored_items_sponsor_id_idx on public.sponsored_items(sponsor_id);
create index if not exists sponsored_items_variant_id_idx on public.sponsored_items(variant_id);
create index if not exists stock_adjustments_variant_id_idx on public.stock_adjustments(variant_id);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'categories', 'customers', 'sponsors', 'designs', 'variants',
    'purchases', 'purchase_items', 'purchase_expenses', 'sales', 'orders',
    'order_items', 'sponsored_items', 'expenses', 'capital_entries',
    'stock_adjustments', 'activity_log', 'business_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('drop policy if exists "Authenticated users can read %1$s" on public.%1$I', v_table);
    execute format(
      'create policy "Authenticated users can read %1$s" on public.%1$I for select to authenticated using (auth.uid() is not null)',
      v_table
    );
    execute format('revoke all on public.%I from anon, public', v_table);
    execute format('grant select on public.%I to authenticated', v_table);
  end loop;
end;
$$;

create or replace function public.apply_jewelst_changes(
  p_changes jsonb,
  p_settings jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection text;
  v_delta jsonb;
  v_record jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) is distinct from 'object' then
    raise exception 'Changes must be a JSON object';
  end if;
  if p_settings is not null and jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'Settings changes must be a JSON object';
  end if;

  for v_collection in
    select unnest(array[
      'categories', 'customers', 'sponsors', 'designs', 'variants',
      'purchases', 'sales', 'orders', 'sponsored_items', 'expenses',
      'capital_entries', 'stock_adjustments', 'activity_log'
    ])
  loop
    if not (p_changes ? v_collection) then
      continue;
    end if;
    v_delta := p_changes -> v_collection;
    if jsonb_typeof(v_delta -> 'upsert') is distinct from 'array'
       or jsonb_typeof(v_delta -> 'delete') is distinct from 'array' then
      raise exception 'Invalid change set for collection %', v_collection;
    end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'categories' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.categories (id, data)
    values (v_record ->> 'id', v_record - 'id')
    on conflict (id) do update set data = excluded.data;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'customers' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.customers (id, data)
    values (v_record ->> 'id', v_record - 'id')
    on conflict (id) do update set data = excluded.data;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'sponsors' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.sponsors (id, data)
    values (v_record ->> 'id', v_record - 'id')
    on conflict (id) do update set data = excluded.data;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'designs' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.designs (id, category_id, data)
    values (v_record ->> 'id', nullif(v_record ->> 'category_id', ''), v_record - 'id' - 'category_id')
    on conflict (id) do update
      set category_id = excluded.category_id, data = excluded.data;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'variants' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.variants (id, design_id, data)
    values (v_record ->> 'id', nullif(v_record ->> 'design_id', ''), v_record - 'id' - 'design_id')
    on conflict (id) do update
      set design_id = excluded.design_id, data = excluded.data;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'purchases' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.purchases (id, data)
    values (v_record ->> 'id', v_record - 'id' - 'items' - 'expenses')
    on conflict (id) do update set data = excluded.data;

    delete from public.purchase_items where purchase_id = v_record ->> 'id';
    delete from public.purchase_expenses where purchase_id = v_record ->> 'id';

    insert into public.purchase_items (id, purchase_id, variant_id, data)
    select item ->> 'id', v_record ->> 'id', item ->> 'variant_id',
      item - 'id' - 'variant_id'
    from jsonb_array_elements(coalesce(v_record -> 'items', '[]'::jsonb)) as item;

    insert into public.purchase_expenses (id, purchase_id, data)
    select item ->> 'id', v_record ->> 'id', item - 'id'
    from jsonb_array_elements(coalesce(v_record -> 'expenses', '[]'::jsonb)) as item;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'sales' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.sales (id, variant_id, customer_id, data)
    values (
      v_record ->> 'id',
      v_record ->> 'variant_id',
      nullif(v_record ->> 'customer_id', ''),
      v_record - 'id' - 'variant_id' - 'customer_id'
    )
    on conflict (id) do update
      set variant_id = excluded.variant_id,
          customer_id = excluded.customer_id,
          data = excluded.data;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'orders' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.orders (id, customer_id, data)
    values (
      v_record ->> 'id',
      nullif(v_record ->> 'customer_id', ''),
      v_record - 'id' - 'customer_id' - 'items'
    )
    on conflict (id) do update
      set customer_id = excluded.customer_id, data = excluded.data;

    delete from public.order_items where order_id = v_record ->> 'id';
    insert into public.order_items (id, order_id, variant_id, data)
    select
      coalesce(item ->> 'id', (v_record ->> 'id') || '-item-' || item_index::text),
      v_record ->> 'id',
      item ->> 'variant_id',
      item - 'id' - 'variant_id'
    from jsonb_array_elements(coalesce(v_record -> 'items', '[]'::jsonb))
      with ordinality as order_item(item, item_index);
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_changes -> 'sponsored_items' -> 'upsert', '[]'::jsonb))
  loop
    insert into public.sponsored_items (id, sponsor_id, variant_id, data)
    values (
      v_record ->> 'id',
      nullif(v_record ->> 'sponsor_id', ''),
      v_record ->> 'variant_id',
      v_record - 'id' - 'sponsor_id' - 'variant_id'
    )
    on conflict (id) do update
      set sponsor_id = excluded.sponsor_id,
          variant_id = excluded.variant_id,
          data = excluded.data;
  end loop;

  for v_collection in select unnest(array['expenses', 'capital_entries', 'stock_adjustments', 'activity_log'])
  loop
    for v_record in select value from jsonb_array_elements(coalesce(p_changes -> v_collection -> 'upsert', '[]'::jsonb))
    loop
      if v_collection = 'stock_adjustments' then
        insert into public.stock_adjustments (id, variant_id, data)
        values (v_record ->> 'id', v_record ->> 'variant_id', v_record - 'id' - 'variant_id')
        on conflict (id) do update
          set variant_id = excluded.variant_id, data = excluded.data;
      else
        execute format(
          'insert into public.%I (id, data) values ($1, $2) on conflict (id) do update set data = excluded.data',
          v_collection
        )
        using v_record ->> 'id', v_record - 'id';
      end if;
    end loop;
  end loop;

  for v_collection in select unnest(array[
    'stock_adjustments', 'sponsored_items', 'sales', 'order_items',
    'orders', 'purchase_items', 'purchase_expenses', 'purchases',
    'variants', 'designs', 'categories', 'customers', 'sponsors',
    'expenses', 'capital_entries', 'activity_log'
  ])
  loop
    if v_collection in ('order_items', 'purchase_items', 'purchase_expenses') then
      continue;
    end if;
    if p_changes ? v_collection then
      for v_record in select value from jsonb_array_elements(p_changes -> v_collection -> 'delete')
      loop
        if v_collection = 'stock_adjustments' then
          delete from public.stock_adjustments where id = v_record #>> '{}';
        else
          execute format('delete from public.%I where id = $1', v_collection)
          using v_record #>> '{}';
        end if;
      end loop;
    end if;
  end loop;

  if p_settings is not null then
    insert into public.business_settings (setting_key, setting_value)
    select key, value
    from jsonb_each(p_settings)
    on conflict (setting_key) do update
      set setting_value = excluded.setting_value;
  end if;
end;
$$;

revoke all on function public.apply_jewelst_changes(jsonb, jsonb) from public, anon;
grant execute on function public.apply_jewelst_changes(jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('design-images', 'design-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read design images" on storage.objects;
create policy "Authenticated users can read design images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'design-images');

drop policy if exists "Authenticated users can upload design images" on storage.objects;
create policy "Authenticated users can upload design images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'design-images');

drop policy if exists "Authenticated users can update design images" on storage.objects;
create policy "Authenticated users can update design images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'design-images')
  with check (bucket_id = 'design-images');

drop policy if exists "Authenticated users can delete design images" on storage.objects;
create policy "Authenticated users can delete design images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'design-images');

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'categories', 'customers', 'sponsors', 'designs', 'variants',
    'purchases', 'purchase_items', 'purchase_expenses', 'sales', 'orders',
    'order_items', 'sponsored_items', 'expenses', 'capital_entries',
    'stock_adjustments', 'activity_log', 'business_settings'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end;
$$;
