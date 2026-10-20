-- Apply after 001–005. Installing this migration deletes NO existing data or files.
begin;
create table if not exists public.si_purge_jobs (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('record','patient')),
 target_id uuid not null, requested_by uuid not null references auth.users(id),
 record_ids uuid[] not null, examination_ids uuid[] not null, patient_id uuid,
 files jsonb not null default '[]'::jsonb, completed_at timestamptz,
 unique(kind,target_id)
);
alter table public.si_purge_jobs enable row level security;
revoke all on public.si_purge_jobs from public,anon,authenticated;

-- Internal helper: only callable by the definer functions below.
create or replace function public.si_purge_files(p_records uuid[])
returns table(bucket text,path text) language sql security definer set search_path='' as $$
 with candidates as (
  select m.bucket_id bucket,m.object_path path from public.exam_media m where m.analysis_record_id=any(p_records)
  union select 'exam-images',a.original_image_path from public.analysis_records a where a.id=any(p_records)
  union select 'exam-images',a.analyzed_image_path from public.analysis_records a where a.id=any(p_records)
  union select 'reports',e.file_path from public.report_exports e join public.report_versions v on v.id=e.report_version_id
    join public.reports r on r.id=v.report_id where r.analysis_record_id=any(p_records)
 ) select distinct c.bucket,c.path from candidates c where c.path is not null and c.path<>''
 and not exists(select 1 from public.exam_media m where m.bucket_id=c.bucket and m.object_path=c.path and not(m.analysis_record_id=any(p_records)))
 and not exists(select 1 from public.analysis_records a where not(a.id=any(p_records)) and c.bucket='exam-images' and (a.original_image_path=c.path or a.analyzed_image_path=c.path));
$$;
revoke all on function public.si_purge_files(uuid[]) from public,anon,authenticated;

create or replace function public.prepare_permanent_delete(p_kind text,p_id uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.si_purge_jobs; ids uuid[]; exams uuid[]; pid uuid; stamp timestamptz; files jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_kind not in ('record','patient') then raise exception 'Invalid kind'; end if;
 -- Serialize prepares and freeze parent changes while collecting the affected records.
 perform pg_advisory_xact_lock(hashtextextended(p_kind||p_id::text,0));
 select * into j from public.si_purge_jobs where kind=p_kind and target_id=p_id for update;
 if found then
  if j.requested_by<>auth.uid() then raise exception 'Resume using the original deleting account'; end if;
  return jsonb_build_object('id',j.id,'files',j.files,'completed',j.completed_at is not null);
 end if;
 lock table public.patients,public.examinations,public.analysis_records in share row exclusive mode;
 if p_kind='patient' then
  select updated_at into stamp from public.patients where id=p_id;
  if not found then raise exception 'Target unavailable'; end if;
  pid:=p_id;
  select coalesce(array_agg(id),'{}'::uuid[]) into exams from public.examinations where patient_id=p_id;
  select coalesce(array_agg(id),'{}'::uuid[]) into ids from public.analysis_records where examination_id=any(exams);
 else
  select updated_at,examination_id into stamp,pid from public.analysis_records where id=p_id;
  if not found then raise exception 'Target unavailable'; end if;
  exams:=array[pid]; pid:=null; ids:=array[p_id];
 end if;
 if stamp is distinct from p_expected_updated_at then raise exception 'Target changed; reload'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket,'path',path)),'[]'::jsonb) into files from public.si_purge_files(ids);
 update public.analysis_records set deleted_at=coalesce(deleted_at,now()),deleted_by=auth.uid() where id=any(ids);
 if p_kind='patient' then update public.patients set deleted_at=coalesce(deleted_at,now()),deleted_by=auth.uid() where id=p_id; end if;
 insert into public.si_purge_jobs(kind,target_id,requested_by,record_ids,examination_ids,patient_id,files)
 values(p_kind,p_id,auth.uid(),ids,exams,pid,files) returning * into j;
 return jsonb_build_object('id',j.id,'files',j.files,'completed',false);
end $$;
revoke all on function public.prepare_permanent_delete(text,uuid,timestamptz) from public,anon;
grant execute on function public.prepare_permanent_delete(text,uuid,timestamptz) to authenticated;

-- Prevent edits and late database references while the Storage cleanup is in progress.
create or replace function public.si_block_purge_changes()
returns trigger language plpgsql security definer set search_path='' as $$
declare rid uuid; pid uuid; vid uuid; reportid uuid;
begin
 case tg_table_name
 when 'patients' then pid:=new.id;
 when 'patient_notes' then pid:=new.patient_id;
 when 'examinations' then pid:=new.patient_id;
 when 'analysis_records' then
  rid:=new.id; select patient_id into pid from public.examinations where id=new.examination_id;
 when 'exam_media' then rid:=new.analysis_record_id;
 when 'reports' then rid:=new.analysis_record_id;
 when 'report_versions' then reportid:=new.report_id;
 when 'report_exports','report_reviews' then vid:=new.report_version_id;
 when 'email_drafts','email_deliveries' then pid:=new.patient_id;vid:=new.report_version_id;
 end case;
 if vid is not null then select report_id into reportid from public.report_versions where id=vid; end if;
 if reportid is not null then select analysis_record_id into rid from public.reports where id=reportid; end if;
 if exists(select 1 from public.si_purge_jobs j where j.completed_at is null and
  ((pid is not null and j.kind='patient' and j.patient_id=pid) or (rid is not null and rid=any(j.record_ids)))) then
  raise exception 'Permanent deletion in progress; retry deletion first';
 end if;
 return new;
end $$;
revoke all on function public.si_block_purge_changes() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['patients','patient_notes','examinations','analysis_records','exam_media','reports','report_versions','report_exports','report_reviews','email_drafts','email_deliveries'] loop
  execute format('create or replace trigger si_block_purge_changes before insert or update on public.%I for each row execute function public.si_block_purge_changes()',t);
 end loop;
end $$;

-- Storage DELETE is limited to the exact manifest of a deletion confirmed by this user.
create or replace function public.si_may_purge_object(p_bucket text,p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.si_purge_jobs j,
 jsonb_to_recordset(j.files) f(bucket text,path text)
 where j.requested_by=auth.uid() and j.completed_at is null and f.bucket=p_bucket and f.path=p_path
 and exists(select 1 from public.si_purge_files(j.record_ids) live where live.bucket=p_bucket and live.path=p_path));
$$;
revoke all on function public.si_may_purge_object(text,text) from public,anon;
grant execute on function public.si_may_purge_object(text,text) to authenticated;
drop policy if exists si_confirmed_purge_delete on storage.objects;
create policy si_confirmed_purge_delete on storage.objects for delete to authenticated
 using(public.si_may_purge_object(bucket_id,name));
-- SELECT is also required by Storage remove, including exports in the reports bucket.
drop policy if exists si_confirmed_purge_read on storage.objects;
create policy si_confirmed_purge_read on storage.objects for select to authenticated
 using(public.si_may_purge_object(bucket_id,name));

-- Keep report versions immutable except inside the narrowly scoped purge transaction.
create or replace function public.si_immutable_report_version()
returns trigger language plpgsql set search_path='' as $$
declare job public.si_purge_jobs; report_uuid uuid;
begin
 if tg_op='DELETE' and current_user=(select pg_get_userbyid(proowner) from pg_proc where oid='public.finish_permanent_delete(uuid)'::regprocedure) then
  select * into job from public.si_purge_jobs where id=nullif(current_setting('si.purge_job',true),'')::uuid and requested_by=auth.uid() and completed_at is null;
  if found then
   if tg_table_name='report_versions' then report_uuid:=old.report_id;
   else select report_id into report_uuid from public.report_versions where id=old.report_version_id; end if;
   if exists(select 1 from public.reports where id=report_uuid and analysis_record_id=any(job.record_ids)) then return old; end if;
  end if;
 end if;
 raise exception 'Report versions are immutable; save a new version';
end $$;

create or replace function public.finish_permanent_delete(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.si_purge_jobs; v_reports uuid[]; v_versions uuid[]; v_exports uuid[]; v_drafts uuid[]; v_deliveries uuid[];
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into j from public.si_purge_jobs where id=p_job_id for update;
 if not found or j.requested_by<>auth.uid() then raise exception 'Deletion unavailable'; end if;
 if j.completed_at is not null then return true; end if;
 lock table public.patients,public.examinations,public.analysis_records,public.exam_media,public.reports,
 public.report_versions,public.report_exports,public.report_reviews,public.email_drafts,public.email_deliveries,public.email_delivery_events in share row exclusive mode;
 if exists(select 1 from public.si_purge_files(j.record_ids) f join storage.objects o on o.bucket_id=f.bucket and o.name=f.path) then raise exception 'Files remain; retry Storage deletion'; end if;
 if exists(select 1 from public.si_purge_files(j.record_ids) f where not j.files @> jsonb_build_array(jsonb_build_object('bucket',f.bucket,'path',f.path))) then raise exception 'File references changed; administrator must review'; end if;
 if j.kind='patient' and exists(select 1 from public.analysis_records a join public.examinations e on e.id=a.examination_id where e.patient_id=j.patient_id and not(a.id=any(j.record_ids))) then raise exception 'Patient records changed; administrator must review'; end if;
 select coalesce(array_agg(id),'{}'::uuid[]) into v_reports from public.reports where analysis_record_id=any(j.record_ids);
 select coalesce(array_agg(id),'{}'::uuid[]) into v_versions from public.report_versions where report_id=any(v_reports);
 select coalesce(array_agg(id),'{}'::uuid[]) into v_exports from public.report_exports where report_version_id=any(v_versions);
 select coalesce(array_agg(id),'{}'::uuid[]) into v_drafts from public.email_drafts where report_version_id=any(v_versions) or (j.kind='patient' and patient_id=j.patient_id);
 select coalesce(array_agg(id),'{}'::uuid[]) into v_deliveries from public.email_deliveries where draft_id=any(v_drafts) or report_version_id=any(v_versions) or report_export_id=any(v_exports) or (j.kind='patient' and patient_id=j.patient_id);
 perform set_config('si.purge_job',j.id::text,true);
 delete from public.email_delivery_events where delivery_id=any(v_deliveries);
 delete from public.email_deliveries where id=any(v_deliveries);
 delete from public.email_drafts where id=any(v_drafts);
 delete from public.report_reviews where report_version_id=any(v_versions);
 delete from public.report_exports where id=any(v_exports);
 delete from public.report_versions where id=any(v_versions);
 delete from public.reports where id=any(v_reports);
 delete from public.exam_media where analysis_record_id=any(j.record_ids);
 delete from public.analysis_records where id=any(j.record_ids);
 delete from public.examinations e where e.id=any(j.examination_ids) and not exists(select 1 from public.analysis_records a where a.examination_id=e.id);
 if j.kind='patient' then
  delete from public.patient_notes where patient_id=j.patient_id;
  delete from public.patients where id=j.patient_id;
 end if;
 update public.si_purge_jobs set completed_at=now(),files='[]'::jsonb where id=j.id;
 return true;
end $$;
revoke all on function public.finish_permanent_delete(uuid) from public,anon;
grant execute on function public.finish_permanent_delete(uuid) to authenticated;

create or replace function public.list_deleted_items()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return jsonb_build_object(
 'patients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',patient_name,'updatedAt',updated_at)) from public.patients where deleted_at is not null),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'label',a.sample_id,'updatedAt',a.updated_at)) from public.analysis_records a join public.examinations e on e.id=a.examination_id join public.patients p on p.id=e.patient_id where a.deleted_at is not null and p.deleted_at is null),'[]'::jsonb));
end $$;
revoke all on function public.list_deleted_items() from public,anon;
grant execute on function public.list_deleted_items() to authenticated;
notify pgrst,'reload schema';
commit;
