import { act,renderHook } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { useServiceEngine } from '../useServiceEngine';
import { DEFAULT_SERVICE } from '@/lib/in-service/types';
class FakeWorker {
  static instances:FakeWorker[]=[];
  onmessage:((e:{data:unknown})=>void)|null=null;
  onerror:((e:{message:string})=>void)|null=null;
  terminate=vi.fn();postMessage=vi.fn();
  constructor(){FakeWorker.instances.push(this);}
}
afterEach(()=>{vi.unstubAllGlobals();FakeWorker.instances=[];});
describe('in-service worker lifecycle',()=>{
  it('invalidates exports, terminates obsolete work and ignores stale responses',()=>{
    vi.stubGlobal('Worker',FakeWorker);
    const {result,unmount}=renderHook(()=>useServiceEngine());
    act(()=>result.current.run(DEFAULT_SERVICE));const first=FakeWorker.instances[0],oldId=first.postMessage.mock.calls[0][0].id;
    expect(result.current.busy).toBe(true);
    act(()=>result.current.invalidate());expect(first.terminate).toHaveBeenCalled();expect(result.current.report).toBeNull();
    act(()=>result.current.run(DEFAULT_SERVICE));const second=FakeWorker.instances[1],id=second.postMessage.mock.calls[0][0].id;
    act(()=>first.onmessage({data:{id:oldId,report:{message:'stale'}}}));expect(result.current.report).toBeNull();
    act(()=>second.onmessage({data:{id,report:{message:'current'}}}));expect(result.current.report.message).toBe('current');expect(result.current.busy).toBe(false);
    act(()=>result.current.run(DEFAULT_SERVICE));const third=FakeWorker.instances[2];unmount();expect(third.terminate).toHaveBeenCalled();
  });
});
