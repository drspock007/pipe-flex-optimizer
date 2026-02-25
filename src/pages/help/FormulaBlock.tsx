// src/pages/help/FormulaBlock.tsx

interface FormulaBlockProps {
  children: React.ReactNode;
  label?: string;
}

const FormulaBlock = ({ children, label }: FormulaBlockProps) => (
  <div className="my-3 px-4 py-3 bg-muted rounded-md text-center">
    <div className="text-sm font-mono">{children}</div>
    {label && <p className="text-[10px] text-muted-foreground mt-1">{label}</p>}
  </div>
);

export default FormulaBlock;
