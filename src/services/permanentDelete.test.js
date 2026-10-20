import {beforeEach,expect,it,vi} from 'vitest'
const {rpc,remove,from}=vi.hoisted(()=>{
 const rpc=vi.fn(),remove=vi.fn(),from=vi.fn(()=>({remove}));return {rpc,remove,from}
})
vi.mock('./supabase.js',()=>({supabase:{rpc,storage:{from}},supabaseConfigError:''}))
import {permanentlyDelete} from './permanentDelete.js'
const target={id:'record-1',updatedAt:'version'}
beforeEach(()=>{vi.clearAllMocks();remove.mockResolvedValue({error:null})})
it('deletes actual Storage files before finalizing the database and batches large manifests',async()=>{
 rpc.mockResolvedValueOnce({data:{id:'job',files:Array.from({length:101},(_,i)=>({bucket:'exam-videos',path:`video-${i}`})),completed:false}}).mockResolvedValueOnce({data:true})
 await permanentlyDelete('record',target)
 expect(rpc.mock.calls[0]).toEqual(['prepare_permanent_delete',{p_kind:'record',p_id:target.id,p_expected_updated_at:'version'}])
 expect(remove.mock.calls.map(c=>c[0].length)).toEqual([100,1])
 expect(remove.mock.invocationCallOrder.at(-1)).toBeLessThan(rpc.mock.invocationCallOrder[1])
 expect(rpc.mock.calls[1]).toEqual(['finish_permanent_delete',{p_job_id:'job'}])
})
it('does not remove database records after a Storage failure',async()=>{
 rpc.mockResolvedValueOnce({data:{id:'job',files:[{bucket:'exam-images',path:'image'}],completed:false}})
 remove.mockResolvedValueOnce({error:{message:'offline'}})
 await expect(permanentlyDelete('record',target)).rejects.toThrow('尚未完全刪除')
 expect(rpc).toHaveBeenCalledTimes(1)
})
it('recognizes completed retries without removing files again',async()=>{
 rpc.mockResolvedValueOnce({data:{id:'job',files:[],completed:true}})
 await permanentlyDelete('record',target)
 expect(remove).not.toHaveBeenCalled()
 expect(rpc).toHaveBeenCalledTimes(1)
})
it('explains the missing migration before deleting anything',async()=>{
 rpc.mockResolvedValueOnce({error:{code:'PGRST202'}})
 await expect(permanentlyDelete('patient',target)).rejects.toThrow('202610200006_permanent_delete.sql')
 expect(remove).not.toHaveBeenCalled()
})
it('does not report completion if final database cleanup fails',async()=>{
 rpc.mockResolvedValueOnce({data:{id:'job',files:[],completed:false}}).mockResolvedValueOnce({error:{message:'conflict'}})
 await expect(permanentlyDelete('record',target)).rejects.toThrow('刪除尚未完成')
})
