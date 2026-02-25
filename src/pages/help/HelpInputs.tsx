// src/pages/help/HelpInputs.tsx

const HelpInputs = () => (
  <section id="inputs" className="space-y-3">
    <h2 className="text-xl font-bold tracking-tight">2. Input Parameters</h2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-semibold">Parameter</th>
            <th className="text-left py-2 pr-4 font-semibold">Symbol</th>
            <th className="text-left py-2 pr-4 font-semibold">Unit</th>
            <th className="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Outside diameter</td>
            <td className="py-2 pr-4 font-mono">D₀</td>
            <td className="py-2 pr-4">mm</td>
            <td className="py-2">Pipe outer diameter</td>
          </tr>
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Wall thickness</td>
            <td className="py-2 pr-4 font-mono">t</td>
            <td className="py-2 pr-4">mm</td>
            <td className="py-2">Nominal wall thickness</td>
          </tr>
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Span length</td>
            <td className="py-2 pr-4 font-mono">L</td>
            <td className="py-2 pr-4">m</td>
            <td className="py-2">Total distance between fixed ends</td>
          </tr>
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Differential settlement</td>
            <td className="py-2 pr-4 font-mono">h</td>
            <td className="py-2 pr-4">mm</td>
            <td className="py-2">Vertical displacement of right end relative to left (positive = right end higher)</td>
          </tr>
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Material grade</td>
            <td className="py-2 pr-4">—</td>
            <td className="py-2 pr-4">—</td>
            <td className="py-2">API 5L grade (X52, X60, X65, X70) or custom yield</td>
          </tr>
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Young's modulus</td>
            <td className="py-2 pr-4 font-mono">E</td>
            <td className="py-2 pr-4">GPa</td>
            <td className="py-2">Elastic modulus (default 210 GPa for steel)</td>
          </tr>
          <tr className="border-b border-muted">
            <td className="py-2 pr-4">Steel density</td>
            <td className="py-2 pr-4 font-mono">ρ</td>
            <td className="py-2 pr-4">kg/m³</td>
            <td className="py-2">Used for self-weight calculation (default 7850)</td>
          </tr>
          <tr>
            <td className="py-2 pr-4">Allowable stress</td>
            <td className="py-2 pr-4">—</td>
            <td className="py-2 pr-4">% SMYS</td>
            <td className="py-2">Percentage of Specified Minimum Yield Strength used as stress limit</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);

export default HelpInputs;
