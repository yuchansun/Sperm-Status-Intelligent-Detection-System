import { beforeEach, describe, expect, it, vi } from 'vitest'
const { replies, calls, db } = vi.hoisted(() => {
 const replies=[],calls=[]
 const db={from:vi.fn(table=>{
  const c={table,steps:[]};calls.push(c)
  const query={then:(resolve,reject)=>Promise.resolve(replies.shift()).then(resolve,reject)}
  for(const method of ['is', 'select','eq','single','or','order','limit','range']) query[method]=(...args)=>{c.steps.push([method,...args]);return query}
  return query
 })}
 return {replies,calls,db}
})
vi.mock('./supabase.js',()=>({supabase:db,supabaseConfigError:''}))
import { searchPatients, getPatientPreview, findPatientByNationalId } from './patientApi.js'
beforeEach(()=>{replies.length=0;calls.length=0;vi.clearAllMocks()})
describe('patient read API',()=>{
 it('searches patients directly, including patients with no analysis, and removes filter syntax',async()=>{
  replies.push({data:[{id:'patient-with-no-exam'}],error:null})
  const found=await searchPatients('測試),id.eq.other%')
  expect(found).toHaveLength(1)
  expect(calls[0].table).toBe('patients')
  const filter=calls[0].steps.find(s=>s[0]==='or')[1]
  expect(filter).not.toContain(')')
  expect(filter.split(',')).toHaveLength(3)
  expect(calls[0].steps).toContainEqual(['range',0,19])
 })
 it('shows query failures instead of treating them as no history',async()=>{
  replies.push({data:{id:'patient'},error:null},{data:null,error:{code:'42501'}})
  await expect(getPatientPreview('patient')).rejects.toThrow('無法讀取')
 })
 it('returns a real empty history for a valid patient with no exams',async()=>{
  replies.push({data:{id:'patient'},error:null},{data:[],error:null})
  await expect(getPatientPreview('patient')).resolves.toMatchObject({patient:{id:'patient'},history:[],hasMore:false})
  expect(calls[1].steps).toContainEqual(['eq','examinations.patient_id','patient'])
 })
})

it('matches exact normalized identity and refuses ambiguous matches', async () => {
 replies.push({data:[{id:'existing'}],error:null})
 expect(await findPatientByNationalId(' test-123 ')).toEqual({id:'existing'})
 expect(calls[0].steps).toContainEqual(['eq','national_id','TEST-123'])
 replies.push({data:[{id:'one'},{id:'two'}],error:null})
 await expect(findPatientByNationalId('TEST-123')).rejects.toThrow('多筆')
})
