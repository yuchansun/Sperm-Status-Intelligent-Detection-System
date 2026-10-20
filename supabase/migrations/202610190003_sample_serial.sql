-- Run after 001 and 002. Existing specimens and patient IDs are preserved.
begin;
lock table public.examinations in share row exclusive mode;
create sequence if not exists public.specimen_number_seq;
do $$
declare existing_max bigint; sequence_value bigint; used boolean;
begin
  select coalesce(max(substring(sample_id from 5)::bigint), 0) into existing_max
  from public.examinations where sample_id ~ '^SMP-[0-9]{8,18}$';
  select last_value, is_called into sequence_value, used from public.specimen_number_seq;
  perform setval('public.specimen_number_seq', greatest(existing_max, case when used then sequence_value else 0 end, 1), existing_max > 0 or used);
end $$;
create unique index if not exists examinations_generated_sample_unique
on public.examinations(sample_id) where sample_id ~ '^SMP-[0-9]{8,18}$';
revoke all on sequence public.specimen_number_seq from public, anon;
grant usage, select on sequence public.specimen_number_seq to authenticated;
create or replace function public.ensure_examination(p_id uuid, p_patient_id uuid, p_include_motility boolean, p_template_label text)
returns public.examinations
language plpgsql security invoker set search_path = public
as $$
declare result public.examinations; serial bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into result from public.examinations where id = p_id;
  if not found then
    serial := nextval('public.specimen_number_seq');
    insert into public.examinations(id, examination_code, patient_id, sample_id, include_motility, template_label, created_by)
    values(p_id, 'EX-' || p_id, p_patient_id, 'SMP-' || lpad(serial::text, greatest(8, length(serial::text)), '0'), p_include_motility, p_template_label, auth.uid())
    on conflict (id) do nothing;
    select * into result from public.examinations where id = p_id;
  end if;
  if result.id is null or result.patient_id is distinct from p_patient_id or result.created_by is distinct from auth.uid() then
    raise exception 'Examination does not match submission';
  end if;
  return result;
end $$;
revoke all on function public.ensure_examination(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.ensure_examination(uuid, uuid, boolean, text) to authenticated;
-- Refresh the API function cache after installing or updating the RPC.
notify pgrst, 'reload schema';
commit;
