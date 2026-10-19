-- Run the entire file in Supabase SQL Editor, as project owner.
-- No DELETE/TRUNCATE/DROP COLUMN; any conversion failure rolls back the transaction.
begin;
set local lock_timeout = '10s';

alter table public.patients add column if not exists email text;
alter table public.examinations add column if not exists collected_at timestamptz;
alter table public.analysis_records
  add column if not exists amount numeric,
  add column if not exists amount_unit text,
  add column if not exists color text,
  add column if not exists appearance text,
  add column if not exists ph numeric,
  add column if not exists count_of_spermatozoa numeric,
  add column if not exists count_unit text,
  add column if not exists count_definition text,
  add column if not exists density_unit text,
  add column if not exists motility_type text,
  add column if not exists measurement_status jsonb not null default '{}'::jsonb,
  add column if not exists interpretation jsonb not null default '{}'::jsonb,
  add column if not exists interpretation_version text,
  add column if not exists legacy_metrics jsonb,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

-- Strictly accept the old forms written by this app: number, optional % on ratios,
-- optional M/mL or million/mL on density. Ambiguous strings stop migration.
create or replace function public.si_parse_legacy_metric(value text, metric text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare cleaned text; result numeric;
begin
  if value is null then return null; end if;
  cleaned := btrim(value);
  if cleaned = '' then return null; end if;
  if metric in ('motility', 'morphology') then
    cleaned := regexp_replace(cleaned, '\s*%\s*$', '');
  elsif metric = 'density' then
    cleaned := regexp_replace(cleaned, '\s*(M/mL|million/mL)\s*$', '', 'i');
  end if;
  if cleaned !~ '^[+]?[0-9]+([.][0-9]+)?$' then
    raise exception 'Cannot convert metric %. Inspect analysis_records before retrying.', metric;
  end if;
  result := cleaned::numeric;
  if metric in ('motility','morphology') and result > 100 then
    raise exception 'Percentage exceeds 100 in %. No data was changed.', metric;
  end if;
  return result;
end $$;
revoke all on function public.si_parse_legacy_metric(text,text) from public, anon, authenticated;

do $$
declare col text; typ text;
begin
  foreach col in array array['density','motility','morphology'] loop
    select data_type into typ from information_schema.columns
      where table_schema='public' and table_name='analysis_records' and column_name=col;
    if typ is null then raise exception 'Missing expected column %', col; end if;
    if typ <> 'numeric' then
      -- Preserve original spellings, percentages and empty strings, without replacing earlier backup.
      update public.analysis_records set legacy_metrics = jsonb_build_object(
        'density', density, 'motility', motility, 'morphology', morphology
      ) where legacy_metrics is null;
      execute format('alter table public.analysis_records alter column %I type numeric using public.si_parse_legacy_metric(%I::text, %L)', col,col,col);
    end if;
  end loop;
end $$;
update public.analysis_records set density_unit = 'million/mL'
where density_unit is null and legacy_metrics is not null;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  analysis_record_id uuid not null unique references public.analysis_records(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  version integer not null check(version > 0),
  title text not null,
  summary text not null default '',
  conclusion text not null default '',
  recommendations text not null default '',
  patient_snapshot jsonb not null,
  measurements_snapshot jsonb not null,
  interpretation_snapshot jsonb not null default '{}'::jsonb,
  language text not null default 'zh',
  change_note text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique(report_id,version),
  check(jsonb_typeof(patient_snapshot)='object'),
  check(jsonb_typeof(measurements_snapshot)='object'),
  check(jsonb_typeof(interpretation_snapshot)='object')
);
create table if not exists public.report_reviews (
  id uuid primary key default gen_random_uuid(),
  report_version_id uuid not null unique references public.report_versions(id) on delete restrict,
  reviewed_by uuid not null default auth.uid() references auth.users(id),
  reviewed_at timestamptz not null default now(),
  note text not null default ''
);
create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_version_id uuid not null references public.report_versions(id) on delete restrict,
  file_path text not null unique,
  file_sha256 text not null check(file_sha256 ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  report_version_id uuid references public.report_versions(id) on delete restrict,
  to_email text not null,
  subject text not null default '',
  body text not null default '',
  language text not null default 'zh',
  revision integer not null default 1 check(revision > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(to_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);
-- Queue and provider updates are server-only; browsers cannot fabricate a delivered message.
create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.email_drafts(id) on delete restrict,
  draft_revision integer not null,
  patient_id uuid not null references public.patients(id) on delete restrict,
  report_version_id uuid references public.report_versions(id) on delete restrict,
  to_email text not null,
  subject text not null,
  body text not null,
  language text not null,
  attach_report boolean not null default false,
  report_export_id uuid references public.report_exports(id) on delete restrict,
  idempotency_key uuid not null unique,
  status text not null default 'queued' check(status in
    ('queued','sending','accepted','delivered','bounced','failed','unknown')),
  provider text,
  provider_message_id text,
  attempt_count integer not null default 0 check(attempt_count >= 0),
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  last_attempt_at timestamptz,
  error_code text,
  updated_at timestamptz not null default now(),
  check(not attach_report or report_version_id is not null)
);
create table if not exists public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.email_deliveries(id) on delete restrict,
  provider text not null,
  provider_event_id text not null,
  event_type text not null check(event_type in
    ('queued','sending','accepted','delivered','bounced','failed','unknown')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  unique(provider,provider_event_id)
);
create unique index if not exists si_delivery_provider_message
  on public.email_deliveries(provider,provider_message_id) where provider_message_id is not null;
create index if not exists si_patients_national_id on public.patients(national_id);
create index if not exists si_examinations_patient on public.examinations(patient_id,created_at);
create index if not exists si_analysis_examination on public.analysis_records(examination_id);
create index if not exists si_report_exports_version on public.report_exports(report_version_id);
create index if not exists si_email_drafts_patient on public.email_drafts(patient_id,updated_at);
create index if not exists si_email_deliveries_draft on public.email_deliveries(draft_id);
create index if not exists si_email_deliveries_queue on public.email_deliveries(status,requested_at);
create index if not exists si_email_events_delivery on public.email_delivery_events(delivery_id,occurred_at);

-- Structural limits only: these are not clinical reference ranges.
do $$
begin
 if not exists(select 1 from pg_constraint where conname='si_metric_values' and conrelid='public.analysis_records'::regclass) then
  alter table public.analysis_records add constraint si_metric_values check (
    (amount is null or (amount >= 0 and amount::text not in ('NaN','Infinity','-Infinity'))) and
    (density is null or (density >= 0 and density::text not in ('NaN','Infinity','-Infinity'))) and
    (count_of_spermatozoa is null or (count_of_spermatozoa >= 0 and count_of_spermatozoa::text not in ('NaN','Infinity','-Infinity'))) and
    (ph is null or ph between 0 and 14) and
    (motility is null or motility between 0 and 100) and
    (morphology is null or morphology between 0 and 100)
  );
 end if;
 if not exists(select 1 from pg_constraint where conname='si_metric_objects' and conrelid='public.analysis_records'::regclass) then
  alter table public.analysis_records add constraint si_metric_objects check (
    jsonb_typeof(measurement_status)='object' and jsonb_typeof(interpretation)='object'
  );
 end if;
end $$;

create or replace function public.si_stamp_changes()
returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at := now();
  if tg_table_name='email_drafts' then
    if auth.uid() is not null then new.updated_by := auth.uid(); end if;
    if tg_op='UPDATE' then
      new.created_by := old.created_by; new.created_at := old.created_at;
      new.revision := old.revision+1;
    elsif auth.uid() is not null then
      new.created_by := auth.uid(); new.revision := 1;
    end if;
  end if;
  return new;
end $$;
do $$
declare t text;
begin
 foreach t in array array['patients','analysis_records','patient_notes','email_drafts','email_deliveries'] loop
  execute format('create or replace trigger si_stamp_changes before insert or update on public.%I for each row execute function public.si_stamp_changes()',t);
 end loop;
end $$;

-- Cross-patient draft/report combinations are rejected at the DB boundary.
create or replace function public.si_check_email_report()
returns trigger language plpgsql set search_path='' as $$
declare report_patient uuid; export_version uuid;
begin
 if new.report_version_id is not null then
   select e.patient_id into report_patient
   from public.report_versions v join public.reports r on r.id=v.report_id
   join public.analysis_records a on a.id=r.analysis_record_id
   join public.examinations e on e.id=a.examination_id
   where v.id=new.report_version_id;
   if report_patient is distinct from new.patient_id then
     raise exception 'Report version does not belong to this patient';
   end if;
 end if;
 if tg_table_name='email_deliveries' then
   if new.report_export_id is not null then
     select report_version_id into export_version from public.report_exports where id=new.report_export_id;
     if not new.attach_report or export_version is distinct from new.report_version_id then
       raise exception 'Attachment export does not match queued report version';
     end if;
   end if;
 end if;
 return new;
end $$;
create or replace trigger si_email_report before insert or update on public.email_drafts
for each row execute function public.si_check_email_report();
create or replace trigger si_delivery_report before insert or update on public.email_deliveries
for each row execute function public.si_check_email_report();

-- Auditable state transition; this preserves the existing shared-staff authorization model.
-- This records the operator, not proof of a medical license/doctor role.
create or replace function public.si_stamp_review()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
   if new.processing_state='已完成' and auth.uid() is not null then
     raise exception 'Create pending record first, then review';
   end if;
   new.reviewed_by := null; new.reviewed_at := null;
 elsif old.processing_state='已完成' and (
    (to_jsonb(new)-array['updated_at','reviewed_by','reviewed_at','review_note','processing_state'])
    is distinct from (to_jsonb(old)-array['updated_at','reviewed_by','reviewed_at','review_note','processing_state'])
 ) then
   new.processing_state := '待複核'; new.reviewed_by := null; new.reviewed_at := null; new.review_note := null;
 elsif new.processing_state is distinct from old.processing_state then
   if new.processing_state='已完成' then
     if old.processing_state <> '待複核' then raise exception 'Only pending review can complete'; end if;
     if auth.uid() is null then raise exception 'Review requires an authenticated operator'; end if;
     new.reviewed_by := auth.uid(); new.reviewed_at := now();
   else
     new.reviewed_by := null; new.reviewed_at := null;
   end if;
 else
   new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
 end if;
 return new;
end $$;
create or replace trigger si_stamp_review before insert or update on public.analysis_records
for each row execute function public.si_stamp_review();

-- Report versions are immutable. All writes use a locking RPC below.
create or replace function public.si_immutable_report_version()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Report versions are immutable; save a new version'; end $$;
create or replace trigger si_report_immutable before update or delete on public.report_versions
for each row execute function public.si_immutable_report_version();

-- New tables: authenticated shared reads; drafts editable; reports/versions written via RPC only.
do $$
declare t text;
begin
 foreach t in array array['reports','report_versions','report_reviews','report_exports','email_drafts','email_deliveries','email_delivery_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='si_staff_read') then
   execute format('create policy si_staff_read on public.%I for select to authenticated using (true)',t);
  end if;
 end loop;
end $$;
grant insert,update on public.email_drafts to authenticated;
do $$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='email_drafts' and policyname='si_staff_insert') then
  create policy si_staff_insert on public.email_drafts for insert to authenticated with check(created_by=auth.uid() and updated_by=auth.uid());
  create policy si_staff_update on public.email_drafts for update to authenticated using(true) with check(updated_by=auth.uid());
 end if;
end $$;

-- Serialize version allocation; expected_version prevents overwriting someone else's newer work.
-- Snapshot patient + numeric measurements from DB; client supplies report text only.
create or replace function public.save_report_version(
 p_analysis_record_id uuid, p_expected_version integer,
 p_title text, p_summary text, p_conclusion text, p_recommendations text,
 p_language text default 'zh', p_change_note text default ''
) returns public.report_versions language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); rid uuid; latest integer; saved public.report_versions;
        patient_data jsonb; measurements jsonb; interpretation_data jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_expected_version is null or p_expected_version < 0 then raise exception 'Expected version required'; end if;
 if nullif(btrim(p_title),'') is null or nullif(btrim(p_language),'') is null then raise exception 'Title and language required'; end if;
 select to_jsonb(p)-'national_id'-'health_card_number',
        jsonb_build_object('analysis_record_id',a.id,'sample_id',a.sample_id,'exam_date',a.exam_date,
          'amount',a.amount,'amount_unit',a.amount_unit,'color',a.color,'appearance',a.appearance,
          'ph',a.ph,'morphology',a.morphology,'motility',a.motility,'motility_type',a.motility_type,
          'count_of_spermatozoa',a.count_of_spermatozoa,'count_unit',a.count_unit,'count_definition',a.count_definition,
          'density',a.density,'density_unit',a.density_unit,'measurement_status',a.measurement_status,
          'is_demo',coalesce(a.ai_result->'isDemo','false'::jsonb)),
        jsonb_build_object('version',a.interpretation_version,'result',a.interpretation)
 into patient_data,measurements,interpretation_data
 from public.analysis_records a join public.examinations e on e.id=a.examination_id
 join public.patients p on p.id=e.patient_id where a.id=p_analysis_record_id for share of a,p;
 if not found then raise exception 'Analysis record not found'; end if;
 insert into public.reports(analysis_record_id,created_by) values(p_analysis_record_id,uid)
 on conflict(analysis_record_id) do nothing;
 select id into rid from public.reports where analysis_record_id=p_analysis_record_id for update;
 select coalesce(max(version),0) into latest from public.report_versions where report_id=rid;
 if latest <> p_expected_version then raise exception 'Report changed; reload before saving'; end if;
 insert into public.report_versions(report_id,version,title,summary,conclusion,recommendations,
   patient_snapshot,measurements_snapshot,interpretation_snapshot,language,change_note,created_by)
 values(rid,latest+1,p_title,coalesce(p_summary,''),coalesce(p_conclusion,''),coalesce(p_recommendations,''),
   patient_data,measurements,interpretation_data,p_language,coalesce(p_change_note,''),uid)
 returning * into saved;
 return saved;
end $$;
revoke all on function public.save_report_version(uuid,integer,text,text,text,text,text,text) from public,anon;
grant execute on function public.save_report_version(uuid,integer,text,text,text,text,text,text) to authenticated;

create or replace function public.review_report_version(p_report_version_id uuid,p_note text default '')
returns public.report_reviews language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result public.report_reviews;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 insert into public.report_reviews(report_version_id,reviewed_by,note)
 values(p_report_version_id,uid,coalesce(p_note,'')) returning * into result;
 return result;
end $$;
revoke all on function public.review_report_version(uuid,text) from public,anon;
grant execute on function public.review_report_version(uuid,text) to authenticated;
create or replace trigger si_report_review_immutable before update or delete on public.report_reviews
for each row execute function public.si_immutable_report_version();

-- Each send request freezes the current draft. It DOES NOT send an email by itself.
create or replace function public.queue_email_delivery(p_draft_id uuid,p_expected_revision integer,
 p_idempotency_key uuid,p_attach_report boolean default false)
returns public.email_deliveries language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); d public.email_drafts; result public.email_deliveries;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_idempotency_key is null or p_expected_revision is null or p_attach_report is null then raise exception 'Required request parameters missing'; end if;
 -- Retry lookup happens before revision validation, so an already queued send stays idempotent.
 select * into result from public.email_deliveries where idempotency_key=p_idempotency_key;
 if found then
   if result.draft_id<>p_draft_id or result.requested_by<>uid or result.draft_revision<>p_expected_revision
      or result.attach_report<>p_attach_report then raise exception 'Idempotency key already used'; end if;
   return result;
 end if;
 select * into d from public.email_drafts where id=p_draft_id for update;
 if not found then raise exception 'Draft not found'; end if;
 if d.revision<>p_expected_revision then raise exception 'Draft changed; reload before sending'; end if;
 if nullif(btrim(d.subject),'') is null or nullif(btrim(d.body),'') is null then raise exception 'Subject and body required'; end if;
 if p_attach_report and d.report_version_id is null then raise exception 'Report version required for attachment'; end if;
 insert into public.email_deliveries(draft_id,draft_revision,patient_id,report_version_id,to_email,subject,body,language,
 attach_report,idempotency_key,requested_by)
 values(d.id,d.revision,d.patient_id,d.report_version_id,d.to_email,d.subject,d.body,d.language,
 p_attach_report,p_idempotency_key,uid)
 on conflict(idempotency_key) do nothing returning * into result;
 if not found then
   select * into result from public.email_deliveries where idempotency_key=p_idempotency_key;
   if result.draft_id<>p_draft_id or result.requested_by<>uid or result.draft_revision<>p_expected_revision
     or result.attach_report<>p_attach_report then raise exception 'Idempotency key already used'; end if;
 end if;
 return result;
end $$;
revoke all on function public.queue_email_delivery(uuid,integer,uuid,boolean) from public,anon;
grant execute on function public.queue_email_delivery(uuid,integer,uuid,boolean) to authenticated;

-- Private PDF exports, separate from image-only exam-images. No public bucket changes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('reports','reports',false,20971520,array['application/pdf']) on conflict(id) do nothing;
do $$
begin
 if exists(select 1 from storage.buckets where id='reports' and public) then
  raise exception 'Existing reports bucket is public; resolve before applying migration';
 end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='si_staff_read_reports') then
  create policy si_staff_read_reports on storage.objects for select to authenticated using(bucket_id='reports');
 end if;
end $$;
-- PDF writes are backend/service_role only. No frontend administrative credential is needed.

-- COLUMN_DICTIONARY
comment on column public.analysis_records.id is '本表 UUID 主鍵，自動產生。';
comment on column public.analysis_records.examination_id is '對應 examinations.id。一次檢測可有多筆分析紀錄。';
comment on column public.analysis_records.sample_id is '檢體編號，非病患 ID。';
comment on column public.analysis_records.exam_date is '檢驗日期。';
comment on column public.analysis_records.clinical_status is '整體判讀／示範標籤；不是工作流程狀態。';
comment on column public.analysis_records.processing_state is '待複核／已完成／影像待上傳等工作流程狀態，沿用既有文字。';
comment on column public.analysis_records.density is '濃度，numeric；舊文字已轉換。不代表獨立的 Count。';
comment on column public.analysis_records.motility is 'Excel Motility：活動力百分比數值 0–100，DB 不存 % 字元；活動力定義見 motility_type。';
comment on column public.analysis_records.morphology is 'Excel Morphology：正常型態比例數值 0–100，DB 不存 % 字元；不是頭身比。';
comment on column public.analysis_records.summary is '分析摘要；報告修改另存版本，不覆寫此原始摘要。';
comment on column public.analysis_records.ai_result is '原始／示範分析 JSON；isDemo 為示範標記。正式顯示數值以 numeric 欄為準。';
comment on column public.analysis_records.boxes is '原圖座標的標記框 JSON；沿用前端百分比座標格式。';
comment on column public.analysis_records.original_image_path is '私有 exam-images 的原始影像物件路徑，不存簽名 URL。';
comment on column public.analysis_records.analyzed_image_path is '私有 exam-images 的分析後標記影像路徑；未生成則 null。';
comment on column public.analysis_records.created_by is '建立操作人員的 auth.users.id。';
comment on column public.analysis_records.created_at is '建立時間（含時區）。';
comment on column public.analysis_records.updated_at is '最後修改時間；有對應觸發器的表由資料庫自動更新。';
comment on column public.analysis_records.amount is 'Excel Amount，numeric；實際定義及單位待後端定案，未測為 null。';
comment on column public.analysis_records.amount_unit is 'Amount 的單位代碼；未定不預設。';
comment on column public.analysis_records.color is 'Excel Color，顏色描述／穩定代碼；文字，不是量測數字。';
comment on column public.analysis_records.appearance is 'Excel Appearance，外觀描述／穩定代碼；文字。';
comment on column public.analysis_records.ph is 'Excel pH，numeric，0–14 為結構範圍；未測 null。';
comment on column public.analysis_records.count_of_spermatozoa is 'Excel Count of spermatozoa，numeric；單位／總數或計數定義尚未定案，不與 density 混用。';
comment on column public.analysis_records.count_unit is 'Count 的單位代碼，未定 null。';
comment on column public.analysis_records.count_definition is 'Count 的計數定義／基準，由後端確定。';
comment on column public.analysis_records.density_unit is '濃度單位；既有程式使用 million/mL。';
comment on column public.analysis_records.motility_type is '活動力分類定義，例如後端定案的 total／progressive；未知 null。';
comment on column public.analysis_records.measurement_status is '各量測的狀態 JSON，例如未檢測／失敗／完成；沒有填寫不推論為零。';
comment on column public.analysis_records.interpretation is '後端產生的各指標判讀／參考範圍 JSON；不預設門檻。';
comment on column public.analysis_records.interpretation_version is '上述判讀規則版本，由後端填。';
comment on column public.analysis_records.legacy_metrics is '遷移前 density／motility／morphology 原始文字備存；重跑不覆蓋。';
comment on column public.analysis_records.reviewed_by is '審核操作者 auth.users.id，不等同已驗證醫師資格。';
comment on column public.analysis_records.reviewed_at is '審核時間（含時區）。';
comment on column public.analysis_records.review_note is '這次分析的審核意見；病患長期備註另外存。';
comment on column public.email_deliveries.id is '本表 UUID 主鍵，自動產生。';
comment on column public.email_deliveries.draft_id is '來源 email_drafts.id。';
comment on column public.email_deliveries.draft_revision is '排程當下草稿的 revision，之後草稿修改不影響此筆。';
comment on column public.email_deliveries.patient_id is '對應 patients.id 的病患外鍵。';
comment on column public.email_deliveries.report_version_id is '對應 report_versions.id，精確指定某一版報告。';
comment on column public.email_deliveries.to_email is '收件 Email；草稿／寄送各自保存，不隨病患預設 Email 自動改寫。';
comment on column public.email_deliveries.subject is 'Email 主旨。';
comment on column public.email_deliveries.body is 'Email 內文。';
comment on column public.email_deliveries.language is '內容語言代碼；預設 zh，前端現有 zh／en／ko。';
comment on column public.email_deliveries.attach_report is '是否附上指定版本報告 PDF；true 時 report_version_id 必填。';
comment on column public.email_deliveries.report_export_id is '實際附件對應 report_exports.id；排程時可空，後端生成附件後填入且必須符合報告版本。';
comment on column public.email_deliveries.idempotency_key is '本次發送請求的唯一 UUID；重試沿用，防止重複排程。';
comment on column public.email_deliveries.status is 'queued／sending／accepted／delivered／bounced／failed／unknown；只有後端可更新。';
comment on column public.email_deliveries.provider is '寄件供應商代碼。';
comment on column public.email_deliveries.provider_message_id is '供應商郵件 ID，與 provider 組成部分唯一索引。';
comment on column public.email_deliveries.attempt_count is '實際嘗試次數，初始 0；後端累加。';
comment on column public.email_deliveries.requested_by is '發送請求人的 auth.users.id，由排程 RPC 設定。';
comment on column public.email_deliveries.requested_at is '建立發送請求時間，不等於寄出時間。';
comment on column public.email_deliveries.accepted_at is '供應商接受郵件的時間，不代表送達。';
comment on column public.email_deliveries.delivered_at is '由已驗證供應商事件確認的送達時間。';
comment on column public.email_deliveries.last_attempt_at is '最後嘗試寄件的時間。';
comment on column public.email_deliveries.error_code is '後端／供應商錯誤碼，避免存憑證或完整敏感除錯資料。';
comment on column public.email_deliveries.updated_at is '最後修改時間；有對應觸發器的表由資料庫自動更新。';
comment on column public.email_delivery_events.id is '本表 UUID 主鍵，自動產生。';
comment on column public.email_delivery_events.delivery_id is '對應 email_deliveries.id。';
comment on column public.email_delivery_events.provider is '回報事件的寄件供應商。';
comment on column public.email_delivery_events.provider_event_id is '供應商事件識別碼，與 provider 唯一；攔截 webhook 重複事件。';
comment on column public.email_delivery_events.event_type is 'queued／sending／accepted／delivered／bounced／failed／unknown。';
comment on column public.email_delivery_events.occurred_at is '供應商事件實際發生時間。';
comment on column public.email_delivery_events.received_at is '系統接收事件時間；可與發生時間不同。';
comment on column public.email_delivery_events.details is '必要且已過濾的供應商事件細節 JSON，不存驗證密鑰。';
comment on column public.email_drafts.id is '本表 UUID 主鍵，自動產生。';
comment on column public.email_drafts.patient_id is '對應 patients.id 的病患外鍵。';
comment on column public.email_drafts.report_version_id is '對應 report_versions.id，精確指定某一版報告。';
comment on column public.email_drafts.to_email is '收件 Email；草稿／寄送各自保存，不隨病患預設 Email 自動改寫。';
comment on column public.email_drafts.subject is 'Email 主旨。';
comment on column public.email_drafts.body is 'Email 內文。';
comment on column public.email_drafts.language is '內容語言代碼；預設 zh，前端現有 zh／en／ko。';
comment on column public.email_drafts.revision is '草稿修訂序號，新增 1，每次更新由 DB 遞增，供樂觀鎖定。';
comment on column public.email_drafts.created_by is '建立操作人員的 auth.users.id。';
comment on column public.email_drafts.updated_by is '最後修改操作人員的 auth.users.id。';
comment on column public.email_drafts.created_at is '建立時間（含時區）。';
comment on column public.email_drafts.updated_at is '最後修改時間；有對應觸發器的表由資料庫自動更新。';
comment on column public.examinations.id is '本表 UUID 主鍵，自動產生。';
comment on column public.examinations.examination_code is '唯一檢測代碼。';
comment on column public.examinations.patient_id is '對應 patients.id 的病患外鍵。';
comment on column public.examinations.sample_id is '檢體編號，非病患 ID。';
comment on column public.examinations.include_motility is '本次是否選擇活動力分析，預設 false。';
comment on column public.examinations.template_label is '所選示範範本名稱，選填。';
comment on column public.examinations.created_by is '建立操作人員的 auth.users.id。';
comment on column public.examinations.created_at is '建立時間（含時區）。';
comment on column public.examinations.collected_at is '實際檢體採樣時間，未知時 null；不同於資料建立時間。';
comment on column public.patient_notes.patient_id is '主鍵兼外鍵 patients.id；一位病患最多一筆長期備註。';
comment on column public.patient_notes.note is '可更新的病患長期備註，不是每次檢驗的版本化審核意見。';
comment on column public.patient_notes.updated_by is '最後修改操作人員的 auth.users.id。';
comment on column public.patient_notes.updated_at is '最後修改時間；有對應觸發器的表由資料庫自動更新。';
comment on column public.patients.id is '本表 UUID 主鍵，自動產生。';
comment on column public.patients.patient_code is '唯一病患代碼。';
comment on column public.patients.patient_name is '病患姓名。';
comment on column public.patients.national_id is '身分證號或病歷識別碼；目前未設唯一約束。';
comment on column public.patients.birth_date is '出生日期；年齡由程式計算。';
comment on column public.patients.sex is 'M／F／UNKNOWN。';
comment on column public.patients.phone is '聯絡電話，選填。';
comment on column public.patients.health_card_number is '健保卡號，選填。';
comment on column public.patients.patient_data_source is 'health_card／manual，資料取得方式。';
comment on column public.patients.identity_status is '身分註記，選填。';
comment on column public.patients.created_by is '建立操作人員的 auth.users.id。';
comment on column public.patients.created_at is '建立時間（含時區）。';
comment on column public.patients.updated_at is '最後修改時間；有對應觸發器的表由資料庫自動更新。';
comment on column public.patients.email is '病患預設 Email，選填；實際寄件仍保存獨立收件地址。';
comment on column public.report_exports.id is '本表 UUID 主鍵，自動產生。';
comment on column public.report_exports.report_version_id is '對應 report_versions.id，精確指定某一版報告。';
comment on column public.report_exports.file_path is '私有 reports bucket 的 PDF 物件路徑，唯一；由後端生成與上傳。';
comment on column public.report_exports.file_sha256 is 'PDF 檔案 SHA-256 十六進位摘要，64 位字元；供核對附件內容。';
comment on column public.report_exports.created_by is '建立操作人員的 auth.users.id。';
comment on column public.report_exports.created_at is '建立時間（含時區）。';
comment on column public.report_reviews.id is '本表 UUID 主鍵，自動產生。';
comment on column public.report_reviews.report_version_id is '唯一外鍵，每一版最多一筆確認審核；新版本不繼承。';
comment on column public.report_reviews.reviewed_by is '審核操作者 auth.users.id，不等同已驗證醫師資格。';
comment on column public.report_reviews.reviewed_at is '審核時間（含時區）。';
comment on column public.report_reviews.note is '這一版的審核意見；審核資料不可覆寫。';
comment on column public.report_versions.id is '本表 UUID 主鍵，自動產生。';
comment on column public.report_versions.report_id is '對應 reports.id。';
comment on column public.report_versions.version is '同一報告從 1 遞增；與 report_id 組成唯一約束。';
comment on column public.report_versions.title is '可修改的報告標題。';
comment on column public.report_versions.summary is '可修改的報告摘要。';
comment on column public.report_versions.conclusion is '可修改的報告結論。';
comment on column public.report_versions.recommendations is '可修改的建議／衛教文字。';
comment on column public.report_versions.patient_snapshot is '保存當時病患資訊，不隨後續病患修改而改寫；預設不含身分證／健保卡號。';
comment on column public.report_versions.measurements_snapshot is '由 DB 從原分析複製的數值、單位、檢驗資訊及示範標記；前端不能傳入改量測值。';
comment on column public.report_versions.interpretation_snapshot is '保存當時後端判讀結果與規則版本。';
comment on column public.report_versions.language is '內容語言代碼；預設 zh，前端現有 zh／en／ko。';
comment on column public.report_versions.change_note is '這次改動的說明；透過兩版內容差異還原具體修改。';
comment on column public.report_versions.created_by is '建立操作人員的 auth.users.id。';
comment on column public.report_versions.created_at is '建立時間（含時區）。';
comment on column public.reports.id is '本表 UUID 主鍵，自動產生。';
comment on column public.reports.analysis_record_id is '對應 analysis_records.id，唯一；每筆分析最多一份報告身份，各次修改存子表版本。';
comment on column public.reports.created_by is '建立操作人員的 auth.users.id。';
comment on column public.reports.created_at is '建立時間（含時區）。';
notify pgrst, 'reload schema';
commit;
