import {useState} from 'react';
import {Tooltip,TooltipContent,TooltipTrigger,TooltipProvider} from '@/components/ui/tooltip';
import {Info} from 'lucide-react';
export default function FieldHelp({text}:{text:string}){
 const [open,setOpen]=useState(false);
 return <TooltipProvider delayDuration={200}><Tooltip open={open} onOpenChange={setOpen}><TooltipTrigger asChild><span tabIndex={0} role="button" aria-label={`Help: ${text}`} onClick={e=>{e.preventDefault();setOpen(v=>!v);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(v=>!v);}}} className="inline-flex align-middle ml-1 cursor-help text-muted-foreground"><Info aria-hidden="true" size={13}/></span></TooltipTrigger><TooltipContent className="max-w-72 text-xs leading-relaxed">{text}</TooltipContent></Tooltip></TooltipProvider>;
}
