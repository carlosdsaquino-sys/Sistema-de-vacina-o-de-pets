-- =========================================================
-- ETAPA 11
-- CRIAR CONFIGURAÇÕES AUTOMATICAMENTE PARA NOVAS EMPRESAS
-- =========================================================

create or replace function public.create_default_organization_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (
    organization_id,
    singleton,
    nome_farmacia
  )
  values (
    new.id,
    true,
    new.nome
  )
  on conflict (organization_id, singleton)
  do nothing;

  return new;
end;
$$;

drop trigger if exists trg_create_default_organization_settings
on public.organizations;

create trigger trg_create_default_organization_settings
after insert on public.organizations
for each row
execute function public.create_default_organization_settings();

insert into public.settings (
  organization_id,
  singleton,
  nome_farmacia
)
select
  o.id,
  true,
  o.nome
from public.organizations o
where not exists (
  select 1
  from public.settings s
  where s.organization_id = o.id
    and s.singleton = true
)
on conflict (organization_id, singleton)
do nothing;
