import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientSelector } from './PatientSelector.jsx'
import { searchPatients, getPatientPreview, findPatientByNationalId } from '../../services/patientApi.js'
vi.mock('../../services/patientApi.js', async () => {
 const actual = await vi.importActual('../../services/patientApi.js')
 return { ...actual, searchPatients: vi.fn(), getPatientPreview: vi.fn(), findPatientByNationalId: vi.fn() }
})
const { readCard } = vi.hoisted(() => ({ readCard: vi.fn() }))
vi.mock('../../services/healthCard/getHealthCardReader.ts', () => ({ getHealthCardReader: () => ({ readBasicInfo: readCard }) }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, confirm
const patient = { id: 'existing-id', patient_name: '測試病患', patient_code: 'PT-01', national_id: 'TEST-123456', birth_date: '1990-01-01', sex: 'M', phone: '', email: 'test@example.com', patient_data_source: 'manual', patient_notes: { note: '歷史備註' } }
const button = text => [...container.querySelectorAll('button')].find(b => b.textContent === text)
function input(node, value) {
 const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
 act(() => { setter.call(node,value);node.dispatchEvent(new Event('input',{ bubbles:true })) })
}
async function search() {
 input(container.querySelector('#patient-search'),'測試')
 await act(async () => container.querySelector('form').dispatchEvent(new Event('submit',{ bubbles:true,cancelable:true })))
}
beforeEach(() => {
 vi.clearAllMocks()
 confirm=vi.fn();container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
 readCard.mockResolvedValue({ name: '卡片姓名', nationalId: patient.national_id, birthday: patient.birth_date, sex: 'M' })
 findPatientByNationalId.mockResolvedValue({ id: patient.id })
 searchPatients.mockResolvedValue([patient])
 getPatientPreview.mockResolvedValue({ patient, history: [{ id:'old-record',date:'2026-10-01',sampleId:'OLD-SAMPLE',processingState:'已完成',density:48,motility:'32%',morphology:'4%',isDemo:true,summary:'舊檢測摘要',measurements:{densityUnit:'million/mL'} }] })
 act(() => root.render(React.createElement(PatientSelector,{confirmed:null,onConfirm:confirm,onChangePatient:vi.fn(),locked:false})))
})
afterEach(() => { act(()=>root?.unmount());container?.remove() })
describe('pre-examination patient selection', () => {
 it('reads history and notes before explicit confirmation, without writing a patient', async () => {
  expect(confirm).not.toHaveBeenCalled()
  await search()
  expect(container.textContent).not.toContain(patient.national_id)
  await act(async () => button('選擇並查看歷史').click())
  expect(container.textContent).toContain('歷史備註')
  expect(container.textContent).toContain('舊檢測摘要')
  expect(confirm).not.toHaveBeenCalled()
  act(() => button('確認此病患，繼續本次檢測').click())
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ kind:'existing',patientId:patient.id,draft:expect.objectContaining({patientName:patient.patient_name,email:patient.email}) }))
 })
 it('does not allow confirming a history load failure as an empty history', async () => {
  getPatientPreview.mockRejectedValue(new Error('連線失敗'))
  await search()
  await act(async () => button('選擇並查看歷史').click())
  expect(container.querySelector('[role="alert"]').textContent).toContain('連線失敗')
  expect(button('確認此病患，繼續本次檢測')).toBeUndefined()
 })
 it('allows a patient with no previous examinations', async () => {
  getPatientPreview.mockResolvedValue({patient,history:[]})
  await search();await act(async()=>button('選擇並查看歷史').click())
  expect(container.textContent).toContain('尚無過往分析紀錄')
  expect(button('確認此病患，繼續本次檢測')).toBeDefined()
 })
 it('matches a scanned card to the existing patient and previews history without searching or creating', async () => {
  act(()=>button('新增病患／讀取健保卡').click())
  act(()=>button('讀取健保卡').click())
  await act(async()=>[...container.querySelectorAll('button')].filter(b=>b.textContent==='讀取健保卡').at(-1).click())
  expect(findPatientByNationalId).toHaveBeenCalledWith(patient.national_id)
  expect(searchPatients).not.toHaveBeenCalled()
  expect(container.textContent).toContain('歷史備註')
  expect(container.textContent).toContain('舊檢測摘要')
  expect(confirm).not.toHaveBeenCalled()
  act(()=>button('確認此病患，繼續本次檢測').click())
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({kind:'existing',patientId:patient.id,draft:expect.objectContaining({patientName:patient.patient_name})}))
 })
 it('keeps an unmatched card as a new patient', async () => {
  findPatientByNationalId.mockResolvedValue(null)
  act(()=>button('新增病患／讀取健保卡').click())
  act(()=>button('讀取健保卡').click())
  await act(async()=>[...container.querySelectorAll('button')].filter(b=>b.textContent==='讀取健保卡').at(-1).click())
  act(()=>button('確認病患資料，繼續本次檢測').click())
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({kind:'new',draft:expect.objectContaining({nationalId:patient.national_id})}))
 })
 it('blocks new-patient confirmation if card identity lookup fails', async () => {
  findPatientByNationalId.mockRejectedValue(new Error('比對失敗'))
  act(()=>button('新增病患／讀取健保卡').click())
  act(()=>button('讀取健保卡').click())
  await act(async()=>[...container.querySelectorAll('button')].filter(b=>b.textContent==='讀取健保卡').at(-1).click())
  expect(button('確認病患資料，繼續本次檢測').disabled).toBe(true)
  expect(confirm).not.toHaveBeenCalled()
 })
 it('retains manual and health-card entry and validates before confirming a new patient', () => {
  act(()=>button('新增病患／讀取健保卡').click())
  expect(button('讀取健保卡')).toBeDefined()
  act(()=>button('確認病患資料，繼續本次檢測').click())
  expect(confirm).not.toHaveBeenCalled()
  input(container.querySelector('input[autocomplete="name"]'),'新病患')
  input(container.querySelector('input[type="password"]'),'TEST-NEW-001')
  input(container.querySelector('input[type="date"]'),'1990-01-01')
  act(()=>button('確認病患資料，繼續本次檢測').click())
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({kind:'new',draft:expect.objectContaining({patientName:'新病患'})}))
 })
})
