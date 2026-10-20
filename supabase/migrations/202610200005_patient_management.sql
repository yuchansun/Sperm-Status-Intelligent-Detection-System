begin;
alter table public.patients add column if not exists deleted_at timestamptz;
alter table public.patients add column if not exists deleted_by uuid references auth.users(id);
create or replace function public.manage_patient(p_id uuid,p_expected_updated_at timestamptz,p_patch jsonb,p_delete boolean default false)
returns uuid language plpgsql security invoker set search_path=public as $$
declare r public.patients; identity text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into r from public.patients where id=p_id for update;
 if not found or r.deleted_at is not null then raise exception 'Patient unavailable'; end if;
 if r.updated_at is distinct from p_expected_updated_at then raise exception 'Patient changed; reload'; end if;
 if p_delete then
  update public.patients set deleted_at=clock_timestamp(),deleted_by=auth.uid() where id=p_id;
  return p_id;
 end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or not(p_patch ?& array['patient_name','national_id','birth_date','phone','email','health_card_number']) then raise exception 'Invalid patient data'; end if;
 if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('patient_name','national_id','birth_date','phone','email','health_card_number')) then raise exception 'Unsupported field'; end if;
 identity:=upper(trim(p_patch->>'national_id'));
 if nullif(trim(p_patch->>'patient_name'),'') is null or nullif(identity,'') is null or nullif(p_patch->>'birth_date','') is null then raise exception 'Missing required data'; end if;
 perform pg_advisory_xact_lock(hashtextextended(identity,0));
 if exists(select 1 from public.patients where id<>p_id and upper(trim(national_id))=identity and deleted_at is null) then raise exception 'Duplicate patient identity' using errcode='23505'; end if;
 update public.patients set patient_name=trim(p_patch->>'patient_name'),national_id=identity,
 birth_date=(p_patch->>'birth_date')::date,phone=nullif(trim(p_patch->>'phone'),''),email=nullif(trim(p_patch->>'email'),''),
 health_card_number=nullif(trim(p_patch->>'health_card_number'),'') where id=p_id;
 return p_id;
end $$;
revoke all on function public.manage_patient(uuid,timestamptz,jsonb,boolean) from public,anon;
grant execute on function public.manage_patient(uuid,timestamptz,jsonb,boolean) to authenticated;
-- Serialize identity changes and new inserts without rewriting existing duplicates.
create or replace function public.si_patient_identity_unique()
returns trigger language plpgsql security invoker set search_path=public as $$
declare identity text;
begin
 if new.deleted_at is not null then return new; end if;
 identity:=upper(trim(new.national_id));
 perform pg_advisory_xact_lock(hashtextextended(identity,0));
 if exists(select 1 from public.patients where id<>new.id and upper(trim(national_id))=identity and deleted_at is null) then
  raise exception 'Duplicate patient identity' using errcode='23505';
 end if;
 return new;
end $$;
create or replace trigger si_patient_identity_unique before insert or update of national_id,deleted_at on public.patients
for each row execute function public.si_patient_identity_unique();
-- Covers stale selections and new submissions through ensure_examination.
create or replace function public.si_require_active_patient()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from public.patients where id=new.patient_id and deleted_at is null for share;
 if not found then raise exception 'Patient unavailable'; end if;
 return new;
end $$;
create or replace trigger si_require_active_patient before insert or update on public.examinations
for each row execute function public.si_require_active_patient();
notify pgrst,'reload schema';
commit;
