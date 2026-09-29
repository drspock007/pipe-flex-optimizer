import {useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UnitProvider,useUnits} from '@/contexts/UnitContext';
import {DEFAULT_SERVICE} from '@/lib/in-service/types';
import PermanentInputs from '../PermanentInputs';
import {ServiceInputs} from '../ServiceInputs';
it('restricts permanent mode to direct calculation and preserves blanks and canonical values across unit changes',()=>{
 const changes=vi.fn();
 function Form(){const [input,setInput]=useState({...DEFAULT_SERVICE,mode:'length' as const});const units=useUnits();return <><button onClick={units.toggle}>Toggle test units</button><PermanentInputs input={input} onChange={v=>{changes(v);setInput(v as typeof input);}}/><ServiceInputs input={input} onChange={v=>setInput(v as typeof input)}/></>;}
 render(<UnitProvider><Form/></UnitProvider>);
 expect(screen.getByLabelText('Calculation')).not.toBeDisabled();
 fireEvent.change(screen.getByLabelText('Intervention type'),{target:{value:'permanent'}});
 expect(screen.getByLabelText('Calculation')).toBeDisabled();
 expect(screen.getByLabelText('Calculation')).toHaveValue('direct');
 expect(screen.getByLabelText('Final vertical tolerance (mm)')).toHaveValue(10);
 fireEvent.change(screen.getByLabelText('Final vertical tolerance (mm)'),{target:{value:'25.4'}});
 fireEvent.blur(screen.getByLabelText('Final vertical tolerance (mm)'));
 fireEvent.change(screen.getByLabelText('Final lateral tolerance (mm)'),{target:{value:''}});
 const count=changes.mock.calls.length;
 fireEvent.click(screen.getByText('Toggle test units'));
 expect(changes).toHaveBeenCalledTimes(count);
 expect(screen.getByLabelText('Final vertical tolerance (in)')).toHaveValue(1);
 expect(screen.getByLabelText('Final lateral tolerance (in)')).toHaveValue(null);
 expect(changes.mock.calls.at(-1)[0].permanent.verticalTolerance).toBe(25.4);
 fireEvent.change(screen.getByLabelText('Intervention type'),{target:{value:'temporary'}});
 expect(screen.getByLabelText('Calculation')).not.toBeDisabled();
});

it('applies layouts and soil examples explicitly, and shows explanatory help',async()=>{
 function Form(){const [input,setInput]=useState(DEFAULT_SERVICE);return <UnitProvider><PermanentInputs input={input} onChange={setInput}/></UnitProvider>;}
 render(<Form/>);
 fireEvent.change(screen.getByLabelText('Intervention type'),{target:{value:'permanent'}});
 expect(screen.getByLabelText('Gauge pressure (kPa)')).toHaveValue(2000);
 expect(screen.getByLabelText('Temperature (°C)')).toHaveValue(20);
 fireEvent.change(screen.getByLabelText('Backfill layout'),{target:{value:'ends'}});
 fireEvent.click(screen.getByRole('button',{name:'Apply layout (replace zones)'}));
 expect(screen.getAllByLabelText('Activation stage').map(v=>(v as HTMLInputElement).value)).toEqual(['1','2','1']);
 fireEvent.click(screen.getByLabelText('Starting values reviewed'));
 fireEvent.change(screen.getByLabelText('Soil response example zone 1'),{target:{value:'soft'}});
 expect(screen.getByLabelText('Starting values reviewed')).not.toBeChecked();
 expect(screen.getAllByLabelText('axial resistance 2 (N/mm)')[0]).toHaveValue(5);
 fireEvent.click(screen.getByRole('button',{name:/Help: Generate zone extents/}));
 expect(await screen.findByRole('tooltip')).toHaveTextContent('Uniform');
});
