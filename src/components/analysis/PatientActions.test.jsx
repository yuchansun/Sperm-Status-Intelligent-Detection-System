import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {PatientActions} from './PatientActions.jsx'
import {getPatient,managePatient} from '../../services/patientApi.js'
vi.mock('../../services/patientApi.js',async()=>({...await vi.importActual('../../services/patientApi.js'),getPatient:vi.fn(),managePatient:vi.fn()}))
globalThis.IS_REACT_ACT_ENVIRONMENT=true
let root,container,saved,deleted
const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)
beforeEach(()=>{
 vi.clearAllMocks();saved=vi.fn();deleted=vi.fn()
 getPatient.mockResolvedValue({id:'p',updated_at:'version',patient_name:'病患',national_id:'TEST-001',birth_date:'1990-01-01',sex:'M',phone:'',email:'',health_card_number:'',patient_data_source:'manual'})
 managePatient.mockResolvedValue(undefined)
 container=document.createElement('div');root=createRoot(container)
 act(()=>root.render(React.createElement(PatientActions,{patientId:'p',onSaved:saved,onDeleted:deleted})))
})
afterEach(()=>act(()=>root.unmount()))
it('loads fresh patient data before editing and preserves identity keys and version',async()=>{
 await act(async()=>button('修改病患資料').click())
 expect(getPatient).toHaveBeenCalledWith('p')
 expect(container.textContent).not.toContain('性別')
 await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(managePatient).toHaveBeenCalledWith({id:'p',updatedAt:'version'},expect.objectContaining({national_id:'TEST-001',patient_name:'病患'}),false)
 expect(saved).toHaveBeenCalledOnce()
})
it('does not delete until explicitly confirmed',async()=>{
 await act(async()=>button('刪除病患').click())
 expect(managePatient).not.toHaveBeenCalled()
 act(()=>button('取消').click())
 expect(managePatient).not.toHaveBeenCalled()
 await act(async()=>button('刪除病患').click())
 await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(managePatient).toHaveBeenCalledWith({id:'p',updatedAt:'version'},{},true)
 expect(deleted).toHaveBeenCalledOnce()
})
it('retains the form if the database rejects a conflicting edit',async()=>{
 managePatient.mockRejectedValue(new Error('識別碼已被使用'))
 await act(async()=>button('修改病患資料').click())
 await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(container.querySelector('[role="alert"]').textContent).toContain('識別碼已被使用')
 expect(saved).not.toHaveBeenCalled()
 expect(container.querySelector('form')).not.toBeNull()
})
