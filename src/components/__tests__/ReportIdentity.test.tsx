import {afterEach,describe,it,expect} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {useState} from 'react';
import ReportIdentityFields from '../ReportIdentityFields';
import ServiceResults from '../in-service/ServiceResults';
import {UnitProvider} from '@/contexts/UnitContext';
import {runService} from '@/lib/in-service/run';
import {DEFAULT_SERVICE} from '@/lib/in-service/types';
import FieldHelp from '../FieldHelp';
afterEach(cleanup);
const report=runService(DEFAULT_SERVICE);
function Form(){const [identity,setIdentity]=useState({preparedBy:'',projectName:''});return <UnitProvider><ReportIdentityFields value={identity} onChange={setIdentity}/><ServiceResults report={report} identity={identity}/></UnitProvider>;}
describe('report identity and help',()=>{
 it('requires both names for both service exports',()=>{
  render(<Form/>);
  const summary=screen.getByRole('button',{name:'Summary PDF · SI'}),complete=screen.getByRole('button',{name:'Complete PDF · SI'});
  expect(summary).toBeDisabled();expect(complete).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Prepared by *'),{target:{value:'Ada'}});expect(summary).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Project name *'),{target:{value:'Project'}});expect(summary).toBeEnabled();expect(complete).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Project name *'),{target:{value:'   '}});expect(summary).toBeDisabled();expect(complete).toBeDisabled();
 });
 it('opens an explanation by keyboard',async()=>{render(<FieldHelp text="Pressure above atmosphere"/>);fireEvent.keyDown(screen.getByRole('button',{name:'Help: Pressure above atmosphere'}),{key:'Enter'});expect(await screen.findByRole('tooltip')).toHaveTextContent('Pressure above atmosphere');});
});
