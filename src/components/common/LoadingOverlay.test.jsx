import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../context/language.js',()=>({useLanguage:()=>({t:{}})}))
import { LoadingOverlay } from './LoadingOverlay.jsx'
globalThis.IS_REACT_ACT_ENVIRONMENT=true
let root,container
afterEach(()=>{act(()=>root?.unmount());container?.remove()})
function render(props){container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);act(()=>root.render(React.createElement(LoadingOverlay,{isOpen:true,...props})))}
describe('honest upload progress',()=>{
 it('does not show a fake percentage while saving database records',()=>{
  render({title:'正在儲存',status:'正在確認登入狀態',elapsedSeconds:5})
  expect(container.querySelector('[role="progressbar"]')).toBeNull()
  expect(container.textContent).toContain('正在確認登入狀態')
 })
 it('shows measured percentage and a cancel action',()=>{
  const cancel=vi.fn()
  render({title:'上傳',progress:{loaded:12000000,total:24000000,percent:50},elapsedSeconds:30,onCancel:cancel})
  expect(container.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('50')
  expect(container.textContent).toContain('12.0 / 24.0 MB')
  act(()=>container.querySelector('button').click());expect(cancel).toHaveBeenCalledOnce()
 })
})
