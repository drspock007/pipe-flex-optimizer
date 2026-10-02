import {describe,it,expect,vi} from 'vitest';
import {jsPDF} from 'jspdf';
import {LIGHT_PDF,themePages,finishPdfPages} from './theme';

describe('shared PDF template',()=>{
  it('paints both side bars on every page and uses the same footer',()=>{
    const doc=new jsPDF();
    const rect=vi.spyOn(doc,'rect');
    themePages(doc,LIGHT_PDF);doc.addPage();
    expect(rect.mock.calls.filter(c=>c[0]===0&&c[2]===3)).toHaveLength(2);
    expect(rect.mock.calls.filter(c=>c[0]===207&&c[2]===3)).toHaveLength(2);
    const text=vi.spyOn(doc,'text');
    finishPdfPages(doc,LIGHT_PDF,'v202610021809','GMC | Example','Summary');
    expect(text.mock.calls.map(c=>c[0])).toEqual([
      'GMC | Example','App v202610021809','Summary | 1 / 2',
      'GMC | Example','App v202610021809','Summary | 2 / 2',
    ]);
  });
});
