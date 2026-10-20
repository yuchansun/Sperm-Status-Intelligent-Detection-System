-- Preserve reports, delivery audit and private files when removing a record from use.
begin;
alter table public.analysis_records add column if not exists deleted_at timestamptz;
alter table public.analysis_records add column if not exists deleted_by uuid references auth.users(id);
create or replace function public.manage_analysis_record(p_id uuid, p_expected_updated_at timestamptz, p_patch jsonb, p_delete boolean default false)
returns uuid language plpgsql security invoker set search_path=public as $$
declare r public.analysis_records; new_ai jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into r from public.analysis_records where id=p_id for update;
 if not found or r.deleted_at is not null then raise exception 'Record unavailable'; end if;
 if r.updated_at is distinct from p_expected_updated_at then raise exception 'Record changed; reload before editing'; end if;
 if p_delete then
  update public.analysis_records set deleted_at=clock_timestamp(), deleted_by=auth.uid(), updated_at=clock_timestamp() where id=p_id;
  return p_id;
 end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' then raise exception 'Invalid patch'; end if;
 if not (p_patch ?& array['exam_date','density','motility','morphology','amount','ph','color','appearance','count_of_spermatozoa','summary']) or nullif(p_patch->>'exam_date','') is null then raise exception 'Incomplete patch'; end if;
 if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('exam_date','density','motility','morphology','amount','ph','color','appearance','count_of_spermatozoa','summary')) then raise exception 'Unsupported field'; end if;
 new_ai:=coalesce(r.ai_result,'{}'::jsonb) || jsonb_build_object(
 'density',coalesce(p_patch->>'density','—'),
 'normalRate',case when p_patch->>'morphology' is null then '—' else (p_patch->>'morphology')||'%' end,
 'motility',case when p_patch->>'motility' is null then '—' else (p_patch->>'motility')||'%' end,
 'manuallyEdited',true);
 update public.analysis_records set
 exam_date=(p_patch->>'exam_date')::date, density=(p_patch->>'density')::numeric,
 motility=(p_patch->>'motility')::numeric, morphology=(p_patch->>'morphology')::numeric,
 amount=(p_patch->>'amount')::numeric, ph=(p_patch->>'ph')::numeric,
 color=nullif(p_patch->>'color',''), appearance=nullif(p_patch->>'appearance',''),
 count_of_spermatozoa=(p_patch->>'count_of_spermatozoa')::numeric, summary=p_patch->>'summary',
 ai_result=new_ai, processing_state='待複核', clinical_status=case when r.ai_result->>'isDemo'='true' then '示範資料' else '未判讀' end,
 reviewed_by=null, reviewed_at=null, review_note=null, interpretation='{}'::jsonb, interpretation_version=null,
 updated_at=clock_timestamp() where id=p_id;
 return p_id;
end $$;
revoke all on function public.manage_analysis_record(uuid,timestamptz,jsonb,boolean) from public,anon;
grant execute on function public.manage_analysis_record(uuid,timestamptz,jsonb,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
