-- Apply after 202610190001_complete_records.sql. Adds private video storage; no existing files moved.
begin;
create table if not exists public.exam_media (
 id uuid primary key default gen_random_uuid(),
 analysis_record_id uuid not null unique references public.analysis_records(id) on delete restrict,
 media_kind text not null check(media_kind in ('image','video')),
 bucket_id text not null,
 object_path text not null,
 original_filename text not null,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes > 0),
 duration_seconds numeric check(duration_seconds >= 0 and duration_seconds::text not in ('NaN','Infinity','-Infinity')),
 upload_status text not null default 'pending' check(upload_status in ('pending','ready')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(bucket_id,object_path),
 constraint si_media_file_policy check((media_kind='image' and bucket_id='exam-images' and mime_type in ('image/jpeg','image/png','image/webp') and size_bytes<=10485760)
    or (media_kind='video' and bucket_id='exam-videos' and mime_type like 'video/%' and size_bytes<=50000000))
);
-- Upgrade the previously supplied 20 MiB rule without deleting records or objects.
do $$
declare c record;
begin
 for c in select conname,pg_get_constraintdef(oid) as definition
   from pg_constraint where conrelid='public.exam_media'::regclass and contype='c' loop
   if c.definition like '%20971520%' and c.definition like '%exam-videos%' and c.definition like '%10485760%' then
     execute format('alter table public.exam_media drop constraint %I',c.conname);
   end if;
 end loop;
 if not exists(select 1 from pg_constraint where conrelid='public.exam_media'::regclass and conname='si_media_file_policy') then
   alter table public.exam_media add constraint si_media_file_policy check(
     (media_kind='image' and bucket_id='exam-images' and mime_type in ('image/jpeg','image/png','image/webp') and size_bytes<=10485760)
     or (media_kind='video' and bucket_id='exam-videos' and mime_type like 'video/%' and size_bytes<=50000000));
 end if;
end $$;
comment on table public.exam_media is '每筆分析最多一個本次上傳的原始照片或影片；不自動搬入舊影像。';
comment on column public.exam_media.analysis_record_id is '唯一分析外鍵，一次只上傳一個原始檔案。';
comment on column public.exam_media.duration_seconds is '影片秒數；瀏覽器無法讀取時為 null，不影響保存，不代表已分析。';
comment on column public.exam_media.object_path is '私有物件路徑，不存簽名 URL。';
alter table public.exam_media enable row level security;
revoke all on public.exam_media from anon,authenticated;
grant select,insert,update on public.exam_media to authenticated;
grant all on public.exam_media to service_role;
create or replace trigger si_media_updated before insert or update on public.exam_media
for each row execute function public.si_stamp_changes();
do $$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='exam_media' and policyname='si_media_read') then
  create policy si_media_read on public.exam_media for select to authenticated using(true);
  create policy si_media_insert on public.exam_media for insert to authenticated
    with check(created_by=auth.uid() and split_part(object_path,'/',1)=auth.uid()::text);
  create policy si_media_update on public.exam_media for update to authenticated
    using(created_by=auth.uid()) with check(created_by=auth.uid() and split_part(object_path,'/',1)=auth.uid()::text);
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('exam-videos','exam-videos',false,50000000,array['video/*']) on conflict(id) do nothing;
do $$
begin
 if exists(select 1 from storage.buckets where id='exam-videos' and (public or file_size_limit not in (20971520,50000000) or file_size_limit is null or allowed_mime_types is distinct from array['video/*'])) then
  raise exception 'Existing exam-videos bucket differs from expected private / known video size / video MIME settings';
 end if;
 update storage.buckets set file_size_limit=50000000 where id='exam-videos' and file_size_limit=20971520;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='si_videos_read') then
  create policy si_videos_read on storage.objects for select to authenticated using(bucket_id='exam-videos');
  create policy si_videos_insert on storage.objects for insert to authenticated
    with check(bucket_id='exam-videos' and split_part(name,'/',1)=auth.uid()::text);
  create policy si_videos_update on storage.objects for update to authenticated
    using(bucket_id='exam-videos' and split_part(name,'/',1)=auth.uid()::text)
    with check(bucket_id='exam-videos' and split_part(name,'/',1)=auth.uid()::text);
 end if;
end $$;
notify pgrst,'reload schema';
commit;
