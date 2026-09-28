import { useState } from 'react';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { afterEach,describe,it,expect } from 'vitest';
import { UnitProvider,useUnits } from '@/contexts/UnitContext';
import { DEFAULT_SERVICE,type ServiceInput } from '@/lib/in-service/types';
import { ServiceCsaInputs,ServiceCsaResults } from '../ServiceCsa';
import { emptyCsa,evaluateCsa } from '@/lib/in-service/csa';
afterEach(cleanup);
function Form(){const [input,setInput]=useState<ServiceInput>(DEFAULT_SERVICE);const {toggle}=useUnits();return <><button onClick={toggle}>Toggle units</button><ServiceCsaInputs input={input} onChange={setInput}/></>;}
describe('CSA design input UI',()=>{
  it('starts disabled, copies only explicit values and preserves missing values on unit changes',()=>{
    render(<UnitProvider><Form/></UnitProvider>);
    const enable=screen.getByRole('checkbox',{name:'Enable separate CSA evaluation'});
    expect(enable).not.toBeChecked();fireEvent.click(enable);
    expect(screen.getByLabelText('Design gauge pressure (kPa)')).toHaveValue(null);
    fireEvent.click(screen.getByRole('button',{name:'Copy operating P/T and analysis thickness'}));
    expect(screen.getByLabelText('Design gauge pressure (kPa)')).toHaveValue(2000);
    expect(screen.getByLabelText('Temperature at anchoring (°C)')).toHaveValue(null);
    expect(screen.getByLabelText('Specified SMYS (MPa)')).toHaveValue(null);
    expect(screen.getByRole('checkbox',{name:/Eligible carbon/})).not.toBeChecked();
    fireEvent.click(screen.getByRole('button',{name:'Toggle units'}));
    expect(screen.getByLabelText('Design gauge pressure (psi)')).toHaveValue(290.075361579);
    expect(screen.getByLabelText('Temperature at anchoring (°F)')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Design gauge pressure (psi)'),{target:{value:''}});
    fireEvent.click(screen.getByRole('button',{name:'Toggle units'}));
    expect(screen.getByLabelText('Design gauge pressure (kPa)')).toHaveValue(null);
  });
  it('renders partial results and reasons without an aggregate CSA pass',()=>{
    const assessment=evaluateCsa({...DEFAULT_SERVICE,csa:{...emptyCsa(),enabled:true}});
    render(<UnitProvider><ServiceCsaResults assessment={assessment}/></UnitProvider>);
    expect(screen.getByText(/No overall CSA compliance verdict/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading',{level:3}).every(h=>h.textContent.includes('Not assessed'))).toBe(true);
    expect(screen.getByText(/solver Euler screen is not a CSA check/)).toBeInTheDocument();
  });
});
