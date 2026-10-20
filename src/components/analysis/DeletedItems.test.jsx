import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import {DeletedItems} from './DeletedItems.jsx'
import {getDeletedItems,permanentlyDelete} from '../../services/permanentDelete.js'
vi.mock('../../services/permanentDelete.js',()=>({getDeletedItems:vi.fn(),permanentlyDelete:vi.fn()}))
globalThis.IS_REACT_ACT_ENVIRONMENT=true
it('lists previously archived items but deletes only after individual explicit confirmation',async()=>{
 vi.clearAllMocks()
 const item={id:'old-record',label:'SMP-OLD',updatedAt:'version'}
 getDeletedItems.mockResolvedValueOnce({patients:[],records:[item]}).mockResolvedValueOnce({patients:[],records:[]})
 permanentlyDelete.mockResolvedValue(undefined)
 const container=document.createElement('div'),root=createRoot(container),onChanged=vi.fn()
 const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)
 try{
  act(()=>root.render(React.createElement(DeletedItems,{onChanged})))
  await act(async()=>button('已刪除項目').click())
  expect(container.textContent).toContain('SMP-OLD')
  expect(permanentlyDelete).not.toHaveBeenCalled()
  act(()=>button('永久刪除').click())
  expect(permanentlyDelete).not.toHaveBeenCalled()
  act(()=>button('取消').click())
  expect(permanentlyDelete).not.toHaveBeenCalled()
  act(()=>button('永久刪除').click())
  await act(async()=>button('確認永久刪除').click())
  expect(permanentlyDelete).toHaveBeenCalledWith('record',expect.objectContaining(item))
  expect(onChanged).toHaveBeenCalledOnce()
  expect(container.textContent).toContain('沒有待清理項目')
 }finally{act(()=>root.unmount())}
})
