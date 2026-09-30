import { useState } from 'react';
import { render,screen,fireEvent } from '@testing-library/react';
import { it,expect } from 'vitest';
import { UnitProvider } from '@/contexts/UnitContext';
import { DEFAULT_SERVICE } from '@/lib/in-service/types';
import { ServiceInputs } from '../ServiceInputs';
it('supports custom positions, relative scaling, and a separate count-search ceiling',()=>{
  function Form(){const [input,setInput]=useState(DEFAULT_SERVICE);return <UnitProvider><ServiceInputs input={input} onChange={setInput}/></UnitProvider>;}
  render(<Form/>);
  fireEvent.change(screen.getByRole('combobox',{name:'Support layout'}),{target:{value:'custom'}});
  expect(screen.getByLabelText('Support 1 from left end (m)')).toHaveValue(5);
  fireEvent.change(screen.getByLabelText('Length on each side (m)'),{target:{value:'20'}});
  expect(screen.getByLabelText('Support 1 from left end (m)')).toHaveValue(10);
  fireEvent.change(screen.getByRole('combobox',{name:'Calculation'}),{target:{value:'supports'}});
  expect(screen.getByLabelText('Support search ceiling (even, 0–20)')).toHaveValue(10);
  expect(screen.queryByRole('combobox',{name:'Support layout'})).not.toBeInTheDocument();
});
