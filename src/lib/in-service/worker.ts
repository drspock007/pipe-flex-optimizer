import { runService } from './run';
import type { ServiceInput } from './types';
self.onmessage=(event:MessageEvent<{id:number;input:ServiceInput}>)=>{
  const {id,input}=event.data;
  try {self.postMessage({id,report:runService(input,progress=>self.postMessage({id,progress}))});}
  catch(error) {self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
