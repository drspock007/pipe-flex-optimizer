import {useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import {UnitProvider} from '@/contexts/UnitContext';
import {DEFAULT_SERVICE} from '@/lib/in-service/types';
import {ServiceInputs} from '../ServiceInputs';
it('exposes full spans, hides movement, empties gas explicitly and retains movement settings',()=>{
 function Form(){const [i,set]=useState(DEFAULT_SERVICE);return <UnitProvider><ServiceInputs input={i} onChange={set}/></UnitProvider>;}
 render(<Form/>);
 fireEvent.change(screen.getByLabelText('Fluid'),{target:{value:'air'}});
 fireEvent.click(screen.getByRole('button',{name:'Empty pipe, no pressure'}));
 expect(screen.getByLabelText('Fluid')).toHaveValue('custom');expect(screen.getByLabelText('Fluid density at operating P/T (kg/m3)')).toHaveValue(0);expect(screen.getByLabelText('Internal gauge pressure (kPa)')).toHaveValue(0);
 fireEvent.change(screen.getByLabelText('Analysis type'),{target:{value:'sag'}});
 expect(screen.queryByLabelText('Target amplitude (mm)')).toBeNull();expect(screen.queryByLabelText('Support layout')).toBeNull();
 expect(screen.getByLabelText('Full span L (m)')).toHaveValue(20);
 fireEvent.change(screen.getByLabelText('Full span L (m)'),{target:{value:'12'}});
 fireEvent.click(screen.getByLabelText('Sag boundary conditions confirmed'));
 fireEvent.change(screen.getByLabelText('Sag end conditions'),{target:{value:'simple'}});
 expect(screen.getByLabelText('Sag boundary conditions confirmed')).not.toBeChecked();
 fireEvent.change(screen.getByLabelText('Sag calculation'),{target:{value:'length'}});
 expect(screen.getByLabelText('Maximum full span (m)')).toHaveValue(100);
 fireEvent.change(screen.getByLabelText('Analysis type'),{target:{value:'movement'}});
 expect(screen.getByLabelText('Target amplitude (mm)')).toHaveValue(200);expect(screen.getByLabelText('Length on each side (m)')).toHaveValue(6);
});
