import { useState } from 'react';
import { render,screen,fireEvent } from '@testing-library/react';
import { it,expect } from 'vitest';
import { UnitProvider } from '@/contexts/UnitContext';
import { DEFAULT_SERVICE } from '@/lib/in-service/types';
import { ServiceInputs } from '../ServiceInputs';
it('selects a gas, updates density from P/T, and restores editable custom density',()=>{
  function Form(){const [input,setInput]=useState(DEFAULT_SERVICE);return <UnitProvider><ServiceInputs input={input} onChange={setInput}/></UnitProvider>;}
  render(<Form/>);
  fireEvent.change(screen.getByRole('combobox',{name:'Fluid'}),{target:{value:'air'}});
  fireEvent.change(screen.getByLabelText('Internal gauge pressure (kPa)'),{target:{value:'0'}});
  expect(screen.getByText(/Calculated density:/).textContent).toContain('1.204');
  fireEvent.change(screen.getByLabelText('Operating temperature (°C)'),{target:{value:'313.15'}});
  expect(screen.getByText(/Calculated density:/).textContent).toContain('0.602');
  fireEvent.change(screen.getByRole('combobox',{name:'Fluid'}),{target:{value:'custom'}});
  expect(screen.getByLabelText('Fluid density at operating P/T (kg/m3)')).toHaveValue(40);
});
