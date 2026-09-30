import { useEffect,useRef,useState } from 'react';
import type { ServiceInput,ServiceReport } from '@/lib/in-service/types';
export function useServiceEngine() {
  const worker=useRef<Worker|null>(null), sequence=useRef(0);
  const [report,setReport]=useState<ServiceReport|null>(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState('');
  const stop=()=>{sequence.current++;worker.current?.terminate();worker.current=null;setBusy(false);setProgress('');};
  const invalidate=()=>{stop();setReport(null);setError('');};
  useEffect(()=>()=>{worker.current?.terminate();},[]);
  const run=(input:ServiceInput)=>{
    invalidate();const id=sequence.current;
    try {
      const w=new Worker(new URL('../lib/in-service/worker.ts',import.meta.url),{type:'module'});worker.current=w;
      setBusy(true);setProgress('Checking the intervention path and scenario hypotheses…');
      w.onmessage=event=>{
        if(event.data.id!==sequence.current)return;
        if(event.data.progress){setProgress(event.data.progress);return;}
        setReport(event.data.report??null);setError(event.data.error??'');stop();
      };
      w.onerror=event=>{if(id===sequence.current){setError(event.message||'Calculation worker failed.');stop();}};
      w.postMessage({id,input:structuredClone(input)});
    } catch(e) {setError(e instanceof Error?e.message:String(e));stop();}
  };
  return {report,busy,progress,error,run,invalidate,cancel:stop};
}
