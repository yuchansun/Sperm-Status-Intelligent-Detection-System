-- Reserve the actual serial before saving any patient or examination.
begin;
create table if not exists public.specimen_reservations (
 examination_id uuid primary key,
 sample_id text not null unique,
 reserved_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.specimen_reservations enable row level security;
revoke all on public.specimen_reservations from public,anon,authenticated;
-- Reservations can only be created through the RPC; the server generates the number.
create or replace function public.reserve_specimen_number(p_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare result text; uid uuid:=auth.uid(); serial bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 select sample_id into result from public.specimen_reservations where examination_id=p_id and reserved_by=uid;
 if found then return result; end if;
 if exists(select 1 from public.specimen_reservations where examination_id=p_id) then raise exception 'Reservation unavailable'; end if;
 select sample_id into result from public.examinations where id=p_id and created_by=uid;
 if found then return result; end if;
 if exists(select 1 from public.examinations where id=p_id) then raise exception 'Examination unavailable'; end if;
 serial:=nextval('public.specimen_number_seq');
 result:='SMP-'||lpad(serial::text,greatest(8,length(serial::text)),'0');
 insert into public.specimen_reservations(examination_id,sample_id,reserved_by) values(p_id,result,uid);
 return result;
end $$;
revoke all on function public.reserve_specimen_number(uuid) from public,anon;
grant execute on function public.reserve_specimen_number(uuid) to authenticated;

create or replace function public.ensure_examination(p_id uuid,p_patient_id uuid,p_include_motility boolean,p_template_label text)
returns public.examinations language plpgsql security invoker set search_path=public as $$
declare result public.examinations; sample text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 sample:=public.reserve_specimen_number(p_id);
 select * into result from public.examinations where id=p_id;
 if not found then
  insert into public.examinations(id,examination_code,patient_id,sample_id,include_motility,template_label,created_by)
  values(p_id,'EX-'||p_id,p_patient_id,sample,p_include_motility,p_template_label,auth.uid()) on conflict(id) do nothing;
  select * into result from public.examinations where id=p_id;
 end if;
 if result.id is null or result.patient_id is distinct from p_patient_id or result.created_by is distinct from auth.uid() then raise exception 'Examination does not match submission'; end if;
 return result;
end $$;
notify pgrst,'reload schema';
commit;
