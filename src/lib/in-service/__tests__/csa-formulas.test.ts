import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { CSA_FORMULAS, formulaTex } from '../csa-formulas';

describe('scientific CSA notation', () => {
  it('renders every shared equation as valid mathematical notation', () => {
    for (const equations of Object.values(CSA_FORMULAS)) {
      for (const equation of equations) {
        const html = katex.renderToString(formulaTex(equation.parts), { displayMode: true, throwOnError: true });
        expect(html).toContain('<math');
        expect(html).not.toContain('katex-error');
      }
    }
    const hoop = katex.renderToString(formulaTex(CSA_FORMULAS.anchored[1].parts));
    expect(hoop).toContain('<mfrac>');
    expect(hoop).toContain('<msub>');
    expect(formulaTex(CSA_FORMULAS.anchored[2].parts)).toContain('\\nu');
    expect(formulaTex(CSA_FORMULAS.anchored[2].parts)).toContain('\\alpha');
  });
});
