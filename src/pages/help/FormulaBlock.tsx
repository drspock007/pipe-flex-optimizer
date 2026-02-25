// src/pages/help/FormulaBlock.tsx

import katex from "katex";
import "katex/dist/katex.min.css";

interface FormulaBlockProps {
  tex: string;
  label?: string;
}

const FormulaBlock = ({ tex, label }: FormulaBlockProps) => (
  <div className="my-3 px-4 py-3 bg-muted/50 rounded-md border-l-4 border-primary/30 overflow-x-auto">
    <div
      className="text-center"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, { displayMode: true, throwOnError: false }),
      }}
    />
    {label && <p className="text-[10px] text-muted-foreground mt-1 text-center">{label}</p>}
  </div>
);

export default FormulaBlock;
