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
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text);
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
 console.log(`PASS: ${checks} database assertions; ${schema.length} columns verified; no remote database accessed.`)
} finally {await db.close()}
