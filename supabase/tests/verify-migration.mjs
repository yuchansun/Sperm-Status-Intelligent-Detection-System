// Run against an ephemeral PGlite database; never connects to Supabase.
// node supabase/tests/verify-migration.mjs /path/to/@electric-sql/pglite/dist/index.js
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.argv[2] || '@electric-sql/pglite')
const db = new PGlite()
const migration = await fs.readFile(new URL('../migrations/202610190001_complete_records.sql',import.meta.url),'utf8')
const baseline = JSON.parse(await fs.readFile(new URL('../../docs/supabase-columns.json',import.meta.url),'utf8'))
const user = '00000000-0000-4000-8000-000000000001'
const patient = '00000000-0000-4000-8000-000000000002'
const exam = '00000000-0000-4000-8000-000000000003'
const analysis = '00000000-0000-4000-8000-000000000004'
let checks=0
const check=(condition,message)=>{assert.ok(condition,message);checks++}
async function rejected(sql,params=[],pattern) {
  try { await db.query(sql,params) } catch(error) {
    if(pattern) assert.match(error.message,pattern)
    checks++;return
  }
  assert.fail(`Expected rejection: ${sql}`)
}
try {
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema public,auth,storage to authenticated,anon,service_role;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
 `)
 for(const table of ['patients','examinations','analysis_records','patient_notes']) {
  const cols=baseline.filter(c=>c.table_name===table).map(c=>`"${c.column_name}" ${c.data_type}${c.is_nullable==='NO'?' not null':''}${c.column_default?' default '+c.column_default:''}`)
  cols.push(`primary key(${table==='patient_notes'?'patient_id':'id'})`)
  if(table==='patients') cols.push('unique(patient_code)')
  if(table==='examinations') cols.push('unique(examination_code)','foreign key(patient_id) references public.patients(id)')
  if(table==='analysis_records') cols.push('foreign key(examination_id) references public.examinations(id)')
  if(table==='patient_notes') cols.push('foreign key(patient_id) references public.patients(id)')
  await db.exec(`create table public.${table}(${cols.join(',')}); alter table public.${table} enable row level security; grant select,insert,update on public.${table} to authenticated; grant all on public.${table} to service_role; create policy baseline on public.${table} to authenticated using(true) with check(true);`)
 }
 await db.query('insert into auth.users values($1)',[user])
 await db.query("insert into patients(id,patient_code,patient_name,national_id,birth_date,sex,patient_data_source) values($1,'TEST','測試','TEST-1','1990-01-01','M','manual')",[patient])
 await db.query("insert into examinations(id,examination_code,patient_id,sample_id) values($1,'EX-TEST',$2,'SAMPLE-TEST')",[exam,patient])
 await db.query("insert into analysis_records(id,examination_id,sample_id,density,motility,morphology) values($1,$2,'SAMPLE-TEST','unparseable','32%','4%')",[analysis,exam])
 try {await db.exec(migration);assert.fail('Bad legacy value must abort')} catch(error) {
  assert.match(error.message,/Cannot convert/);checks++;await db.exec('rollback')
 }
 check((await db.query("select density from analysis_records")).rows[0].density==='unparseable','rollback preserves original')
 check((await db.query("select to_regclass('public.reports') as name")).rows[0].name===null,'rollback removes partial DDL')
 await db.query("update analysis_records set density='48M/mL'")
 await db.exec(migration)
 const converted=(await db.query('select * from analysis_records')).rows[0]
 check(Number(converted.density)===48 && Number(converted.motility)===32 && Number(converted.morphology)===4,'numeric migration')
 check(converted.legacy_metrics.motility==='32%','preserve legacy spellings')
 await db.exec(migration)
 check((await db.query('select count(*)::integer as n from analysis_records')).rows[0].n===1,'rerun preserves rows')
 await rejected("update analysis_records set motility=101")
 await rejected("update analysis_records set density='NaN'")
 await db.exec('set role anon')
 await rejected('select * from report_versions',[],/permission denied/)
 await db.exec('reset role')
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
 await db.exec('set role authenticated')
 const save=()=>db.query('select * from public.save_report_version($1,$2,$3,$4,$5,$6,$7,$8)',[analysis,0,'報告','摘要','結論','建議','zh','初版'])
 const version=(await save()).rows[0]
 check(version.version===1,'first report version')
 check(version.measurements_snapshot.density===48,'snapshot numeric source')
 check(!('national_id' in version.patient_snapshot),'do not export national ID by default')
 await rejected('select public.save_report_version($1,0,$2,$3,$4,$5,$6,$7)',[analysis,'報告','摘要','結論','建議','zh','old'],/Report changed/)
 await rejected("update report_versions set title='tamper'")
 await rejected("insert into report_versions(report_id,version,title,patient_snapshot,measurements_snapshot) values($1,2,'tamper','{}','{}')",[version.report_id])
 const reviewed=(await db.query("select * from review_report_version($1,'確認')",[version.id])).rows[0]
 check(reviewed.reviewed_by===user,'report reviewer captured')
 const second=(await db.query('select * from save_report_version($1,1,$2,$3,$4,$5,$6,$7)',[analysis,'第二版','修改摘要','結論','建議','zh','修改摘要'])).rows[0]
 check(second.version===2,'second report version')
 check((await db.query('select count(*)::int as n from report_reviews where report_version_id=$1',[second.id])).rows[0].n===0,'new version has no inherited approval')
 await db.query("update analysis_records set processing_state='已完成' where id=$1",[analysis])
 check((await db.query('select reviewed_by from analysis_records')).rows[0].reviewed_by===user,'analysis reviewer captured')
 await db.query('update analysis_records set density=49 where id=$1',[analysis])
 const invalidated=(await db.query('select processing_state,reviewed_by from analysis_records')).rows[0]
 check(invalidated.processing_state==='待複核' && invalidated.reviewed_by===null,'measurement edits invalidate review')
 const draft=(await db.query("insert into email_drafts(patient_id,report_version_id,to_email,subject,body) values($1,$2,'test@example.com','主旨','內文') returning *",[patient,version.id])).rows[0]
 const key='00000000-0000-4000-8000-000000000010'
 const queued=(await db.query('select * from queue_email_delivery($1,1,$2,true)',[draft.id,key])).rows[0]
 check(queued.status==='queued' && queued.to_email==='test@example.com','queue freezes email')
 const retry=(await db.query('select * from queue_email_delivery($1,1,$2,true)',[draft.id,key])).rows[0]
 check(retry.id===queued.id,'queue retry is idempotent')
 await db.query("update email_drafts set subject='改主旨' where id=$1",[draft.id])
 check((await db.query('select subject from email_deliveries where id=$1',[queued.id])).rows[0].subject==='主旨','draft edit does not rewrite sent content')
 await rejected('select queue_email_delivery($1,1,gen_random_uuid(),false)',[draft.id],/Draft changed/)
 await rejected("update email_deliveries set status='delivered'")
 await db.exec('reset role')
 check((await db.query("select public from storage.buckets where id='reports'")).rows[0].public===false,'private PDF storage')
 await db.exec('set role service_role')
 await db.query("update email_deliveries set status='accepted',provider='test',provider_message_id='msg-1',accepted_at=now() where id=$1",[queued.id])
 await db.query("insert into email_delivery_events(delivery_id,provider,provider_event_id,event_type,occurred_at) values($1,'test','evt-1','accepted',now())",[queued.id])
 await rejected("insert into email_delivery_events(delivery_id,provider,provider_event_id,event_type,occurred_at) values($1,'test','evt-1','accepted',now())",[queued.id],/duplicate/)
 await db.exec('reset role')
 const schema=(await db.query("select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position")).rows
 await fs.writeFile('/private/tmp/sperm-schema-v2-verified.json',JSON.stringify(schema,null,2))
 const mediaMigration = await fs.readFile(new URL('../migrations/202610190002_exam_media.sql',import.meta.url),'utf8')
 await db.exec(mediaMigration)
 await db.exec(mediaMigration)
 check((await db.query("select public,file_size_limit from storage.buckets where id='exam-videos'")).rows[0].public===false,'video bucket private')
 await db.exec('set role authenticated')
 await db.query("insert into exam_media(analysis_record_id,media_kind,bucket_id,object_path,original_filename,mime_type,size_bytes) values($1,'video','exam-videos',$2,'test.mov','video/quicktime',1024)",[analysis,`${user}/test.mov`])
 await rejected('update exam_media set size_bytes=50000001')
 await rejected("update exam_media set object_path='someone-else/test.mov'")
 await rejected("update exam_media set bucket_id='exam-images'")
 check((await db.query('select upload_status from exam_media')).rows[0].upload_status==='pending','metadata pending until successful upload')
 await db.query("update exam_media set upload_status='ready'")
 await db.exec('reset role')
 await db.exec(`alter table public.exam_media drop constraint si_media_file_policy;
  alter table public.exam_media add constraint old_media_file_check check(
   (media_kind='image' and bucket_id='exam-images' and mime_type in ('image/jpeg','image/png','image/webp') and size_bytes<=10485760)
   or (media_kind='video' and bucket_id='exam-videos' and mime_type like 'video/%' and size_bytes<=20971520));
  update storage.buckets set file_size_limit=20971520 where id='exam-videos';`)
 await db.exec(mediaMigration)
 check(Number((await db.query("select file_size_limit from storage.buckets where id='exam-videos'")).rows[0].file_size_limit)===50000000,'upgrades existing 20 MiB bucket to decimal 50 MB')
 await db.exec('set role authenticated')
 await db.query('update exam_media set size_bytes=50000000')
 check(Number((await db.query('select size_bytes from exam_media')).rows[0].size_bytes)===50000000,'accepts exact 50 MB and preserves existing media record')
 await rejected('update exam_media set size_bytes=52428800')
 await db.exec('reset role; set role anon')
 await rejected('select * from exam_media')
 await db.exec('reset role')
 const mediaColumns=(await db.query("select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='exam_media' order by ordinal_position")).rows
 await fs.writeFile('/private/tmp/sperm-media-schema.json',JSON.stringify(mediaColumns,null,2))
 const serialMigration=await fs.readFile(new URL('../migrations/202610190003_sample_serial.sql',import.meta.url),'utf8')
 await db.exec(serialMigration)
 await db.exec('set role authenticated')
 const serialExam='00000000-0000-4000-8000-000000000099'
 const createSpecimen=id=>db.query('select * from ensure_examination($1,$2,false,$3)',[id,patient,'示範'])
 const first=(await createSpecimen(serialExam)).rows[0]
 check(first.sample_id==='SMP-00000001','database generates first specimen serial')
 check((await createSpecimen(serialExam)).rows[0].sample_id===first.sample_id,'retry preserves specimen serial')
 await db.exec('reset role')
 await db.exec(serialMigration)
 await db.exec('set role authenticated')
 const secondSpecimen=(await createSpecimen('00000000-0000-4000-8000-000000000098')).rows[0]
 check(secondSpecimen.sample_id==='SMP-00000002','migration rerun preserves sequence progress')
 await rejected('select * from ensure_examination($1,$2,false,$3)',[serialExam,user,'wrong patient'])
 await db.exec('reset role; set role anon')
 await rejected('select * from ensure_examination($1,$2,false,$3)',[serialExam,patient,'anonymous'])
 await db.exec('reset role')
 check((await db.query('select sample_id from examinations where id=$1',[exam])).rows[0].sample_id==='SAMPLE-TEST','legacy specimen remains unchanged')
 const management=await fs.readFile(new URL('../migrations/202610200004_record_management.sql',import.meta.url),'utf8')
 await db.exec(management); await db.exec(management)
 await db.exec('set role authenticated')
 const beforeEdit=(await db.query('select * from analysis_records where id=$1',[analysis])).rows[0]
 const patch={exam_date:'2026-10-20',density:55.5,motility:null,morphology:6,amount:2,ph:7.4,color:'乳白色',appearance:'混濁',count_of_spermatozoa:111,summary:'修改摘要'}
 const manage=(version,values,remove=false)=>db.query('select manage_analysis_record($1,$2,$3,$4)',[analysis,version,JSON.stringify(values),remove])
 await manage(beforeEdit.updated_at,patch)
 const edited=(await db.query('select * from analysis_records where id=$1',[analysis])).rows[0]
 check(Number(edited.density)===55.5 && edited.summary==='修改摘要','persists edited numeric results and summary')
 check(edited.processing_state==='待複核' && edited.reviewed_at===null,'editing resets review')
 check(edited.ai_result.normalRate==='6%' && edited.ai_result.motility==='—','updates display values consistently')
 check((await db.query('select count(*)::int as n from report_versions')).rows[0].n>0,'report snapshots preserved after editing')
 await rejected('select manage_analysis_record($1,$2,$3,false)',[analysis,beforeEdit.updated_at,JSON.stringify(patch)],/Record changed/)
 await rejected('select manage_analysis_record($1,$2,$3,false)',[analysis,edited.updated_at,JSON.stringify({...patch,motility:101})])
 await manage(edited.updated_at,{},true)
 const removed=(await db.query('select * from analysis_records where id=$1',[analysis])).rows[0]
 check(removed.deleted_at!==null && removed.deleted_by===user,'soft delete records actor and time')
 check((await db.query('select count(*)::int as n from analysis_records where deleted_at is null')).rows[0].n===0,'deleted record excluded from active history')
 check((await db.query('select count(*)::int as n from exam_media')).rows[0].n===1,'private media metadata preserved')
 check((await db.query('select count(*)::int as n from patients')).rows[0].n===1,'patient preserved')
 await db.exec('reset role; set role anon')
 await rejected('select manage_analysis_record($1,$2,$3,true)',[analysis,removed.updated_at,'{}'],/permission denied/)
 await db.exec('reset role')
 const patientManagement=await fs.readFile(new URL('../migrations/202610200005_patient_management.sql',import.meta.url),'utf8')
 await db.exec(patientManagement);await db.exec(patientManagement)
 await db.exec('set role authenticated')
 const beforePatient=(await db.query('select * from patients where id=$1',[patient])).rows[0]
 const patientPatch={patient_name:'更新姓名',national_id:'TEST-UPDATED',birth_date:'1991-01-01',phone:'0912345678',email:'updated@example.com',health_card_number:'123456'}
 await db.query('select manage_patient($1,$2,$3,false)',[patient,beforePatient.updated_at,JSON.stringify(patientPatch)])
 const updatedPatient=(await db.query('select * from patients where id=$1',[patient])).rows[0]
 check(updatedPatient.patient_name==='更新姓名'&&updatedPatient.email==='updated@example.com','patient changes persisted')
 check(updatedPatient.id===patient&&updatedPatient.patient_code===beforePatient.patient_code,'patient keys remain stable')
 await rejected('select manage_patient($1,$2,$3,false)',[patient,beforePatient.updated_at,JSON.stringify(patientPatch)],/Patient changed/)
 await rejected("insert into patients(patient_code,patient_name,national_id,birth_date,sex,patient_data_source) values('OTHER','duplicate','TEST-UPDATED','1990-01-01','M','manual')",[],/Duplicate patient/)
 await db.query('select manage_patient($1,$2,$3,true)',[patient,updatedPatient.updated_at,'{}'])
 const archived=(await db.query('select * from patients where id=$1',[patient])).rows[0]
 check(archived.deleted_at!==null&&archived.deleted_by===user,'patient soft deletion is attributed')
 check((await db.query('select count(*)::int n from patients where deleted_at is null')).rows[0].n===0,'patient hidden from active lookup')
 check((await db.query('select count(*)::int n from examinations')).rows[0].n===3,'all examinations preserved')
 check((await db.query('select count(*)::int n from report_versions')).rows[0].n>0,'patient deletion preserves reports')
 check((await db.query('select count(*)::int n from exam_media')).rows[0].n===1,'patient deletion preserves private media')
 await rejected('select * from ensure_examination($1,$2,false,$3)',['00000000-0000-4000-8000-000000000097',patient,'stale selection'],/Patient unavailable/)
 await db.exec('reset role;set role anon')
 await rejected('select manage_patient($1,$2,$3,true)',[patient,archived.updated_at,'{}'],/permission denied/)
 await db.exec('reset role')
 const permanentMigration=await fs.readFile(new URL('../migrations/202610200006_permanent_delete.sql',import.meta.url),'utf8')
 await db.exec(permanentMigration);await db.exec(permanentMigration)
 await db.query("insert into storage.objects(bucket_id,name) values('exam-videos',$1)",[`${user}/test.mov`])
 await db.exec('set role anon')
 await rejected('select prepare_permanent_delete($1,$2,$3)',['patient',patient,archived.updated_at],/permission denied/)
 await db.exec('reset role;set role authenticated')
 const trash=(await db.query('select list_deleted_items() as result')).rows[0].result
 check(trash.patients.length===1,'previously soft deleted patient can be cleaned')
 const job=(await db.query('select prepare_permanent_delete($1,$2,$3)',['patient',patient,archived.updated_at])).rows[0].prepare_permanent_delete
 await rejected('update patients set patient_name=$1 where id=$2',['late edit',patient],/Permanent deletion in progress/)
 await rejected('update analysis_records set summary=$1 where id=$2',['late edit',analysis],/Permanent deletion in progress/)
 await rejected("update exam_media set object_path='different.mov'",[],/Permanent deletion in progress/)
 check(job.files.some(f=>f.bucket==='exam-videos'&&f.path===`${user}/test.mov`),'manifest includes original private video')
 check((await db.query('select prepare_permanent_delete($1,$2,$3)',['patient',patient,archived.updated_at])).rows[0].prepare_permanent_delete.id===job.id,'retry reuses deletion job')
 check((await db.query('select si_may_purge_object($1,$2) as allowed',['exam-videos',`${user}/test.mov`])).rows[0].allowed,'Storage permission scoped to job manifest')
 check(!(await db.query('select si_may_purge_object($1,$2) as allowed',['exam-videos','another-video.mov'])).rows[0].allowed,'other files cannot be deleted')
 await rejected('select finish_permanent_delete($1)',[job.id],/Files remain/)
 check((await db.query('select count(*)::int n from patients')).rows[0].n===1,'database preserved until files removed')
 await db.exec('reset role')
 // Simulate successful Storage API deletion in this local metadata-only fixture.
 // Production NEVER directly deletes storage.objects.
 await db.query('delete from storage.objects where bucket_id=$1 and name=$2',['exam-videos',`${user}/test.mov`])
 await db.exec('set role authenticated')
 check((await db.query('select finish_permanent_delete($1) as done',[job.id])).rows[0].done===true,'permanent deletion completes')
 for(const table of ['patients','examinations','analysis_records','exam_media','reports','report_versions','report_reviews','report_exports','email_drafts','email_deliveries','email_delivery_events','patient_notes']) {
  check((await db.query(`select count(*)::int n from ${table}`)).rows[0].n===0,`${table} dependency removed`)
 }
 check((await db.query('select finish_permanent_delete($1) as done',[job.id])).rows[0].done===true,'completion retry is idempotent')
 await db.exec('reset role')
 // A single-record purge must retain the patient and every other examination.
 await db.query("insert into patients(id,patient_code,patient_name,national_id,birth_date,sex,patient_data_source) values($1,'NEW-P','new patient','NEW-ID','1990-01-01','M','manual')",[patient])
 await db.query("insert into examinations(id,examination_code,patient_id,sample_id) values($1,'NEW-E',$2,'NEW-SAMPLE')",[exam,patient])
 await db.query("insert into analysis_records(id,examination_id,sample_id) values($1,$2,'NEW-SAMPLE')",[analysis,exam])
 const otherRecord='00000000-0000-4000-8000-000000000088'
 await db.query("insert into analysis_records(id,examination_id,sample_id) values($1,$2,'OTHER')",[otherRecord,exam])
 await db.exec('set role authenticated')
 const activeRecord=(await db.query('select * from analysis_records where id=$1',[analysis])).rows[0]
 const singleJob=(await db.query('select prepare_permanent_delete($1,$2,$3)',['record',analysis,activeRecord.updated_at])).rows[0].prepare_permanent_delete
 await db.query('select finish_permanent_delete($1)',[singleJob.id])
 check((await db.query('select count(*)::int n from patients')).rows[0].n===1,'single deletion retains patient')
 check((await db.query('select count(*)::int n from examinations')).rows[0].n===1,'shared examination remains for other analysis')
 check((await db.query('select id from analysis_records')).rows[0].id===otherRecord,'other record untouched')
 await db.exec('reset role')
 const reservationMigration=await fs.readFile(new URL('../migrations/202610200007_reserve_specimen.sql',import.meta.url),'utf8')
 await db.exec(reservationMigration);await db.exec(reservationMigration)
 await db.exec('set role authenticated')
 const reservedExam='00000000-0000-4000-8000-000000000077'
 const reserve=()=>db.query('select reserve_specimen_number($1) as sample',[reservedExam])
 const reserved=(await reserve()).rows[0].sample
 check(/^SMP-[0-9]{8,}$/.test(reserved),'reserves actual sequential serial')
 check((await reserve()).rows[0].sample===reserved,'repeated reservation preserves displayed serial')
 check((await db.query('select count(*)::int n from examinations where id=$1',[reservedExam])).rows[0].n===0,'reservation does not create an examination or patient')
 const savedExam=(await db.query('select * from ensure_examination($1,$2,true,$3)',[reservedExam,patient,'reserved demo'])).rows[0]
 check(savedExam.sample_id===reserved,'submission stores the exact displayed specimen serial')
 check((await reserve()).rows[0].sample===reserved,'reserving after submission is stable')
 await rejected('select * from specimen_reservations',[],/permission denied/)
 await db.exec('reset role;set role anon')
 await rejected('select reserve_specimen_number($1)',[reservedExam],/permission denied/)
 await db.exec('reset role')
 console.log(`PASS: ${checks} database assertions; ${schema.length} columns verified; no remote database accessed.`)
} finally {await db.close()}
