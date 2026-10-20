import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RecordActions } from './RecordActions.jsx'
import { manageCloudRecord } from '../../services/cloudApi.js'
vi.mock('../../services/cloudApi.js',()=>({manageCloudRecord:vi.fn()}))
globalThis.IS_REACT_ACT_ENVIRONMENT=true
let container,root,saved,deleted
const record={id:'record',sampleId:'SMP-1',date:'2026-10-20',updatedAt:'version',summary:'摘要',measurements:{density:30,morphology:4,motility:null,amount:2,ph:7.4}}
const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)
beforeEach(()=>{
 vi.clearAllMocks();manageCloudRecord.mockResolvedValue(undefined)
 container=document.createElement('div');root=createRoot(container);saved=vi.fn();deleted=vi.fn()
 act(()=>root.render(React.createElement(RecordActions,{record,onSaved:saved,onDeleted:deleted})))
})
afterEach(()=>act(()=>root.unmount()))
it('requires explicit delete confirmation and allows cancellation',async()=>{
 act(()=>button('刪除檢測').click())
 expect(manageCloudRecord).not.toHaveBeenCalled()
 act(()=>button('取消').click())
 expect(manageCloudRecord).not.toHaveBeenCalled()
 act(()=>button('刪除檢測').click())
 await act(async()=>button('確認刪除').click())
 expect(manageCloudRecord).toHaveBeenCalledWith(record,{},true)
 expect(deleted).toHaveBeenCalledOnce()
})
it('saves numeric measurements with missing data as null',async()=>{
 act(()=>button('修改檢測').click())
 await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
 expect(manageCloudRecord).toHaveBeenCalledWith(record,expect.objectContaining({density:30,morphology:4,motility:null,amount:2,summary:'摘要',count_of_spermatozoa:null}))
 expect(saved).toHaveBeenCalledOnce()
})
it('keeps the form open and does not claim success when the database rejects the operation',async()=>{
 manageCloudRecord.mockRejectedValue(new Error('紀錄已變更'))
 act(()=>button('刪除檢測').click())
 await act(async()=>button('確認刪除').click())
 expect(container.querySelector('[role="alert"]').textContent).toContain('紀錄已變更')
 expect(deleted).not.toHaveBeenCalled()
 expect(button('確認刪除')).toBeDefined()
})
